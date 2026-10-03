"""Keep academic facts separate from Bikol wording references."""

import json
import re


# The app's level and tutor pickers (apps/mobile/src/types/tutor.ts). The
# defaults ("simple", no tone) reproduce the CLI's original prompts exactly.
LEVEL_RULES = {
    "very_simple": "Each fact must be under 10 words and use only words a young child already knows.",
    "simple": "Each fact must be under 15 words and use simple grade-school vocabulary.",
    "normal": "Each fact must be under 20 words and use the vocabulary of a grade-school lesson.",
}
TONES = {
    "teacher": "a patient teacher",
    "friend": "a friendly classmate",
    "ate_kuya": "a caring older sibling (ate or kuya)",
}


def extract_facts(outline):
    facts = {}
    for line in outline.splitlines():
        match = re.match(r"\s*(?:Fact\s*)?([123])\s*[.):-]\s*(.+)", line, re.IGNORECASE)
        if match:
            facts[int(match.group(1))] = match.group(2).strip()
    if len(facts) != 3:
        raise ValueError("The fact model did not return three numbered facts. Please try again.")
    return [facts[number] for number in (1, 2, 3)]


def build_fact_prompt(student_question, difficulty="simple", action="explain"):
    retry = ("The student did not understand the usual explanation. Explain it from a different angle "
             "with a different everyday example.\n") if action == "explain_differently" else ""
    return f"""Answer this student's academic question with exactly three short facts in English.
{retry}Fact 1 directly answers the question. Fact 2 gives the mechanism or reason. Fact 3 gives an everyday example or observable consequence, whichever actually fits.
{LEVEL_RULES[difficulty]} Stay on the question. Do not invent hypothetical examples, use misleading analogies, or add unnecessary technical detail.
If unsure, say so rather than inventing a fact. Write only the three facts.

Question: {student_question}
"""


def build_prompt(student_question, retrieved_chunks, fact, include_references=True, style=None):
    tutoring = [chunk for chunk in retrieved_chunks if chunk.get("role") == "tutoring_style"]
    language = [chunk for chunk in retrieved_chunks if chunk.get("role") == "language_style"]

    tutor_text = "\n".join(
        f"- [{chunk['id']}; {chunk.get('retrieval_use', 'style_only')}] {chunk['text']}"
        for chunk in tutoring
    )
    language_text = "\n".join(f"- {chunk['text']}" for chunk in language)
    examples = ""
    if include_references:
        examples = f"\nSpeaker-reviewed Bikol tutoring examples (teaching style, not factual sources):\n{tutor_text}\n\nOptional public Bikol passages (unreviewed, language style only):\n{language_text}\n"
    tone = f" Sound like {TONES[style]} talking to the student." if style else ""

    return f"""Express this one English fact as one short Bikol sentence. Follow the reviewed examples' natural teaching style. Their exact regional variety is unspecified. Do not add information or copy unrelated topics from the examples. Keep technical terms in English when needed.{tone}

Student question: {student_question}
English fact: {fact}

{examples}

Write only the one Bikol sentence. No introduction or translation note.
"""


# Level wording for the one-call (hosted model) prompt.
FULL_ANSWER_LEVELS = {
    "very_simple": "Use very short sentences and only words a young child already knows.",
    "simple": "Use short sentences and simple grade-school vocabulary.",
    "normal": "Use the vocabulary of a grade-school lesson.",
}

# The app's answer fields. Students LISTEN to these (voice-first app), so the
# strings must read well aloud.
ANSWER_JSON_FORMAT = """Write a concise Bikol explanation, one relatable Bikol example, and exactly three short Bikol key points. Write for listening: short sentences, no lists, symbols, or section labels inside the text. Do not include an English translation.
Return only a JSON object with exactly these keys:
{"explanation": "<Bikol explanation>", "example": "<Bikol example>", "key_points": ["<point 1>", "<point 2>", "<point 3>"]}
"""

CLI_FORMAT = (
    "Write a concise Bikol explanation, relatable Bikol example sentences, and exactly three short Bikol "
    "key points. If the student asks for a specific number of example sentences, provide that number; "
    "otherwise provide one. Follow other reasonable format requests from the student. Use clear section "
    "labels. Do not include an English translation.\n"
)


def build_full_answer_prompt(student_question, retrieved_chunks, difficulty=None, style=None,
                             action="explain", as_json=False):
    """One-call prompt for a hosted model; examples teach style, not facts.

    With no choices this is exactly the CLI's prompt. The mobile API passes the
    app's level, tutor, and "another way" choices and asks for JSON (as_json).
    """
    tutoring = [chunk for chunk in retrieved_chunks if chunk.get("role") == "tutoring_style"]
    language = [chunk for chunk in retrieved_chunks if chunk.get("role") == "language_style"]
    examples = "\n\n".join(
        f"Example {index} [{chunk['id']}; {chunk.get('retrieval_use', 'style_only')}]:\n{chunk['text']}"
        for index, chunk in enumerate(tutoring, 1)
    )
    public = "\n".join(f"- {chunk['text']}" for chunk in language)

    adapt = []
    if action == "explain_differently":
        adapt.append("The student did not understand the usual explanation. Explain it from a different "
                     "angle with a different everyday example.")
    if difficulty:
        adapt.append(FULL_ANSWER_LEVELS[difficulty])
    if style:
        adapt.append(f"Sound like {TONES[style]} talking to the student.")
    adaptation = f"{' '.join(adapt)}\n\n" if adapt else ""

    return f"""You are a patient educational tutor. Answer the student's new question in natural Bikol, using the speaker-reviewed teaching interactions below as examples of how to explain. The exact regional variety of these examples has not been specified.

First understand the concept accurately. Teach it rather than translating an English answer word for word. Use an English academic term if a reliable Bikol term is unclear. Do not copy the examples' facts into an unrelated answer. If uncertain about a factual claim, say so. These examples demonstrate teaching style and are not factual sources for the new question.

Speaker-reviewed teaching examples:
{examples}

Optional unreviewed public language references (wording only):
{public or 'None'}

New student question: {student_question}

{adaptation}{ANSWER_JSON_FORMAT if as_json else CLI_FORMAT}"""


def parse_answer_json(raw):
    """The model's JSON answer as the app's fields. ValueError if it is unusable."""
    text = raw.strip()
    fenced = re.match(r"^```(?:json)?\s*(.*?)\s*```$", text, re.DOTALL)
    if fenced:
        text = fenced.group(1)
    try:
        data = json.loads(text)
    except json.JSONDecodeError as error:
        raise ValueError("The model's answer was not in the expected format. Please try again.") from error
    if not isinstance(data, dict):
        raise ValueError("The model's answer was not in the expected format. Please try again.")

    explanation = data.get("explanation")
    if not isinstance(explanation, str) or not explanation.strip():
        raise ValueError("The model's answer had no explanation. Please try again.")
    example = data.get("example")
    points = data.get("key_points")
    if not isinstance(points, list):
        points = []
    return {
        "explanation": explanation.strip(),
        "example": example.strip() if isinstance(example, str) else "",
        "key_points": [point.strip() for point in points if isinstance(point, str) and point.strip()][:3],
    }

