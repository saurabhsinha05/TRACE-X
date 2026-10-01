"""
tracker.py

A lightweight IoU-based tracker that links per-frame YOLO detections into
persistent tracks across the sampled frames, so the same physical object
is reported once (with a first-seen/last-seen span) instead of once per
frame. This is a real, deterministic algorithm -- not a lookup table.

For a hackathon prototype this greedy IoU matcher is sufficient; the
codebase is structured so a stronger tracker (e.g. ByteTrack) can be
swapped in via this same interface later.
"""
from dataclasses import dataclass, field
from typing import List, Dict
from collections import defaultdict

from .detector import Detection


def _iou(a: List[float], b: List[float]) -> float:
    ax1, ay1, ax2, ay2 = a
    bx1, by1, bx2, by2 = b
    ix1, iy1 = max(ax1, bx1), max(ay1, by1)
    ix2, iy2 = min(ax2, bx2), min(ay2, by2)
    iw, ih = max(0.0, ix2 - ix1), max(0.0, iy2 - iy1)
    inter = iw * ih
    area_a = max(0.0, ax2 - ax1) * max(0.0, ay2 - ay1)
    area_b = max(0.0, bx2 - bx1) * max(0.0, by2 - by1)
    union = area_a + area_b - inter
    return inter / union if union > 0 else 0.0


@dataclass
class Track:
    track_id: str
    cls: str
    first_seen: float
    last_seen: float
    detections: List[Detection] = field(default_factory=list)
    dominant_color: str = None
    attribute_confidence: float = None
    best: Detection = None  # most confident detection = the track's evidence frame

    @property
    def duration(self) -> float:
        return round(self.last_seen - self.first_seen, 3)

    @property
    def avg_confidence(self) -> float:
        if not self.detections:
            return 0.0
        return round(sum(d.confidence for d in self.detections) / len(self.detections), 4)

    def to_dict(self):
        return {
            "track_id": self.track_id,
            "class": self.cls,
            "first_seen": self.first_seen,
            "last_seen": self.last_seen,
            "duration": self.duration,
            "detection_confidence": self.avg_confidence,
            "dominant_color": self.dominant_color,
            "attribute_confidence": self.attribute_confidence,
            "detection_count": len(self.detections),
            "sample_bbox": self.best.bbox if self.best else None,
            "sample_frame": self.best.frame_number if self.best else None,
            "sample_time": self.best.timestamp if self.best else None,
        }


# car/truck/bus/motorcycle are one "family" for matching: the small YOLO model
# sometimes flips a vehicle between classes from one frame to the next, and we
# do not want that to split one physical vehicle into several tracks.
FAMILY = {"person": "person", "bicycle": "bicycle", "car": "vehicle", "truck": "vehicle",
          "bus": "vehicle", "motorcycle": "vehicle"}


def _center(b):
    return ((b[0] + b[2]) / 2.0, (b[1] + b[3]) / 2.0)


def _match_cost(a, b) -> float:
    """Lower is better. None = not a plausible match.
    IoU >= 0.1 counts as overlapping; otherwise the boxes must be within about
    one object-length of each other (objects can move far between samples)."""
    size = max(a[2] - a[0], a[3] - a[1], b[2] - b[0], b[3] - b[1], 1.0)
    (ax, ay), (bx, by) = _center(a), _center(b)
    dist = ((ax - bx) ** 2 + (ay - by) ** 2) ** 0.5 / size
    if _iou(a, b) >= 0.1 or dist <= 1.0:
        return dist
    return None


def build_tracks(detections: List[Detection], max_gap_seconds: float = 1.0) -> List[Track]:
    """
    Simple tracker over the sampled frames:
      1. A track that has gone `max_gap_seconds` without a match is closed
         *before* the next frame is matched (so it can never be revived later).
      2. Within a frame, each detection is paired with the nearest compatible
         track (same family), best pairs first, one detection per track.
      3. Unpaired detections start new tracks.
      4. Afterwards each track's class is the majority vote of its detections,
         and its representative (evidence) detection is the most confident one.
    """
    by_frame: Dict[int, List[Detection]] = defaultdict(list)
    for d in detections:
        by_frame[d.frame_number].append(d)

    active: List[Track] = []
    finished: List[Track] = []

    for frame_num in sorted(by_frame.keys()):
        dets = by_frame[frame_num]
        now = dets[0].timestamp

        still = []
        for t in active:
            (finished if now - t.last_seen > max_gap_seconds else still).append(t)
        active = still

        pairs = []
        for ti, t in enumerate(active):
            for di, d in enumerate(dets):
                if FAMILY[t.detections[-1].cls] != FAMILY[d.cls]:
                    continue
                cost = _match_cost(t.detections[-1].bbox, d.bbox)
                if cost is not None:
                    pairs.append((cost, ti, di))
        pairs.sort()
        used_t, used_d = set(), set()
        for cost, ti, di in pairs:
            if ti in used_t or di in used_d:
                continue
            used_t.add(ti); used_d.add(di)
            active[ti].detections.append(dets[di])
            active[ti].last_seen = dets[di].timestamp
        for di, d in enumerate(dets):
            if di not in used_d:
                active.append(Track(track_id="", cls=d.cls, first_seen=d.timestamp,
                                    last_seen=d.timestamp, detections=[d]))

    finished.extend(active)

    for t in finished:
        votes = defaultdict(float)
        counts = defaultdict(int)
        for d in t.detections:
            counts[d.cls] += 1
            votes[d.cls] += d.confidence
        t.cls = max(counts, key=lambda c: (counts[c], votes[c]))
        t.best = max(t.detections, key=lambda d: d.confidence)

    finished.sort(key=lambda t: t.first_seen)
    per_class: Dict[str, int] = defaultdict(int)
    for t in finished:
        per_class[t.cls] += 1
        t.track_id = f"{t.cls.upper()}-{per_class[t.cls]}"
    return finished
