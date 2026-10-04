# Amazon Quick: TU-gang's orchestration layer (do this before submitting)

The playbook says Quick is the team's *agentic AI orchestration layer: connecting diverse data
sources, automating complex workflows, and synthesizing research*. It is not a feature inside the
app. Missing it costs **−5 points**. Three parts, about 30 minutes in total, all in the Quick
console. Button names below are from the official Quick docs.

All files to upload are in the repo under `data/quick_knowledge/`.

---

## Part 1: the Space (connects our data sources), about 10 min

1. Quick console, left menu: **Spaces**, then **Create space**.
2. **Name:** `TU-gang Knowledge Hub`
3. **Description** (paste):

   ```text
   TU-gang's single source of truth: DepEd's official Term 1 competencies for Grades 1-9
   (Three-Term Budgets of Work, 866 lessons), our native-reviewed Bikol teaching examples, the
   tutor's teaching and quiz rules, and sample AI-written lessons for quality review.
   ```

4. **Add knowledge**, then **File uploads**, and upload these 14 files:

   | File(s) in `data/quick_knowledge/` | What it is |
   |---|---|
   | `curriculum-grade-1.md` … `curriculum-grade-9.md` (9 files) | All 866 DepEd Term 1 competencies |
   | `bikol-examples.md` | 20 native-reviewed Bikol teaching examples |
   | `tutor-guide.md` | Teaching, ILAW and quiz rules |
   | `lesson-samples/*.json` (3 files) | Real AI-written lessons from our server (Bikol, English, Tagalog) |

5. Wait until each file shows **Ready** (or at least **Text ready**).
6. **Test it:** press the sparkle icon (top left) and ask:
   `What are the Grade 3 Science competencies for Week 1?` It should list
   `g3-science-w1-1…` from the curriculum files.
7. 📸 **Screenshot 1:** the Space with its 14 files listed under **Space knowledge**.

## Part 2: Research (synthesizes the evidence for our pain point), about 10 min, mostly waiting

1. Left menu: **Research**, then **New Research**.
2. **Research objective** (paste):

   ```text
   Build the evidence base for TU-gang, a voice-first, Bikol-first AI tutor for Filipino children
   aged 16 and under (Grades 1-9) who read below grade level, starting in Camarines Norte, Bicol
   Region, Philippines. We need verified, citable figures (2019-2026) for a hackathon pitch on:
   (1) learning poverty in the Philippines (World Bank learning poverty estimates); (2) Philippine
   results in PISA 2022 and SEA-PLM 2019 for reading; (3) Republic Act No. 12027 (2024) and the end
   of mother tongue as the main medium of instruction in Kindergarten to Grade 3, and what it means
   for Bikol-speaking learners; (4) DepEd Order No. 16, s. 2026 (ILAW lesson format) and the
   three-term school calendar; (5) shared mobile phone access in low-income Filipino households;
   (6) classroom and teacher shortages in Philippine public schools. For each finding give the
   exact figure, year, publisher and URL. Flag anything uncertain. Use the space
   "TU-gang Knowledge Hub" for our curriculum context.
   ```

3. **Research mode:** **Fast** (about 4–7 min).
4. **Research materials:**
   - turn on **Web search**, and expand it to add preferred websites:
     `worldbank.org, oecd.org, unicef.org, seameo.org, deped.gov.ph, officialgazette.gov.ph, psa.gov.ph, lawphil.net`;
   - **Quick assets**, then **Browse**, then the **Space** tab, select `TU-gang Knowledge Hub`, then **Add**.
5. **Start researching**.
6. When the report is ready, compare its numbers with `docs/PITCH.md` ("The pain point"). Fix
   any figure in the pitch that differs, and use its links as our citations.
7. Download or share the report from its sharing options, and save it as `docs/evidence-report.pdf`.
8. 📸 **Screenshot 2:** the research report's summary with its sources.

## Part 3: a Flow (automates our lesson quality check), about 10 min

AI writes our lessons. This flow is the automated check before a teacher sees them.

1. Left menu: **Flows**, then **Create Flow**.
2. In the prompt field, paste:

   ```text
   Create a flow named "TU-gang Lesson QA". Input: one lesson file (.txt containing JSON) uploaded by the user.
   The file has lesson_id, grade, subject, language, deped_competency, and lesson with
   intentions, 3 steps (each with a check question), a 5-question exam, and ways_forward.
   Each question has 3 choices, an answer index (0, 1 or 2) and a "why".
   Using the space "TU-gang Knowledge Hub" (curriculum files and tutor-guide.md), check:
   1. The lesson teaches only what its DepEd competency says (look up lesson_id in the curriculum).
   2. Every question has exactly ONE correct choice, and the answer index and "why" agree.
   3. Every exam question can be answered from the lesson steps.
   4. Facts are correct for the grade.
   5. The language matches the "language" field; for bikol_daet, wording follows
      bikol-examples.md.
   6. Safe and suitable for children; spoken style (short sentences, no symbols).
   Output a short report: an overall verdict (PASS or NEEDS TEACHER REVIEW), a table with one
   row per question (question number, verdict, problem, suggested fix), and a list of
   competency or language issues.
   ```

3. **Generate Flow**. Check that it has a file-input step, an AI step using the Space, and an
   output step.
4. **Run mode**: upload `data/quick_knowledge/lesson-samples/g3-science-w1-1.bikol_daet.simple.txt`
   and run it. Then try the English and Tagalog samples. Flow file inputs don't accept `.json`,
   so use the `.txt` copies: same content, different extension.
5. **Save**, and share or publish it with the team.
6. 📸 **Screenshot 3:** the flow's steps (builder). 📸 **Screenshot 4:** one run's QA report.

---

## Then, in the submission and pitch

- Keep the Quick bullets in `docs/PITCH.md` → "Strategic integration" that match what you did,
  and delete the bracketed notes.
- Attach or link screenshots 1–4.
- **One sentence for the 2-minute pitch:** "Amazon Quick is our orchestration layer. It
  connects DepEd's 866 official competencies and our native-reviewed Bikol data, researched our
  evidence, and runs an automated QA flow on every AI-written lesson before a teacher sees it."
