"""
query_parser.py

Deliberately simple, transparent, rule-based query understanding.
No LLM, no ML: it looks for whole words from a small fixed vocabulary
(object names, colour names, clothing words) and turns them into a filter.

Anything it does not recognise is reported as "not understood" rather than
guessed at, so the UI never shows results for a question we could not read.
"""
import re
from dataclasses import dataclass, field
from typing import List, Optional

SUPPORTED_OBJECTS = ["person", "car", "truck", "bus", "motorcycle", "bicycle"]

OBJECT_WORDS = {
    "person": {"person", "people", "persons", "human", "humans", "man", "men", "woman", "women", "pedestrian", "pedestrians"},
    "car": {"car", "cars", "sedan", "suv"},
    "truck": {"truck", "trucks", "lorry"},
    "bus": {"bus", "buses"},
    "motorcycle": {"motorcycle", "motorcycles", "motorbike", "motorbikes", "scooter"},
    "bicycle": {"bicycle", "bicycles", "bike", "bikes", "cyclist"},
}

# "vehicle" means any motorised road vehicle the detector can find.
GROUP_WORDS = {
    "vehicle": ["car", "truck", "bus", "motorcycle"],
    "vehicles": ["car", "truck", "bus", "motorcycle"],
}

COLOR_WORDS = {"red", "blue", "black", "white", "yellow", "green", "orange", "purple", "pink", "gray", "grey"}
CLOTHING_WORDS = {"shirt", "shirts", "tshirt", "clothing", "clothes", "jacket", "top", "wearing"}

HELP_MESSAGE = (
    "Query not understood. Try: 'Show all cars', 'When was a person visible?', "
    "'Find a red car' or 'Find a person wearing a blue shirt'. "
    f"Supported objects: {', '.join(SUPPORTED_OBJECTS)}."
)


@dataclass
class ParsedQuery:
    raw_query: str
    object_classes: List[str] = field(default_factory=list)
    color: Optional[str] = None
    attribute_type: Optional[str] = None  # "clothing" when a person's clothing colour is asked for
    understood: bool = False

    def to_dict(self):
        return {
            "raw_query": self.raw_query,
            "object_classes": self.object_classes,
            "color": self.color,
            "attribute_type": self.attribute_type,
            "understood": self.understood,
        }


def parse_query(text: str) -> ParsedQuery:
    tokens = re.findall(r"[a-z]+", text.lower())
    result = ParsedQuery(raw_query=text)

    for tok in tokens:
        for canonical, words in OBJECT_WORDS.items():
            if tok in words and canonical not in result.object_classes:
                result.object_classes.append(canonical)
        for cls in GROUP_WORDS.get(tok, []):
            if cls not in result.object_classes:
                result.object_classes.append(cls)
        if tok in COLOR_WORDS and result.color is None:
            result.color = "gray" if tok == "grey" else tok
        if tok in CLOTHING_WORDS:
            result.attribute_type = "clothing"

    # "wearing a blue shirt" with no explicit noun means a person.
    if result.attribute_type == "clothing" and not result.object_classes:
        result.object_classes = ["person"]

    # An object is required; a colour alone is not a question we can answer.
    result.understood = bool(result.object_classes)
    return result
