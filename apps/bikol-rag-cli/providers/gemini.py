"""Gemini GenerateContent adapter for the command-line tutor and the mobile API."""

import os

import requests

from .base import LLMProvider


class GeminiProvider(LLMProvider):
    def __init__(self, model_name: str):
        self.model_name = model_name
        self.api_key = os.getenv("GEMINI_API_KEY")

    def check_ready(self) -> str | None:
        if not self.api_key:
            return "GEMINI_API_KEY is missing. Set it in this terminal before running chat.py."
        return None

    def generate(self, prompt: str, json_output: bool = False,
                 system: str | None = None, max_tokens: int | None = None) -> str:
        """Send one prompt to Gemini.

        system:     sent as Gemini's systemInstruction (the tutor prompt), not
                    mixed into the user message.
        max_tokens: overrides the default output cap (600, or 3072 in JSON mode).
        """
        if not self.api_key:
            raise RuntimeError("GEMINI_API_KEY is missing.")
        url = f"https://generativelanguage.googleapis.com/v1beta/models/{self.model_name}:generateContent"
        generation_config = {"temperature": 0.3, "maxOutputTokens": 600}
        if json_output:
            # The mobile API needs fields, not prose. A truncated object is
            # unusable, so JSON answers get more room.
            generation_config.update(responseMimeType="application/json", maxOutputTokens=3072)
        if max_tokens:
            generation_config["maxOutputTokens"] = max_tokens

        body = {
            "contents": [{"role": "user", "parts": [{"text": prompt}]}],
            "generationConfig": generation_config,
        }
        if system:
            body["systemInstruction"] = {"parts": [{"text": system}]}

        try:
            response = requests.post(
                url,
                headers={"x-goog-api-key": self.api_key, "Content-Type": "application/json"},
                json=body,
                timeout=90,
            )
            response.raise_for_status()
            parts = response.json()["candidates"][0]["content"]["parts"]
            result = "".join(part.get("text", "") for part in parts).strip()
            if not result:
                raise RuntimeError("Gemini returned no text. Check the model response and try again.")
            return result
        except requests.exceptions.HTTPError as exc:
            status = exc.response.status_code if exc.response is not None else "unknown"
            raise RuntimeError(f"Gemini request failed (HTTP {status}). Check the key, model access, and quota.") from exc
        except requests.exceptions.RequestException as exc:
            raise RuntimeError(f"Gemini request failed: {exc}") from exc
        except (KeyError, IndexError, ValueError) as exc:
            raise RuntimeError("Gemini returned a response without a usable text answer.") from exc