import { router } from 'expo-router';
import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { AnswerView } from '@/components/AnswerView';
import { AppText } from '@/components/AppText';
import { LanguageBadge, ProviderBadge } from '@/components/Badges';
import { Button } from '@/components/Button';
import { DifficultySelector } from '@/components/DifficultySelector';
import { Icon, type IconName } from '@/components/Icon';
import { ScreenHeader } from '@/components/ScreenHeader';
import { ErrorState, LoadingState } from '@/components/StatusViews';
import { TeachingStyleSelector } from '@/components/TeachingStyleSelector';
import { useTutor } from '@/hooks/useTutor';
import { topicCard } from '@/nfc/cards';
import { FEATURES } from '@/services/config';
import { listenSupported } from '@/voice/listen';
import { useListen } from '@/voice/useListen';
import { colors, radius, space, TEXT_SCALES, touch } from '@/theme/tokens';

export default function ResultScreen() {
  const tutor = useTutor();
  const { t, status, response, error, lastRequest, answeredRequest, textScale } = tutor;

  // While re-asking, keep showing what is being asked; otherwise what was answered.
  const shown = status === 'loading' || status === 'error' ? lastRequest : (answeredRequest ?? lastRequest);
  const topic = topicCard(shown?.topic ?? null);
  const goHome = () => (router.canGoBack() ? router.back() : router.replace('/'));

  // Listen only for real answers: a mock request_id doesn't exist on the voice server.
  const listenEnabled =
    FEATURES.listen && listenSupported() && status === 'success' && !!response && response.provider !== 'mock';
  const listen = useListen(listenEnabled ? (response?.request_id ?? null) : null, listenEnabled);
  const [tappedFor, setTappedFor] = useState<string | null>(null);
  const listenTapped = !!response && tappedFor === response.request_id;

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
      <ScreenHeader
        backLabel={t.back}
        right={
          <TextSizeControl
            scale={textScale}
            onStep={tutor.stepTextScale}
            smallerLabel={t.textSmaller}
            biggerLabel={t.textBigger}
          />
        }
      />

      <ScrollView contentContainerStyle={styles.scroll}>
        {shown ? (
          <View style={styles.question} accessible accessibilityLabel={`${t.yourQuestion}: ${shown.question}`}>
            <Icon name={topic?.icon ?? 'chat-question'} size={28} color={colors.primary} />
            <View style={styles.flex}>
              <AppText variant="caption" color={colors.inkSoft}>
                {t.yourQuestion}
              </AppText>
              <AppText variant="heading">{shown.question}</AppText>
            </View>
          </View>
        ) : null}

        <View style={styles.badges}>
          <LanguageBadge t={t} />
          {status === 'success' && response ? <ProviderBadge provider={response.provider} t={t} /> : null}
        </View>

        {status === 'loading' ? (
          <LoadingState
            key={JSON.stringify(lastRequest)}
            t={t}
            onCancel={() => {
              tutor.cancel();
              // Nothing to fall back to on a first question: return to Ask.
              if (!response) goHome();
            }}
          />
        ) : null}

        {status === 'error' ? <ErrorState t={t} error={error} onRetry={tutor.retry} onBack={goHome} /> : null}

        {status === 'idle' ? (
          <View style={styles.empty}>
            <AppText variant="title">{t.nothingYet}</AppText>
            <Button label={t.goBack} icon="arrow-left" variant="secondary" onPress={goHome} />
          </View>
        ) : null}

        {status === 'success' && response ? (
          <>
            <AnswerView response={response} t={t} scale={textScale} />

            <View style={styles.adjust}>
              <View style={styles.adjustTitle}>
                <Icon name="tune-variant" size={22} color={colors.inkSoft} />
                <AppText variant="heading">{t.changeHow}</AppText>
              </View>
              <DifficultySelector
                compact
                value={answeredRequest?.difficulty ?? tutor.draft.difficulty}
                onChange={(difficulty) => tutor.reaskWith({ difficulty })}
              />
              <TeachingStyleSelector
                compact
                value={answeredRequest?.style ?? tutor.draft.style}
                onChange={(style) => tutor.reaskWith({ style })}
              />
            </View>

            <Button label={t.askAnother} icon="chat-plus" variant="secondary" size="md" onPress={goHome} />

            {__DEV__ && answeredRequest ? (
              <AppText variant="caption" color={colors.inkMuted}>
                [dev] sent: difficulty={answeredRequest.difficulty} · style={answeredRequest.style} · action=
                {answeredRequest.action} · topic={answeredRequest.topic ?? 'null'} · id={response.request_id}
              </AppText>
            ) : null}
          </>
        ) : null}
      </ScrollView>

      {status === 'success' ? (
        <View style={styles.footer}>
          <Button
            label={t.explainDifferently}
            icon="swap-horizontal"
            variant="accent"
            onPress={tutor.explainDifferently}
            style={styles.flex}
          />
          {/* Agora Listen (Kiev's voice server). Hidden unless enabled, supported and the answer is real. */}
          {listenEnabled ? (
            <Button
              label={
                listen.state === 'playing'
                  ? t.listenStop
                  : listen.state === 'preparing' && listenTapped
                    ? t.listenPreparing
                    : listen.state === 'error'
                      ? t.listenRetry
                      : t.listen
              }
              icon={listen.state === 'playing' ? 'stop' : 'volume-high'}
              variant="secondary"
              loading={listen.state === 'preparing' && listenTapped}
              onPress={() => {
                if (listen.state === 'playing') return listen.stop();
                setTappedFor(response?.request_id ?? null);
                listen.play();
              }}
              style={styles.listen}
            />
          ) : null}
        </View>
      ) : null}
    </SafeAreaView>
  );
}

