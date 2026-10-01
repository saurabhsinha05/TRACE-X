"""
video_processor.py

Real (non-simulated) video metadata extraction and cryptographic hashing.
Every value returned here comes directly from the file on disk via OpenCV
and hashlib -- nothing is fabricated or estimated.
"""
import hashlib
import os
from dataclasses import dataclass, asdict

import cv2


@dataclass
class VideoMetadata:
    filename: str
    file_size_bytes: int
    duration_seconds: float
    duration_formatted: str
    width: int
    height: int
    fps: float
    frame_count: int
    codec_fourcc: str

    def to_dict(self):
        return asdict(self)


def _format_duration(seconds: float) -> str:
    seconds = max(0.0, seconds)
    hrs = int(seconds // 3600)
    mins = int((seconds % 3600) // 60)
    secs = seconds % 60
    if hrs:
        return f"{hrs:02d}:{mins:02d}:{secs:05.2f}"
    return f"{mins:02d}:{secs:05.2f}"


def _fourcc_to_str(fourcc_float: float) -> str:
    fourcc_int = int(fourcc_float)
    chars = [chr((fourcc_int >> (8 * i)) & 0xFF) for i in range(4)]
    s = "".join(chars).strip()
    return s if s.isprintable() and s else "unknown"


def extract_metadata(file_path: str) -> VideoMetadata:
    """Reads real container/stream properties from the video file via OpenCV."""
    if not os.path.exists(file_path):
        raise FileNotFoundError(file_path)

    cap = cv2.VideoCapture(file_path)
    if not cap.isOpened():
        cap.release()
        raise ValueError("Could not open video file — unsupported or corrupted format")

    fps = cap.get(cv2.CAP_PROP_FPS) or 0.0
    frame_count = int(cap.get(cv2.CAP_PROP_FRAME_COUNT) or 0)
    width = int(cap.get(cv2.CAP_PROP_FRAME_WIDTH) or 0)
    height = int(cap.get(cv2.CAP_PROP_FRAME_HEIGHT) or 0)
    fourcc = cap.get(cv2.CAP_PROP_FOURCC)
    cap.release()

    if width == 0 or height == 0:
        raise ValueError("Could not read video stream — unsupported or corrupted format")

    duration = (frame_count / fps) if fps > 0 else 0.0

    return VideoMetadata(
        filename=os.path.basename(file_path),
        file_size_bytes=os.path.getsize(file_path),
        duration_seconds=round(duration, 3),
        duration_formatted=_format_duration(duration),
        width=width,
        height=height,
        fps=round(fps, 3),
        frame_count=frame_count,
        codec_fourcc=_fourcc_to_str(fourcc),
    )


def compute_hashes(file_path: str) -> dict:
    """Streams the file in chunks and computes real SHA-256 (primary), SHA-1, MD5."""
    sha256 = hashlib.sha256()
    sha1 = hashlib.sha1()
    md5 = hashlib.md5()
    with open(file_path, "rb") as f:
        for chunk in iter(lambda: f.read(1024 * 1024), b""):
            sha256.update(chunk)
            sha1.update(chunk)
            md5.update(chunk)
    return {
        "sha256": sha256.hexdigest(),
        "sha1": sha1.hexdigest(),
        "md5": md5.hexdigest(),
    }
