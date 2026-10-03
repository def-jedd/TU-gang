/**
 * Turns Agora Conversational AI data-stream messages into captions and agent
 * state. Pure and dependency-free (unit-tested with node --test).
 *
 * The agent (parameters.data_channel = "datastream", the default) sends JSON
 * split into chunks. Two chunk shapes appear in Agora's samples, so both are
 * accepted:
 *   "msgId|partIdx|partSum|<base64 part>"
 *   {"msg_id": "...", "part_idx": 0, "total_parts": 2, "content": "<part>"}
 *
 * ⚠ Written from Agora's docs/samples; not yet tested against a live agent.
 *   Unknown messages are ignored, so the worst case is "no captions".
 */
import type { Caption } from './types';

export type AgentEvent =
  | { type: 'caption'; caption: Caption }
  | { type: 'state'; state: 'listening' | 'thinking' | 'speaking' | 'idle' };

type Pending = { total: number; parts: Map<number, string>; base64: boolean; at: number };

const B64 = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';

export function base64ToBytes(input: string): Uint8Array {
  const clean = input.replace(/[^A-Za-z0-9+/]/g, '');
  const out: number[] = [];
  let buffer = 0;
  let bits = 0;
  for (const ch of clean) {
    buffer = (buffer << 6) | B64.indexOf(ch);
    bits += 6;
    if (bits >= 8) {
      bits -= 8;
      out.push((buffer >> bits) & 0xff);
    }
  }
  return Uint8Array.from(out);
}

/** Minimal UTF-8 decoder (Hermes' TextDecoder support varies by version). */
export function utf8Decode(bytes: Uint8Array): string {
  let out = '';
  for (let i = 0; i < bytes.length; ) {
    const b = bytes[i++];
    let code: number;
    if (b < 0x80) code = b;
    else if (b >> 5 === 0x06) code = ((b & 0x1f) << 6) | (bytes[i++] & 0x3f);
    else if (b >> 4 === 0x0e) code = ((b & 0x0f) << 12) | ((bytes[i++] & 0x3f) << 6) | (bytes[i++] & 0x3f);
    else code = ((b & 0x07) << 18) | ((bytes[i++] & 0x3f) << 12) | ((bytes[i++] & 0x3f) << 6) | (bytes[i++] & 0x3f);
    out += String.fromCodePoint(code);
  }
  return out;
}

export class AgentMessageParser {
  private pending = new Map<string, Pending>();

  /** Feed one raw stream message; returns any complete events it produced. */
  push(data: Uint8Array | string): AgentEvent[] {
    const text = typeof data === 'string' ? data : utf8Decode(data);
    const chunk = this.readChunk(text);
    if (!chunk) return [];

    this.gc();
    let entry = this.pending.get(chunk.id);
    if (!entry) {
      entry = { total: chunk.total, parts: new Map(), base64: chunk.base64, at: Date.now() };
      this.pending.set(chunk.id, entry);
    }
    entry.parts.set(chunk.index, chunk.content);
    if (entry.parts.size < entry.total) return [];

    this.pending.delete(chunk.id);
    const joined = [...entry.parts.entries()].sort((a, b) => a[0] - b[0]).map(([, part]) => part).join('');
    try {
      const json = entry.base64 ? utf8Decode(base64ToBytes(joined)) : joined;
      return toEvents(JSON.parse(json));
    } catch {
      return [];
    }
  }

  private readChunk(text: string) {
    if (text.startsWith('{')) {
      try {
        const c = JSON.parse(text);
        if (c && c.msg_id != null && typeof c.content === 'string') {
          return { id: String(c.msg_id), index: Number(c.part_idx) || 0, total: Number(c.total_parts) || 1, content: c.content, base64: false };
        }
        // A whole, unchunked message.
        return { id: `single-${Date.now()}-${Math.random()}`, index: 0, total: 1, content: text, base64: false };
      } catch {
        return null;
      }
    }
    const parts = text.split('|');
    if (parts.length < 4) return null;
    const [id, index, total] = parts;
    return { id, index: Number(index), total: Math.max(1, Number(total) || 1), content: parts.slice(3).join('|'), base64: true };
  }

  /** Drop half-received messages older than 10 s so memory can't grow. */
  private gc() {
    const cutoff = Date.now() - 10_000;
    for (const [id, entry] of this.pending) if (entry.at < cutoff) this.pending.delete(id);
  }
}

const STATES = new Set(['listening', 'thinking', 'speaking', 'idle']);

export function toEvents(message: unknown): AgentEvent[] {
  if (!message || typeof message !== 'object') return [];
  const m = message as Record<string, unknown>;
  const text = typeof m.text === 'string' ? m.text : '';
  const turn = m.turn_id ?? m.message_id ?? '';

  switch (m.object) {
    case 'assistant.transcription':
      if (!text) return [];
      return [
        {
          type: 'caption',
          // turn_status: 0 = in progress, 1 = finished, 2 = interrupted
          caption: { id: `agent-${turn}`, speaker: 'agent', text, final: m.turn_status === 1 || m.turn_status === 2 },
        },
      ];
    case 'user.transcription':
      if (!text) return [];
      return [{ type: 'caption', caption: { id: `student-${turn}`, speaker: 'student', text, final: m.final === true } }];
    case 'message.state': {
      const state = String(m.state ?? '');
      if (STATES.has(state)) return [{ type: 'state', state: state as 'listening' | 'thinking' | 'speaking' | 'idle' }];
      if (state === 'silent') return [{ type: 'state', state: 'listening' }];
      return [];
    }
    default:
      return [];
  }
}
