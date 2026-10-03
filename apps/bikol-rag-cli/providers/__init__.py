from .kiro import KiroProvider
from .ollama import OllamaProvider
from .quick import QuickProvider

def get_provider(name: str, model_name: str):
    if name == "ollama":
        return OllamaProvider(model_name=model_name)
    elif name == "kiro":
        # One Kiro model (KIRO_MODEL) serves both stages; the Ollama model names do not apply.
        return KiroProvider()
    elif name == "quick":
        return QuickProvider()
    else:
        raise ValueError(f"Unknown LLM provider configured: {name}")
