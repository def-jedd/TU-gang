/// <reference types="node" />
// Run with `npm test`.
import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { AgentMessageParser, base64ToBytes, toEvents, utf8Decode } from './agoraMessages.ts';
import { cardToVoiceControl, simplerThan } from './controls.ts';

const b64 = (s: string) => Buffer.from(s, 'utf8').toString('base64');

describe('cards during a call', () => {
  it('steer the tutor instead of starting a new request', () => {
    assert.deepEqual(cardToVoiceControl({ type: 'DIFFICULTY', value: 'very_simple' }), {
      kind: 'control',
      control: { action: 'set_difficulty', value: 'very_simple' },
    });
    assert.deepEqual(cardToVoiceControl({ type: 'TOPIC', value: 'gravity' }), {
      kind: 'control',
      control: { action: 'set_topic', value: 'gravity' },
    });
    assert.deepEqual(cardToVoiceControl({ type: 'SUBMIT' }), { kind: 'control', control: { action: 'repeat' } });
    assert.deepEqual(cardToVoiceControl({ type: 'RESET' }), { kind: 'end_call' });
  });

  it('"simpler" bottoms out at very_simple', () => {
    assert.equal(simplerThan('normal'), 'simple');
    assert.equal(simplerThan('simple'), 'very_simple');
    assert.equal(simplerThan('very_simple'), 'very_simple');
  });
});

describe('Agora data-stream captions', () => {
  it('decodes UTF-8 base64 (Bikol, accents, emoji)', () => {
    const text = 'Hali ka, tugang — 0°C ✓ 😊';
    assert.equal(utf8Decode(base64ToBytes(b64(text))), text);
  });

  it('reassembles pipe-delimited chunks arriving out of order', () => {
    const json = JSON.stringify({ object: 'assistant.transcription', text: 'An yelo iyo an tubig na nagyelo.', turn_id: 7, turn_status: 1 });
    const encoded = b64(json);
    const half = Math.ceil(encoded.length / 2);
    const parser = new AgentMessageParser();
    assert.deepEqual(parser.push(`m1|2|2|${encoded.slice(half)}`), []);
    const events = parser.push(new TextEncoder().encode(`m1|1|2|${encoded.slice(0, half)}`));
    assert.deepEqual(events, [
      { type: 'caption', caption: { id: 'agent-7', speaker: 'agent', text: 'An yelo iyo an tubig na nagyelo.', final: true } },
    ]);
  });

  it('accepts the JSON chunk shape too', () => {
    const json = JSON.stringify({ object: 'user.transcription', text: 'Taano ta natutunaw?', turn_id: 3, final: false });
    const parser = new AgentMessageParser();
    parser.push(JSON.stringify({ msg_id: 'x', part_idx: 0, total_parts: 2, content: json.slice(0, 10) }));
    const events = parser.push(JSON.stringify({ msg_id: 'x', part_idx: 1, total_parts: 2, content: json.slice(10) }));
    assert.deepEqual(events, [
      { type: 'caption', caption: { id: 'student-3', speaker: 'student', text: 'Taano ta natutunaw?', final: false } },
    ]);
  });

  it('maps agent state and ignores unknown or broken messages', () => {
    assert.deepEqual(toEvents({ object: 'message.state', state: 'thinking' }), [{ type: 'state', state: 'thinking' }]);
    assert.deepEqual(toEvents({ object: 'message.metrics' }), []);
    const parser = new AgentMessageParser();
    assert.deepEqual(parser.push('garbage'), []);
    assert.deepEqual(parser.push('id|1|1|%%%not-base64%%%'), []);
  });
});
