/**
 * Student profile cards: the NFC card IS the student's save file, so progress
 * moves between phones with no internet, server or account.
 *
 * Card text (one NDEF Text record), compact because cheap NTAG213 stickers
 * hold only ~137 bytes of text:
 *
 *   TUG2|<id>|<name>|<grade>|<avatar#>|<n>|<read bits>|<passed bits>|<extras>
 *
 * - Two SEPARATE progress tracks over the grade's DepEd lessons (in the order
 *   of data/curriculum/grade-N.json): lessons READ and exams PASSED. Each is a
 *   bitset in base64url, so all 173 Grade 1 lessons take 30 characters.
 *   <n> = how many lessons the grade had when written (a safety check).
 * - <extras> = finished things outside the grade's list (picture-card topics
 *   like "melting"; "!id" = passed). Dropped oldest-first if the card is full;
 *   the phone keeps everything.
 * - No passwords or real credentials: whoever holds the card is that
 *   student, like a library card. Nickname only, never a full name.
 * - TUG1 cards (older app) still load.
 *
 * Pure and dependency-free: unit-tested with node --test.
 */

export const CARD_PREFIX = 'TUG2';
const OLD_PREFIX = 'TUG1';

/** Picture identities a child can recognise without reading (icon names). */
export const AVATARS = [
  'cat', 'dog', 'rabbit', 'turtle', 'fish', 'bird', 'butterfly', 'bee',
  'flower', 'tree', 'star', 'moon-waning-crescent', 'weather-sunny', 'rocket', 'soccer', 'guitar-acoustic',
] as const;
export type Avatar = (typeof AVATARS)[number];

export type Profile = {
  id: string;
  name: string;
  grade: number; // 1-9
  avatar: Avatar;
  /** Lessons/topics READ (heard or went through), oldest first. */
  done: string[];
  /** Lessons whose exam was PASSED (score ≥ PASS_MARK), oldest first. */
  passed: string[];
  /** Best exam score per lesson, 0–100. Phone only (not on the card). */
  scores: Record<string, number>;
};

/** DepEd's passing mark. With 5 questions: 4 right passes, 3 doesn't. */
export const PASS_MARK = 75;

export const MAX_NAME = 12;
/** Text bytes usable on an NTAG213 after NDEF/text-record overhead. */
export const NTAG213_TEXT_BYTES = 130;

/** The grade's lesson ids in curriculum order (the bit positions). */
export type GradeLessons = (grade: number) => readonly string[];
const noLessons: GradeLessons = () => [];

const ID_CHARS = 'abcdefghijkmnpqrstuvwxyz23456789'; // no look-alikes
const LESSON_ID = /^[a-z0-9_-]{2,40}$/;

export function newProfileId(random: () => number = Math.random): string {
  let id = '';
  for (let i = 0; i < 8; i++) id += ID_CHARS[Math.floor(random() * ID_CHARS.length)];
  return id;
}

/** Nickname: separators and newlines removed, trimmed, max 12 characters. */
export function cleanName(name: string): string {
  return name.replace(/[|,\r\n]/g, ' ').replace(/\s+/g, ' ').trim().slice(0, MAX_NAME);
}

/** A profile with every field present (older saves had no exam tracking). */
export function normalizeProfile(p: Partial<Profile> & Pick<Profile, 'id' | 'name' | 'grade' | 'avatar'>): Profile {
  return {
    id: p.id,
    name: p.name,
    grade: p.grade,
    avatar: p.avatar,
    done: Array.isArray(p.done) ? p.done : [],
    passed: Array.isArray(p.passed) ? p.passed : [],
    scores: p.scores && typeof p.scores === 'object' ? p.scores : {},
  };
}

const utf8Length = (text: string) => {
  let bytes = 0;
  for (const ch of text) {
    const code = ch.codePointAt(0) ?? 0;
    bytes += code < 0x80 ? 1 : code < 0x800 ? 2 : code < 0x10000 ? 3 : 4;
  }
  return bytes;
};

// ---- bitsets <-> base64url (no Buffer/btoa: runs the same in Hermes and Node)

const B64 = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_';

export function bitsToText(positions: Iterable<number>): string {
  const bytes: number[] = [];
  for (const p of positions) {
    const i = p >> 3;
    while (bytes.length <= i) bytes.push(0);
    bytes[i] |= 1 << (p & 7);
  }
  let out = '';
  for (let i = 0; i < bytes.length; i += 3) {
    const n = (bytes[i] << 16) | ((bytes[i + 1] ?? 0) << 8) | (bytes[i + 2] ?? 0);
    const chars = i + 1 >= bytes.length ? 2 : i + 2 >= bytes.length ? 3 : 4;
    for (let c = 0; c < chars; c++) out += B64[(n >> (18 - 6 * c)) & 63];
  }
  return out;
}

export function textToBits(text: string): number[] | null {
  const values: number[] = [];
  for (const ch of text) {
    const v = B64.indexOf(ch);
    if (v < 0) return null;
    values.push(v);
  }
  const bytes: number[] = [];
  for (let i = 0; i < values.length; i += 4) {
    const group = values.slice(i, i + 4);
    if (group.length === 1) return null;
    const n = group.reduce((acc, v, k) => acc | (v << (18 - 6 * k)), 0);
    bytes.push((n >> 16) & 255);
    if (group.length > 2) bytes.push((n >> 8) & 255);
    if (group.length > 3) bytes.push(n & 255);
  }
  const positions: number[] = [];
  bytes.forEach((byte, i) => {
    for (let b = 0; b < 8; b++) if (byte & (1 << b)) positions.push(i * 8 + b);
  });
  return positions;
}

