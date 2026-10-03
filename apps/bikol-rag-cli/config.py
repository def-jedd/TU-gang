import os

BASE_DIR = os.path.dirname(os.path.abspath(__file__))

CHUNKS_PATH = os.path.join(BASE_DIR, "data", "processed", "bikol_chunks.json")
EMBEDDINGS_PATH = os.path.join(BASE_DIR, "data", "embeddings", "embeddings.npy")
EMBEDDINGS_META_PATH = os.path.join(BASE_DIR, "data", "embeddings", "metadata.json")

EMBEDDING_MODEL_NAME = "paraphrase-multilingual-MiniLM-L12-v2"
FACT_MODEL_NAME = os.getenv("BIKOL_FACT_MODEL", "gemma3:4b")
GENERATION_MODEL_NAME = os.getenv("BIKOL_LLM_MODEL", "bikol-tutor-q4")

ACTIVE_PROVIDER = "ollama"

TOP_GENERAL_CHUNKS = 1
TOP_CUSTOM_CHUNKS = 3
