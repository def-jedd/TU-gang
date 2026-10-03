import { Image } from 'react-native';
import { SheetArtwork } from '@/components/SheetArtwork';
import { BikolLandscape } from '@/components/BikolLandscape';
import { ClaySurface } from '@/components/ClaySurface';
import { ScreenBackdrop } from '@/components/ScreenBackdrop';
import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { AppText } from '@/components/AppText';
import { AnswerLanguageSelector } from '@/components/AnswerLanguageSelector';
import { LanguageBadge } from '@/components/Badges';
import { Button } from '@/components/Button';

import { DevConnection } from '@/components/DevConnection';
import { DifficultySelector } from '@/components/DifficultySelector';
import { Icon } from '@/components/Icon';
import { LearningCard } from '@/components/LearningCard';
import { LessonArtwork } from '@/components/LessonArtwork';
import { lessonsFor, lessonTitle, subjectInfo } from '@/curriculum';
import { SpeakableTitle } from '@/components/SpeakableTitle';
import { TeachingStyleSelector } from '@/components/TeachingStyleSelector';
import { PersonaPortrait } from '@/components/PersonaPortrait';
import { UiLangToggle } from '@/components/UiLangToggle';
import { useTutor } from '@/hooks/useTutor';
import { STYLE_CARDS, TOPIC_CARDS } from '@/nfc/cards';
import { useNfc } from '@/nfc/NfcProvider';
import { useProfiles } from '@/profiles/ProfileProvider';
import { StudentAvatar } from '@/components/StudentAvatar';
import { layout, shadow, category, colors, radius, space } from '@/theme/tokens';
import type { VoiceContext } from '@/voice/types';
import { useVoice } from '@/voice/VoiceProvider';

/**
 * Voice-first home, built on the phone-call metaphor every child already
 * knows from Messenger: pick who to talk to, then tap a picture (call about
 * that topic) or the green Call button (talk about anything).
 */
