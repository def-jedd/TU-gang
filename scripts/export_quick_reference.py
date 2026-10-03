import json
from pathlib import Path

root = Path(__file__).resolve().parents[1]
rows = json.loads((root / "data/bikol_examples.json").read_text(encoding="utf-8"))
out = ["# Speaker-reviewed Bikol teaching examples",
       "Use for teaching style and phrasing only. Not factual sources.",
       "Regional variety: not confirmed.\n"]
for r in rows:
    if r["review_status"] != "native_reviewed":
        continue
    out.append(f"## {r['id']} - {r['topic']} ({r['subject']})")
    out.append(f"Student: {r['student_question_bikol']}")
    out.append(f"Tutor: {r['bikol_explanation']} {r.get('bikol_analogy') or ''}".strip())
    out.append("")
(root / "data/quick_reference.md").write_text("\n".join(out), encoding="utf-8")
print("wrote data/quick_reference.md")