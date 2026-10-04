# TU-gang: Q&A preparation

Grouped by judging criteria. Each answer is short enough to say in about 20 seconds. Facts are
from the code and data in this repo; say "about" for any number you haven't checked yourself.
**Never claim more than what's built.** Judges may check the GitHub repo.

---

## 1. MVP & technical implementation (30%)

**Q: Show us it works. What's actually built versus planned?**
Built and running: the Android app (dev build); NFC profile cards and learning cards;
several students on one phone; live two-way voice calls through Agora; 866 DepEd Term 1
lessons in ILAW format with quick checks and quizzes; read and passed progress saved to the
phone and the card; a text tutor that remembers the conversation; Bikol, Tagalog and English.
Planned: AWS hosting, an offline classroom hub, Terms 2–3.

**Q: How did you use Kiro?**
Kiro was our development environment for the backend. Steering files hold the project and mobile
rules, and the Kiro agent built the Supabase schema, the retrieval and embedding functions, and
the Express server that starts Agora voice agents. Its commits are in the repo as "Kiro Agent".

**Q: How did you use Amazon Quick?**
As our orchestration layer, the way the playbook defines it:
- the Space `TU-gang Knowledge Hub` connects DepEd's 866 competencies, our native-reviewed Bikol
  examples and our teaching rules;
- Quick Research gathered our evidence with sources;
- the `TU-gang Lesson QA` flow checks AI-written lessons against their DepEd competency and our
  quiz rules before a teacher sees them.
*(Offer to show it on the laptop.)*

**Q: How fast is it?**
A lesson the first time: about 5–7 seconds (written, checked, saved). After that: under a tenth
of a second from the cache. A voice reply starts in a couple of seconds.

**Q: What happens if the AI or the internet fails mid-lesson?**
Lessons already opened stay cached on the server. Progress and login are on the phone and card,
so nothing is lost. If a live call can't start, the app switches to a practice voice on the phone
and says so on screen.

**Q: How do you stop runaway AI costs from the voice calls?**
Each call has a hard 10-minute stop, an agent that leaves a minute after the child does, and a cap
on simultaneous calls.

**Q: How did you test it?**
Automated tests for the card format, progress tracking and tutor logic (36 app tests, 41 tutor
tests), plus live end-to-end runs of calls and lessons. We haven't tested with children yet;
that's the first step of a pilot.

## 2. Problem statement & domain fit (25%)

**Q: Is the problem real? What's your evidence?**
About nine in ten Filipino 10-year-olds can't read and understand a simple text (World Bank
learning poverty). PISA 2022 placed Filipino students among the lowest in reading. And RA 12027
(2024) ended the mother tongue as the main language of instruction in the early grades, so Bikol
children meet new concepts in languages they don't speak at home.

**Q: Why Bikol, and why Camarines Norte?**
Our native reviewer speaks that variety, and we'd rather do one language well than claim many
badly. The design is language-agnostic: a new language needs a reviewer and about 20 reviewed
examples.

**Q: How does this fit a real classroom, not just a home?**
Lessons are DepEd's own Term 1 competencies in DepEd's ILAW lesson format, organised by grade,
subject and week, so a teacher can assign "Week 3 Science". Cards work like library cards: hand
them out, and any classroom phone becomes that child's tutor.

**Q: Who is the user: the child, the parent or the teacher?**
The child learns. A parent, sibling or teacher sets up the student once. Teachers get lessons in a
format they already plan with, and AI drafts are flagged for their review.

**Q: Kids aged 16 and under, but Grade 1 kids can't use a phone alone, can they?**
That's why it's voice-first: everything is read aloud, choices are big A, B, C buttons with
pictures and colours, and logging in is tapping a card. Younger children may need an older
sibling the first time; the "ate/kuya" tutor style is built for that.

## 3. Technology & automation judgment (25%)

**Q: Isn't this just a wrapper around an expensive AI API?**
No.
- We use a small, cheap model.
- Each lesson is written once, checked, cached and reused by every child, so the cost is per
  lesson, not per student.
- Progress lives on cards, not on our servers.
- The text tutor already runs on a local open model (Ollama) too, which is our path to an offline
  classroom hub.

