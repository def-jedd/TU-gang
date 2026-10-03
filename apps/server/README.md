# Bikol tutor API server

Express + TypeScript. **The app's single front door:** one base URL for answers and voice.

| Route | What it does |
|---|---|
| `GET /api/health` | This server's status, plus the tutor's status and `provider` |
| `POST /api/explain` | **Forwarded unchanged** to Jed's Python tutor (`TUTOR_UPSTREAM_URL`). Each answer is remembered under the tutor's own `request_id`, so Listen can speak it. The response (including `provider`) is passed through as-is. |
| `POST /api/voice/*` | Agora Listen (below) |

```bash
# 1. Jed's tutor:  cd apps/bikol-rag-cli && python server.py   (port 8000)
# 2. This server:
cd apps/server
cp .env.example .env.local   # fill in values; TUTOR_UPSTREAM_URL=http://localhost:8000
npm install
npm run dev                  # http://localhost:3000, prints the phone URL
```

**Mobile `.env.local`:** point **both** answers and voice at this server. Use `EXPO_PUBLIC_API_PORT=3000` (with `EXPO_PUBLIC_API_BASE_URL=auto`), or paste the `Phone setting:` line the server prints. If the app calls Jed's server directly on 8000, Listen returns 404, because this server never saw the answer.

**Errors from the tutor** pass through with their status (e.g. `422` for an empty question). If the tutor is down: `502`. Slower than `TUTOR_TIMEOUT_MS` (default 90 s): `504`. Not configured: `503`.

## Listen (Agora text-to-speech)

Agora doesn't return an audio file. A temporary agent joins a voice channel and speaks into it, and the app joins the same channel to hear it.
Voice: MiniMax `speech-2.8-turbo`, `English_captivating_female1`, Agora-managed (no vendor keys). The team approved it in the round-1 test (`tools/voice-test`).

### Flow for the mobile app

```text
1. POST /api/voice/start  { "request_id": "<from /api/explain>" }
   → { session_id, app_id, channel, uid, token, agent_uid, chunk_count, expires_in_seconds }
2. Join the channel with react-native-agora: app_id, channel, token, uid.
   Audience only: do NOT publish the microphone.
3. When the agent's audio track appears (user-published / onUserJoined for agent_uid):
   POST /api/voice/<session_id>/speak  → { chunks_sent }
4. Play until done, or on "Stop" / leaving the screen:
   POST /api/voice/<session_id>/stop   → { stopped: true }
   Then leave the channel.
```

- **The app never sends text to speak.** It references a stored answer (`request_id`) or a dataset row (`example_id`), so a client can't make the account read arbitrary text.
- **Long answers are split automatically** at sentence ends into pieces of 500 bytes or less (Agora's limit is 512 per call), then queued in order.
- **Safety nets:** at most 5 sessions at once (`429` beyond that). Each agent is force-stopped after 3 min, and leaves 30 s after the listener does. All agents stop on server shutdown.
- **`react-native-agora` needs an Expo development build**, not Expo Go.

### Errors

| Status | When |
|---|---|
| 400 | Body isn't `{request_id}` or `{example_id}`, or invalid JSON |
| 404 | Unknown/expired `request_id` (answers are kept 1 h, in memory), example has no Bikol, or unknown session |
| 409 | `/speak` called twice on one session. Start a new session to replay. |
| 429 | Too many concurrent sessions |
| 502 | Agora or Supabase call failed |

## Testing

| What | How |
|---|---|
| In a browser | `npm run dev`, then open http://localhost:3000/voice-test. Pick an example and press Listen. The log shows timings. |
| Automated end-to-end | With the server running: `npm run test:voice -- sample_001` (headless Chromium listener) |
| Confirm no agents left running | `npx tsx scripts/list-agents.mts` |
| Without Jed's tutor / Gemini | `node scripts/fake-tutor.mjs` (port 8000, same routes as `server.py`, canned reviewed Bikol, labeled `provider: "mock"`) |
| Types | `npm run typecheck` |

Dev-only routes (when `ENABLE_VOICE_TEST_PAGE=true`):
- `GET /api/voice/test-examples` lists the Bikol examples.
- `POST /api/voice/test-answer` stores a hand-written answer labeled `provider: "mock"`, to test the `request_id` path before `/api/explain` exists.

### Measured (2026-10-03, sandbox → Agora AP region)

| Test | Time to first speech | Speech |
|---|---|---|
| sample_001 gravity (1 chunk) | 3.3–5.9 s* | ~8 s |
| sample_003 melting (1 chunk) | 3.4 s | ~9 s |
| 553-byte answer (2 chunks) | 3.2 s | ~35 s |
| 824-byte answer (2 chunks) | 3.3 s | ~57 s, no gap between chunks |

\* 5–6 s before `/speak` was triggered by the agent's audio track instead of a fixed wait.

Roughly 2 s of each wait is Agora starting the agent. To make Listen feel faster in the app, call `/start` as soon as the answer screen opens (before the tap), and only call `/speak` on tap.
