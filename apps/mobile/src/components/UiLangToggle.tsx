import { ClaySurface } from './ClaySurface';
import { Pressable, StyleSheet } from 'react-native';

import type { UiLang } from '../i18n/copy';
import { colors, radius, space, touch } from '../theme/tokens';
import { AppText } from './AppText';

const OPTIONS: { lang: UiLang; label: string; a11y: string }[] = [
  { lang: 'en', label: 'EN', a11y: 'English' },
  { lang: 'bik', label: 'BIK', a11y: 'Bikol' },
];

export function UiLangToggle({ value, onChange }: { value: UiLang; onChange: (lang: UiLang) => void }) {
  return (
    <ClaySurface style={styles.toggle} accessibilityRole="radiogroup" accessibilityLabel="App language">
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
            <ClaySurface intensity="subtle" selected={selected} radius={radius.sm} style={StyleSheet.absoluteFill} pointerEvents="none" />
            <AppText variant="label" color={colors.ink}>
              {label}
            </AppText>
          </Pressable>
        );
      })}
    </ClaySurface>
  );
}

const styles = StyleSheet.create({
  toggle: {
    flexDirection: 'row',
    backgroundColor: 'transparent',
    borderRadius: radius.sm,
    borderWidth: 0,
    borderColor: colors.border,
    padding: space.xs,
  },
  option: {
    minHeight: touch.min,
    minWidth: 40,
    paddingHorizontal: space.sm,
    borderRadius: radius.sm,
    alignItems: 'center',
    justifyContent: 'center',
  },
  selected: { backgroundColor: 'transparent' },
});
