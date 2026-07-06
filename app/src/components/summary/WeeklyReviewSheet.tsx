// Weekly review + reset (legacy openWeeklyReview/confirmReset): "Round
// Complete" recap, then Start fresh week — snapshots the week into
// weekly_stats, purges completed tasks, and clears health-goal logs.

import { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { BottomSheet, Button } from '@/components/ui';
import { useTheme } from '@/hooks/use-theme';
import { useDataStore } from '@/stores/dataStore';
import { fonts } from '@/theme';
import {
  seasonRecord,
  weekRecord,
  WEEK_BADGES,
  type WeekSummary,
} from '@/utils/compute';
import { fmtDate } from '@/utils/dates';
import * as db from '@/utils/supabase/db';

import { fmtNum, Mono, StatCell } from './shared';

export function WeeklyReviewSheet({
  visible,
  onClose,
  weekStart,
  summary,
  weekBadgeIds,
  journalCount,
}: {
  visible: boolean;
  onClose: () => void;
  weekStart: string;
  summary: WeekSummary;
  weekBadgeIds: string[];
  journalCount: number;
}) {
  const { palette } = useTheme();
  const dayResults = useDataStore((s) => s.dayResults);
  const [resetting, setResetting] = useState(false);

  const rec = weekRecord(dayResults, weekStart);
  const season = seasonRecord(dayResults, weekStart);
  const series =
    rec.wins >= 7
      ? { label: 'SWEEP', color: palette.xp, msg: 'Perfect week — every day a win' }
      : rec.wins >= 4
        ? { label: 'SERIES WON', color: palette.success, msg: '4+ wins, you took the week' }
        : rec.losses >= 4
          ? { label: 'SERIES LOST', color: palette.danger, msg: '4+ losses — bounce back next week' }
          : { label: 'INCOMPLETE', color: palette.text2, msg: 'Did not log enough days' };
  const earnedBadges = WEEK_BADGES.filter((b) => weekBadgeIds.includes(b.id));

  const confirmReset = async () => {
    if (resetting) return;
    setResetting(true);
    const store = useDataStore.getState();
    // 1) Snapshot the week (natural-key upsert — legacy confirmReset record).
    const { data } = await db.weeklyStats.upsert({
      week_start: weekStart,
      tasks_done: summary.tasksDone,
      chores_done: summary.choresDone,
      activities_logged: summary.activitiesLogged,
      contacts_logged: summary.contactsLogged,
      xp_earned: summary.xpEarned,
      proactive_points: summary.proactivePoints,
    });
    if (data) store.upsertRow('weeklyStats', data);
    // 2) Purge ALL completed tasks (per-row deletes, like the legacy purge).
    const doneIds = store.tasks.filter((t) => t.done).map((t) => t.id);
    await Promise.all(doneIds.map((id) => db.tasks.remove(id)));
    store.setCollection(
      'tasks',
      store.tasks.filter((t) => !t.done),
    );
    // 3) Health-goal week grid starts fresh.
    await db.healthGoalLogs.clear();
    store.setCollection('healthGoalLogs', []);
    setResetting(false);
    onClose();
  };

  return (
    <BottomSheet visible={visible} onClose={onClose}>
      <View style={{ alignItems: 'center', marginBottom: 14 }}>
        <Mono size={11} style={{ textTransform: 'uppercase', letterSpacing: 1, marginBottom: 6 }}>
          Round Complete
        </Mono>
        <Text style={[styles.weekTitle, { color: palette.text1 }]}>
          Week of {fmtDate(weekStart)}
        </Text>
      </View>

      <View style={[styles.box, { backgroundColor: palette.card2 }]}>
        <Mono size={11} style={{ textTransform: 'uppercase', letterSpacing: 0.5 }}>
          Series Result
        </Mono>
        <Text style={[styles.bigRecord, { color: series.color }]}>
          {rec.wins}–{rec.losses}
        </Text>
        <Text style={[styles.seriesLabel, { color: series.color }]}>{series.label}</Text>
        <Text style={[styles.seriesMsg, { color: palette.text2 }]}>{series.msg}</Text>
      </View>

      <View style={styles.statGrid}>
        <StatCell value={summary.tasksDone} label="Tasks" />
        <StatCell value={summary.choresDone} label="Chores" />
        <StatCell value={summary.activitiesLogged} label="Workouts" />
      </View>
      <View style={styles.statGrid}>
        <StatCell value={summary.contactsLogged} label="Contacts" />
        <StatCell value={journalCount} label="Journals" />
        <StatCell value={fmtNum(summary.xpEarned)} label="XP" color={palette.xp} />
      </View>

      {earnedBadges.length ? (
        <View style={[styles.box, { backgroundColor: palette.ppBg, alignItems: 'flex-start' }]}>
          <Mono size={11} color={palette.pp} style={{ textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 8 }}>
            Badges this week
          </Mono>
          <View style={styles.badgeRow}>
            {earnedBadges.map((b) => (
              <View key={b.id} style={[styles.badgePill, { backgroundColor: palette.surface }]}>
                <Text style={{ fontSize: 16 }}>{b.emoji}</Text>
                <Text style={[styles.badgeLabel, { color: palette.pp }]}>{b.label}</Text>
              </View>
            ))}
          </View>
        </View>
      ) : null}

      <View style={[styles.box, { backgroundColor: palette.card2 }]}>
        <Mono size={11} style={{ textTransform: 'uppercase', letterSpacing: 0.5 }}>
          Season record
        </Mono>
        <Text style={[styles.seasonRec, { color: palette.text1 }]}>
          {season.wins}–{season.losses}
        </Text>
      </View>

      <View style={{ gap: 8, marginTop: 6 }}>
        <Button title="Start fresh week" variant="danger" onPress={confirmReset} loading={resetting} />
        <Button title="Not yet — keep this week going" variant="ghost" onPress={onClose} />
      </View>
    </BottomSheet>
  );
}

const styles = StyleSheet.create({
  weekTitle: { fontFamily: fonts.sansLight, fontSize: 22, letterSpacing: -0.5 },
  box: { borderRadius: 10, padding: 14, alignItems: 'center', marginBottom: 10 },
  bigRecord: { fontFamily: fonts.sansMedium, fontSize: 32, marginVertical: 4 },
  seriesLabel: { fontFamily: fonts.sansMedium, fontSize: 13, letterSpacing: 0.5 },
  seriesMsg: { fontFamily: fonts.sans, fontSize: 12, marginTop: 4, textAlign: 'center' },
  statGrid: { flexDirection: 'row', marginBottom: 6 },
  badgeRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  badgePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 7,
  },
  badgeLabel: { fontFamily: fonts.sans, fontSize: 11 },
  seasonRec: { fontFamily: fonts.sansMedium, fontSize: 18, marginTop: 4 },
});
