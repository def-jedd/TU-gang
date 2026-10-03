import { ClaySurface } from '@/components/ClaySurface';
import { ScreenBackdrop } from '@/components/ScreenBackdrop';
import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { AppText } from '@/components/AppText';
import { Button } from '@/components/Button';
import { Icon } from '@/components/Icon';
import { ScreenHeader } from '@/components/ScreenHeader';
import { StudentAvatar } from '@/components/StudentAvatar';
import { useTutor } from '@/hooks/useTutor';
import { useNfc } from '@/nfc/NfcProvider';
import { lessonIds } from '@/curriculum';
import { encodeProfileCard, type Profile } from '@/profiles/profileCard';
import { useProfiles } from '@/profiles/ProfileProvider';
import { layout, colors, radius, space } from '@/theme/tokens';

type WriteState = { profileId: string; phase: 'waiting' | 'saved' | 'partly' | 'error'; message?: string } | null;

/** Students on this phone; save each one's progress to their NFC card. */
export default function ProfilesScreen() {
  const { t } = useTutor();
  const { profiles, active, setActive, remove } = useProfiles();
  const nfc = useNfc();
  const [write, setWrite] = useState<WriteState>(null);
  const { write: writeParam } = useLocalSearchParams<{ write?: string }>();
  const autoStarted = useRef(false);

  const canWrite = nfc.availability === 'ready';

  const saveToCard = async (profile: Profile) => {
    if (!canWrite) {
      Alert.alert(t.saveToCard, t.writeNeedsNfc);
      return;
    }
    setWrite({ profileId: profile.id, phase: 'waiting' });
    let dropped = 0;
    const result = await nfc.writeCardText((maxTextBytes) => {
      const encoded = encodeProfileCard(profile, maxTextBytes, lessonIds);
      dropped = encoded.dropped;
      return encoded.text;
    });
    if (result.ok) setWrite({ profileId: profile.id, phase: dropped > 0 ? 'partly' : 'saved' });
    else if (result.error === 'cancelled') setWrite(null);
    else setWrite({ profileId: profile.id, phase: 'error', message: result.error === 'too_small' ? t.cardTooSmall : t.cardWriteFailed });
  };

  // Right after creating a student, go straight to "hold the card" once.
  useEffect(() => {
    if (!writeParam || autoStarted.current) return;
    const profile = profiles.find((p) => p.id === writeParam);
    if (!profile) return;
    autoStarted.current = true;
    saveToCard(profile);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [writeParam, profiles]);

  const confirmRemove = (profile: Profile) =>
    Alert.alert(profile.name, t.removeConfirm, [
      { text: t.cancel, style: 'cancel' },
      { text: t.removeStudent, style: 'destructive', onPress: () => remove(profile.id) },
    ]);

  return (
    <ScreenBackdrop><SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
      <ScreenHeader backLabel={t.back} title={t.profilesTitle} />
      <ScrollView contentContainerStyle={styles.scroll}>
        <AppText color={colors.inkSoft}>{t.profilesIntro}</AppText>

        {profiles.length === 0 ? <AppText variant="heading">{t.noStudents}</AppText> : null}

        {profiles.map((profile) => {
          const isActive = active?.id === profile.id;
          return (
            <ClaySurface selected={isActive} key={profile.id} style={[styles.card, isActive && styles.cardActive]}>
              <View style={styles.row}>
                <Pressable
                  onPress={() => {
                    setActive(profile.id);
                    router.dismissTo('/'); // straight back Home as this student
                  }}
                  accessibilityRole="button"
                  accessibilityLabel={`${profile.name}, ${t.gradeTitle} ${profile.grade}`}
                  style={[styles.row, styles.flex]}>
                  <StudentAvatar avatar={profile.avatar} />
                  <View style={styles.flex}>
                    <AppText variant="title">{profile.name}</AppText>
                    <AppText color={colors.inkSoft}>
                      {t.gradeTitle} {profile.grade} · 📖 {profile.done.length} {t.lessonsRead} · ★ {profile.passed.length} {t.examsPassed}
                    </AppText>
                    {isActive ? (
                      <AppText variant="caption" bold color={colors.success}>
                        {t.activeStudent}
                      </AppText>
                    ) : null}
                  </View>
                </Pressable>
                <Pressable onPress={() => confirmRemove(profile)} accessibilityRole="button" accessibilityLabel={t.removeStudent} hitSlop={10} style={styles.remove}>
                  <Icon name="delete-outline" size={26} color={colors.inkMuted} />
                </Pressable>
              </View>
              <Button label={t.saveToCard} icon="nfc-variant" variant="secondary" size="md" onPress={() => saveToCard(profile)} />
            </ClaySurface>
          );
        })}

        <Button label={t.newStudent} icon="account-plus" onPress={() => router.push('/profile-new')} />
      </ScrollView>

      {write ? (
        <View style={styles.overlay} accessibilityLiveRegion="assertive">
          <ClaySurface style={styles.sheet}>
            <Icon
              name={write.phase === 'waiting' ? 'nfc-tap' : write.phase === 'error' ? 'alert-circle-outline' : 'check-circle'}
              size={72}
              color={write.phase === 'error' ? colors.warn : write.phase === 'waiting' ? colors.primary : colors.success}
            />
            <AppText variant="title" style={styles.center}>
              {write.phase === 'waiting'
                ? t.holdCard
                : write.phase === 'saved'
                  ? t.cardSaved
                  : write.phase === 'partly'
                    ? t.cardSavedPartly
                    : write.message}
            </AppText>
            {write.phase === 'waiting' ? (
              <Button label={t.cancel} icon="close" variant="secondary" size="md" onPress={nfc.cancelWrite} />
            ) : (
              <Button label="OK" icon="check" size="md" onPress={() => setWrite(null)} />
            )}
          </ClaySurface>
        </View>
      ) : null}
    </SafeAreaView></ScreenBackdrop>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: 'transparent' },
  flex: { flex: 1 },
  center: { textAlign: 'center' },
  scroll: { padding: layout.screen, paddingTop: space.sm, gap: space.lg, paddingBottom: space.xxl },
  card: {
    gap: space.md,
    padding: space.lg,
    borderRadius: radius.lg,
    borderWidth: layout.border,
    borderColor: colors.border,
    backgroundColor: 'transparent',
  },
  cardActive: { borderColor: colors.primary, backgroundColor: 'transparent' },
  row: { flexDirection: 'row', alignItems: 'center', gap: space.md },
  remove: { padding: space.xs },
  overlay: {
    position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
    backgroundColor: 'rgba(30,36,51,0.55)',
    justifyContent: 'center',
    padding: space.xl,
  },
  sheet: {
    backgroundColor: 'transparent',
    borderRadius: radius.lg,
    padding: space.xl,
    gap: space.lg,
    alignItems: 'center',
  },
});
