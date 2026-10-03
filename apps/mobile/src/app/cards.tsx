import { useLocalSearchParams } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { AppText } from '@/components/AppText';
import { Button } from '@/components/Button';
import { CardGrid } from '@/components/CardGrid';
import { CardTray } from '@/components/CardTray';
import { Icon, type IconName } from '@/components/Icon';
import { LearningCard } from '@/components/LearningCard';
import { NfcStatusBanner } from '@/components/NfcStatusBanner';
import { ScreenHeader } from '@/components/ScreenHeader';
import { useTutor } from '@/hooks/useTutor';
import type { Copy } from '@/i18n/copy';
import { buildExplainRequest, type LearningDraft } from '@/nfc/cardReducer';
import { ACTION_CARDS, LANGUAGE_CARDS, LEVEL_CARDS, STYLE_CARDS, TOPIC_CARDS, type CardDef } from '@/nfc/cards';
import { useNfc, type LastScan } from '@/nfc/NfcProvider';
import { INTERACTION_MODE } from '@/services/config';
import { category, colors, radius, space, type CardCategory } from '@/theme/tokens';

export default function CardsScreen() {
  const { t, uiLang, draft } = useTutor();
  const { tapCard, lastScan } = useNfc();

  // Deep link support: tugang://cards?card=TOPIC_GRAVITY (dev build only).
  const { card: linkedCard } = useLocalSearchParams<{ card?: string }>();
  const appliedLink = useRef<string | null>(null);
  useEffect(() => {
    if (linkedCard && appliedLink.current !== linkedCard) {
      appliedLink.current = linkedCard;
      tapCard(linkedCard);
    }
  }, [linkedCard, tapCard]);

  const isSelected = (card: CardDef) =>
    (card.category === 'topic' && 'topic' in card && card.topic === draft.topic) ||
    (card.category === 'level' && 'value' in card && card.value === draft.difficulty) ||
    (card.category === 'style' && 'value' in card && card.value === draft.style) ||
    (card.category === 'language' && 'value' in card && card.value === draft.language);

  const deck = (title: string, icon: IconName, palette: CardCategory, cards: CardDef[]) => (
    <View style={styles.section}>
      <View style={styles.sectionTitle}>
        <Icon name={icon} size={22} color={category[palette].ink} />
        <AppText variant="heading" accessibilityRole="header">
          {title}
        </AppText>
      </View>
      <CardGrid>
        {cards.map((card) => (
          <LearningCard
            key={card.code}
            card={card}
            lang={uiLang}
            selected={isSelected(card)}
            onPress={() => tapCard(card.code)}
            showCode
          />
        ))}
      </CardGrid>
    </View>
  );

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
      <ScreenHeader backLabel={t.back} title={t.cardsTitle} />
      <ScrollView contentContainerStyle={styles.scroll}>
        <NfcStatusBanner />

        <View style={styles.trayWrap}>
          <CardTray draft={draft} t={t} lang={uiLang} />
          <ScanFeedback scan={lastScan} t={t} />
          {/* Same path as tapping the physical ACTION_EXPLAIN card. */}
          <Button
            label={INTERACTION_MODE === 'voice' ? t.callAboutIt : t.explainButton}
            icon={INTERACTION_MODE === 'voice' ? 'phone' : 'lightbulb-on'}
            variant={INTERACTION_MODE === 'voice' ? 'call' : 'primary'}
            onPress={() => tapCard('ACTION_EXPLAIN')}
          />
        </View>

        {deck(t.deckTopics, 'shape', 'topic', TOPIC_CARDS)}
        {deck(t.deckLevels, 'stairs', 'level', LEVEL_CARDS)}
        {deck(t.deckStyles, 'account-voice', 'style', STYLE_CARDS)}
        {deck(t.deckActions, 'gesture-tap-button', 'action', [...ACTION_CARDS, ...LANGUAGE_CARDS])}

        {__DEV__ ? <RequestPreview draft={draft} /> : null}
      </ScrollView>
    </SafeAreaView>
  );
}

function ScanFeedback({ scan, t }: { scan: LastScan | null; t: Copy }) {
  if (!scan) return null;
  const { outcome } = scan;
  const view: { icon: IconName; text: string; color: string } =
    outcome.kind === 'applied' || outcome.kind === 'submitted'
      ? { icon: 'check-circle', text: t.cardAdded, color: colors.success }
      : outcome.kind === 'needs_question'
        ? { icon: 'arrow-up-bold-circle', text: t.cardNeedsTopic, color: colors.warn }
        : outcome.kind === 'needs_answer'
          ? { icon: 'arrow-up-bold-circle', text: t.cardNeedsAnswer, color: colors.warn }
          : { icon: 'help-circle', text: t.cardUnknown, color: colors.warn };

  return (
    <View key={scan.at} style={styles.feedback} accessibilityLiveRegion="polite">
      <Icon name={view.icon} size={24} color={view.color} />
      <AppText color={view.color} bold style={styles.flex}>
        {view.text}
      </AppText>
      {scan.code ? (
        <AppText variant="caption" color={colors.inkMuted}>
          {scan.code}
        </AppText>
      ) : null}
    </View>
  );
}

/** Dev-only proof for teammates/judges: the exact JSON the cards will send. */
function RequestPreview({ draft }: { draft: LearningDraft }) {
  const [open, setOpen] = useState(false);
  const built = buildExplainRequest(draft);
  return (
    <View style={styles.preview}>
      <Pressable
        onPress={() => setOpen((v) => !v)}
        accessibilityRole="button"
        accessibilityState={{ expanded: open }}
        style={styles.previewToggle}>
        <Icon name="code-json" size={22} color={colors.inkSoft} />
        <AppText variant="label" color={colors.inkSoft} style={styles.flex}>
          [dev] POST /api/explain body
        </AppText>
        <Icon name={open ? 'chevron-up' : 'chevron-down'} size={24} color={colors.inkSoft} />
      </Pressable>
      {open ? (
        <AppText variant="caption" style={styles.mono} selectable>
          {built.ok ? JSON.stringify(built.request, null, 2) : '(no question yet — add a topic card)'}
        </AppText>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  flex: { flex: 1 },
  scroll: { padding: space.lg, paddingTop: space.sm, gap: space.xl, paddingBottom: space.xxxl },
  trayWrap: {
    gap: space.md,
    padding: space.md,
    borderRadius: radius.lg,
    backgroundColor: colors.surface,
    borderWidth: 2,
    borderColor: colors.border,
  },
  feedback: { flexDirection: 'row', alignItems: 'center', gap: space.sm },
  section: { gap: space.md },
  sectionTitle: { flexDirection: 'row', alignItems: 'center', gap: space.sm },
  preview: {
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    padding: space.md,
    gap: space.sm,
  },
  previewToggle: { flexDirection: 'row', alignItems: 'center', gap: space.sm, minHeight: 44 },
  mono: { fontFamily: 'monospace' },
});
