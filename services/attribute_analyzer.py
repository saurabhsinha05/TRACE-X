"""
attribute_analyzer.py

"Prototype Attribute Estimation" -- estimates a dominant named color for a
detected object by cropping its bounding box from the actual source frame
and analysing the real pixel data in HSV space. This is a real per-object
computation, not a lookup, but is explicitly labelled as a prototype
because lighting, shadows, compression artefacts and camera quality can
all affect the result -- this is disclosed in the API response and the UI.

For "person" detections, only the upper-body region is analysed, as a
rough proxy for clothing color.
"""
from typing import Optional, Tuple

import cv2
import numpy as np

# Named color centers in HSV (OpenCV ranges: H 0-179, S/V 0-255)
_COLOR_BINS = [
    ("red", [(0, 10), (170, 179)]),
    ("orange", [(11, 22)]),
    ("yellow", [(23, 34)]),
    ("green", [(35, 85)]),
    ("blue", [(86, 128)]),
    ("purple", [(129, 155)]),
    ("pink", [(156, 169)]),
]


def _classify_hue(hue: float, sat: float, val: float) -> str:
    if val < 40:
        return "black"
    if sat < 30 and val > 200:
        return "white"
    if sat < 35:
        return "gray"
    for name, ranges in _COLOR_BINS:
        for lo, hi in ranges:
            if lo <= hue <= hi:
                return name
    return "unknown"


def estimate_color(frame: np.ndarray, bbox: list, cls: str) -> Tuple[Optional[str], Optional[float]]:
    """
    Returns (color_name, confidence_0_to_1) computed from the real crop of
    `frame` at `bbox`, or (None, None) if the crop is invalid.
    """
    if frame is None:
        return None, None

    h, w = frame.shape[:2]
    x1, y1, x2, y2 = [int(max(0, v)) for v in bbox]
    x2, y2 = min(w, x2), min(h, y2)
    if x2 <= x1 or y2 <= y1:
        return None, None

    if cls == "person":
        # Upper-body proxy for clothing: roughly the torso band of the box
        band_top = y1 + int((y2 - y1) * 0.25)
        band_bottom = y1 + int((y2 - y1) * 0.60)
        crop = frame[band_top:max(band_bottom, band_top + 1), x1:x2]
    else:
        # Vehicles: central region avoids windows/shadows at the edges
        pad_x = int((x2 - x1) * 0.2)
        pad_y = int((y2 - y1) * 0.2)
        crop = frame[y1 + pad_y:y2 - pad_y, x1 + pad_x:x2 - pad_x]

    if crop.size == 0:
        crop = frame[y1:y2, x1:x2]
    if crop.size == 0:
        return None, None

    hsv = cv2.cvtColor(crop, cv2.COLOR_BGR2HSV)
    pixels = hsv.reshape(-1, 3).astype(np.float32)

    labels = [_classify_hue(p[0], p[1], p[2]) for p in pixels]
    if not labels:
        return None, None

    from collections import Counter
    counts = Counter(labels)
    top_color, top_count = counts.most_common(1)[0]
    confidence = round(top_count / len(labels), 4)
    return top_color, confidence
