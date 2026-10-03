import { ClaySurface } from '@/components/ClaySurface';
import { ScreenBackdrop } from '@/components/ScreenBackdrop';
import { router } from 'expo-router';
import { useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { AppText } from '@/components/AppText';
import { AnswerLanguageSelector } from '@/components/AnswerLanguageSelector';
import { LanguageBadge } from '@/components/Badges';
import { Button } from '@/components/Button';
import { CardGrid } from '@/components/CardGrid';
import { DifficultySelector } from '@/components/DifficultySelector';
import { Icon } from '@/components/Icon';
import { LearningCard } from '@/components/LearningCard';
import { QuestionInput } from '@/components/QuestionInput';
import { ScreenHeader } from '@/components/ScreenHeader';
import { TeachingStyleSelector } from '@/components/TeachingStyleSelector';
import { useTutor } from '@/hooks/useTutor';
import { TOPIC_CARDS } from '@/nfc/cards';
import { layout, category, colors, space } from '@/theme/tokens';

/** Secondary, reading-based mode: for helpers who can type, or noisy rooms. */
export default function AskScreen() {
  const { t, uiLang, draft, update, submit } = useTutor();
  const [showHint, setShowHint] = useState(false);
  const canAsk = draft.question.trim().length > 0;

  const ask = () => {
    if (submit()) {
      setShowHint(false);
      router.push('/result');
    } else {
      setShowHint(true);
    }
  };

  return (
    <ScreenBackdrop><SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
      <ScreenHeader backLabel={t.back} title={t.typeInstead} />
      <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
          <View style={styles.metaRow}>
            <LanguageBadge t={t} language={draft.language} />
          </View>

          <AppText variant="title" color={colors.ink}>{t.askTitle}</AppText>

          <QuestionInput
            label={t.questionLabel}
            placeholder={t.questionPlaceholder}
            clearLabel={t.clearQuestion}
            value={draft.question}
            onChangeText={(value) => update({ type: 'QUESTION', value })}
            onSubmit={ask}
          />

          <AnswerLanguageSelector value={draft.language} onChange={(value) => update({ type: 'LANGUAGE', value })} />
          <DifficultySelector value={draft.difficulty} onChange={(value) => update({ type: 'DIFFICULTY', value })} />
          <TeachingStyleSelector value={draft.style} onChange={(value) => update({ type: 'STYLE', value })} />

          <View style={styles.section}>
            <View style={styles.sectionTitle}>
              <Icon name="gesture-tap" size={22} color={category.topic.ink} />
              <AppText variant="heading" style={{ flexShrink: 1 }}>{t.orPickTopic}</AppText>
            </View>
            <CardGrid>
              {TOPIC_CARDS.map((card) => (
                <LearningCard
                  key={card.code}
                  card={card}
                  lang={uiLang}
                  size="tile"
                  selected={draft.topic === card.topic}
                  onPress={() => {
                    setShowHint(false);
                    update({ type: 'TOPIC', value: card.topic });
                  }}
                />
              ))}
            </CardGrid>
          </View>


        </ScrollView>

        {/* One primary action, always within thumb reach. */}
        <ClaySurface style={styles.footer}>
          {showHint && !canAsk ? (
            <View style={styles.hint} accessibilityLiveRegion="polite">
              <Icon name="arrow-up-bold" size={20} color={colors.warn} />
              <AppText color={colors.warn} style={styles.flex}>
                {t.needQuestion}
              </AppText>
            </View>
          ) : null}
          <Button
            label={t.explainButton}
            icon="lightbulb-on"
            onPress={ask}
            accessibilityHint={canAsk ? undefined : t.needQuestion}
            style={!canAsk && styles.dimmed}
          />
        </ClaySurface>
      </KeyboardAvoidingView>
    </SafeAreaView></ScreenBackdrop>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: 'transparent' },
  flex: { flex: 1 },
  scroll: { padding: layout.screen, gap: space.xl, paddingBottom: space.xxl },
  metaRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: space.sm, flexWrap: 'wrap' },
  section: { gap: space.md },
  sectionTitle: { flexDirection: 'row', alignItems: 'center', gap: space.sm },
  footer: {
    paddingHorizontal: layout.screen,
    paddingTop: space.md,
    paddingBottom: space.md,
    gap: space.sm,
    backgroundColor: 'transparent',
    
    borderTopWidth: 0,
    borderTopColor: colors.border,
  },
  hint: { flexDirection: 'row', alignItems: 'center', gap: space.sm },
  dimmed: { opacity: 0.6 },
});