**Q: Why Gemini and not an AWS model like Amazon Bedrock?**
We needed a small, low-cost model that was available to us during the build. The server talks to
the model through a standard interface, and the voice path uses an OpenAI-compatible endpoint, so
swapping in another provider such as a Bedrock model is a configuration change. We haven't
benchmarked one yet.

**Q: Why not a fully offline small language model on the phone?**
Budget Android phones can't run a good tutor model at a usable speed, and Bikol support in small
models is weak. Our step is a classroom hub (a laptop or mini-PC on local Wi-Fi with a local
model), not every phone.

**Q: Why AI at all? Why not pre-recorded lessons?**
866 competencies × 3 languages × 3 levels is too many lessons to record by hand. AI drafts them;
a second AI pass and the Quick flow check them; teachers review what's flagged. And the tutor
answers a child's own follow-up questions, which recordings can't.

**Q: Why NFC cards instead of accounts, or a QR code?**
- Children who can't read can't type passwords.
- The card holds the progress itself, so it needs no server, no student database and no IT staff.
- A QR code only identifies the child; it can't store progress.
- Several students can also be picked on screen with no card, so the card is optional.

**Q: Isn't buying NFC cards against your low-cost goal?**
The card is optional. Its cost is one-time and small (NTAG213 is among the cheapest tags;
*quote a real local price*). The alternative, cloud accounts, is a monthly cost plus children's
data to protect.

**Q: What if the phone has no NFC?**
Students are picked from the Students screen by picture, and the learning cards have on-screen
twins. Nothing requires NFC.

**Q: Why live voice (Agora) instead of the phone's own text-to-speech?**
Phones rarely have a Bikol voice, and offline speech recognition for Filipino languages is poor.
Agora gives two-way, hands-free conversation with turn detection, so the child just talks. The
phone voice stays as a fallback.

**Q: Why do you store the curriculum in the app?**
So the lesson list works with no internet. It's about 290 KB for all 866 lessons.

## 4. Innovation & approach (15%)

**Q: What's new here compared with existing apps?**
- The NFC card as an offline, portable save file that lets several children share one phone.
- A voice-first ILAW lesson flow built on the official DepEd competencies.
- Bikol grounded in native-reviewed examples instead of machine translation.
- Two separate progress tracks: read versus passed.

