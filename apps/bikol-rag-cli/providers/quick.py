from .base import LLMProvider

class QuickProvider(LLMProvider):
    def generate(self, prompt: str) -> str:
        # Stub: This will call Amazon Quick in the future hackathon build.
        raise NotImplementedError("Amazon Quick integration is explicitly out of scope for this prototype.")
