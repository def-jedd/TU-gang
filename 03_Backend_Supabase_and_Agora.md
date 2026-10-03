# Teammate 3 — Backend, Supabase Retrieval, and Agora Integration

**Project:** Bikol-first adaptive educational tutor  
**Your mission:** Own the stable API between the frontend and AI, store/retrieve our examples safely, and add voice only after a real end-to-end text flow works.

## 1. Your stack

| Layer | Choice | Reason |
|---|---|---|
| API server | Node.js + Express + TypeScript | Quick to build; shares TypeScript types with frontend |
| Dev runner | `tsx`, `dotenv` | Fast iteration, environment-based secrets |
| Data store | Existing Supabase project + Postgres | Already available to the team |
| Optional semantic search | Supabase `pgvector` | Only if retrieval proves useful and embedding generation is ready |
| AI | Provider adapter controlled by verified route from Teammate 2 | Do **not** assume an undocumented Quick chat API |
| Optional voice | Agora with an available/verified TTS provider | TTS quality and credits must be tested separately |
| Tests | Postman/Thunder Client or curl; a few automated API smoke tests | Fast integration checks |

Your job is to make **frontend and AI develop independently** using a single contract, even when Quick integration is uncertain.

## 2. Shared app architecture

```text
Expo mobile UI / simulated NFC card
             |
       POST /api/explain
             |
      Express request validation
             |
     Retrieve relevant reviewed
          Bikol examples
             |
          TutorProvider
        /       |        \
 Verified    Approved   Clearly labeled
 Quick route fallback       mock
             |
 Normalize explanation/example/key_points
             |
        JSON to frontend
             |
   Optional voice action → verified Agora route
```

**Gate with Teammate 2 by hour 2:** Quick documents an embeddable agent UI, but that does **not** establish a generic programmatic chat API returning the JSON your Express route needs. If sponsor credentials grant a supported call, use them exactly as documented. Otherwise choose an honest fallback/degraded demo plan together.

Quick docs: https://docs.aws.amazon.com/quick/latest/userguide/custom-agents.html

## 3. API — implement these first

### `GET /api/health`

```json
{"status":"ok","version":"mvp","provider":"mock"}
```

Report the *actual selected provider* when integrated. Do not treat `ok` as proof that Quick or Agora is reachable.

### `POST /api/explain`

Request:

```json
{
  "question": "Why do plants need sunlight?",
  "topic": "photosynthesis",
  "language": "bikol_daet",
  "difficulty": "simple",
  "style": "ate_kuya",
  "action": "explain"
}
```

Allow `topic: null` for open-ended questions. Validate nonempty question or known NFC topic, bounded string lengths, known difficulty/style/action values, and reasonable request timeouts.

Success response:

```json
{
  "request_id": "generated-id",
  "topic": "photosynthesis",
  "language": "bikol_daet",
  "explanation": "...",
  "example": "...",
  "key_points": ["...", "...", "..."],
  "source_ids": ["sample_001"],
  "provider": "quick"
}
```

Valid `provider` values: `quick`, `approved_fallback`, `mock`. Use `quick` **only** for actual verified Quick-generated results. Use suitable HTTP error codes plus `{ "error": "readable message" }` on failure.

### Optional voice route — after text works

Agree on the specific **Agora SDK/session workflow** before defining final endpoints. The server may need to issue temporary RTC tokens and start/stop an agent; that depends on the selected official Agora integration. Never ship Agora secrets or a service-role Supabase key to the app.

Agora build docs: https://docs.agora.io/en/ai/build/build-server-client

## 4. Suggested backend structure

```text
apps/server/
  src/
    index.ts
    routes/
      health.ts
      explain.ts
      voice.ts               # only after verified Agora POC
    services/
      retrieval.ts
      promptBuilder.ts
      tutorProvider.ts
      providers/
        mock.ts
        quick.ts             # implement only with verified invoke path
        approvedFallback.ts # only if permitted and available
      agora.ts               # optional
    lib/
      supabase.ts
    validation/
      explain.ts
    types/
      tutor.ts
  .env.example
  package.json
```

Keep provider-specific logic in its adapter. A future swap must not require changing the frontend or retrieval service.

## 5. Supabase: simplest useful database

Start with the **20 draft educational examples** from Teammate 4, then import corrections as reviewers finish. Do not store/relabel AI drafts as native reviewed.

