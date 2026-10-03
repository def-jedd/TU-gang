import { StyleSheet, View } from 'react-native';

import type { Copy } from '../i18n/copy';
import { category, colors, radius, space } from '../theme/tokens';
import type { ExplainResponse, Language } from '../types/tutor';
import { AppText } from './AppText';
import { Icon, type IconName } from './Icon';

function Pill({ icon, label, fg, bg, a11y }: { icon: IconName; label: string; fg: string; bg: string; a11y?: string }) {
  return (
    <View style={[styles.pill, { backgroundColor: bg }]} accessible accessibilityLabel={a11y ?? label}>
      <Icon name={icon} size={18} color={fg} />
      <AppText variant="caption" color={fg} bold>
        {label}
      </AppText>
    </View>
  );
}

export function LanguageBadge({ t, language }: { t: Copy; language: Language }) {
  const label = language === 'tagalog' ? t.answerLanguageTagalog
    : language === 'english' ? t.answerLanguageEnglish : t.answerLanguageBikol;
  return (
    <Pill
      icon="map-marker-radius"
      label={label}
      a11y={`${t.answerLanguageTitle}: ${label}`}
      fg={category.language.ink}
      bg={category.language.tint}
    />
  );
}

/**
 * Always says who wrote the answer. Mock data is impossible to mistake for
 * live AI, and a provider is only claimed when the backend says so.
 */
export function ProviderBadge({ provider, t }: { provider: ExplainResponse['provider']; t: Copy }) {
  switch (provider) {
    case 'gemini':
      return <Pill icon="creation" label={t.providerGemini} fg={colors.success} bg={colors.successTint} />;
    case 'kiro':
      return <Pill icon="lightning-bolt" label={t.providerKiro} fg={colors.success} bg={colors.successTint} />;
    case 'ollama':
      return <Pill icon="laptop" label={t.providerOllama} fg={colors.inkSoft} bg={colors.surfaceSunken} />;
    case 'quick':
      return <Pill icon="lightning-bolt" label={t.providerQuick} fg={colors.success} bg={colors.successTint} />;
    case 'approved_fallback':
      return <Pill icon="shield-check" label={t.providerFallback} fg={colors.inkSoft} bg={colors.surfaceSunken} />;
    case 'mock':
      return <Pill icon="flask" label={t.providerMock} fg={colors.warn} bg={colors.warnTint} />;
    default:
      return <Pill icon="help-circle-outline" label={t.providerUnknown} fg={colors.inkSoft} bg={colors.surfaceSunken} />;
  }
}

const styles = StyleSheet.create({
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.xs,
    paddingHorizontal: space.md,
    paddingVertical: space.xs + 2,
    borderRadius: radius.pill,
    alignSelf: 'flex-start',
  },
});
