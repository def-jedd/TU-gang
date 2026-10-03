/// <reference types="node" />
// Run with `npm test` (plain Node 22.18+/24 — no test framework needed).
import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import {
  INITIAL_DRAFT,
  buildExplainRequest,
  draftReducer,
  parseCardCode,
  type DraftAction,
  type LearningDraft,
} from './cardReducer.ts';

/** Simulates tapping a sequence of physical cards. */
function tapCards(codes: string[], start: LearningDraft = INITIAL_DRAFT) {
  let draft = start;
  let submitted = false;
  for (const code of codes) {
    const action = parseCardCode(code);
    assert.ok(action, `card ${code} should parse`);
    if (action.type === 'SUBMIT') submitted = true;
    draft = draftReducer(draft, action);
  }
  return { draft, submitted };
}

describe('parseCardCode', () => {
  it('reads every documented card', () => {
    assert.deepEqual(parseCardCode('TOPIC_PHOTOSYNTHESIS'), { type: 'TOPIC', value: 'photosynthesis' });
    assert.deepEqual(parseCardCode('MODE_VERY_SIMPLE'), { type: 'DIFFICULTY', value: 'very_simple' });
    assert.deepEqual(parseCardCode('MODE_SIMPLE'), { type: 'DIFFICULTY', value: 'simple' });
    assert.deepEqual(parseCardCode('MODE_NORMAL'), { type: 'DIFFICULTY', value: 'normal' });
    assert.deepEqual(parseCardCode('STYLE_ATE_KUYA'), { type: 'STYLE', value: 'ate_kuya' });
    assert.deepEqual(parseCardCode('LANG_BIKOL_DAET'), { type: 'LANGUAGE', value: 'bikol_daet' });
    assert.deepEqual(parseCardCode('ACTION_EXPLAIN'), { type: 'SUBMIT' });
    assert.deepEqual(parseCardCode('ACTION_EXPLAIN_DIFFERENTLY'), { type: 'EXPLAIN_DIFFERENTLY' });
    assert.deepEqual(parseCardCode('ACTION_RESET'), { type: 'RESET' });
  });

  it('tolerates how people actually write tags', () => {
    assert.deepEqual(parseCardCode('  mode-simple \n'), { type: 'DIFFICULTY', value: 'simple' });
    assert.deepEqual(parseCardCode('tugang://card/TOPIC_GRAVITY'), { type: 'TOPIC', value: 'gravity' });
    assert.deepEqual(parseCardCode('tugang://cards?card=STYLE_FRIEND'), { type: 'STYLE', value: 'friend' });
  });

  it('accepts new topic cards without an app update', () => {
    assert.deepEqual(parseCardCode('TOPIC_VOLCANOES'), { type: 'TOPIC', value: 'volcanoes' });
  });

  it('rejects anything else without throwing', () => {
    for (const junk of ['', 'hello', 'TOPIC_', 'MODE_HARD', 'https://example.com', 'x'.repeat(500), '?card=%E0%A4%A', 'CONSTRUCTOR']) {
      assert.equal(parseCardCode(junk), null, junk.slice(0, 30));
    }
  });
});

describe('cards → request JSON', () => {
  it('TOPIC + MODE + STYLE + ACTION_EXPLAIN produces exactly the agreed JSON', () => {
    const { draft, submitted } = tapCards([
      'TOPIC_PHOTOSYNTHESIS',
      'MODE_SIMPLE',
      'STYLE_ATE_KUYA',
      'ACTION_EXPLAIN',
    ]);
    assert.equal(submitted, true);

    const built = buildExplainRequest(draft);
    assert.ok(built.ok);
    // Compare serialized text so key ORDER is checked too, not just values.
    assert.equal(
      JSON.stringify(built.request),
      JSON.stringify({
        question: 'How do plants make their own food?',
        topic: 'photosynthesis',
        language: 'bikol_daet',
        difficulty: 'simple',
        style: 'ate_kuya',
        action: 'explain',
      }),
    );
  });

  it('card taps and on-screen buttons build identical requests', () => {
    const viaCards = tapCards(['TOPIC_MELTING', 'MODE_VERY_SIMPLE', 'STYLE_FRIEND']).draft;
    const buttons: DraftAction[] = [
      { type: 'TOPIC', value: 'melting' },
      { type: 'DIFFICULTY', value: 'very_simple' },
      { type: 'STYLE', value: 'friend' },
    ];
    const viaButtons = buttons.reduce(draftReducer, INITIAL_DRAFT);
    assert.deepEqual(buildExplainRequest(viaCards), buildExplainRequest(viaButtons));
  });

  it('typing a question clears a previously tapped topic', () => {
    let draft = tapCards(['TOPIC_GRAVITY']).draft;
    draft = draftReducer(draft, { type: 'QUESTION', value: 'Bakit natutunaw ang yelo?' });
    const built = buildExplainRequest(draft);
    assert.ok(built.ok);
    assert.equal(built.request.topic, null);
    assert.equal(built.request.question, 'Bakit natutunaw ang yelo?');
  });

  it('refuses to submit an empty question', () => {
    assert.deepEqual(buildExplainRequest(INITIAL_DRAFT), { ok: false, reason: 'empty_question' });
    const blank = draftReducer(INITIAL_DRAFT, { type: 'QUESTION', value: '   ' });
    assert.equal(buildExplainRequest(blank).ok, false);
  });

  it('explain_differently keeps everything else identical', () => {
    const { draft } = tapCards(['TOPIC_FRACTIONS', 'MODE_NORMAL']);
    const a = buildExplainRequest(draft);
    const b = buildExplainRequest(draft, 'explain_differently');
    assert.ok(a.ok && b.ok);
    assert.deepEqual({ ...a.request, action: 'explain_differently' }, b.request);
  });

  it('ACTION_RESET starts over', () => {
    const { draft } = tapCards(['TOPIC_FRICTION', 'MODE_NORMAL', 'ACTION_RESET']);
    assert.deepEqual(draft, INITIAL_DRAFT);
  });
});
