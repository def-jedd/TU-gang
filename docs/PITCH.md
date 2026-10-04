# TU-gang: pitch details

**Project name:** TU-gang (Bikol: *tugang* = sibling)
**Track:** Shift to Lean OpenLearning (Lean Educational Technology)
**Project overview:** A voice-first, Bikol-first tutor for children aged 16 and under who can't
read well yet. It runs on one shared Android phone. Children log in by tapping an NFC card that
also holds their progress. They talk with an AI tutor and work through all 866 DepEd Term 1
lessons in the ILAW format, with quizzes, in Bikol, Tagalog or English.
**One line:** TU-gang is a voice-first Bikol tutor on one shared phone. A child who can't read yet
taps a picture card, listens, talks back, and passes DepEd lessons. The NFC card in their pocket is
their save file.

> ⚠ Before pitching, open each source below and confirm the exact figure and year.
> Say "about" if unsure. Judges in the education domain may know these numbers.

## Target market

Our first users are Bikol-speaking children aged 16 and under in Grades 1 to 9 who read below grade
level. We start in Daet, Camarines Norte, the variety our native reviewer speaks. These children
live in low-income households where one phone is shared by several siblings, and they attend
underfunded public schools where one teacher covers a crowded or multigrade class. The people who
put TU-gang in their hands are their facilitators: a parent, an ate or kuya, or a teacher who hands
out cards in class. The organizations that would fund and deploy it are DepEd schools division
offices, local government units, literacy NGOs and community learning centers. Bikol is only the
first step. The same app already offers Tagalog and English, and the design carries over to any
Philippine language with a speaker who can review examples.

## The pain point (evidence)

Filipino children are not learning to read, and the children we target fall even further behind
because they are taught in a language they don't speak at home.
- The World Bank estimates that about nine in ten Filipino 10-year-olds are in "learning poverty",
  unable to read and understand a simple age-appropriate text (World Bank, learning poverty
  update, 2022).
- In PISA 2022, Filipino 15-year-olds scored among the lowest of all participating countries in
  reading, mathematics and science (OECD, PISA 2022 results).
- In the SEA-PLM 2019 regional assessment, only about one in ten Filipino Grade 5 pupils reached
  the expected minimum reading level (UNICEF/SEAMEO, SEA-PLM 2019).
- Republic Act No. 12027 (2024) ended the mother tongue as the main language of instruction in
  Kindergarten to Grade 3, so a Bikol-speaking child now meets school concepts in Filipino and
  English.

Most learning apps make this worse: they assume the child can read, can type a password, has
their own device, and is always online. A struggling reader in a shared-phone household gets
nothing from a text-heavy app with an email login.

## The how (solution)

TU-gang turns the curriculum into a conversation the child can hear and answer:

- **Voice first.** The child taps a picture card, a topic tile or the big call button and talks to
  a friendly tutor. They choose an ate or kuya, a teacher or a friend, in Bikol, Tagalog or
  English. The tutor listens hands-free and answers aloud.
- **Guided DepEd lessons.** We loaded all 866 official Term 1 competencies for Grades 1 to 9 from
  DepEd's Budgets of Work. Each lesson follows DepEd's new ILAW format:
  - **Intentions:** what the child will be able to do today.
  - **Learning:** short spoken steps, each with an A/B/C quick check.
  - **Assessment:** a five-question quiz.
  - **Ways forward:** a recap and the next lesson.
  Every part is read aloud, and the child answers with big lettered buttons.
- **Two progress tracks.** The app records lessons *read* and quizzes *passed*. Passing means 75%,
  DepEd's passing mark.
- **The card is the save file.** Progress is stored on a cheap NTAG213 NFC card or sticker, not
  in an account. Several children share one phone: each taps their own card to log in, and can
  carry their progress to another phone with no internet, no password and no server.
- **Grounded Bikol.** Answers are grounded in speaker-reviewed Bikol teaching examples, so the
  tutor re-teaches the idea in natural local speech instead of translating word for word.
- **Honesty built in.** Every answer is labelled with the AI that produced it, and AI-written
  lessons are marked as drafts until a teacher reviews them.

## Strategic integration

> Playbook definitions: **Kiro** is the primary development environment (spec-driven
> development, parallel agents). **Amazon Quick** is the team's agentic AI orchestration layer
> (connecting data sources, automating workflows, synthesizing research). The submission also
> asks how **AWS infrastructure** was used. Keep only sentences that are true when you submit:
> judges check the repo.

**Kiro: how we built it.** Kiro was our development environment for the backend, driven by
steering files that hold the project rules and mobile conventions (`.kiro/steering/`).
- Working from specs, the Kiro agent built the Supabase schema for the native-reviewed Bikol
  dataset, the retrieval function and embedding Edge Functions, and the Express server that
  starts Agora voice agents.
- It also built the voice test page and the health checks that report when the tutor is down.
- Its commits are in the repository under "Kiro Agent", so the work is visible and checkable.
- *[If true, add: which parts ran as parallel Kiro agents, and any Kiro specs for the next
  milestones.]*

**Amazon Quick: how we orchestrated the work.** Quick is where our content and research come
together, not a chatbot inside the app.
- **Connected data sources:** the Quick Space `TU-gang Knowledge Hub` links DepEd's official Term 1 Budgets of Work
  (866 competencies, `data/quick_knowledge/curriculum-grade-*.md`), our native-reviewed Bikol
  dataset, and the tutor's teaching and quiz rules.
