import { ClaySurface } from './ClaySurface';
import { Pressable, StyleSheet, View } from 'react-native';

import { layout, category, colors, radius, space, type CardCategory } from '../theme/tokens';
import { speakLabel } from '../voice/deviceSpeech';
import { ChoiceArtwork } from './ChoiceArtwork';
import { AppText } from './AppText';
import { Icon, type IconName } from './Icon';
import { SpeakableTitle } from './SpeakableTitle';

export type Choice<T extends string> = { value: T; label: string; icon: IconName };

type Props<T extends string> = {
  title: string;
  titleIcon: IconName;
  options: Choice<T>[];
  value: T;
  onChange: (value: T) => void;
  palette: CardCategory;
  /** Smaller tiles for the answer screen's "change how I explain" panel. */
  compact?: boolean;
  /**
   * Voice-first screens: the title gets a speaker button and each option says
   * its own name when tapped, so the choice works without reading.
   * Pass the accessibility label for the speaker button.
   */
  speakable?: string;
};

/**
 * Three big picture buttons that behave like radio buttons. Each one looks
 * like its matching NFC card (same colour + icon), so the on-screen choice
 * and the physical card teach each other.
 */
export function ChoiceGroup<T extends string>({
  title,
  titleIcon,
  options,
  value,
  onChange,
  palette,
  compact,
  speakable,
}: Props<T>) {
  const colorsFor = category[palette];

  return (
    <ClaySurface tint={palette === 'style' ? 'peach' : palette === 'level' ? 'mint' : 'lavender'} intensity="subtle" style={[styles.group, palette !== 'style' && { shadowOpacity: 0, elevation: 0, backgroundColor: 'transparent' }]}>
      {speakable ? (
        <SpeakableTitle text={title} hearLabel={speakable} icon={titleIcon} iconColor={colorsFor.ink} />
      ) : (
        <View style={styles.titleRow}>
          <Icon name={titleIcon} size={18} color={colorsFor.ink} />
          <AppText variant="heading" color={colors.ink} style={{ flexShrink: 1 }} accessibilityRole="header">
            {title}
          </AppText>
        </View>
      )}
      <View style={styles.row} accessibilityRole="radiogroup" accessibilityLabel={title}>
        {options.map((option) => {
          const selected = option.value === value;
          return (
            <Pressable
              key={option.value}
              onPress={() => {
                onChange(option.value);
                if (speakable) speakLabel(option.label);
              }}
              accessibilityRole="radio"
              accessibilityLabel={option.label}
              accessibilityState={{ checked: selected }}
              style={({ pressed }) => [
                styles.option,
                compact && styles.optionCompact,
                palette !== 'style' && { flexDirection: 'row', minHeight: 48, gap: 6 },
                palette === 'style' && !compact && { minHeight: 110 },
                {
                  backgroundColor: 'transparent',
                  borderColor: 'transparent',
                  borderBottomColor: 'transparent',
                },
                pressed && styles.pressed,
              ]}>
              <ClaySurface tint={palette === 'style' ? 'peach' : 'mint'} selected={selected} intensity="subtle" radius={radius.sm} style={StyleSheet.absoluteFill} pointerEvents="none" />
              <ChoiceArtwork icon={option.icon} value={option.value} palette={palette} compact={compact} />
              <AppText
                variant="label"
                color={colors.ink}
                style={styles.optionLabel}
              >
                {option.label}
              </AppText>
              {selected && !compact ? (
                <View style={styles.check}>
                  <Icon name="check-circle" size={20} color={colors.primary} />
                </View>
              ) : null}
            </Pressable>
          );
        })}
      </View>
    </ClaySurface>
  );
}

const styles = StyleSheet.create({
  group: { gap: space.sm, padding: space.md, borderRadius: radius.lg },
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: space.sm },
  row: { flexDirection: 'row', flexWrap: 'wrap', gap: space.sm },
  option: {
    flex: 1,
    flexBasis: '28%',
    minWidth: 72,
    minHeight: 48,
    borderRadius: radius.md,
    borderWidth: layout.border,
    borderBottomWidth: 0,
    paddingVertical: space.sm,
    paddingHorizontal: space.xs,
    alignItems: 'center',
    justifyContent: 'center',
    gap: space.xs,
  },
  optionCompact: { minHeight: 48, paddingVertical: space.xs },
  optionLabel: { flex: 1, textAlign: 'center', flexShrink: 1 },
  pressed: { opacity: 0.85 },
  check: {
    zIndex: 1,
    position: 'absolute',
    top: space.xs,
    right: space.xs,
    backgroundColor: colors.onPrimary,
    borderRadius: radius.pill,
  },
});
