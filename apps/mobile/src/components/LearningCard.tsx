import { ClaySurface } from './ClaySurface';
import { Pressable, StyleSheet, View } from 'react-native';

import type { UiLang } from '../i18n/copy';
import type { CardDef } from '../nfc/cards';
import { layout, typeScale, colors, radius, space } from '../theme/tokens';
import { LearningArtwork } from './LearningArtwork';
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

const LIP = 0;

/**
 * The on-screen twin of a physical NFC card: same colour, icon and words as
 * the printed card, so a child who can't read the label still recognises it.
 */
export function LearningCard({ card, lang, selected = false, done = false, onPress, size = 'deck', showCode }: Props) {
  const label = card.label[lang];
  const hint = card.hint?.[lang];

  return (
    <Pressable
      onPress={onPress}
      disabled={!onPress}
      accessibilityRole="button"
      accessibilityLabel={hint ? `${label}. ${hint}` : label}
      accessibilityState={{ selected }}
      style={[styles.outer, { backgroundColor: 'transparent' }]}>
      {({ pressed }) => (
        <ClaySurface tint={card.icon === 'sprout' ? 'mint' : card.icon === 'chart-pie' ? 'peach' : card.icon === 'apple' ? 'blue' : 'lavender'} selected={selected} radius={radius.sm}
          style={[
            styles.face,
            size === 'tile' && styles.faceTile,
            {
              backgroundColor: 'transparent',
              borderColor: 'transparent',
              opacity: pressed ? 0.85 : 1,
              transform: [{ translateY: 0 }],
            },
          ]}>
          <View style={styles.topRow}>
            <View style={[styles.iconBadge, { backgroundColor: 'transparent' }]}>
              <LearningArtwork card={card} />
            </View>
            {selected ? (
              <Icon name="check-circle" size={26} color={colors.primary} />
            ) : done ? (
              <Icon name="star-circle" size={30} color={colors.accentLip} />
            ) : (
              <Icon name="nfc-variant" size={20} color={colors.primary} />
            )}
          </View>

          <AppText variant="label" color={colors.ink}>
            {label}
          </AppText>
          {hint ? (
            <AppText variant="caption" color={colors.inkSoft} >
              {hint}
            </AppText>
          ) : null}
          {showCode ? (
            <AppText
              variant="caption"
              color={colors.inkMuted}
              style={styles.code}
              numberOfLines={1}
              adjustsFontSizeToFit>
              {card.code}
            </AppText>
          ) : null}
        </ClaySurface>
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
    borderWidth: 0,
    padding: space.sm,
    gap: space.sm,
    minHeight: layout.card,
  },
  faceTile: { minHeight: 194 },
  topRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start', flexWrap: 'wrap', gap: 8,
    marginBottom: space.xs,
  },
  iconBadge: {
    width: '100%',
    height: 102,
    borderRadius: radius.sm,
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
  },
  code: { fontSize: typeScale.caption.fontSize, letterSpacing: 0.3, marginTop: 'auto' },
});
