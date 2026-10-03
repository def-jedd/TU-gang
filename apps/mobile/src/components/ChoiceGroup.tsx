import { Pressable, StyleSheet, View } from 'react-native';

import { category, colors, radius, space, touch, type CardCategory } from '../theme/tokens';
import { speakLabel } from '../voice/deviceSpeech';
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
    <View style={styles.group}>
      {speakable ? (
        <SpeakableTitle text={title} hearLabel={speakable} icon={titleIcon} iconColor={colorsFor.ink} />
      ) : (
        <View style={styles.titleRow}>
          <Icon name={titleIcon} size={22} color={colorsFor.ink} />
          <AppText variant="heading" color={colors.ink} accessibilityRole="header">
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
                {
                  backgroundColor: selected ? colorsFor.solid : colors.surface,
                  borderColor: selected ? colorsFor.lip : colors.border,
                  borderBottomColor: selected ? colorsFor.lip : colors.borderStrong,
                },
                pressed && styles.pressed,
              ]}>
              <Icon name={option.icon} size={compact ? 24 : 30} color={selected ? colors.onPrimary : colorsFor.solid} />
              <AppText
                variant="label"
                color={selected ? colors.onPrimary : colors.ink}
                style={styles.optionLabel}
                numberOfLines={2}>
                {option.label}
              </AppText>
              {selected && !compact ? (
                <View style={styles.check}>
                  <Icon name="check-circle" size={20} color={colorsFor.solid} />
                </View>
              ) : null}
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  group: { gap: space.sm },
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: space.sm },
  row: { flexDirection: 'row', gap: space.sm },
  option: {
    flex: 1,
    minHeight: 92,
    borderRadius: radius.md,
    borderWidth: 2,
    borderBottomWidth: 5,
    paddingVertical: space.sm,
    paddingHorizontal: space.xs,
    alignItems: 'center',
    justifyContent: 'center',
    gap: space.xs,
  },
  optionCompact: { minHeight: touch.min + 12, paddingVertical: space.xs },
  optionLabel: { textAlign: 'center' },
  pressed: { opacity: 0.85 },
  check: {
    position: 'absolute',
    top: -9,
    right: -6,
    backgroundColor: colors.surface,
    borderRadius: 12,
  },
});