```sql
create table if not exists tutoring_examples (
  id text primary key,
  topic text not null,
  subject text,
  english_concept text not null,
  bikol_explanation text not null,
  bikol_example text,
  review_status text not null default 'draft'
    check (review_status in ('draft', 'native_reviewed')),
  region_label text,
  source_label text not null default 'team_dataset',
  created_at timestamptz default now()
);
```

**Practical MVP retrieval with only 20–50 examples:** match a known `topic`, use text search/keyword matching against `english_concept`, and choose 2–3 good native-reviewed examples. This is a small **reference retrieval prototype**; do not market it as full semantic RAG if it is only keywords.

**Upgrade to actual RAG if time permits:** use the team's chosen embedding model to embed the **English concept and topic** for matching English/Tagalog inputs; store the corresponding Bikol explanation as the teaching reference. This avoids relying entirely on an untested English↔Bikol multilingual embedding alignment. For Bikol input, separately test cross-language retrieval quality. Keep vector dimensionality equal to the actual selected model output. Use Supabase `pgvector` and a cosine-similarity RPC. Measure whether it improves the 10-question benchmark before expanding public corpora.

Official semantic search guide: https://supabase.com/docs/guides/ai/semantic-search

**Do not let the database become a deadline blocker.** If credentials/schema deployment fail, use an in-memory JSON file with exactly the same retrieval function signature. Note the actual storage mode in the demo.

## 6. Prompt/reference assembly

The provider receives:

```ts
type TutorContext = {
  question: string;
  topic?: string | null;
  language: 'bikol_daet';
  difficulty: 'very_simple' | 'simple' | 'normal';
  style: 'teacher' | 'friend' | 'ate_kuya';
  action: 'explain' | 'explain_differently';
  references: Array<{
    id: string;
    englishConcept: string;
    bikolText: string;
    reviewStatus: 'draft' | 'native_reviewed';
  }>;
};
```

Select reviewed examples where possible. Generic Bikol passages are **language references**, not authoritative textbook facts. Avoid dumping unrelated passages into the prompt; when retrieval is weak, rely on instructions and state that grounding was limited.

## 7. Agora voice is conditional, not a parallel dependency

1. Verify what the sponsored Agora account actually covers: project credentials, quotas, managed-provider eligibility, whether additional external TTS billing/keys are required.
2. Test a short native-reviewed Bikol sentence and have the reviewer score pronunciation/intelligibility.
3. Decide whether the integration is **voice session (RTC)** or another actually documented pathway; do not assume arbitrary Quick text can be passed into Agora without a tested integration.
4. Wire the app's `Listen` button only when the tested pathway is operational.
5. If synthetic speech is poor, use a **clearly labeled recorded native-speaker sample** as a demo alternative, subject to speaker permission; otherwise deliver text-only.

Agora managed-provider documentation: https://docs.agora.io/en/ai/build/managed-mode

## 8. Your 24-hour timeline

| Hours | Deliverable |
|---|---|
| 0–2 | Initialize API; `GET /api/health`; freeze `POST /api/explain` contract; decide Quick path with Teammate 2 |
| 2–5 | Mock `POST /api/explain` and tests; basic Supabase table/JSON retrieval; share live endpoint with UI |
| 5–9 | Integrate reviewed sample records and the verified generator path (or approved, disclosed fallback); return normalized JSON |
| 9–14 | Stabilize error handling, response times, and explain-differently; end-to-end text demo |
| 14–19 | **Only if stable:** investigate Agora token/session and add voice after pronunciation test; support NFC request inputs |
| 19–24 | Freeze, verify secrets and deployed endpoint, run smoke tests; support demo recording and fallback |

## 9. Your definition of done

- [ ] Two working endpoints and documented environment variables.
- [ ] Validated arbitrary questions plus NFC-topic requests produce consistent JSON.
- [ ] No secrets in the app, Git history, or public logs.
- [ ] Storage/retrieval approach is accurately described; no invented RAG capability.
- [ ] Verified provider mapping: response's `provider` matches what actually generated it.
- [ ] Three complete frontend→backend→response tests pass on the demo network.
- [ ] Optional voice is enabled only after working Agora session and native-speaker audio review.

**Suggested branch:** `feat/backend-rag`. Merge the tested mock API early, then incrementally add integrations.

