import { ClaySurface } from './ClaySurface';
import { router } from 'expo-router';
import type { ReactNode } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { layout, colors, radius, space, touch } from '../theme/tokens';
import { AppText } from './AppText';
import { Icon } from './Icon';

type Props = {
  backLabel: string;
  title?: string;
  right?: ReactNode;
};

/** Big, labelled back button: an arrow alone is easy to miss for new readers. */
export function ScreenHeader({ backLabel, title, right }: Props) {
  const goBack = () => (router.canGoBack() ? router.back() : router.replace('/'));

  return (
    <View style={styles.bar}>
      <Pressable
        onPress={goBack}
        accessibilityRole="button"
        accessibilityLabel={backLabel}
        style={({ pressed }) => [styles.back, pressed && styles.pressed]}>
<ClaySurface intensity="subtle" selected={false} radius={radius.md} pointerEvents="none" style={StyleSheet.absoluteFill} />
        <Icon name="arrow-left" size={26} color={colors.ink} />
        <AppText variant="label">{backLabel}</AppText>
      </Pressable>
      {title ? (
        <AppText variant="title" color={colors.ink} style={styles.title}  accessibilityRole="header">
          {title}
        </AppText>
      ) : (
        <View style={styles.title} />
      )}
      {right}
    </View>
  );
}

const styles = StyleSheet.create({
  bar: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: space.sm,
    paddingHorizontal: layout.screen,
    paddingVertical: space.md,
  },
  back: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.xs,
    minHeight: touch.min,
    paddingHorizontal: space.md,
    borderRadius: radius.pill,
    backgroundColor: 'transparent',
    borderWidth: layout.border,
    borderColor: colors.border,
  },
  pressed: { opacity: 0.8, transform: [{ scale: 0.985 }] },
  title: { flex: 1, minWidth: layout.headerTitleMin },
});
