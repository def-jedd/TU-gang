import os
from pathlib import Path

BASE_DIR = os.path.dirname(os.path.abspath(__file__))


def load_local_env():
    """Load simple KEY=VALUE settings from this CLI's untracked .env file."""
    path = Path(BASE_DIR) / ".env"
    if not path.exists():
        return
    for line in path.read_text(encoding="utf-8").splitlines():
        line = line.strip()
        if not line or line.startswith("#") or "=" not in line:
            continue
        key, value = line.split("=", 1)
        if key.strip() in {"GEMINI_API_KEY", "BIKOL_PROVIDER", "GEMINI_MODEL"}:
            os.environ.setdefault(key.strip(), value.strip().strip('"').strip("'"))


load_local_env()

CHUNKS_PATH = os.path.join(BASE_DIR, "data", "processed", "bikol_chunks.json")
EMBEDDINGS_PATH = os.path.join(BASE_DIR, "data", "embeddings", "embeddings.npy")
EMBEDDINGS_META_PATH = os.path.join(BASE_DIR, "data", "embeddings", "metadata.json")

EMBEDDING_MODEL_NAME = "paraphrase-multilingual-MiniLM-L12-v2"
FACT_MODEL_NAME = os.getenv("BIKOL_FACT_MODEL", "gemma3:4b")
GENERATION_MODEL_NAME = os.getenv("BIKOL_LLM_MODEL", "bikol-tutor-q4")

GEMINI_MODEL_NAME = os.getenv("GEMINI_MODEL", "gemini-3.5-flash-lite")
ACTIVE_PROVIDER = os.getenv("BIKOL_PROVIDER", "ollama").lower()

TOP_GENERAL_CHUNKS = 1
TOP_CUSTOM_CHUNKS = 3
