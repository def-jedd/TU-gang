# Quick route decision

Date decided: 2026-10-04 (updated after organizers' reply)
Decided with: Teammate 3 (backend); updated by Teammate 1 (mobile)

## Chosen route (final)
[x] C. Quick standalone + disclosed fallback generator

Embedding (route B) is closed: organizers cannot provide a Pro/Enterprise
Quick account.

## Why
- No Quick API returns text to a server. The only programmatic route is
  embedded chat (`GenerateEmbedUrlForRegisteredUser` with `QuickChat`), and it
  needs ALL of:
  - Professional or Enterprise Quick licensing (we have a Free Trial)
  - every viewer to be a registered Quick user who signs in (students can't)
  - the host domain allow-listed under Security > Manage domains (absent on
    our account)
- Even embedded, it is a text chat window: it can't feed the voice-first app
  or the Agora voice.

Sources: "Announcing embedded chat in Amazon Quick Suite" (AWS BI blog);
GenerateEmbedUrlForRegisteredUser API reference.

## Evidence
- Can create custom chat agent: YES (Bikol Tutor; screenshot)
- Can add instructions: YES
- Can link knowledge source: YES
- Role: Owner, 1 active user
- Plan: Free Trial, 30 days left, $0.00
- Share dialog: user/group sharing and Copy link only
- Organizers: no Pro/Enterprise account available (2026-10-04)

## Who generates what
- Quick console: "Amazon Quick agent" demo only. Never shown inside the app.
- App answers + Agora voice: Gemini (`gemini-3.5-flash-lite`) via
  apps/bikol-rag-cli, forwarded by apps/server. The app badge names it:
  "Answered by Gemini AI".
- mock: rehearsals only, labelled "Demo data", never in the real demo.

## Same teaching material in both
- Quick agent setup = `ai/quick-agent/SETUP.md` (ILAW lessons + quizzes, like the app)
- Quick reference documents = `data/quick_knowledge/` (tutor guide, the native-reviewed Bikol
  examples, the demo grade's curriculum); Space = all 9 grades' DepEd Term 1 curriculum
  (`python scripts/export_quick_knowledge.py`)
- App = the same 20 reviewed examples via retrieval + the same rules
  (concept-first, examples are style not facts, say when unsure).

## Side-by-side demo plan (about 90 s)
1. Laptop: Quick console with the Bikol Tutor agent open. Phone: TU-gang
   (dev build), same hotspot as the laptop running both servers.
2. Ask the same question in both, e.g. "Why does ice melt?"
   - Quick: type it in the console chat.
   - App: tap the Melting NFC card. The tutor answers aloud with the Agora voice.
3. Say it plainly: "Amazon Quick is our agent workspace, grounded in our
   speaker-reviewed Bikol examples. Quick has no API our app can call, so the
   phone uses the same examples and rules with Gemini, and the badge says so."
4. Point at what only the app does: voice-first, NFC cards, level/tutor/
   language (Bikol, Tagalog, English) for students who can't read.
5. Backup: screen recording of both, in case the venue network fails.

Rehearse with 2-3 fixed questions. Don't claim the answers are identical.
Different models will phrase them differently, and that's fine to say.

## Fallback approval
Status: PENDING
Organizer / channel / date:
Organizer's reply (quote):
Until approved: say "fallback model (Gemini)" in the pitch. The app never
labels Gemini answers as Quick.

## Revisit if organizers later provide API or embed access (Pro/Enterprise +
Manage domains). Then a judges-only "Ask Amazon Quick" embed page on
apps/server is possible.

## Secrets: .env only, never in Git.
