import { ClaySurface } from './ClaySurface';
import { StyleSheet, View } from 'react-native';

import { useTutor } from '../hooks/useTutor';
import { useNfc } from '../nfc/NfcProvider';
import { colors, radius, space } from '../theme/tokens';
import { AppText } from './AppText';
import { Button } from './Button';
import { Icon, type IconName } from './Icon';

/** Tells the truth about NFC on this phone, and always points to the on-screen fallback. */
export function NfcStatusBanner() {
  const { t } = useTutor();
  const { availability, continuous, scanning, scanOnce, openSettings, recheck } = useNfc();

  const view: { icon: IconName; text: string; fg: string; bg: string } = (() => {
    switch (availability) {
      case 'ready':
        return { icon: 'nfc-tap', text: continuous ? t.nfcReady : t.cardsIntro, fg: colors.success, bg: colors.successTint };
      case 'checking':
        return { icon: 'nfc-search-variant', text: t.nfcChecking, fg: colors.inkSoft, bg: colors.surfaceSunken };
      case 'disabled':
        return { icon: 'nfc-variant-off', text: t.nfcDisabled, fg: colors.warn, bg: colors.warnTint };
      case 'expo_go':
        return { icon: 'cellphone-cog', text: t.nfcExpoGo, fg: colors.inkSoft, bg: colors.surfaceSunken };
      case 'error':
        return { icon: 'alert-circle-outline', text: t.nfcError, fg: colors.warn, bg: colors.warnTint };
      default:
        return { icon: 'nfc-variant-off', text: t.nfcUnsupported, fg: colors.inkSoft, bg: colors.surfaceSunken };
    }
  })();

  return (
    <ClaySurface style={[styles.banner, { backgroundColor: view.bg }]} accessibilityLiveRegion="polite">
      <View style={styles.row}>
        <Icon name={view.icon} size={32} color={view.fg} />
        <AppText style={styles.text} color={colors.ink}>
          {view.text}
        </AppText>
      </View>
      {availability === 'disabled' ? (
        <Button label={t.nfcTurnOn} icon="cog" size="md" variant="secondary" onPress={openSettings} />
      ) : null}
      {availability === 'error' ? (
        <Button label={t.nfcRetry} icon="refresh" size="md" variant="secondary" onPress={recheck} />
      ) : null}
      {availability === 'ready' && !continuous ? (
        <Button label={t.nfcScanButton} icon="nfc-tap" size="md" onPress={scanOnce} loading={scanning} />
      ) : null}
    </ClaySurface>
  );
}

const styles = StyleSheet.create({
  banner: { borderRadius: radius.lg, padding: space.lg, gap: space.md },
  row: { flexDirection: 'row', alignItems: 'center', gap: space.md },
  text: { flex: 1 },
});
