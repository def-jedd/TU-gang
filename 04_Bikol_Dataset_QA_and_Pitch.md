# Teammate 4 — Bikol Dataset, Native Review, QA, and Demo Story

**Project:** Bikol-first adaptive educational tutor  
**Your mission:** Create the small, trustworthy **teaching-reference dataset**, test whether the tutor sounds genuinely natural, and turn the working product into a truthful, compelling hackathon demonstration.

## 1. Why your role is central

Amazon Quick can generate text, and Supabase can retrieve records, but neither automatically knows **how a native speaker from our chosen Bikol-speaking community would naturally teach a concept**. Your examples and reviews are the product's distinguishing input.

Target **Daet/Camarines Norte usage as reviewed by our native speaker**, not an unsupported claim that all Bikol-speaking regions use exactly the same vocabulary and expressions. The 20 earlier model-generated sentences are **unverified drafts**, not native-approved data.

## 2. Your tools and deliverables

| Purpose | Tool |
|---|---|
| Collect and edit examples | CSV/Google Sheets or JSON file |
| Dataset source control | `data/bikol_examples.json`, Git/GitHub |
| Native validation | Short, focused sessions with a consenting fluent speaker |
| Baseline language material | Selected permitted excerpts from `halo-bcl`, `ara_close`, or PLOC **only if licensing/variety are suitable** |
| QA tracking | `data/evaluation.csv` or a lightweight spreadsheet |
| Presentation | Canva, Google Slides, or the hackathon's required format |
| Demo safety | Screenshots/video plus a clearly labeled fallback |

Relevant public materials to inspect if time permits:
- https://huggingface.co/datasets/sapinsapin/halo-bcl
- https://huggingface.co/datasets/SEACrowd/ara_close
- https://github.com/imperialite/Philippine-Languages-Online-Corpora

You do **not** have to download/process every public corpus in the 24-hour event. A small, verified collection is more useful for this demo than thousands of unsuitable snippets.

## 3. Create the reference dataset FIRST

Aim for **20 high-quality draft examples** in the first few hours, then review as many as possible. Focus on 3–5 topics likely to appear in the demo and include a mix of explanations, analogies, and "literal → natural" revisions.

Use this schema for every example:

```json
{
  "id": "sample_001",
  "topic": "gravity",
  "subject": "science",
  "difficulty": "simple",
  "english_concept": "Gravity attracts objects toward Earth.",
  "ai_draft_bikol": "Unverified draft goes here...",
  "native_corrected_bikol": null,
  "bikol_example": null,
  "review_status": "draft",
  "region_label": "Daet / Camarines Norte — review pending",
  "review_notes": "",
  "source_label": "team_dataset"
}
```

After a speaker actually checks and corrects it, save the correction separately and change `review_status` to `native_reviewed`. If the speaker says the variety label is inaccurate, change the label. Keep review notes: unfamiliar term, word order, unnatural literal translation, or a better example.

**Important:** educational truth and natural language are separate quality checks. A sentence can sound fluent but still teach incorrect science. Check the underlying concept independently.

## 4. First data batch suggestion

Create examples covering:

1. Gravity: why objects fall
2. Photosynthesis: how plants make food
3. Melting: why ice melts
4. Friction: why moving objects slow down
5. Fractions: what one-half means
6. Simple vs normal explanations of at least two of those topics
7. Teacher vs `ate_kuya` delivery of at least two of those topics
8. Several corrected literal-to-natural rewrites with notes explaining *why* the draft sounds wrong

Use ordinary local examples a student understands (e.g. a ball, a plant near home, melting ice), but verify they are accurate and suitable. **Do not invent Bikol corrections or a reviewer's verdict** if you have not received them.

## 5. Hand off the data in two useful forms

**For Teammate 2 (Quick agent):** a human-readable Markdown/text reference containing the best `native_reviewed` examples and a brief style guide:

```text
Topic: Gravity
English concept: ...
Reviewed Bikol teaching example: ...
Naturalness notes: ...
Difficulty: simple
Region: [confirmed label]
```

**For Teammate 3 (Supabase):** normalized `bikol_examples.json` with stable IDs, topic, English concept, Bikol explanation, review status, and regional metadata. For empty reviews, keep the record tagged `draft` or exclude it from the reviewed pool. Keep `bikol_examples.json` valid UTF-8 JSON.

**For Teammate 1 (UI):** 1–2 short `native_reviewed` explanations (or explicitly tagged mock text if none have been reviewed yet), including an example and three key points, so the layout is tested with real-looking content.

### File layout

