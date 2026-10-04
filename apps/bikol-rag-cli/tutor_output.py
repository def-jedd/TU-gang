"""Parse and check the tutor's labeled output. This cannot judge Bikol naturalness."""

import re

LABELS = ["TOPIC", "EXPLANATION", "EXAMPLE", "KEY_POINT_1", "KEY_POINT_2", "KEY_POINT_3"]


def parse_tutor_output(text):
    pattern = "|".join(LABELS)
    result = {}
    for label in LABELS:
        match = re.search(rf"^{label}:\s*(.+?)(?=^(?:{pattern}):|\Z)", text, re.S | re.M)
        if not match:
            raise ValueError(f"Missing {label}")
        result[label] = match.group(1).strip()
    return result


def spoken_style_problems(parsed):
    body = " ".join(value for key, value in parsed.items() if key != "TOPIC")
    problems = []
    words = len(body.split())
    if words > 120:
        problems.append(f"{words} words")
    if re.search(r"[*#_`•()\[\]]", body):
        problems.append("markdown or symbols")
    if re.search(r"\d", body):
        problems.append("digits")
    return problems