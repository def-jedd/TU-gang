import { StyleSheet, View } from 'react-native';

import type { Copy, UiLang } from '../i18n/copy';
import type { LearningDraft } from '../nfc/cardReducer';
import { LEVEL_CARDS, STYLE_CARDS, topicCard, type CardDef } from '../nfc/cards';
import { category, colors, radius, space, type CardCategory } from '../theme/tokens';
import { AppText } from './AppText';
import { Icon, type IconName } from './Icon';

type SlotProps = {
  title: string;
  emptyLabel: string;
  palette: CardCategory;
  emptyIcon: IconName;
  card?: CardDef;
  /** For free-typed questions there's no topic card — show the text instead. */
  fallbackText?: string;
  lang: UiLang;
};

function Slot({ title, emptyLabel, palette, emptyIcon, card, fallbackText, lang }: SlotProps) {
  const colorsFor = category[palette];
  const filled = !!card || !!fallbackText;
  const label = card ? card.label[lang] : fallbackText ?? emptyLabel;

  return (
    <View
      style={[
        styles.slot,
        filled
          ? { backgroundColor: colorsFor.tint, borderColor: colorsFor.solid, borderStyle: 'solid' }
          : { backgroundColor: colors.surface, borderColor: colors.borderStrong, borderStyle: 'dashed' },
      ]}
      accessible
      accessibilityLabel={`${title}: ${label}`}>
      <AppText variant="caption" color={colors.inkSoft}>
        {title}
      </AppText>
      <Icon name={card?.icon ?? emptyIcon} size={34} color={filled ? colorsFor.solid : colors.borderStrong} />
      <AppText variant="label" color={filled ? colorsFor.ink : colors.inkMuted} numberOfLines={2} style={styles.center}>
        {label}
      </AppText>
    </View>
  );
}

/**
 * The "sentence" the student is building with cards: WHAT (topic), HOW SIMPLE
 * (level) and WHO (tutor). Mirrors exactly what will be sent.
 */
export function CardTray({ draft, t, lang }: { draft: LearningDraft; t: Copy; lang: UiLang }) {
  const topic = topicCard(draft.topic);
  return (
    <View style={styles.tray}>
      <Slot
        title={t.traySlotTopic}
        emptyLabel={t.trayEmpty}
        palette="topic"
        emptyIcon="help-box-outline"
        card={topic}
        fallbackText={topic ? undefined : draft.question.trim() || undefined}
        lang={lang}
      />
      <Slot
        title={t.traySlotLevel}
        emptyLabel={t.trayEmpty}
        palette="level"
        emptyIcon="stairs"
        card={LEVEL_CARDS.find((c) => c.value === draft.difficulty)}
        lang={lang}
      />
      <Slot
        title={t.traySlotStyle}
        emptyLabel={t.trayEmpty}
        palette="style"
        emptyIcon="account-voice"
        card={STYLE_CARDS.find((c) => c.value === draft.style)}
        lang={lang}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  tray: { flexDirection: 'row', gap: space.sm },
  slot: {
    flex: 1,
    minHeight: 132,
    borderRadius: radius.md,
    borderWidth: 2,
    padding: space.sm,
    alignItems: 'center',
    justifyContent: 'center',
    gap: space.xs,
  },
  center: { textAlign: 'center' },
});
