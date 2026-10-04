import { router } from 'expo-router';
import { useMemo, useState } from 'react';
import { Pressable, ScrollView, SectionList, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { AppText } from '@/components/AppText';
import { ClaySurface } from '@/components/ClaySurface';
import { Icon } from '@/components/Icon';
import { LessonArtwork } from '@/components/LessonArtwork';
import { ScreenBackdrop } from '@/components/ScreenBackdrop';
import { ScreenHeader } from '@/components/ScreenHeader';
import { lessonsFor, lessonTitle, subjectInfo, subjectsFor, type Lesson } from '@/curriculum';
import { useTutor } from '@/hooks/useTutor';
import { useProfiles } from '@/profiles/ProfileProvider';
import { PASS_MARK } from '@/profiles/profileCard';
import { colors, layout, radius, shadow, space } from '@/theme/tokens';
import { speakLabel } from '@/voice/deviceSpeech';

const GRADES = [1, 2, 3, 4, 5, 6, 7, 8, 9];

/** Every DepEd Term 1 lesson for a grade, by subject and week, with both progress tracks. */
export default function LessonsScreen() {
  const { t, uiLang } = useTutor();
  const { active: student } = useProfiles();
  const [grade, setGrade] = useState(student?.grade ?? 1);
  const subjects = useMemo(() => subjectsFor(grade), [grade]);
  const [picked, setPicked] = useState<string | null>(null);
  const subject = picked && subjects.includes(picked) ? picked : subjects[0];

  const all = lessonsFor(grade);
  const read = new Set(student?.done ?? []);
  const passed = new Set(student?.passed ?? []);
  const readCount = all.filter((l) => read.has(l.id)).length;
  const passedCount = all.filter((l) => passed.has(l.id)).length;

  const sections = useMemo(() => {
    const byWeek = new Map<number, Lesson[]>();
    for (const lesson of all) {
      if (lesson.subject !== subject) continue;
      byWeek.set(lesson.week, [...(byWeek.get(lesson.week) ?? []), lesson]);
    }
    return [...byWeek.entries()].sort(([a], [b]) => a - b).map(([week, data]) => ({ week, data }));
  }, [all, subject]);

  return (
    <ScreenBackdrop>
      <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
        <ScreenHeader backLabel={t.back} title={t.lessonsTitle} />
        <SectionList
          sections={sections}
          keyExtractor={(lesson) => lesson.id}
          contentContainerStyle={styles.list}
          stickySectionHeadersEnabled={false}
          ListHeaderComponent={
            <View style={styles.top}>
              <AppText color={colors.inkSoft}>{t.lessonsIntro}</AppText>

              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chips}>
                {GRADES.map((g) => (
                  <Chip
                    key={g}
                    label={`${t.gradeTitle} ${g}`}
                    selected={g === grade}
                    onPress={() => {
                      setGrade(g);
                      speakLabel(`${t.gradeTitle} ${g}`);
                    }}
                  />
                ))}
              </ScrollView>

              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chips}>
                {subjects.map((s) => (
                  <Chip
                    key={s}
                    label={subjectInfo(s).label[uiLang]}
                    subject={s}
                    selected={s === subject}
                    onPress={() => {
                      setPicked(s);
                      speakLabel(subjectInfo(s).label[uiLang]);
                    }}
                  />
                ))}
              </ScrollView>

              {student ? (
                <ClaySurface tint="mint" radius={radius.md} style={styles.progress}>
                  <View accessible accessibilityLabel={`${readCount} ${t.lessonsRead}, ${passedCount} ${t.examsPassed}`} style={styles.progressInner}>
                    <Track icon="book-open-variant" color={colors.primary} label={t.lessonsRead} value={readCount} total={all.length} />
                    <Track icon="star" color={colors.star} label={t.examsPassed} value={passedCount} total={all.length} />
                  </View>
                </ClaySurface>
              ) : (
                <AppText variant="caption" color={colors.warn}>
                  {t.chooseStudentToSave}
                </AppText>
              )}
            </View>
          }
          renderSectionHeader={({ section }) => (
            <AppText variant="label" color={colors.inkSoft} style={styles.week}>
              {t.week} {section.week}
            </AppText>
          )}
          renderItem={({ item }) => (
            <LessonRow
              lesson={item}
              title={lessonTitle(item, uiLang)}
              read={read.has(item.id)}
              score={student?.scores[item.id]}
              onPress={() => router.push({ pathname: '/lesson', params: { id: item.id } })}
            />
          )}
        />
      </SafeAreaView>
    </ScreenBackdrop>
  );
}

