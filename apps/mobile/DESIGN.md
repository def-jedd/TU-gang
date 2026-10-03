# Design rationale — UI & NFC

Who we design for: Filipino learners aged 16 and under who cannot yet read
independently or read at frustration level, in Bikol-speaking Daet /
Camarines Norte. Every decision below traces back to that user and to the
research in our project brief.

| Research | What it says (short) | Where it shows up in the app |
|---|---|---|
| **Cognitive Load Theory** (Sweller, 1988) | A struggling reader spends working memory on decoding letters, leaving little for the concept. | Every choice is **icon + colour + one or two words**. Topic **pictures** let a student ask without typing. One primary button per screen, pinned within thumb reach. Answers are split into short paragraphs, an example box and **three** numbered points — never a wall of text. |
| **Tangible User Interfaces** (Ishii & Ullmer, 1997) | Physical objects can carry digital meaning and offload the interface. | NFC cards compose a request like words in a sentence: **WHAT** (topic) · **HOW SIMPLE** (level) · **WHO** (tutor) — shown as a three-slot tray. Each on-screen card is the **exact twin** of the printed card (same colour, icon, words) so recognition transfers both ways. Haptic tap feedback confirms a card "landed". |
| **Affective Filter Hypothesis** (Krashen, 1982) | Anxiety blocks acquisition; a friendly, low-stakes context lowers the filter. | Default tutor is **Ate/Kuya** (shown as *Manay/Manoy* in Bikol mode). Errors use warm amber, not alarm red, and say "Let's try again" — the student is never blamed. **Explain differently** is a big, no-penalty button: not understanding is normal. |
| **Universal Design for Learning** (CAST) | Offer multiple means of representation and of action/expression. | Three ways to ask (type, tap a picture, tap a physical card). **A− / A+** reading size on answers, plus respect for the phone's own font-size setting. Choices never rely on colour alone (always icon + label + check mark). A slot for **Listen** is built in, switched on only once the voice route is verified. |
| **Linguistic Interdependence** (Cummins, 1979) | Concepts learned in L1 transfer to L2. | Explanations are in Bikol, but topic cards keep the **English academic term** ("Photosynthesis") with an everyday hint underneath, bridging home language and the language of the textbook and exam. |
| **ACTRC MTB-MLE findings** | Mother-tongue education struggled for lack of localised materials. | Language is labelled precisely as **Bikol · Daet** — not "Bikol" — and all UI Bikol is kept in one reviewable file so the local speaker can correct it in minutes. |

## Typography

- **Andika** (SIL International) for everything the student reads. It was
  designed for beginning readers: single-storey *a* and *g* (as children
  write them), clearly different *I / l / 1*, generous spacing.
- **Fredoka** for headings and labels: rounded and friendly, never used for
  long text.
- Answer text is 22 px with 1.55 line height; nothing a student must read is
  under 15 px.

## Colour

Warm paper background (less glare than pure white outdoors), sea-teal primary,
sun-yellow accent. Each card family has its own colour, used identically on
screen and on the printed cards: **green** topics, **blue** levels, **orange**
tutors, **teal** actions, **purple** language. All text pairs meet WCAG AA.

## Honesty is part of the UX

A child cannot judge whether an answer is trustworthy, so the interface must
not overstate it. Every answer shows its source (`Amazon Quick`, `backup
tutor`, or `Demo data · not live AI`), and features that aren't verified
(voice, real NFC in Expo Go) are hidden or explained rather than faked.
