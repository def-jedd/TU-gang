# Quick route decision

Date decided: 2026-10-04
Decided with: Teammate 3 (backend)

## Chosen route
[x] C. Quick standalone + disclosed fallback generator

## Why
- No documented Quick API that returns text to a server (docs search 2026-10-04; Teammate 3 backend check)
- Embed needs QuickSight embedding APIs + domain allow-listing; our standalone account has no Manage domains and no Share via embed
- An embed would give a web chat window, not text for the app or Agora voice

## Evidence
- Can create custom chat agent: YES (Bikol Tutor; screenshot)
- Can add instructions: YES
- Can link knowledge source: YES
- Role: Owner, 1 active user
- Plan: Free Trial, 30 days left, $0.00
- Share dialog: user/group sharing and Copy link only

## Who generates what
- Quick console: "Amazon Quick agent" demo only. Never shown inside the app.
- App answers and Agora voice text: Gemini Flash, provider = "approved_fallback"
- mock: rehearsals only, never in the real demo

## Fallback approval
Status: PENDING
Organizer / channel / date:
Organizer's reply (quote):
Until approved: provider stays "mock".

## Revisit if organizers give API or embed access.

## Secrets: .env only, never in Git.