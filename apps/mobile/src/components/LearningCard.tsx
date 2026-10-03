import { Pressable, StyleSheet, View } from 'react-native';

import type { UiLang } from '../i18n/copy';
import type { CardDef } from '../nfc/cards';
import { category, colors, radius, space } from '../theme/tokens';
import { AppText } from './AppText';
import { Icon } from './Icon';

type Props = {
  card: CardDef;
  lang: UiLang;
  selected?: boolean;
  /** The active student already finished this lesson: shows a gold star. */
  done?: boolean;
  onPress?: () => void;
  /** `deck`: card simulator. `tile`: Home topic picker. */
  size?: 'deck' | 'tile';
  /** Show the code written on the physical tag (helps whoever writes the tags). */
  showCode?: boolean;
};

const LIP = 5;

/**
 * The on-screen twin of a physical NFC card: same colour, icon and words as
 * the printed card, so a child who can't read the label still recognises it.
 */
export function LearningCard({ card, lang, selected = false, done = false, onPress, size = 'deck', showCode }: Props) {
  const palette = category[card.category];
  const label = card.label[lang];
  const hint = card.hint?.[lang];

  return (
    <Pressable
      onPress={onPress}
      disabled={!onPress}
      accessibilityRole="button"
      accessibilityLabel={hint ? `${label}. ${hint}` : label}
      accessibilityState={{ selected }}
      style={[styles.outer, { backgroundColor: selected ? palette.lip : palette.solid + '55' }]}>
      {({ pressed }) => (
        <View
          style={[
            styles.face,
            size === 'tile' && styles.faceTile,
            {
              backgroundColor: selected ? palette.solid : palette.tint,
              borderColor: palette.solid,
              transform: [{ translateY: pressed ? LIP - 1 : 0 }],
            },
          ]}>
          <View style={styles.topRow}>
            <View style={[styles.iconBadge, { backgroundColor: selected ? colors.surface : palette.solid }]}>
              <Icon name={card.icon} size={30} color={selected ? palette.solid : colors.onPrimary} />
            </View>
            {selected ? (
              <Icon name="check-circle" size={26} color={colors.onPrimary} />
            ) : done ? (
              <Icon name="star-circle" size={30} color={colors.accentLip} />
            ) : (
              <Icon name="nfc-variant" size={20} color={palette.solid} />
            )}
          </View>

          <AppText variant="label" color={selected ? colors.onPrimary : palette.ink} numberOfLines={2}>
            {label}
          </AppText>
          {hint ? (
            <AppText variant="caption" color={selected ? colors.onPrimary : colors.inkSoft} numberOfLines={2}>
              {hint}
            </AppText>
          ) : null}
          {showCode ? (
            <AppText
              variant="caption"
              color={selected ? colors.onPrimary : colors.inkMuted}
              style={styles.code}
              numberOfLines={1}
              adjustsFontSizeToFit>
              {card.code}
            </AppText>
          ) : null}
        </View>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  outer: {
    borderRadius: radius.lg,
    paddingBottom: LIP,
    flex: 1,
  },
  face: {
    flex: 1,
    borderRadius: radius.lg,
    borderWidth: 2,
    padding: space.md,
    gap: space.xs,
    minHeight: 132,
  },
  faceTile: { minHeight: 120 },
  topRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: space.xs,
  },
  iconBadge: {
    width: 52,
    height: 52,
    borderRadius: 26,
    alignItems: 'center',
    justifyContent: 'center',
  },
  code: { fontSize: 12, letterSpacing: 0.3, marginTop: 'auto' },
});
