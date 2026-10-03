# Term 1 import notes (Grades 1–9)

`grade-1.json` … `grade-9.json` hold **866 First Term competencies** from DepEd's official Three-Term Budgets of Work (BOW):
<https://sites.google.com/deped.gov.ph/lsguide/budgets-of-work> (public PDFs, one per grade and subject).

## What's exact and what's ours

| Field | Origin |
|---|---|
| `competency` | **Copied word for word** from the BOW, including sub-items (`a.`, `○`) on their own lines |
| `week`, `source` | From the BOW. Weeks given as a range ("Weeks 3–5") use the first week in `week`; the full range and PDF page are in `source` |
| `competency_code` | `null`: the three-term BOWs print no codes |
| `topic`, `title.en`, `student_question`, `icon` | Written by us for the app. Entries with the same competency share them. `review_status` is `draft` |
| `title.tl`, `title.bik` | Left empty for Teammate 4 |

## Not included (no week numbers in the BOW)

The schema needs a week (1–14), and these BOWs don't give one, so they're left out rather than guessed:
- **Filipino, Grades 2–9:** competency grid only, with no weekly breakdown.
- **MAPEH, Grades 4–9:** weeks are printed as `*`.
- **Grades 9–10 TLE specializations** (20 tracks such as Computer Programming and Food Service): these are per-track, not tied to Term 1.

## Partial by design

- **English (Grades 2–9), Language and Reading and Literacy (Grade 1):** the BOW only gives a *sample clustering for the first five weeks of Term 1*, so weeks 1–5 are included. Grades 7–9 English list competencies only for Week 1 (Weeks 2–5 are planning options).
- Competencies repeat across weeks where the BOW repeats them (spiral curriculum, e.g. Grade 1 Reading and Literacy).
- Formatting quirks are kept as printed, e.g. Grade 4 English Week 1 lists "Identifying type of plot:" as a top-level bullet.

## Re-running

```bash
pip install pdfplumber
python scripts/extract_bow_term1.py path/to/*.pdf > term1.json   # exact text, by week and heading
python scripts/validate_curriculum.py
```

The extractor reads each table cell separately, so week numbers and neighbouring columns never mix into the competency text. Every extracted competency was also checked against the PDF's own text.

## ⚠ Keep the order: append only

Student progress on NFC profile cards is stored as **bitsets over each grade's entry order**
(`apps/mobile/src/profiles/profileCard.ts`). Reordering or deleting entries would move
students' progress onto the wrong lessons. Add new entries at the **end** of a grade file,
then rebuild the app's copy:

```bash
python scripts/build_mobile_curriculum.py
```
