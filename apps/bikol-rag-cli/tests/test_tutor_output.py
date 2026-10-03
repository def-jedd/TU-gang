import unittest

from tutor_output import parse_tutor_output, spoken_style_problems

GOOD = """TOPIC: melting
EXPLANATION: Sample sentence one. Sample sentence two.
EXAMPLE: Sample example sentence.
KEY_POINT_1: First point
KEY_POINT_2: Second point
KEY_POINT_3: Third point"""


class TutorOutputTests(unittest.TestCase):
    def test_parses_all_labels(self):
        parsed = parse_tutor_output(GOOD)
        self.assertEqual(parsed["TOPIC"], "melting")
        self.assertEqual(parsed["KEY_POINT_3"], "Third point")

    def test_missing_label_raises(self):
        with self.assertRaises(ValueError):
            parse_tutor_output(GOOD.replace("KEY_POINT_3: Third point", ""))

    def test_flags_markdown_and_digits(self):
        parsed = parse_tutor_output(GOOD.replace("Sample example sentence.", "**Bold** 1/2"))
        problems = spoken_style_problems(parsed)
        self.assertIn("markdown or symbols", problems)
        self.assertIn("digits", problems)

    def test_clean_output_has_no_problems(self):
        self.assertEqual(spoken_style_problems(parse_tutor_output(GOOD)), [])


if __name__ == "__main__":
    unittest.main()