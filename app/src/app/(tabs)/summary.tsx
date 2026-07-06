// Summary pane — the port of the legacy home pane (rHome + gamification UI):
// XP/level card, streak, 7-game series with the day-result flow, this-week
// stats, balance/pace, per-section area cards, badges, past-week summary and
// all-time stats. Everything on screen is derived from raw store rows at
// render time via src/utils/compute.ts.

import { useRouter } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { AllTimeCard } from '@/components/summary/AllTimeCard';
import { BadgesCard } from '@/components/summary/BadgesCard';
import { BalanceCard } from '@/components/summary/BalanceCard';
import { DayResultSheet } from '@/components/summary/DayResultSheet';
import { LastWeekCard } from '@/components/summary/LastWeekCard';
import { SectionStatCard } from '@/components/summary/SectionStatCard';
import { SeriesCard } from '@/components/summary/SeriesCard';
import { SettingsSheet } from '@/components/summary/SettingsSheet';
import { Mono } from '@/components/summary/shared';
import { StreakCard } from '@/components/summary/StreakCard';
import { TargetsSheet } from '@/components/summary/TargetsSheet';
import { WeekCard } from '@/components/summary/WeekCard';
import { WeeklyReviewSheet } from '@/components/summary/WeeklyReviewSheet';
import { XpCard } from '@/components/summary/XpCard';
import { Loading, PaneTitle, Screen } from '@/components/ui';
import { useTheme } from '@/hooks/use-theme';
import { useDataStore } from '@/stores/dataStore';
import {
  buildXpMap,
  choreLastDoneMap,
  communityWeekStats,
  deriveWeekSummary,
  effectiveStreak,
  freshness,
  jsonNumberRecord,
  lifeCardExtras,
  paceBySection,
  pastWeekStats,
  sectionTaskStats,
  weekBadgesEarnedThisWeek,
  weekComparison,
  weekXpBySection,
} from '@/utils/compute';
import { fmtLong, fmtWeekday, getWeekStart, todayIso } from '@/utils/dates';
import { reconcileStatsOnLoad } from '@/utils/xp';

