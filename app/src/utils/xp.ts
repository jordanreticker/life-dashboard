// XP mutation layer — the RN port of the legacy addXP / markActive /
// checkPermBadges / checkWeekBadges flow. Every award/revoke composes a single
// profile_stats write (per-row, through db.ts) and reflects it in the data
// store via setProfileStats. Callers are expected to have ALREADY written and
// reflected the domain row (task update, chore_log insert, …) before calling,
// so badge checks see the fresh state. Helpers return what happened (xp, pp,
// level-ups, new badges) so screens can toast/confetti as they see fit.

import { useDataStore } from '@/stores/dataStore';
import * as db from '@/utils/supabase/db';
import type {
  Chore,
  ChoreLogEntry,
  ContactLogEntry,
  DayResult,
  HealthGoal,
  ProfileStats,
  RelAct,
  Task,
} from '@/utils/supabase/db';

import {
  activityXp,
  buildXpMap,
  calcChoreProactivePoints,
  calcProactivePoints,
  computePermBadgeIds,
  computeWeekBadgeIds,
  deriveWeekSummary,
  effectiveStreak,
  freshness,
  getLevelIdx,
  jsonNumberRecord,
  jsonStringRecord,
  taskBaseXp,
  contactXp,
  xpFor,
  LEVELS,
  type XpMap,
} from './compute';
import { dayDiff, getWeekStart, todayIso, weekEnd } from './dates';

export type CompletedBy = 'me' | 'joint' | 'paige';

// ── Internals ─────────────────────────────────────────────────────────────────

const state = () => useDataStore.getState();

function currentXpMap(): XpMap {
  return buildXpMap(state().xpValues);
}

/** Current effective value for an XP key (xp_values override → default). */
export function xpValue(key: string): number {
  return xpFor(key, currentXpMap());
}

interface StatsDraft {
  xp: number;
  level: number;
  streakDays: number;
  bestStreak: number;
  lastActiveDate: string | null;
  badges: string[];
  proactivePoints: number;
  allTimeTasksDone: number;
  allTimeChoresDone: number;
  allTimeActivities: number;
  weeklyBadgeHistory: Record<string, number>;
  weeklyBadgeLastEarned: Record<string, string>;
}

export interface StatsResult {
  xpDelta: number;
  totalXp: number;
  leveledUp: boolean;
  levelIdx: number;
  levelLabel: string;
  levelEmoji: string;
  newPermBadges: string[];
  newWeekBadges: string[];
}

function draftFrom(ps: ProfileStats): StatsDraft {
  return {
    xp: Number(ps.xp) || 0,
    level: ps.level,
    streakDays: ps.streak_days,
    bestStreak: ps.best_streak,
    lastActiveDate: ps.last_active_date,
    badges: [...ps.badges],
    proactivePoints: Number(ps.proactive_points) || 0,
    allTimeTasksDone: ps.all_time_tasks_done,
    allTimeChoresDone: ps.all_time_chores_done,
    allTimeActivities: ps.all_time_activities,
    weeklyBadgeHistory: { ...jsonNumberRecord(ps.weekly_badge_history) },
    weeklyBadgeLastEarned: { ...jsonStringRecord(ps.weekly_badge_last_earned) },
  };
}

/** Legacy markActive(): only ever marks *today* active, extends/starts the streak. */
function markActiveDraft(d: StatsDraft): void {
  const today = todayIso();
  if (d.lastActiveDate === today) return;
  const diff = d.lastActiveDate ? dayDiff(d.lastActiveDate, today) : 999;
  d.streakDays = diff === 1 ? d.streakDays + 1 : 1;
  if (d.streakDays > d.bestStreak) d.bestStreak = d.streakDays;
  d.lastActiveDate = today;
}

/**
 * Core engine: copy profile_stats into a draft, apply the mutation, then run
 * the legacy post-award pipeline (level-up, permanent badges, weekly badge
 * history) and persist everything as ONE profile_stats update.
 */
