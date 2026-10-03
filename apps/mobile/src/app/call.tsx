import { router } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { AppText } from '@/components/AppText';
import { LanguageBadge, ProviderBadge } from '@/components/Badges';
import { Button } from '@/components/Button';
import { CardGrid } from '@/components/CardGrid';
import { Icon, type IconName } from '@/components/Icon';
import { LearningCard } from '@/components/LearningCard';
import { PHASE_LOOK, TutorAvatar } from '@/components/TutorAvatar';
import { useTutor } from '@/hooks/useTutor';
import type { Copy } from '@/i18n/copy';
import { TOPIC_CARDS } from '@/nfc/cards';
import { colors, radius, space } from '@/theme/tokens';
import type { Caption, VoiceErrorKind, VoicePhase } from '@/voice/types';
import { useVoice } from '@/voice/VoiceProvider';

function phaseLabel(t: Copy, phase: VoicePhase, canHear: boolean): string {
  switch (phase) {
    case 'connecting':
      return t.phaseConnecting;
    case 'listening':
      return canHear ? t.phaseListening : t.phaseListeningPractice;
    case 'user_speaking':
      return t.phaseUserSpeaking;
    case 'thinking':
      return t.phaseThinking;
    case 'speaking':
      return t.phaseSpeaking;
    case 'error':
      return t.phaseError;
    default:
      return t.phaseEnded;
  }
}

function errorMessage(t: Copy, kind: VoiceErrorKind | null): string {
  switch (kind) {
    case 'mic_denied':
      return t.voiceMicDenied;
    case 'session':
      return t.voiceErrorSession;
    case 'agent_left':
      return t.voiceErrorAgentLeft;
    case 'unavailable':
      return t.voiceErrorUnavailable;
    default:
      return t.voiceErrorNetwork;
  }
}

/** Latest caption from each side, for the optional words-on-screen panel. */
function lastBy(captions: Caption[], speaker: Caption['speaker']) {
  for (let i = captions.length - 1; i >= 0; i--) if (captions[i].speaker === speaker) return captions[i];
  return null;
}

export default function CallScreen() {
  const { t, uiLang, draft } = useTutor();
  const voice = useVoice();
  const [showPictures, setShowPictures] = useState(false);
  const { phase, active, canHear, muted, kind, notice, provider, showCaptions } = voice;
  const look = PHASE_LOOK[phase];
  const endCall = voice.endCall;

  // Leaving this screen any way at all (End, back gesture, Android back,
  // browser back) hangs up. The deferred check ignores React's dev-only
  // StrictMode unmount/remount, which would otherwise end the call at once.
  const mounted = useRef(false);
  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
      setTimeout(() => {
        if (!mounted.current) endCall();
      }, 0);
    };
  }, [endCall]);

  const hangUp = () => {
    endCall();
    if (router.canGoBack()) router.back();
    else router.replace('/');
  };

  const agentCaption = lastBy(voice.captions, 'agent');
  const studentCaption = lastBy(voice.captions, 'student');
  const busy = phase === 'connecting' || phase === 'thinking';

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
      <View style={styles.topBar}>
        <View style={styles.badges}>
          {kind === 'simulated' && voice.voice === 'agora' ? (
            <View style={[styles.pill, styles.pillLive]}>
              <Icon name="waveform" size={16} color={colors.success} />
              <AppText variant="caption" color={colors.success} bold>
                {t.agoraVoice}
              </AppText>
            </View>
          ) : kind === 'simulated' ? (
            <View style={styles.pill}>
              <Icon name="flask" size={16} color={colors.warn} />
              <AppText variant="caption" color={colors.warn} bold>
                {t.practiceVoice}
              </AppText>
            </View>
          ) : kind === 'agora' ? (
            <View style={[styles.pill, styles.pillLive]}>
              <Icon name="waveform" size={16} color={colors.success} />
              <AppText variant="caption" color={colors.success} bold>
                {t.liveVoice}
              </AppText>
            </View>
          ) : null}
          {provider ? <ProviderBadge provider={provider} t={t} /> : null}
          <LanguageBadge t={t} language={draft.language} />
        </View>
        <Pressable
          onPress={() => voice.setShowCaptions(!showCaptions)}
          accessibilityRole="switch"
          accessibilityLabel={showCaptions ? t.captionsOff : t.captionsOn}
          accessibilityState={{ checked: showCaptions }}
          style={[styles.ccButton, showCaptions && styles.ccOn]}>
          <Icon
            name={showCaptions ? 'closed-caption' : 'closed-caption-outline'}
            size={30}
            color={showCaptions ? colors.onPrimary : colors.ink}
          />
        </Pressable>
      </View>

      <ScrollView contentContainerStyle={styles.scroll}>
        <View style={styles.stage}>
          <TutorAvatar
            style={draft.style}
            phase={phase}
            agentLevel={voice.agentLevel}
            studentLevel={voice.studentLevel}
            size={220}
          />
          <View style={[styles.phase, { backgroundColor: look.tint }]} accessibilityLiveRegion="polite">
            <Icon name={look.icon} size={30} color={look.color} />
            <AppText variant="title" color={colors.ink} style={styles.center}>
              {phaseLabel(t, phase, canHear)}
            </AppText>
          </View>
          {notice ? (
            <AppText variant="caption" color={colors.inkSoft} style={styles.center}>
              {notice === 'needs_build' ? t.noticeNeedsBuild : t.noticeNoBackend}
            </AppText>
          ) : null}
          {kind === 'simulated' && phase === 'listening' ? (
            <AppText variant="caption" color={colors.inkSoft} style={styles.center}>
              {t.practiceCantHear}
            </AppText>
          ) : null}
        </View>

        {showCaptions && (agentCaption || studentCaption) ? (
          <View style={styles.captions}>
            {studentCaption ? (
              <View style={styles.studentBubble}>
                <Icon name="account-voice" size={20} color={colors.success} />
                <AppText color={colors.ink} style={styles.flex}>
                  {studentCaption.text}
                </AppText>
              </View>
            ) : null}
            {agentCaption ? (
              <AppText variant="reading" selectable>
                {agentCaption.text}
              </AppText>
            ) : null}
          </View>
        ) : null}

        {phase === 'error' || (!active && phase === 'ended') ? (
          <View style={styles.after}>
            {phase === 'error' ? (
              <AppText color={colors.warn} style={styles.center}>
                {errorMessage(t, voice.error)}
              </AppText>
            ) : null}
            <Button label={t.callAgain} icon="phone" variant="call" onPress={() => voice.startCall()} />
            <Button label={t.goBack} icon="arrow-left" variant="secondary" size="md" onPress={hangUp} />
          </View>
        ) : (
          <>
            <View style={styles.controls}>
              <CallControl icon="tortoise" label={t.controlSimpler} disabled={busy} onPress={() => voice.control({ action: 'simpler' })} />
              <CallControl icon="replay" label={t.controlAgain} disabled={busy} onPress={() => voice.control({ action: 'repeat' })} />
              <CallControl
                icon="swap-horizontal"
                label={t.controlAnotherWay}
                disabled={busy}
                onPress={() => voice.control({ action: 'explain_differently' })}
              />
              {canHear ? (
                <CallControl
                  icon={muted ? 'microphone-off' : 'microphone'}
                  label={muted ? t.controlUnmute : t.controlMute}
                  active={muted}
                  onPress={voice.toggleMute}
                />
              ) : (
                <CallControl
                  icon="shape"
                  label={t.controlTopics}
                  active={showPictures}
                  onPress={() => setShowPictures((v) => !v)}
                />
              )}
            </View>

            {canHear ? (
              <Button
                label={t.controlTopics}
                icon="shape"
                variant="secondary"
                size="md"
                onPress={() => setShowPictures((v) => !v)}
              />
            ) : null}

            {showPictures ? (
              <CardGrid>
                {TOPIC_CARDS.map((card) => (
                  <LearningCard
                    key={card.code}
                    card={card}
                    lang={uiLang}
                    size="tile"
                    selected={draft.topic === card.topic}
                    onPress={() => voice.control({ action: 'set_topic', value: card.topic })}
                  />
                ))}
              </CardGrid>
            ) : null}
          </>
        )}
      </ScrollView>

      {active ? (
        <View style={styles.footer}>
          <Button label={t.controlEnd} icon="phone-hangup" variant="hangup" onPress={hangUp} />
        </View>
      ) : null}
    </SafeAreaView>
  );
}