- **Synthesized research:** Quick Research gathered the evidence for our pain point (learning
  poverty, PISA 2022, SEA-PLM 2019, RA 12027) with sources.
- **Automated a workflow:** the Quick flow `TU-gang Lesson QA` takes an AI-written lesson from
  our server and checks it against the DepEd competency in the Knowledge Hub and our quiz rules:
  - the lesson teaches only its competency;
  - each question has exactly one right answer, and the answer key matches;
  - every quiz question can be answered from the lesson;
  - the facts and the language are right.
  It returns PASS or NEEDS TEACHER REVIEW, with a suggested fix per question. Teachers review
  only what the flow flags, instead of every lesson. That keeps quality control lean as we grow
  to all 866 lessons.

**AWS infrastructure: how it runs.** *[Fill in what is actually deployed. The lean target:]*
- The API server (one small Node service) on a single small AWS instance, such as Lightsail
  or App Runner.
- Generated lessons cached in Amazon S3 and served to every school, so each lesson's AI cost
  is paid once.
- *[If not deployed by submission, say plainly: "Runs today on one laptop on the classroom
  Wi-Fi; designed to move to one small AWS instance + S3."]*

**Why each other piece is there (technology judgment):**
- **Agora Conversational AI** for live voice only, because hearing and speaking is the
  interface for children who can't read.
- **Gemini 3.5 Flash-Lite**, a small, inexpensive model, writes answers and lessons. We don't
  just wrap a big API: every lesson is written once, checked by a second "strict teacher" pass,
  cached, and reused by every child. Repeat use costs nothing.
- **Swappable model:** the text tutor also runs on a local open model (Ollama), the path to an
  offline school hub.
- **The NFC card instead of accounts:** no passwords, no student database, nothing for a
  school without IT staff to manage. A whole grade of progress fits on a cheap NTAG213 sticker.
- **DepEd ILAW + official competencies** instead of free-form chat, so lessons fit how
  teachers already plan.

## Sustainability and growth

TU-gang is lean by design.

- **Per child:** an NFC card that costs a few pesos and an existing family phone.
- **Per school:** no accounts to manage and no database of minors to protect.
- **Per lesson:** the AI cost is paid once, because generated lessons are cached and shared.
- **Content gets better as it grows.** Teacher-reviewed lessons replace drafts and become open
  material any school can use. Native speakers review examples, so each new language improves
  with its community.

Growth comes in three directions:
1. **Content:** add Terms 2 and 3, and Filipino and MAPEH once DepEd publishes their weekly
   breakdown.
2. **Languages:** add the next languages already planned in the app, such as Waray, Cebuano and
   Hiligaynon, starting with a reviewer and twenty reviewed examples each.
3. **Deployment:** a school laptop or low-cost mini-PC can serve a whole classroom over local
   Wi-Fi with a local model, so learning continues when mobile data runs out.

Free for families. Funding comes from DepEd and LGU education funds, literacy NGOs, and telco or
corporate sponsors who can underwrite cards and data for a barangay at a time.

## How this maps to the judging criteria

| Criterion | Our evidence |
|---|---|
| MVP & technical (30%, Kiro + Quick required) | Working Android build: live Agora voice, NFC lessons and profile cards, 866 ILAW lessons with quizzes. Kiro built the backend. Quick orchestrates our curriculum (Knowledge Hub Space), evidence research, and an automated lesson-QA flow. |
| Problem & domain fit (25%) | Learning-poverty evidence; mother-tongue gap after RA 12027; DepEd ILAW + BOW alignment; shared-phone reality. |
| Technology & automation judgment (25%) | Voice and NFC instead of typing and passwords; a small model + caching instead of a big model per request; swappable to an offline model; no server-side student data. |
| Innovation (15%) | The NFC card as an offline save file for several children on one phone; native-reviewed local-language grounding; ILAW lessons as a spoken conversation. |
| Real-world impact / deployment / scale (finals) | Fits classroom routines and DepEd format; costs pesos per child; adds languages through community reviewers; runs on a classroom hub with a local model. |

## Before submitting (playbook checklist)

The build window ends at **10:00 AM**. Judges review submissions for 1.5 hours before the
1:10 PM pitches.

1. ~~**Quick (−5 if missing).**~~ ✅ Done: Space `TU-gang Knowledge Hub`, Research, and the
   `TU-gang Lesson QA` flow. Attach the screenshots to the submission.
2. **Kiro (−5 if missing).** Keep `.kiro/` in the repo (don't commit its local deletion).
   Be ready to show Kiro's commits and steering files.
3. **AWS infrastructure.** The submission field asks for it. Deploy the server, or state the
   honest plan.
4. **Video link.** Upload `video/renders/tugang-demo.mp4` to YouTube (unlisted), Loom or
   Google Drive.
5. **"Play Store / Website URL".** The current APK is a *development* build that needs our
   laptop's Metro server, so judges can't run it alone. Either link the EAS install page and
   say it needs our server, or ship a standalone preview APK pointed at a hosted server.
6. **Repo accuracy.** Every feature claimed here must be in the code on GitHub. Merge
   `jjoshua-sek` into `main` before submitting.
7. **Check every statistic** before you say it (sources listed above).
