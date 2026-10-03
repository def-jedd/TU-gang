import { useState } from 'react';
import { Pressable, StyleSheet, TextInput, View } from 'react-native';

import { MAX_QUESTION_LENGTH } from '../nfc/cardReducer';
import { colors, fonts, radius, space, touch } from '../theme/tokens';
import { AppText } from './AppText';
import { Icon } from './Icon';

type Props = {
  label: string;
  placeholder: string;
  clearLabel: string;
  value: string;
  onChangeText: (text: string) => void;
  onSubmit: () => void;
};

export function QuestionInput({ label, placeholder, clearLabel, value, onChangeText, onSubmit }: Props) {
  const [focused, setFocused] = useState(false);
  const nearLimit = value.length > MAX_QUESTION_LENGTH * 0.8;

  return (
    <View style={styles.wrap}>
      <AppText variant="label" color={colors.inkSoft} nativeID="question-label">
        {label}
      </AppText>
      <View style={[styles.field, focused && styles.fieldFocused]}>
        <Icon name="chat-question" size={26} color={focused ? colors.primary : colors.inkMuted} />
        <TextInput
          value={value}
          onChangeText={onChangeText}
          placeholder={placeholder}
          placeholderTextColor={colors.inkMuted}
          multiline
          maxLength={MAX_QUESTION_LENGTH}
          // Enter = ask. Questions don't need line breaks, and it saves a
          // reach to the button for kids typing with one thumb.
          submitBehavior="blurAndSubmit"
          returnKeyType="send"
          onSubmitEditing={onSubmit}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          accessibilityLabel={label}
          accessibilityLabelledBy="question-label"
          style={styles.input}
          maxFontSizeMultiplier={1.6}
        />
        {value.length > 0 ? (
          <Pressable
            onPress={() => onChangeText('')}
            accessibilityRole="button"
            accessibilityLabel={clearLabel}
            hitSlop={12}
            style={styles.clear}>
            <Icon name="close-circle" size={26} color={colors.inkMuted} />
          </Pressable>
        ) : null}
      </View>
      {nearLimit ? (
        <AppText variant="caption" color={colors.inkMuted} style={styles.counter}>
          {value.length} / {MAX_QUESTION_LENGTH}
        </AppText>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: space.xs },
  field: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: space.sm,
    minHeight: 96,
    backgroundColor: colors.surface,
    borderWidth: 2,
    borderColor: colors.borderStrong,
    borderRadius: radius.md,
    paddingHorizontal: space.md,
    paddingVertical: space.md,
  },
  fieldFocused: { borderColor: colors.primary, borderWidth: 3, padding: space.md - 1 },
  input: {
    flex: 1,
    fontFamily: fonts.body,
    fontSize: 20,
    lineHeight: 28,
    color: colors.ink,
    minHeight: 64,
    paddingTop: 0,
    paddingBottom: 0,
    textAlignVertical: 'top',
  },
  clear: { minHeight: touch.min / 2, justifyContent: 'flex-start' },
  counter: { textAlign: 'right' },
});
