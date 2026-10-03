# TU-gang — mobile app (UI + NFC)

Expo / React Native app for the Bikol-first adaptive tutor. **Voice-first**:
our students may not read yet, so learning is a *phone call* with a tutor
(Ate/Kuya, Friend or Teacher). A student taps a picture or a physical NFC
card, or just calls and talks, and the tutor explains the concept in Bikol
out loud. A typed/reading mode remains as a secondary option (**Type**).

## Voice: two engines, one screen

| | Practice voice (`simulated`, default) | Live voice (`agora`) |
|---|---|---|
| Runs in | Expo Go **today** | Dev build only (native Agora SDK) |
| Tutor's words | `/api/explain` (or mock) | Agora agent → our LLM endpoint → Quick / fallback |
| Voice | phone's own speech (fil-PH voice) | Agora TTS |
| Hears the student? | **No**: student steers with buttons/cards | **Yes**: full conversation, interruptible |
| Badge on screen | "Practice voice · not live AI" | "Live voice · Agora" |

Switch with `EXPO_PUBLIC_VOICE_MODE=agora` once the backend implements
[VOICE_CONTRACT.md](VOICE_CONTRACT.md). If the dev build or backend is
missing, the app falls back to practice voice **and says so on screen**.

Owner: UI + NFC (Teammate 1). Backend lives in `apps/server` (Teammate 3).

## Run it (2 minutes)

```bash
cd apps/mobile
npm install
npx expo start
```

Scan the QR code with **Expo Go** (Android) or the Camera app (iOS). With no
backend configured the app uses the built-in **mock**, and every answer is
labelled **"Demo data · not live AI"**.

**Phone stuck on "Loading…" / never opens?** Venue and guest Wi-Fi usually
block devices from reaching each other. Use the tunnel instead (ngrok is
already a dev dependency — no global install needed):

```bash
npm run tunnel
```

Note: the `.env.local` backend URL must also be reachable from the phone —
a laptop LAN IP won't work on guest Wi-Fi either; use the backend's deployed
URL or a phone hotspot for both devices.

Other scripts: `npm test` (card → JSON tests), `npm run typecheck`,
`npm run web` (quick layout checks in a browser).

## Connect to the backend

1. `cp .env.example .env.local`
2. Set `EXPO_PUBLIC_API_BASE_URL=http://<laptop-LAN-IP>:<port>` — **not**
   `localhost`; the phone is a different device. Phone and laptop must be on
   the same Wi-Fi (hotspot works well at venues).
3. Restart `npx expo start` (env vars are read at bundle time).

In dev builds the bottom of the Home screen shows which backend is in use and
whether `GET /api/health` answers.

## API contract (frozen — change only together with the backend)

Types: [`src/types/tutor.ts`](src/types/tutor.ts).

```http
POST /api/explain
```

```json
{
  "question": "Why does ice melt?",
  "topic": "melting",
  "language": "bikol_daet",
  "difficulty": "very_simple",
  "style": "ate_kuya",
  "action": "explain"
}
```

- `topic` is `null` for typed questions; set when a topic card/picture is used.
- `action` is `explain` or `explain_differently`.
- Response: `request_id, topic, language, explanation, example, key_points[], source_ids[], provider`.
  `example`, `key_points`, `source_ids` may be empty. `provider` must be
  `quick` | `approved_fallback` | `mock`; the UI shows it on every answer.
- Errors: any non-2xx with `{ "error": "readable message" }`.

## Rehearsal hooks (mock only)

Put these words in a question:

| Type… | Result |
|---|---|
| `test slow` | answers after 12 s — shows the "still thinking" message + Stop |
| `test error` | fails like a dropped connection — shows error + Try again |

## Code map

