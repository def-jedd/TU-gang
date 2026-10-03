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

    def test_prompt_requires_a_concrete_reason_even_at_simple_levels(self):
        prompt = build_full_answer_prompt("Why do plants need sunlight?", [], difficulty="very_simple", as_json=True)
        self.assertIn("name the cause, describe what happens, and connect it to the result", prompt)
        self.assertIn("simplify the words, not the reasoning or completeness", prompt)
        self.assertIn("Use as many short sentences and paragraphs as needed", prompt)

    def test_prompt_covers_every_part_without_a_sentence_cap(self):
        prompt = build_full_answer_prompt(
            "How does a plant make food, and why does it need sunlight?", [], language="bikol", as_json=True)
        self.assertIn("Answer each in order, with its own paragraph if the topics differ", prompt)
        self.assertIn("relevant steps, causes, reasons, evidence, or consequences", prompt)
        self.assertIn("not the length your new answer should have", prompt)
        self.assertIn("Prefer a real observation or event over a metaphor", prompt)
        self.assertNotIn("two to four short sentences", prompt)


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

    def test_vague_answer_is_rewritten_once_with_a_reason(self):
        class TwoReplies(FakeProvider):
            def __init__(self):
                super().__init__("")
                self.replies = [
                    {"explanation": "It is very important.", "example": "It helps us.", "key_points": []},
                    {"explanation": "Sunlight gives plants energy to make sugar from water and air.",
                     "example": "A plant by a window gets sunlight.", "key_points": ["Plants need light."]},
                ]

            def generate(self, prompt, json_output=False):
                self.calls.append((prompt, json_output))
                return json.dumps(self.replies.pop(0))

        provider = TwoReplies()
        answer = tutor.generate_answer(None, provider, "Why do plants need sunlight?", [], language="english")
        self.assertIn("make sugar", answer["explanation"])
        self.assertEqual(len(provider.calls), 2)
        self.assertIn("too vague", provider.calls[1][0])

    def test_specific_short_answer_does_not_retry(self):
        provider = FakeProvider(json.dumps({"explanation": "Gravity pulls objects toward Earth.",
                                            "example": "A dropped mango falls.", "key_points": []}))
        tutor.generate_answer(None, provider, "Why do objects fall?", [], language="english")
        self.assertEqual(len(provider.calls), 1)

    def test_second_vague_answer_is_not_shown_to_student(self):
        provider = FakeProvider(json.dumps({"explanation": "It is very important.",
                                            "example": "It helps us.", "key_points": []}))
        with self.assertRaisesRegex(ValueError, "did not explain the reason clearly"):
            tutor.generate_answer(None, provider, "Why do plants need sunlight?", [], language="english")
        self.assertEqual(len(provider.calls), 2)

    def test_two_stage_flow_keeps_its_mapping(self):
        facts = FakeProvider("1. A\n2. B\n3. C")
        bikol = FakeProvider("Bikol sentence.")
        answer = tutor.generate_answer(facts, bikol, "Q?", [])
        self.assertEqual(answer, {"explanation": "Bikol sentence. Bikol sentence.", "example": "Bikol sentence.",
                                  "key_points": []})

    def test_two_stage_flow_rejects_unsupported_answer_language(self):
        with self.assertRaisesRegex(ValueError, "require the Gemini provider"):
            tutor.generate_answer(FakeProvider(""), FakeProvider(""), "Q?", [], language="english")


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
