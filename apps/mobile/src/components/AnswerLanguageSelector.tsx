import { useMemo, useState } from 'react';
import { FlatList, Modal, Pressable, StyleSheet, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { PHILIPPINE_LANGUAGE_NAMES } from '../data/philippineLanguages';
import { useTutor } from '../hooks/useTutor';
import { LANGUAGE_CARDS } from '../nfc/cards';
import { category, colors, radius, space, touch } from '../theme/tokens';
import type { Language } from '../types/tutor';
import { speakLabel } from '../voice/deviceSpeech';
import { AppText } from './AppText';
import { Icon, type IconName } from './Icon';
import { SpeakableTitle } from './SpeakableTitle';

type Props = {
  value: Language;
  onChange: (value: Language) => void;
  compact?: boolean;
  speakable?: boolean;
};

type PickerRow =
  | { key: string; kind: 'heading'; label: string }
  | { key: string; kind: 'supported'; label: string; value: Language; icon: IconName }
  | { key: string; kind: 'unavailable'; label: string };

/** Chooses the tutor's answer language; the EN/BIK toggle changes UI labels only. */
export function AnswerLanguageSelector({ value, onChange, compact, speakable }: Props) {
  const { t, uiLang } = useTutor();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const selected = LANGUAGE_CARDS.find((card) => card.value === value) ?? LANGUAGE_CARDS[0];
  const rows = useMemo<PickerRow[]>(() => {
    const needle = query.trim().toLocaleLowerCase();
    const supported = LANGUAGE_CARDS.filter((card) => card.label[uiLang].toLocaleLowerCase().includes(needle));
    const unavailable = PHILIPPINE_LANGUAGE_NAMES.filter((name) => name.toLocaleLowerCase().includes(needle));
    return [
      ...(supported.length ? [{ key: 'available', kind: 'heading' as const, label: t.languageAvailableNow }] : []),
      ...supported.map((card) => ({
        key: card.value, kind: 'supported' as const, label: card.label[uiLang], value: card.value, icon: card.icon,
      })),
      ...(unavailable.length ? [{ key: 'coming', kind: 'heading' as const, label: t.languageComingSoon }] : []),
      ...unavailable.map((name) => ({ key: name, kind: 'unavailable' as const, label: name })),
    ];
  }, [query, uiLang, t.languageAvailableNow, t.languageComingSoon]);

  const close = () => { setOpen(false); setQuery(''); };
  const choose = (language: Language, label: string) => {
    onChange(language);
    if (speakable) speakLabel(label);
    close();
  };

  return (
    <View style={styles.group}>
      {speakable ? (
        <SpeakableTitle text={t.answerLanguageTitle} hearLabel={t.hearThis} icon="translate" iconColor={category.language.ink} />
      ) : (
        <View style={styles.titleRow}>
          <Icon name="translate" size={22} color={category.language.ink} />
          <AppText variant="heading" accessibilityRole="header">{t.answerLanguageTitle}</AppText>
        </View>
      )}
      <Pressable
        onPress={() => setOpen(true)}
        accessibilityRole="button"
        accessibilityLabel={`${t.answerLanguageTitle}: ${selected.label[uiLang]}`}
        accessibilityHint={t.languageOpenHint}
        style={({ pressed }) => [styles.trigger, compact && styles.triggerCompact, pressed && styles.pressed]}>
        <Icon name={selected.icon} size={26} color={category.language.solid} />
        <AppText variant="label" style={styles.triggerLabel}>{selected.label[uiLang]}</AppText>
        <Icon name="chevron-down" size={26} color={category.language.ink} />
      </Pressable>
      <Modal visible={open} animationType="slide" onRequestClose={close}>
        <SafeAreaView style={styles.modal}>
          <View style={styles.modalHeader}>
            <AppText variant="title" style={styles.modalTitle} accessibilityRole="header">{t.answerLanguageTitle}</AppText>
            <Pressable onPress={close} accessibilityRole="button" accessibilityLabel={t.languageClose} style={styles.close}>
              <Icon name="close" size={26} color={colors.ink} />
            </Pressable>
          </View>
          <TextInput
            value={query}
            onChangeText={setQuery}
            placeholder={t.languageSearch}
            placeholderTextColor={colors.inkMuted}
            accessibilityLabel={t.languageSearch}
            autoCapitalize="none"
            style={styles.search}
          />
          <FlatList
            data={rows}
            keyExtractor={(row) => row.key}
            keyboardShouldPersistTaps="handled"
            contentContainerStyle={styles.list}
            ListEmptyComponent={<AppText color={colors.inkSoft}>{t.languageNoResults}</AppText>}
            ListFooterComponent={<AppText variant="caption" color={colors.inkMuted} style={styles.source}>{t.languageSource}</AppText>}
            renderItem={({ item }) => {
              if (item.kind === 'heading') return <AppText variant="label" color={category.language.ink} style={styles.section} accessibilityRole="header">{item.label}</AppText>;
              if (item.kind === 'supported') {
                const checked = item.value === value;
                return (
                  <Pressable
                    onPress={() => choose(item.value, item.label)}
                    accessibilityRole="radio"
                    accessibilityLabel={item.label}
                    accessibilityState={{ checked }}
                    style={({ pressed }) => [styles.row, checked && styles.selectedRow, pressed && styles.pressed]}>
                    <Icon name={item.icon} size={24} color={category.language.solid} />
                    <AppText variant="label" style={styles.rowLabel}>{item.label}</AppText>
                    {checked && <Icon name="check" size={24} color={category.language.solid} />}
                  </Pressable>
                );
              }
              return (
                <Pressable disabled accessibilityRole="button" accessibilityLabel={`${item.label}, ${t.languageUnavailable}`} accessibilityState={{ disabled: true }} style={styles.row}>
                  <AppText color={colors.inkMuted} style={styles.rowLabel}>{item.label}</AppText>
                  <AppText variant="caption" color={colors.inkMuted}>{t.languageUnavailable}</AppText>
                </Pressable>
              );
            }}
          />
        </SafeAreaView>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  group: { gap: space.sm },
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: space.sm },
  trigger: {
    minHeight: touch.min, flexDirection: 'row', alignItems: 'center', gap: space.md,
    backgroundColor: colors.surface, borderWidth: 2, borderColor: category.language.solid,
    borderRadius: radius.md, paddingHorizontal: space.lg, paddingVertical: space.sm,
  },
  triggerCompact: { minHeight: touch.min },
  triggerLabel: { flex: 1 },
  pressed: { opacity: 0.75 },
  modal: { flex: 1, backgroundColor: colors.bg },
  modalHeader: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: space.lg, paddingTop: space.md },
  modalTitle: { flex: 1 },
  close: { width: touch.min, height: touch.min, alignItems: 'center', justifyContent: 'center' },
  search: {
    minHeight: touch.min, marginHorizontal: space.lg, marginVertical: space.md,
    paddingHorizontal: space.lg, borderWidth: 1, borderColor: colors.borderStrong,
    borderRadius: radius.md, backgroundColor: colors.surface, color: colors.ink, fontSize: 18,
  },
  list: { paddingHorizontal: space.lg, paddingBottom: space.xl },
  section: { marginTop: space.lg, marginBottom: space.sm },
  row: {
    minHeight: touch.min, flexDirection: 'row', alignItems: 'center', gap: space.md,
    paddingHorizontal: space.md, paddingVertical: space.sm, borderBottomWidth: 1, borderBottomColor: colors.border,
  },
  selectedRow: { backgroundColor: category.language.tint, borderRadius: radius.sm },
  rowLabel: { flex: 1 },
  source: { marginTop: space.xl },
});
