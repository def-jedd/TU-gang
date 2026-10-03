import type { Lesson } from '../curriculum';
import { SheetArtwork, type SheetAssetName } from './SheetArtwork';

/** Each DepEd subject's picture from the clay asset sheet, so a child knows the subject without reading. */
const SUBJECT_ART: Record<string, SheetAssetName> = {
  reading_literacy: 'icon-language',
  language: 'icon-language',
  english: 'icon-language',
  filipino: 'icon-language',
  mathematics: 'icon-math',
  science: 'icon-science',
  makabansa: 'icon-history',
  araling_panlipunan: 'icon-history',
  gmrc_values: 'icon-life-skills',
  epp_tle: 'icon-technology',
  mapeh: 'icon-arts',
};

export function subjectArt(subject: string): SheetAssetName {
  return SUBJECT_ART[subject] ?? 'icon-general';
}

export function LessonArtwork({ lesson, subject, size = 56 }: { lesson?: Lesson; subject?: string; size?: number }) {
  return <SheetArtwork name={subjectArt(lesson?.subject ?? subject ?? '')} width={size} height={size} />;
}
