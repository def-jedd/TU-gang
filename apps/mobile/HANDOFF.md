# Handoff — TU-gang mobile app (UI + NFC + voice)

**Owner:** Joshua (`jjoshua-sek`), Teammate 1 — UI, NFC, voice front end
**Snapshot:** 2026-10-04 · branch `jjoshua-sek` · PR [def-jedd/TU-gang#1](https://github.com/def-jedd/TU-gang/pull/1) (open → `main`)
**Read with:** [README.md](README.md) (run + NFC) · [DESIGN.md](DESIGN.md) (research → UI) · [VOICE_CONTRACT.md](VOICE_CONTRACT.md) (backend voice routes)

---

## 1. What this app is

Bikol-first tutor for Filipino learners aged ≤16 who **can't read yet**. So the main flow is
**voice**: the student "calls" a tutor (Ate/Kuya, Friend or Teacher), picks a topic by tapping a
picture or a **physical NFC card**, and listens to a concept-first Bikol explanation. A typed /
reading mode still exists behind the **Type** button.

Stack: Expo SDK 57 · React Native 0.86 · React 19.2 (React Compiler on) · TypeScript 6 · Expo
Router (`src/app`). Backend (not mine): Jed's Python FastAPI tutor in `apps/bikol-rag-cli`.

## 2. Decisions so far (and why)

| Decision | Why / status |
|---|---|
| **Voice-first, phone-call metaphor** | Users can't read; every kid knows Messenger calls. Text is secondary. |
| **One reducer for every input** (`src/nfc/cardReducer.ts`) | NFC tag, on-screen card and button produce identical requests, proven by tests. |
| **Two voice engines behind one interface** | *Practice voice* (device speech; works in Expo Go now; cannot hear) and *Agora live voice* (dev build + backend). Switch: `EXPO_PUBLIC_VOICE_MODE`. |
| **Model: Gemini Flash** (team decision, 2026-10-04) | Default `gemini-3.5-flash-lite` (Jed tested it live). ⚠ Gemini's and Vertex AI's terms forbid apps "directed towards or likely to be accessed by" under-18s. The team accepted this for now and plans to swap later; the provider is one env var, so the app doesn't change. |
| **Kiro credits are for development only** | Kiro's FAQ limits subscriptions to its tools and software-dev automation; the free plan has no API key anyway. `providers/kiro.py` exists but shouldn't serve students. |
| **English UI by default** | All Bikol UI text is an **unreviewed draft** (`src/i18n/copy.ts`). Flip `EXPO_PUBLIC_UI_LANG=bik` after Teammate 4's reviewer signs off. |
| **Honesty badges everywhere** | Every answer/call shows who produced it ("Answered by Gemini AI", "Practice voice · not live AI", "Demo data · not live AI"). Never remove. |
| **Expo Go access is open** | Dev manifest is anonymous (no EAS projectId), so teammates scan the QR without logging in. Running `eas init` would change that. |

## 3. Status

**Done and verified**
- Home (voice), Call, Cards, Type (`/ask`), Answer (`/result`) screens: type-check clean, Android
  bundle compiles, all flows exercised in a 375 px web preview (call phases, captions, Simpler,
  Again, Another way, End, Back hangs up, Cards → call, deep link `?card=`).
- `npm test`: 16/16 (card → JSON contract, cards-during-call mapping, Agora caption chunk parser).
- Mobile badge for `provider: "gemini"`; backend merge with Jed's Gemini provider (Python tests
  12/12 with fakes).
- Runs on Joshua's phone in Expo Go via `npm run tunnel`.

**Written but NOT yet verified**
- `src/voice/agoraAgent.native.ts`: needs a **dev build** and the backend's `/api/voice/sessions`.
  Volume thresholds (`AGENT_LOUD`, `STUDENT_LOUD`) need tuning on the demo phone.
- `src/nfc/reader.native.ts`: needs a dev build + NTAG stickers.
- Gemini end-to-end through `server.py` (only unit-tested with a fake model).
- Practice voice and haptics on a real phone after the voice redesign: check once.

## 4. Run it

```powershell
cd C:\Users\Joshua\Downloads\Webdev\Prog\TU-gang\apps\mobile
npm install          # only after pulling new dependencies
npm run tunnel       # guest/venue Wi-Fi; or `npx expo start` on a hotspot
```

It's `npx expo …` / `npm run …`, never `npm expo …`. `npx expo run:android` is a *native* build
(Android Studio + USB phone), not the Expo Go QR.

