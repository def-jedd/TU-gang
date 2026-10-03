"""The spoken-style Gemini path: tutor.generate_spoken_answer and server routing."""

import unittest
from unittest.mock import Mock, patch

import server
import tutor

GOOD = """TOPIC: melting
EXPLANATION: An yelo natutunaw kun nainitan. Nagigin tubig giraray ini.
EXAMPLE: An yelo sa lamesa nagigin tubig.
KEY_POINT_1: An init nagpapatunaw
KEY_POINT_2: Tubig giraray an yelo
KEY_POINT_3: Luway-luway an pagtunaw"""

BAD = "Here is the answer without labels."


class FakeProvider:
    """Returns queued replies and records every call."""

    def __init__(self, *replies):
        self.replies = list(replies)
        self.calls = []

    def generate(self, prompt, json_output=False, system=None, max_tokens=None):
        self.calls.append({"prompt": prompt, "system": system, "max_tokens": max_tokens})
        return self.replies.pop(0)


REFERENCE = {
    "id": "sample_003", "role": "tutoring_style", "retrieval_use": "topic_and_style",
    "topic": "melting", "text": "Student: Tano ta natunaw an yelo?\nTutor: An yelo natunaw kun nainitan.",
}


class GenerateSpokenAnswerTests(unittest.TestCase):
    def run_answer(self, provider, **kwargs):
        with patch.object(tutor, "load_system_prompt", return_value="SYSTEM PROMPT"):
            return tutor.generate_spoken_answer(provider, "Why does ice melt?", [REFERENCE], **kwargs)

    def test_maps_labels_to_app_fields_and_sends_system_prompt(self):
        provider = FakeProvider(GOOD)
        answer = self.run_answer(provider, difficulty="very_simple", style="ate_kuya")
        self.assertEqual(answer["explanation"], "An yelo natutunaw kun nainitan. Nagigin tubig giraray ini.")
        self.assertEqual(answer["example"], "An yelo sa lamesa nagigin tubig.")
        self.assertEqual(len(answer["key_points"]), 3)
        self.assertEqual(provider.calls[0]["system"], "SYSTEM PROMPT")
        self.assertIn("Level: very_simple", provider.calls[0]["prompt"])
        self.assertIn("Style: ate_kuya", provider.calls[0]["prompt"])

    def test_bad_format_is_retried_once(self):
        provider = FakeProvider(BAD, GOOD)
        answer = self.run_answer(provider)
        self.assertEqual(len(provider.calls), 2)
        self.assertEqual(answer["key_points"][0], "An init nagpapatunaw")

    def test_two_bad_replies_raise(self):
        provider = FakeProvider(BAD, BAD)
        with self.assertRaisesRegex(ValueError, "wrong format"):
            self.run_answer(provider)
        self.assertEqual(len(provider.calls), 2)

    def test_explain_differently_includes_the_earlier_answer(self):
        provider = FakeProvider(GOOD)
        self.run_answer(provider, action="explain_differently", previous="Earlier text here.")
        self.assertIn("Earlier text here.", provider.calls[0]["prompt"])


class ServerRoutingTests(unittest.TestCase):
    def setUp(self):
        server._last_answers.clear()
        self.retriever = Mock()
        self.retriever.retrieve.return_value = [REFERENCE]

    def post(self, request, provider, active="gemini"):
        with patch.object(server, "retriever", self.retriever), \
             patch.object(server, "providers", (None, provider)), \
             patch.object(server, "not_ready", return_value=None), \
             patch.object(server.config, "ACTIVE_PROVIDER", active), \
             patch.object(tutor, "load_system_prompt", return_value="SYSTEM PROMPT"):
            return server.explain(request)

    def test_bikol_gemini_uses_the_spoken_prompt(self):
        provider = FakeProvider(GOOD)
        result = self.post(server.ExplainRequest(question="Why does ice melt?", topic="melting"), provider)
        self.assertEqual(result["provider"], "gemini")
        self.assertEqual(result["topic"], "melting")
        self.assertEqual(result["source_ids"], ["sample_003"])
        self.assertEqual(len(result["key_points"]), 3)
        self.assertEqual(provider.calls[0]["system"], "SYSTEM PROMPT")

    def test_explain_differently_receives_the_previous_answer(self):
        first = FakeProvider(GOOD)
        self.post(server.ExplainRequest(question="Why does ice melt?", topic="melting"), first)
        second = FakeProvider(GOOD)
        self.post(server.ExplainRequest(question="Why does ice melt?", topic="melting",
                                        action="explain_differently"), second)
        self.assertIn("An yelo natutunaw kun nainitan", second.calls[0]["prompt"])

    def test_malformed_replies_return_a_readable_502(self):
        result = self.post(server.ExplainRequest(question="Why does ice melt?"), FakeProvider(BAD, BAD))
        self.assertEqual(result.status_code, 502)

    def test_english_still_uses_the_json_flow(self):
        provider = Mock()
        provider.generate.return_value = (
            '{"explanation": "Ice melts when it absorbs heat.", "example": "A cube on a table.", '
            '"key_points": ["a", "b", "c"]}')
        result = self.post(server.ExplainRequest(question="Why does ice melt?", language="english"), provider)
        self.assertEqual(result["language"], "english")
        self.assertTrue(provider.generate.call_args.kwargs.get("json_output"))


if __name__ == "__main__":
    unittest.main()