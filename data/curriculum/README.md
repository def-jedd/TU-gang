# Curriculum (DepEd Term 1) and saved Amazon Quick answers

Two hand-written data sets the app and tutor read:

| Folder | What | Who fills it |
|---|---|---|
| `data/curriculum/grade-N.json` | Term 1 learning competencies per grade (1–9), all subjects | Team, from the DLLs / Budgets of Work |
| `data/quick_answers/grade-N.json` | Answers written by the Amazon Quick agent for those competencies | Quick teammate, reviewed by Teammate 4 |

Check your work any time (no installs needed):

```bash
python scripts/validate_curriculum.py
```

It reports duplicate ids, missing fields, typos in subject/language/level, and Quick answers that point to a competency that doesn't exist.

## 1. Curriculum entries (`data/curriculum/grade-N.json`)

One entry = one competency the student can learn about (usually one per DLL week per subject).

```json
{
  "id": "g7-science-w1-1",
  "grade": 7,
  "subject": "science",
  "term": 1,
  "week": 1,
  "competency_code": "COPY FROM DLL/BOW, or null",
  "competency": "COPY THE EXACT COMPETENCY TEXT FROM THE DLL/BOW",
  "topic": "melting",
  "title": { "en": "Melting", "tl": "Pagkatunaw", "bik": "Pagtunaw" },
  "student_question": "Why does ice melt?",
  "icon": "snowflake-melt",
  "source": "TeachPinas Grade 7 ILAW DLL, Science, Term 1 Week 1",
  "review_status": "draft"
}
```

| Field | Rule |
|---|---|
| `id` | `g<grade>-<subject>-w<week>-<n>`, unique. Never change it once Quick answers use it. |
| `grade` / `term` / `week` | Numbers. Term is `1` for now. |
| `subject` | One of: `english`, `filipino`, `mathematics`, `science`, `araling_panlipunan`, `mapeh`, `epp_tle`, `gmrc_values`, `makabansa`, `language`, `reading_literacy`. Ask Teammate 1 to add one if the DLL uses another subject. |
| `competency_code` | Exactly as printed, or `null` if the DLL has none. **Never invent a code.** |
| `competency` | Exact DepEd wording (copy, don't paraphrase). |
| `topic` | Short lowercase id with underscores. It becomes the NFC card `TOPIC_<TOPIC>` and the topic picture. Reuse existing ones (`melting`, `gravity`, `photosynthesis`, `friction`, `fractions`) when they match. |
| `title` | What the picture/card says. `bik` and `tl` are drafts until reviewed. |
| `student_question` | The question the tutor answers for this competency, in plain words a child would ask. |
| `icon` | Optional. A [Material Community Icons](https://pictogrammers.com/library/mdi/) name for the picture. |
| `source` | Where you copied it from (DLL file / BOW page). |
| `review_status` | `draft` until a teacher or Teammate 4 checks it, then `reviewed`. |

**Sources:** prefer DepEd's official Budgets of Work for the competency text. TeachPinas / DepEd Club DLLs are third-party: fine to read for the hackathon, but don't copy their whole files into this repo.

## 2. Saved Quick answers (`data/quick_answers/grade-N.json`)

One entry = Quick's answer for one competency in one language at one level.

```json
{
  "competency_id": "g7-science-w1-1",
  "language": "bikol_daet",
  "difficulty": "simple",
  "explanation": "...",
  "example": "...",
  "key_points": ["...", "...", "..."],
  "generated_by": "Amazon Quick: Bikol Tutor agent",
  "generated_at": "2026-10-04",
  "review_status": "draft"
}
```

- `language`: `bikol_daet`, `tagalog` or `english`. `difficulty`: `very_simple`, `simple` or `normal`.
- You don't need every combination. Start with `simple` in all three languages for the competencies you'll demo; the tutor uses Gemini for anything missing (and says so on screen).
- `review_status`: `draft` → `reviewed` once Teammate 4 checks it. Only `reviewed` Bikol answers should be called "speaker-reviewed" in the pitch.

### Getting the JSON out of Quick

Paste this into the Bikol Tutor agent chat in the Quick console, filling in the brackets:

```text
Student question: [student_question from the curriculum entry]
DepEd competency: [competency text]
Grade: [N]. Answer language: [Bikol | Tagalog | English]. Level: [very simple | simple | normal].

Reply with ONLY this JSON, nothing before or after it:
{"explanation": "...", "example": "...", "key_points": ["...", "...", "..."]}
The student will LISTEN to it: use short spoken sentences, no lists or symbols inside the text.
```

Copy Quick's JSON into a new entry, add `competency_id`, `language`, `difficulty`, `generated_by`, `generated_at` and `review_status`, then run the validator.

Honesty rule: the app labels these "Answer written by Amazon Quick (saved)". Never put Gemini or hand-written text in this file.
