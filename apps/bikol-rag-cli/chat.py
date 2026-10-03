"""Interactive Bikol tutor: retrieve style, generate facts, express them in Bikol."""

import config
from answer_check import clearly_english
from prompt_builder import build_full_answer_prompt
from tutor import generate_sentences, load_providers, load_retriever, readiness_error

ANSWER_LANGUAGES = ("bikol", "tagalog", "english")


def language_command(message):
    """Return a requested language, or None for a normal question."""
    parts = message.lower().split()
    if not parts or parts[0] not in ("/language", "/lang"):
        return None
    return parts[1] if len(parts) == 2 and parts[1] in ANSWER_LANGUAGES else "invalid"


def choose_language(provider, input_fn=input):
    """Ask for the answer language before the first question."""
    available = ANSWER_LANGUAGES if provider == "gemini" else ("bikol",)
    print("Choose the answer language:")
    for number, name in enumerate(available, 1):
        print(f"  {number}. {name.title()}")
    while True:
        try:
            choice = input_fn("Language (number or name): ").strip().lower()
        except (EOFError, KeyboardInterrupt):
            return None
        if choice in ("exit", "quit"):
            return None
        if choice.isdigit() and 1 <= int(choice) <= len(available):
            return available[int(choice) - 1]
        if choice in available:
            return choice
        print("Please choose one of the listed languages.")


def main():
    fact_provider, answer_provider = load_providers()
    problem = readiness_error((fact_provider, answer_provider))
    if problem:
        print(problem)
        return

    print("Loading Bikol references and embedding model...")
    try:
        retriever = load_retriever()
    except (RuntimeError, ValueError) as error:
        print(error)
        return

    print("Tutor CLI.")
    language = choose_language(config.ACTIVE_PROVIDER)
    if language is None:
        return
    print("Type /language tagalog, /language english, or /language bikol to switch; 'exit' to quit.")
    print(f"Answer language: {language.title()}. Generated answers are drafts; review facts and phrasing before teaching.\n")
    while True:
        try:
            question = input("You: ").strip()
        except (EOFError, KeyboardInterrupt):
            break
        if question.lower() in ("exit", "quit"):
            break
        if not question:
            continue
        requested_language = language_command(question)
        if requested_language is not None:
            if requested_language == "invalid":
                print("Choose /language bikol, /language tagalog, or /language english.\n")
            elif config.ACTIVE_PROVIDER != "gemini" and requested_language != "bikol":
                print("Tagalog and English currently require the Gemini provider. Set BIKOL_PROVIDER=gemini.\n")
            else:
                language = requested_language
                print(f"Answer language: {language.title()}\n")
            continue

        references = retriever.retrieve(question, config.TOP_GENERAL_CHUNKS, config.TOP_CUSTOM_CHUNKS)
        print("\nRetrieved wording references:")
        for item in references:
            preview = item.get("topic") or item["text"][:45].replace("\n", " ") + "..."
            print(f"[{item['source']}] {preview} - {item['score']:.2f} ({item['retrieval_use']})")

        try:
            if fact_provider is None:
                # Hosted one-call flow (Gemini): a full answer with section labels.
                response = answer_provider.generate(build_full_answer_prompt(question, references, language))
            else:
                # The local flow drafts academic facts first, then expresses
                # each fact in Bikol using the retrieved examples.
                sentences = generate_sentences(fact_provider, answer_provider, question, references)
                response = "\n".join(f"{number}. {sentence}" for number, sentence in enumerate(sentences, 1))
        except (RuntimeError, ValueError) as error:
            print(f"\n{error}\n")
            continue

        if language == "bikol" and clearly_english(response):
            print(f"\n{config.ACTIVE_PROVIDER} returned English. This is not a Bikol tutor answer.")
            print("English draft for debugging:\n")
        else:
            print(f"\nTutor via {config.ACTIVE_PROVIDER} ({language.title()} draft; review needed):\n")
        print(response + "\n")
        print("-" * 40 + "\n")


if __name__ == "__main__":
    main()
