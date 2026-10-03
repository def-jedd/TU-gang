import * as Haptics from 'expo-haptics';
import { router, useLocalSearchParams } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { AppText } from '@/components/AppText';
import { Button } from '@/components/Button';
import { HearButton } from '@/components/HearButton';
import { Icon } from '@/components/Icon';
import { ScreenHeader } from '@/components/ScreenHeader';
import { lessonById, lessonIcon, lessonTitle, nextLesson, subjectInfo } from '@/curriculum';
import { useTutor } from '@/hooks/useTutor';
import { useProfiles } from '@/profiles/ProfileProvider';
import { PASS_MARK } from '@/profiles/profileCard';
import { examScore, fetchLesson, type LessonPack, type LessonQuestion } from '@/services/lessons';
import { colors, radius, space } from '@/theme/tokens';
import type { Language } from '@/types/tutor';
import { useVoice } from '@/voice/VoiceProvider';

/**
 * One DepEd lesson in the ILAW format (DepEd Order No. 16, s. 2026):
 *   I  Intentions → L  Learning steps (each with a quick check)
 *   → A  Assessment (5-question quiz) → W  Ways forward.
 * Finishing the steps = lesson READ; the quiz score = lesson PASSED (≥ 75%).
 * Both are saved to the student's profile (and NFC card) separately.
 */
type Stage =
  | { kind: 'I' }
  | { kind: 'L'; step: number }
  | { kind: 'A'; index: number; correct: number }
  | { kind: 'score'; correct: number }
  | { kind: 'W' };

const ILAW = ['I', 'L', 'A', 'W'] as const;
const LETTERS = ['A', 'B', 'C'];
const LETTER_COLORS = ['#1D5FB4', '#C2410C', '#6D3FB0'];

