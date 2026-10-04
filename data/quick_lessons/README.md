# Lessons checked by Amazon Quick

One file per lesson, language and level: `<lesson_id>.<language>.<difficulty>.json`.
The server serves these **before** Gemini drafts, and the app shows
**"Checked by Amazon Quick"** on them.

Each lesson here was drafted by Gemini from the official DepEd competency, then checked and
corrected by the Amazon Quick "Bikol Tutor" agent (`generated_by` says so). Only put files here
with `npm run quick:import`. Never hand-write or simulate them: the app labels them as Quick's work.

## Workflow (run in `apps/server`)

1. `npm run quick:export -- 3 bikol_daet simple --subject science --limit 10`
   writes `data/quick_review/grade-3.bikol_daet.simple.md` (git-ignored).
2. Open that file. In the Quick console, open the Bikol Tutor agent, paste **MESSAGE 0** once,
   then each **LESSON** message one at a time.
3. Paste each of Quick's replies at the end of `data/quick_review/replies.txt`.
4. `npm run quick:import` validates the replies and saves them here. Commit the new files.

Options for export: `--subject <name>`, `--limit <n>` (default 10), `--ids id1,id2`.
