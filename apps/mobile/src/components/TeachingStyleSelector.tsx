import { useTutor } from '../hooks/useTutor';
import { STYLE_CARDS } from '../nfc/cards';
import type { TeachingStyle } from '../types/tutor';
import { ChoiceGroup } from './ChoiceGroup';

type Props = {
  value: TeachingStyle;
  onChange: (value: TeachingStyle) => void;
  compact?: boolean;
};

export function TeachingStyleSelector({ value, onChange, compact }: Props) {
  const { t, uiLang } = useTutor();
  return (
    <ChoiceGroup
      title={t.styleTitle}
      titleIcon="account-voice"
      palette="style"
      value={value}
      onChange={onChange}
      compact={compact}
      options={STYLE_CARDS.map((card) => ({ value: card.value, label: card.label[uiLang], icon: card.icon }))}
    />
  );
}
