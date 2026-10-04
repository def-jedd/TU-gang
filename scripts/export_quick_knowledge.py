"""Knowledge files for the Amazon Quick "Bikol Tutor" chat agent.

    python scripts/export_quick_knowledge.py

Writes data/quick_knowledge/:
  curriculum-grade-1.md … curriculum-grade-9.md   DepEd Term 1 competencies (official BOW,
                                                  word for word) -> upload to a Quick Space
  bikol-examples.md                               speaker-reviewed Bikol examples (same rows as
                                                  data/quick_reference.md) -> Reference documents
  tutor-guide.md is hand-written (not generated) -> Reference documents

Setup steps: ai/quick-agent/SETUP.md. Standard library only.
"""

import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / "data" / "quick_knowledge"

SUBJECTS = {
    "reading_literacy": "Reading and Literacy", "language": "Language", "english": "English",
    "filipino": "Filipino", "mathematics": "Mathematics", "science": "Science", "makabansa": "Makabansa",
    "araling_panlipunan": "Araling Panlipunan (Social Studies)", "gmrc_values": "GMRC / Values Education",
    "epp_tle": "EPP / TLE", "mapeh": "MAPEH",
}


def curriculum(grade):
    data = json.loads((ROOT / "data" / "curriculum" / f"grade-{grade}.json").read_text(encoding="utf-8"))
    lines = [
        f"# DepEd Term 1 lessons: Grade {grade}",
        "",
        "Official competencies from DepEd's Three-Term Budgets of Work (BOW), copied word for word.",
        "Each lesson has an id (g<grade>-<subject>-w<week>-<n>), a short title written by the TU-gang team,",
        "the competency, and a child-friendly starter question. Teach ONLY what the competency asks.",
        "",
    ]
    by_subject = {}
    for e in data["entries"]:
        by_subject.setdefault(e["subject"], []).append(e)
    for subject, entries in by_subject.items():
        lines += [f"## Grade {grade} {SUBJECTS.get(subject, subject)}", ""]
        week = None
        for e in entries:
            if e["week"] != week:
                week = e["week"]
                lines += [f"### Grade {grade} {SUBJECTS.get(subject, subject)}, Week {week}", ""]
            title = (e.get("title") or {}).get("en") or e["competency"].split("\n")[0]
            competency = e["competency"].replace("\n", "\n  ")
            lines.append(f"- **{e['id']}: {title}**")
            lines.append(f"  Competency: {competency}")
            if e.get("student_question"):
                lines.append(f"  Starter question: {e['student_question']}")
        lines.append("")
    return "\n".join(lines)


def bikol_examples():
    rows = json.loads((ROOT / "data" / "bikol_examples.json").read_text(encoding="utf-8"))
    out = [
        "# Speaker-reviewed Bikol teaching examples",
        "Use for Bikol wording and teaching style only. They are NOT factual sources for other topics.",
        "Regional variety: not confirmed (do not claim a specific town's dialect).",
        "",
    ]
    for r in rows:
        if r.get("review_status") != "native_reviewed":
            continue
        out.append(f"## {r['id']}: {r['topic']} ({r['subject']})")
        out.append(f"Student: {r['student_question_bikol']}")
        out.append(f"Tutor: {r['bikol_explanation']} {r.get('bikol_analogy') or ''}".strip())
        out.append("")
    return "\n".join(out)


def main():
    OUT.mkdir(parents=True, exist_ok=True)
    sizes = {}
    for grade in range(1, 10):
        path = OUT / f"curriculum-grade-{grade}.md"
        path.write_text(curriculum(grade), encoding="utf-8")
        sizes[path.name] = len(path.read_text(encoding="utf-8"))
    path = OUT / "bikol-examples.md"
    path.write_text(bikol_examples(), encoding="utf-8")
    sizes[path.name] = len(path.read_text(encoding="utf-8"))
    guide = OUT / "tutor-guide.md"
    if guide.exists():
        sizes[guide.name] = len(guide.read_text(encoding="utf-8"))
    for name, chars in sizes.items():
        print(f"{name:28} {chars:>7,} characters")
    print("Reference documents limit in Quick: 100,000 characters in total.")


if __name__ == "__main__":
    main()
