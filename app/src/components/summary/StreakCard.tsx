// Streak card (legacy .streak-card): only rendered at 2+ days.

import { StyleSheet, Text, View } from 'react-native';

import { Card } from '@/components/ui';
import { useTheme } from '@/hooks/use-theme';
import { fonts } from '@/theme';

import { Mono } from './shared';

export function StreakCard({ days, best }: { days: number; best: number }) {
  const { palette } = useTheme();
  if (days < 2) return null;
  const icon = days >= 30 ? '💫' : days >= 7 ? '🔥' : '⚡';
  return (
    <Card style={styles.row}>
      <Text style={styles.icon}>{icon}</Text>
      <View style={{ flex: 1 }}>
        <Text style={[styles.title, { color: palette.text1 }]}>{days}-day streak</Text>
        <Text style={[styles.sub, { color: palette.text2 }]}>don't break the chain</Text>
      </View>
      <Mono size={10} color={palette.text3}>
        best: {best} days
      </Mono>
    </Card>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  icon: { fontSize: 26 },
  title: { fontFamily: fonts.sansMedium, fontSize: 14 },
  sub: { fontFamily: fonts.sans, fontSize: 11, marginTop: 1 },
});
