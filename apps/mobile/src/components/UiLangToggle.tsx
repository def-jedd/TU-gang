import { Pressable, StyleSheet, View } from 'react-native';

import type { UiLang } from '../i18n/copy';
import { colors, radius, space, touch } from '../theme/tokens';
import { AppText } from './AppText';

const OPTIONS: { lang: UiLang; label: string; a11y: string }[] = [
  { lang: 'en', label: 'EN', a11y: 'English' },
  { lang: 'bik', label: 'BIK', a11y: 'Bikol' },
];

export function UiLangToggle({ value, onChange }: { value: UiLang; onChange: (lang: UiLang) => void }) {
  return (
    <View style={styles.toggle} accessibilityRole="radiogroup" accessibilityLabel="App language">
      {OPTIONS.map(({ lang, label, a11y }) => {
        const selected = value === lang;
        return (
          <Pressable
            key={lang}
            onPress={() => onChange(lang)}
            accessibilityRole="radio"
            accessibilityLabel={a11y}
            accessibilityState={{ checked: selected }}
            style={[styles.option, selected && styles.selected]}>
            <AppText variant="label" color={selected ? colors.onPrimary : colors.inkSoft}>
              {label}
            </AppText>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  toggle: {
    flexDirection: 'row',
    backgroundColor: colors.surface,
    borderRadius: radius.pill,
    borderWidth: 2,
    borderColor: colors.border,
    padding: 3,
  },
  option: {
    minHeight: touch.min - 10,
    minWidth: 52,
    paddingHorizontal: space.md,
    borderRadius: radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
  },
  selected: { backgroundColor: colors.primary },
});
