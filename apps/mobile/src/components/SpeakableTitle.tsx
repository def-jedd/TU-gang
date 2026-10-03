import { Pressable, StyleSheet, View } from 'react-native';

import { colors, radius, touch } from '../theme/tokens';
import { speakLabel } from '../voice/deviceSpeech';
import { AppText } from './AppText';
import { Icon, type IconName } from './Icon';

type Props = {
  text: string;
  /** Spoken description of the speaker button, for screen readers. */
  hearLabel: string;
  icon?: IconName;
  iconColor?: string;
};

/**
 * A heading with a speaker button: tap it and the phone reads the heading
 * aloud. Every instruction on screen is reachable without reading.
 */
export function SpeakableTitle({ text, hearLabel, icon, iconColor = colors.inkSoft }: Props) {
  return (
    <View style={styles.row}>
      {icon ? <Icon name={icon} size={24} color={iconColor} /> : null}
      <AppText variant="heading" style={styles.text} accessibilityRole="header">
        {text}
      </AppText>
      <Pressable
        onPress={() => speakLabel(text)}
        accessibilityRole="button"
        accessibilityLabel={hearLabel}
        hitSlop={8}
        style={({ pressed }) => [styles.speaker, pressed && styles.pressed]}>
        <Icon name="volume-high" size={24} color={colors.primary} />
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  text: { flex: 1 },
  speaker: {
    width: touch.min - 8,
    height: touch.min - 8,
    borderRadius: radius.pill,
    backgroundColor: colors.primaryTint,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pressed: { opacity: 0.7 },
});