function CallControl({
  icon,
  label,
  onPress,
  active,
  disabled,
}: {
  icon: IconName;
  label: string;
  onPress: () => void;
  active?: boolean;
  disabled?: boolean;
}) {
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled: !!disabled, selected: !!active }}
      style={({ pressed }) => [
        styles.control,
        active && styles.controlActive,
        pressed && styles.controlPressed,
        disabled && styles.controlDisabled,
      ]}>
      <Icon name={icon} size={34} color={active ? colors.onPrimary : colors.primary} />
      <AppText variant="caption" bold color={active ? colors.onPrimary : colors.ink} numberOfLines={2} style={styles.center}>
        {label}
      </AppText>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  flex: { flex: 1 },
  center: { textAlign: 'center' },
  topBar: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: space.sm,
    paddingHorizontal: space.lg,
    paddingTop: space.sm,
  },
  badges: { flex: 1, flexDirection: 'row', flexWrap: 'wrap', gap: space.xs },
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.xs,
    paddingHorizontal: space.md,
    paddingVertical: space.xs + 2,
    borderRadius: radius.pill,
    backgroundColor: colors.warnTint,
  },
  pillLive: { backgroundColor: colors.successTint },
  ccButton: {
    width: 56,
    height: 56,
    borderRadius: radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surface,
    borderWidth: 2,
    borderColor: colors.border,
  },
  ccOn: { backgroundColor: colors.primary, borderColor: colors.primaryLip },
  scroll: { padding: space.lg, gap: space.lg, paddingBottom: space.xxl },
  stage: { alignItems: 'center', gap: space.md },
  phase: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.sm,
    paddingHorizontal: space.lg,
    paddingVertical: space.sm,
    borderRadius: radius.pill,
  },
  captions: {
    gap: space.md,
    padding: space.lg,
    borderRadius: radius.lg,
    backgroundColor: colors.surface,
    borderWidth: 2,
    borderColor: colors.border,
  },
  studentBubble: {
    flexDirection: 'row',
    gap: space.sm,
    alignItems: 'flex-start',
    padding: space.md,
    borderRadius: radius.md,
    backgroundColor: colors.successTint,
  },
  after: { gap: space.md },
  controls: { flexDirection: 'row', gap: space.sm },
  control: {
    flex: 1,
    minHeight: 92,
    borderRadius: radius.md,
    borderWidth: 2,
    borderBottomWidth: 5,
    borderColor: colors.border,
    borderBottomColor: colors.borderStrong,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
    gap: space.xs,
    padding: space.xs,
  },
  controlActive: { backgroundColor: colors.primary, borderColor: colors.primaryLip, borderBottomColor: colors.primaryLip },
  controlPressed: { opacity: 0.8 },
  controlDisabled: { opacity: 0.45 },
  footer: {
    paddingHorizontal: space.lg,
    paddingVertical: space.md,
    backgroundColor: colors.bg,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
});