async function mutateStats(fn: (d: StatsDraft) => void): Promise<StatsResult | null> {
  const s = state();
  const ps = s.profileStats;
  if (!ps) return null; // stats row not loaded yet — nothing to mutate

  const d = draftFrom(ps);
  const startXp = d.xp;
  fn(d);

  // Level-up (legacy addXP: index compared against the stored `level` field).
  const newIdx = getLevelIdx(d.xp);
  const leveledUp = newIdx > d.level;
  if (leveledUp) d.level = newIdx;

  // Permanent badges (legacy checkPermBadges — reads current collections).
  const permIds = computePermBadgeIds({
    xp: d.xp,
    bestStreak: d.bestStreak,
    proactivePoints: d.proactivePoints,
    allTimeTasksDone: d.allTimeTasksDone,
    allTimeChoresDone: d.allTimeChoresDone,
    activitiesCount: s.activities.length,
    contactLog: s.contactLog,
    people: s.people,
  });
  const newPermBadges = permIds.filter((id) => !d.badges.includes(id));
  d.badges = [...d.badges, ...newPermBadges];

  // Weekly badges (legacy checkWeekBadges — once per badge per week).
  const weekStart = getWeekStart(todayIso());
  const summary = deriveWeekSummary(s, currentXpMap(), weekStart);
  const weekIds = computeWeekBadgeIds(summary, s.contactLog, weekStart);
  const newWeekBadges: string[] = [];
  weekIds.forEach((id) => {
    if (d.weeklyBadgeLastEarned[id] !== weekStart) {
      d.weeklyBadgeHistory[id] = (d.weeklyBadgeHistory[id] || 0) + 1;
      d.weeklyBadgeLastEarned[id] = weekStart;
      newWeekBadges.push(id);
    }
  });

  const next: ProfileStats = {
    ...ps,
    xp: d.xp,
    level: d.level,
    streak_days: d.streakDays,
    best_streak: d.bestStreak,
    last_active_date: d.lastActiveDate,
    badges: d.badges,
    proactive_points: d.proactivePoints,
    all_time_tasks_done: d.allTimeTasksDone,
    all_time_chores_done: d.allTimeChoresDone,
    all_time_activities: d.allTimeActivities,
    weekly_badge_history: d.weeklyBadgeHistory,
    weekly_badge_last_earned: d.weeklyBadgeLastEarned,
  };

  // Optimistic reflect, then reconcile with the row the write returns.
  s.setProfileStats(next);
  const { data, error } = await db.profileStats.update(ps.id, {
    xp: next.xp,
    level: next.level,
    streak_days: next.streak_days,
    best_streak: next.best_streak,
    last_active_date: next.last_active_date,
    badges: next.badges,
    proactive_points: next.proactive_points,
    all_time_tasks_done: next.all_time_tasks_done,
    all_time_chores_done: next.all_time_chores_done,
    all_time_activities: next.all_time_activities,
    weekly_badge_history: next.weekly_badge_history,
    weekly_badge_last_earned: next.weekly_badge_last_earned,
  });
  if (error) console.warn('[xp] profile_stats save failed:', error.message);
  if (data) state().setProfileStats(data);

  const lvl = LEVELS[d.level] ?? LEVELS[LEVELS.length - 1];
  return {
    xpDelta: d.xp - startXp,
    totalXp: d.xp,
    leveledUp,
    levelIdx: d.level,
    levelLabel: lvl.label,
    levelEmoji: lvl.emoji,
    newPermBadges,
    newWeekBadges,
  };
}

// ── Generic award / revoke ────────────────────────────────────────────────────

/**
 * Add raw XP (legacy addXP). markActive defaults to false — most legacy call
 * sites paired addXP with an explicit markActive(), which the domain helpers
 * below replicate; use { markActive: true } for ad-hoc awards.
 */
export async function awardXp(
  amount: number,
  opts: { markActive?: boolean } = {},
): Promise<StatsResult | null> {
  return mutateStats((d) => {
    d.xp += amount;
    if (opts.markActive) markActiveDraft(d);
  });
}

/**
 * Remove XP (delete/undo flows). clampAtZero mirrors the legacy contact-log
 * delete (Math.max(0, xp-amount)); proactivePoints, when given, is also
 * deducted (clamped at 0).
 */
export async function revokeXp(
  amount: number,
  opts: { clampAtZero?: boolean; proactivePoints?: number } = {},
): Promise<StatsResult | null> {
  return mutateStats((d) => {
    d.xp = opts.clampAtZero ? Math.max(0, d.xp - amount) : d.xp - amount;
    if (opts.proactivePoints)
      d.proactivePoints = Math.max(0, d.proactivePoints - opts.proactivePoints);
  });
}

