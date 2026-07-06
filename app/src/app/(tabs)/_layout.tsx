import { Tabs } from 'expo-router';
import { Text, type ColorValue } from 'react-native';

import { useTheme } from '@/hooks/use-theme';
import { usePaigeModeStore } from '@/stores/paigeModeStore';
import { fonts } from '@/theme';

function tabIcon(emoji: string) {
  return ({ color }: { color: ColorValue }) => (
    <Text style={{ fontSize: 20, color }}>{emoji}</Text>
  );
}

// The legacy bottom tab bar: Summary ⊙ / Paige 💕 / Work 💼 / Community 👥 /
// Home 🏠 / Life ✦. In Paige mode every tab except Home is hidden (href: null)
// so the device can be handed over showing only chores/lists.
export default function TabsLayout() {
  const { palette } = useTheme();
  const paigeMode = usePaigeModeStore((s) => s.active);
  const hidden = (name: string) => (paigeMode ? { href: null as null } : {});

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: palette.text1,
        tabBarInactiveTintColor: palette.text3,
        tabBarStyle: {
          backgroundColor: palette.surface,
          borderTopColor: palette.border,
        },
        tabBarLabelStyle: { fontFamily: fonts.monoMedium, fontSize: 10, letterSpacing: 0.4 },
        sceneStyle: { backgroundColor: palette.bg },
      }}
    >
      {/* index forwards to summary (or home in Paige mode); hidden from the bar. */}
      <Tabs.Screen name="index" options={{ href: null }} />
      <Tabs.Screen
        name="summary"
        options={{ title: 'Summary', tabBarIcon: tabIcon('⊙'), ...hidden('summary') }}
      />
      <Tabs.Screen
        name="paige"
        options={{ title: 'Paige', tabBarIcon: tabIcon('💕'), ...hidden('paige') }}
      />
      <Tabs.Screen
        name="work"
        options={{ title: 'Work', tabBarIcon: tabIcon('💼'), ...hidden('work') }}
      />
      <Tabs.Screen
        name="community"
        options={{ title: 'Community', tabBarIcon: tabIcon('👥'), ...hidden('community') }}
      />
      <Tabs.Screen name="home" options={{ title: 'Home', tabBarIcon: tabIcon('🏠') }} />
      <Tabs.Screen
        name="life"
        options={{ title: 'Life', tabBarIcon: tabIcon('✦'), ...hidden('life') }}
      />
    </Tabs>
  );
}
