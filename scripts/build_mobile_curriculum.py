"""Bundle data/curriculum/grade-*.json into the app (offline lesson list).

    python scripts/build_mobile_curriculum.py

Writes apps/mobile/src/curriculum/term1.json: only the fields the app shows.
ORDER MATTERS: progress on profile cards is a bitset over each grade's entry
order, so never reorder or delete entries in a grade file — only append.
Standard library only.
"""

import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
SRC = ROOT / "data" / "curriculum"
OUT = ROOT / "apps" / "mobile" / "src" / "curriculum" / "term1.json"


def slim(entry):
    title = entry.get("title") or {}
    return {
        "id": entry["id"],
        "subject": entry["subject"],
        "week": entry["week"],
        "competency": entry["competency"],
        "topic": entry.get("topic"),
        "title": {lang: text for lang, text in title.items() if text},
        "question": entry.get("student_question"),
        "icon": entry.get("icon"),
    }


def main():
    grades = {}
    for grade in range(1, 10):
        data = json.loads((SRC / f"grade-{grade}.json").read_text(encoding="utf-8"))
        grades[str(grade)] = [slim(e) for e in data["entries"]]
    OUT.write_text(json.dumps({"term": 1, "grades": grades}, ensure_ascii=False, separators=(",", ":")), encoding="utf-8")
    total = sum(len(v) for v in grades.values())
    print(f"wrote {OUT.relative_to(ROOT)}: {total} lessons, {OUT.stat().st_size // 1024} KB")


if __name__ == "__main__":
    main()
