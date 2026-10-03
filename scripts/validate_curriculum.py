"""Check data/curriculum and data/quick_answers (format in data/curriculum/README.md).

    python scripts/validate_curriculum.py

Exits 1 and lists every problem, or prints a summary when everything is valid.
Standard library only.
"""

import json
import re
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
CURRICULUM = ROOT / "data" / "curriculum"
ANSWERS = ROOT / "data" / "quick_answers"

SUBJECTS = {
    "english", "filipino", "mathematics", "science", "araling_panlipunan", "mapeh",
    "epp_tle", "gmrc_values", "makabansa", "language", "reading_literacy",
}
LANGUAGES = {"bikol_daet", "tagalog", "english"}
DIFFICULTIES = {"very_simple", "simple", "normal"}
REVIEW = {"draft", "reviewed"}
ID_PATTERN = re.compile(r"^g([1-9])-([a-z_]+)-w(\d{1,2})-(\d{1,2})$")
TOPIC_PATTERN = re.compile(r"^[a-z0-9_]{2,40}$")
PLACEHOLDER = re.compile(r"COPY (FROM|THE EXACT)|^\.\.\.$")


def load(path, problems):
    try:
        data = json.loads(path.read_text(encoding="utf-8"))
    except (OSError, json.JSONDecodeError) as error:
        problems.append(f"{path.name}: not valid JSON ({error})")
        return []
    if not isinstance(data, dict) or not isinstance(data.get("entries"), list):
        problems.append(f'{path.name}: must be {{"grade": N, "term": 1, "entries": [...]}}')
        return []
    return data["entries"]


def text(entry, key):
    value = entry.get(key)
    return isinstance(value, str) and value.strip() != "" and not PLACEHOLDER.search(value)


def check_curriculum(problems):
    ids = {}
    for path in sorted(CURRICULUM.glob("grade-*.json")):
        expected_grade = int(re.search(r"grade-(\d+)", path.name).group(1))
        for n, e in enumerate(load(path, problems), 1):
            where = f"{path.name} entry {n} ({e.get('id', 'no id')})"
            match = ID_PATTERN.match(str(e.get("id", "")))
            if not match:
                problems.append(f"{where}: id must look like g7-science-w1-1")
            elif e["id"] in ids:
                problems.append(f"{where}: duplicate id (also in {ids[e['id']]})")
            else:
                ids[e["id"]] = path.name
            if e.get("grade") != expected_grade:
                problems.append(f"{where}: grade must be {expected_grade} in this file")
            if match and (int(match.group(1)) != e.get("grade") or match.group(2) != e.get("subject")
                          or int(match.group(3)) != e.get("week")):
                problems.append(f"{where}: id doesn't match grade/subject/week")
            if e.get("subject") not in SUBJECTS:
                problems.append(f"{where}: subject '{e.get('subject')}' is not one of {sorted(SUBJECTS)}")
            if e.get("term") != 1:
                problems.append(f"{where}: term must be 1 for now")
            if not isinstance(e.get("week"), int) or not 1 <= e["week"] <= 14:
                problems.append(f"{where}: week must be a number 1-14")
            code = e.get("competency_code")
            if code is not None and not text(e, "competency_code"):
                problems.append(f"{where}: competency_code must be the printed code or null")
            for key in ("competency", "student_question", "source"):
                if not text(e, key):
                    problems.append(f"{where}: '{key}' is missing or still a placeholder")
            if not TOPIC_PATTERN.match(str(e.get("topic", ""))):
                problems.append(f"{where}: topic must be lowercase letters/digits/underscores")
            title = e.get("title")
            if not isinstance(title, dict) or not isinstance(title.get("en"), str) or not title["en"].strip():
                problems.append(f"{where}: title.en is required (title.tl / title.bik optional)")
            if e.get("review_status") not in REVIEW:
                problems.append(f"{where}: review_status must be draft or reviewed")
    return ids


def check_answers(ids, problems):
    seen = set()
    count = 0
    for path in sorted(ANSWERS.glob("grade-*.json")):
        for n, a in enumerate(load(path, problems), 1):
            count += 1
            where = f"{path.name} answer {n} ({a.get('competency_id')}, {a.get('language')}, {a.get('difficulty')})"
            if a.get("competency_id") not in ids:
                problems.append(f"{where}: competency_id not found in data/curriculum")
            if a.get("language") not in LANGUAGES:
                problems.append(f"{where}: language must be one of {sorted(LANGUAGES)}")
            if a.get("difficulty") not in DIFFICULTIES:
                problems.append(f"{where}: difficulty must be one of {sorted(DIFFICULTIES)}")
            key = (a.get("competency_id"), a.get("language"), a.get("difficulty"))
            if key in seen:
                problems.append(f"{where}: duplicate answer for this competency/language/level")
            seen.add(key)
            if not text(a, "explanation"):
                problems.append(f"{where}: explanation is missing")
            if not isinstance(a.get("example", ""), str):
                problems.append(f"{where}: example must be text (can be empty)")
            points = a.get("key_points")
            if not isinstance(points, list) or len(points) != 3 or not all(isinstance(p, str) and p.strip() for p in points):
                problems.append(f"{where}: key_points must be exactly 3 non-empty strings")
            if not str(a.get("generated_by", "")).startswith("Amazon Quick"):
                problems.append(f"{where}: generated_by must start with 'Amazon Quick' (only Quick output belongs here)")
            if a.get("review_status") not in REVIEW:
                problems.append(f"{where}: review_status must be draft or reviewed")
    return count


def main():
    problems = []
    ids = check_curriculum(problems)
    answers = check_answers(ids, problems)
    if problems:
        print(f"{len(problems)} problem(s):")
        for problem in problems:
            print(f"  - {problem}")
        sys.exit(1)
    print(f"OK: {len(ids)} competencies, {answers} saved Quick answers.")


if __name__ == "__main__":
    main()
