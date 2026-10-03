# TU-gang — mobile app (UI + NFC)

Expo / React Native app for the Bikol-first adaptive tutor. A student asks any
school question (by typing, tapping a picture, or tapping a physical NFC
card), picks how simple and who explains, and gets a concept-first Bikol
explanation, an example, and three key points.

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
    index.tsx          Home / Ask
    result.tsx         Answer, explain differently, change level/tutor
    cards.tsx          Learning cards: NFC status, tray, on-screen deck
  hooks/useTutor.tsx   app state: draft, request lifecycle, applyCard()
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

`react-native-nfc-manager` is native code, which **Expo Go cannot load**. In
Expo Go (and on web or phones without NFC) the app says so and the on-screen
cards do exactly the same thing. Physical and on-screen cards share one code
path (`applyCard`), so they always produce identical requests.

To test real NFC on an Android phone with NFC:

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
| Explain | `ACTION_EXPLAIN` | sends the request (from any screen) |
| Another way | `ACTION_EXPLAIN_DIFFERENTLY` | re-explains the last answer |
| Start over | `ACTION_RESET` | clears everything |

Codes are case-insensitive and spaces/dashes are tolerated. URI records such
as `tugang://card/TOPIC_GRAVITY` also work. Can't write to a tag? Add its UID
to `UID_TO_CARD` in `src/nfc/cards.ts`.

## Honesty rules this app enforces

- Every answer shows who generated it (`provider`). Mock data is labelled as such.
- **Listen** stays hidden until the voice route passes native-speaker review
  (`EXPO_PUBLIC_ENABLE_LISTEN`).
- The `bik` UI strings and mock Bikol answers are **unreviewed drafts**.
  English is the default UI until our Daet reviewer signs off on `src/i18n/copy.ts`.

See [DESIGN.md](DESIGN.md) for why the UI looks the way it does.
