import { StyleSheet, View } from 'react-native';

import type { Profile } from '../profiles/profileCard';
import { category } from '../theme/tokens';
import { Icon, type IconName } from './Icon';

/** A student's picture: how a pre-reader recognises "me" on screen and on the card. */
export function StudentAvatar({ avatar, size = 56 }: { avatar: Profile['avatar']; size?: number }) {
  return (
    <View style={[styles.avatar, { width: size, height: size, borderRadius: size / 2 }]}>
      <Icon name={avatar as IconName} size={size * 0.58} color={category.style.solid} />
    </View>
  );
}

const styles = StyleSheet.create({
  avatar: {
    backgroundColor: category.style.tint,
    borderWidth: 3,
    borderColor: category.style.solid,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
