"""Cosine search with separate reference roles and relevance gates."""

import re
import numpy as np


TOPIC_CUES = {
    "gravity": ("gravity", "fall", "falling", "falls"),
    "photosynthesis": ("photosynthesis", "plants make food", "plant makes food"),
    "melting": ("melt", "melts", "melting", "ice"),
    "evaporation": ("evaporate", "evaporation", "puddle", "vapor"),
    "rain": ("rain", "raining", "clouds"),
    "earthquakes": ("earthquake", "earthquakes", "fault", "ground shake"),
    "volcanoes": ("volcano", "volcanoes", "eruption", "erupt"),
    "friction": ("friction", "rubbing"),
    "force": ("force", "push", "pull"),
    "energy": ("energy",),
    "halves": ("one half", "half", "halves"),
    "equivalent_fractions": ("two fourths", "equivalent fraction", "equivalent fractions"),
    "multiplication": ("multiply", "multiplication", "times"),
    "division": ("divide", "division", "sharing equally"),
    "perimeter": ("perimeter",),
    "area": ("area",),
    "cause_and_effect": ("cause and effect", "causes", "effect"),
    "habitat": ("habitat",),
    "handwashing": ("wash hands", "handwashing", "soap", "germs"),
    "shadows": ("shadow", "shadows"),
}
STYLE_FALLBACK_IDS = ("sample_001", "sample_011", "sample_017")


class Retriever:
    def __init__(self, model, chunks, embeddings):
        if len(chunks) != len(embeddings):
            raise ValueError("Chunk and embedding counts differ. Rebuild embeddings.")
        self.model = model
        self.chunks = chunks
        self.embeddings = embeddings

    def retrieve(self, query: str, top_general=3, top_custom=2):
        vector = self.model.encode([query], normalize_embeddings=True)[0]
        scores = self.embeddings @ vector

        def ranked(predicate, limit, threshold=None, topic_boost=False):
            indices = [i for i, chunk in enumerate(self.chunks) if predicate(chunk)]
            indices.sort(
                key=lambda index: scores[index] + (
                    0.20 if topic_boost and self.chunks[index].get("topic") in matching_topics else 0.0
                ),
                reverse=True,
            )
            results = []
            seen = set()
            for index in indices:
                if threshold is not None and scores[index] < threshold:
                    break
                text = self.chunks[index]["text"].casefold()
                if text in seen:
                    continue
                seen.add(text)
                result = self.chunks[index].copy()
                result["score"] = float(scores[index])
                result["retrieval_use"] = (
                    "topic_and_style" if result.get("topic") in matching_topics else "style_only"
                ) if result.get("role") == "tutoring_style" else "language_only"
                results.append(result)
                if len(results) >= limit:
                    break
            return results

        question_words = f" {re.sub(r'[^a-z0-9 ]', ' ', query.lower())} "
        matching_topics = {
            topic for topic, cues in TOPIC_CUES.items()
            if any(f" {cue} " in question_words for cue in cues)
        }
        # Prefer a clear topic match. Fill the remaining slots with deliberately
        # diverse teaching examples instead of mistaking weak vector similarity
        # for factual relevance (for example, black holes -> shadows).
        tutoring = ranked(
            lambda chunk: chunk.get("role") == "tutoring_style" and chunk.get("validated")
            and chunk.get("topic") in matching_topics,
            top_custom,
        )
        selected_ids = {item["id"] for item in tutoring}
        for fallback_id in STYLE_FALLBACK_IDS:
            if len(tutoring) >= top_custom:
                break
            for index, chunk in enumerate(self.chunks):
                if chunk["id"] == fallback_id and chunk.get("validated") and fallback_id not in selected_ids:
                    item = chunk.copy()
                    item["score"] = float(scores[index])
                    item["retrieval_use"] = "style_only"
                    tutoring.append(item)
                    selected_ids.add(fallback_id)
                    break
        public = ranked(
            lambda chunk: chunk.get("source") == "halo-bcl",
            top_general,
            threshold=0.35,
        ) if top_general else []
        return tutoring + public


if __name__ == "__main__":
    import json
    import config
    from sentence_transformers import SentenceTransformer

    with open(config.CHUNKS_PATH, encoding="utf-8") as file:
        chunks = json.load(file)
    retriever = Retriever(SentenceTransformer(config.EMBEDDING_MODEL_NAME), chunks, np.load(config.EMBEDDINGS_PATH))
    for query in ("Why do things fall?", "Why does ice melt?", "What is a black hole?"):
        print(query)
        for result in retriever.retrieve(query, config.TOP_GENERAL_CHUNKS, config.TOP_CUSTOM_CHUNKS):
            print(f"  {result['source']} / {result.get('topic')} / {result['score']:.3f} / {result['retrieval_use']}")
