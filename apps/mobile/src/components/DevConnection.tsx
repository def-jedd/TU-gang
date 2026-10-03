import { useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { checkHealth, type HealthResult } from '../services/api';
import { API_BASE_URL, VOICE_MODE } from '../services/config';
import { layout, radius, colors, space } from '../theme/tokens';
import { AppText } from './AppText';

/** Dev-only: which backend + voice engine this build uses, and whether it answers. */
export function DevConnection() {
  const [health, setHealth] = useState<HealthResult | null>(null);
  useEffect(() => {
    checkHealth().then(setHealth);
  }, []);

  const text =
    health === null
      ? 'checking…'
      : health.mode === 'mock'
        ? 'MOCK data (set EXPO_PUBLIC_API_BASE_URL to use the backend)'
        : health.ok
          ? `connected · provider: ${health.provider ?? '?'}`
          : `unreachable (${health.error})`;
  const dot = health?.mode === 'mock' ? colors.accent : health?.ok ? colors.success : colors.warn;

  return (
    <View style={styles.dev}>
      <View style={[styles.dot, { backgroundColor: dot }]} />
      <AppText variant="caption" color={colors.ink} style={styles.text}>
        [dev] {API_BASE_URL ?? 'no backend'} — {text} · voice: {VOICE_MODE}
      </AppText>
    </View>
  );
}

const styles = StyleSheet.create({
  dev: { flexDirection: 'row', alignItems: 'flex-start', gap: space.sm, paddingTop: space.md, borderTopWidth: layout.hairline, borderTopColor: colors.border },
  dot: { width: layout.dot, height: layout.dot, borderRadius: radius.pill, marginTop: space.sm },
  text: { flex: 1 },
});
