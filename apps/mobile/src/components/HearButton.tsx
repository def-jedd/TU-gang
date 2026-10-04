import { useEffect, useRef, useState } from 'react';
import type { StyleProp, ViewStyle } from 'react-native';

import { useTutor } from '../hooks/useTutor';
import { FEATURES } from '../services/config';
import type { Language } from '../types/tutor';
import { Speech, speakLine } from '../voice/deviceSpeech';
import { listenSupported } from '../voice/listen';
import { useListen } from '../voice/useListen';
import { Button } from './Button';

type Props = {
  /** Server-stored text (lesson part, exam question) that Agora can speak. */
  requestId: string | null;
  /** The same text, for the phone voice when Agora can't be used. */
  text: string;
  language: Language;
  /** Speak as soon as it appears: the student may not be able to read it. */
  autoPlay?: boolean;
  style?: StyleProp<ViewStyle>;
};

/**
 * "Listen" for one piece of lesson text: the Agora voice when available
 * (dev build + voice server), otherwise the phone's own voice.
 */
export function HearButton({ requestId, text, language, autoPlay = false, style }: Props) {
  const { t } = useTutor();
  const agora = FEATURES.listen && listenSupported() && !!requestId;
  const listen = useListen(agora ? requestId : null, agora);
  const [phoneSpeaking, setPhoneSpeaking] = useState(false);
  const autoPlayed = useRef<string | null>(null);

  const speakOnPhone = async () => {
    setPhoneSpeaking(true);
    await speakLine(text, { language });
    setPhoneSpeaking(false);
  };

  // Auto-play once per text.
  useEffect(() => {
    if (!autoPlay || autoPlayed.current === text) return;
    autoPlayed.current = text;
    if (agora) listen.play();
    else speakOnPhone();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoPlay, text, agora]);

  // Stop the phone voice when this text goes away.
  useEffect(() => () => void Speech.stop(), [text]);

  const playing = agora ? listen.state === 'playing' : phoneSpeaking;
  const preparing = agora && listen.state === 'preparing';
  return (
    <Button
      label={playing ? t.listenStop : preparing ? t.listenPreparing : agora && listen.state === 'error' ? t.listenRetry : t.listen}
      icon={playing ? 'stop' : 'volume-high'}
      variant="secondary"
      size="md"
      loading={preparing}
      style={style}
      onPress={() => {
        if (playing) return agora ? listen.stop() : void Speech.stop();
        if (agora) listen.play();
        else speakOnPhone();
      }}
    />
  );
}
