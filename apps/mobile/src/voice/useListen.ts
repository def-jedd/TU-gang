import { useEffect, useState } from 'react';

import { ListenPlayer, type ListenState } from './listen';

/**
 * Listen for one answer: starts the voice agent as soon as the answer is on
 * screen (Kiev's tip: ~2 s of the wait is Agora starting the agent), speaks
 * on tap, and always stops the agent when the answer changes or the screen closes.
 */
export function useListen(requestId: string | null, enabled: boolean) {
  const [state, setState] = useState<ListenState>('idle');
  const [player] = useState(() => new ListenPlayer((next) => setState(next)));

  useEffect(() => {
    if (!enabled || !requestId) return;
    player.prepare({ request_id: requestId });
    return () => {
      player.stop();
    };
  }, [enabled, requestId, player]);

  return {
    state,
    play: () => player.play(),
    stop: () => player.stop(),
  };
}
