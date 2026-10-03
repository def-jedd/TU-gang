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