```text
src/
  app/                 screens (Expo Router)
    index.tsx          Home (voice-first): tutor, level, topic pictures, Call
    call.tsx           The call: avatar + turn phases, controls, captions
    ask.tsx            Type mode (secondary): typed question → result
    result.tsx         Answer (reading mode), explain differently
    cards.tsx          Learning cards: NFC status, tray, on-screen deck
  hooks/useTutor.tsx   app state: draft, request lifecycle, applyCard()
  voice/
    VoiceProvider.tsx  the active call; cards steer it; haptic "your turn"
    agoraAgent.native.ts  live Agora agent (dev build)
    simulatedAgent.ts  practice voice (Expo Go)
    agoraMessages.ts   caption parser for the agent's data stream (tested)
    voiceApi.ts        /api/voice/sessions client (see VOICE_CONTRACT.md)
  nfc/
    cardReducer.ts     ONE reducer for cards + buttons (pure, unit-tested)
    cards.ts           card faces: codes, icons, labels
    NfcProvider.tsx    app-wide NFC listener → applyCard()
    reader.native.ts   react-native-nfc-manager (dev build only)
    reader.ts          web / fallback stub
  services/            api.ts (fetch + timeout), mockTutor.ts, config.ts
  i18n/copy.ts         all UI text, EN + DRAFT Bikol
  theme/tokens.ts      colours, type, spacing
```

## NFC

### Why it needs a development build

`react-native-nfc-manager` **and `react-native-agora`** are native code, which **Expo Go cannot load**. In
Expo Go (and on web or phones without NFC) the app says so and the on-screen
cards do exactly the same thing. Physical and on-screen cards share one code
path (`applyCard`), so they always produce identical requests.

To test real NFC and live Agora voice on an Android phone:

```bash
# Option A — local build (Android Studio + SDK installed, phone on USB with USB debugging)
npx expo run:android

# Option B — cloud build (Expo account)
npx eas-cli build --profile development --platform android
```

Then run `npx expo start` and open the project from the installed
**TU-gang** dev app instead of Expo Go. Android reads cards continuously while
the app is open; on iOS, press **Scan a card** first (system sheet).

### Making the physical cards

1. Buy NTAG213/215 stickers or cards (any phone-compatible NFC tag).
2. Install **NFC Tools** (free, Android/iOS) → *Write* → *Add a record* →
   **Text** → type the code exactly, e.g. `TOPIC_MELTING` → *Write* → tap the tag.
3. Print the matching card face (same colour + icon as the app) and stick
   the tag behind it.

| Card | Code to write | Effect |
|---|---|---|
| Photosynthesis | `TOPIC_PHOTOSYNTHESIS` | topic + question |
| Gravity | `TOPIC_GRAVITY` | topic + question |
| Melting | `TOPIC_MELTING` | topic + question |
| Friction | `TOPIC_FRICTION` | topic + question |
| Fractions | `TOPIC_FRACTIONS` | topic + question |
| *any new topic* | `TOPIC_<NAME>` e.g. `TOPIC_VOLCANOES` | works without an app update |
| Very simple / Simple / Normal | `MODE_VERY_SIMPLE` / `MODE_SIMPLE` / `MODE_NORMAL` | difficulty |
| Teacher / Friend / Ate-Kuya | `STYLE_TEACHER` / `STYLE_FRIEND` / `STYLE_ATE_KUYA` | tutor tone |
| Bikol · Daet | `LANG_BIKOL_DAET` | language |
| Explain | `ACTION_EXPLAIN` | starts a call about the chosen cards (from any screen) |
| Another way | `ACTION_EXPLAIN_DIFFERENTLY` | re-explains the last answer |
| Start over | `ACTION_RESET` | clears everything (ends the call) |

**During a call, cards steer the tutor:** a topic card switches topic, a
level card re-explains at that level, a tutor card changes the tone,
`ACTION_EXPLAIN` repeats, `ACTION_RESET` hangs up.

Codes are case-insensitive and spaces/dashes are tolerated. URI records such
as `tugang://card/TOPIC_GRAVITY` also work. Can't write to a tag? Add its UID
to `UID_TO_CARD` in `src/nfc/cards.ts`.

## Honesty rules this app enforces

- Every answer shows who generated it (`provider`). Mock data is labelled as such.
- Calls always show which voice is talking: practice voice is never presented as live AI.
- **Listen** on the reading screen stays hidden until the voice route passes
  native-speaker review (`EXPO_PUBLIC_ENABLE_LISTEN`).
- The `bik` UI strings and mock Bikol answers are **unreviewed drafts**.
  English is the default UI until our Daet reviewer signs off on `src/i18n/copy.ts`.

See [DESIGN.md](DESIGN.md) for why the UI looks the way it does.
