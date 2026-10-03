import requests
import os
from .base import LLMProvider

class OllamaProvider(LLMProvider):
    def __init__(self, model_name: str, base_url: str | None = None):
        self.model_name = model_name
        self.base_url = (base_url or os.getenv("OLLAMA_BASE_URL", "http://localhost:11434")).rstrip("/")

    def check_ready(self) -> str | None:
        try:
            response = requests.get(f"{self.base_url}/api/tags", timeout=3)
            response.raise_for_status()
            models = response.json().get("models", [])
        except (requests.exceptions.RequestException, ValueError):
            return (f"Cannot reach Ollama at {self.base_url}. Start Ollama (or run `ollama serve`), "
                    "then try again. If it runs elsewhere, set OLLAMA_BASE_URL.")

        requested = self.model_name if ":" in self.model_name else self.model_name + ":latest"
        if not any(model.get("name") == requested or model.get("model") == requested
                   for model in models):
            return f"Ollama is running, but {self.model_name} is missing. Install or create that model, then try again."
        return None

    def generate(self, prompt: str) -> str:
        url = f"{self.base_url}/api/generate"
        payload = {
            "model": self.model_name,
            "prompt": prompt,
            "stream": False,
            "options": {"temperature": 0.2, "num_ctx": 4096, "num_predict": 350}
        }
        try:
            response = requests.post(url, json=payload, timeout=300)
            response.raise_for_status()
            return response.json().get("response", "")
        except requests.exceptions.RequestException as e:
            raise RuntimeError(f"Ollama request failed: {e}") from e
