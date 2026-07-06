// Small settings sheet reachable from the Summary title row: theme mode cycle,
// "Hand to Paige" (restricted mode + jump to the Home tab), and sign out.

import { useRouter } from 'expo-router';
import { Alert, StyleSheet, Text, View } from 'react-native';

import { BottomSheet, Button } from '@/components/ui';
import { useTheme } from '@/hooks/use-theme';
import { useAuthStore } from '@/stores/authStore';
import { usePaigeModeStore } from '@/stores/paigeModeStore';
import { useThemeStore } from '@/stores/themeStore';
import { fonts } from '@/theme';

import { Mono } from './shared';

const MODE_LABEL = { system: '🌗 System', dark: '🌙 Dark', light: '☀️ Light' } as const;

export function SettingsSheet({ visible, onClose }: { visible: boolean; onClose: () => void }) {
  const { palette } = useTheme();
  const router = useRouter();
  const mode = useThemeStore((s) => s.mode);
  const cycleMode = useThemeStore((s) => s.cycleMode);
  const enablePaige = usePaigeModeStore((s) => s.enable);
  const signOut = useAuthStore((s) => s.signOut);

  const handToPaige = () => {
    Alert.alert('Hand to Paige?', 'Only the Home tab stays visible. Long-press its title to exit.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Hand over',
        onPress: () => {
          enablePaige();
          onClose();
          router.replace('/(tabs)/home');
        },
      },
    ]);
  };

  return (
    <BottomSheet visible={visible} onClose={onClose}>
      <Text style={[styles.title, { color: palette.text1 }]}>Settings</Text>

      <View style={styles.row}>
        <View style={{ flex: 1 }}>
          <Text style={[styles.rowLabel, { color: palette.text1 }]}>Theme</Text>
          <Mono size={10}>tap to cycle system → dark → light</Mono>
        </View>
        <Button title={MODE_LABEL[mode]} variant="ghost" onPress={cycleMode} />
      </View>

      <View style={{ gap: 8, marginTop: 14 }}>
        <Button title="💕 Hand to Paige" onPress={handToPaige} />
        <Button
          title="Sign out"
          variant="danger"
          onPress={() => {
            onClose();
            signOut();
          }}
        />
      </View>
    </BottomSheet>
  );
}

const styles = StyleSheet.create({
  title: { fontFamily: fonts.sansMedium, fontSize: 17, marginBottom: 14 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  rowLabel: { fontFamily: fonts.sans, fontSize: 14, marginBottom: 2 },
});
