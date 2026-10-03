"""Pair the 20 English drafts with the reviewed Bikol responses by row number.

Run with --reviewed only after the current Bikol file has been speaker-reviewed.
Editing that file later requires another review before regenerating with the flag.
"""

import argparse
import json
import re
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
ENGLISH = ROOT / "data" / "english_tutoring_examples.md"
BIKOL = ROOT / "data" / "SAMPLE_BIKOLANO.md"
OUTPUT = ROOT / "data" / "bikol_examples.json"

TOPICS = [
    ("gravity", "science"),
    ("photosynthesis", "science"),
    ("melting", "science"),
    ("evaporation", "science"),
    ("rain", "science"),
    ("earthquakes", "science"),
    ("volcanoes", "science"),
    ("friction", "science"),
    ("force", "science"),
    ("energy", "science"),
    ("halves", "math"),
    ("equivalent_fractions", "math"),
    ("multiplication", "math"),
    ("division", "math"),
    ("perimeter", "math"),
    ("area", "math"),
    ("cause_and_effect", "general"),
    ("habitat", "science"),
    ("handwashing", "health"),
    ("shadows", "science"),
]


def parse_english():
    rows = []
    for line in ENGLISH.read_text(encoding="utf-8-sig").splitlines():
        match = re.match(r"^\| (\d{2}) \| (.+?) \| (.+?) \|$", line)
        if match:
            rows.append((int(match.group(1)), match.group(2), match.group(3)))
    return rows


def parse_bikol():
    return [
        line.strip().rstrip("|").strip()
        for line in BIKOL.read_text(encoding="utf-8-sig").splitlines()
        if line.strip()
    ]


def split_question_response(text):
    question, separator, response = text.partition("?")
    if not separator or not response.strip(" |"):
        raise ValueError(f"Expected a question and response: {text[:80]}")
    return question.strip() + "?", response.strip(" |")


def split_explanation_analogy(text):
    first, separator, rest = text.partition(". ")
    if not separator:
        return text.strip(), None
    return first.strip() + ".", rest.strip()


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument(
        "--reviewed", action="store_true", help="Confirm this exact Bikol source file was speaker-reviewed"
    )
    args = parser.parse_args()

    english = parse_english()
    bikol = parse_bikol()
    if len(english) != 20 or len(bikol) != 20 or len(TOPICS) != 20:
        raise ValueError(f"Expected 20 aligned entries; got English={len(english)}, Bikol={len(bikol)}")

    records = []
    for index, ((number, english_question, english_response), bikol_text) in enumerate(zip(english, bikol)):
        if number != index + 1:
            raise ValueError(f"English IDs are out of order at row {index + 1}")
        bikol_question, bikol_response = split_question_response(bikol_text)
        if "|" in bikol_response:
            bikol_response = bikol_response.lstrip("| ").strip()
        english_explanation, english_analogy = split_explanation_analogy(english_response)
        bikol_explanation, bikol_analogy = split_explanation_analogy(bikol_response)
        topic, subject = TOPICS[index]
        records.append({
            "id": f"sample_{number:03d}",
            "source_type": "tutoring_example",
            "topic": topic,
            "subject": subject,
            "difficulty": "simple",
            "style": "friend",
            "region_label": None,
            "review_status": "native_reviewed" if args.reviewed else "draft",
            "review_note": "User confirmed speaker review of this source file; regional variety not specified."
            if args.reviewed else "Speaker review pending.",
            "student_question_en": english_question,
            "student_question_bikol": bikol_question,
            "english_explanation": english_explanation,
            "english_analogy": english_analogy,
            "bikol_explanation": bikol_explanation,
            "bikol_analogy": bikol_analogy,
        })

    OUTPUT.write_text(json.dumps(records, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print(f"Wrote {len(records)} {records[0]['review_status']} examples to {OUTPUT}")


if __name__ == "__main__":
    main()
