import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';

import type { Avatar } from '../profiles/profileCard';

/**
 * A student's picture (cat, rabbit, rocket…). These are MaterialCommunityIcons
 * names, drawn directly: the app-wide Icon maps to Feather, which has no animals.
 */
export function AvatarIcon({ avatar, size, color }: { avatar: Avatar; size: number; color: string }) {
  return <MaterialCommunityIcons name={avatar} size={size} color={color} accessibilityElementsHidden importantForAccessibility="no" />;
}

export const avatarFont = MaterialCommunityIcons.font;
