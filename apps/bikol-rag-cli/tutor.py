"""The tutor pipeline shared by chat.py (terminal) and server.py (mobile app API)."""

import hashlib
import json
import logging
import re
from pathlib import Path

import config
from prompt_builder import (
    build_fact_prompt,
    build_full_answer_prompt,
    build_prompt,
    build_tutor_prompt,
    extract_facts,
    parse_answer_json,
)
from providers import get_provider
from tutor_output import parse_tutor_output, spoken_style_problems

log = logging.getLogger(__name__)

# <repo>/prompts/tutor_system.txt  (config.BASE_DIR is <repo>/apps/bikol-rag-cli)
SYSTEM_PROMPT_PATH = Path(config.BASE_DIR).parents[1] / "prompts" / "tutor_system.txt"

VAGUE_CLAIM = re.compile(r"\b(important|mahalaga|importante|helpful|useful)\b|\bhelps? us (?:a lot|in many ways)\b", re.IGNORECASE)
REASON_CUE = re.compile(r"\b(because|by|so that|dahil|kasi|upang|para|huli ta|tanganing)\b", re.IGNORECASE)


def needs_more_detail(answer):
    """Catch short, generic praise before sending an answer to the student."""
    explanation = answer["explanation"]
    if not VAGUE_CLAIM.search(explanation):
        return False
    return len(explanation.split()) < 10 or not REASON_CUE.search(explanation)


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


def load_system_prompt():
    """The spoken-style tutor prompt (prompts/tutor_system.txt)."""
    try:
        return SYSTEM_PROMPT_PATH.read_text(encoding="utf-8")
    except FileNotFoundError as error:
        raise RuntimeError(f"Tutor prompt not found at {SYSTEM_PROMPT_PATH}.") from error


def generate_sentences(fact_provider, answer_provider, question, references,
                       difficulty="simple", style=None, action="explain", history=None):
    """Three Bikol sentences: the direct answer, the reason, and an example."""
    # Academic content is generated without references. Only the second
    # pass sees Bikol examples, clearly labeled as style material.
    facts = extract_facts(fact_provider.generate(build_fact_prompt(question, difficulty, action, history=history)))
    return [answer_provider.generate(build_prompt(question, references, fact, number == 1, style)).strip()
            for number, fact in enumerate(facts, 1)]


def generate_spoken_answer(provider, question, references, difficulty="simple",
                           style="friend", action="explain", previous=None, history=None):
    """Spoken-style Bikol answer using prompts/tutor_system.txt (Gemini only).

    The model replies with labeled lines (TOPIC / EXPLANATION / EXAMPLE /
    KEY_POINT_1..3). A badly formatted reply is retried once, then reported.
    The model's TOPIC label is ignored: the app's topic comes from the request
    or from retrieval, because the card lookup uses fixed topic ids.
    """
    system = load_system_prompt()
    prompt = build_tutor_prompt(question, references, difficulty, style, action, previous, history=history)

    parsed = None
    for _attempt in range(2):
        text = provider.generate(prompt, system=system, max_tokens=2048)
        try:
            parsed = parse_tutor_output(text)
            break
        except ValueError:
            log.warning("Tutor reply was not in the labeled format; retrying once.")
    if parsed is None:
        raise ValueError("The tutor's answer came back in the wrong format. Please try again.")

    problems = spoken_style_problems(parsed)
    if problems:
        # Logged for the test runs; not shown to the student.
        log.warning("Spoken-style problems: %s", "; ".join(problems))

    return {
        "explanation": parsed["EXPLANATION"],
        "example": parsed["EXAMPLE"],
        "key_points": [parsed[f"KEY_POINT_{number}"] for number in (1, 2, 3)],
    }


def generate_answer(fact_provider, answer_provider, question, references,
                    difficulty="simple", style=None, action="explain", language="bikol", history=None):
    """The app's answer fields: explanation, example, key_points."""
    if fact_provider is None:
        # Hosted one-call flow (Gemini): the model returns the fields as JSON.
        prompt = build_full_answer_prompt(question, references, language=language, difficulty=difficulty,
                                          style=style, action=action, as_json=True, history=history)
        answer = parse_answer_json(answer_provider.generate(prompt, json_output=True))
        if needs_more_detail(answer):
            repair_prompt = (prompt + "\nYour previous draft explanation was too vague: "
                             + json.dumps(answer["explanation"], ensure_ascii=False)
                             + "\nRewrite the complete JSON answer. State the actual cause or process and a "
                               "specific result in the explanation. Keep the facts accurate and use the "
                               "requested answer language. Do not say only that something is important.\n")
            answer = parse_answer_json(answer_provider.generate(repair_prompt, json_output=True))
            if needs_more_detail(answer):
                raise ValueError("The tutor did not explain the reason clearly. Please try again.")
        return answer

    if language != "bikol":
        raise ValueError("Tagalog and English answers currently require the Gemini provider.")
    sentences = generate_sentences(fact_provider, answer_provider, question, references, difficulty, style, action, history=history)
    # Sentences are: direct answer, reason, everyday example. Key points stay
    # empty rather than repeating them, because practice voice reads every field aloud.
    return {"explanation": " ".join(sentences[:2]), "example": sentences[2], "key_points": []}