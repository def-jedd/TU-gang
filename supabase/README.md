# Supabase — Bikol tutor retrieval

Hosted project: `dpkhzerwfgxuarmuumlf` (TU-gang, Tokyo).
Stores the teaching-reference dataset and picks the 2–3 examples used for few-shot prompting.
Only the backend uses Supabase. The mobile app never gets a Supabase key.

## What's deployed

| Piece | Purpose |
|---|---|
| `public.tutoring_examples` | One row per teaching example. Columns match Teammate 4's example schema, plus optional `student_question` (English), `bikol_question` and `style`. |
| `public.match_tutoring_examples(...)` | Retrieval RPC: topic match → semantic (pgvector) → keyword → labeled fallback. |
| Edge Function `sync-examples` | Upserts the JSON dataset and embeds rows missing an embedding. |
| Edge Function `retrieve-examples` | Embeds the student question and calls the RPC. This is what `POST /api/explain` calls. |
| `types/database.types.ts` | Generated TypeScript types for the backend. |

**Embeddings:** Supabase's built-in `gte-small` model (384 dims, English, no external API key).
Only the English side is embedded (`topic`, `student_question`, `english_concept`). Editing that text clears the embedding automatically; run `sync-examples` again to rebuild it.

**Safety rules in the database:**
- RLS is on with no policies, and `anon`/`authenticated` have no grants. Only the secret key can read or write.
- `review_status = 'native_reviewed'` is rejected unless `native_corrected_bikol` is filled in, so an AI draft can't be labeled as reviewed.
- `bikol_explanation` is generated: the native correction if present, otherwise the AI draft. Always check `review_status`.

## Load the dataset

`sync-examples` takes rows in the **database column names** below. The team's `data/bikol_examples.json` uses different names, so map them first:

| `data/bikol_examples.json` | Database column |
|---|---|
| `student_question_en` | `student_question` |
| `student_question_bikol` | `bikol_question` |
| `english_explanation` + `english_analogy` | `english_concept` (joined with a space) |
| `bikol_explanation` | `native_corrected_bikol` (if reviewed) or `ai_draft_bikol` (if draft) |
| `bikol_analogy` | `bikol_example` |
| `review_note` | `review_notes` |
| `topic`, `subject`, `difficulty`, `style`, `review_status`, `region_label` | same name |

```bash
curl -X POST "$SUPABASE_URL/functions/v1/sync-examples" \
  -H "apikey: $SUPABASE_SECRET_KEY" -H "content-type: application/json" \
  -d '{"examples": [ ...mapped rows... ]}'
# -> {"upserted":20,"embedded":8,"remaining":12,"failed":[],"model":"gte-small"}

# Embedding runs in batches of 8 (more hits the function's compute limit).
# Call again with an empty body until "remaining" is 0:
curl -X POST "$SUPABASE_URL/functions/v1/sync-examples" \
  -H "apikey: $SUPABASE_SECRET_KEY" -H "content-type: application/json" -d '{}'
```

Re-running is safe: rows upsert by `id`, and only missing embeddings are generated. `"force": true` clears all embeddings so they're rebuilt over the next calls.
Required per example: `id`, `topic`, `english_concept`. Rows with no Bikol text are stored but never retrieved.

## Retrieve examples (from Express)

```bash
curl -X POST "$SUPABASE_URL/functions/v1/retrieve-examples" \
  -H "apikey: $SUPABASE_SECRET_KEY" -H "content-type: application/json" \
  -d '{"question":"Why do we have earthquakes?","topic":null,"difficulty":"simple","style":"ate_kuya"}'
```

Optional: `match_count` (1–10, default 3), `reviewed_only` (default `true`; `false` also returns drafts), `min_similarity` (default `0.80`).

```json
{
  "retrieval_mode": "semantic+keyword",
  "examples": [
    { "id": "sample_001", "topic": "gravity", "english_concept": "...", "bikol_explanation": "...",
      "bikol_example": "...", "review_status": "native_reviewed",
      "match_type": "semantic", "score": 0.86, "semantic_similarity": 0.86, "keyword_score": 0 }
  ]
}
```

What `match_type` means for the prompt builder:
- `topic`: exact topic match, e.g. NFC card `TOPIC_GRAVITY` → `topic: "gravity"`.
- `semantic` / `keyword`: related example.
- `fallback`: nothing matched. Use it only as a **teaching-style** reference, never as factual grounding.

Use the returned `id`s as `source_ids` in the `/api/explain` response. `retrieval_mode` becomes `keyword_only` if embedding failed.
The backend can also call the RPC directly (`supabase.rpc('match_tutoring_examples', {...})`) for keyword/topic-only retrieval.

## Current data

20 rows (`sample_001`–`sample_020`) synced from the team's `data/bikol_examples.json` (built from `data/SAMPLE_BIKOLANO.md`).
- **All 20 are `native_reviewed`.** The Bikol was provided by the team's Bikol-speaking member. The regional variety isn't specified, so `region_label` is empty; don't claim "Daet" in the demo unless that's confirmed.
- **Every row has Bikol**: question, explanation and example.
- **Topics match Jedrick's prototype**, e.g. `halves` and `equivalent_fractions` instead of one `fractions` topic. NFC topic cards should use these names.

If the Bikol changes, re-sync from `data/bikol_examples.json` (mapping above) so Supabase and the repo stay identical.

## Retrieval results (reviewed data, default settings)

| Question | Top match (similarity) |
|---|---|
| Why does ice melt? | melting 0.92 |
| Why do things drop to the floor? | gravity 0.87 |
| How do plants get energy from the sun? | photosynthesis 0.88 |
| What does half mean? | halves 0.89 |
| How do I share 6 pencils with 3 friends? | division 0.87 |
| Why should I wash my hands? | handwashing 0.89 |
| How much fence do I need around my yard? | perimeter 0.82 |
| Explain black holes simply (not in dataset) | gravity 0.84 |
| NFC topic `halves` | halves (exact topic) |
| What is the capital of France? | fallback only |
| Bakit natutunaw ang yelo? (Tagalog) | fallback only |

## Known limits

- **The first result is reliable; results 2–3 often aren't.** `gte-small` gives related and unrelated examples similar scores, around 0.80–0.85 (e.g. friction for "things drop", cause_and_effect for "thunder"). No threshold cleanly separates them. That's acceptable for few-shot *style* examples, but the prompt must tell the AI not to reuse their facts.
- **`gte-small` is English-only.** Tagalog and Bikol questions only get `fallback` rows. Translating the question to English in the backend before retrieval would fix this.
- **Keyword matching is weak.** It matches on shared words like "need" or "ground". Treat it as a hint, not real retrieval.

## Environment variables (backend)

```
SUPABASE_URL=https://dpkhzerwfgxuarmuumlf.supabase.co
SUPABASE_SECRET_KEY=sb_secret_...   # Dashboard → Project Settings → API Keys. Backend only.
```

## Changing the schema

```bash
npx supabase migration new <name>      # write SQL
npx supabase db push --linked          # apply to hosted DB
npx supabase gen types typescript --linked > supabase/types/database.types.ts
npx supabase functions deploy retrieve-examples sync-examples --use-api
```
