// "This week" stats card (legacy .week-card): the 6-cell stat row plus the
// Reset week button that opens the weekly review.

import { Pressable, StyleSheet, Text, View } from 'react-native';

import { Card } from '@/components/ui';
import { useTheme } from '@/hooks/use-theme';
import { fonts } from '@/theme';
import type { WeekSummary } from '@/utils/compute';

import { StatCell } from './shared';

export function WeekCard({
  summary,
  onResetPress,
}: {
  summary: WeekSummary;
  onResetPress: () => void;
}) {
  const { palette } = useTheme();
  return (
    <Card>
      <View style={styles.hd}>
        <Text style={[styles.title, { color: palette.text1 }]}>this week</Text>
        <Pressable onPress={onResetPress} hitSlop={6}>
          <Text style={[styles.reset, { color: palette.danger }]}>↺ Reset week</Text>
        </Pressable>
      </View>
      <View style={styles.row}>
        <StatCell value={summary.tasksDone} label="tasks" />
        <StatCell value={summary.choresDone} label="chores" />
        <StatCell value={summary.choreXP} label="chore XP" />
        <StatCell value={summary.activitiesLogged} label="sessions" />
        <StatCell value={summary.distinctConnects} label="connects" />
        <StatCell value={summary.proactivePoints} label="PP ⚡" color={palette.pp} />
      </View>
    </Card>
  );
}

const styles = StyleSheet.create({
  hd: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  title: { fontFamily: fonts.sansMedium, fontSize: 14 },
  reset: { fontFamily: fonts.mono, fontSize: 11 },
  row: { flexDirection: 'row' },
});