export default function LessonScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const lesson = id ? lessonById(id) : null;
  const { t, uiLang, draft } = useTutor();
  const { active: student, markLessonDone, recordExamResult } = useProfiles();
  const voice = useVoice();

  const [pack, setPack] = useState<LessonPack | null>(null);
  const [failed, setFailed] = useState(false);
  const [attempt, setAttempt] = useState(0);
  const [stage, setStage] = useState<Stage>({ kind: 'I' });
  // The choice picked for the question on screen (null = not answered yet).
  const [picked, setPicked] = useState<number | null>(null);

  useEffect(() => {
    if (!lesson) return;
    const controller = new AbortController();
    setPack(null);
    setFailed(false);
    fetchLesson(lesson.id, draft.language, draft.difficulty, controller.signal)
      .then(setPack)
      .catch(() => !controller.signal.aborted && setFailed(true));
    return () => controller.abort();
  }, [lesson, draft.language, draft.difficulty, attempt]);

  const go = useCallback((next: Stage) => {
    setPicked(null);
    setStage(next);
  }, []);

  const learnWithTutor = () => {
    if (!lesson) return;
    voice.startCall({ lesson: lesson.id, topic: null, question: lesson.question });
    router.push('/call');
  };

  if (!lesson) {
    return (
      <SafeAreaView style={styles.safe}>
        <ScreenHeader backLabel={t.back} title={t.lessonsTitle} />
      </SafeAreaView>
    );
  }

  const info = subjectInfo(lesson.subject);
  const title = lessonTitle(lesson, uiLang);
  const language: Language = pack?.language ?? draft.language;

  const answer = (question: LessonQuestion, choice: number) => {
    if (picked !== null) return;
    setPicked(choice);
    Haptics.notificationAsync(
      choice === question.answer ? Haptics.NotificationFeedbackType.Success : Haptics.NotificationFeedbackType.Warning,
    ).catch(() => {});
  };

  const finishSteps = () => {
    markLessonDone(lesson.id); // track 1: the lesson was READ
    go({ kind: 'A', index: 0, correct: 0 });
  };

  const finishQuiz = (correct: number) => {
    if (!pack) return;
    recordExamResult(lesson.id, examScore(correct, pack.exam.length)); // track 2: the quiz
    go({ kind: 'score', correct });
  };

  let body: React.ReactNode = null;
  if (failed) {
    body = (
      <View style={styles.center}>
        <Icon name="cloud-alert" size={56} color={colors.warn} />
        <AppText variant="heading" style={styles.centerText}>
          {t.lessonFailed}
        </AppText>
        <Button label={t.tryAgain} icon="refresh" onPress={() => setAttempt((n) => n + 1)} />
        <Button label={t.learnWithTutor} icon="phone" variant="call" onPress={learnWithTutor} />
      </View>
    );
  } else if (!pack) {
    body = (
      <View style={styles.center}>
        <Icon name="book-open-page-variant" size={56} color={info.color} />
        <AppText variant="heading" style={styles.centerText}>
          {t.lessonLoading}
        </AppText>
      </View>
    );
  } else if (stage.kind === 'I') {
    body = (
      <Part title={t.ilawI} text={pack.intentions.text} requestId={pack.intentions.request_id} language={language}>
        <Button label={t.nextStep} icon="arrow-right" onPress={() => go({ kind: 'L', step: 0 })} />
      </Part>
    );
  } else if (stage.kind === 'L') {
    const step = pack.steps[stage.step];
    const last = stage.step === pack.steps.length - 1;
    body = (
      <Part
        title={`${t.ilawL} · ${stage.step + 1}/${pack.steps.length}`}
        text={step.text}
        requestId={step.request_id}
        language={language}>
        <Question
          label={t.quickCheck}
          question={step.check}
          picked={picked}
          onPick={(c) => answer(step.check, c)}
          language={language}
          autoPlay={false}
          t={t}
        />
        {picked !== null ? (
          <Button
            label={last ? t.startQuiz : t.nextStep}
            icon={last ? 'clipboard-check' : 'arrow-right'}
            onPress={() => (last ? finishSteps() : go({ kind: 'L', step: stage.step + 1 }))}
          />
        ) : null}
      </Part>
    );
  } else if (stage.kind === 'A') {
    const question = pack.exam[stage.index];
    const last = stage.index === pack.exam.length - 1;
    const correct = stage.correct + (picked === question.answer ? 1 : 0);
    body = (
      <View style={styles.part}>
        <SectionTitle text={`${t.ilawA} · ${t.question} ${stage.index + 1}/${pack.exam.length}`} />
        <Question question={question} picked={picked} onPick={(c) => answer(question, c)} language={language} autoPlay t={t} />
        {picked !== null ? (
          <Button
            label={last ? t.yourScore : t.nextStep}
            icon={last ? 'flag-checkered' : 'arrow-right'}
            onPress={() => (last ? finishQuiz(correct) : go({ kind: 'A', index: stage.index + 1, correct }))}
          />
        ) : null}
      </View>
    );
  } else if (stage.kind === 'score') {
    const score = examScore(stage.correct, pack.exam.length);
    const passed = score >= PASS_MARK;
    body = (
      <View style={[styles.part, styles.centerItems]} accessibilityLiveRegion="polite">
        <Icon name={passed ? 'star-circle' : 'emoticon-happy-outline'} size={88} color={passed ? '#B7791F' : colors.primary} />
        <AppText variant="display">
          {stage.correct} / {pack.exam.length}
        </AppText>
        <AppText variant="title" style={styles.centerText}>
          {passed ? t.passedQuiz : t.notPassedQuiz}
        </AppText>
        {student ? null : (
          <AppText variant="caption" color={colors.warn} style={styles.centerText}>
            {t.chooseStudentToSave}
          </AppText>
        )}
        {passed ? (
          <Button label={t.nextStep} icon="arrow-right" onPress={() => go({ kind: 'W' })} />
        ) : (
          <>
            <Button label={t.reviewLesson} icon="book-open-variant" onPress={() => go({ kind: 'L', step: 0 })} />
            <Button label={t.retakeQuiz} icon="refresh" variant="secondary" onPress={() => go({ kind: 'A', index: 0, correct: 0 })} />
          </>
        )}
      </View>
    );
  } else {
    const next = nextLesson(lesson.id);
    body = (
      <Part title={t.ilawW} text={pack.ways_forward.text} requestId={pack.ways_forward.request_id} language={language}>
        {next ? (
          <Button
            label={`${t.nextLesson}: ${lessonTitle(next, uiLang)}`}
            icon="arrow-right-bold"
            onPress={() => router.replace({ pathname: '/lesson', params: { id: next.id } })}
          />
        ) : null}
        <Button label={t.finishLesson} icon="check" variant="secondary" onPress={() => router.back()} />
      </Part>
    );
  }

  const current = stage.kind === 'score' ? 'A' : stage.kind;
  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
      <ScreenHeader backLabel={t.back} title={info.label[uiLang]} />
      <ScrollView contentContainerStyle={styles.scroll}>
        <View style={styles.titleRow}>
          <View style={[styles.lessonIcon, { backgroundColor: info.color }]}>
            <Icon name={lessonIcon(lesson)} size={30} color={colors.onPrimary} />
          </View>
          <View style={styles.flex}>
            <AppText variant="title">{title}</AppText>
            <AppText variant="caption" color={colors.inkSoft}>
              {t.week} {lesson.week}
            </AppText>
          </View>
        </View>

        {/* Where we are in I-L-A-W, for children and for teachers. */}
        <View style={styles.ilaw} accessibilityRole="progressbar">
          {ILAW.map((letter) => {
            const on = letter === current;
            const doneBefore = ILAW.indexOf(letter) < ILAW.indexOf(current);
            return (
              <View key={letter} style={[styles.ilawPill, on && { backgroundColor: info.color }, doneBefore && styles.ilawDone]}>
                <AppText variant="label" color={on ? colors.onPrimary : doneBefore ? colors.success : colors.inkSoft}>
                  {letter}
                </AppText>
              </View>
            );
          })}
        </View>

        {body}

        {pack ? (
          <View style={styles.footerInfo}>
            <Button label={t.learnWithTutor} icon="phone" variant="call" size="md" onPress={learnWithTutor} />
            <AppText variant="caption" color={colors.inkSoft}>
              {t.competencyLabel}: {lesson.competency}
            </AppText>
            <AppText variant="caption" color={colors.inkMuted}>
              {t.lessonDraft}
            </AppText>
          </View>
        ) : null}
      </ScrollView>
    </SafeAreaView>
  );
}