```text
data/
  bikol_examples.json
  native_style_guide.md
  evaluation.csv
  demo_questions.md
  licenses_and_sources.md
```

## 6. Evaluate the tutor's behavior, not only its output length

Prepare 10–12 test questions: at least 2 covered by the dataset, 2 not covered, a Tagalog/English variant of the same concept, a math concept, changes in difficulty and tone, and an intentionally tricky scientific question.

Use a simple review sheet:

| Field | Meaning |
|---|---|
| Question ID | Stable reference to the test |
| Concept correctness | Correct / needs correction / uncertain |
| Bikol naturalness | Natural / understandable but awkward / poor; judged by a fluent reviewer |
| Chosen variety consistent? | Yes / mixed / uncertain |
| Adaptation | Does changing difficulty or style produce a helpful difference? |
| RAG use | Relevant reference / irrelevant reference / no reference |
| Notes | Precise corrections for the AI teammate |

**This is a hackathon usability check, not a scientifically valid language-learning efficacy study.** If you can, compare a literal translation with the localized explanation and record feedback from 3–5 fluent reviewers; clearly report how many actually participated.

## 7. Coordinate optional Agora audio review

Teammate 3 owns the technical voice hookup. You own language quality and appropriate claims:

1. Supply 2–3 **reviewed** Bikol sentences for the voice test.
2. Have the speaker listen to the Agora-selected TTS provider, if available.
3. Record which words are mispronounced and whether the audio is understandable.
4. Recommend enabling voice only if the actual result meets the demo's quality bar.
5. If it fails, recommend text-first and, if the speaker approves, a clearly labeled recorded sample. **Never claim recorded audio is real-time TTS.**

Agora orchestrates voice providers; sponsored access does not itself prove that Bikol pronunciation is supported or that every external TTS model is free.

## 8. Demo and pitch storyline

Keep the focus on **understanding, not translation**:

**Problem:** some learners may understand an academic explanation more readily when it uses familiar language and examples; regional-language educational explanations can require care and local review. Use sourced facts if citing Philippine learning or language statistics. Do **not** attribute national learning gaps to language mismatch without evidence.

**Solution:** an adaptive tutor that receives an ordinary question, retrieves reviewed Bikol teaching references, and re-explains the academic concept according to the student's selected difficulty and teaching style.

**Differentiator:** a local, reviewable language layer and optional **composable physical NFC learning cards**, not simply a translation button or an NFC tag opening a webpage.

**Suggested 90-second working demo:**

1. Student asks, "Why does ice melt?" and selects **Bikol + Very simple**.
2. Show a clear Bikol explanation and a relatable example.
3. Change to **Normal** or **Ate/Kuya** and show an actual change in the response.
4. If working: compose the topic/action using NFC cards or their on-screen equivalents.
5. If pronunciation passes: play live Agora-enabled voice. Otherwise stay text-first.
6. Briefly show one before-and-after *native-reviewed* language correction, with permission.

**Transparency requirement:** if Amazon Quick cannot be programmatically connected and is shown separately or embedded instead, say so plainly. Do not describe a mocked frontend response or backup LLM as a Quick-powered result.

## 9. Your 24-hour timeline

| Hours | Deliverable |
|---|---|
| 0–2 | Agree on target Bikol variety and schema; start 20 draft examples; gather speaker availability |
| 2–5 | Finish first usable JSON batch; request native review; send early samples to Quick, backend, UI |
| 5–9 | Deliver best corrected examples and style guide; begin 10–12 question benchmark |
| 9–14 | Test live app/agent outputs with the reviewer; record corrections and send actionable fixes |
| 14–19 | Review optional Agora pronunciation; prepare 90-second demo and honest capability notes |
| 19–24 | Freeze dataset; final regression checks; pitch slides; record backup demo and practice handoff |

## 10. Your definition of done

- [ ] At least 20 **clearly labeled draft** examples, with actual corrections recorded separately.
- [ ] Best available reviewed examples reach Quick, backend, and UI owners early.
- [ ] A 10–12 question evaluation set and reproducible notes exist.
- [ ] The chosen regional language label reflects what the speaker actually reviewed.
- [ ] All public data licenses/sources and reviewer permissions are documented.
- [ ] Voice accuracy is tested before a TTS claim appears in the pitch.
- [ ] Demo has a working primary path plus an honestly labeled backup.
- [ ] Slides tell a defensible story without invented effectiveness statistics.

**Suggested branch:** `feat/bikol-data-qa`. Push the schema and first draft dataset early so other teammates never wait on your final dataset.
