/**
 * DepEd Term 1 lessons (Grades 1–9), bundled so the lesson list works with no
 * internet. Source: data/curriculum/grade-N.json (official Budgets of Work,
 * competencies word for word). Rebuild with scripts/build_mobile_curriculum.py.
 *
 * The ORDER of each grade's list is the bit order on profile cards
 * (profiles/profileCard.ts), so only ever append lessons.
 */
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';

import type { IconName } from '../components/Icon';
import type { UiLang } from '../i18n/copy';
import term1 from './term1.json';

export type Lesson = {
  id: string;
  subject: string;
  week: number;
  /** DepEd competency, word for word (may contain "a." sub-items on new lines). */
  competency: string;
  topic: string | null;
  title: { en?: string; tl?: string; bik?: string };
  /** A child-friendly question about the lesson (drafted by the team). */
  question: string | null;
  icon: string | null;
};

const GRADES = (term1 as { grades: Record<string, Lesson[]> }).grades;

export function lessonsFor(grade: number): readonly Lesson[] {
  return GRADES[String(grade)] ?? [];
}

const IDS = new Map<number, readonly string[]>();
/** Lesson ids in curriculum order: the profile card's bit positions. */
export function lessonIds(grade: number): readonly string[] {
  let ids = IDS.get(grade);
  if (!ids) IDS.set(grade, (ids = lessonsFor(grade).map((l) => l.id)));
  return ids;
}

const BY_ID = new Map<string, Lesson>();
for (const list of Object.values(GRADES)) for (const lesson of list) BY_ID.set(lesson.id, lesson);

export function lessonById(id: string): Lesson | null {
  return BY_ID.get(id) ?? null;
}

export function gradeOf(lessonId: string): number | null {
  const match = lessonId.match(/^g(\d)-/);
  return match ? Number(match[1]) : null;
}

/** Next lesson in the same grade (curriculum order), for "Ways forward". */
export function nextLesson(id: string): Lesson | null {
  const grade = gradeOf(id);
  if (!grade) return null;
  const list = lessonsFor(grade);
  const i = list.findIndex((l) => l.id === id);
  return i >= 0 && i + 1 < list.length ? list[i + 1] : null;
}

export function lessonTitle(lesson: Lesson, lang: UiLang): string {
  return (lang === 'bik' ? lesson.title.bik : undefined) || lesson.title.en || lesson.competency.split('\n')[0];
}

export type SubjectInfo = { label: Record<UiLang, string>; icon: IconName; color: string };

// Bikol labels are drafts pending native review.
export const SUBJECTS: Record<string, SubjectInfo> = {
  reading_literacy: { label: { en: 'Reading', bik: 'Pagbasa' }, icon: 'book-open-page-variant', color: '#1D5FB4' },
  language: { label: { en: 'Language', bik: 'Tataramon' }, icon: 'alphabetical-variant', color: '#6D3FB0' },
  english: { label: { en: 'English', bik: 'English' }, icon: 'alphabet-latin', color: '#6D3FB0' },
  filipino: { label: { en: 'Filipino', bik: 'Filipino' }, icon: 'flag-variant', color: '#B4235F' },
  mathematics: { label: { en: 'Math', bik: 'Matematika' }, icon: 'calculator-variant', color: '#C2410C' },
  science: { label: { en: 'Science', bik: 'Siyensya' }, icon: 'flask', color: '#2F7D32' },
  makabansa: { label: { en: 'Makabansa', bik: 'Makabansa' }, icon: 'map-marker-radius', color: '#0F766E' },
  araling_panlipunan: { label: { en: 'Social Studies', bik: 'Araling Panlipunan' }, icon: 'earth', color: '#0F766E' },
  gmrc_values: { label: { en: 'Values (GMRC)', bik: 'GMRC' }, icon: 'hand-heart', color: '#B4235F' },
  epp_tle: { label: { en: 'EPP / TLE', bik: 'EPP / TLE' }, icon: 'tools', color: '#7C5A12' },
  mapeh: { label: { en: 'MAPEH', bik: 'MAPEH' }, icon: 'music', color: '#7C5A12' },
};

export function subjectInfo(subject: string): SubjectInfo {
  return SUBJECTS[subject] ?? { label: { en: subject, bik: subject }, icon: 'book', color: '#475569' };
}

/** The lesson's own icon if it's a real icon name, else its subject's. */
export function lessonIcon(lesson: Lesson): IconName {
  const glyphs = MaterialCommunityIcons.glyphMap as Record<string, number>;
  return lesson.icon && lesson.icon in glyphs ? (lesson.icon as IconName) : subjectInfo(lesson.subject).icon;
}

/** Subjects in the order they appear in the grade's list. */
export function subjectsFor(grade: number): string[] {
  return [...new Set(lessonsFor(grade).map((l) => l.subject))];
}
