# Quick route decision

Date decided: 2026-10-04
Decided with: Teammate 3 (backend)

## Chosen route
C. Quick standalone demonstration + disclosed fallback generator for the app.

## Why
- No documented Quick API returns text to a server on our standalone account.
- The embed route needs domain allow-listing that our account does not offer,
  and it would give a web chat window, not text for the app or Agora voice.

## Organizer approval
Status: APPROVED
Organizer: [name]
Channel: [where they replied]
Date: [date]
Their words: "[exact quote]"
Summary: Quick is shown separately and is not wired into the app.
Gemini generates the app's answers as the approved fallback.

## Who generates what
- Quick console: "Amazon Quick agent" demo only. Never shown inside the app.
- App answers and any Agora voice text: Gemini. API field provider = "gemini".
- mock: rehearsals only. Never in the real demo.

## Quick account facts (fill from your console)
- Custom chat agent "Bikol Tutor" created: yes/no
- Role / plan: [e.g. Owner, Free Trial, ~30 days left]
- "Launch chat agent" clickable after saving: yes/no

## Revisit if organizers give API or embed access.
## Secrets live in .env only, never in Git.