// ── Domain helpers (one per legacy completion flow) ───────────────────────────

export interface TaskAward {
  baseXp: number;
  pp: number;
  earnedXp: number;
  credited: boolean;
  stats: StatsResult | null;
}

/**
 * Task completed (legacy completeTask): base XP by priority (or stored
 * xp_value), proactive bonus for finishing early. 'joint' earns half base and
 * no PP; 'paige' earns nothing. Backdated completions don't extend the streak.
 * Caller updates the task row itself (done/completed_date/proactive_points/
 * completed_by); call this after reflecting it.
 */
export async function awardTaskCompletion(
  task: Task,
  doneDate: string,
  who: CompletedBy = 'me',
): Promise<TaskAward> {
  const xpMap = currentXpMap();
  const baseXp = taskBaseXp(task, xpMap);
  const pp = who === 'me' ? calcProactivePoints(task.due_date, doneDate, xpMap) : 0;
  const earnedXp = who === 'me' ? baseXp + pp : who === 'joint' ? Math.round(baseXp / 2) : 0;
  const credited = who !== 'paige';
  if (!credited) return { baseXp, pp, earnedXp: 0, credited, stats: null };
  const stats = await mutateStats((d) => {
    d.xp += earnedXp;
    if (doneDate === todayIso()) markActiveDraft(d);
    d.allTimeTasksDone += 1;
    if (pp > 0) d.proactivePoints += pp;
  });
  return { baseXp, pp, earnedXp, credited, stats };
}

/**
 * Completed task's dates edited (legacy openEditTask): the proactive bonus is
 * re-graded and the XP/PP delta applied. Returns the delta (0 = no change).
 */
export async function regradeTaskProactive(
  oldPp: number,
  newPp: number,
): Promise<{ delta: number; stats: StatsResult | null }> {
  const delta = newPp - oldPp;
  if (delta === 0) return { delta: 0, stats: null };
  const stats = await mutateStats((d) => {
    d.proactivePoints += delta;
    d.xp += delta;
  });
  return { delta, stats };
}

export interface ChoreAward {
  baseXp: number;
  pp: number;
  totalXp: number;
  credited: boolean;
  stats: StatsResult | null;
}

/**
 * Chore completed (legacy openChoreModal confirm): PP only on solo completions
 * while the chore is still fresh; 'joint' earns half base, 'paige' nothing.
 * `lastDoneBefore` is the chore's last completion BEFORE this one (from
 * choreLastDoneMap). Insert + reflect the chore_log row first —
 * all_time_chores_done is recounted from the log (non-Paige entries).
 */
export async function awardChoreCompletion(
  chore: Chore,
  who: CompletedBy,
  lastDoneBefore: string | null,
): Promise<ChoreAward> {
  const xpMap = currentXpMap();
  const baseXp = Number(chore.xp_value) || 0;
  const pp =
    who === 'me' ? calcChoreProactivePoints(lastDoneBefore, chore.interval_days, xpMap) : 0;
  const totalXp = who === 'me' ? baseXp + pp : who === 'joint' ? Math.round(baseXp / 2) : 0;
  const credited = who !== 'paige';
  if (!credited) return { baseXp, pp, totalXp: 0, credited, stats: null };
  const stats = await mutateStats((d) => {
    d.xp += totalXp;
    markActiveDraft(d);
    d.allTimeChoresDone = state().choreLog.filter((l) => l.completed_by !== 'paige').length;
    if (pp > 0) d.proactivePoints += pp;
  });
  return { baseXp, pp, totalXp, credited, stats };
}

/**
 * Chore-log entry deleted (legacy openChoreLogEdit delete): its XP and PP are
 * refunded and all_time_chores_done recounted. Remove + reflect the row first.
 */
export async function revokeChoreLogEntry(entry: ChoreLogEntry): Promise<StatsResult | null> {
  return mutateStats((d) => {
    d.xp -= Number(entry.xp_earned) || 0;
    if (Number(entry.proactive_points) > 0)
      d.proactivePoints = Math.max(0, d.proactivePoints - Number(entry.proactive_points));
    d.allTimeChoresDone = state().choreLog.filter((l) => l.completed_by !== 'paige').length;
  });
}

export interface RelActAward {
  pp: number;
  totalXp: number;
  stats: StatsResult | null;
}

