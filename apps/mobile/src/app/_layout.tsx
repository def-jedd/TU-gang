import { Andika_400Regular, Andika_700Bold } from '@expo-google-fonts/andika';
import { Fredoka_600SemiBold, Fredoka_700Bold } from '@expo-google-fonts/fredoka';
import { useFonts } from 'expo-font';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';

import { View } from 'react-native';
import { BottomNav } from '@/components/BottomNav';
import { iconFont } from '@/components/Icon';
import { TutorProvider } from '@/hooks/useTutor';
import { NfcProvider } from '@/nfc/NfcProvider';
import { ProfileProvider } from '@/profiles/ProfileProvider';
import { colors } from '@/theme/tokens';
import { VoiceProvider } from '@/voice/VoiceProvider';

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
    <ProfileProvider>
      <TutorProvider>
      <VoiceProvider>
        <NfcProvider>
          <StatusBar style="dark" />
          <View style={{flex:1}}><Stack
            screenOptions={{
              headerShown: false,
              contentStyle: { backgroundColor: colors.bg },
              animation: 'slide_from_right',
            }}
          /><BottomNav /></View>
        </NfcProvider>
      </VoiceProvider>
      </TutorProvider>
    </ProfileProvider>
  );
}
