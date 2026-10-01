"""
TRACE-X forensic analysis backend.

Endpoints:
  POST /api/evidence/upload            -> save file, extract real metadata + hashes
  POST /api/evidence/{id}/analyze       -> run real YOLO detection + tracking + color estimation
  POST /api/evidence/{id}/query         -> parse NL query, filter real tracks, return matches
  GET  /api/evidence/{id}               -> fetch stored evidence record
  GET  /media/{id}/source.<ext>         -> stream the original video (range-request capable)

Run with:
  uvicorn main:app --reload --port 8000
"""
import os
import shutil
import time
import uuid
from typing import Dict

import cv2
from fastapi import FastAPI, UploadFile, File, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel

from services import video_processor, detector, tracker, attribute_analyzer, query_parser

STORAGE_DIR = os.path.join(os.path.dirname(__file__), "storage")
os.makedirs(STORAGE_DIR, exist_ok=True)

ALLOWED_EXTENSIONS = {".mp4", ".avi", ".mov", ".mkv"}
SAMPLE_FPS_DEFAULT = 3.0

app = FastAPI(title="TRACE-X Forensic Analysis API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # prototype only — restrict in a real deployment
    allow_methods=["*"],
    allow_headers=["*"],
)

app.mount("/media", StaticFiles(directory=STORAGE_DIR), name="media")

# In-memory evidence store (prototype only — not persisted across restarts).
EVIDENCE: Dict[str, dict] = {}


class QueryRequest(BaseModel):
    query: str


def _case_id(evidence_id: str) -> str:
    return evidence_id


@app.post("/api/evidence/upload")
async def upload_evidence(file: UploadFile = File(...)):
    ext = os.path.splitext(file.filename or "")[1].lower()
    if ext not in ALLOWED_EXTENSIONS:
        raise HTTPException(
            status_code=400,
            detail=f"Unsupported file format '{ext}'. Supported formats: {', '.join(sorted(ALLOWED_EXTENSIONS))}",
        )

    evidence_id = f"EV-{time.strftime('%Y')}-{str(uuid.uuid4())[:6].upper()}"
    evidence_dir = os.path.join(STORAGE_DIR, evidence_id)
    os.makedirs(evidence_dir, exist_ok=True)
    dest_path = os.path.join(evidence_dir, f"source{ext}")

    try:
        with open(dest_path, "wb") as out:
            shutil.copyfileobj(file.file, out)
    except Exception as e:
        shutil.rmtree(evidence_dir, ignore_errors=True)
        raise HTTPException(status_code=500, detail=f"Failed to save upload: {e}")

    try:
        metadata = video_processor.extract_metadata(dest_path)
    except Exception as e:
        shutil.rmtree(evidence_dir, ignore_errors=True)
        raise HTTPException(status_code=400, detail=f"Could not process video: {e}")

    hashes = video_processor.compute_hashes(dest_path)

    record = {
        "evidence_id": evidence_id,
        "video_url": f"/media/{evidence_id}/{os.path.basename(dest_path)}",
        "file_path": dest_path,
        "status": "UPLOADED",
        "metadata": metadata.to_dict(),
        "hashes": hashes,
        "tracks": [],
        "objects_detected": 0,
        "sample_fps": SAMPLE_FPS_DEFAULT,
        "uploaded_at": time.time(),
    }
    EVIDENCE[evidence_id] = record
    return _public_record(record)


def _public_record(record: dict) -> dict:
    r = dict(record)
    r.pop("file_path", None)
    return r


@app.get("/api/evidence/{evidence_id}")
async def get_evidence(evidence_id: str):
    record = EVIDENCE.get(evidence_id)
    if not record:
        raise HTTPException(status_code=404, detail="Evidence not found")
    return _public_record(record)


@app.post("/api/evidence/{evidence_id}/analyze")
def analyze_evidence(evidence_id: str):
    # Plain `def` (not async) so FastAPI runs this blocking work in a worker
    # thread and the progress endpoint stays responsive while it runs.
    record = EVIDENCE.get(evidence_id)
    if not record:
        raise HTTPException(status_code=404, detail="Evidence not found")

    record["status"] = "PROCESSING"
    record["progress"] = {"stage": "Detecting objects (YOLOv8)", "percent": 0}
    try:
        detections = detector.detect_objects(
            record["file_path"],
            fps_source=record["metadata"]["fps"],
            sample_fps=record["sample_fps"],
            on_progress=lambda frac: record.__setitem__(
                "progress", {"stage": "Detecting objects (YOLOv8)", "percent": round(frac * 90, 1)}
            ),
        )
        record["progress"] = {"stage": "Tracking objects across frames", "percent": 92}
        tracks = tracker.build_tracks(detections)
        record["progress"] = {"stage": "Estimating colours (prototype)", "percent": 95}

        # Real color estimation: re-open the video and grab the frame for
        # each track's sample detection to crop and analyse.
        cap = cv2.VideoCapture(record["file_path"])
        n_tracks = len(tracks) or 1
        for i, t in enumerate(tracks):
            if t.detections:
                sample_det = t.best
                cap.set(cv2.CAP_PROP_POS_FRAMES, sample_det.frame_number)
                ok, frame = cap.read()
                if ok:
                    color, conf = attribute_analyzer.estimate_color(frame, sample_det.bbox, t.cls)
                    t.dominant_color = color
                    t.attribute_confidence = conf
            # Real, incremental progress through the colour pass (was a flat
            # 95% before this loop finished, which could look stuck).
            record["progress"] = {"stage": "Estimating colours (prototype)", "percent": round(95 + (i + 1) / n_tracks * 4, 1)}
        cap.release()

        record["tracks"] = [t.to_dict() for t in tracks]
        record["objects_detected"] = len(tracks)
        record["progress"] = {"stage": "Done", "percent": 100}
        record["status"] = "READY"
    except Exception as e:
        record["status"] = "FAILED"
        raise HTTPException(status_code=500, detail=f"Analysis failed: {e}")

    return _public_record(record)


@app.post("/api/evidence/{evidence_id}/query")
async def query_evidence(evidence_id: str, body: QueryRequest):
    record = EVIDENCE.get(evidence_id)
    if not record:
        raise HTTPException(status_code=404, detail="Evidence not found")
    if record["status"] != "READY":
        raise HTTPException(status_code=409, detail="Evidence has not been analyzed yet")

    parsed = query_parser.parse_query(body.query)
    if not parsed.understood:
        return {"parsed_query": parsed.to_dict(), "match_count": 0, "matches": [],
                "message": query_parser.HELP_MESSAGE}

    matches = []
    for t in record["tracks"]:
        if t["class"] not in parsed.object_classes:
            continue
        if parsed.color and (t.get("dominant_color") or "").lower() != parsed.color:
            continue
        matches.append(t)

    matches.sort(key=lambda t: t["first_seen"])

    return {
        "parsed_query": parsed.to_dict(),
        "match_count": len(matches),
        "matches": matches,
        "message": None if matches else "No matching object was detected in the analyzed footage.",
    }


@app.get("/api/health")
async def health():
    return {"status": "ok", "evidence_count": len(EVIDENCE)}
