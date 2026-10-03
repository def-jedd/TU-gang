# Teammate 2 — Amazon Quick, Tutor Agent, and AI Behavior

**Project:** Bikol-first adaptive educational tutor  
**Your mission:** Make the tutor genuinely re-teach concepts in natural Bikol and determine, **early**, how the hackathon's Amazon Quick access can connect to our app.

## 1. Your stack and boundaries

- **Amazon Quick:** custom chat agent, agent instructions, knowledge sources/spaces, and documented embed if available in our account.
- **Reference data:** native-speaker-reviewed educational examples from Teammate 4; limited tagged public Bikol passages only if they help.
- **Evaluation:** a shared question set, prompt experiments, documented wins/failures.
- **Backend interface:** collaborate with Teammate 3 on a `TutorProvider` adapter; do not assume Amazon Quick exposes a generic `POST /chat` API.

Official documentation: https://docs.aws.amazon.com/quick/latest/userguide/custom-agents.html

## 2. FIRST-HOUR TECHNICAL GATE: prove the integration route

**Do this before investing several hours into a Quick-specific backend.**

1. Confirm our sponsored/free account can **create and use a custom chat agent**, add instructions, and link a knowledge source. Permissions and sponsor terms may differ.
2. Create a temporary custom agent and ask it one test question using a sample native-reviewed example.
3. Ask organizers for the **exact supported programmatic invocation** route, credentials, quotas, and any sample repo. Do not invent an API endpoint from screenshots.
4. If programmatic invocation exists, send Teammate 3 its documented request/response/authentication requirements; jointly test one real call.
5. If there is no documented API, test the **official web embed** with the authorized domain and its permissions. This is a website embed, not necessarily a way for a React Native app to collect JSON responses for Agora.
6. Decide by **hour 2**, with Teammate 3, which route the demo truly supports:
   - **A. Verified Quick → backend:** full in-app integration, if sponsorship/docs enable it.
   - **B. Quick web embed:** working Quick agent in an allowed web surface; assess whether a mobile/WebView demo is practical. Do not promise custom voice coupling.
   - **C. Quick standalone demonstration + an explicitly disclosed, sponsor-approved backup generator for the mobile prototype:** if no end-to-end Quick invocation exists.

**Do not secretly use an unrelated AI model while claiming it is Amazon Quick.** Keep a visible note recording the chosen route.

## 3. Agent personality and nonnegotiable behavior

The differentiator is **concept-first, local-language re-teaching** rather than literal translation. Configure the agent to:

1. Understand the student's academic question before generating its explanation.
2. Teach at the requested level: `very_simple`, `simple`, or `normal`.
3. Use the requested manner: `teacher`, `friend`, or `ate_kuya`; the style should affect clarity and tone, not scientific correctness.
4. Prefer the **reviewed regional Bikol variety** tagged `bikol_daet`; acknowledge limitations rather than inventing unfamiliar terms.
5. Keep technical English terms when their Bikol substitutes are unclear; explain them naturally.
6. Give a useful, locally relatable example where appropriate and three memorable key points.
7. Answer open-ended questions. Dataset records are language/teaching examples, **not a closed bank of permitted answers**.
8. Say when uncertain. Never fabricate a definition, citation, pronunciation claim, or example allegedly validated by a speaker.

### First-draft agent instruction

```text
You are a patient educational tutor for Filipino students.
Your primary demo language is the regional Bikol style represented by
our native-speaker-reviewed Daet/Camarines Norte examples.

Understand the student's academic concept first. Re-teach it naturally:
do not produce a literal, sentence-by-sentence translation.
Respect the student's requested difficulty and teaching style.
Retain an English academic term if a local term is uncertain or awkward.

Native-reviewed examples are references for teaching style and phrasing;
generic public Bikol passages are references for language only.
Neither is automatically an authoritative answer to a science question.
Never copy irrelevant retrieved text just to sound grounded.

Return a clear explanation, one relatable example, and three key points.
If you cannot phrase something reliably in this Bikol variety, make the
uncertainty clear rather than inventing vocabulary.
```

