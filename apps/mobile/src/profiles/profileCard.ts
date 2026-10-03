/**
 * Student profile cards: the NFC card IS the student's save file, so progress
 * moves between phones with no internet, server or account.
 *
 * Card text (one NDEF Text record), compact because cheap NTAG213 stickers
 * hold only ~137 bytes of text:
 *
 *   TUG1|<id>|<name>|<grade>|<avatar>|<done,done,...>
 *
 * - No passwords or real credentials: whoever holds the card is that
 *   student, like a library card. Nickname only, never a full name.
 * - <done> = lessons completed (topic or curriculum ids). If the card is too
 *   small, the OLDEST lessons are dropped from the card (the phone keeps all).
 *
 * Pure and dependency-free: unit-tested with node --test.
 */

export const CARD_PREFIX = 'TUG1';

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
  done: string[]; // lessons completed, oldest first
};

export const MAX_NAME = 12;
/** Text bytes usable on an NTAG213 after NDEF/text-record overhead. */
export const NTAG213_TEXT_BYTES = 130;

const ID_CHARS = 'abcdefghijkmnpqrstuvwxyz23456789'; // no look-alikes

export function newProfileId(random: () => number = Math.random): string {
  let id = '';
  for (let i = 0; i < 8; i++) id += ID_CHARS[Math.floor(random() * ID_CHARS.length)];
  return id;
}

/** Nickname: separators and newlines removed, trimmed, max 12 characters. */
export function cleanName(name: string): string {
  return name.replace(/[|,\r\n]/g, ' ').replace(/\s+/g, ' ').trim().slice(0, MAX_NAME);
}

const utf8Length = (text: string) => {
  let bytes = 0;
  for (const ch of text) {
    const code = ch.codePointAt(0) ?? 0;
    bytes += code < 0x80 ? 1 : code < 0x800 ? 2 : code < 0x10000 ? 3 : 4;
  }
  return bytes;
};

/**
 * Card text for a profile. Drops the oldest lessons until it fits in
 * `maxBytes`; `dropped` says how many didn't fit (shown to the user).
 */
export function encodeProfileCard(profile: Profile, maxBytes = NTAG213_TEXT_BYTES): { text: string; dropped: number } {
  const head = [CARD_PREFIX, profile.id, cleanName(profile.name), String(profile.grade), profile.avatar].join('|');
  let done = [...new Set(profile.done)];
  let dropped = 0;
  let text = `${head}|${done.join(',')}`;
  while (utf8Length(text) > maxBytes && done.length > 0) {
    done = done.slice(1);
    dropped++;
    text = `${head}|${done.join(',')}`;
  }
  if (utf8Length(text) > maxBytes) throw new Error('This card is too small for a profile');
  return { text, dropped };
}

/** Profile from card text, or null if it isn't a TU-gang profile card. Never throws. */
export function decodeProfileCard(text: string): Profile | null {
  if (typeof text !== 'string') return null;
  const parts = text.trim().split('|');
  if (parts[0] !== CARD_PREFIX || parts.length < 6) return null;
  const [, id, name, gradeText, avatar, doneText] = parts;
  const grade = Number(gradeText);
  if (!/^[a-z0-9]{6,16}$/.test(id) || !Number.isInteger(grade) || grade < 1 || grade > 9) return null;
  if (!(AVATARS as readonly string[]).includes(avatar)) return null;
  return {
    id,
    name: cleanName(name) || 'Student',
    grade,
    avatar: avatar as Avatar,
    done: doneText ? doneText.split(',').filter((d) => /^[a-z0-9_-]{2,40}$/.test(d)) : [],
  };
}

export function isProfileCardText(text: string): boolean {
  return typeof text === 'string' && text.trim().startsWith(`${CARD_PREFIX}|`);
}

/**
 * Combine the phone's copy with the card's copy of the same student: lessons
 * are the union (nothing learned is ever lost); name/grade/avatar come from
 * the card (the student carries the newest identity).
 */
export function mergeProfiles(phone: Profile | undefined, card: Profile): Profile {
  if (!phone || phone.id !== card.id) return { ...card, done: [...new Set(card.done)] };
  return { ...card, done: [...new Set([...phone.done, ...card.done])] };
}

/** Record a completed lesson (moves it to the end = most recent). */
export function markDone(profile: Profile, lesson: string): Profile {
  if (!/^[a-z0-9_-]{2,40}$/.test(lesson)) return profile;
  return { ...profile, done: [...profile.done.filter((d) => d !== lesson), lesson] };
}
