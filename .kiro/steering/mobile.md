---
inclusion: fileMatch
fileMatchPattern: "apps/mobile/**"
---

# Mobile app (`apps/mobile`) — how to work here

Current status, decisions and next tasks: #[[file:apps/mobile/HANDOFF.md]]

## Stack

Expo SDK 57, React Native 0.86, React 19.2 with the **React Compiler enabled**, TypeScript 6,
Expo Router with routes in `src/app/`. Path alias `@/` → `src/`.

## Where things live

- Screens: `src/app/index.tsx` (voice home), `call.tsx`, `cards.tsx`, `ask.tsx` (type mode), `result.tsx`.
- State: `src/hooks/useTutor.tsx` (draft + text requests), `src/voice/VoiceProvider.tsx` (the call),
  `src/nfc/NfcProvider.tsx` (app-wide NFC listener).
- **All card/button input goes through `src/nfc/cardReducer.ts`.** Never build request JSON anywhere else.
- Voice engines implement `VoiceAgent` (`src/voice/types.ts`): `simulatedAgent.ts` (practice voice,
  Expo Go) and `agoraAgent.native.ts` (live Agora, dev build). Pick via `createVoiceAgent.ts`.
- UI text: only in `src/i18n/copy.ts` (EN + draft Bikol). Card labels: `src/nfc/cards.ts`.
- Styling: tokens in `src/theme/tokens.ts`; no raw hex in components. Text via `AppText`, icons via
  `Icon` (MaterialCommunityIcons only; the `IconName` type catches invalid names), buttons via `Button`.

## Rules

- **Voice-first audience who can't read:** every new control needs an icon + short label, a ≥56 dp
  target, and (on voice screens) a spoken label (`speakLabel`) or `SpeakableTitle`.
- **Native modules** (`react-native-nfc-manager`, `react-native-agora`) must stay lazily required
  behind an Expo Go check, with a `.native.ts` / `.ts` platform split, so Expo Go and web never crash.
- **React Compiler:** no reading/writing refs during render; sync refs in `useEffect`. No side
  effects inside `setState` updaters.
- **Hermes:** no regex lookbehind; don't rely on `TextDecoder`.
- Keep pure logic (reducers, parsers) dependency-free with type-only imports so `node --test` runs it.

## Verify before committing

```powershell
npm run typecheck
npm test
npx expo export --platform android --output-dir $env:TEMP\tugang-export   # native bundle compiles
```

Run commands with `npx expo …` or `npm run …` (never `npm expo …`). On guest Wi-Fi use
`npm run tunnel`. Don't add an EAS `projectId` casually: Expo then signs the dev manifest with
that account, so re-check that teammates can still open the app in Expo Go without logging in.
