import { router } from 'expo-router';
import type { ReactNode } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { colors, radius, space, touch } from '../theme/tokens';
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
        <Icon name="arrow-left" size={26} color={colors.ink} />
        <AppText variant="label">{backLabel}</AppText>
      </Pressable>
      {title ? (
        <AppText variant="title" style={styles.title} numberOfLines={1} accessibilityRole="header">
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
    alignItems: 'center',
    gap: space.sm,
    paddingHorizontal: space.lg,
    paddingVertical: space.sm,
  },
  back: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.xs,
    minHeight: touch.min,
    paddingHorizontal: space.md,
    borderRadius: radius.pill,
    backgroundColor: colors.surface,
    borderWidth: 2,
    borderColor: colors.border,
  },
  pressed: { backgroundColor: colors.surfaceSunken },
  title: { flex: 1 },
});
