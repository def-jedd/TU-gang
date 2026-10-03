"""Interactive Bikol tutor: retrieve style, generate facts, express them in Bikol."""

import hashlib
import json

import numpy as np
from sentence_transformers import SentenceTransformer

import config
from answer_check import clearly_english
from prompt_builder import build_fact_prompt, build_full_answer_prompt, build_prompt, extract_facts
from providers import get_provider
from retrieval import Retriever


def load_retriever():
    try:
        with open(config.CHUNKS_PATH, encoding="utf-8") as file:
            chunks = json.load(file)
        with open(config.CHUNKS_PATH, "rb") as file:
            corpus_hash = hashlib.sha256(file.read()).hexdigest()
        with open(config.EMBEDDINGS_META_PATH, encoding="utf-8") as file:
            metadata = json.load(file)
        embeddings = np.load(config.EMBEDDINGS_PATH)
    except FileNotFoundError as error:
        raise RuntimeError("Data missing. Run `python prepare_data.py` and `python build_embeddings.py`.") from error

    if metadata.get("corpus_sha256") != corpus_hash or metadata.get("model") != config.EMBEDDING_MODEL_NAME:
        raise RuntimeError("Corpus or model changed. Run `python build_embeddings.py` before chatting.")
    model = SentenceTransformer(config.EMBEDDING_MODEL_NAME)
    return Retriever(model, chunks, embeddings)


def main():
    if config.ACTIVE_PROVIDER == "gemini":
        fact_provider = None
        answer_provider = get_provider("gemini", config.GEMINI_MODEL_NAME)
        providers = (answer_provider,)
    else:
        fact_provider = get_provider(config.ACTIVE_PROVIDER, config.FACT_MODEL_NAME)
        answer_provider = get_provider(config.ACTIVE_PROVIDER, config.GENERATION_MODEL_NAME)
        providers = (fact_provider, answer_provider)
    for provider in providers:
        readiness_error = provider.check_ready()
        if readiness_error:
            print(readiness_error)
            return

    print("Loading Bikol references and embedding model...")
    try:
        retriever = load_retriever()
    except (RuntimeError, ValueError) as error:
        print(error)
        return

    print("Bikol Tutor CLI. Type 'exit' to quit.")
    print("Generated answers are drafts; check facts and Bikol phrasing before teaching.\n")
    while True:
        try:
            question = input("You: ").strip()
        except (EOFError, KeyboardInterrupt):
            break
        if question.lower() in ("exit", "quit"):
            break
        if not question:
            continue

        references = retriever.retrieve(question, config.TOP_GENERAL_CHUNKS, config.TOP_CUSTOM_CHUNKS)
        print("\nRetrieved wording references:")
        for item in references:
            preview = item.get("topic") or item["text"][:45].replace("\n", " ") + "..."
            print(f"[{item['source']}] {preview} - {item['score']:.2f} ({item['retrieval_use']})")

        try:
            if config.ACTIVE_PROVIDER == "gemini":
                response = answer_provider.generate(build_full_answer_prompt(question, references))
            else:
                # The local Ollama flow drafts academic facts first, then
                # expresses each fact in Bikol using the retrieved examples.
                facts = extract_facts(fact_provider.generate(build_fact_prompt(question)))
                sentences = [answer_provider.generate(build_prompt(question, references, fact, number == 1)).strip()
                             for number, fact in enumerate(facts, 1)]
                response = "\n".join(f"{number}. {sentence}" for number, sentence in enumerate(sentences, 1))
        except (RuntimeError, ValueError) as error:
            print(f"\n{error}\n")
            continue

        if clearly_english(response):
            print(f"\n{config.ACTIVE_PROVIDER} returned English. This is not a Bikol tutor answer.")
            print("English draft for debugging:\n")
        else:
            print(f"\nTutor via {config.ACTIVE_PROVIDER} (draft; native review needed):\n")
        print(response + "\n")
        print("-" * 40 + "\n")


if __name__ == "__main__":
    main()
