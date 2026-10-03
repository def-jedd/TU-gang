import { router } from 'expo-router';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { AppText } from '@/components/AppText';
import { AnswerLanguageSelector } from '@/components/AnswerLanguageSelector';
import { LanguageBadge } from '@/components/Badges';
import { Button } from '@/components/Button';
import { CardGrid } from '@/components/CardGrid';
import { DevConnection } from '@/components/DevConnection';
import { DifficultySelector } from '@/components/DifficultySelector';
import { Icon } from '@/components/Icon';
import { LearningCard } from '@/components/LearningCard';
import { SpeakableTitle } from '@/components/SpeakableTitle';
import { TeachingStyleSelector } from '@/components/TeachingStyleSelector';
import { TutorAvatar } from '@/components/TutorAvatar';
import { UiLangToggle } from '@/components/UiLangToggle';
import { useTutor } from '@/hooks/useTutor';
import { STYLE_CARDS, TOPIC_CARDS } from '@/nfc/cards';
import { useNfc } from '@/nfc/NfcProvider';
import { category, colors, radius, space } from '@/theme/tokens';
import type { VoiceContext } from '@/voice/types';
import { useVoice } from '@/voice/VoiceProvider';

/**
 * Voice-first home, built on the phone-call metaphor every child already
 * knows from Messenger: pick who to talk to, then tap a picture (call about
 * that topic) or the green Call button (talk about anything).
 */
export default function HomeScreen() {
  const { t, uiLang, setUiLang, draft, update } = useTutor();
  const { availability } = useNfc();
  const voice = useVoice();
  const tutor = STYLE_CARDS.find((c) => c.value === draft.style) ?? STYLE_CARDS[0];
  const tutorName = tutor.label[uiLang];

  const call = (override?: Partial<VoiceContext>) => {
    voice.startCall(override);
    router.push('/call');
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
      <ScrollView contentContainerStyle={styles.scroll}>
        <View style={styles.header}>
          <View style={styles.brand}>
            <View style={styles.logo}>
              <Icon name="cards" size={28} color={colors.onPrimary} />
            </View>
            <View style={styles.flex}>
              <AppText variant="display" accessibilityRole="header">
                TU-gang
              </AppText>
              <AppText variant="caption" color={colors.inkSoft}>
                {t.tagline}
              </AppText>
            </View>
          </View>
          <UiLangToggle value={uiLang} onChange={setUiLang} />
        </View>

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

        {/* Tap the tutor's face to call — the biggest target on the screen. */}
        <Pressable
          onPress={() => call({ topic: null, question: null })}
          accessibilityRole="button"
          accessibilityLabel={`${t.callButton}: ${tutorName}`}
          style={({ pressed }) => [styles.avatarWrap, pressed && styles.pressed]}>
          <TutorAvatar
            style={draft.style}
            phase="idle"
            agentLevel={voice.agentLevel}
            studentLevel={voice.studentLevel}
            size={168}
          />
          <AppText variant="title" color={category.style.ink}>
            {tutorName}
          </AppText>
        </Pressable>

        <AnswerLanguageSelector
          value={draft.language}
          onChange={(value) => update({ type: 'LANGUAGE', value })}
          speakable
        />
        <TeachingStyleSelector
          title={t.voiceTitle}
          speakable
          value={draft.style}
          onChange={(value) => update({ type: 'STYLE', value })}
        />
        <DifficultySelector
          title={t.levelTitle}
          speakable
          compact
          value={draft.difficulty}
          onChange={(value) => update({ type: 'DIFFICULTY', value })}
        />

        <View style={styles.section}>
          <SpeakableTitle text={t.pickTopicVoice} hearLabel={t.hearThis} icon="gesture-tap" iconColor={category.topic.ink} />
          <CardGrid>
            {TOPIC_CARDS.map((card) => (
              <LearningCard
                key={card.code}
                card={card}
                lang={uiLang}
                size="tile"
                selected={draft.topic === card.topic}
                onPress={() => {
                  update({ type: 'TOPIC', value: card.topic });
                  call({ topic: card.topic, question: null });
                }}
              />
            ))}
          </CardGrid>
        </View>

        {__DEV__ ? <DevConnection /> : null}
      </ScrollView>

      <View style={styles.footer}>
        <Button
          label={t.callButton}
          icon="phone"
          variant="call"
          onPress={() => call({ topic: null, question: null })}
        />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  flex: { flex: 1 },
  scroll: { padding: space.lg, gap: space.xl, paddingBottom: space.xxl },
  header: { flexDirection: 'row', alignItems: 'center', gap: space.md },
  brand: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: space.md },
  logo: {
    width: 52,
    height: 52,
    borderRadius: radius.md,
    backgroundColor: colors.primary,
    borderBottomWidth: 4,
    borderBottomColor: colors.primaryLip,
    alignItems: 'center',
    justifyContent: 'center',
  },
  metaRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: space.sm, flexWrap: 'wrap' },
  metaButtons: { flexDirection: 'row', gap: space.sm },
  avatarWrap: { alignItems: 'center', gap: space.sm },
  pressed: { opacity: 0.85 },
  section: { gap: space.md },
  footer: {
    paddingHorizontal: space.lg,
    paddingVertical: space.md,
    backgroundColor: colors.bg,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
});
