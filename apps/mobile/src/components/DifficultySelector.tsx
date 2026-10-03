import { useTutor } from '../hooks/useTutor';
import { LEVEL_CARDS } from '../nfc/cards';
import type { Difficulty } from '../types/tutor';
import { ChoiceGroup } from './ChoiceGroup';

type Props = {
  value: Difficulty;
  onChange: (value: Difficulty) => void;
  compact?: boolean;
  /** Override the heading (e.g. "Who do you want to talk to?" on the voice home). */
  title?: string;
  /** Speak labels aloud on tap (voice-first screens). */
  speakable?: boolean;
};

export function DifficultySelector({ value, onChange, compact, title, speakable }: Props) {
  const { t, uiLang } = useTutor();
  return (
    <ChoiceGroup
      title={title ?? t.difficultyTitle}
      speakable={speakable ? t.hearThis : undefined}
      titleIcon="stairs"
      palette="level"
      value={value}
      onChange={onChange}
      compact={compact}
      options={LEVEL_CARDS.map((card) => ({ value: card.value, label: card.label[uiLang], icon: card.icon }))}
    />
  );
}
