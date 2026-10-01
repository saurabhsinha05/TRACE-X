"""
detector.py

Real object detection using an Ultralytics YOLOv8 model. Frames are sampled
at a configurable rate (default 3 FPS) rather than every frame, to keep
prototype analysis time reasonable -- this is disclosed to the user in the
UI as "Analysis Sampling".

Only classes the model can actually recognise are reported. We restrict to
a relevant subset of COCO classes for this forensic-surveillance use case.

Performance notes (no change to detection behaviour or results):
- Only the sampled frames are decoded (via CAP_PROP_POS_FRAMES seeking)
  instead of decoding every frame in the video and discarding most of
  them. This is the same set of frames/timestamps analyzed as before.
- Sampled frames are sent to the model in small batches instead of one
  call per frame, which YOLO/PyTorch processes more efficiently. Each
  frame is still scored independently at the same confidence threshold,
  so per-frame results are unchanged.
"""
from dataclasses import dataclass
from typing import List, Optional, Callable

import cv2

from ultralytics import YOLO

# COCO class ids relevant to a surveillance/forensic context.
RELEVANT_CLASSES = {
    0: "person",
    1: "bicycle",
    2: "car",
    3: "motorcycle",
    5: "bus",
    7: "truck",
}

BATCH_SIZE = 8

_model = None


def get_model():
    global _model
    if _model is None:
        _model = YOLO("yolov8n.pt")
    return _model


@dataclass
class Detection:
    frame_number: int
    timestamp: float
    cls: str
    confidence: float
    bbox: List[float]  # [x1, y1, x2, y2] in pixel coords of the source frame


def detect_objects(file_path: str, fps_source: float, sample_fps: float = 3.0,
                    conf_threshold: float = 0.35,
                    on_progress: Optional[Callable[[float], None]] = None) -> List[Detection]:
    """
    Runs YOLO on frames sampled at `sample_fps` from the source video.
    Returns real per-frame detections with real bounding boxes and
    confidences -- nothing here is hardcoded or fabricated.
    """
    model = get_model()
    cap = cv2.VideoCapture(file_path)
    if not cap.isOpened():
        raise ValueError("Could not open video for analysis")

    if fps_source <= 0:
        fps_source = cap.get(cv2.CAP_PROP_FPS) or 25.0

    total_frames = int(cap.get(cv2.CAP_PROP_FRAME_COUNT) or 0)
    frame_interval = max(1, round(fps_source / sample_fps))
    sample_indices = list(range(0, max(total_frames, 1), frame_interval))

    detections: List[Detection] = []
    batch_frames: List = []
    batch_meta: List[tuple] = []  # (frame_idx, timestamp) per frame in the batch

    def run_batch():
        if not batch_frames:
            return
        results = model.predict(batch_frames, verbose=False, conf=conf_threshold)
        for (frame_idx, timestamp), r in zip(batch_meta, results):
            if r.boxes is None:
                continue
            for box in r.boxes:
                cls_id = int(box.cls[0])
                if cls_id not in RELEVANT_CLASSES:
                    continue
                conf = float(box.conf[0])
                x1, y1, x2, y2 = [float(v) for v in box.xyxy[0]]
                detections.append(Detection(
                    frame_number=frame_idx,
                    timestamp=round(timestamp, 3),
                    cls=RELEVANT_CLASSES[cls_id],
                    confidence=round(conf, 4),
                    bbox=[round(x1, 1), round(y1, 1), round(x2, 1), round(y2, 1)],
                ))
        batch_frames.clear()
        batch_meta.clear()

    total_samples = len(sample_indices) or 1
    for done, frame_idx in enumerate(sample_indices):
        cap.set(cv2.CAP_PROP_POS_FRAMES, frame_idx)
        ok, frame = cap.read()
        if not ok:
            continue
        timestamp = frame_idx / fps_source
        batch_frames.append(frame)
        batch_meta.append((frame_idx, timestamp))
        if len(batch_frames) >= BATCH_SIZE:
            run_batch()
        if on_progress:
            on_progress((done + 1) / total_samples)

    run_batch()
    cap.release()
    return detections