function Chip({ label, selected, onPress, subject }: { label: string; selected: boolean; onPress: () => void; subject?: string }) {
  return (
    <Pressable onPress={onPress} accessibilityRole="radio" accessibilityState={{ checked: selected }} style={({ pressed }) => [styles.chip, pressed && styles.pressed]}>
      <ClaySurface selected={selected} intensity="subtle" radius={radius.pill} pointerEvents="none" style={StyleSheet.absoluteFill} />
      {subject ? <LessonArtwork subject={subject} size={28} /> : null}
      <AppText variant="label" color={colors.ink}>
        {label}
      </AppText>
    </Pressable>
  );
}

function Track({ icon, color, label, value, total }: { icon: Parameters<typeof Icon>[0]['name']; color: string; label: string; value: number; total: number }) {
  return (
    <View style={styles.track}>
      <Icon name={icon} size={22} color={color} />
      <View style={styles.flex}>
        <AppText variant="caption" color={colors.ink}>
          {value} / {total} {label}
        </AppText>
        <View style={styles.bar}>
          <View style={[styles.fill, { backgroundColor: color, width: `${total ? (value / total) * 100 : 0}%` }]} />
        </View>
      </View>
    </View>
  );
}

function LessonRow({ lesson, title, read, score, onPress }: { lesson: Lesson; title: string; read: boolean; score?: number; onPress: () => void }) {
  const passed = score !== undefined && score >= PASS_MARK;
  return (
    <Pressable onPress={onPress} accessibilityRole="button" accessibilityLabel={title} style={({ pressed }) => [styles.row, pressed && styles.pressed]}>
      <ClaySurface tint={passed ? 'mint' : undefined} intensity="subtle" radius={radius.md} pointerEvents="none" style={StyleSheet.absoluteFill} />
      <LessonArtwork lesson={lesson} size={52} />
      <View style={styles.flex}>
        <AppText variant="heading" color={colors.ink} numberOfLines={2}>
          {title}
        </AppText>
        <AppText variant="caption" color={colors.inkSoft} numberOfLines={2}>
          {lesson.competency.split('\n')[0]}
        </AppText>
      </View>
      <View style={styles.status}>
        <Icon name={read ? 'book-open-variant' : 'book-outline'} size={22} color={read ? colors.primary : colors.borderStrong} />
        <Icon name={passed ? 'star' : 'star-outline'} size={24} color={passed ? colors.star : colors.borderStrong} />
        {score !== undefined ? (
          <AppText variant="caption" color={colors.inkSoft}>
            {score}%
          </AppText>
        ) : null}
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: 'transparent' },
  flex: { flex: 1, minWidth: 0 },
  list: { padding: layout.screen, paddingTop: space.xs, paddingBottom: space.xxl },
  top: { gap: space.md, marginBottom: space.sm },
  chips: { gap: space.sm, paddingVertical: space.xs, paddingHorizontal: 2 },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.xs,
    minHeight: 44,
    paddingHorizontal: space.md,
    borderRadius: radius.pill,
  },
  progress: { padding: space.md },
  progressInner: { gap: space.sm },
  track: { flexDirection: 'row', alignItems: 'center', gap: space.sm },
  bar: { height: 10, borderRadius: 5, backgroundColor: colors.surfaceSunken, overflow: 'hidden', marginTop: 2 },
  fill: { height: 10, borderRadius: 5 },
  week: { marginTop: space.md, marginBottom: space.xs },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.md,
    padding: space.md,
    marginBottom: space.sm,
    borderRadius: radius.md,
    ...shadow.card,
  },
  status: { alignItems: 'center', gap: 2, minWidth: 40 },
  pressed: { opacity: 0.85, transform: [{ scale: 0.985 }] },
});
