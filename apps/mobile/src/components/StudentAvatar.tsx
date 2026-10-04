import { StyleSheet, View } from 'react-native';

import type { Profile } from '../profiles/profileCard';
import { layout, category } from '../theme/tokens';
import { AvatarIcon } from './AvatarIcon';

/** A student's picture: how a pre-reader recognises "me" on screen and on the card. */
export function StudentAvatar({ avatar, size = 56 }: { avatar: Profile['avatar']; size?: number }) {
  return (
    <View style={[styles.avatar, { width: size, height: size, borderRadius: size / 2 }]}>
      <AvatarIcon avatar={avatar} size={size * 0.58} color={category.style.solid} />
    </View>
  );
}

const styles = StyleSheet.create({
  avatar: {
    backgroundColor: category.style.tint,
    borderWidth: layout.border,
    borderColor: category.style.solid,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
