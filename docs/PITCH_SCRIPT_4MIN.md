# TU-gang: 4-minute pitch script

About 480 spoken words plus demo pauses, so about 4:00. **Bold** = stage direction.
Lines marked *(cut if long)* can be dropped. Rehearse with a timer.

**Roles:** Speaker. Demo hands (phone under the camera). Laptop (Quick tabs, and the
`tugang-demo.mp4` backup ready at 0:25).

---

### [0:00–0:20] Hook
> Nine in ten Filipino ten-year-olds can't read and understand a simple text. Now picture Ana,
> eight years old, in Camarines Norte. School now teaches in Filipino and English, not the Bikol
> she speaks at home. Her family has one phone for three kids. Every learning app she could open
> asks her to read, type a password, and stay online.

### [0:20–0:50] Why existing tools miss her
> Today's tools are built for a different child. Reading tools measure fluency for teachers. AI
> tutors assume she can read, type, and has her own account. Bikol apps offer storybooks, not her
> school subjects. To our knowledge, nothing teaches DepEd lessons by voice, in Bikol, on a shared
> phone.

### [0:50–1:00] What it is
> TU-gang means sibling in Bikol. It's a voice-first tutor that one family's phone can share.

### [1:00–2:05] Live demo
**Tap Ana's NFC card on the back of the phone. The home screen greets her.**
> Ana taps her card. No account, no password. The card is her save file: her progress moves
> with her to any phone, even with no internet.

**Tap "Talk to your tutor". Say: "Bakin nauran?" Let it answer for 3–4 seconds.**
> She asks out loud, and the tutor answers in Bikol, grounded in examples a native speaker
> reviewed.

**Open "Your next lesson", go to a quick check, and tap the right answer: it turns green.**
> But we didn't build a chatbot. We built a tutor. All 866 DepEd Term 1 competencies, Grades 1
> to 9, are lessons in DepEd's own ILAW format: Intentions, Learning, Assessment, Ways forward.
> Every step is read aloud, with quick checks on big A, B, C buttons, and a five-question quiz.

**Show the score screen, then the Lessons tab with the two progress bars.**
> Reading a lesson and passing it are tracked separately. Passing means 75 percent, DepEd's
> passing mark. Progress means learning, not clicking.

### [2:05–2:45] Why it's lean (technology judgment)
> This track asks for AI that poor schools can afford. So our AI cost grows with lessons, not
> students. A small model writes each lesson once, a second pass checks the quiz, and then every
> child reuses it. The thousandth student costs nothing extra. Progress lives on the phone and a
> card: no student database, no IT staff. And the tutor can already run on a local open model,
> our path to an offline classroom hub.

### [2:45–3:05] How we built it
> We built the backend in Kiro, spec-driven, with Kiro's agent. Amazon Quick is our orchestration
> layer. It connects DepEd's official curriculum and our native-reviewed Bikol data, it researched
> our evidence, and it runs an automated QA flow on every AI-written lesson before a teacher sees it.

### [3:05–3:45] What you're probably wondering
> You might be wondering about four things.
> **Internet.** New answers and live voice need it today. But each lesson is written only once, so
> a teacher prepares a whole grade while there's signal, and lessons and quizzes then run all term
> on the classroom Wi-Fi.
> **Bikol accuracy.** Answers are grounded in native-reviewed examples. AI lessons are labelled
> drafts, and our Quick flow flags anything doubtful for a teacher.
> **A lost card.** It holds a nickname and lesson progress, nothing private. The phone keeps a full
> copy, and a teacher writes a new card in seconds.
> **Scale.** Today it runs on one laptop per classroom. Next, one small AWS server and a shared
> lesson cache, so every new school reuses lessons that already exist. *(cut if long)*

### [3:45–4:00] Close
> We're not replacing teachers or DepEd's tools. We're reaching the child they can't reach yet:
> the one who can't read, sharing one phone, speaking Bikol. TU-gang: learn in your language.
> Salamat po!

---

## Why this order works

- **The gap comes before the product**, so judges already agree there's a need when the demo
  starts (Problem & domain fit, Real-world impact).
- **"We built a tutor, not a chatbot"** is said out loud and then *shown* with ILAW and the quiz
  (MVP, Innovation).
- **The cost logic is spelled out** in the track's own words (Technology judgment, Scalability).
- **The four likely attacks are answered pre-emptively.** Judges then ask deeper questions instead
  of "what about the internet?", and the answers in `docs/QA_PREP.md` back each one up.
- **The ending positions us next to DepEd and Microsoft's tools, not against them**, which is a
  mature stance for the grand finals.

## Rules for the speaker

- Only say "runs on AWS" if it's deployed by then. Otherwise use the line above.
- Say "to our knowledge" for any claim about competitors.
- If the live voice lags, keep talking over it: "It's thinking in Bikol," then move on. If it
  fails, play the backup video from 0:25 and continue the script.
- The adult gate and card-required mode are **not built**. Don't demo or claim them. Mention them
  only in Q&A, as next steps (see `docs/QA_PREP.md`).
