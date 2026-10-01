# TRACE-X — AI-Assisted Forensic Video Investigation
### PS #150 — Multi-Vendor DVR/NVR Forensic Analysis (prototype)

Upload CCTV footage → real metadata + SHA-256 → real object detection & tracking → natural-language query →
timestamped results → click to jump the video → timeline → forensic report.

## What is REAL vs SIMULATED
| Feature | Status |
|---|---|
| Video upload, metadata (duration, resolution, FPS, frames, codec) | **Real** (browser + OpenCV) |
| SHA-256 (also SHA-1/MD5) | **Real** (Web Crypto in browser, cross-checked by server `hashlib`) |
| Object detection (person, bicycle, car, motorcycle, bus, truck) | **Real** — Ultralytics YOLOv8n |
| Object tracking (first/last seen, duration) | **Real** — IoU tracker (ByteTrack-swappable) |
| Colour / clothing estimate | **Real but prototype** — HSV analysis of the box crop; affected by lighting/compression |
| Natural-language query | **Real** — rule-based parser (no LLM) |
| Click result → video seeks; timeline; report | **Real** |
| Analysis progress bar | **Real** — polled from the backend (frames processed) |
| Demo mode (Overview, Timeline) | **Simulated**, always labelled `DEMO / SIMULATED` |
| Proprietary DVR/NVR container parsing, disk imaging, recovery | **Not implemented** (architecture only) |

## Run it
Requires Node 18+ and Python 3.10+.

**Backend** (terminal 1)
```bash
cd backend
python -m venv venv
source venv/bin/activate          # Windows: venv\Scripts\activate
pip install -r requirements.txt   # installs PyTorch via ultralytics (large download)
uvicorn main:app --port 8000
```
First analysis downloads `yolov8n.pt` (~6 MB) automatically. Startup can take ~30 s while PyTorch loads.

**Frontend** (terminal 2)
```bash
npm install
npm run dev
```
Open http://localhost:5173 → *Evidence Intake* → upload a video → *AI Video Investigation* → *Run Forensic Analysis* → ask a question.

Without the backend, upload/hash/metadata still work in the browser; analysis is disabled and says so.

## Supported formats
`.mp4 .avi .mov .mkv`. Playback is browser-decoded, so H.264 (typical for CCTV exports) is recommended; codecs a browser
cannot decode (e.g. MPEG-4 Part 2) can still be hashed and analysed, but not played back.

## Supported queries
The parser is a small, transparent keyword matcher (no LLM). It needs an **object** and optionally a **colour**:

`Show all people` · `Show all cars` · `When was a car visible?` · `When was a red car visible?` ·
`Find a person wearing a blue shirt` · `Find a blue bus` · `Show all vehicles` (car/truck/bus/motorcycle)

Objects: person, car, truck, bus, motorcycle, bicycle. Colours: red, blue, black, white, yellow, green, orange, purple, pink, gray.
- No matching object → *"No matching object was detected in the analyzed footage."*
- A question with no recognised object (e.g. "find a dog") → *"Query not understood"* plus examples. It never guesses.
- Colour queries only match if the estimated colour equals the requested one, so "red car" returns nothing unless a red car is actually detected.

## Architecture
```
React + TS + Vite ──HTTP──► FastAPI ─► OpenCV frame sampling (3 FPS default)
   Web Crypto SHA-256          │        ─► YOLOv8 detection ─► IoU tracking ─► HSV colour estimate
                               └──────► query parser ─► filter tracks ─► timestamps
```
```
backend/main.py · services/{video_processor,detector,tracker,attribute_analyzer,query_parser}.py
src/context/CaseContext.tsx (state) · src/lib/{backendApi,clientMedia}.ts · src/pages/* (Architecture.tsx = "How It Works": implemented pipeline vs planned vendor layer)
```

## Limitations
- Analysis samples 3 FPS (`SAMPLE_FPS_DEFAULT` in `backend/main.py`); brief events between samples can be missed.
- Tracks are sampled-frame IoU matches; identity can switch in crowded/occluded scenes.
- The on-video box is the track's representative detection box, not a per-frame live box.
- Evidence store is in-memory (lost on backend restart). CORS is open (`*`) for local prototyping.
- AI-assisted analysis. Analyst verification required. Not legally certified; no admissibility claim.

## Future scope
Real DVR/NVR acquisition · vendor-specific parsers · disk imaging · proprietary filesystem recovery · FFmpeg
integration · ByteTrack / better attribute models · chain-of-custody · secure evidence storage · more vendors ·
LLM-assisted querying.
