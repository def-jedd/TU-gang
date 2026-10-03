# Teammate 1 — Frontend, UI/UX, and NFC

**Project:** Bikol-first, adaptive educational tutor  
**Your mission:** Build a polished, usable learning experience that works with mock data immediately and the real backend as soon as it is ready.

## 1. What we are building

A student asks an open-ended school question and receives a **concept-first explanation in Bikol**, with a relatable example and short key points. The student can change the explanation level or teaching tone. Our deeply validated demonstration language is the Bikol variety reviewed by our Daet/Camarines Norte speaker; other languages, if any, are clearly labeled experimental.

NFC is an **optional physical learning input**, not merely a tag that opens a webpage. A tag such as `TOPIC_PHOTOSYNTHESIS` selects a topic; `MODE_SIMPLE` changes the difficulty; `ACTION_EXPLAIN` submits the composed learning request. The same actions must work as on-screen buttons when NFC is unavailable.

## 2. Your stack

| Purpose | Choice |
|---|---|
| Mobile application | React Native + Expo + TypeScript |
| Navigation | Expo Router or simple screen state; choose one at kickoff |
| UI styling | React Native `StyleSheet`, reusable design tokens/components |
| Networking | Built-in `fetch` to our Express backend |
| NFC, **stretch goal** | `react-native-nfc-manager`, only after confirming a working development build |
| Icons | An Expo-compatible icon package |
| Design | Figma or quick hand-drawn wireframes before implementation |

**NFC limitation:** `react-native-nfc-manager` is **not available in Expo Go** because it requires native code. Use an Expo development build on a real, supported phone. If that takes too long, demo physical input with the on-screen card simulator and show real NFC only if verified. See https://github.com/revtel/react-native-nfc-manager/wiki/Expo-Go.

## 3. Own these screens

1. **Home / Ask:** app title; question field; optional example prompts; "Ask tutor" button.
2. **Personalization:** difficulty (`very_simple`, `simple`, `normal`); tone (`teacher`, `friend`, `ate_kuya`); Bikol language label.
3. **Answer:** explanation first and most visible; separate example; 3 key points; `Explain differently` and optional `Listen`.
4. **Learning cards:** show current selections made from NFC or matching on-screen cards; "Explain" or optional "Start quiz" action.
5. **Loading/error states:** slow responses must not freeze the UI. Provide retry and a readable error.

### Suggested visual hierarchy

```text
[ BI KOL TUTOR ]                [Language: Bikol - Daet]

What do you want to learn?
[ Ask any school question...                        ]

Difficulty:  [ Very simple ] [ Simple ] [ Normal ]
Teaching:    [ Teacher ] [ Friend ] [ Ate/Kuya ]

              [ Explain to me ]

────────────────── ANSWER ─────────────────────────
Explanation (large, readable body)

Example (clear supporting section)

Key points (1, 2, 3)

[ Explain differently ]        [ Listen (if ready) ]
```

Keep the design **student-friendly and readable**, not a decorative AI dashboard. Test small-screen readability and long answers. Never claim a button works when its feature is unavailable.

## 4. The shared API contract — freeze this in the first hour

Send:

```http
POST /api/explain
Content-Type: application/json
```

```json
{
  "question": "Explain photosynthesis",
  "topic": "photosynthesis",
  "language": "bikol_daet",
  "difficulty": "simple",
  "style": "ate_kuya",
  "action": "explain"
}
```

`topic` is optional for free-text questions; it is filled in when an NFC topic card is tapped. An `action` of `explain_differently` can reuse the same endpoint. Do not hardcode school topics as the only permissible questions.

Receive:

```json
{
  "request_id": "demo-001",
  "topic": "photosynthesis",
  "language": "bikol_daet",
  "explanation": "Bikol explanation goes here...",
  "example": "Bikol example goes here...",
  "key_points": ["...", "...", "..."],
  "source_ids": ["sample_001"],
  "provider": "quick"
}
```

`provider` may be `quick`, `approved_fallback`, or `mock`. Display `mock` only in development/demo rehearsals, never disguise it as a live AI response. `source_ids` may be empty; do not make the UI depend on citations being present.

## 5. Recommended frontend structure

```text
apps/mobile/
  app/
    index.tsx
    result.tsx
    cards.tsx
  src/
    components/
      QuestionInput.tsx
      DifficultySelector.tsx
      TeachingStyleSelector.tsx
      AnswerView.tsx
      LearningCard.tsx
    services/
      api.ts
      mockTutor.ts
    hooks/
      useTutor.ts
    nfc/
      cardReducer.ts
      reader.ts            # only if development build is ready
    theme/
      tokens.ts
    types/
      tutor.ts
```

The `cardReducer` should work without a real NFC phone:

```ts
type CardAction =
  | { type: 'TOPIC'; value: string }
  | { type: 'DIFFICULTY'; value: 'very_simple' | 'simple' | 'normal' }
  | { type: 'LANGUAGE'; value: 'bikol_daet' }
  | { type: 'SUBMIT' };
```

**Example:** tap/select `TOPIC_PHOTOSYNTHESIS`, `MODE_SIMPLE`, `ACTION_EXPLAIN`; the UI forms the same request as typing the question. If adding NFC quiz answers, only implement them once a working quiz exists.

## 6. Your 24-hour timeline

| Hours | Deliverable |
|---|---|
| 0–2 | Agree on API JSON; sketch screens; initialize Expo/TypeScript; create theme and mock response |
| 2–5 | Working Ask, settings, Answer, loading and error states using `mockTutor.ts` |
| 5–9 | Connect `api.ts` to Teammate 3; test real request/response; fix long-text layouts |
| 9–14 | Add "Explain differently"; learning-card simulator; improve accessibility |
| 14–19 | **Only if core works:** NFC real-device test and/or voice `Listen` control with backend-approved voice route |
| 19–24 | Freeze features; test on demo phone; record backup screen demo; fix issues |

## 7. Handoffs and dependencies

- **To Teammate 3 (backend):** send the exact request/response types in hour 1. Use a configurable `API_BASE_URL`; do **not** put Supabase service keys, Quick credentials, or Agora secrets in the mobile app.
- **To Teammate 2 (AI):** share real UI inputs (`difficulty`, `style`, `action`) so the prompt actually reacts to every control.
- **To Teammate 4 (dataset/demo):** request short, reviewed sample responses that fit the UI; share screenshots for pitch deck.
- **If the Quick integration is blocked:** keep frontend working against the backend's approved fallback or explicitly labeled mock. Quick's documented website embed is **not** proof of a direct mobile JSON API.

## 8. Your definition of done

- [ ] Student can ask an arbitrary question (not a fixed FAQ).
- [ ] Student can choose difficulty and style and those values reach the backend.
- [ ] Explanation, example, and key points are clearly distinguished.
- [ ] Loading, error, retry, and long Bikol responses work on the demo device.
- [ ] NFC/card-simulator selections produce exactly the agreed JSON.
- [ ] Optional features do not block the working question-to-answer flow.
- [ ] No fake live-AI or fake live-TTS claims in the demo.

**Commit frequently:** Suggested branch `feat/mobile-ui`; open a PR after the first working mock flow, not only at the end.
