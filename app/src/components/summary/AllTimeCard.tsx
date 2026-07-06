// All-time stats card (legacy .alltime-card at the bottom of the game section).

import { StyleSheet, Text, View } from 'react-native';

import { Card } from '@/components/ui';
import { useTheme } from '@/hooks/use-theme';
import { fonts } from '@/theme';
import type { ProfileStats } from '@/utils/supabase/db';

import { StatCell } from './shared';

export function AllTimeCard({
  stats,
  activitiesCount,
}: {
  stats: ProfileStats | null;
  activitiesCount: number;
}) {
  const { palette } = useTheme();
  return (
    <Card>
      <Text style={[styles.title, { color: palette.text1 }]}>All-time stats</Text>
      <View style={{ flexDirection: 'row' }}>
        <StatCell value={stats?.all_time_tasks_done ?? 0} label="tasks done" />
        <StatCell value={stats?.all_time_chores_done ?? 0} label="chores done" />
        <StatCell value={stats?.all_time_activities || activitiesCount} label="workouts" />
      </View>
    </Card>
  );
}

const styles = StyleSheet.create({
  title: { fontFamily: fonts.sansMedium, fontSize: 14, marginBottom: 10 },
});
