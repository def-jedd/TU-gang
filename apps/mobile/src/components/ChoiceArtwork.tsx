import type { CardCategory } from '../theme/tokens';
import { colors } from '../theme/tokens';
import type { TeachingStyle } from '../types/tutor';
import { Icon, type IconName } from './Icon';
import { PersonaPortrait } from './PersonaPortrait';

export function ChoiceArtwork({ icon, value, palette, compact }: { icon: IconName; value: string; palette: CardCategory; compact?: boolean }) {
  return palette === 'style'
    ? <PersonaPortrait persona={value as TeachingStyle} size={compact ? 36 : 72} />
    : <Icon name={icon} size={compact ? 20 : 24} color={colors.primary} />;
}
