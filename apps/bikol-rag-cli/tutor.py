"""The tutor pipeline shared by chat.py (terminal) and server.py (mobile app API)."""

import hashlib
import json

import numpy as np
from sentence_transformers import SentenceTransformer

import config
from prompt_builder import build_fact_prompt, build_prompt, extract_facts
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


def load_providers():
    """The fact model and the Bikol answer model, from BIKOL_PROVIDER."""
    return (get_provider(config.ACTIVE_PROVIDER, config.FACT_MODEL_NAME),
            get_provider(config.ACTIVE_PROVIDER, config.GENERATION_MODEL_NAME))


def readiness_error(providers):
    for provider in providers:
        error = provider.check_ready()
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
