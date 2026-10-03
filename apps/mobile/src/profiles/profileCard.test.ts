/// <reference types="node" />
import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import {
  bitsToText,
  cleanName,
  decodeProfileCard,
  encodeProfileCard,
  isProfileCardText,
  markDone,
  mergeProfiles,
  newProfileId,
  normalizeProfile,
  NTAG213_TEXT_BYTES,
  recordExam,
  textToBits,
  type Profile,
} from './profileCard.ts';

// Grade 3 has 134 lessons; Grade 1 has the most (173).
const g3 = Array.from({ length: 134 }, (_, i) => `g3-english-w${Math.floor(i / 10) + 1}-${(i % 10) + 1}`);
const g1 = Array.from({ length: 173 }, (_, i) => `g1-reading_literacy-w${Math.floor(i / 20) + 1}-${(i % 20) + 1}`);
const lessons = (grade: number) => (grade === 1 ? g1 : grade === 3 ? g3 : []);

const ana: Profile = normalizeProfile({
  id: 'k7m2p9qa',
  name: 'Ana',
  grade: 3,
  avatar: 'cat',
  done: ['melting', g3[0], g3[5]],
  passed: [g3[0]],
  scores: { [g3[0]]: 80, [g3[5]]: 40 },
});

describe('profile cards', () => {
  it('round-trips both progress tracks (read and passed) separately', () => {
    const { text, dropped } = encodeProfileCard(ana, NTAG213_TEXT_BYTES, lessons);
    assert.equal(dropped, 0);
    assert.ok(text.startsWith('TUG2|k7m2p9qa|Ana|3|0|3q|'));
    const back = decodeProfileCard(text, lessons)!;
    assert.deepEqual(back.done.sort(), [...ana.done].sort());
    assert.deepEqual(back.passed, [g3[0]]);
    assert.deepEqual(back.scores, {}); // scores stay on the phone
    assert.ok(isProfileCardText(text));
  });

  it('fits a whole grade of progress on a cheap NTAG213 sticker', () => {
    const everything = normalizeProfile({ id: 'k7m2p9qa', name: 'Juan Dela Cr', grade: 1, avatar: 'moon-waning-crescent', done: g1, passed: g1 });
    const { text, dropped } = encodeProfileCard(everything, NTAG213_TEXT_BYTES, lessons);
    assert.ok(Buffer.byteLength(text, 'utf8') <= NTAG213_TEXT_BYTES, `${Buffer.byteLength(text)} bytes`);
    assert.equal(dropped, 0);
    const back = decodeProfileCard(text, lessons)!;
    assert.equal(back.done.length, 173);
    assert.equal(back.passed.length, 173);
  });

  it('drops the oldest extra topics first when the card is full', () => {
    const busy = { ...ana, done: Array.from({ length: 20 }, (_, i) => `topic_number_${i + 1}`) };
    const { text, dropped } = encodeProfileCard(busy, NTAG213_TEXT_BYTES, lessons);
    assert.ok(Buffer.byteLength(text, 'utf8') <= NTAG213_TEXT_BYTES);
    assert.ok(dropped > 0);
    const back = decodeProfileCard(text, lessons)!;
    assert.ok(back.done.includes('topic_number_20')); // newest kept
    assert.ok(!back.done.includes('topic_number_1')); // oldest dropped
  });

  it('ignores the bits if the phone has a different lesson list', () => {
    const { text } = encodeProfileCard(ana, NTAG213_TEXT_BYTES, lessons);
    const back = decodeProfileCard(text, (grade) => lessons(grade).slice(1))!;
    assert.deepEqual(back.done, ['melting']); // extras still load
    assert.deepEqual(back.passed, []);
  });

  it('still reads cards written by the older app (TUG1)', () => {
    const old = decodeProfileCard('TUG1|k7m2p9qa|Ana|3|cat|melting,gravity', lessons)!;
    assert.deepEqual(old.done, ['melting', 'gravity']);
    assert.deepEqual(old.passed, []);
    assert.equal(old.avatar, 'cat');
  });

  it('round-trips bitsets of every length', () => {
    for (const positions of [[], [0], [7], [8], [0, 9, 23], [24], [5, 100, 172]]) {
      assert.deepEqual(textToBits(bitsToText(positions)), positions);
    }
    assert.equal(textToBits('*'), null);
  });

  it('never stores separators, newlines or long names', () => {
    assert.equal(cleanName('  Juan|Dela,Cruz\nJr.  '), 'Juan Dela Cr');
    const text = encodeProfileCard({ ...ana, name: 'A|B,C' }).text;
    assert.equal(decodeProfileCard(text)!.name, 'A B C');
  });

  it('rejects learning cards and junk', () => {
    for (const junk of ['TOPIC_MELTING', '', 'TUG1|x', 'TUG1|k7m2p9qa|Ana|12|cat|', 'TUG1|k7m2p9qa|Ana|3|dragon|', 'TUG2|k7m2p9qa|Ana|3|z|0|||', 'TUG9|k7m2p9qa|Ana|3|cat|']) {
      assert.equal(decodeProfileCard(junk), null, junk);
    }
    assert.equal(isProfileCardText('TOPIC_MELTING'), false);
  });

  it('merging a card into the phone never loses a lesson or a best score', () => {
    const phone = { ...ana, done: ['melting', 'fractions'], passed: [], scores: { x1: 90 } };
    const card = { ...ana, grade: 4, done: ['gravity', 'melting'], passed: ['x2'], scores: {} };
    const merged = mergeProfiles(phone, card);
    assert.deepEqual(merged.done.sort(), ['fractions', 'gravity', 'melting']);
    assert.deepEqual(merged.passed, ['x2']);
    assert.equal(merged.scores.x1, 90);
    assert.equal(merged.grade, 4); // identity from the card
  });

  it('marks a lesson read once, as the most recent', () => {
    assert.deepEqual(markDone(ana, 'melting').done, [g3[0], g3[5], 'melting']);
    assert.deepEqual(markDone(ana, 'bad id!').done, ana.done);
  });

  it('records exams separately: best score kept, passing at 75', () => {
    const failed = recordExam(ana, g3[5], 60);
    assert.equal(failed.scores[g3[5]], 60);
    assert.ok(!failed.passed.includes(g3[5]));
    const passed = recordExam(failed, g3[5], 80);
    assert.ok(passed.passed.includes(g3[5]));
    const worse = recordExam(passed, g3[5], 20);
    assert.equal(worse.scores[g3[5]], 80); // best kept
    assert.ok(worse.passed.includes(g3[5]));
    assert.deepEqual(worse.done, ana.done); // reading track untouched
  });

  it('makes readable random ids', () => {
    let n = 0;
    const id = newProfileId(() => (n++ % 10) / 10);
    assert.match(id, /^[a-z0-9]{8}$/);
  });
});
