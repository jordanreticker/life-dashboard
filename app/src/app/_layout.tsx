import {
  DMMono_400Regular,
  DMMono_500Medium,
} from '@expo-google-fonts/dm-mono';
import {
  DMSans_300Light,
  DMSans_400Regular,
  DMSans_500Medium,
  DMSans_700Bold,
  useFonts,
} from '@expo-google-fonts/dm-sans';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import { Platform } from 'react-native';

import { useTheme } from '@/hooks/use-theme';
import { useAuthStore } from '@/stores/authStore';
import { usePaigeModeStore } from '@/stores/paigeModeStore';
import { useThemeStore } from '@/stores/themeStore';

export default function RootLayout() {
  const { palette, isDark } = useTheme();
  const { userId, isHydrated, hydrate } = useAuthStore();
  const hydrateTheme = useThemeStore((s) => s.hydrate);
  const hydratePaige = usePaigeModeStore((s) => s.hydrate);
  const [fontsLoaded] = useFonts({
    DMSans_300Light,
    DMSans_400Regular,
    DMSans_500Medium,
    DMSans_700Bold,
    DMMono_400Regular,
    DMMono_500Medium,
  });

  useEffect(() => {
    hydrate();
    hydrateTheme();
    hydratePaige();
    if (Platform.OS === 'web') document.title = "JrDr's Office";
  }, [hydrate, hydrateTheme, hydratePaige]);

  if (!fontsLoaded || !isHydrated) return null;

  return (
    <>
      <StatusBar style={isDark ? 'light' : 'dark'} />
      <Stack
        screenOptions={{
          headerShown: false,
          contentStyle: { backgroundColor: palette.bg },
        }}
      >
        <Stack.Protected guard={!!userId}>
          <Stack.Screen name="(tabs)" />
        </Stack.Protected>
        <Stack.Protected guard={!userId}>
          <Stack.Screen name="sign-in" />
        </Stack.Protected>
      </Stack>
    </>
  );
}
