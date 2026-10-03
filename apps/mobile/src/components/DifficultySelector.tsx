import { useTutor } from '../hooks/useTutor';
import { LEVEL_CARDS } from '../nfc/cards';
import type { Difficulty } from '../types/tutor';
import { ChoiceGroup } from './ChoiceGroup';

type Props = {
  value: Difficulty;
  onChange: (value: Difficulty) => void;
  compact?: boolean;
};

export function DifficultySelector({ value, onChange, compact }: Props) {
  const { t, uiLang } = useTutor();
  return (
    <ChoiceGroup
      title={t.difficultyTitle}
      titleIcon="stairs"
      palette="level"
      value={value}
      onChange={onChange}
      compact={compact}
      options={LEVEL_CARDS.map((card) => ({ value: card.value, label: card.label[uiLang], icon: card.icon }))}
    />
  );
}
