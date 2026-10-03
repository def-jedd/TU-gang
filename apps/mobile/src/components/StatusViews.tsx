import { ClaySurface } from './ClaySurface';
import { useEffect, useState } from 'react';
import { AccessibilityInfo, Animated, Easing, StyleSheet, View } from 'react-native';

import type { Copy } from '../i18n/copy';
import type { TutorError } from '../services/errors';
import { layout, colors, radius, space } from '../theme/tokens';
import { AppText } from './AppText';
import { Button } from './Button';
import { Icon } from './Icon';

const SLOW_AFTER_MS = 8_000;

/**
 * Non-blocking loading state. The rest of the screen stays usable, and after
 * a few seconds we explain the wait and offer a way out instead of leaving
 * the student staring at a spinner.
 */
export function LoadingState({ t, onCancel }: { t: Copy; onCancel: () => void }) {
  const [pulse] = useState(() => new Animated.Value(0));
  const [slow, setSlow] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setSlow(true), SLOW_AFTER_MS);
    let loop: Animated.CompositeAnimation | null = null;
    let unmounted = false;
    AccessibilityInfo.isReduceMotionEnabled().then((reduce) => {
      if (reduce || unmounted) return;
      loop = Animated.loop(
        Animated.sequence([
          Animated.timing(pulse, { toValue: 1, duration: 700, easing: Easing.out(Easing.quad), useNativeDriver: true }),
          Animated.timing(pulse, { toValue: 0, duration: 700, easing: Easing.in(Easing.quad), useNativeDriver: true }),
        ]),
      );
      loop.start();
    });
    return () => {
      unmounted = true;
      clearTimeout(timer);
      loop?.stop();
    };
  }, [pulse]);

  const scale = pulse.interpolate({ inputRange: [0, 1], outputRange: [1, 1.12] });

  return (
    <View style={styles.wrap} accessibilityLiveRegion="polite" accessibilityRole="progressbar" accessibilityLabel={t.thinking}>
      <View style={styles.center}>
        <Animated.View style={[styles.bubble, { transform: [{ scale }] }]}>
          <Icon name="lightbulb-on" size={44} color={colors.onAccent} />
        </Animated.View>
        <AppText variant="title">{t.thinking}</AppText>
        {slow ? (
          <AppText color={colors.inkSoft} style={styles.centerText}>
            {t.thinkingSlow}
          </AppText>
        ) : null}
      </View>

      {/* Skeleton in the shape of the answer, so the layout doesn't jump when it lands. */}
      <ClaySurface style={styles.skeleton}>
        <View style={[styles.bar, { width: '92%' }]} />
        <View style={[styles.bar, { width: '84%' }]} />
        <View style={[styles.bar, { width: '68%' }]} />
      </ClaySurface>

      {slow ? <Button label={t.cancel} icon="close" variant="secondary" size="md" onPress={onCancel} /> : null}
    </View>
  );
}

function errorMessage(t: Copy, error: TutorError | null) {
  switch (error?.kind) {
    case 'timeout':
      return t.errorTimeout;
    case 'server':
      return t.errorServer;
    case 'bad_response':
      return t.errorBadResponse;
    default:
      return t.errorNetwork;
  }
}

export function ErrorState({
  t,
  error,
  onRetry,
  onBack,
}: {
  t: Copy;
  error: TutorError | null;
  onRetry: () => void;
  onBack: () => void;
}) {
  return (
    <View style={styles.wrap} accessibilityLiveRegion="assertive">
      <View style={styles.center}>
        <View style={[styles.bubble, styles.bubbleWarn]}>
          <Icon name={error?.kind === 'network' ? 'wifi-off' : 'cloud-alert'} size={44} color={colors.warn} />
        </View>
        <AppText variant="title" style={styles.centerText}>
          {t.errorTitle}
        </AppText>
        <AppText color={colors.inkSoft} style={styles.centerText}>
          {errorMessage(t, error)}
        </AppText>
        {__DEV__ && error ? (
          <AppText variant="caption" color={colors.inkMuted} style={styles.centerText}>
            [dev] {error.kind}
            {error.status ? ` ${error.status}` : ''}: {error.message}
          </AppText>
        ) : null}
      </View>
      <Button label={t.tryAgain} icon="refresh" onPress={onRetry} />
      <Button label={t.goBack} icon="arrow-left" variant="secondary" size="md" onPress={onBack} />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: space.lg, paddingVertical: space.lg },
  center: { alignItems: 'center', gap: space.sm },
  centerText: { textAlign: 'center' },
  bubble: {
    width: 88,
    height: 88,
    borderRadius: 44,
    backgroundColor: colors.accent,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: space.sm,
  },
  bubbleWarn: { backgroundColor: colors.warnTint },
  skeleton: {
    gap: space.md,
    padding: space.lg,
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: layout.border,
    borderColor: colors.border,
  },
  bar: { height: 18, borderRadius: 9, backgroundColor: colors.surfaceSunken },
});
