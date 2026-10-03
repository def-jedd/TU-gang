"""Build searchable chunks from the reviewed tutoring dataset."""

import argparse
import json
import re
from pathlib import Path


BASE = Path(__file__).resolve().parent
REVIEWED_EXAMPLES = BASE.parents[1] / "data/bikol_examples.json"
RAW_HALO = BASE / "data/raw/halo_bcl/sample.json"
OUTPUT = BASE / "data/processed/bikol_chunks.json"


def clean_text(value):
    if not isinstance(value, str):
        return ""
    # The halo sample contains scraped pages with site navigation and comment forms.
    value = re.split(r"### Submit a Comment|Save my name, email|Importanteng Paisi:", value, maxsplit=1)[0]
    value = re.sub(r"\[[^]]+\]\([^)]*\)", " ", value)
    value = re.sub(r"\[[^]]+\]\(", " ", value)
    value = re.sub(r"https?://\S+", " ", value)
    return re.sub(r"\s+", " ", value).strip()


def public_chunks(text):
    sentences = re.split(r"(?<=[.!?])\s+", clean_text(text))
    usable = []
    for sentence in sentences:
        sentence = sentence.strip(" #*-|\\")
        lower = sentence.lower()
        if not 55 <= len(sentence) <= 350:
            continue
        if "�" in sentence or "http" in lower or "published on" in lower:
            continue
        if sentence.startswith("Saturday,") or any(mark in sentence for mark in ("<", ">", "[", "]")):
            continue
        if any(word in lower for word in ("diputa", "deputa", "yudiputa", "kinantot", "iniyot")):
            continue
        if sum(char.isalpha() for char in sentence) / len(sentence) < 0.7:
            continue
        usable.append(sentence)

    chunk = []
    for sentence in usable:
        if chunk and (len(" ".join(chunk)) + len(sentence) + 1 > 600 or len(chunk) == 5):
            yield " ".join(chunk)
            chunk = []
        chunk.append(sentence)
    if chunk:
        yield " ".join(chunk)


def load_halo_sample():
    if RAW_HALO.exists():
        return json.loads(RAW_HALO.read_text(encoding="utf-8"))

    from datasets import load_dataset

    dataset = load_dataset("sapinsapin/halo-bcl", split="train")
    rows = [{"text": row.get("text", "")} for row in dataset.select(range(min(50, len(dataset))))]
    RAW_HALO.parent.mkdir(parents=True, exist_ok=True)
    RAW_HALO.write_text(json.dumps(rows, ensure_ascii=False, indent=2), encoding="utf-8")
    return rows


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--include-public", action="store_true", help="Add the local Halo-BCL sample as unreviewed language references")
    args = parser.parse_args()
    chunks = []
    for item in json.loads(REVIEWED_EXAMPLES.read_text(encoding="utf-8")):
        validated = item.get("review_status") == "native_reviewed"
        question = item["student_question_bikol"]
        explanation = item["bikol_explanation"]
        analogy = item.get("bikol_analogy") or ""
        chunks.append({
            "id": item["id"],
            "text": f"Student: {question}\nTutor: {explanation} {analogy}".strip(),
            "retrieval_text": " ".join(filter(None, (
                item["topic"].replace("_", " "), item["student_question_en"],
                item["english_explanation"], item.get("english_analogy"),
            ))),
            "source": "human_validated" if validated else "tutoring_draft",
            "topic": item.get("topic"), "subject": item.get("subject"),
            "difficulty": item.get("difficulty"), "style": item.get("style"),
            "region": item.get("region_label"),
            "validated": validated, "role": "tutoring_style",
        })

    if args.include_public:
        seen = {item["text"].casefold() for item in chunks}
        public_count = 0
        for row_index, row in enumerate(load_halo_sample()):
            raw_text = row.get("text", "")
            heading = raw_text[:150].lower()
            # This inherited sample lacks per-row source URLs and regional labels.
            if row_index < 26 or not raw_text.startswith("Saturday") or any(word in heading for word in ("regla", "diputa")):
                continue
            row_count = 0
            for part_index, text in enumerate(public_chunks(raw_text)):
                if not 120 <= len(text) <= 700 or text.casefold() in seen:
                    continue
                seen.add(text.casefold())
                chunks.append({
                    "id": f"halo_{row_index:04d}_{part_index:03d}", "text": text,
                    "retrieval_text": text,
                    "source": "halo-bcl", "topic": None, "subject": None,
                    "difficulty": None, "region": None, "validated": False,
                    "role": "language_style",
                })
                public_count += 1
                row_count += 1
                if row_count >= 3 or public_count >= 30:
                    break
            if public_count >= 30:
                break

    OUTPUT.parent.mkdir(parents=True, exist_ok=True)
    OUTPUT.write_text(json.dumps(chunks, ensure_ascii=False, indent=2), encoding="utf-8")
    print(f"Saved {len(chunks)} references to {OUTPUT}")


if __name__ == "__main__":
    main()
