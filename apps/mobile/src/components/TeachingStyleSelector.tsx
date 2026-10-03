import { useTutor } from '../hooks/useTutor';
import { STYLE_CARDS } from '../nfc/cards';
import type { TeachingStyle } from '../types/tutor';
import { ChoiceGroup } from './ChoiceGroup';

type Props = {
  value: TeachingStyle;
  onChange: (value: TeachingStyle) => void;
  compact?: boolean;
  /** Override the heading (e.g. "Who do you want to talk to?" on the voice home). */
  title?: string;
  /** Speak labels aloud on tap (voice-first screens). */
  speakable?: boolean;
};

export function TeachingStyleSelector({ value, onChange, compact, title, speakable }: Props) {
  const { t, uiLang } = useTutor();
  return (
    <ChoiceGroup
      title={title ?? t.styleTitle}
      speakable={speakable ? t.hearThis : undefined}
      titleIcon="account-voice"
      palette="style"
      value={value}
      onChange={onChange}
      compact={compact}
      options={STYLE_CARDS.map((card) => ({ value: card.value, label: card.label[uiLang], icon: card.icon }))}
    />
  );
}
