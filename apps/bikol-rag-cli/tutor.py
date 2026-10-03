"""The tutor pipeline shared by chat.py (terminal) and server.py (mobile app API)."""

import hashlib
import json

import config
from prompt_builder import build_fact_prompt, build_full_answer_prompt, build_prompt, extract_facts, parse_answer_json
from providers import get_provider


def load_retriever():
    # Heavy ML imports live here so the rest of the pipeline can be imported
    # (and unit-tested) without numpy / sentence-transformers installed.
    import numpy as np
    from sentence_transformers import SentenceTransformer

    from retrieval import Retriever

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


def load_providers():
    """(fact model, answer model) from BIKOL_PROVIDER.

    Gemini answers in one hosted call, so it has no separate fact model (None).
    """
    if config.ACTIVE_PROVIDER == "gemini":
        return None, get_provider("gemini", config.GEMINI_MODEL_NAME)
    return (get_provider(config.ACTIVE_PROVIDER, config.FACT_MODEL_NAME),
            get_provider(config.ACTIVE_PROVIDER, config.GENERATION_MODEL_NAME))


def readiness_error(providers):
    for provider in providers:
        error = provider.check_ready() if provider else None
        if error:
            return error
    return None


def generate_sentences(fact_provider, answer_provider, question, references,
                       difficulty="simple", style=None, action="explain"):
    """Three Bikol sentences: the direct answer, the reason, and an example."""
    # Academic content is generated without references. Only the second
    # pass sees Bikol examples, clearly labeled as style material.
    facts = extract_facts(fact_provider.generate(build_fact_prompt(question, difficulty, action)))
    return [answer_provider.generate(build_prompt(question, references, fact, number == 1, style)).strip()
            for number, fact in enumerate(facts, 1)]


def generate_answer(fact_provider, answer_provider, question, references,
                    difficulty="simple", style=None, action="explain", language="bikol"):
    """The app's answer fields: explanation, example, key_points."""
    if fact_provider is None:
        # Hosted one-call flow (Gemini): the model returns the fields as JSON.
        prompt = build_full_answer_prompt(question, references, language=language, difficulty=difficulty,
                                          style=style, action=action, as_json=True)
        return parse_answer_json(answer_provider.generate(prompt, json_output=True))

    if language != "bikol":
        raise ValueError("Tagalog and English answers currently require the Gemini provider.")
    sentences = generate_sentences(fact_provider, answer_provider, question, references, difficulty, style, action)
    # Sentences are: direct answer, reason, everyday example. Key points stay
    # empty rather than repeating them, because practice voice reads every field aloud.
    return {"explanation": " ".join(sentences[:2]), "example": sentences[2], "key_points": []}
