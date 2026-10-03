"""Run the tutor test cases through Gemini and log the results.

Usage (from apps/bikol-rag-cli): python run_tutor_tests.py run1
"""

import csv
import sys
from pathlib import Path

import config
from chat import load_retriever
from prompt_builder import build_tutor_prompt
from providers import get_provider
from tutor_output import parse_tutor_output, spoken_style_problems

ROOT = Path(__file__).resolve().parents[2]
SYSTEM = (ROOT / "prompts" / "tutor_system.txt").read_text(encoding="utf-8")

# id, question, input_language, level, style, action, previous_case_id
CASES = [
    ("T01", "Why do objects fall?", "en", "simple", "friend", "explain", None),
    ("T02", "What does one-half mean?", "en", "simple", "friend", "explain", None),
    ("T03", "Explain black holes simply", "en", "simple", "friend", "explain", None),
    ("T04", "What is a fraction?", "en", "simple", "friend", "explain", None),
    ("T05", "Bakit natutunaw ang yelo?", "tl", "simple", "friend", "explain", None),
    ("T06", "Why does ice melt?", "en", "very_simple", "friend", "explain", None),
    ("T07", "Why does ice melt?", "en", "simple", "friend", "explain", None),
    ("T08", "Why does ice melt?", "en", "normal", "friend", "explain", None),
    ("T09", "Why does ice melt?", "en", "simple", "teacher", "explain", None),
    ("T10", "Why does ice melt?", "en", "simple", "ate_kuya", "explain", None),
    ("T11", "How do plants make food? Include the chlorophyll part.", "en", "simple", "friend", "explain", None),
    ("T12", "Why is the sky blue?", "en", "simple", "friend", "explain", None),
    ("T13", "Why do objects fall?", "en", "simple", "friend", "explain_differently", "T01"),
]

FIELDS = ["id", "question", "input_language", "level", "style", "action", "generator",
          "examples_used", "output", "format_ok", "spoken_style_problems",
          "correct_science", "naturalness", "notes"]


def main():
    tag = sys.argv[1] if len(sys.argv) > 1 else "run1"
    provider = get_provider("gemini", config.GEMINI_MODEL_NAME)
    problem = provider.check_ready()
    if problem:
        print(problem)
        return
    retriever = load_retriever()
    out_dir = ROOT / "data" / "tests"
    out_dir.mkdir(parents=True, exist_ok=True)

    outputs, rows = {}, []
    for case_id, question, lang, level, style, action, previous in CASES:
        chunks = retriever.retrieve(question, config.TOP_GENERAL_CHUNKS, config.TOP_CUSTOM_CHUNKS)
        used = ";".join(f"{c['id']}({c.get('retrieval_use', '')})"
                        for c in chunks if c.get("role") == "tutoring_style")
        prompt = build_tutor_prompt(question, chunks, level, style, action, outputs.get(previous))
        row = {"id": case_id, "question": question, "input_language": lang, "level": level,
               "style": style, "action": action, "generator": "gemini",
               "examples_used": used, "output": "", "format_ok": "",
               "spoken_style_problems": "", "correct_science": "", "naturalness": "", "notes": ""}
        try:
            text = provider.generate(SYSTEM + "\n\n" + prompt)
            row["output"] = text
            outputs[case_id] = text
            try:
                parsed = parse_tutor_output(text)
                row["format_ok"] = "yes"
                row["spoken_style_problems"] = "; ".join(spoken_style_problems(parsed)) or "none"
            except ValueError as error:
                row["format_ok"] = f"no: {error}"
        except RuntimeError as error:
            row["output"] = f"ERROR: {error}"
            row["format_ok"] = "no"
        rows.append(row)
        print(case_id, row["format_ok"])

    path = out_dir / f"gemini_{tag}.csv"
    with path.open("w", newline="", encoding="utf-8-sig") as file:
        writer = csv.DictWriter(file, fieldnames=FIELDS)
        writer.writeheader()
        writer.writerows(rows)
    print(f"Saved {path}")


if __name__ == "__main__":
    main()