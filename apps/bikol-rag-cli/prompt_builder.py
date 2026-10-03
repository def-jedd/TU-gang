"""Keep academic facts separate from Bikol wording references."""

import re


def extract_facts(outline):
    facts = {}
    for line in outline.splitlines():
        match = re.match(r"\s*(?:Fact\s*)?([123])\s*[.):-]\s*(.+)", line, re.IGNORECASE)
        if match:
            facts[int(match.group(1))] = match.group(2).strip()
    if len(facts) != 3:
        raise ValueError("The fact model did not return three numbered facts. Please try again.")
    return [facts[number] for number in (1, 2, 3)]


def build_fact_prompt(student_question):
    return f"""Answer this student's academic question with exactly three short facts in English.
Fact 1 directly answers the question. Fact 2 gives the mechanism or reason. Fact 3 gives an everyday example or observable consequence, whichever actually fits.
Each fact must be under 15 words and use simple grade-school vocabulary. Stay on the question. Do not invent hypothetical examples, use misleading analogies, or add unnecessary technical detail.
If unsure, say so rather than inventing a fact. Write only the three facts.

Question: {student_question}
"""


def build_prompt(student_question, retrieved_chunks, fact, include_references=True):
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

    return f"""Express this one English fact as one short Bikol sentence. Follow the reviewed examples' natural teaching style. Their exact regional variety is unspecified. Do not add information or copy unrelated topics from the examples. Keep technical terms in English when needed.

Student question: {student_question}
English fact: {fact}

{examples}

Write only the one Bikol sentence. No introduction or translation note.
"""


def build_full_answer_prompt(student_question, retrieved_chunks, language="bikol"):
    """Build a hosted-model prompt with examples suited to the answer language."""
    language = language.lower()
    if language not in ("bikol", "tagalog", "english"):
        raise ValueError(f"Unsupported answer language: {language}")
    tutoring = [chunk for chunk in retrieved_chunks if chunk.get("role") == "tutoring_style"]

    if language == "bikol":
        examples = "\n\n".join(
            f"Example {index} [{chunk['id']}; {chunk.get('retrieval_use', 'style_only')}]:\n{chunk['text']}"
            for index, chunk in enumerate(tutoring, 1)
        )
        public = "\n".join(
            f"- {chunk['text']}" for chunk in retrieved_chunks if chunk.get("role") == "language_style"
        )
        intro = "Answer in natural Bikol. Use the speaker-reviewed Bikol teaching interactions below for teaching and wording style. Their exact regional variety is unspecified."
        examples_heading = "Speaker-reviewed Bikol teaching examples"
        public_section = f"Optional unreviewed public Bikol language references (wording only):\n{public or 'None'}\n\n"
        final = "Write a concise Bikol explanation, relatable Bikol example sentences, and exactly three short Bikol key points. Do not include an English translation."
    else:
        name = "Tagalog" if language == "tagalog" else "English"
        examples = "\n\n".join(
            f"Example {index} [{chunk['id']}; {chunk.get('retrieval_use', 'style_only')}]:\n"
            f"Student: {chunk['english_question']}\nTutor: {chunk['english_answer']}"
            for index, chunk in enumerate(tutoring, 1)
        )
        intro = f"Answer in natural {name}. The examples below are English teaching examples for structure and simplicity; they have not been reviewed as {name} language examples."
        examples_heading = "English teaching examples"
        public_section = ""
        final = f"Write a concise {name} explanation, relatable {name} example sentences, and exactly three short {name} key points. Write only in {name}, except for necessary technical terms. Do not add a translation."

    return f"""You are a patient educational tutor. {intro}

First understand the concept accurately. Teach it rather than translating an English answer word for word. Do not copy the examples' facts into an unrelated answer. If uncertain about a factual claim, say so. These examples demonstrate teaching style and are not factual sources for the new question.

{examples_heading}:
{examples}

{public_section}New student question: {student_question}

{final} If the student asks for a specific number of example sentences, provide that number; otherwise provide one. Follow other reasonable format requests from the student. Use clear section labels.
"""
def build_tutor_prompt(student_question, retrieved_chunks, difficulty="simple",
                       style="friend", action="explain", previous=None):
    """User message for the app tutor. The system prompt lives in prompts/tutor_system.txt."""
    tutoring = [c for c in retrieved_chunks if c.get("role") == "tutoring_style"]
    examples = "\n\n".join(
        f"Example {i} [{c['id']}; {c.get('retrieval_use', 'style_only')}]:\n{c['text']}"
        for i, c in enumerate(tutoring, 1)
    )
    again = ""
    if action == "explain_differently":
        again = ("\nThe student did not understand the earlier answer. Use a different "
                 "angle and a different example. Same facts, new wording.\n"
                 f"Earlier answer (do not repeat it):\n{previous or 'not available'}\n")
    return f"""Level: {difficulty}
Style: {style}
Action: {action}

Speaker-reviewed Bikol examples (teaching style and phrasing only, not factual sources):
{examples}
{again}
Student question: {student_question}
"""