/// <reference types="node" />
import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import {
  cleanName,
  decodeProfileCard,
  encodeProfileCard,
  isProfileCardText,
  markDone,
  mergeProfiles,
  newProfileId,
  NTAG213_TEXT_BYTES,
  type Profile,
} from './profileCard.ts';

const ana: Profile = { id: 'k7m2p9qa', name: 'Ana', grade: 3, avatar: 'cat', done: ['melting', 'gravity'] };

describe('profile cards', () => {
  it('round-trips a profile through the card text', () => {
    const { text, dropped } = encodeProfileCard(ana);
    assert.equal(text, 'TUG1|k7m2p9qa|Ana|3|cat|melting,gravity');
    assert.equal(dropped, 0);
    assert.deepEqual(decodeProfileCard(text), ana);
    assert.ok(isProfileCardText(text));
  });

  it('fits a cheap NTAG213 sticker by dropping the oldest lessons', () => {
    const busy = { ...ana, done: Array.from({ length: 20 }, (_, i) => `g7-science-w${i + 1}-1`) };
    const { text, dropped } = encodeProfileCard(busy);
    assert.ok(Buffer.byteLength(text, 'utf8') <= NTAG213_TEXT_BYTES);
    assert.ok(dropped > 0);
    const back = decodeProfileCard(text)!;
    assert.equal(back.done.at(-1), 'g7-science-w20-1'); // newest kept
    assert.ok(!back.done.includes('g7-science-w1-1')); // oldest dropped
  });

  it('never stores separators, newlines or long names', () => {
    assert.equal(cleanName('  Juan|Dela,Cruz\nJr.  '), 'Juan Dela Cr');
    const text = encodeProfileCard({ ...ana, name: 'A|B,C' }).text;
    assert.equal(decodeProfileCard(text)!.name, 'A B C');
  });

  it('rejects learning cards and junk', () => {
    for (const junk of ['TOPIC_MELTING', '', 'TUG1|x', 'TUG1|k7m2p9qa|Ana|12|cat|', 'TUG1|k7m2p9qa|Ana|3|dragon|', 'TUG2|k7m2p9qa|Ana|3|cat|']) {
      assert.equal(decodeProfileCard(junk), null, junk);
    }
    assert.equal(isProfileCardText('TOPIC_MELTING'), false);
  });

  it('merging a card into the phone never loses a lesson', () => {
    const phone = { ...ana, done: ['melting', 'fractions'] };
    const card = { ...ana, grade: 4, done: ['gravity', 'melting'] };
    const merged = mergeProfiles(phone, card);
    assert.deepEqual(merged.done.sort(), ['fractions', 'gravity', 'melting']);
    assert.equal(merged.grade, 4); // identity from the card
  });

  it('marks a lesson done once, as the most recent', () => {
    assert.deepEqual(markDone(ana, 'melting').done, ['gravity', 'melting']);
    assert.deepEqual(markDone(ana, 'bad id!').done, ana.done);
  });

  it('makes readable random ids', () => {
    let n = 0;
    const id = newProfileId(() => (n++ % 10) / 10);
    assert.match(id, /^[a-z0-9]{8}$/);
  });
});
