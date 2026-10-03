import { Text, type TextProps } from 'react-native';

import { colors, fonts, typeScale, type TypeVariant } from '../theme/tokens';

type Props = TextProps & {
  variant?: TypeVariant;
  color?: string;
  bold?: boolean;
  /** Multiplies size + line height (the answer screen's A− / A+ control). */
  scale?: number;
};

/**
 * All text goes through here so fonts stay consistent. System font scaling
 * (Android "Font size") is respected — never disable it for this audience.
 */
export function AppText({ variant = 'body', color = colors.ink, bold, scale = 1, style, ...rest }: Props) {
  const base = typeScale[variant];
  const isBody = base.fontFamily === fonts.body;
  return (
    <Text
      style={[
        base,
        { color },
        bold && { fontWeight: '700', fontFamily: isBody ? fonts.bodyBold : fonts.displayBold },
        scale !== 1 && { fontSize: base.fontSize * scale, lineHeight: base.lineHeight * scale },
        style,
      ]}
      maxFontSizeMultiplier={1.6}
      {...rest}
    />
  );
}