/**
 * Relationship act done (legacy confirmRelAct): relact_base plus the proactive
 * bonus when still ≥50% fresh. Pass the rel act BEFORE its last_done is bumped
 * to today (freshness is judged on the prior state).
 */
export async function awardRelActCompletion(relAct: RelAct): Promise<RelActAward> {
  const xpMap = currentXpMap();
  const pp =
    freshness(relAct.last_done, relAct.interval_days).pct >= 50
      ? xpFor('relact_proactive', xpMap)
      : 0;
  const totalXp = xpFor('relact_base', xpMap) + pp;
  const stats = await mutateStats((d) => {
    d.xp += totalXp;
    markActiveDraft(d);
    if (pp > 0) d.proactivePoints += pp;
  });
  return { pp, totalXp, stats };
}

/**
 * Contact(s) logged (legacy confirmContact): per-person XP by type with the
 * family multiplier, summed for group calls/hangouts. `tiers` is one entry per
 * person logged ('family' | 'friends' | 'work').
 */
export async function awardContactLogged(
  type: string,
  tiers: string[],
): Promise<{ totalXp: number; perPerson: number[]; stats: StatsResult | null }> {
  const xpMap = currentXpMap();
  const perPerson = tiers.map((tier) => contactXp(type, tier, xpMap));
  const totalXp = perPerson.reduce((s, v) => s + v, 0);
  const stats = await mutateStats((d) => {
    d.xp += totalXp;
    markActiveDraft(d);
  });
  return { totalXp, perPerson, stats };
}

/** Contact log deleted (legacy deleteContactLog): refund its XP, clamped at 0. */
export async function revokeContactLogEntry(entry: ContactLogEntry): Promise<StatsResult | null> {
  return revokeXp(Number(entry.xp) || 0, { clampAtZero: true });
}

/**
 * Activity logged (legacy openActModal confirm): workout vs low-impact XP,
 * bumps all_time_activities. Pass the just-inserted row (or its type) so the
 * XP matches what the row will show.
 */
export async function awardActivityLogged(
  activity: Pick<db.Activity, 'type' | 'xp'>,
): Promise<{ xp: number; stats: StatsResult | null }> {
  const amount = activityXp(activity as db.Activity, currentXpMap());
  const stats = await mutateStats((d) => {
    d.xp += amount;
    markActiveDraft(d);
    d.allTimeActivities += 1;
  });
  return { xp: amount, stats };
}

/** Journal entry saved (legacy submitJournal): flat journal_entry XP. */
export async function awardJournalEntry(): Promise<{ xp: number; stats: StatsResult | null }> {
  const amount = xpValue('journal_entry');
  return { xp: amount, stats: await mutateStats((d) => (d.xp += amount)) };
}

/** Savings entry logged (legacy openFinModal): flat savings_log XP. */
export async function awardSavingsLogged(): Promise<{ xp: number; stats: StatsResult | null }> {
  const amount = xpValue('savings_log');
  return { xp: amount, stats: await mutateStats((d) => (d.xp += amount)) };
}

/** Inbox hit zero today (legacy setInboxCount): inbox_zero XP + streak mark. */
export async function awardInboxZero(): Promise<{ xp: number; stats: StatsResult | null }> {
  const amount = xpValue('inbox_zero');
  const stats = await mutateStats((d) => {
    d.xp += amount;
    markActiveDraft(d);
  });
  return { xp: amount, stats };
}

/** List item checked off (legacy shopping/grocery lists): list_item_done XP. */
export async function awardListItemDone(): Promise<{ xp: number; stats: StatsResult | null }> {
  const amount = xpValue('list_item_done');
  return { xp: amount, stats: await mutateStats((d) => (d.xp += amount)) };
}

export interface HealthGoalAward {
  xp: number;
  fullWeek: boolean;
  superBadgeEarned: boolean;
  stats: StatsResult | null;
}

/**
 * Health goal day toggled ON (legacy toggleHealthGoalDay): daily XP, or the
 * full-week bonus + one-time 'goal_<id>' super badge when this hit reaches the
 * weekly target. `hitsThisWeek` counts logs in the current week INCLUDING the
 * new one. (Toggling OFF revokes nothing — legacy behavior.)
 */