function TextSizeControl({
  scale,
  onStep,
  smallerLabel,
  biggerLabel,
}: {
  scale: number;
  onStep: (direction: 1 | -1) => void;
  smallerLabel: string;
  biggerLabel: string;
}) {
  const atMin = scale === TEXT_SCALES[0];
  const atMax = scale === TEXT_SCALES[TEXT_SCALES.length - 1];
  const step = (direction: 1 | -1, label: string, icon: IconName, disabled: boolean) => (
    <Pressable
      onPress={() => onStep(direction)}
      disabled={disabled}
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled }}
      style={({ pressed }) => [styles.sizeButton, pressed && styles.sizePressed, disabled && styles.sizeDisabled]}>
      <Icon name={icon} size={direction === 1 ? 30 : 22} color={colors.ink} />
    </Pressable>
  );
  return (
    <View style={styles.sizeGroup}>
      {step(-1, smallerLabel, 'format-font-size-decrease', atMin)}
      {step(1, biggerLabel, 'format-font-size-increase', atMax)}
    </View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  flex: { flex: 1 },
  scroll: { padding: space.lg, paddingTop: space.sm, gap: space.lg, paddingBottom: space.xxl },
  question: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.md,
    padding: space.md,
    borderRadius: radius.md,
    backgroundColor: colors.primaryTint,
  },
  badges: { flexDirection: 'row', flexWrap: 'wrap', gap: space.sm },
  empty: { gap: space.lg, alignItems: 'stretch', paddingVertical: space.xl },
  adjust: {
    gap: space.lg,
    padding: space.lg,
    borderRadius: radius.lg,
    backgroundColor: colors.surfaceSunken,
  },
  adjustTitle: { flexDirection: 'row', alignItems: 'center', gap: space.sm },
  footer: {
    flexDirection: 'row',
    gap: space.sm,
    paddingHorizontal: space.lg,
    paddingVertical: space.md,
    backgroundColor: colors.bg,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  listen: { minWidth: 140 },
  sizeGroup: { flexDirection: 'row', gap: space.xs },
  sizeButton: {
    width: touch.min,
    height: touch.min,
    borderRadius: radius.pill,
    backgroundColor: colors.surface,
    borderWidth: 2,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sizePressed: { backgroundColor: colors.surfaceSunken },
  sizeDisabled: { opacity: 0.4 },
});
