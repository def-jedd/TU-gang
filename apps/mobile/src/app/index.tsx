import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { AppText } from '@/components/AppText';
import { LanguageBadge } from '@/components/Badges';
import { Button } from '@/components/Button';
import { CardGrid } from '@/components/CardGrid';
import { DifficultySelector } from '@/components/DifficultySelector';
import { Icon } from '@/components/Icon';
import { LearningCard } from '@/components/LearningCard';
import { QuestionInput } from '@/components/QuestionInput';
import { TeachingStyleSelector } from '@/components/TeachingStyleSelector';
import { useTutor } from '@/hooks/useTutor';
import type { UiLang } from '@/i18n/copy';
import { TOPIC_CARDS } from '@/nfc/cards';
import { useNfc } from '@/nfc/NfcProvider';
import { checkHealth, type HealthResult } from '@/services/api';
import { API_BASE_URL } from '@/services/config';
import { category, colors, radius, space, touch } from '@/theme/tokens';

export default function HomeScreen() {
  const { t, uiLang, setUiLang, draft, update, submit } = useTutor();
  const { availability } = useNfc();
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
    <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
      <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
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
            <LanguageBadge t={t} />
            <Button
              label={availability === 'ready' ? `${t.cardsButton} · ${t.nfcOnShort}` : t.cardsButton}
              icon="nfc-variant"
              variant="secondary"
              size="md"
              onPress={() => router.push('/cards')}
              style={styles.cardsButton}
            />
          </View>

          <AppText variant="title">{t.askTitle}</AppText>

          <QuestionInput
            label={t.questionLabel}
            placeholder={t.questionPlaceholder}
            clearLabel={t.clearQuestion}
            value={draft.question}
            onChangeText={(value) => update({ type: 'QUESTION', value })}
            onSubmit={ask}
          />

          <View style={styles.section}>
            <View style={styles.sectionTitle}>
              <Icon name="gesture-tap" size={22} color={category.topic.ink} />
              <AppText variant="heading">{t.orPickTopic}</AppText>
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

          <DifficultySelector value={draft.difficulty} onChange={(value) => update({ type: 'DIFFICULTY', value })} />
          <TeachingStyleSelector value={draft.style} onChange={(value) => update({ type: 'STYLE', value })} />

          {__DEV__ ? <DevConnection /> : null}
        </ScrollView>

        {/* One primary action, always within thumb reach. */}
        <View style={styles.footer}>
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
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

function UiLangToggle({ value, onChange }: { value: UiLang; onChange: (lang: UiLang) => void }) {
  const options: { lang: UiLang; label: string; a11y: string }[] = [
    { lang: 'en', label: 'EN', a11y: 'English' },
    { lang: 'bik', label: 'BIK', a11y: 'Bikol' },
  ];
  return (
    <View style={styles.toggle} accessibilityRole="radiogroup" accessibilityLabel="App language">
      {options.map(({ lang, label, a11y }) => {
        const selected = value === lang;
        return (
          <Pressable
            key={lang}
            onPress={() => onChange(lang)}
            accessibilityRole="radio"
            accessibilityLabel={a11y}
            accessibilityState={{ checked: selected }}
            style={[styles.toggleOption, selected && styles.toggleSelected]}>
            <AppText variant="label" color={selected ? colors.onPrimary : colors.inkSoft}>
              {label}
            </AppText>
          </Pressable>
        );
      })}
    </View>
  );
}

/** Dev-only: which backend this build talks to, and whether it answers. */
function DevConnection() {
  const [health, setHealth] = useState<HealthResult | null>(null);
  useEffect(() => {
    checkHealth().then(setHealth);
  }, []);

  const text =
    health === null
      ? 'checking…'
      : health.mode === 'mock'
        ? 'MOCK data (set EXPO_PUBLIC_API_BASE_URL to use the backend)'
        : health.ok
          ? `connected · provider: ${health.provider ?? '?'}`
          : `unreachable (${health.error})`;
  const dot = health?.mode === 'mock' ? colors.accent : health?.ok ? colors.success : colors.warn;

  return (
    <View style={styles.dev}>
      <View style={[styles.devDot, { backgroundColor: dot }]} />
      <AppText variant="caption" color={colors.inkMuted} style={styles.flex}>
        [dev] {API_BASE_URL ?? 'no backend'} — {text}
      </AppText>
    </View>
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
  cardsButton: { flexShrink: 1 },
  section: { gap: space.md },
  sectionTitle: { flexDirection: 'row', alignItems: 'center', gap: space.sm },
  footer: {
    paddingHorizontal: space.lg,
    paddingTop: space.md,
    paddingBottom: space.md,
    gap: space.sm,
    backgroundColor: colors.bg,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  hint: { flexDirection: 'row', alignItems: 'center', gap: space.sm },
  dimmed: { opacity: 0.6 },
  toggle: {
    flexDirection: 'row',
    backgroundColor: colors.surface,
    borderRadius: radius.pill,
    borderWidth: 2,
    borderColor: colors.border,
    padding: 3,
  },
  toggleOption: {
    minHeight: touch.min - 10,
    minWidth: 52,
    paddingHorizontal: space.md,
    borderRadius: radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
  },
  toggleSelected: { backgroundColor: colors.primary },
  dev: { flexDirection: 'row', alignItems: 'center', gap: space.sm },
  devDot: { width: 10, height: 10, borderRadius: 5 },
});
