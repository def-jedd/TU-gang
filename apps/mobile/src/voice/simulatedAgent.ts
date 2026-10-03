/**
 * PRACTICE VOICE — lets the whole voice UI run in Expo Go before Agora is
 * ready. It fetches the answer from POST /api/explain (or the mock) and reads
 * it aloud with the phone's own speech engine.
 *
 * Honest limits, shown on screen: it cannot hear the student (no speech
 * recognition in Expo Go), so the student steers it with cards and buttons.
 */
import { questionForTopic } from '../nfc/cardReducer';
import { explain } from '../services/api';
import type { Difficulty, ExplainRequest } from '../types/tutor';
import { simplerThan } from './controls';
import { preferredVoice, Speech } from './deviceSpeech';
import type { VoiceAgent, VoiceContext, VoiceControl, VoiceListener } from './types';

// DRAFT Bikol — needs native review (see src/i18n/copy.ts header).
const GREETING = 'Kumusta, tugang! Ano an gusto mong maaraman? Pumili nin litrato.';

/** Slower speech for simpler levels: easier to follow for new learners. */
const RATE: Record<Difficulty, number> = { very_simple: 0.82, simple: 0.9, normal: 1 };

/** One caption per sentence. (No regex lookbehind: older Hermes lacks it.) */
function sentences(text: string): string[] {
  return (text.match(/[^.!?\n]+[.!?]*/g) ?? []).map((s) => s.trim()).filter(Boolean);
}

export class SimulatedVoiceAgent implements VoiceAgent {
  readonly kind = 'simulated' as const;
  readonly canHear = false;

  private context!: VoiceContext;
  private listener!: VoiceListener;
  /** Bumped on every new utterance/stop; stale callbacks compare and bail. */
  private run = 0;
  private stopped = false;
  private lastLines: string[] = [];

  async start(context: VoiceContext, listener: VoiceListener) {
    this.context = { ...context };
    this.listener = listener;
    listener.onPhase('connecting');
    const run = ++this.run;
    await Promise.all([preferredVoice(), new Promise((r) => setTimeout(r, 700))]);
    if (run !== this.run || this.stopped) return;
    if (this.hasSubject()) await this.teach('explain');
    else await this.say([GREETING]);
  }

  async control(command: VoiceControl) {
    if (this.stopped) return;
    switch (command.action) {
      case 'repeat':
        await this.say(this.lastLines.length ? this.lastLines : [GREETING]);
        return;
      case 'simpler':
        this.context.difficulty = simplerThan(this.context.difficulty);
        break;
      case 'set_topic':
        this.context.topic = command.value;
        this.context.question = null;
        break;
      case 'set_difficulty':
        this.context.difficulty = command.value;
        break;
      case 'set_style':
        this.context.style = command.value;
        break;
      case 'explain_differently':
        if (this.hasSubject()) return this.teach('explain_differently');
        break;
    }
    if (this.hasSubject()) await this.teach('explain');
    else await this.say([GREETING]);
  }

  setMuted() {
    // Nothing to mute: the practice voice has no microphone.
  }

  async stop() {
    this.stopped = true;
    this.run++;
    Speech.stop();
    this.listener?.onPhase('ended');
  }

  private hasSubject() {
    return !!(this.context.topic || this.context.question);
  }

  private async teach(action: ExplainRequest['action']) {
    const run = ++this.run;
    Speech.stop();
    this.listener.onPhase('thinking');
    const { topic, question, language, difficulty, style } = this.context;
    const request: ExplainRequest = {
      question: question ?? questionForTopic(topic ?? ''),
      topic,
      language,
      difficulty,
      style,
      action,
    };
    try {
      const answer = await explain(request);
      if (run !== this.run || this.stopped) return;
      this.listener.onProvider?.(answer.provider);
      await this.say(
        [...sentences(answer.explanation), ...sentences(answer.example), ...answer.key_points],
        run,
      );
    } catch (error) {
      if (run === this.run && !this.stopped) this.listener.onError('network', String(error));
    }
  }

  private async say(lines: string[], run = ++this.run) {
    this.lastLines = lines;
    const voice = await preferredVoice();
    if (run !== this.run || this.stopped) return;
    this.listener.onPhase('speaking');

    for (let i = 0; i < lines.length; i++) {
      if (run !== this.run || this.stopped) return;
      const id = `practice-${run}-${i}`;
      this.listener.onCaption({ id, speaker: 'agent', text: lines[i], final: false });
      const finished = await new Promise<boolean>((resolve) =>
        Speech.speak(lines[i], {
          ...voice,
          rate: RATE[this.context.difficulty],
          onDone: () => resolve(true),
          onStopped: () => resolve(false),
          onError: () => resolve(true), // skip a line the engine can't read
        }),
      );
      if (!finished || run !== this.run || this.stopped) return;
      this.listener.onCaption({ id, speaker: 'agent', text: lines[i], final: true });
    }
    this.listener.onPhase('listening');
  }
}
