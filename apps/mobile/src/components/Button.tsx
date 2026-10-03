import { ActivityIndicator, Pressable, StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';

import { colors, radius, space, touch } from '../theme/tokens';
import { AppText } from './AppText';
import { Icon, type IconName } from './Icon';

type Variant = 'primary' | 'accent' | 'secondary' | 'call' | 'hangup';

const PALETTE: Record<Variant, { face: string; lip: string; text: string; border?: string }> = {
  primary: { face: colors.primary, lip: colors.primaryLip, text: colors.onPrimary },
  call: { face: colors.call, lip: colors.callLip, text: colors.onPrimary },
  hangup: { face: colors.hangup, lip: colors.hangupLip, text: colors.onPrimary },
  accent: { face: colors.accent, lip: colors.accentLip, text: colors.onAccent },
  secondary: { face: colors.surface, lip: colors.borderStrong, text: colors.ink, border: colors.borderStrong },
};

const LIP = 5;

type Props = {
  label: string;
  onPress: () => void;
  icon?: IconName;
  variant?: Variant;
  size?: 'lg' | 'md';
  disabled?: boolean;
  loading?: boolean;
  accessibilityHint?: string;
  style?: StyleProp<ViewStyle>;
};

/**
 * Chunky button with a visible "lip" underneath, like a physical key. The
 * face sinks into the lip when pressed — a strong, language-free signal that
 * this thing can be pushed. The outer bounds never change, so nothing around
 * it jumps.
 */
export function Button({
  label,
  onPress,
  icon,
  variant = 'primary',
  size = 'lg',
  disabled,
  loading,
  accessibilityHint,
  style,
}: Props) {
  const palette = PALETTE[variant];
  const inactive = disabled || loading;
  const height = size === 'lg' ? touch.primary : touch.min;

  return (
    <Pressable
      onPress={onPress}
      disabled={inactive}
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityHint={accessibilityHint}
      accessibilityState={{ disabled: !!inactive, busy: !!loading }}
      style={[styles.outer, { backgroundColor: palette.lip, opacity: disabled ? 0.45 : 1 }, style]}>
      {({ pressed }) => (
        <View
          style={[
            styles.face,
            {
              minHeight: height - LIP,
              backgroundColor: palette.face,
              borderColor: palette.border ?? palette.face,
              transform: [{ translateY: pressed && !inactive ? LIP - 1 : 0 }],
            },
          ]}>
          {loading ? (
            <ActivityIndicator color={palette.text} />
          ) : (
            <>
              {icon && <Icon name={icon} size={size === 'lg' ? 28 : 24} color={palette.text} />}
              <AppText variant={size === 'lg' ? 'title' : 'label'} color={palette.text} numberOfLines={2} style={styles.label}>
                {label}
              </AppText>
            </>
          )}
        </View>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  outer: {
    borderRadius: radius.md,
    paddingBottom: LIP,
  },
  face: {
    borderRadius: radius.md,
    borderWidth: 2,
    paddingHorizontal: space.lg,
    paddingVertical: space.sm,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: space.sm,
  },
  label: { textAlign: 'center', flexShrink: 1 },
});
