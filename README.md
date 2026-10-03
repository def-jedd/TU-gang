# TU-gang

Hackathon plan for a Bikol-first educational tutor. A student asks an open-ended school question, chooses an explanation level and teaching style, and receives a concept-first answer in Bikol with an example and three key points. On-screen learning cards can compose the same request as optional NFC tags.

## Working retrieval prototype

The [command-line prototype](apps/bikol-rag-cli/README.md) is a working copy of the team's existing Ollama CLI. It now indexes the [20 reviewed tutoring examples](data/bikol_examples.json) using their English descriptions and passes selected Bikol responses as teaching-style references. It can generate through local Ollama or Gemini when configured. The original CLI folder on the Desktop is unchanged. Supabase and Amazon Quick are not connected yet.

The [mobile app](apps/mobile/README.md) talks to this same tutor through `apps/bikol-rag-cli/server.py`, which serves the shared contract below. Gemini is the team's chosen model and Ollama the local placeholder; switching is one environment variable ([details](apps/bikol-rag-cli/README.md#choosing-the-model)).

## Team handoffs

| Owner | Guide | First handoff |
|---|---|---|
| Frontend, UI, NFC | [Teammate 1](01_Frontend_UI_and_NFC.md) | Confirm the request and response shape with backend; build the ask and answer flow using a clearly labeled mock. |
| Amazon Quick, tutor behavior | [Teammate 2](02_Amazon_Quick_and_AI_Agent.md) | Verify the account's supported agent invocation or embed route and share evidence with backend. |
| Backend, Supabase, Agora | [Teammate 3](03_Backend_Supabase_and_Agora.md) | Freeze `POST /api/explain`, implement `GET /api/health`, and return honest provider labels. |
| Bikol data, QA, pitch | [Teammate 4](04_Bikol_Dataset_QA_and_Pitch.md) | Share the example schema and first drafts; record native-speaker corrections separately. |

## Shared contract

The app sends a question or selected topic to `POST /api/explain` with `language: "bikol_daet"`, difficulty (`very_simple`, `simple`, `normal`), style (`teacher`, `friend`, `ate_kuya`), and action (`explain`, `explain_differently`). The API returns an explanation, example, three key points, and the provider that actually produced the answer. See the frontend and backend guides for the full JSON.

## First two hours

1. Agree on the API fields, the demo device and network, and the target Bikol variety with the speaker.
2. Build an end-to-end text path with a labeled mock while the Quick owner tests the real integration route.
3. By hour 2, record whether the supported route is backend invocation, a web embed, or a separate Quick demonstration with an approved fallback.
4. Add reviewed language examples as they become available. Keep draft examples labeled as drafts.

The core demo is a working question-to-answer flow. NFC, voice, and semantic retrieval depend on verified device, account, and quality checks described in the guides.