export async function awardHealthGoalDay(
  goal: HealthGoal,
  hitsThisWeek: number,
): Promise<HealthGoalAward> {
  const target = Number(goal.target) || 7;
  const fullWeek = hitsThisWeek >= target;
  const amount = fullWeek ? xpValue('health_goal_full_week') : xpValue('health_goal_daily');
  let superBadgeEarned = false;
  const stats = await mutateStats((d) => {
    if (fullWeek) {
      const badgeId = 'goal_' + goal.id;
      if (!d.badges.includes(badgeId)) {
        d.badges.push(badgeId);
        superBadgeEarned = true;
      }
    }
    d.xp += amount;
    markActiveDraft(d);
  });
  return { xp: amount, fullWeek, superBadgeEarned, stats };
}

export interface DayResultAward {
  xp: number;
  seriesBonus: 'win' | 'sweep' | null;
  bonusXp: number;
  stats: StatsResult | null;
}

/**
 * Day W/L committed for the FIRST time on a date (legacy confirmDayResult):
 * day_win/day_loss XP; when this week's wins land exactly on 4 → series_win
 * bonus, exactly on 7 → series_sweep. Upsert + reflect the day_results row
 * first and pass the resulting collection.
 */
export async function awardDayResult(
  result: 'win' | 'loss',
  dayResultsAfter: DayResult[],
  weekStart: string,
): Promise<DayResultAward> {
  const base = result === 'win' ? xpValue('day_win') : xpValue('day_loss');
  const end = weekEnd(weekStart);
  const weekWins = dayResultsAfter.filter(
    (r) => r.date >= weekStart && r.date <= end && r.result === 'win',
  ).length;
  const seriesBonus: 'win' | 'sweep' | null =
    weekWins === 4 ? 'win' : weekWins === 7 ? 'sweep' : null;
  const bonusXp =
    seriesBonus === 'win' ? xpValue('series_win') : seriesBonus === 'sweep' ? xpValue('series_sweep') : 0;
  const stats = await mutateStats((d) => {
    d.xp += base + bonusXp;
    markActiveDraft(d);
  });
  return { xp: base, seriesBonus, bonusXp, stats };
}

/**
 * Paige action logged (legacy logPaigeAction): focus_hit awards +75; fight /
 * mistake only affect the Paige health score, never all-time XP. Returns the
 * XP delta stored on the action row.
 */
export async function awardPaigeAction(
  kind: 'focus_hit' | 'fight' | 'mistake',
): Promise<{ xpDelta: number; stats: StatsResult | null }> {
  const xpMapDelta: Record<string, number> = { focus_hit: 75, fight: -150, mistake: -50 };
  const xpDelta = xpMapDelta[kind] || 0;
  const stats = xpDelta > 0 ? await mutateStats((d) => (d.xp += xpDelta)) : null;
  return { xpDelta, stats };
}

/**
 * Load-time reconciliation (legacy applyData tail: updateStreak +
 * checkPermBadges + checkWeekBadges): zero a lapsed streak and credit any
 * badges whose conditions already hold. Only writes when something changed.
 */
export async function reconcileStatsOnLoad(): Promise<StatsResult | null> {
  const ps = state().profileStats;
  if (!ps) return null;
  const streak = effectiveStreak(ps);
  const lapsed = streak.days !== ps.streak_days;

  // Probe whether mutateStats would change anything badge-wise before writing.
  const s = state();
  const permIds = computePermBadgeIds({
    xp: Number(ps.xp) || 0,
    bestStreak: ps.best_streak,
    proactivePoints: Number(ps.proactive_points) || 0,
    allTimeTasksDone: ps.all_time_tasks_done,
    allTimeChoresDone: ps.all_time_chores_done,
    activitiesCount: s.activities.length,
    contactLog: s.contactLog,
    people: s.people,
  });
  const newPerm = permIds.some((id) => !ps.badges.includes(id));
  const weekStart = getWeekStart(todayIso());
  const weekIds = computeWeekBadgeIds(deriveWeekSummary(s, currentXpMap(), weekStart), s.contactLog, weekStart);
  const lastEarned = jsonStringRecord(ps.weekly_badge_last_earned);
  const newWeek = weekIds.some((id) => lastEarned[id] !== weekStart);

  if (!lapsed && !newPerm && !newWeek) return null;
  return mutateStats((d) => {
    if (lapsed) d.streakDays = streak.days;
  });
}
