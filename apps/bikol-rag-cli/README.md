# Bikol Tutor CLI — reviewed dataset integration

This is a working copy of the user's existing `Simple CLI rag/bikol-rag-cli` prototype. The original folder is unchanged. The copy now builds its retrieval corpus from the 20 paired records in [`../../data/bikol_examples.json`](../../data/bikol_examples.json). The user confirmed that the current Bikol sample file was reviewed; the exact regional variety was not specified.

## What changed

1. `prepare_data.py` reads the 20 reviewed records. It stores the English question and explanation as `retrieval_text`, and the Bikol teaching interaction as `text` for the prompt.
2. `build_embeddings.py` embeds `retrieval_text` with the existing multilingual MiniLM model and records a SHA-256 corpus hash.
3. `retrieval.py` selects topic-matched reviewed examples first and fills remaining slots with labeled teaching-style examples. An unseen question still gets examples, but they are **not factual sources** for that topic.
4. `prompt_builder.py` uses those examples for phrasing and explicitly says their regional variety is unspecified.
5. The existing Ollama two-stage generation is retained. `providers/quick.py` is still a stub: this CLI does **not** call Amazon Quick.
6. The pipeline lives in `tutor.py`, shared by `chat.py` (terminal) and `server.py` (the mobile app's API). The app's level, tutor, and "another way" choices reach the prompts; with no choices the prompts are exactly the CLI's originals.

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

If you edit `data/SAMPLE_BIKOLANO.md`, have the edited entries reviewed again, then run `python scripts/build_dataset.py --reviewed` from the repository root before rebuilding the corpus and embeddings. The hash check in `chat.py` rejects stale embeddings.

## Serve the mobile app

`server.py` exposes the same tutor as `POST /api/explain` and `GET /api/health`, using the contract in [`apps/mobile/src/types/tutor.ts`](../mobile/src/types/tutor.ts). After `prepare_data.py` and `build_embeddings.py` (above), with Ollama running:

```powershell
pip install -r requirements.txt   # adds fastapi + uvicorn
python server.py
```

It listens on port 8000 (set `PORT` to change it) and prints the `EXPO_PUBLIC_API_BASE_URL=…` line to put in `apps/mobile/.env.local`. Allow Python through the Windows firewall when asked, or the phone cannot connect. Try requests in the browser at `http://localhost:8000/docs`.

How the answer maps onto the app: the three Bikol sentences are the direct answer and the reason (`explanation`), then the everyday example (`example`). `key_points` stays empty instead of repeating them, because practice voice reads every field aloud. `source_ids` lists the style references in the prompt, not factual sources. `provider` is the value of `BIKOL_PROVIDER`, so the app's badge always names the model that answered. An English reply returns an error instead of being shown as Bikol.

## Switching to Kiro

The generator is chosen by environment variable; nothing else changes, including the mobile app.

| Variable | Default | Purpose |
|---|---|---|
| `BIKOL_PROVIDER` | `ollama` | `ollama` or `kiro` |
| `OLLAMA_BASE_URL`, `BIKOL_FACT_MODEL`, `BIKOL_LLM_MODEL` | `localhost:11434`, `gemma3:4b`, `bikol-tutor-q4` | Ollama only |
| `KIRO_API_KEY` | — | Required for Kiro; from Kiro account settings (Pro tier or above). Never commit it. |
| `KIRO_MODEL`, `KIRO_AGENT` | Kiro's defaults | Optional `--model` / `--agent` for `kiro-cli chat` |

`providers/kiro.py` runs [`kiro-cli chat --no-interactive`](https://kiro.dev/docs/cli/headless/) once per model call (four per answer) and **has not been tested against a live account yet**. Check one question with `chat.py` first. Each call spends Kiro credits. Tools are never pre-approved, because the prompt contains student text; a custom Kiro agent with no tools (`KIRO_AGENT`) is safer still. The `bikol-tutor-q4` fine-tune does not exist on Kiro, so re-check Bikol quality with the reviewer after switching.

## Public Bikol sources

The local Halo-BCL sample can be added for an experiment with `python prepare_data.py --include-public`, followed by rebuilding embeddings. It remains labeled `language_style`, unreviewed, and region-unknown. The inherited sample lacks per-row URLs, so it is excluded by default. Check source permissions and provenance before publishing its passages. Ara Close and PLOC are not imported yet; their suitability and regional fit must be checked separately.

## Boundaries

- The active retrieval store is local JSON plus NumPy vectors, **not Supabase**. The same `retrieval_text` and 384-dimensional vectors can later be stored in Supabase `pgvector` using the same embedding model at query time.
- The CLI's and API's live answers come from local Ollama models (or Kiro, once switched), **not Amazon Quick**. Quick integration requires a verified supported invocation method.
- Speaker review of source examples does not validate each newly generated answer or its academic facts.