export default function HomeScreen() {
  const { t, uiLang, setUiLang, draft, update } = useTutor();
  const { availability, lastProfile } = useNfc();
  const { active: student } = useProfiles();
  // "Hi, Ana!" for a few seconds after a profile card is tapped.
  const [greeting, setGreeting] = useState<string | null>(null);
  useEffect(() => {
    if (!lastProfile) return;
    setGreeting(`${t.helloStudent}, ${lastProfile.profile.name}!`);
    const timer = setTimeout(() => setGreeting(null), 4000);
    return () => clearTimeout(timer);
  }, [lastProfile, t.helloStudent]);
  const voice = useVoice();
  const tutor = STYLE_CARDS.find((c) => c.value === draft.style) ?? STYLE_CARDS[0];
  const tutorName = tutor.label[uiLang];
  // The first lesson of the student's grade whose quiz isn't passed yet.
  const upNext = lessonsFor(student?.grade ?? 1).find((l) => !student?.passed.includes(l.id)) ?? null;

  const call = (override?: Partial<VoiceContext>) => {
    voice.startCall(override);
    router.push('/call');
  };

  return (
    <ScreenBackdrop persona={draft.style}><SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
      <ScrollView contentContainerStyle={styles.scroll}>
        <View style={styles.header}>
          <View style={styles.brand}>
            <View style={[styles.logo, { backgroundColor: 'transparent' }]}>
              <SheetArtwork name="books-sprout" width={52} />
            </View>
            <View style={styles.flex}>
              <AppText variant="display" color={colors.ink} accessibilityRole="header">
                TU-gang
              </AppText>
              <AppText variant="caption" color={colors.ink}>
                {t.tagline}
              </AppText>
            </View>
          </View>
          <UiLangToggle value={uiLang} onChange={setUiLang} />
        </View>

        {/* Who is learning: tap to switch, or tap a profile card on the back of the phone. */}
        <Pressable
          onPress={() => router.push('/profiles')}
          accessibilityRole="button"
          accessibilityLabel={student ? `${student.name}, ${t.gradeTitle} ${student.grade}` : t.whoIsLearning}
          style={({ pressed }) => [styles.student, pressed && styles.pressed]}>
<ClaySurface tint="lavender" intensity="subtle" selected={false} radius={radius.md} pointerEvents="none" style={StyleSheet.absoluteFill} />
          {student ? (
            <StudentAvatar avatar={student.avatar} size={48} />
          ) : (
            <View style={styles.studentEmpty}>
              <Icon name="account-question" size={28} color={colors.inkSoft} />
            </View>
          )}
          <View style={styles.flex}>
            <AppText variant="heading">{greeting ?? (student ? student.name : t.whoIsLearning)}</AppText>
            {student ? (
              <AppText variant="caption" color={colors.inkSoft}>
                {t.gradeTitle} {student.grade} · 📖 {student.done.length} {t.lessonsRead} · ★ {student.passed.length} {t.examsPassed}
              </AppText>
            ) : null}
          </View>
          <Icon name="account-switch" size={26} color={colors.primary} />
        </Pressable>

        {/* Tap the tutor's face to call — the biggest target on the screen. */}
        <Pressable
          onPress={() => call({ topic: null, question: null })}
          accessibilityRole="button"
          accessibilityLabel={`${t.callButton}: ${tutorName}`}
          style={({ pressed }) => [styles.avatarWrap, pressed && styles.pressed]}>
          <ClaySurface intensity="subtle" radius={radius.lg} pointerEvents="none" style={StyleSheet.absoluteFill} />
          <View pointerEvents="none" style={[StyleSheet.absoluteFill, { borderRadius: radius.lg, overflow: 'hidden' }]}><BikolLandscape /></View>
          <View style={{ position: 'absolute', left: 4, bottom: 2 }}><PersonaPortrait persona={draft.style} size={180} /></View>
          <Image source={require('../../assets/clay-dog.png')} resizeMode="contain" accessible={false} style={{position:'absolute',right:12,bottom:4,width:84,height:100}}/><ClaySurface tint="peach" intensity="strong" style={{ position: 'absolute', top: 18, right: 14, padding: 12, maxWidth: 142 }}><AppText variant="title" color={colors.ink}>
            {tutorName}
          </AppText></ClaySurface>
        </Pressable>

      <ClaySurface tint="mint" style={styles.footer}>
        <Button
          label={t.callButton}
          icon="phone"
          variant="call"
          onPress={() => call({ topic: null, question: null })}
        />
      </ClaySurface>

        {/* Guided DepEd lessons (ILAW) with quizzes: the tutor-led path. */}
        {upNext ? (
          <View style={styles.section}>
            <SpeakableTitle text={t.nextLesson} hearLabel={t.hearThis} icon="school" iconColor={category.level.ink} />
            <Pressable
              onPress={() => router.push({ pathname: '/lesson', params: { id: upNext.id } })}
              accessibilityRole="button"
              accessibilityLabel={`${t.nextLesson}: ${lessonTitle(upNext, uiLang)}`}
              style={({ pressed }) => [styles.nextLesson, pressed && styles.pressed]}>
              <ClaySurface tint="peach" intensity="strong" radius={radius.lg} pointerEvents="none" style={StyleSheet.absoluteFill} />
              <LessonArtwork lesson={upNext} size={64} />
              <View style={styles.flex}>
                <AppText variant="caption" color={colors.inkSoft} bold>
                  {subjectInfo(upNext.subject).label[uiLang]} · {t.week} {upNext.week}
                </AppText>
                <AppText variant="heading" color={colors.ink} numberOfLines={2}>
                  {lessonTitle(upNext, uiLang)}
                </AppText>
              </View>
              <Icon name="play-circle" size={44} color={colors.primary} />
            </Pressable>
            <Button label={t.allLessons} icon="book-education" variant="secondary" size="md" onPress={() => router.push('/lessons')} />
          </View>
        ) : null}

        <View style={styles.metaRow}>
          <LanguageBadge t={t} language={draft.language} />
          <View style={styles.metaButtons}>
            <Button label={t.typeInstead} icon="keyboard-outline" variant="secondary" size="md" onPress={() => router.push('/ask')} />
            <Button
              label={availability === 'ready' ? t.nfcOnShort : t.cardsButton}
              icon="nfc-variant"
              variant="secondary"
              size="md"
              onPress={() => router.push('/cards')}
            />
          </View>
        </View>

        <View style={styles.section}>
          <SpeakableTitle text={t.pickTopicVoice} hearLabel={t.hearThis} icon="gesture-tap" iconColor={category.topic.ink} />
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{gap:12,paddingBottom:12,paddingTop:4}}>
            {TOPIC_CARDS.map((card) => (
              <View key={card.code} style={{width:174}}><LearningCard
                key={card.code}
                card={card}
                lang={uiLang}
                size="tile"
                selected={draft.topic === card.topic}
                done={!!student?.done.includes(card.topic)}
                onPress={() => {
                  update({ type: 'TOPIC', value: card.topic });
                  call({ topic: card.topic, question: null });
                }}
              />
            </View>))}
          </ScrollView>
        </View>

        <TeachingStyleSelector
          title={t.voiceTitle}
          speakable
          value={draft.style}
          onChange={(value) => update({ type: 'STYLE', value })}
        />
        <AnswerLanguageSelector
          value={draft.language}
          onChange={(value) => update({ type: 'LANGUAGE', value })}
          speakable
        />
        <DifficultySelector
          title={t.levelTitle}
          speakable
          compact
          value={draft.difficulty}
          onChange={(value) => update({ type: 'DIFFICULTY', value })}
        />

        {__DEV__ ? <DevConnection /> : null}
      </ScrollView>

    </SafeAreaView></ScreenBackdrop>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: 'transparent' },
  flex: { flex: 1, minWidth: 0 },
  scroll: { padding: layout.screen, gap: space.md, paddingBottom: space.xxl },
  header: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: space.md },
  brand: { flex: 1, minWidth: layout.brandMin, flexDirection: 'row', alignItems: 'center', gap: space.sm },
  logo: {
    width: 44,
    height: 44,
    borderRadius: radius.md,
    backgroundColor: colors.primary,
    borderBottomWidth: 0,
    borderBottomColor: colors.primaryLip,
    alignItems: 'center',
    justifyContent: 'center',
  },
  student: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.md,
    padding: space.sm,
    borderRadius: radius.md,
    backgroundColor: 'transparent',
    borderWidth: layout.border,
    borderColor: colors.border,
  },
  studentEmpty: {
    width: 48,
    height: 48,
    borderRadius: 24,
    borderWidth: layout.border,
    borderStyle: 'dashed',
    borderColor: colors.borderStrong,
    alignItems: 'center',
    justifyContent: 'center',
  },
  metaRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: space.sm, flexWrap: 'wrap' },
  metaButtons: { flexDirection: 'row', flexWrap: 'wrap', gap: space.sm, flexShrink: 1 },
  avatarWrap: { flexDirection: 'row-reverse', alignItems: 'center', justifyContent: 'space-between', gap: space.lg, padding: space.xl, minHeight: 206, borderRadius: radius.lg, ...shadow.card },
  pressed: { opacity: 0.85 },
  section: { gap: space.md },
  nextLesson: { flexDirection: 'row', alignItems: 'center', gap: space.md, padding: space.md, borderRadius: radius.lg, ...shadow.card },
  footer: {
    paddingHorizontal: layout.screen,
    paddingVertical: space.md,
    backgroundColor: 'transparent',
    
    borderTopWidth: 0,
    borderTopColor: colors.border,
  },
});



