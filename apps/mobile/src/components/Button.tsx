import { LinearGradient } from 'expo-linear-gradient';
import { ClaySurface } from './ClaySurface';
import { ActivityIndicator, Pressable, StyleSheet, type StyleProp, type ViewStyle } from 'react-native';

import { gradients, colors, radius, space, touch } from '../theme/tokens';
import { AppText } from './AppText';
import { Icon, type IconName } from './Icon';

type Variant = 'primary' | 'accent' | 'secondary' | 'call' | 'hangup';

const PALETTE: Record<Variant, { face: string; lip: string; text: string; border?: string }> = {
  primary: { face: colors.primary, lip: colors.primaryLip, text: colors.onPrimary },
  call: { face: colors.call, lip: colors.callLip, text: colors.onPrimary },
  hangup: { face: colors.hangup, lip: colors.hangupLip, text: colors.onPrimary },
  accent: { face: colors.primary, lip: colors.primaryLip, text: colors.onPrimary },
  secondary: { face: colors.surface, lip: colors.borderStrong, text: colors.ink, border: colors.border },
};

const LIP = 0;

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

/** Shared raised clay action surface with quiet pressed feedback and stable bounds. */
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
      style={[styles.outer, { backgroundColor: 'transparent', opacity: disabled ? 0.45 : 1 }, style]}>
      {({ pressed }) => (
        <ClaySurface intensity="subtle" pressable radius={radius.pill}
          style={[
            styles.face,
            {
              minHeight: height - LIP,
              backgroundColor: 'transparent',
              opacity: pressed && !inactive ? 0.85 : 1,
              borderColor: 'transparent',
              transform: [{ scale: pressed && !inactive ? 0.985 : 1 }],
            },
          ]}>
          <LinearGradient pointerEvents="none" colors={variant === 'secondary' ? ['#FFFFFF', '#EAF2FC'] : variant === 'hangup' ? gradients.destructive : gradients.action} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={[StyleSheet.absoluteFill, { borderRadius: radius.pill, borderWidth: 2, borderTopColor: '#C2E3FF', borderLeftColor: '#B4D8F6', borderRightColor: '#286FA4', borderBottomColor: '#286FA4' }]} />
          {loading ? (
            <ActivityIndicator color={palette.text} />
          ) : (
            <>
              {icon && <Icon name={icon} size={size === 'lg' ? 28 : 24} color={palette.text} />}
              <AppText variant="label" color={palette.text} style={styles.label}>
                {label}
              </AppText>
            </>
          )}
        </ClaySurface>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  outer: {
    borderRadius: radius.pill,
    paddingBottom: LIP,
  },
  face: {
    borderRadius: radius.pill,
    borderWidth: 0,
    paddingHorizontal: space.lg,
    paddingVertical: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: space.sm,
  },
  label: { textAlign: 'center', flexShrink: 1 },
});
