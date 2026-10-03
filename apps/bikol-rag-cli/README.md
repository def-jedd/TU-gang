# Bikol Tutor CLI — reviewed dataset integration

This is a working copy of the user's existing `Simple CLI rag/bikol-rag-cli` prototype. The original folder is unchanged. The copy now builds its retrieval corpus from the 20 paired records in [`../../data/bikol_examples.json`](../../data/bikol_examples.json). The user confirmed that the current Bikol sample file was reviewed; the exact regional variety was not specified.

## What changed

1. `prepare_data.py` reads the 20 reviewed records. It stores the English question and explanation as `retrieval_text`, and the Bikol teaching interaction as `text` for the prompt.
2. `build_embeddings.py` embeds `retrieval_text` with the existing multilingual MiniLM model and records a SHA-256 corpus hash.
3. `retrieval.py` selects topic-matched reviewed examples first and fills remaining slots with labeled teaching-style examples. An unseen question still gets examples, but they are **not factual sources** for that topic.
4. `prompt_builder.py` uses those examples for phrasing and explicitly says their regional variety is unspecified.
5. The existing Ollama two-stage generation is retained, and an optional Gemini path generates an answer in one API call. `providers/quick.py` is still a stub: this CLI does **not** call Amazon Quick.

The original ten custom examples are kept as `data/custom/legacy_tutoring_examples.json` for inspection but are not ingested. The earlier `language_examples.json` drafts are also not ingested. This avoids silently mixing reviewed examples with unverified regional labels or draft sentences.

## Run on this Windows PC

Use the Python environment from the original CLI installation, or install `requirements.txt` in a new environment. From the repository root:

```powershell
cd apps/bikol-rag-cli
python prepare_data.py
& 'C:\Users\richelle franconas\Desktop\Simple CLI rag\bikol-rag-cli\.venv\Scripts\python.exe' build_embeddings.py
& 'C:\Users\richelle franconas\Desktop\Simple CLI rag\bikol-rag-cli\.venv\Scripts\python.exe' retrieval.py
& 'C:\Users\richelle franconas\Desktop\Simple CLI rag\bikol-rag-cli\.venv\Scripts\python.exe' chat.py
```

Ollama must be running with `gemma3:4b` and `bikol-tutor-q4` installed for `chat.py`. You can inspect retrieval with `retrieval.py` even when Ollama is unavailable.

### Faster hosted-model test with Gemini

Create a Gemini API key in [Google AI Studio](https://aistudio.google.com/api-keys). This CLI can read `GEMINI_API_KEY`, `BIKOL_PROVIDER`, and `GEMINI_MODEL` from a local `.env` file in this directory. The file is ignored by Git. In **Command Prompt** (the `C:\...>` prompt), run:

```bat
cd /d "C:\Users\richelle franconas\Desktop\Hackathon\apps\bikol-rag-cli"
"C:\Users\richelle franconas\Desktop\Simple CLI rag\bikol-rag-cli\.venv\Scripts\python.exe" chat.py
```

Gemini mode uses one API call per question with the retrieved examples; the local embedding model still selects the examples. The default Gemini model is `gemini-3.5-flash-lite`, which worked in a live test. `gemini-3.8-flash` returned HTTP 503 during that test. A process environment variable takes precedence over `.env` when both are set.

If you edit `data/SAMPLE_BIKOLANO.md`, have the edited entries reviewed again, then run `python scripts/build_dataset.py --reviewed` from the repository root before rebuilding the corpus and embeddings. The hash check in `chat.py` rejects stale embeddings.

## Public Bikol sources

The local Halo-BCL sample can be added for an experiment with `python prepare_data.py --include-public`, followed by rebuilding embeddings. It remains labeled `language_style`, unreviewed, and region-unknown. The inherited sample lacks per-row URLs, so it is excluded by default. Check source permissions and provenance before publishing its passages. Ara Close and PLOC are not imported yet; their suitability and regional fit must be checked separately.

## Boundaries

- The active retrieval store is local JSON plus NumPy vectors, **not Supabase**. The same `retrieval_text` and 384-dimensional vectors can later be stored in Supabase `pgvector` using the same embedding model at query time.
- The CLI's live answer comes from local Ollama or, when selected, Gemini. It does **not** come from Amazon Quick. Quick integration requires a verified supported invocation method.
- Speaker review of source examples does not validate each newly generated answer or its academic facts.
