"""Catch clearly English outputs; this cannot certify natural Bikol."""

import re


ENGLISH_WORDS = {
    "the", "is", "are", "when", "because", "from", "with", "into",
    "their", "and", "they", "this", "that", "which", "there", "then",
    "water", "turns", "molecules", "moving", "faster", "enough",
}
BIKOL_WORDS = {
    "an", "nin", "kan", "asin", "iyo", "ini", "dai", "kaini",
    "sarong", "kun", "huli", "hali", "dangan", "saindang", "tubig",
}


def clearly_english(answer: str) -> bool:
    words = re.findall(r"[a-z]+", answer.lower())
    english = sum(word in ENGLISH_WORDS for word in words)
    bikol = sum(word in BIKOL_WORDS for word in words)
    return english >= 8 and english > 2 * bikol
