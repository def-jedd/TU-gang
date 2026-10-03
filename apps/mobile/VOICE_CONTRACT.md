# Voice session contract (mobile ↔ backend ↔ Agora ↔ Quick)

For **Teammate 3 (backend)** and **Teammate 2 (Quick / AI behaviour)**.
The mobile side is done and waiting on these three routes. Client code:
`src/voice/voiceApi.ts`, `src/voice/agoraAgent.native.ts`.

```text
 phone                         backend (Express)                    Agora Conversational AI
 ─────                         ─────────────────                    ───────────────────────
 POST /api/voice/sessions ───▶ make channel + 2 RTC tokens
                               POST …/projects/{appid}/join ───────▶ agent joins channel
 ◀── app_id, channel, token,                                         ASR → LLM → TTS
     uid, agent_uid                                                     │
 joins same RTC channel ◀═══════════ audio both ways + captions ═══════▶│
                                                                        │ llm.url
                               POST /v1/chat/completions ◀──────────────┘
                               (OpenAI-compatible, streamed)
                                 └─▶ Quick (verified route) or approved fallback
```

> **Status (implemented):** `apps/server/src/services/conversation.ts` +
> `src/routes/voice.ts`. The agent uses Agora ARES speech recognition
> (`fil-PH`, or `en-US` for English) with turn detection, so the student just
> talks; Gemini (OpenAI-compatible endpoint, `provider: "gemini"`) writes the
> replies from `prompts/voice_tutor_system.txt` (+ speaker-reviewed Bikol
> examples for Bikol calls); MiniMax speaks them. Topic explanations wait for
> the internal `{ "action": "ready" }` control, which the phone sends once the
> agent has joined. Sections below are the original design notes; where they
> differ (e.g. no `llm.url` proxy, Agora SDK instead of raw REST), the code wins.
> Dev-only: `GET /api/voice/sessions/:id/history` (needs `ENABLE_VOICE_TEST_PAGE=true`).

Agora customer ID/secret, the App Certificate, and Quick credentials stay
**on the backend only**. The phone receives one short-lived RTC token.

## 1. `POST /api/voice/sessions` — start a call

Request (built from the cards / pickers the student chose):

```json
{
  "topic": "melting",
  "question": null,
  "language": "bikol_daet",
  "difficulty": "very_simple",
  "style": "ate_kuya"
}
```

`topic` and `question` can both be `null` (free conversation: the tutor greets and asks what the student wants to learn).
`language` can be `bikol_daet`, `tagalog`, or `english`. The future live voice backend must choose its greeting, ASR, and TTS for that selection. Practice voice already sends the selected value to `/api/explain`.

Response `200`:

```json
{
  "session_id": "vs_8f2c…",
  "app_id": "<agora app id>",
  "channel": "tugang-8f2c…",
  "token": "<RTC token for uid in channel>",
  "uid": 1002,
  "agent_uid": 1001,
  "provider": "quick"
}
```

`provider` = `quick` | `approved_fallback`, whichever LLM route the agent actually uses (shown on screen).

Backend steps:
1. Random channel name; numeric `uid` (phone) and `agent_uid`.
2. Build RTC tokens for both uids (`agora-token` npm, `RtcTokenBuilder.buildTokenWithUid`, publisher role, ~1 h).
3. `POST https://api.agora.io/api/conversational-ai-agent/v2/projects/{appid}/join` with Basic auth:
   - `channel`, agent `token`, `agent_rtc_uid`, `remote_rtc_uids: ["<uid>"]`, `idle_timeout: 120`
   - `llm.url` = **our** OpenAI-compatible endpoint (section 4), `llm.system_messages` = the tutor prompt
     filled with topic/difficulty/style (Teammate 2 owns the wording), `llm.greeting_message` = a
     **native-reviewed** Bikol greeting
   - `asr.language`: no vendor supports Bikol; start with `fil-PH` and have the Daet reviewer test it
   - `tts`: e.g. Microsoft `fil-PH-BlessicaNeural` / `fil-PH-AngeloNeural`; needs a pronunciation check by Teammate 4 before the demo
   - keep `parameters.data_channel` at its default `datastream`: the app reads captions from it
4. Store `{session_id → agent_id, channel, last assistant answer}`.

## 2. `POST /api/voice/sessions/:id/control` — buttons and cards during a call

```json
{ "action": "simpler" }
{ "action": "repeat" }
{ "action": "explain_differently" }
{ "action": "set_topic", "value": "gravity" }
{ "action": "set_difficulty", "value": "normal" }
{ "action": "set_style", "value": "teacher" }
{ "action": "set_language", "value": "tagalog" }
```

Respond `200 {"ok": true}` (or `204`). Suggested implementation with Agora's REST API:

| action | backend does |
|---|---|
| `set_difficulty`, `set_style`, `set_topic`, `simpler` | `POST …/agents/{agentId}/update` with rebuilt `llm.system_messages`, then re-explain (below) |
| `explain_differently` | generate a new explanation with action `explain_differently`, then speak it |
| `repeat` | speak the stored last assistant answer |

"Speak it" = `POST …/agents/{agentId}/speak` `{ "text": …, "priority": "APPEND" }`. The limit is
**512 bytes per call**, so split longer answers by sentence. Because the backend hosts `llm.url`,
it sees every answer the agent gives and can store the last one per session for `repeat`.

## 3. `DELETE /api/voice/sessions/:id` — hang up

Call `POST …/agents/{agentId}/leave`. Respond `200` or `204`. The phone treats this as best effort,
and the agent also leaves by itself after `idle_timeout`.

## 4. LLM endpoint for Agora (`llm.url`)

An OpenAI-compatible `POST /v1/chat/completions` (streaming SSE) that forwards to the **verified**
Quick route (Teammate 2's `route-decision.md`) or the approved, disclosed fallback. Keep answers
short and spoken-style: a 9-year-old is *listening*, not reading. Never let the `provider` returned
in section 1 claim Quick if the fallback answered.

## Errors

Any non-2xx with `{ "error": "readable message" }`. The phone shows a friendly
"call again" screen. Developers see the detail in the dev build.

## Testing without the phone

```bash
curl -X POST http://localhost:3000/api/voice/sessions -H "Content-Type: application/json" -d "{\"topic\":\"melting\",\"question\":null,\"language\":\"bikol_daet\",\"difficulty\":\"simple\",\"style\":\"ate_kuya\"}"
```

Then on the phone set `EXPO_PUBLIC_VOICE_MODE=agora` (and the API URL) in `.env.local` and run the
**dev build**. Agora's native SDK cannot load in Expo Go.
