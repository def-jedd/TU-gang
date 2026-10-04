# TU-gang: pitch details

**Track:** Shift to Lean OpenLearning (Lean Educational Technology)
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

Each technology was chosen for a specific constraint, and we kept the simplest option that works.

- **Agora Conversational AI** carries the live voice conversation and reads lessons aloud. It is
  the only part that has to be real-time.
- **Gemini 3.5 Flash-Lite**, a small and inexpensive model, writes answers and ILAW lessons. A
  second "strict teacher" pass checks every quiz: one right answer, a correct answer key, facts
  that fit the grade.
- **Lessons are generated once and cached.** The thousandth child to open a lesson costs nothing
  extra and waits no time.
- **The model is swappable.** Our tutor already runs on a local open model (Ollama) as well as
  Gemini, so a school can move to an offline small model without changing the app.
- **Kiro** was our spec-driven development agent. It built and documented the backend: the
  Supabase schema, retrieval and embeddings for the reviewed examples, and the Express/Agora voice
  server.
- **Amazon Quick** is our agent workspace. A Bikol Tutor agent is grounded in the same reviewed
  examples and the DepEd curriculum, so teachers and reviewers can test and check lessons before
  they reach children. *(Must be built before the pitch: see "Before the semi-finals" below.)*

The product also fits the way schools already work:
- It follows DepEd's ILAW lesson format and official competencies.
- Teachers can hand out NFC cards like library cards.
- It keeps no student data on a server, which removes privacy and IT-staff burdens for schools
  that have no IT staff.

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
| MVP & technical (30%, Kiro + Quick required) | Working Android dev build: live Agora voice, NFC lessons and profile cards, 866 ILAW lessons with quizzes. Kiro built the backend. **Quick agent still to set up.** |
| Problem & domain fit (25%) | Learning-poverty evidence; mother-tongue gap after RA 12027; DepEd ILAW + BOW alignment; shared-phone reality. |
| Technology & automation judgment (25%) | Voice and NFC instead of typing and passwords; a small model + caching instead of a big model per request; swappable to an offline model; no server-side student data. |
| Innovation (15%) | The NFC card as an offline save file for several children on one phone; native-reviewed local-language grounding; ILAW lessons as a spoken conversation. |
| Real-world impact / deployment / scale (finals) | Fits classroom routines and DepEd format; costs pesos per child; adds languages through community reviewers; runs on a classroom hub with a local model. |

## Before the semi-finals (risks)

1. **Amazon Quick must be integrated, or we lose 5 points.** Set up the Bikol Tutor agent with
   `ai/quick-agent/SETUP.md` and rehearse the side-by-side demo.
2. **Keep the `.kiro/` folder in the repo.** It is evidence of Kiro use; don't commit its deletion.
3. **Say plainly what needs internet.** AI answers and live voice do; progress on cards does not.
   Running fully offline with a local model is the next step, not today's demo.
4. **The Bikol UI labels are drafts.** Have the native reviewer check the on-screen words before
   the demo.
