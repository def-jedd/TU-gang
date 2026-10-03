# Bikol TTS pronunciation test (Agora)

Records what a student would hear when Agora's Conversational AI agent reads Bikol text through the `speak` API.
Uses Agora **managed mode**, so no vendor API keys are needed. Your native speaker uses these recordings to decide whether the Listen button ships.

## How it works

1. A headless Chromium listener joins a fresh RTC channel (mic off), the way the mobile app would.
2. `agora-agents` starts an agent in that channel with the TTS voice under test.
3. The sample text is sent with `session.say()`, split at sentence ends to stay under the 512-byte limit.
4. The listener records the agent's audio until 3 s of silence. Files are saved to `out/` (ignored by git).

```bash
npm install && npx playwright install chromium
npm run record                       # all voices
node record.mjs minimax-2.8-english  # one voice
```

The script reads `AGORA_APP_ID` and `AGORA_APP_CERTIFICATE` from `../../.env.local`, and the sentences from `samples.json` (verbatim from Supabase rows `sample_001`, `003`, `006`, `012`).

## Round 1 (2026-10-03): 3 voices × 4 samples, all recorded

| Voice | Agora config |
|---|---|
| `openai-tts1-nova` | OpenAI `tts-1`, voice `nova` |
| `minimax-2.8-english` | MiniMax `speech-2.8-turbo`, `English_captivating_female1` |
| `minimax-2.8-filipino-boost` | Same, plus `language_boost: "Filipino"` passed through. **Not confirmed** that Agora forwards it. |

Review files: one MP3 per voice (all 4 samples back to back) in the private Supabase Storage bucket `voice-tests/round1/`. Signed links are shared in the team chat.

## Speaker review sheet

Score each voice from 1 (unintelligible) to 5 (natural Daet Bikol).

| Voice | Understandable? (1–5) | Sounds Bikol, not English/Tagalog? (1–5) | Words mispronounced | Use in demo? |
|---|---|---|---|---|
| openai-tts1-nova | | | | |
| minimax-2.8-english | | | | |
| minimax-2.8-filipino-boost | | | | |

**Decision rule:** enable Listen only if a voice gets at least 4 for "understandable" and your speaker is comfortable presenting it. Otherwise ship text-only, or use a clearly labeled recorded native-speaker sample (with permission).

**Round 1 result (2026-10-03):** the team approved both MiniMax voices and did not approve OpenAI `tts-1` nova. The server uses `minimax-english` by default (`VOICE_TTS` in `apps/server/.env.local`).
