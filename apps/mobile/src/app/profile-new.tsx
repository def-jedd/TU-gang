import { ClaySurface } from '@/components/ClaySurface';
import { ScreenBackdrop } from '@/components/ScreenBackdrop';
import { router } from 'expo-router';
import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { AppText } from '@/components/AppText';
import { Button } from '@/components/Button';
import { AvatarIcon } from '@/components/AvatarIcon';
import { ScreenHeader } from '@/components/ScreenHeader';
import { SpeakableTitle } from '@/components/SpeakableTitle';
import { useTutor } from '@/hooks/useTutor';
import { AVATARS, MAX_NAME, type Avatar } from '@/profiles/profileCard';
import { useProfiles } from '@/profiles/ProfileProvider';
import { layout, category, colors, fonts, typeScale, radius, space } from '@/theme/tokens';
import { speakLabel } from '@/voice/deviceSpeech';

const GRADES = [1, 2, 3, 4, 5, 6, 7, 8, 9];

/**
 * New student: a parent, sibling or teacher types the nickname; the child
 * picks their grade and picture (big buttons that say themselves aloud).
 */
export default function NewProfileScreen() {
  const { t } = useTutor();
  const { create } = useProfiles();
  const [name, setName] = useState('');
  const [grade, setGrade] = useState<number | null>(null);
  const [avatar, setAvatar] = useState<Avatar>(AVATARS[0]);
  const ready = name.trim().length > 0 && grade !== null;

  const submit = () => {
    if (!ready) return;
    const profile = create({ name, grade, avatar });
    // Straight to "hold the card to the phone" for this student.
    // Back to the Students screen (not a second copy of it).
    router.dismissTo({ pathname: '/profiles', params: { write: profile.id } });
  };

  return (
    <ScreenBackdrop><SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
      <ScreenHeader backLabel={t.back} title={t.newStudent} />
      <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
        <View style={styles.group}>
          <AppText variant="label" color={colors.inkSoft} nativeID="nickname-label">
            {t.nicknameLabel}
          </AppText>
          <TextInput
            value={name}
            onChangeText={setName}
            maxLength={MAX_NAME}
            autoCapitalize="words"
            autoCorrect={false}
            accessibilityLabel={t.nicknameLabel}
            accessibilityLabelledBy="nickname-label"
            style={styles.input}
          />
        </View>

        <View style={styles.group}>
          <SpeakableTitle text={t.gradeTitle} hearLabel={t.hearThis} icon="school" iconColor={category.level.ink} />
          <View style={styles.grid}>
            {GRADES.map((g) => {
              const selected = grade === g;
              return (
                <Pressable
                  key={g}
                  onPress={() => {
                    setGrade(g);
                    speakLabel(`${t.gradeTitle} ${g}`);
                  }}
                  accessibilityRole="radio"
                  accessibilityLabel={`${t.gradeTitle} ${g}`}
                  accessibilityState={{ checked: selected }}
                  style={[styles.gradeButton, selected && styles.gradeSelected]}>
                  <AppText variant="display" color={colors.ink}>
                    {g}
                  </AppText>
                </Pressable>
              );
            })}
          </View>
        </View>

        <View style={styles.group}>
          <SpeakableTitle text={t.avatarTitle} hearLabel={t.hearThis} icon="emoticon-happy-outline" iconColor={category.style.ink} />
          <View style={styles.grid}>
            {AVATARS.map((a) => {
              const selected = avatar === a;
              return (
                <Pressable
                  key={a}
                  onPress={() => setAvatar(a)}
                  accessibilityRole="radio"
                  accessibilityLabel={a.replace(/-/g, ' ')}
                  accessibilityState={{ checked: selected }}
                  style={[styles.avatarButton, selected && styles.avatarSelected]}>
                  <ClaySurface selected={selected} intensity="subtle" radius={radius.pill} style={StyleSheet.absoluteFill} pointerEvents="none" />
                  <AvatarIcon avatar={a} size={36} color={colors.primary} />
                </Pressable>
              );
            })}
          </View>
        </View>
      </ScrollView>
      <ClaySurface style={styles.footer}>
        <Button label={t.createStudent} icon="account-plus" onPress={submit} disabled={!ready} />
      </ClaySurface>
    </SafeAreaView></ScreenBackdrop>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: 'transparent' },
  scroll: { padding: layout.screen, paddingTop: space.sm, gap: space.xl, paddingBottom: space.xxl },
  group: { gap: space.sm },
  input: {
    fontFamily: fonts.body,
    fontSize: typeScale.body.fontSize,
    color: colors.ink,
    backgroundColor: 'transparent',
    borderWidth: layout.border,
    borderColor: colors.borderStrong,
    borderRadius: radius.md,
    paddingHorizontal: layout.screen,
    paddingVertical: space.md,
  },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: space.sm },
  gradeButton: {
    width: 64,
    height: 64,
    borderRadius: radius.md,
    borderWidth: layout.border,
    borderBottomWidth: 0,
    borderColor: colors.border,
    backgroundColor: 'transparent',
    alignItems: 'center',
    justifyContent: 'center',
  },
  gradeSelected: { backgroundColor: 'transparent', borderColor: 'transparent' },
  avatarButton: {
    width: 64,
    height: 64,
    borderRadius: 32,
    borderWidth: layout.border,
    borderColor: colors.border,
    backgroundColor: 'transparent',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarSelected: { backgroundColor: 'transparent', borderColor: 'transparent' },
  footer: {
    paddingHorizontal: space.lg,
    paddingVertical: space.md,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    backgroundColor: 'transparent',
  },
});