export default function SummaryScreen() {
  const { palette } = useTheme();
  const router = useRouter();
  const store = useDataStore();
  const {
    loaded,
    loading,
    loadAll,
    profileStats,
    tasks,
    chores,
    choreLog,
    contactLog,
    activities,
    relActs,
    people,
    journalEntries,
    financeEntries,
    dayResults,
    xpValues,
  } = store;

  const [dayResultDate, setDayResultDate] = useState<string | null>(null);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [targetsOpen, setTargetsOpen] = useState(false);
  const [reviewOpen, setReviewOpen] = useState(false);
  const [lwOffset, setLwOffset] = useState(0);

  useEffect(() => {
    if (!loaded) loadAll();
  }, [loaded, loadAll]);

  // Legacy applyData tail: zero lapsed streaks, credit already-met badges.
  useEffect(() => {
    if (loaded) reconcileStatsOnLoad();
  }, [loaded]);

  const today = todayIso();
  const weekStart = getWeekStart(today);

  const xpMap = useMemo(() => buildXpMap(xpValues), [xpValues]);
  const weekRows = useMemo(
    () => ({ tasks, choreLog, contactLog, activities, relActs }),
    [tasks, choreLog, contactLog, activities, relActs],
  );
  const balanceRows = useMemo(() => ({ ...weekRows, people }), [weekRows, people]);

  const summary = useMemo(
    () => deriveWeekSummary(weekRows, xpMap, weekStart),
    [weekRows, xpMap, weekStart],
  );
  const comparison = useMemo(
    () => weekComparison(weekRows, xpMap, weekStart, today),
    [weekRows, xpMap, weekStart, today],
  );
  const bySection = useMemo(
    () => weekXpBySection(balanceRows, xpMap, weekStart),
    [balanceRows, xpMap, weekStart],
  );
  const pace = useMemo(
    () => paceBySection(balanceRows, xpMap, weekStart, today),
    [balanceRows, xpMap, weekStart, today],
  );
  const lastWeek = useMemo(
    () => pastWeekStats({ ...balanceRows, dayResults }, xpMap, weekStart, lwOffset),
    [balanceRows, dayResults, xpMap, weekStart, lwOffset],
  );
  const weekBadgeIds = useMemo(
    () => weekBadgesEarnedThisWeek(profileStats, summary, contactLog, weekStart),
    [profileStats, summary, contactLog, weekStart],
  );

  const streak = effectiveStreak(profileStats, today);

  // ── Area cards (legacy sum-grid) ────────────────────────────────────────────
  const lastDoneByChore = useMemo(() => choreLastDoneMap(choreLog), [choreLog]);
  const relOverdue = relActs.filter((r) => freshness(r.last_done, r.interval_days, today).overdue);
  const staleChores = chores.filter(
    (c) => freshness(lastDoneByChore[c.id] ?? null, c.interval_days, today).overdue,
  ).length;
  const community = communityWeekStats(people, contactLog, weekStart);
  const life = lifeCardExtras(journalEntries, financeEntries, weekStart);
  const workStat = sectionTaskStats(tasks, 'work', weekStart, today);
  const healthStat = sectionTaskStats(tasks, 'health', weekStart, today);
  const personalStat = sectionTaskStats(tasks, 'personal', weekStart, today);
  const communityPace =
    pace.community_family.status === 'behind' || pace.community_friends.status === 'behind'
      ? 'behind'
      : pace.community_family.status === 'ahead' && pace.community_friends.status === 'ahead'
        ? 'ahead'
        : null;

  const journalCountWk = journalEntries.filter((j) => j.date >= weekStart).length;

  return (
    <Screen onRefresh={loadAll} refreshing={loading && loaded}>
      <PaneTitle
        title="JrDr's Office"
        right={
          <View style={styles.titleRight}>
            <View style={{ alignItems: 'flex-end' }}>
              <Mono size={10}>{fmtWeekday(today)}</Mono>
              <Mono size={10}>{fmtLong(today)}</Mono>
            </View>
            <Pressable onPress={() => setSettingsOpen(true)} hitSlop={8}>
              <Text style={{ fontSize: 17 }}>⚙️</Text>
            </Pressable>
          </View>
        }
      />

      {!loaded ? (
        <Loading label="loading the office…" />
      ) : (
        <>
          <XpCard
            xp={Number(profileStats?.xp) || 0}
            proactivePoints={Number(profileStats?.proactive_points) || 0}
            weekXp={summary.xpEarned}
            weekPP={summary.proactivePoints}
            comparison={comparison}
          />
          <StreakCard days={streak.days} best={streak.best} />

          <SeriesCard
            dayResults={dayResults}
            weekStart={weekStart}
            today={today}
            onDayPress={setDayResultDate}
          />

          <Mono size={10} color={palette.text3} style={styles.divider}>
            🗂 AREAS
          </Mono>
          <View style={styles.grid}>
            <SectionStatCard
              icon="💕"
              name="Paige"
              color={palette.paige}
              stat={{ all: relOverdue.length, done: relActs.length - relOverdue.length, over: 0 }}
              pace={pace.paige.status}
              onPress={() => router.push('/(tabs)/paige')}
            />
            <SectionStatCard
              icon="💼"
              name="Work"
              color={palette.work}
              stat={workStat}
              pace={pace.work.status}
              onPress={() => router.push('/(tabs)/work')}
            />
            <SectionStatCard
              icon="👥"
              name="Community"
              color={palette.community}
              stat={{ all: community.total, done: community.distinct, over: 0 }}
              subOverride={`${community.distinct} connects · ${community.famPct}% fam · ${community.friPct}% fri`}
              pace={communityPace}
              onPress={() => router.push('/(tabs)/community')}
            />
            <SectionStatCard
              icon="🏠"
              name="Home"
              color={palette.chores}
              stat={{ all: 0, done: 0, over: 0 }}
              bigOverride={staleChores}
              subOverride="chores overdue"
              barPctOverride={
                chores.length ? Math.round(((chores.length - staleChores) / chores.length) * 100) : 0
              }
              pace={pace.chores.status}
              onPress={() => router.push('/(tabs)/home')}
            />
            <SectionStatCard
              icon="🏃"
              name="Health"
              color={palette.health}
              stat={healthStat}
              extra={`${summary.activitiesLogged} sessions`}
              pace={pace.health.status}
              onPress={() => router.push('/(tabs)/life')}
            />
            <SectionStatCard
              icon="✦"
              name="Life"
              color={palette.personal}
              stat={personalStat}
              extra={`${life.journalCount} entries · $${life.totalSaved.toLocaleString('en-US')} saved`}
              pace={pace.personal.status}
              onPress={() => router.push('/(tabs)/life')}
            />
          </View>

          <Mono size={10} color={palette.text3} style={styles.divider}>
            📆 THIS WEEK
          </Mono>
          <WeekCard summary={summary} onResetPress={() => setReviewOpen(true)} />
          <BalanceCard bySection={bySection} pace={pace} onTargetsPress={() => setTargetsOpen(true)} />

          <Mono size={10} color={palette.text3} style={styles.divider}>
            🎮 THE GAME
          </Mono>
          <BadgesCard
            weekEarnedIds={weekBadgeIds}
            permEarnedIds={profileStats?.badges ?? []}
            weeklyHistory={jsonNumberRecord(profileStats?.weekly_badge_history)}
          />
          <LastWeekCard stats={lastWeek} offset={lwOffset} onOffsetChange={setLwOffset} />
          <AllTimeCard stats={profileStats} activitiesCount={activities.length} />
        </>
      )}

      <DayResultSheet date={dayResultDate} onClose={() => setDayResultDate(null)} />
      <SettingsSheet visible={settingsOpen} onClose={() => setSettingsOpen(false)} />
      <TargetsSheet visible={targetsOpen} onClose={() => setTargetsOpen(false)} />
      <WeeklyReviewSheet
        visible={reviewOpen}
        onClose={() => setReviewOpen(false)}
        weekStart={weekStart}
        summary={summary}
        weekBadgeIds={weekBadgeIds}
        journalCount={journalCountWk}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  titleRight: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  divider: {
    textTransform: 'uppercase',
    letterSpacing: 1.5,
    marginTop: 8,
    marginBottom: 8,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 10,
  },
});
