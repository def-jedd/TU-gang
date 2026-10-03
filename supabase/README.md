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

```bash
curl -X POST "$SUPABASE_URL/functions/v1/sync-examples" \
  -H "apikey: $SUPABASE_SECRET_KEY" -H "content-type: application/json" \
  -d "{\"examples\": $(cat data/bikol_examples.json)}"
# -> {"upserted":20,"embedded":20,"failed":[],"model":"gte-small"}
```

Re-running is safe: rows upsert by `id`, and only missing embeddings are generated. Send `"force": true` to re-embed everything.
Required per example: `id`, `topic`, `english_concept`. Rows with no Bikol text are stored but never retrieved.

## Retrieve examples (from Express)

```bash
curl -X POST "$SUPABASE_URL/functions/v1/retrieve-examples" \
  -H "apikey: $SUPABASE_SECRET_KEY" -H "content-type: application/json" \
  -d '{"question":"Why do we have earthquakes?","topic":null,"difficulty":"simple","style":"ate_kuya"}'
```

Optional: `match_count` (1–10, default 3), `reviewed_only` (default `true`; set `false` while everything is still a draft), `min_similarity` (default `0.80`).

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

20 rows (`sample_001`–`sample_020`) loaded from the team's SAMPLE-BIKOLANO doc. The Bikol text is verbatim. English fields were written to describe each concept.
- **All rows are `draft`** until a native speaker confirms them, so pass `reviewed_only: false` for now. With the default `true`, nothing is returned.
- **`sample_011`, `sample_014` and `sample_019`** (one-half, division, handwashing) are English-only in the source. They're stored, but they won't be retrieved until Bikol is added.
- **Review flags are in `review_notes`:**
  - `sample_016`: *lugar* vs *hiwas* for "area".
  - `sample_017`: *dahelan* vs *kawsa* for "cause".
  - `sample_013`: *nin marikas*.

To promote a row after review, set `native_corrected_bikol` (the speaker's final text) and `review_status = 'native_reviewed'`.

## Retrieval results on the 20 samples

| Question | Top match (similarity) |
|---|---|
| Why does ice melt? | melting 0.92 |
| Why do things drop to the floor? | gravity 0.87 |
| How do plants get energy from the sun? | photosynthesis 0.88 |
| What is a fraction? | fractions 0.87 |
| How much fence do I need around my yard? | perimeter 0.83 |
| Why do my wet clothes dry under the sun? | rain 0.84, evaporation 0.83 |
| Explain black holes simply (not in dataset) | gravity 0.84 |
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
