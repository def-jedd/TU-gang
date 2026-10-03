"""The mobile language choice must reach retrieval and the hosted prompt."""

import json
import unittest
from unittest.mock import Mock, patch

import server


class ServerLanguageTests(unittest.TestCase):
    def test_tagalog_and_english_reach_the_prompt_and_response(self):
        example = {
            "id": "sample_001", "role": "tutoring_style", "retrieval_use": "style_only",
            "text": "Student: Tano?\nTutor: An grabidad nagbubutong.",
            "english_question": "Why do objects fall?",
            "english_answer": "Gravity pulls objects toward Earth.",
            "topic": "gravity",
        }
        retriever = Mock()
        retriever.retrieve.return_value = [example]
        for language in ("tagalog", "english"):
            with self.subTest(language=language):
                provider = Mock()
                provider.generate.return_value = json.dumps({
                    "explanation": "Answer", "example": "Example", "key_points": ["One", "Two", "Three"],
                })
                request = server.ExplainRequest(question="Why does ice melt?", language=language)
                with patch.object(server, "retriever", retriever), \
                     patch.object(server, "providers", (None, provider)), \
                     patch.object(server, "not_ready", return_value=None), \
                     patch.object(server.config, "ACTIVE_PROVIDER", "gemini"), \
                     patch.object(server, "clearly_english", side_effect=AssertionError("Bikol-only check called")):
                    result = server.explain(request)
                self.assertEqual(result["language"], language)
                self.assertEqual(result["source_ids"], ["sample_001"])
                prompt = provider.generate.call_args.args[0]
                self.assertIn(f"Answer in natural {language.title()}", prompt)
                self.assertIn("Gravity pulls objects toward Earth.", prompt)
                self.assertNotIn("An grabidad nagbubutong", prompt)

    def test_non_bikol_requires_the_hosted_provider(self):
        with patch.object(server, "not_ready", return_value=None), \
             patch.object(server.config, "ACTIVE_PROVIDER", "ollama"):
            result = server.explain(server.ExplainRequest(question="Why?", language="english"))
        self.assertEqual(result.status_code, 422)


if __name__ == "__main__":
    unittest.main()
