import { StyleSheet, View } from 'react-native';

import type { Copy } from '../i18n/copy';
import { colors, radius, space } from '../theme/tokens';
import type { ExplainResponse } from '../types/tutor';
import { AppText } from './AppText';
import { Icon, type IconName } from './Icon';

type Props = {
  response: ExplainResponse;
  t: Copy;
  /** From the A− / A+ control. */
  scale: number;
};

/** Short chunks are easier to hold in working memory than one wall of text. */
function paragraphs(text: string): string[] {
  return text
    .split(/\n+/)
    .map((p) => p.trim())
    .filter(Boolean);
}

function SectionTitle({ icon, label, tint, fg }: { icon: IconName; label: string; tint: string; fg: string }) {
  return (
    <View style={styles.sectionTitle}>
      <View style={[styles.sectionIcon, { backgroundColor: tint }]}>
        <Icon name={icon} size={22} color={fg} />
      </View>
      <AppText variant="heading" accessibilityRole="header">
        {label}
      </AppText>
    </View>
  );
}

/**
 * Explanation first and biggest, then the example in its own coloured box,
 * then numbered key points — three clearly different shapes so a student can
 * find "the example" again without reading the headings.
 */
export function AnswerView({ response, t, scale }: Props) {
  return (
    <View style={styles.wrap}>
      <View style={styles.card}>
        <SectionTitle icon="lightbulb-on-outline" label={t.explanation} tint={colors.primaryTint} fg={colors.primary} />
        {paragraphs(response.explanation).map((p, i) => (
          <AppText key={i} variant="reading" scale={scale} selectable>
            {p}
          </AppText>
        ))}
      </View>

      {response.example ? (
        <View style={[styles.card, styles.exampleCard]}>
          <SectionTitle icon="home-heart" label={t.example} tint={colors.accent} fg={colors.onAccent} />
          {paragraphs(response.example).map((p, i) => (
            <AppText key={i} variant="body" scale={scale} selectable>
              {p}
            </AppText>
          ))}
        </View>
      ) : null}

      {response.key_points.length > 0 ? (
        <View style={styles.card}>
          <SectionTitle icon="star" label={t.keyPoints} tint={colors.successTint} fg={colors.success} />
          {response.key_points.map((point, i) => (
            <View key={i} style={styles.point}>
              <View style={styles.number}>
                <AppText variant="label" color={colors.onPrimary}>
                  {i + 1}
                </AppText>
              </View>
              <AppText variant="body" scale={scale} style={styles.pointText} selectable>
                {point}
              </AppText>
            </View>
          ))}
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: space.lg },
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: 2,
    borderColor: colors.border,
    padding: space.lg,
    gap: space.md,
  },
  exampleCard: { backgroundColor: colors.accentTint, borderColor: colors.accent },
  sectionTitle: { flexDirection: 'row', alignItems: 'center', gap: space.sm },
  sectionIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  point: { flexDirection: 'row', alignItems: 'flex-start', gap: space.md },
  number: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: colors.success,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 1,
  },
  pointText: { flex: 1 },
});
