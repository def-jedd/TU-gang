# TU-gang: 2-minute live pitch script

About 250 spoken words. **Bold** = stage direction. Rehearse with a timer: if you run long,
cut the lines marked *(cut if long)*.

**Roles:** Speaker (talks the whole time). Demo hands (holds the phone under the document
camera or next to the screen). Laptop (Quick tabs open, used in Q&A).

---

**[0:00–0:15] Hook**
> Nine in ten Filipino ten-year-olds can't read and understand a simple text. Now picture being
> one of them in Camarines Norte. School is now in Filipino and English, not the Bikol you speak
> at home, and your family has one phone for three kids. Every learning app asks you to read, type
> a password, and stay online.

**[0:15–0:22] What it is**
> So we built TU-gang. *Tugang* means sibling in Bikol. It's a voice-first tutor for one
> shared phone.

**[0:22–0:35] Demo 1: the card is the save file**
**Tap Ana's NFC card on the back of the phone. The home screen says "Hi, Ana!"**
> Ana taps her card. No account, no password. The card *is* her save file, so her progress
> moves with her, even to another phone with no internet.

**[0:35–0:52] Demo 2: just talk**
**Tap "Talk to your tutor". Say clearly: "Bakin nauran?" Let the tutor answer for 3–4 seconds,
then tap to interrupt or hang up.**
> She just asks out loud. Live voice through Agora, answering in natural Bikol grounded in
> examples reviewed by a native speaker.

**[0:52–1:12] Demo 3: a real DepEd lesson**
**Open "Your next lesson" (pre-opened to a quick check). Tap the right answer: it turns green.**
> But a tutor isn't a search engine. All 866 DepEd Term 1 competencies, Grades 1 to 9, are
> lessons in DepEd's new ILAW format. Every step is read aloud, there are quick checks with big
> A, B, C buttons, and a five-question quiz. Passing is tracked separately from just reading.

**[1:12–1:40] Lean, and how we built it**
> And it's lean. A small model writes each lesson once, a second pass checks the quiz, and then
> it's cached, so the thousandth child costs nothing extra. A whole grade of progress fits on one
> cheap NFC sticker. No student database, no IT staff.
> We built our backend in Kiro, spec-driven. Amazon Quick is our orchestration layer. It connects
> DepEd's curriculum and our Bikol dataset, researched our evidence, and runs an automated
> quality check on every AI-written lesson before a teacher sees it.

**[1:40–2:00] Close**
> Next: Terms two and three, Waray and Cebuano with community reviewers *(cut if long)*, and a
> classroom hub that works offline. TU-gang: learn in your language. Salamat po!

---

## Before you go on stage (checklist)

- [ ] Phone: the new APK, on the same Wi-Fi or hotspot as the laptop. Terminals 1–3 running.
      Ana exists and is saved to her card. Volume at max.
- [ ] Ana's next lesson **pre-generated**: `npm run lessons:warm -- <grade> bikol_daet simple`,
      or open it once beforehand.
- [ ] Do one test call ("Bakin nauran?") in the room, since the venue Wi-Fi may differ.
- [ ] **Backup:** if voice or the network fails, say "here's the same flow recorded" and play
      `video/renders/tugang-demo.mp4` from 0:25.
- [ ] Laptop: the three Quick tabs open (see below).

## Showing Amazon Quick live (best in the 2-minute Q&A)

A Quick run takes longer than the pitch allows, so **pre-run everything** and keep the results open.
Show the results first, then run something live while you explain.

**Prepare three browser tabs, logged in:**
1. **Space: `TU-gang Knowledge Hub`**, with the list of 14 files visible.
2. **Flow: `TU-gang Lesson QA`**, with a **finished run open** showing its report (PASS / NEEDS
   TEACHER REVIEW and the table of questions). Have
   `data/quick_knowledge/lesson-samples/g1-mathematics-w1-1.tagalog.simple.txt` ready to upload.
3. **Research report** on our evidence (summary and sources).

**When a judge asks about Quick (about 45 s):**
1. **Tab 1**: "This Space connects our data: DepEd's 866 official competencies, our 20
   native-reviewed Bikol examples, and our teaching rules." Ask its chat live:
   *"What are the Grade 3 Science competencies for Week 1?"* It answers in seconds.
2. **Tab 2**: "Our AI writes lessons, and Quick checks them. Here's a real lesson from our server,
   checked against its DepEd competency and our quiz rules." Point at the verdict and one row.
   Optionally start a new run with the Tagalog sample, and say "this runs on every new
   lesson" while it works.
3. **Tab 3**: "And Quick Research gathered the evidence behind our numbers, with sources."

## Likely Q&A, short answers

- **"Isn't this just wrapping an AI API?"** No. Each lesson is generated once with a small model,
  checked, cached and reused by every child, so repeat use costs nothing. Progress lives on cards,
  not servers. And the text tutor already runs on a local open model for an offline hub.
- **"What about no internet?"** Progress and login work offline (NFC). Lessons and voice need a
  connection today. The next step is a classroom hub with a local model on the school's Wi-Fi.
- **"How do you know the Bikol is right?"** A native speaker reviewed the 20 examples that ground
  every answer. AI-written lessons are labelled drafts, and the Quick QA flow flags issues for
  teachers.
- **"AWS infrastructure?"** Today it runs on one laptop on the classroom Wi-Fi. It's designed to
  move to one small AWS instance plus S3 for the lesson cache, so cost stays flat as schools join.
  *(Say only what's true at pitch time.)*
- **"Why NFC, not logins or QR codes?"** Kids who can't read can't type passwords. A card also
  holds the progress itself, so it needs no server or account.
- **"Why ILAW?"** It's DepEd's lesson format (DO 16, s. 2026), so teachers can use it without
  changing how they plan.