**Backend with Gemini** (Jed's code): `apps/bikol-rag-cli/.env` already holds `GEMINI_API_KEY`,
`BIKOL_PROVIDER`, `GEMINI_MODEL` (git-ignored). Run `python server.py` there; it prints the
`EXPO_PUBLIC_API_BASE_URL=…` line for `apps/mobile/.env.local`. A laptop LAN IP is unreachable
on guest Wi-Fi/tunnel; use a shared hotspot or a public URL for the backend.

**Tests:** `npm test` + `npm run typecheck` (mobile). Python:
`cd apps/bikol-rag-cli && .venv\Scripts\python -m unittest discover -s tests` (the local `.venv`
only has `requests`; the full server also needs FastAPI + sentence-transformers).

### Mobile env vars (`apps/mobile/.env.local`, git-ignored; template `.env.example`)

| Var | Default | Meaning |
|---|---|---|
| `EXPO_PUBLIC_API_BASE_URL` | unset → mock | Backend URL reachable *from the phone* |
| `EXPO_PUBLIC_VOICE_MODE` | `simulated` | `agora` once dev build + voice routes exist |
| `EXPO_PUBLIC_INTERACTION` | `voice` | `text` makes cards use the reading flow |
| `EXPO_PUBLIC_UI_LANG` | `en` | `bik` after native review |
| `EXPO_PUBLIC_SPOKEN_LABELS` / `_CAPTIONS` / `_ENABLE_LISTEN` | `true` / `false` / `false` | Accessibility toggles |

Only `EXPO_PUBLIC_*` values are bundled into the app. **Never** put model, Supabase service, or
Agora keys in `apps/mobile`.

## 5. Next tasks (priority order)

| # | Task | Owner | Notes |
|---|---|---|---|
| 1 | Native-speaker review of `src/i18n/copy.ts`, card labels in `src/nfc/cards.ts`, mock text in `src/services/mockTutor.ts` | Teammate 4 + Joshua | Then set `EXPO_PUBLIC_UI_LANG=bik` |
| 2 | Implement `POST/DELETE /api/voice/sessions` + `/control` | Teammate 3 / Jed | Spec: `VOICE_CONTRACT.md`. Agora supports Gemini directly (`llm.style: "gemini"`). |
| 3 | Dev build (EAS cloud or `npx expo run:android`) | Joshua | Unlocks NFC + Agora. Queue time is long, so start early. |
| 4 | Test `AgoraVoiceAgent` live; tune volume thresholds | Joshua | Then `EXPO_PUBLIC_VOICE_MODE=agora` |
| 5 | Spoken "I'm an AI tutor" notice at call start | Joshua | Required by OpenAI/Anthropic minors policies if the model is swapped later; good practice anyway |
| 6 | Make the backend reachable from all phones | Team | Hotspot or public URL |
| 7 | Write + print physical NFC cards | Joshua | Codes table in README |
| 8 | Update PR #1 description (now includes voice + Gemini merge) | Joshua | |
| 9 | Decide on the uncommitted `package.json` script change | Joshua | `expo run:android` rewrote `android`/`ios` scripts to native builds. Revert (`git checkout -- apps/mobile/package.json`) until the dev build is set up |

## 6. Team map (as of this snapshot)

| Who | Area | Branch | State |
|---|---|---|---|
| Joshua | `apps/mobile` | `jjoshua-sek` | This handoff |
| Jedrick | `apps/bikol-rag-cli` (RAG tutor, Gemini) | `main` | Gemini provider merged into `jjoshua-sek` |
| Teammate 2 | `ai/quick-agent` | `feat/quick-agent` | Instructions + 5/13 test outputs; `route-decision.md` empty |
| Teammate 3 | `supabase/` (schema, embeddings, retrieval edge functions) | `supabase-setup` | Not on `main` yet |
| Teammate 4 | Bikol dataset + review | — | Reviewed examples in `data/bikol_examples.json` |

Joshua's work goes to **`jjoshua-sek` only**; don't edit other teammates' folders without asking.

## 7. Gotchas (learned the hard way)

- **Guest Wi-Fi blocks phone ↔ laptop.** Use `npm run tunnel` (ngrok is a dev dependency; the
  global install isn't found by Expo on Windows).
- **Expo Go cannot load native modules**: `react-native-nfc-manager` and `react-native-agora` are
  loaded lazily and degrade with an on-screen explanation. Keep it that way (see the `.native.ts`
  / `.ts` platform splits in `src/nfc` and `src/voice`).
- **React Compiler is on**: don't read or write refs during render; sync refs in `useEffect`.
- **Hermes**: avoid regex lookbehind; don't assume `TextDecoder` (see `agoraMessages.ts`).
- **Metro with `CI=1` doesn't watch files**: restart it to pick up edits.
- **Leaving the call screen must hang up**: done via an unmount cleanup in `call.tsx` (deferred
  to survive React StrictMode). `beforeRemove` alone missed web history navigation.
- **`expo login -b` crashes on Windows** (unquoted `&` in `cmd /c start`). Workaround:
  `set BROWSER=none` then `npx expo login -b` and open the printed link manually.
- **Secrets**: `.env` files are git-ignored in both apps. Check `git status` before every commit.
