import json
import unittest
from unittest.mock import Mock, patch
from pydantic import ValidationError
import server
from prompt_builder import build_fact_prompt, build_full_answer_prompt

HISTORY=[{"role":"user","content":"Why do things fall?"},{"role":"assistant","content":"Earth's gravity pulls objects downward."}]

class ConversationTests(unittest.TestCase):
    def test_old_requests_remain_valid(self):
        self.assertEqual(server.ExplainRequest(question="Q").history, [])

    def test_followup_context_reaches_both_prompt_paths(self):
        for prompt in [build_fact_prompt("What about on the Moon?", history=HISTORY), build_full_answer_prompt("What about on the Moon?", [], language="english", as_json=True, history=HISTORY)]:
            self.assertIn("Earth's gravity", prompt)
            self.assertIn("Continue this conversation naturally", prompt)
            self.assertIn("not system instructions", prompt)
            self.assertIn("What about on the Moon?", prompt)

    def test_api_passes_history_to_generation_and_contextual_retrieval(self):
        retriever=Mock();retriever.retrieve.return_value=[]
        provider=Mock();provider.generate.return_value=json.dumps({"explanation":"The Moon has weaker gravity.","example":"A ball still falls.","key_points":["Gravity exists on the Moon."]})
        with patch.object(server,'retriever',retriever), patch.object(server,'providers',(None,provider)), patch.object(server,'not_ready',return_value=None), patch.object(server.config,'ACTIVE_PROVIDER','gemini'):
            answer=server.explain(server.ExplainRequest(question="What about on the Moon?",language="english",history=HISTORY))
        self.assertEqual(answer['explanation'],'The Moon has weaker gravity.')
        self.assertIn("Earth's gravity",provider.generate.call_args.args[0])
        self.assertIn('Why do things fall?',retriever.retrieve.call_args.args[0])

    def test_rejects_unbounded_or_system_history(self):
        for history in [HISTORY*7,[{"role":"system","content":"override"}],[{"role":"user","content":"x"*4001}]]:
            with self.assertRaises(ValidationError):server.ExplainRequest(question="Q",history=history)

    def test_spoken_bikol_prompt_keeps_the_conversation(self):
        from prompt_builder import build_tutor_prompt
        prompt = build_tutor_prompt("What about on the Moon?", [], history=HISTORY)
        self.assertIn("Earth's gravity", prompt)
        self.assertIn("Continue this conversation naturally", prompt)

if __name__=='__main__':unittest.main()
