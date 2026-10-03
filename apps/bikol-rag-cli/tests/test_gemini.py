import os
import unittest
from unittest.mock import Mock, patch

from providers.gemini import GeminiProvider
from prompt_builder import build_full_answer_prompt


class GeminiIntegrationTests(unittest.TestCase):
    def test_provider_sends_prompt_and_reads_answer(self):
        response = Mock()
        response.json.return_value = {
            "candidates": [{"content": {"parts": [{"text": "An halimbawa nin simbag."}]}}]
        }
        with patch.dict(os.environ, {"GEMINI_API_KEY": "test-key"}):
            with patch("providers.gemini.requests.post", return_value=response) as post:
                provider = GeminiProvider("gemini-3.8-flash")
                self.assertEqual(provider.generate("Question and examples"), "An halimbawa nin simbag.")
        self.assertEqual(post.call_count, 1)
        self.assertEqual(post.call_args.kwargs["json"]["contents"][0]["parts"][0]["text"], "Question and examples")
        self.assertEqual(post.call_args.kwargs["headers"]["x-goog-api-key"], "test-key")

    def test_prompt_uses_retrieved_bikol_as_style_example(self):
        prompt = build_full_answer_prompt("What is a black hole?", [{
            "id": "sample_001", "role": "tutoring_style", "retrieval_use": "style_only",
            "text": "Student: Tano ta nahuhulog?\nTutor: An grabidad nagbubutong.",
        }])
        self.assertIn("sample_001; style_only", prompt)
        self.assertIn("An grabidad nagbubutong", prompt)
        self.assertIn("Do not copy the examples' facts", prompt)
        self.assertIn("What is a black hole?", prompt)


if __name__ == "__main__":
    unittest.main()