## 4. Inputs and outputs you must support

These are the **application-level fields**, even if the chosen Quick route produces ordinary text instead of structured JSON:

```json
{
  "question": "Why does ice melt?",
  "topic": null,
  "language": "bikol_daet",
  "difficulty": "very_simple",
  "style": "friend",
  "action": "explain"
}
```

Desired output shape, as agreed with frontend/backend:

```json
{
  "topic": "melting",
  "explanation": "...",
  "example": "...",
  "key_points": ["...", "...", "..."]
}
```

If Quick returns unstructured text, agree on a reliable formatting/parser plan with the backend **only after testing the actual integration route**. Do not claim guaranteed JSON from Quick without verifying it.

## 5. Your data-grounding workflow

- Accept `bikol_examples.json` from Teammate 4, including `review_status` and `region_label`.
- Only promote `review_status: native_reviewed` examples as verified by the local speaker.
- Upload/link the **small, reviewed teaching-reference set first** if our Quick agent and account support it.
- Test whether Quick follows the examples and whether they make responses more natural. If grounding works poorly, simplify references and strengthen instructions.
- Compare generation **with vs without** examples on the same questions; document observed differences, not assumed improvement.
- Do not mix all Bikol varieties into one untagged regional claim.

**Coordination:** Teammate 3 may retrieve examples from Supabase using English concepts/topics and pass selected entries to a verified generator. Avoid duplicating retrieval inside Quick and Supabase unless the comparison proves useful.

## 6. Your minimum evaluation suite

Use at least these categories (Teammate 4 maintains the actual questions and review sheet):

| Case | Example | What you verify |
|---|---|---|
| Known school science | "Why do objects fall?" | Correct explanation, natural Bikol |
| New/unseeded concept | "Explain black holes simply" | Not limited to stored example questions |
| Maths | "What is a fraction?" | Correct teaching example |
| Tagalog input | "Bakit natutunaw ang yelo?" | Understands user language, replies in requested Bikol |
| Different difficulty | Same question, 3 levels | Actual change in complexity |
| Different style | Same question, 3 tones | Tone changes without factual drift |
| Uncertain/local term | Difficult academic vocabulary | Does not invent Bikol words |
| Adversarial reference | Off-topic retrieved snippet | Does not parrot irrelevant information |

Save output samples and notes. Teammate 4 makes the final **native-language naturalness judgment** with the reviewer.

## 7. Your 24-hour timeline

| Hours | Deliverable |
|---|---|
| 0–2 | Verify Quick permissions and invoke/embed path; record go/no-go with backend owner |
| 2–5 | Create agent and first tutoring instructions; test at least five open-ended questions |
| 5–9 | Add native-reviewed reference examples as supported; refine difficulty/style behavior; share sample outputs |
| 9–14 | Support live app integration if verified; otherwise make standalone/embedded Quick demo credible and distinguish it from any backup generator |
| 14–19 | Retest 10+ questions; improve weak examples; coordinate optional Agora pronunciation testing |
| 19–24 | Freeze agent instructions; prepare 2–3 reliable live demo prompts and backup screen recording |

## 8. Your definition of done

- [ ] We know, with evidence, which **actual Quick integration route** our account supports.
- [ ] The configured tutor handles arbitrary questions, not only stored topics.
- [ ] Difficulty and teaching-style controls change its response meaningfully.
- [ ] Reviewed Bikol examples are referenced appropriately; drafts are not claimed as validated.
- [ ] At least 10 documented test responses and their known limitations are shared.
- [ ] Backend owner has either a verified invocation recipe or a clearly stated integration blocker.
- [ ] Demo claims accurately name which model/agent generated which result.

**Suggested branch:** `feat/quick-agent` for prompt configs, test notes, and any verified adapter proof-of-concept. Keep access tokens out of Git.
