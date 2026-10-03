from .ollama import OllamaProvider
from .quick import QuickProvider
from .gemini import GeminiProvider

def get_provider(name: str, model_name: str):
    if name == "ollama":
        return OllamaProvider(model_name=model_name)
    elif name == "quick":
        return QuickProvider()
    elif name == "gemini":
        return GeminiProvider(model_name=model_name)
    else:
        raise ValueError(f"Unknown LLM provider configured: {name}")
