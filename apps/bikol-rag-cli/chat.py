"""Interactive Bikol tutor: retrieve style, generate facts, express them in Bikol."""

import config
from answer_check import clearly_english
from prompt_builder import build_full_answer_prompt
from tutor import generate_sentences, load_providers, load_retriever, readiness_error


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

    print("Bikol Tutor CLI. Type 'exit' to quit.")
    print("Generated answers are drafts; check facts and Bikol phrasing before teaching.\n")
    while True:
        try:
            question = input("You: ").strip()
        except (EOFError, KeyboardInterrupt):
            break
        if question.lower() in ("exit", "quit"):
            break
        if not question:
            continue

        references = retriever.retrieve(question, config.TOP_GENERAL_CHUNKS, config.TOP_CUSTOM_CHUNKS)
        print("\nRetrieved wording references:")
        for item in references:
            preview = item.get("topic") or item["text"][:45].replace("\n", " ") + "..."
            print(f"[{item['source']}] {preview} - {item['score']:.2f} ({item['retrieval_use']})")

        try:
            if fact_provider is None:
                # Hosted one-call flow (Gemini): a full answer with section labels.
                response = answer_provider.generate(build_full_answer_prompt(question, references))
            else:
                # The local flow drafts academic facts first, then expresses
                # each fact in Bikol using the retrieved examples.
                sentences = generate_sentences(fact_provider, answer_provider, question, references)
                response = "\n".join(f"{number}. {sentence}" for number, sentence in enumerate(sentences, 1))
        except (RuntimeError, ValueError) as error:
            print(f"\n{error}\n")
            continue

        if clearly_english(response):
            print(f"\n{config.ACTIVE_PROVIDER} returned English. This is not a Bikol tutor answer.")
            print("English draft for debugging:\n")
        else:
            print(f"\nTutor via {config.ACTIVE_PROVIDER} (draft; native review needed):\n")
        print(response + "\n")
        print("-" * 40 + "\n")


if __name__ == "__main__":
    main()
