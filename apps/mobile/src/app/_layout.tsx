import { Andika_400Regular, Andika_700Bold } from '@expo-google-fonts/andika';
import { Fredoka_600SemiBold, Fredoka_700Bold } from '@expo-google-fonts/fredoka';
import { useFonts } from 'expo-font';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';

import { iconFont } from '@/components/Icon';
import { TutorProvider } from '@/hooks/useTutor';
import { NfcProvider } from '@/nfc/NfcProvider';
import { colors } from '@/theme/tokens';

SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const [fontsLoaded, fontError] = useFonts({
    Andika_400Regular,
    Andika_700Bold,
    Fredoka_600SemiBold,
    Fredoka_700Bold,
    ...iconFont,
  });
  // A font failure must never block the app — fall back to system fonts.
  const ready = fontsLoaded || !!fontError;

  useEffect(() => {
    if (ready) SplashScreen.hideAsync();
  }, [ready]);

  if (!ready) return null;

  return (
    <TutorProvider>
      <NfcProvider>
        <StatusBar style="dark" />
        <Stack
          screenOptions={{
            headerShown: false,
            contentStyle: { backgroundColor: colors.bg },
            animation: 'slide_from_right',
          }}
        />
      </NfcProvider>
    </TutorProvider>
  );
}
