import os
import unittest
from unittest.mock import Mock, patch

from providers.gemini import GeminiProvider
from prompt_builder import build_full_answer_prompt
from chat import choose_language, language_command


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

    def test_tagalog_and_english_prompts_use_english_examples(self):
        references = [{
            "id": "sample_001", "role": "tutoring_style", "retrieval_use": "style_only",
            "text": "Student: Tano?\nTutor: An grabidad nagbubutong.",
            "english_question": "Why do objects fall?",
            "english_answer": "Gravity pulls objects toward Earth.",
        }, {
            "id": "public_001", "role": "language_style", "text": "Bikol public passage",
        }]
        for language in ("tagalog", "english"):
            with self.subTest(language=language):
                prompt = build_full_answer_prompt("Why do things fall?", references, language)
                self.assertIn("Gravity pulls objects toward Earth.", prompt)
                self.assertIn(f"Answer in natural {language.title()}", prompt)
                self.assertNotIn("An grabidad nagbubutong", prompt)
                self.assertNotIn("Bikol public passage", prompt)

    def test_language_command(self):
        self.assertEqual(language_command("/language tagalog"), "tagalog")
        self.assertEqual(language_command("/LANG English"), "english")
        self.assertEqual(language_command("/language spanish"), "invalid")
        self.assertIsNone(language_command("What is a language?"))

    def test_startup_language_selection(self):
        with patch("builtins.print"):
            self.assertEqual(choose_language("gemini", Mock(side_effect=["bad", "2"])), "tagalog")
            self.assertEqual(choose_language("gemini", Mock(return_value="English")), "english")
            self.assertEqual(choose_language("ollama", Mock(return_value="1")), "bikol")


if __name__ == "__main__":
    unittest.main()
