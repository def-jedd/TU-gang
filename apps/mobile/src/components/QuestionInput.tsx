import { ClaySurface } from './ClaySurface';
import { useId, useState } from 'react';
import { Pressable, StyleSheet, TextInput, View } from 'react-native';

import { MAX_QUESTION_LENGTH } from '../nfc/cardReducer';
import { layout, typeScale, colors, fonts, radius, space, touch } from '../theme/tokens';
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
  const labelId=useId();
  const [focused, setFocused] = useState(false);
  const nearLimit = value.length > MAX_QUESTION_LENGTH * 0.8;

  return (
    <View style={styles.wrap}>
      <AppText variant="label" color={colors.inkSoft} nativeID={labelId}>
        {label}
      </AppText>
      <ClaySurface intensity="strong" selected={focused} style={[styles.field, focused && styles.fieldFocused]}>
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
          accessibilityLabelledBy={labelId}
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
      </ClaySurface>
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
    minHeight: 152,
    backgroundColor: 'transparent',
    borderWidth: layout.border,
    borderColor: colors.border,
    borderRadius: radius.md,
    paddingHorizontal: space.lg,
    paddingVertical: space.lg,
  },
  fieldFocused: { borderColor: colors.primary },
  input: {
    flex: 1,
    position: 'relative',
    zIndex: 1,
    minWidth: 0,
    backgroundColor: colors.surface,
    borderRadius: radius.sm,
    paddingHorizontal: space.sm,
    fontFamily: fonts.body,
    fontSize: typeScale.body.fontSize,
    lineHeight: typeScale.body.lineHeight,
    color: colors.ink,
    minHeight: 112,
    paddingTop: 0,
    paddingBottom: 0,
    textAlignVertical: 'top',
    outlineWidth: 0,
    outlineStyle: 'solid',
    outlineColor: 'transparent',
  },
  clear: { width: touch.min, minHeight: touch.min, alignItems: 'center', justifyContent: 'flex-start' },
  counter: { textAlign: 'right' },
});



