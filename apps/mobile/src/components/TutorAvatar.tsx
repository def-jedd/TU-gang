import { useEffect, useMemo, useState } from 'react';
import { AccessibilityInfo, Animated, Easing, StyleSheet, View } from 'react-native';

import { STYLE_CARDS } from '../nfc/cards';
import { category, colors } from '../theme/tokens';
import type { TeachingStyle } from '../types/tutor';
import type { VoicePhase } from '../voice/types';
import { Icon, type IconName } from './Icon';

/** One look per phase, shared by the avatar badge and the phase banner. */
export const PHASE_LOOK: Record<VoicePhase, { icon: IconName; color: string; tint: string }> = {
  idle: { icon: 'phone', color: colors.inkSoft, tint: colors.surfaceSunken },
  connecting: { icon: 'phone-ring', color: colors.inkSoft, tint: colors.surfaceSunken },
  listening: { icon: 'ear-hearing', color: colors.success, tint: colors.successTint },
  user_speaking: { icon: 'microphone', color: colors.success, tint: colors.successTint },
  thinking: { icon: 'dots-horizontal', color: colors.accentLip, tint: colors.accentTint },
  speaking: { icon: 'volume-high', color: colors.primary, tint: colors.primaryTint },
  ended: { icon: 'phone-hangup', color: colors.inkMuted, tint: colors.surfaceSunken },
  error: { icon: 'phone-off', color: colors.warn, tint: colors.warnTint },
};

/** Pulse speed (ms per half-beat) and size per phase: fast when talking, slow "breathing" when waiting. */
const PULSE: Partial<Record<VoicePhase, { ms: number; amp: number }>> = {
  connecting: { ms: 600, amp: 1.08 },
  listening: { ms: 1300, amp: 1.05 },
  thinking: { ms: 800, amp: 1.04 },
  speaking: { ms: 420, amp: 1.07 },
};

type Props = {
  style: TeachingStyle;
  phase: VoicePhase;
  agentLevel: Animated.Value;
  studentLevel: Animated.Value;
  size?: number;
};

/**
 * The tutor's "face" during a call. Language-free turn-taking: the halo
 * colour + badge say who's talking, and the halo swells with the actual
 * loudness of whoever is speaking (Agora volume events).
 */
export function TutorAvatar({ style, phase, agentLevel, studentLevel, size = 200 }: Props) {
  const [pulse] = useState(() => new Animated.Value(0));
  const [reduceMotion, setReduceMotion] = useState(false);
  const look = PHASE_LOOK[phase];
  const card = STYLE_CARDS.find((c) => c.value === style) ?? STYLE_CARDS[0];

  useEffect(() => {
    AccessibilityInfo.isReduceMotionEnabled().then(setReduceMotion);
  }, []);

  useEffect(() => {
    pulse.setValue(0);
    const beat = PULSE[phase];
    if (!beat || reduceMotion) return;
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, { toValue: 1, duration: beat.ms, easing: Easing.inOut(Easing.quad), useNativeDriver: true }),
        Animated.timing(pulse, { toValue: 0, duration: beat.ms, easing: Easing.inOut(Easing.quad), useNativeDriver: true }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [phase, pulse, reduceMotion]);

  const scale = useMemo(() => {
    const amp = PULSE[phase]?.amp ?? 1;
    const beat = pulse.interpolate({ inputRange: [0, 1], outputRange: [1, amp] });
    const level = phase === 'speaking' ? agentLevel : phase === 'user_speaking' ? studentLevel : null;
    if (!level || reduceMotion) return beat;
    const loud = level.interpolate({ inputRange: [0, 1], outputRange: [1, 1.35], extrapolate: 'clamp' });
    return Animated.multiply(beat, loud);
  }, [phase, pulse, agentLevel, studentLevel, reduceMotion]);

  const face = size * 0.72;
  const badge = size * 0.3;

  return (
    <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }} accessible={false}>
      <Animated.View
        style={[
          styles.halo,
          { width: size, height: size, borderRadius: size / 2, backgroundColor: look.tint, borderColor: look.color },
          { transform: [{ scale }] },
        ]}
      />
      <View
        style={[
          styles.face,
          {
            width: face,
            height: face,
            borderRadius: face / 2,
            backgroundColor: category.style.tint,
            borderColor: category.style.solid,
          },
        ]}>
        <Icon name={card.icon} size={face * 0.55} color={category.style.solid} />
      </View>
      <View
        style={[
          styles.badge,
          { width: badge, height: badge, borderRadius: badge / 2, backgroundColor: look.color },
        ]}>
        <Icon name={look.icon} size={badge * 0.55} color={colors.onPrimary} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  halo: { position: 'absolute', borderWidth: 4, opacity: 0.9 },
  face: { borderWidth: 4, alignItems: 'center', justifyContent: 'center' },
  badge: {
    position: 'absolute',
    right: '4%',
    bottom: '4%',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 4,
    borderColor: colors.bg,
  },
});
