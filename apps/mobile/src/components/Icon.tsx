import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import type { ComponentProps } from 'react';

/** One icon family for the whole app so strokes and weights stay consistent. */
export type IconName = ComponentProps<typeof MaterialCommunityIcons>['name'];

type Props = {
  name: IconName;
  size: number;
  color: string;
};

/** Decorative by default — the text next to it carries the meaning for screen readers. */
export function Icon({ name, size, color }: Props) {
  return (
    <MaterialCommunityIcons
      name={name}
      size={size}
      color={color}
      accessibilityElementsHidden
      importantForAccessibility="no"
    />
  );
}

export const iconFont = MaterialCommunityIcons.font;
