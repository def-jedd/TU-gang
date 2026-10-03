---
inclusion: always
---

# TU-gang — project context

Hackathon project: a **Bikol-first, voice-first tutor** for Filipino learners aged 16 and under
who cannot read yet (Daet / Camarines Norte Bikol). Students "call" a tutor, pick topics with
pictures or physical NFC cards, and listen to concept-first explanations.

## Repository map and owners

| Path | What | Owner | Branch |
|---|---|---|---|
| `apps/mobile` | Expo / React Native app (UI, NFC, voice) | Joshua (`jjoshua-sek`) | `jjoshua-sek` |
| `apps/bikol-rag-cli` | Python tutor: retrieval + Gemini/Ollama, FastAPI `server.py` | Jedrick | `main` |
| `ai/quick-agent` | Amazon Quick agent instructions and tests | Teammate 2 | `feat/quick-agent` |
| `supabase/` | Schema, embeddings, retrieval edge functions | Teammate 3 | `supabase-setup` |
| `data/` | Speaker-reviewed Bikol examples | Teammate 4 | — |

Commit only to your own branch, never directly to `main`. Don't edit another owner's folder
without asking them.

## Non-negotiable rules

- **Honesty:** every answer shows who generated it (`provider`). Mock and practice-voice output is
  always labelled as such. Never present a mock, fallback, or recorded audio as live AI.
- **Bikol text is a draft until a native speaker reviews it.** Don't invent Bikol vocabulary and
  don't mark anything as reviewed without a reviewer.
- **Secrets stay server-side.** Model, Supabase service, and Agora keys live in git-ignored `.env`
  files of the backend, never in `apps/mobile` and never in commits. Check `git status` first.
- **Model:** the team uses Gemini (`BIKOL_PROVIDER=gemini`, default `gemini-3.5-flash-lite`) for
  now. Its terms disallow apps aimed at under-18s; the team knows and plans a swap. Keep the model
  a configuration choice, not hard-coded.

## Shared contract

`POST /api/explain` request/response types: #[[file:apps/mobile/src/types/tutor.ts]]
Voice session routes (backend to build): `apps/mobile/VOICE_CONTRACT.md`.