function SectionTitle({ text }: { text: string }) {
  return (
    <AppText variant="label" color={colors.inkSoft}>
      {text}
    </AppText>
  );
}

function Part({
  title,
  text,
  requestId,
  language,
  children,
}: {
  title: string;
  text: string;
  requestId: string;
  language: Language;
  children?: React.ReactNode;
}) {
  return (
    <View style={styles.part}>
      <SectionTitle text={title} />
      <View style={styles.textCard}>
        <AppText variant="heading" style={styles.lessonText}>
          {text}
        </AppText>
        <HearButton requestId={requestId} text={text} language={language} autoPlay />
      </View>
      {children}
    </View>
  );
}

function Question({
  label,
  question,
  picked,
  onPick,
  language,
  autoPlay,
  t,
}: {
  label?: string;
  question: LessonQuestion;
  picked: number | null;
  onPick: (choice: number) => void;
  language: Language;
  autoPlay: boolean;
  t: ReturnType<typeof useTutor>['t'];
}) {
  const answered = picked !== null;
  const right = picked === question.answer;
  return (
    <View style={styles.question}>
      {label ? <SectionTitle text={label} /> : null}
      <AppText variant="title">{question.question}</AppText>
      <HearButton
        requestId={question.request_id}
        text={`${question.question} ${question.choices.map((c, i) => `${LETTERS[i]}: ${c}.`).join(' ')}`}
        language={language}
        autoPlay={autoPlay}
      />
      {question.choices.map((choice, i) => {
        const isAnswer = i === question.answer;
        const isPicked = i === picked;
        const border = answered && isAnswer ? colors.success : answered && isPicked ? colors.warn : LETTER_COLORS[i];
        return (
          <Pressable
            key={i}
            onPress={() => onPick(i)}
            disabled={answered}
            accessibilityRole="radio"
            accessibilityState={{ checked: isPicked, disabled: answered }}
            accessibilityLabel={`${LETTERS[i]}: ${choice}`}
            style={[
              styles.choice,
              { borderColor: border },
              answered && isAnswer && styles.choiceRight,
              answered && isPicked && !isAnswer && styles.choiceWrong,
              answered && !isAnswer && !isPicked && styles.choiceDim,
            ]}>
            <View style={[styles.letter, { backgroundColor: LETTER_COLORS[i] }]}>
              <AppText variant="title" color={colors.onPrimary}>
                {LETTERS[i]}
              </AppText>
            </View>
            <AppText variant="heading" style={styles.flex}>
              {choice}
            </AppText>
            {answered && isAnswer ? <Icon name="check-circle" size={28} color={colors.success} /> : null}
            {answered && isPicked && !isAnswer ? <Icon name="close-circle" size={28} color={colors.warn} /> : null}
          </Pressable>
        );
      })}
      {answered ? (
        <View style={[styles.feedback, right ? styles.feedbackRight : styles.feedbackWrong]} accessibilityLiveRegion="assertive">
          <AppText variant="heading" color={right ? colors.success : colors.warn}>
            {right ? t.correct : `${t.notYet} ${LETTERS[question.answer]}`}
          </AppText>
          <AppText>{question.why}</AppText>
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  flex: { flex: 1 },
  scroll: { padding: space.lg, paddingTop: space.sm, gap: space.lg, paddingBottom: space.xxl },
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: space.md },
  lessonIcon: { width: 56, height: 56, borderRadius: 28, alignItems: 'center', justifyContent: 'center' },
  ilaw: { flexDirection: 'row', gap: space.sm },
  ilawPill: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: space.xs,
    borderRadius: radius.pill,
    borderWidth: 2,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  ilawDone: { borderColor: colors.success, backgroundColor: colors.successTint },
  part: { gap: space.md },
  textCard: { gap: space.md, padding: space.lg, borderRadius: radius.lg, backgroundColor: colors.surface, borderWidth: 2, borderColor: colors.border },
  lessonText: { lineHeight: 30 },
  question: { gap: space.sm },
  choice: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.md,
    padding: space.md,
    minHeight: 64,
    borderRadius: radius.md,
    borderWidth: 3,
    backgroundColor: colors.surface,
  },
  choiceRight: { backgroundColor: colors.successTint },
  choiceWrong: { backgroundColor: '#FDECEA' },
  choiceDim: { opacity: 0.5 },
  letter: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  feedback: { gap: space.xs, padding: space.md, borderRadius: radius.md, borderWidth: 2 },
  feedbackRight: { borderColor: colors.success, backgroundColor: colors.successTint },
  feedbackWrong: { borderColor: colors.warn, backgroundColor: '#FDECEA' },
  center: { alignItems: 'center', gap: space.lg, paddingVertical: space.xxl },
  centerItems: { alignItems: 'center' },
  centerText: { textAlign: 'center' },
  footerInfo: { gap: space.sm, marginTop: space.lg },
});
