# Bikol retrieval command-line prototype

This prototype pairs the English teaching drafts with the revised Bikol sample file, retrieves 2–3 examples for a new question, and prints the few-shot prompt. It **does not call Amazon Quick or generate an answer**. That connection requires a verified, supported invocation route.

From the repository root in PowerShell:

```powershell
python scripts/build_dataset.py --reviewed
python prototype/tutor_cli.py "Why does ice melt?"
python prototype/tutor_cli.py "Why do earthquakes happen?"
python prototype/tutor_cli.py
```

The `--reviewed` flag reflects the user's confirmation that the current `SAMPLE_BIKOLANO.md` file was reviewed. If that file changes, it needs review again before regenerating with the flag. The regional variety has not been supplied, so the JSON does not claim one.

The default retrieval method is a small English TF-IDF cosine baseline implemented with Python's standard library. It is inspectable and needs no keys or downloads. **It is lexical search, not neural embeddings.** To try semantic embeddings, install the optional dependency and use the same model for example texts and each question:

```powershell
python -m pip install -r prototype/requirements-semantic.txt
python prototype/tutor_cli.py --mode semantic "Why does ice melt?"
```

Semantic mode downloads `sentence-transformers/all-MiniLM-L6-v2` on first use. It currently computes embeddings locally each run. The next step is to persist the 384-dimensional vectors in Supabase `pgvector`, query them there, and compare retrieval results. Public Bikol corpora remain separate language references until their source rights and regional fit are checked.

For an unseen question with no lexical overlap, the baseline returns a few diverse examples labeled **style fallback**. These are teaching-style demonstrations, not factual sources for the new topic. Inspect the printed IDs and scores during testing.
