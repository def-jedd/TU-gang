"""Inspect retrieval and the few-shot prompt for the Bikol tutor prototype.

This program does not call Amazon Quick. Its printed prompt is the handoff
boundary until the team's supported Quick invocation method is verified.
"""

import argparse
import json
import math
import re
from collections import Counter
from pathlib import Path


DATA_FILE = Path(__file__).resolve().parents[1] / "data" / "bikol_examples.json"
STOPWORDS = {
    "a", "an", "and", "are", "can", "do", "does", "for", "have", "how", "in",
    "is", "it", "of", "on", "our", "the", "their", "to", "we", "what", "when",
    "where", "why", "with", "you", "your",
}
FALLBACK_IDS = ("sample_001", "sample_011", "sample_017")


def tokens(text):
    return [word for word in re.findall(r"[a-z0-9]+", text.lower()) if word not in STOPWORDS]


def searchable_text(record):
    # English is the shared retrieval language for these examples.
    return " ".join([
        record["topic"].replace("_", " "),
        record["student_question_en"],
        record["student_question_en"],
        record["english_explanation"],
        record.get("english_analogy") or "",
    ])


def lexical_scores(question, records):
    """Small corpus TF-IDF cosine baseline; these are not model embeddings."""
    documents = [Counter(tokens(searchable_text(row))) for row in records]
    query = Counter(tokens(question))
    document_frequency = Counter()
    for document in documents:
        document_frequency.update(document.keys())
    count = len(documents)

    def vector(counts):
        return {
            word: (1 + math.log(freq)) * (math.log((count + 1) / (document_frequency[word] + 1)) + 1)
            for word, freq in counts.items()
        }

    query_vector = vector(query)
    query_norm = math.sqrt(sum(value * value for value in query_vector.values()))
    scores = []
    for document in documents:
        doc_vector = vector(document)
        doc_norm = math.sqrt(sum(value * value for value in doc_vector.values()))
        dot = sum(value * doc_vector.get(word, 0) for word, value in query_vector.items())
        scores.append(dot / (query_norm * doc_norm) if query_norm and doc_norm else 0.0)
    return scores


def semantic_scores(question, records):
    """Optional real embedding model, shared by query and stored English text."""
    try:
        from sentence_transformers import SentenceTransformer
    except ImportError as exc:
        raise RuntimeError(
            "Semantic mode needs sentence-transformers. Install requirements-semantic.txt "
            "or use the default lexical mode."
        ) from exc
    model = SentenceTransformer("sentence-transformers/all-MiniLM-L6-v2")
    corpus_vectors = model.encode([searchable_text(row) for row in records], normalize_embeddings=True)
    question_vector = model.encode([question], normalize_embeddings=True)[0]
    return [float(question_vector @ vector) for vector in corpus_vectors]


def retrieve(question, records, mode="lexical", limit=3):
    if not records:
        return [], "no reviewed examples"
    scores = lexical_scores(question, records) if mode == "lexical" else semantic_scores(question, records)
    ranked = sorted(zip(records, scores), key=lambda item: (-item[1], item[0]["id"]))
    if mode == "semantic":
        return ranked[:limit], "semantic ranking; inspect relevance before using examples as topic matches"
    positive = [(row, score) for row, score in ranked if score > 0]
    if positive:
        selected = positive[:limit]
        selected_ids = {row["id"] for row, _ in selected}
        fill = [row for row in records if row["id"] in FALLBACK_IDS and row["id"] not in selected_ids]
        selected.extend((row, 0.0) for row in fill[:limit - len(selected)])
        return selected, f"{len(positive[:limit])} topical match(es); {len(selected) - len(positive[:limit])} style fallback(s)"

    # No overlap in the lexical baseline: use diverse examples as *style only*.
    # Semantic models tend to assign positive scores even to unrelated items,
    # so users must inspect the returned matches rather than infer relevance.
    fallback = [row for row in records if row["id"] in FALLBACK_IDS][:limit]
    return [(row, 0.0) for row in fallback], "style fallback; no topic match"


def build_prompt(question, matches, retrieval_note):
    lines = [
        "You are an educational tutor who explains school concepts in natural Bikol.",
        "Teach the concept before giving an analogy. Avoid literal translation.",
        "Use the examples below as demonstrations of teaching style and language only.",
        "Do not copy their unrelated facts into the new answer.",
        "If an academic Bikol term is uncertain, retain the English term and explain it.",
        "Return an explanation, one relatable example, and three key points.",
        "The examples are not independent proof of scientific accuracy.",
        "",
        f"Retrieval note: {retrieval_note}",
    ]
    for index, (row, _) in enumerate(matches, 1):
        lines.extend([
            "",
            f"Teaching example {index} ({row['id']}; {row['review_status']}; {row['topic']}):",
            f"Student: {row['student_question_bikol']}",
            f"Tutor: {row['bikol_explanation']} {row.get('bikol_analogy') or ''}".strip(),
        ])
    lines.extend(["", f"New student question: {question}", "Answer this new question in Bikol."])
    return "\n".join(lines)


def run_question(question, records, mode, include_drafts):
    eligible = [
        row for row in records
        if row["review_status"] == "native_reviewed" or include_drafts
    ]
    matches, note = retrieve(question, eligible, mode)
    print(f"\nQuestion: {question}")
    print(f"Retrieval: {mode}; {note}")
    if not matches:
        print("No reviewed records available. Review examples or use --include-drafts for a labeled demo.")
        return
    for row, score in matches:
        print(f"  {row['id']} | {row['topic']} | score={score:.3f} | {row['review_status']}")
    if any(row["review_status"] != "native_reviewed" for row, _ in matches):
        print("WARNING: Draft examples are included. Do not present them as native-validated.")
    print("\n--- Prompt for a verified generator ---")
    print(build_prompt(question, matches, note))
    print("--- End prompt; no AI generation was performed ---\n")


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("question", nargs="?", help="One question; omit to chat interactively")
    parser.add_argument("--mode", choices=("lexical", "semantic"), default="lexical")
    parser.add_argument("--include-drafts", action="store_true")
    args = parser.parse_args()

    records = json.loads(DATA_FILE.read_text(encoding="utf-8"))
    if args.question:
        run_question(args.question, records, args.mode, args.include_drafts)
        return
    print("Bikol retrieval prototype. Type a question, or 'exit' to quit.")
    while True:
        try:
            question = input("student> ").strip()
        except (EOFError, KeyboardInterrupt):
            print()
            break
        if question.lower() in {"exit", "quit"}:
            break
        if question:
            try:
                run_question(question, records, args.mode, args.include_drafts)
            except RuntimeError as exc:
                print(f"Error: {exc}")


if __name__ == "__main__":
    main()
