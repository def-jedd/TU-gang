import { router } from 'expo-router';
import { useMemo, useState } from 'react';
import { Pressable, ScrollView, SectionList, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { AppText } from '@/components/AppText';
import { Icon } from '@/components/Icon';
import { ScreenHeader } from '@/components/ScreenHeader';
import { lessonIcon, lessonsFor, lessonTitle, subjectInfo, subjectsFor, type Lesson } from '@/curriculum';
import { useTutor } from '@/hooks/useTutor';
import { useProfiles } from '@/profiles/ProfileProvider';
import { PASS_MARK } from '@/profiles/profileCard';
import { colors, radius, space } from '@/theme/tokens';
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
              {subjects.map((s) => {
                const info = subjectInfo(s);
                return (
                  <Chip
                    key={s}
                    label={info.label[uiLang]}
                    icon={info.icon}
                    color={info.color}
                    selected={s === subject}
                    onPress={() => {
                      setPicked(s);
                      speakLabel(info.label[uiLang]);
                    }}
                  />
                );
              })}
            </ScrollView>

            {student ? (
              <View style={styles.progress} accessibilityLabel={`${readCount} ${t.lessonsRead}, ${passedCount} ${t.examsPassed}`}>
                <Track icon="book-open-variant" color={colors.primary} label={t.lessonsRead} value={readCount} total={all.length} />
                <Track icon="star" color="#B7791F" label={t.examsPassed} value={passedCount} total={all.length} />
              </View>
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
  );
}

function Chip({ label, selected, onPress, icon, color = colors.primary }: { label: string; selected: boolean; onPress: () => void; icon?: Parameters<typeof Icon>[0]['name']; color?: string }) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="radio"
      accessibilityState={{ checked: selected }}
      style={[styles.chip, { borderColor: color }, selected && { backgroundColor: color }]}>
      {icon ? <Icon name={icon} size={20} color={selected ? colors.onPrimary : color} /> : null}
      <AppText variant="label" color={selected ? colors.onPrimary : color}>
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
        <AppText variant="caption" color={colors.inkSoft}>
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
  const info = subjectInfo(lesson.subject);
  const passed = score !== undefined && score >= PASS_MARK;
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={title}
      style={({ pressed }) => [styles.row, pressed && styles.pressed]}>
      <View style={[styles.rowIcon, { backgroundColor: info.color }]}>
        <Icon name={lessonIcon(lesson)} size={26} color={colors.onPrimary} />
      </View>
      <View style={styles.flex}>
        <AppText variant="heading" numberOfLines={2}>
          {title}
        </AppText>
        <AppText variant="caption" color={colors.inkSoft} numberOfLines={2}>
          {lesson.competency.split('\n')[0]}
        </AppText>
      </View>
      <View style={styles.status}>
        <Icon name={read ? 'book-open-variant' : 'book-outline'} size={22} color={read ? colors.primary : colors.border} />
        <Icon name={passed ? 'star' : 'star-outline'} size={24} color={passed ? '#B7791F' : colors.border} />
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
  safe: { flex: 1, backgroundColor: colors.bg },
  flex: { flex: 1 },
  list: { padding: space.lg, paddingTop: space.sm, gap: space.sm, paddingBottom: space.xxl },
  top: { gap: space.md, marginBottom: space.sm },
  chips: { gap: space.sm, paddingVertical: 2 },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.xs,
    paddingHorizontal: space.md,
    paddingVertical: space.sm,
    borderRadius: radius.pill,
    borderWidth: 2,
    backgroundColor: colors.surface,
  },
  progress: { gap: space.sm, padding: space.md, borderRadius: radius.md, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border },
  track: { flexDirection: 'row', alignItems: 'center', gap: space.sm },
  bar: { height: 8, borderRadius: 4, backgroundColor: colors.border, overflow: 'hidden', marginTop: 2 },
  fill: { height: 8, borderRadius: 4 },
  week: { marginTop: space.md, marginBottom: space.xs },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.md,
    padding: space.md,
    marginBottom: space.sm,
    borderRadius: radius.md,
    backgroundColor: colors.surface,
    borderWidth: 2,
    borderColor: colors.border,
  },
  rowIcon: { width: 48, height: 48, borderRadius: 24, alignItems: 'center', justifyContent: 'center' },
  status: { alignItems: 'center', gap: 2, minWidth: 40 },
  pressed: { opacity: 0.85 },
});
