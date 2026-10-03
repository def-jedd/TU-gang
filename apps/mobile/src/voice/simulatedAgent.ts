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
import type { Difficulty, ExplainRequest, Language } from '../types/tutor';
import { simplerThan } from './controls';
import { FEATURES } from '../services/config';
import { preferredVoice, speakLine, Speech } from './deviceSpeech';
import { ListenPlayer, listenSupported } from './listen';
import type { VoiceAgent, VoiceContext, VoiceControl, VoiceListener } from './types';

/** Kiev's Agora voice is the main voice; the phone's speech is the fallback. */
const agoraVoiceEnabled = () => FEATURES.listen && listenSupported();

// DRAFT Bikol — needs native review (see src/i18n/copy.ts header).
const GREETING: Record<Language, string> = {
  bikol_daet: 'Kumusta, tugang! Ano an gusto mong maaraman? Pumili nin litrato.',
  tagalog: 'Kumusta! Ano ang gusto mong matutuhan? Pumili ng larawan.',
  english: 'Hello! What would you like to learn? Choose a picture.',
};

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
  /** Stored answer Kiev's server can speak again (repeat). */
  private lastRequestId: string | null = null;
  private player: ListenPlayer | null = null;

  async start(context: VoiceContext, listener: VoiceListener) {
    this.context = { ...context };
    this.listener = listener;
    listener.onPhase('connecting');
    const run = ++this.run;
    await Promise.all([preferredVoice(context.language), new Promise((r) => setTimeout(r, 700))]);
    if (run !== this.run || this.stopped) return;
    if (this.hasSubject()) await this.teach('explain');
    else await this.say([GREETING[this.context.language]]);
  }

  async control(command: VoiceControl) {
    if (this.stopped) return;
    switch (command.action) {
      case 'repeat': {
        const run = ++this.run;
        if (this.lastRequestId && (await this.speakWithAgora(this.lastRequestId, this.lastLines, run))) return;
        await this.say(this.lastLines.length ? this.lastLines : [GREETING[this.context.language]], run);
        return;
      }
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
      case 'set_language':
        this.context.language = command.value;
        break;
      case 'explain_differently':
        if (this.hasSubject()) return this.teach('explain_differently');
        break;
    }
    if (this.hasSubject()) await this.teach('explain');
    else await this.say([GREETING[this.context.language]]);
  }

  setMuted() {
    // Nothing to mute: the practice voice has no microphone.
  }

  async stop() {
    this.stopped = true;
    this.run++;
    Speech.stop();
    this.player?.stop();
    this.player = null;
    this.listener?.onPhase('ended');
  }

  private hasSubject() {
    return !!(this.context.topic || this.context.question);
  }

  private async teach(action: ExplainRequest['action']) {
    const run = ++this.run;
    Speech.stop();
    this.player?.stop();
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
      const lines = [...sentences(answer.explanation), ...sentences(answer.example), ...answer.key_points];
      // Mock answers are not stored on the voice server, so they always use the phone voice.
      this.lastRequestId = answer.provider === 'mock' ? null : answer.request_id;
      if (this.lastRequestId && (await this.speakWithAgora(this.lastRequestId, lines, run))) return;
      await this.say(lines, run);
    } catch (error) {
      if (run === this.run && !this.stopped) this.listener.onError('network', String(error));
    }
  }

  /**
   * Speak a stored answer with Kiev's Agora voice. Resolves true when it was
   * spoken, false when Agora is unavailable or failed (caller falls back to
   * the phone voice, so the student always hears the answer).
   */
  private async speakWithAgora(requestId: string, lines: string[], run: number): Promise<boolean> {
    if (!agoraVoiceEnabled()) return false;
    this.lastLines = lines;
    this.player?.stop();
    const outcome = await new Promise<'done' | 'error' | 'stopped'>((resolve) => {
      const player = new ListenPlayer((state) => {
        if (run !== this.run || this.stopped) return resolve('stopped');
        if (state === 'playing') {
          this.listener.onVoice?.('agora');
          this.listener.onPhase('speaking');
          // Agora speaks the whole answer; show it as one caption.
          this.listener.onCaption({ id: `agora-${run}`, speaker: 'agent', text: lines.join(' '), final: false });
        }
        if (state === 'done') resolve('done');
        if (state === 'error') resolve('error');
      });
      this.player = player;
      player.prepare({ request_id: requestId }).then(() => player.play());
    });
    this.player = null;
    if (outcome === 'error') console.warn('[voice] Agora voice failed; using the phone voice');
    if (outcome !== 'done' || run !== this.run || this.stopped) return outcome === 'stopped';
    this.listener.onCaption({ id: `agora-${run}`, speaker: 'agent', text: lines.join(' '), final: true });
    this.listener.onPhase('listening');
    return true;
  }

  private async say(lines: string[], run = ++this.run) {
    this.listener.onVoice?.('phone');
    this.lastLines = lines;
    const voice = await preferredVoice(this.context.language);
    if (run !== this.run || this.stopped) return;
    this.listener.onPhase('speaking');

    for (let i = 0; i < lines.length; i++) {
      if (run !== this.run || this.stopped) return;
      const id = `practice-${run}-${i}`;
      this.listener.onCaption({ id, speaker: 'agent', text: lines[i], final: false });
      const finished = await speakLine(lines[i], { rate: RATE[this.context.difficulty], language: this.context.language });
      if (!finished || run !== this.run || this.stopped) return;
      this.listener.onCaption({ id, speaker: 'agent', text: lines[i], final: true });
    }
    this.listener.onPhase('listening');
  }
}