**Q: How is this different from Khan Academy, Duolingo or reading apps?**
To our knowledge they assume a reader with their own device, mostly in English or major
languages, and don't follow DepEd competencies. We target non-readers on a shared phone, in Bikol,
on the curriculum their school uses. *(Avoid claims about specific apps you haven't checked.)*

**Q: What's clever about how progress is stored?**
Each grade's lessons are a fixed list, so "read" and "passed" are stored as one bit per lesson.
Both tracks for all 173 Grade 1 lessons fit in about 60 characters on a cheap sticker. Phone
and card merge, so nothing learned is ever lost.

## 4b. Competitors (checked October 2026; re-check before claiming)

| Alternative | What it does | What it doesn't do for our learners |
|---|---|---|
| **Microsoft Reading Progress** (DepEd nationwide rollout, 2026) | AI reading-fluency checks with insights for teachers; Filipino and English | It assesses reading; it doesn't teach lessons or talk with the child. It runs in Microsoft Teams with school accounts, and has no Bikol |
| **AGAP.AI** (DepEd + Microsoft, launched January 2026) | AI-literacy training for 1.5M students, teachers and parents | It's a training program, not a tutor |
| **Google Read Along** | Voice-based reading practice | No Filipino, Tagalog or Bikol |
| **NABU** | Multilingual storybooks, including Bikol | Reading-based books, not curriculum lessons, quizzes or a conversation |
| **"Learn Bicol"-type apps** | Teach the Bikol language | Language learning, not school subjects in Bikol |
| **Kolibri** (used in DepEd offline projects) | Offline server for open educational content | Text and video content with accounts; no AI tutor, no Bikol voice |
| **ChatGPT / Khanmigo-style tutors** | General AI tutoring | They assume reading and typing, personal accounts, English, and are often paid |

**Q: DepEd already has Microsoft Reading Progress. Why TU-gang?**
They solve different steps. Reading Progress *measures* reading fluency for teachers. TU-gang
*teaches* the competencies by voice, in the child's home language, on a shared phone with no
accounts. A school could use both: Reading Progress to find who's struggling, TU-gang to help them.

**Q: Aren't there already Bikol apps?**
There are Bikol storybooks (NABU) and apps for learning the Bikol language. We found none that
teaches DepEd subjects in Bikol, by voice, with quizzes and progress for non-readers.

## 5. Language quality, safety & privacy

**Q: How do you know the Bikol is correct?**
Answers are grounded in 20 examples reviewed by a native speaker. AI lessons are labelled drafts,
checked by a second AI pass and the Quick QA flow, and flagged for teachers. The on-screen Bikol
labels are drafts pending review, and we say so.

**Q: Speech recognition doesn't support Bikol, does it?**
Correct, no provider has Bikol recognition. We use Filipino recognition, which handles Bikol and
Tagalog speech reasonably, and the child can always tap answers instead. Better Bikol recognition
is future work.

**Q: What stops the AI from saying something wrong or unsafe to a child?**
- The tutor is told to stay on the lesson, keep content child-safe, and say when it's unsure.
- Lessons are limited to their DepEd competency.
- Quizzes go through a strict check.
- Every answer shows which AI wrote it.
It's not perfect, which is why teacher review is built into the flow.

**Q: What about children's privacy (Data Privacy Act)?**
We store only a nickname, grade, a picture choice and lesson progress, on the phone and the card.
No full names, no accounts, no student database on a server.

**Q: Gemini's terms and users under 18?**
Children never have an AI account; our server makes the calls. For production we'd confirm the
provider's terms for education use, or switch providers, since the model is swappable.

**Q: Anyone can read an NFC card. Isn't that a risk?**
The card holds a nickname, a grade and a list of lessons done; nothing sensitive. It's like a
library card.

**Q: What if a child loses their card?**
The phone keeps a full copy. Write a new card from the Students screen.

**Q: Can kids cheat by copying a card?**
It's learning progress, not an official grade. The quiz still has to be passed on the phone to
count.

## 6. Deployment, feasibility & scale (Grand Finals)

**Q: Where does it run today, and what about AWS?**
Today: one laptop on the classroom Wi-Fi. Designed to move to one small AWS instance, plus S3 to
share the lesson cache across schools. *(Only say "runs on AWS" if it's true by then.)*

**Q: How much does it cost per student?**
Per child: a card (optional) and a phone the family already has. The AI cost is per lesson, not
per student, because lessons are cached and shared. *(Quote real numbers only if you've worked
them out.)*

**Q: How does it scale to 100 schools?**
One small server and a shared lesson cache. New schools mostly reuse lessons that already exist,
so cost barely grows with the number of students. Voice calls are the part that scales with use,
so they have time limits.

**Q: How do you add another language?**
Find a native reviewer, collect about 20 reviewed teaching examples, add the language option, and
let the QA flow and teachers review the lessons. Waray, Cebuano and Hiligaynon are next.

**Q: What about Terms 2 and 3, and the missing subjects?**
We use DepEd's official Budgets of Work. Filipino and MAPEH in some grades have no weekly
breakdown yet, so we left them out instead of guessing. New terms are added to the data files.

**Q: Who pays? What's the business model?**
Free for families. Funding comes from DepEd and LGU education funds, literacy NGOs, and telco or
corporate sponsors who can fund cards and data for a barangay at a time.

**Q: What's needed to deploy in a real school?**
Phones with the app, cards, and the server reachable on Wi-Fi or the internet. A pilot with one
class, measuring quiz pass rates before and after, would be the next step.

**Q: How would a school maintain it without IT staff?**
There's nothing to administer: no accounts or passwords, and no student database. Setting up a
student is a nickname, a grade and a picture.

## 7. Curveballs

**Q: Did you build all of this in 12 hours?**
Answer honestly about what was built during the event; the git history shows when each part was
made.

**Q: What's the weakest part of your system?**
Two honest weak points: it needs internet for the AI and voice today, and the Bikol needs more
native review at scale. Both are on the roadmap: the classroom hub, and community reviewers plus
the Quick QA flow.

**Q: If you had one more month, what would you build?**
A pilot with one class, AWS hosting with a shared lesson cache, and the offline classroom hub.

**Q: Why should we believe children will actually use it?**
It's built around what they can already do: tap a card, hear, talk and press big buttons. We'd
prove it in a pilot by measuring lessons passed, not just opened.
