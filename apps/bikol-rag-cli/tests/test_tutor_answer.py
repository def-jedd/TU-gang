"""The merged Gemini path: tutor.py dispatch and the app's JSON answer."""

import json
import unittest
from unittest.mock import patch

import config
import tutor
from prompt_builder import ANSWER_JSON_KEYS, build_full_answer_prompt, parse_answer_json
from providers.gemini import GeminiProvider


class FakeProvider:
    def __init__(self, reply):
        self.reply = reply
        self.calls = []

    def generate(self, prompt, json_output=False):
        self.calls.append((prompt, json_output))
        return self.reply

    def check_ready(self):
        return None


class ParseAnswerJsonTests(unittest.TestCase):
    def test_reads_fields(self):
        raw = json.dumps({"explanation": " An yelo natutunaw. ", "example": "Sa init.", "key_points": ["a", "b", "c", "d"]})
        self.assertEqual(parse_answer_json(raw),
                         {"explanation": "An yelo natutunaw.", "example": "Sa init.", "key_points": ["a", "b", "c"]})

    def test_accepts_code_fences_and_missing_optional_fields(self):
        raw = '```json\n{"explanation": "Paliwanag."}\n```'
        self.assertEqual(parse_answer_json(raw), {"explanation": "Paliwanag.", "example": "", "key_points": []})

    def test_rejects_unusable_answers(self):
        for raw in ["not json", "[1, 2]", '{"explanation": ""}', '{"example": "only"}']:
            with self.assertRaises(ValueError, msg=raw):
                parse_answer_json(raw)


class PromptTests(unittest.TestCase):
    def test_default_prompt_is_the_cli_prompt(self):
        prompt = build_full_answer_prompt("Q?", [])
        self.assertTrue(prompt.endswith("Use clear section labels.\n"))
        self.assertNotIn("Sound like", prompt)

    def test_app_choices_reach_the_prompt(self):
        prompt = build_full_answer_prompt("Q?", [], difficulty="very_simple", style="ate_kuya",
                                          action="explain_differently", as_json=True)
        self.assertIn("only words a young child already knows", prompt)
        self.assertIn("caring older sibling", prompt)
        self.assertIn("from a different angle", prompt)
        self.assertIn("natural Bikol", prompt)
        self.assertTrue(prompt.endswith(ANSWER_JSON_KEYS))

    def test_json_mode_follows_the_answer_language(self):
        chunk = {"id": "s1", "role": "tutoring_style", "text": "Student: Tano?\nTutor: Iyo.",
                 "english_question": "Why?", "english_answer": "Because."}
        prompt = build_full_answer_prompt("Q?", [chunk], "tagalog", as_json=True)
        self.assertIn("natural Tagalog", prompt)
        self.assertIn("three short Tagalog key points", prompt)
        self.assertTrue(prompt.endswith(ANSWER_JSON_KEYS))


class TutorDispatchTests(unittest.TestCase):
    def test_gemini_uses_its_own_model_and_no_fact_model(self):
        with patch.object(config, "ACTIVE_PROVIDER", "gemini"), patch.object(config, "GEMINI_MODEL_NAME", "gemini-x"):
            fact, answer = tutor.load_providers()
        self.assertIsNone(fact)
        self.assertIsInstance(answer, GeminiProvider)
        self.assertEqual(answer.model_name, "gemini-x")

    def test_readiness_skips_the_missing_fact_model(self):
        self.assertIsNone(tutor.readiness_error((None, FakeProvider(""))))

    def test_one_call_answer_is_requested_as_json(self):
        provider = FakeProvider(json.dumps({"explanation": "E", "example": "X", "key_points": ["1", "2", "3"]}))
        answer = tutor.generate_answer(None, provider, "Why does ice melt?", [], "simple", "friend", "explain")
        self.assertEqual(answer, {"explanation": "E", "example": "X", "key_points": ["1", "2", "3"]})
        prompt, json_output = provider.calls[0]
        self.assertTrue(json_output)
        self.assertIn("friendly classmate", prompt)

    def test_two_stage_flow_keeps_its_mapping(self):
        facts = FakeProvider("1. A\n2. B\n3. C")
        bikol = FakeProvider("Bikol sentence.")
        answer = tutor.generate_answer(facts, bikol, "Q?", [])
        self.assertEqual(answer, {"explanation": "Bikol sentence. Bikol sentence.", "example": "Bikol sentence.",
                                  "key_points": []})


class GeminiJsonModeTests(unittest.TestCase):
    def test_json_mode_sets_response_mime_type(self):
        from unittest.mock import Mock
        response = Mock()
        response.json.return_value = {"candidates": [{"content": {"parts": [{"text": "{}"}]}}]}
        with patch.dict("os.environ", {"GEMINI_API_KEY": "k"}):
            with patch("providers.gemini.requests.post", return_value=response) as post:
                GeminiProvider("m").generate("p", json_output=True)
        config_sent = post.call_args.kwargs["json"]["generationConfig"]
        self.assertEqual(config_sent["responseMimeType"], "application/json")


if __name__ == "__main__":
    unittest.main()