// ---- encode / decode

/**
 * Card text for a profile. Drops the oldest extras until it fits in
 * `maxBytes`; `dropped` says how many didn't fit (shown to the user).
 */
export function encodeProfileCard(
  profile: Profile,
  maxBytes = NTAG213_TEXT_BYTES,
  gradeLessons: GradeLessons = noLessons,
): { text: string; dropped: number } {
  const lessons = gradeLessons(profile.grade);
  const index = new Map(lessons.map((id, i) => [id, i]));
  const bits = (ids: string[]) => bitsToText(ids.flatMap((id) => (index.has(id) ? [index.get(id)!] : [])));
  const head = [
    CARD_PREFIX,
    profile.id,
    cleanName(profile.name),
    String(profile.grade),
    Math.max(0, AVATARS.indexOf(profile.avatar)).toString(36),
    lessons.length.toString(36),
    bits(profile.done),
    bits(profile.passed),
  ].join('|');

  // Newest last, so dropping from the front loses the oldest.
  let extras = [
    ...[...new Set(profile.done)].filter((id) => !index.has(id)),
    ...[...new Set(profile.passed)].filter((id) => !index.has(id)).map((id) => `!${id}`),
  ];
  let dropped = 0;
  let text = `${head}|${extras.join(',')}`;
  while (utf8Length(text) > maxBytes && extras.length > 0) {
    extras = extras.slice(1);
    dropped++;
    text = `${head}|${extras.join(',')}`;
  }
  if (utf8Length(text) > maxBytes) throw new Error('This card is too small for a profile');
  return { text, dropped };
}

/** Profile from card text, or null if it isn't a TU-gang profile card. Never throws. */
export function decodeProfileCard(text: string, gradeLessons: GradeLessons = noLessons): Profile | null {
  if (typeof text !== 'string') return null;
  const parts = text.trim().split('|');
  const isNew = parts[0] === CARD_PREFIX && parts.length >= 9;
  const isOld = parts[0] === OLD_PREFIX && parts.length >= 6;
  if (!isNew && !isOld) return null;

  const [, id, name, gradeText, avatarText] = parts;
  const grade = Number(gradeText);
  if (!/^[a-z0-9]{6,16}$/.test(id) || !Number.isInteger(grade) || grade < 1 || grade > 9) return null;
  const avatar = isNew ? AVATARS[parseInt(avatarText, 36)] : (AVATARS as readonly string[]).includes(avatarText) ? (avatarText as Avatar) : undefined;
  if (!avatar || (isNew && !/^[0-9a-f]$/.test(avatarText))) return null;

  const profile = normalizeProfile({ id, name: cleanName(name) || 'Student', grade, avatar });
  if (isOld) {
    profile.done = parts[5] ? parts[5].split(',').filter((d) => LESSON_ID.test(d)) : [];
    return profile;
  }

  const [, , , , , countText, readText, passedText, extrasText] = parts;
  const lessons = gradeLessons(grade);
  // Only trust the bits if this phone has the same lesson list as the writer.
  if (parseInt(countText, 36) === lessons.length) {
    const ids = (bitsText: string) => (textToBits(bitsText) ?? []).flatMap((p) => (p < lessons.length ? [lessons[p]] : []));
    profile.done = ids(readText);
    profile.passed = ids(passedText);
  }
  for (const item of extrasText ? extrasText.split(',') : []) {
    const passed = item.startsWith('!');
    const lesson = passed ? item.slice(1) : item;
    if (!LESSON_ID.test(lesson)) continue;
    (passed ? profile.passed : profile.done).push(lesson);
  }
  return profile;
}

export function isProfileCardText(text: string): boolean {
  if (typeof text !== 'string') return false;
  const t = text.trim();
  return t.startsWith(`${CARD_PREFIX}|`) || t.startsWith(`${OLD_PREFIX}|`);
}

const union = (a: string[], b: string[]) => [...new Set([...a, ...b])];

/**
 * Combine the phone's copy with the card's copy of the same student: both
 * progress tracks are unions (nothing learned is ever lost) and the best
 * scores are kept; name/grade/avatar come from the card (the newest identity).
 */
export function mergeProfiles(phone: Profile | undefined, card: Profile): Profile {
  if (!phone || phone.id !== card.id) return { ...card, done: union([], card.done), passed: union([], card.passed) };
  const scores = { ...card.scores };
  for (const [lesson, score] of Object.entries(phone.scores)) scores[lesson] = Math.max(score, scores[lesson] ?? 0);
  return { ...card, done: union(phone.done, card.done), passed: union(phone.passed, card.passed), scores };
}

/** Record a lesson READ (moves it to the end = most recent). */
export function markDone(profile: Profile, lesson: string): Profile {
  if (!LESSON_ID.test(lesson)) return profile;
  return { ...profile, done: [...profile.done.filter((d) => d !== lesson), lesson] };
}

/** Record an exam result (0–100). Keeps the best score; passing adds the lesson to `passed`. */
export function recordExam(profile: Profile, lesson: string, score: number): Profile {
  if (!LESSON_ID.test(lesson)) return profile;
  const best = Math.max(Math.round(score), profile.scores[lesson] ?? 0);
  const passed = best >= PASS_MARK ? [...profile.passed.filter((d) => d !== lesson), lesson] : profile.passed;
  return { ...profile, passed, scores: { ...profile.scores, [lesson]: best } };
}
