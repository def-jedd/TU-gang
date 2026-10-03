class LLMProvider:
    def check_ready(self) -> str | None:
        return None

    def generate(self, prompt: str) -> str:
        raise NotImplementedError
