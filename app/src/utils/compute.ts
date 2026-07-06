// PURE compute layer ported from the legacy web app's gamification engine
// (index.html inline script). No I/O, no store access: every function takes raw
// Supabase rows (see src/utils/supabase/db.ts types) plus dates, and returns
// plain objects. Nothing here is persisted — it is all derived at render time
// (agent-rules §7). The XP *mutation* flow lives in src/utils/xp.ts.

import type {
  Activity,
  ChoreLogEntry,
  ContactLogEntry,
  DayResult,
  FinanceEntry,
  InboxLogEntry,
  JournalEntry,
  Person,
  ProfileStats,
  RelAct,
  Task,
  XpValue,
} from '@/utils/supabase/db';

import {
  addDays,
  dayDiff,
  fmtDate,
  getWeekStart,
  isOverdue,
  noon,
  todayIso,
  weekDays,
  weekEnd,
} from './dates';

const num = (v: number | string | null | undefined): number => Number(v) || 0;

// ── XP economy (legacy DEFAULT_XP + xp_values overrides) ─────────────────────

export const DEFAULT_XP: Record<string, number> = {
  task_low: 75,
  task_medium: 125,
  task_high: 200,
  task_urgent: 300,
  task_default: 75,
  proactive_3day: 50,
  proactive_5day: 100,
  proactive_7day: 150,
  chore_proactive_min: 10,
  chore_proactive_mid: 25,
  chore_proactive_max: 50,
  activity_workout: 200,
  activity_lowimpact: 150,
  relact_base: 150,
  relact_proactive: 50,
  contact_text: 75,
  contact_call: 150,
  contact_hangout: 300,
  contact_family_mult: 1.5,
  health_goal_daily: 100,
  health_goal_full_week: 500,
  journal_entry: 100,
  savings_log: 50,
  inbox_zero: 200,
  day_win: 75,
  day_loss: 25,
  series_win: 500,
  series_sweep: 1000,
  list_item_done: 10,
  encyc_complete: 50,
};

export type XpMap = Record<string, number>;

/** Collapse xp_values rows into a lookup map. */
export function buildXpMap(rows: XpValue[]): XpMap {
  const m: XpMap = {};
  rows.forEach((r) => {
    m[r.key] = Number(r.value);
  });
  return m;
}

/** Legacy xp(key): xp_values override first, DEFAULT_XP fallback, else 0. */
export function xpFor(key: string, xpMap: XpMap): number {
  const v = xpMap[key];
  if (v !== undefined && v !== null && !isNaN(v)) return v;
  return DEFAULT_XP[key] ?? 0;
}

/** section_target_* entries stored in xp_values (balance targets). */
export function sectionTargets(xpMap: XpMap): Partial<Record<SectionKey7, number>> {
  const out: Partial<Record<SectionKey7, number>> = {};
  Object.keys(xpMap).forEach((k) => {
    if (k.startsWith('section_target_')) {
      out[k.replace('section_target_', '') as SectionKey7] = num(xpMap[k]);
    }
  });
  return out;
}

// ── Level curve ───────────────────────────────────────────────────────────────

export interface LevelDef {
  n: number;
  label: string;
  emoji: string;
}

export const LEVELS: LevelDef[] = [
  { n: 0, label: 'Just Getting Started', emoji: '🌱' },
  { n: 1000, label: 'Building Habits', emoji: '🌿' },
  { n: 3000, label: 'Finding Rhythm', emoji: '⚡' },
  { n: 7000, label: 'Consistent', emoji: '🔥' },
  { n: 15000, label: 'Dedicated', emoji: '💪' },
  { n: 30000, label: 'Focused', emoji: '🎯' },
  { n: 55000, label: 'High Performer', emoji: '⭐' },
  { n: 90000, label: 'Elite', emoji: '🏆' },
  { n: 140000, label: 'Champion', emoji: '👑' },
  { n: 200000, label: 'Legend', emoji: '💫' },
  { n: 275000, label: 'GOAT', emoji: '🐐' },
];

// Weekly levels — smaller scale, resets each week.
export const WEEK_LEVELS: LevelDef[] = [
  { n: 0, label: 'Slow start', emoji: '😴' },
  { n: 300, label: 'Warming up', emoji: '🌱' },
  { n: 800, label: 'In motion', emoji: '⚡' },
  { n: 1500, label: 'On fire', emoji: '🔥' },
  { n: 2500, label: 'Crushing it', emoji: '💪' },
  { n: 4000, label: 'Locked in', emoji: '🎯' },
  { n: 6000, label: 'Beast mode', emoji: '🦁' },
  { n: 9000, label: 'Legendary week', emoji: '👑' },
];

export function getLevelIdx(xp: number): number {
  let i = 0;
  for (let j = 0; j < LEVELS.length; j++) if (xp >= LEVELS[j].n) i = j;
  return i;
}

/** Percent progress toward the next all-time level (100 at max level cap). */
export function xpPct(xp: number): number {
  const i = getLevelIdx(xp);
  const base = LEVELS[i].n;
  const next = LEVELS[i + 1] ? LEVELS[i + 1].n : base + 5000;
  return Math.min(100, Math.round(((xp - base) / (next - base)) * 100));
}

export function getWkLevelIdx(xp: number): number {
  let i = 0;
  for (let j = 0; j < WEEK_LEVELS.length; j++) if (xp >= WEEK_LEVELS[j].n) i = j;
  return i;
}

export function wkXpPct(xp: number): number {
  const i = getWkLevelIdx(xp);
  const base = WEEK_LEVELS[i].n;
  const next = WEEK_LEVELS[i + 1] ? WEEK_LEVELS[i + 1].n : base + 1000;
  return Math.min(100, Math.round(((xp - base) / (next - base)) * 100));
}

// ── Freshness (chores / rel acts; supports negative = overdue) ───────────────

export type FreshTone = 'never' | 'critical' | 'overdue' | 'low' | 'mid' | 'fresh';

export interface Freshness {
  pct: number; // can be negative when overdue; -100 when never done
  rawDays: number | null;
  label: string; // 'today' | 'Nd ago' | 'never done'
  overdue: boolean;
  tone: FreshTone; // legacy color bands, expressed as semantic tones
}

/** Legacy freshObj. `today` defaults to today; noon-to-noon day math. */
export function freshness(
  lastDone: string | null | undefined,
  intervalDays: number,
  today: string = todayIso(),
): Freshness {
  if (!lastDone) return { pct: -100, rawDays: null, label: 'never done', overdue: true, tone: 'never' };
  const daysSince = (noon(today).getTime() - noon(lastDone).getTime()) / 86400000;
  const ratio = 1 - daysSince / (intervalDays || 7);
  const pct = Math.round(ratio * 100);
  const tone: FreshTone =
    pct < -50 ? 'critical' : pct < 0 ? 'overdue' : pct < 25 ? 'low' : pct < 60 ? 'mid' : 'fresh';
  const d = Math.round(daysSince);
  return { pct, rawDays: daysSince, label: d === 0 ? 'today' : d + 'd ago', overdue: pct < 0, tone };
}

/** Clamp freshness pct to 0–100 for a display bar (legacy freshBarPct). */
export function freshBarPct(pct: number): number {
  return Math.max(0, Math.min(100, pct));
}

/** chore_log is authoritative for each chore's lastDone: latest log date per chore. */
export function choreLastDoneMap(choreLog: ChoreLogEntry[]): Record<string, string> {
  const m: Record<string, string> = {};
  choreLog.forEach((l) => {
    if (!l.chore_id || !l.date) return;
    if (!m[l.chore_id] || l.date > m[l.chore_id]) m[l.chore_id] = l.date;
  });
  return m;
}

// ── Per-item XP ───────────────────────────────────────────────────────────────

/** Proactive bonus tiers by days finished before due date (legacy calcProactivePointsAt). */
export function calcProactivePoints(
  dueDate: string | null | undefined,
  doneDate: string | null | undefined,
  xpMap: XpMap,
): number {
  if (!dueDate || !doneDate) return 0;
  const days = dayDiff(doneDate, dueDate);
  if (days <= 0) return 0;
  if (days >= 7) return xpFor('proactive_7day', xpMap);
  if (days >= 3) return xpFor('proactive_5day', xpMap);
  return xpFor('proactive_3day', xpMap);
}

/** Chore proactive bonus: only when done before, still fresh (legacy calcChoreProactivePoints). */
export function calcChoreProactivePoints(
  lastDone: string | null | undefined,
  intervalDays: number,
  xpMap: XpMap,
  today: string = todayIso(),
): number {
  if (!lastDone) return 0;
  const f = freshness(lastDone, intervalDays, today);
  if (f.overdue) return 0;
  if (f.pct >= 80) return xpFor('chore_proactive_max', xpMap);
  if (f.pct >= 60) return xpFor('chore_proactive_mid', xpMap);
  if (f.pct >= 40) return xpFor('chore_proactive_min', xpMap);
  return 0;
}

/** Base XP for a task by priority, falling back to its stored xp_value / task_default. */
export function taskBaseXp(
  t: Pick<Task, 'priority' | 'xp_value'>,
  xpMap: XpMap,
): number {
  return t.priority === 'urgent'
    ? xpFor('task_urgent', xpMap)
    : t.priority === 'high'
      ? xpFor('task_high', xpMap)
      : t.priority === 'medium'
        ? xpFor('task_medium', xpMap)
        : t.priority === 'low'
          ? xpFor('task_low', xpMap)
          : num(t.xp_value) || xpFor('task_default', xpMap);
}

/**
 * XP you actually earned for a completed task, honoring completed_by
 * (legacy earnedTaskXP): Paige-only 0, joint half base, you base+PP.
 */
export function earnedTaskXp(t: Task): number {
  const base = num(t.xp_value);
  if (t.completed_by === 'paige') return 0;
  if (t.completed_by === 'joint') return Math.round(base / 2);
  return base + num(t.proactive_points);
}

/** XP for an activity: explicit row xp if set, else type-based (bowling/volleyball are low-impact). */
export function activityXp(a: Activity, xpMap: XpMap): number {
  if (a.xp !== undefined && a.xp !== null) return num(a.xp);
  const t = String(a.type || '');
  return t.includes('bowling') || t.includes('volleyball')
    ? xpFor('activity_lowimpact', xpMap)
    : xpFor('activity_workout', xpMap);
}

/** XP for one contact log entry: type base × family multiplier (legacy confirmContact). */
export function contactXp(type: string, tier: string, xpMap: XpMap): number {
  const base =
    type === 'call'
      ? xpFor('contact_call', xpMap)
      : type === 'hangout'
        ? xpFor('contact_hangout', xpMap)
        : xpFor('contact_text', xpMap);
  return tier === 'family' ? Math.round(base * xpFor('contact_family_mult', xpMap)) : base;
}

// ── Streak ────────────────────────────────────────────────────────────────────

/**
 * Streak as displayed (legacy updateStreak on load): the persisted streak is
 * zeroed if more than one day has lapsed since last_active_date.
 */
export function effectiveStreak(
  stats: Pick<ProfileStats, 'streak_days' | 'best_streak' | 'last_active_date'> | null,
  today: string = todayIso(),
): { days: number; best: number } {
  if (!stats) return { days: 0, best: 0 };
  const last = stats.last_active_date;
  if (!last) return { days: stats.streak_days, best: stats.best_streak };
  const diff = dayDiff(last, today);
  return { days: diff > 1 ? 0 : stats.streak_days, best: stats.best_streak };
}

// ── Weekly summary (derived; replaces the legacy weekSummary blob) ────────────

export interface WeekRows {
  tasks: Task[];
  choreLog: ChoreLogEntry[];
  contactLog: ContactLogEntry[];
  activities: Activity[];
  relActs: RelAct[];
}

export interface WeekSummary {
  weekStart: string;
  tasksDone: number;
  choresDone: number; // me/joint only (Paige-only excluded)
  choreXP: number;
  chorePP: number;
  activitiesLogged: number;
  contactsLogged: number;
  distinctConnects: number;
  xpEarned: number; // legacy _thisWkXP: tasks + rel acts + chores + contacts + activities
  proactivePoints: number; // task PP + chore PP this week
  workTasks: number;
  paigeActs: number; // done paige-section tasks this week (legacy rHome override)
  communityTasks: number;
}

/** Derive this week's numbers from raw rows exactly as legacy rHome() does. */
export function deriveWeekSummary(rows: WeekRows, xpMap: XpMap, weekStart: string): WeekSummary {
  const inWk = (d: string | null | undefined): d is string => !!d && d >= weekStart;
  const doneTasks = rows.tasks.filter((t) => t.done && inWk(t.completed_date));
  const meChores = rows.choreLog.filter((l) => inWk(l.date) && l.completed_by !== 'paige');
  const wkContacts = rows.contactLog.filter((l) => inWk(l.date));
  const wkActs = rows.activities.filter((a) => inWk(a.date));

  // legacy _thisWkXP — the authoritative weekly XP number (rel acts included,
  // task XP taken at face value regardless of completed_by, all chore logs).
  let xpEarned = 0;
  doneTasks.forEach((t) => {
    xpEarned += num(t.xp_value) + num(t.proactive_points);
  });
  rows.relActs.filter((r) => inWk(r.last_done)).forEach(() => {
    xpEarned += xpFor('relact_base', xpMap);
  });
  rows.choreLog.filter((l) => inWk(l.date)).forEach((l) => {
    xpEarned += num(l.xp_earned);
  });
  wkContacts.forEach((l) => {
    xpEarned += num(l.xp);
  });
  wkActs.forEach((a) => {
    xpEarned += activityXp(a, xpMap);
  });

  const taskPP = doneTasks.reduce((s, t) => s + num(t.proactive_points), 0);
  const chorePP = meChores.reduce((s, l) => s + num(l.proactive_points), 0);

  return {
    weekStart,
    tasksDone: doneTasks.length,
    choresDone: meChores.length,
    choreXP: meChores.reduce((s, l) => s + num(l.xp_earned), 0),
    chorePP,
    activitiesLogged: wkActs.length,
    contactsLogged: wkContacts.length,
    distinctConnects: new Set(wkContacts.map((l) => l.person_id)).size,
    xpEarned: Math.round(xpEarned),
    proactivePoints: taskPP + chorePP,
    workTasks: doneTasks.filter((t) => t.section === 'work').length,
    paigeActs: doneTasks.filter((t) => t.section === 'paige').length,
    communityTasks: doneTasks.filter((t) => t.section?.startsWith('community')).length,
  };
}

// ── Balance / pace ────────────────────────────────────────────────────────────

export type SectionKey7 =
  | 'paige'
  | 'work'
  | 'community_family'
  | 'community_friends'
  | 'health'
  | 'chores'
  | 'personal';

export const SECTION_KEYS: SectionKey7[] = [
  'paige',
  'work',
  'community_family',
  'community_friends',
  'health',
  'chores',
  'personal',
];

export interface BalanceRows extends WeekRows {
  people: Person[];
}

const emptySectionXp = (): Record<SectionKey7, number> => ({
  paige: 0,
  work: 0,
  community_family: 0,
  community_friends: 0,
  health: 0,
  chores: 0,
  personal: 0,
});

const isFamilyPerson = (people: Person[], personId: string | null): boolean =>
  !!personId && people.some((p) => p.id === personId && p.tier === 'family');

/**
 * This week's XP split by section (legacy balance card): tasks via earnedTaskXp
 * (home rolls into chores), rel acts → paige base, chore log → chores,
 * contacts split family/friends by person tier, activities → health.
 */
export function weekXpBySection(
  rows: BalanceRows,
  xpMap: XpMap,
  weekStart: string,
): Record<SectionKey7, number> {
  const by = emptySectionXp();
  const inWk = (d: string | null | undefined): d is string => !!d && d >= weekStart;
  rows.tasks
    .filter((t) => t.done && inWk(t.completed_date))
    .forEach((t) => {
      const sec = (t.section === 'home' ? 'chores' : t.section || 'personal') as SectionKey7;
      if (sec in by) by[sec] += earnedTaskXp(t);
    });
  rows.relActs.filter((r) => inWk(r.last_done)).forEach(() => {
    by.paige += xpFor('relact_base', xpMap);
  });
  rows.choreLog.filter((l) => inWk(l.date)).forEach((l) => {
    by.chores += num(l.xp_earned);
  });
  rows.contactLog.filter((l) => inWk(l.date)).forEach((l) => {
    by[isFamilyPerson(rows.people, l.person_id) ? 'community_family' : 'community_friends'] +=
      num(l.xp);
  });
  rows.activities.filter((a) => inWk(a.date)).forEach((a) => {
    by.health += activityXp(a, xpMap);
  });
  return by;
}

export interface PaceInfo {
  status: 'ahead' | 'behind' | 'neutral';
  expected: number | null;
  actual: number;
  ratio: number | null;
  reference: number | null;
  source: 'target' | 'baseline';
}

/**
 * Pace per section (legacy rHome): reference = user target (xp_values
 * section_target_*) else 4-week historical baseline (tasks + chores + contacts
 * only — the legacy baseline intentionally omitted activities). Expected pace
 * scales by day-of-week (Mon=1/7 … Sun=7/7); ahead ≥95%, behind <75%.
 */
export function paceBySection(
  rows: BalanceRows,
  xpMap: XpMap,
  weekStart: string,
  today: string = todayIso(),
): Record<SectionKey7, PaceInfo> {
  const actualBy = weekXpBySection(rows, xpMap, weekStart);
  const targets = sectionTargets(xpMap);

  // Historical per-section weekly XP (excluding this week) — legacy histWeeks.
  const hist: Record<string, Record<SectionKey7, number>> = {};
  const bucket = (ws: string): Record<SectionKey7, number> => (hist[ws] ??= emptySectionXp());
  rows.tasks
    .filter((t) => t.done && t.completed_date)
    .forEach((t) => {
      const ws = getWeekStart(t.completed_date!);
      if (ws === weekStart) return;
      const sec = (t.section === 'home' ? 'chores' : t.section || 'personal') as SectionKey7;
      const b = bucket(ws);
      if (sec in b) b[sec] += earnedTaskXp(t);
    });
  rows.choreLog.forEach((l) => {
    if (!l.date) return;
    const ws = getWeekStart(l.date);
    if (ws === weekStart) return;
    bucket(ws).chores += num(l.xp_earned);
  });
  rows.contactLog.forEach((l) => {
    if (!l.date) return;
    const ws = getWeekStart(l.date);
    if (ws === weekStart) return;
    bucket(ws)[
      isFamilyPerson(rows.people, l.person_id) ? 'community_family' : 'community_friends'
    ] += num(l.xp);
  });
  const recent = Object.keys(hist).sort().reverse().slice(0, 4);

  const day = noon(today).getDay();
  const dayOfWeek = day === 0 ? 7 : day; // Mon=1 … Sun=7
  const weekProgress = dayOfWeek / 7;

  const out = {} as Record<SectionKey7, PaceInfo>;
  SECTION_KEYS.forEach((key) => {
    const target = num(targets[key]) > 0 ? num(targets[key]) : null;
    const baseline =
      recent.length < 2 ? null : recent.reduce((a, ws) => a + (hist[ws][key] || 0), 0) / recent.length;
    const reference = target !== null ? target : baseline;
    const actual = actualBy[key];
    if (reference === null || reference < 10) {
      out[key] = {
        status: 'neutral',
        expected: null,
        actual,
        ratio: null,
        reference,
        source: target ? 'target' : 'baseline',
      };
      return;
    }
    const expected = reference * weekProgress;
    const ratio = expected > 0 ? actual / expected : 1;
    out[key] = {
      status: ratio >= 0.95 ? 'ahead' : ratio < 0.75 ? 'behind' : 'neutral',
      expected: Math.round(expected),
      actual,
      ratio,
      reference: Math.round(reference),
      source: target ? 'target' : 'baseline',
    };
  });
  return out;
}

// ── Week-over-week comparison ─────────────────────────────────────────────────

/**
 * Total XP per past week (excluding the current one), from tasks + chores +
 * contacts + activities. Rel acts are excluded — they keep no history
 * (legacy _wkTotals).
 */
export function weeklyXpTotals(
  rows: WeekRows,
  xpMap: XpMap,
  currentWeekStart: string,
): Record<string, number> {
  const totals: Record<string, number> = {};
  const add = (date: string | null | undefined, xp: number) => {
    if (!date) return;
    const ws = getWeekStart(date);
    if (ws === currentWeekStart) return;
    totals[ws] = (totals[ws] || 0) + xp;
  };
  rows.tasks
    .filter((t) => t.done && t.completed_date)
    .forEach((t) => add(t.completed_date, num(t.xp_value) + num(t.proactive_points)));
  rows.choreLog.forEach((l) => add(l.date, num(l.xp_earned)));
  rows.contactLog.forEach((l) => add(l.date, num(l.xp)));
  rows.activities.forEach((a) => add(a.date, a.date ? activityXp(a, xpMap) : 0));
  return totals;
}

export interface WeekComparison {
  thisWk: number;
  lastWkToDate: number; // last week counted only through the same weekday
  diff: number;
  lastWkFull: number | null; // null when last week had no XP
  avg: number | null; // avg of up to 4 recent weeks; null when <2 weeks history
}

/** Legacy “vs last wk to-date / last wk total / avg” line under the XP bars. */
export function weekComparison(
  rows: WeekRows,
  xpMap: XpMap,
  weekStart: string,
  today: string = todayIso(),
): WeekComparison {
  const thisWk = deriveWeekSummary(rows, xpMap, weekStart).xpEarned;

  // Inclusive range sum over the same sources minus rel acts (legacy _xpInRange).
  const xpInRange = (from: string, to: string): number => {
    let s = 0;
    rows.tasks.forEach((t) => {
      if (t.done && t.completed_date && t.completed_date >= from && t.completed_date <= to)
        s += num(t.xp_value) + num(t.proactive_points);
    });
    rows.choreLog.forEach((l) => {
      if (l.date && l.date >= from && l.date <= to) s += num(l.xp_earned);
    });
    rows.contactLog.forEach((l) => {
      if (l.date && l.date >= from && l.date <= to) s += num(l.xp);
    });
    rows.activities.forEach((a) => {
      if (!a.date || a.date < from || a.date > to) return;
      s += activityXp(a, xpMap);
    });
    return Math.round(s);
  };

  const lastWkStart = addDays(weekStart, -7);
  const lastWkToDate = xpInRange(lastWkStart, addDays(today, -7));

  const totals = weeklyXpTotals(rows, xpMap, weekStart);
  const recent = Object.keys(totals).sort().reverse().slice(0, 4);
  const lastWkFullRaw = Math.round(totals[lastWkStart] || 0);
  return {
    thisWk,
    lastWkToDate,
    diff: thisWk - lastWkToDate,
    lastWkFull: lastWkFullRaw > 0 ? lastWkFullRaw : null,
    avg:
      recent.length >= 2
        ? Math.round(recent.reduce((a, ws) => a + totals[ws], 0) / recent.length)
        : null,
  };
}

// ── Day results (7-game series) ───────────────────────────────────────────────

export interface WeekRecord {
  wins: number;
  losses: number;
  logged: number;
}

/** W–L for one Monday-start week (legacy getWeekRecord). */
export function weekRecord(dayResults: DayResult[], weekStart: string): WeekRecord {
  const end = weekEnd(weekStart);
  const results = dayResults.filter((r) => r.date >= weekStart && r.date <= end);
  return {
    wins: results.filter((r) => r.result === 'win').length,
    losses: results.filter((r) => r.result === 'loss').length,
    logged: results.length,
  };
}

/**
 * Season record: completed weeks with 4+ wins count as series won, 4+ losses
 * as lost; the in-progress week and incomplete weeks don't count.
 */
export function seasonRecord(
  dayResults: DayResult[],
  currentWeekStart: string,
): { wins: number; losses: number } {
  const byWeek: Record<string, { wins: number; losses: number }> = {};
  dayResults.forEach((r) => {
    if (!r.result) return;
    const ws = getWeekStart(r.date);
    byWeek[ws] ??= { wins: 0, losses: 0 };
    if (r.result === 'win') byWeek[ws].wins++;
    else if (r.result === 'loss') byWeek[ws].losses++;
  });
  delete byWeek[currentWeekStart];
  let wins = 0;
  let losses = 0;
  Object.values(byWeek).forEach((w) => {
    if (w.wins >= 4) wins++;
    else if (w.losses >= 4) losses++;
  });
  return { wins, losses };
}

// ── Badges ────────────────────────────────────────────────────────────────────

export interface BadgeDef {
  id: string;
  emoji: string;
  label: string;
  desc: string;
}

export const PERM_BADGES: BadgeDef[] = [
  { id: 'first', emoji: '🌱', label: 'First step', desc: 'Complete first task' },
  { id: 'streak7', emoji: '🔥', label: 'Week warrior', desc: '7-day streak' },
  { id: 'streak30', emoji: '💫', label: 'Unstoppable', desc: '30-day streak' },
  { id: 'level5', emoji: '⭐', label: 'Level 5', desc: 'Reach level 5' },
  { id: 'level10', emoji: '🐐', label: 'GOAT', desc: 'Reach max level' },
  { id: 'tasks50', emoji: '🎯', label: 'Half century', desc: '50 tasks ever' },
  { id: 'tasks100', emoji: '🚀', label: 'Centurion', desc: '100 tasks ever' },
  { id: 'chore20', emoji: '✨', label: 'Chore champ', desc: '20 chores ever' },
  { id: 'act10', emoji: '🏆', label: 'Health hero', desc: '10 activities logged' },
  { id: 'proactive50', emoji: '⚡', label: 'Proactive', desc: '50 total proactive points' },
  { id: 'connect25', emoji: '🤝', label: 'Connector', desc: '25 contact logs all-time' },
  { id: 'connect100', emoji: '🌐', label: 'Web weaver', desc: '100 contact logs all-time' },
  { id: 'family_loyal', emoji: '❤️', label: 'Family first', desc: '50 family contacts all-time' },
  { id: 'big_circle', emoji: '🎉', label: 'Big circle', desc: '15+ distinct people contacted' },
];

export const WEEK_BADGES: BadgeDef[] = [
  { id: 'wk_boyfriend', emoji: '💕', label: 'Good boyfriend', desc: '5+ Paige acts this week' },
  { id: 'wk_athlete', emoji: '🏃', label: 'Active week', desc: '3+ workouts this week' },
  { id: 'wk_friend', emoji: '👥', label: 'Good friend', desc: '5+ community tasks done' },
  { id: 'wk_grinder', emoji: '💼', label: 'Grinder', desc: '10+ work tasks this week' },
  { id: 'wk_homebody', emoji: '🏠', label: 'Homebody', desc: '5+ chores done this week' },
  { id: 'wk_proactive', emoji: '⚡', label: 'Ahead of schedule', desc: '10+ proactive points this week' },
  { id: 'wk_perfect', emoji: '🌟', label: 'Perfect week', desc: 'Tasks done in every section' },
  { id: 'wk_outreach', emoji: '📞', label: 'Reaching out', desc: '5+ contacts logged this week' },
  { id: 'wk_calls', emoji: '☎️', label: 'Phone hugger', desc: '3+ calls/hangouts this week' },
  { id: 'wk_diversity', emoji: '🌐', label: 'Wide net', desc: '5+ different people contacted' },
];

export interface PermBadgeCtx {
  xp: number;
  bestStreak: number;
  proactivePoints: number;
  allTimeTasksDone: number;
  allTimeChoresDone: number;
  activitiesCount: number;
  contactLog: ContactLogEntry[];
  people: Person[];
}

/** Ids of permanent badges whose condition currently holds (legacy checks). */
export function computePermBadgeIds(ctx: PermBadgeCtx): string[] {
  const familyIds = new Set(ctx.people.filter((p) => p.tier === 'family').map((p) => p.id));
  const checks: Record<string, boolean> = {
    first: ctx.allTimeTasksDone >= 1,
    streak7: ctx.bestStreak >= 7,
    streak30: ctx.bestStreak >= 30,
    level5: getLevelIdx(ctx.xp) >= 5,
    level10: getLevelIdx(ctx.xp) >= 10,
    tasks50: ctx.allTimeTasksDone >= 50,
    tasks100: ctx.allTimeTasksDone >= 100,
    chore20: ctx.allTimeChoresDone >= 20,
    act10: ctx.activitiesCount >= 10,
    proactive50: ctx.proactivePoints >= 50,
    connect25: ctx.contactLog.length >= 25,
    connect100: ctx.contactLog.length >= 100,
    family_loyal: ctx.contactLog.filter((l) => l.person_id && familyIds.has(l.person_id)).length >= 50,
    big_circle: new Set(ctx.contactLog.map((l) => l.person_id)).size >= 15,
  };
  return PERM_BADGES.filter((b) => checks[b.id]).map((b) => b.id);
}

/** Ids of weekly badges whose condition currently holds (legacy checkWeekBadges checks). */
export function computeWeekBadgeIds(
  summary: WeekSummary,
  contactLog: ContactLogEntry[],
  weekStart: string,
): string[] {
  const wkContacts = contactLog.filter((l) => l.date >= weekStart);
  const checks: Record<string, boolean> = {
    wk_boyfriend: summary.paigeActs >= 5,
    wk_athlete: summary.activitiesLogged >= 3,
    wk_friend: summary.communityTasks >= 5,
    wk_grinder: summary.workTasks >= 10,
    wk_homebody: summary.choresDone >= 5,
    wk_proactive: summary.proactivePoints >= 10,
    wk_perfect:
      summary.workTasks > 0 &&
      summary.communityTasks > 0 &&
      summary.activitiesLogged > 0 &&
      summary.choresDone > 0 &&
      summary.paigeActs > 0,
    wk_outreach: summary.contactsLogged >= 5,
    wk_calls: wkContacts.filter((l) => l.type === 'call' || l.type === 'hangout').length >= 3,
    wk_diversity: new Set(wkContacts.map((l) => l.person_id)).size >= 5,
  };
  return WEEK_BADGES.filter((b) => checks[b.id]).map((b) => b.id);
}

/** jsonb → typed record for weekly_badge_history / weekly_badge_last_earned. */
export function jsonNumberRecord(j: unknown): Record<string, number> {
  if (j && typeof j === 'object' && !Array.isArray(j)) return j as Record<string, number>;
  return {};
}
export function jsonStringRecord(j: unknown): Record<string, string> {
  if (j && typeof j === 'object' && !Array.isArray(j)) return j as Record<string, string>;
  return {};
}

/**
 * Weekly badges shown as “earned this week”: the check passes now, or it was
 * credited earlier this week (weekly_badge_last_earned) — matching the legacy
 * in-session behavior where an earned badge sticks for the week.
 */
export function weekBadgesEarnedThisWeek(
  stats: ProfileStats | null,
  summary: WeekSummary,
  contactLog: ContactLogEntry[],
  weekStart: string,
): string[] {
  const passing = new Set(computeWeekBadgeIds(summary, contactLog, weekStart));
  const lastEarned = jsonStringRecord(stats?.weekly_badge_last_earned);
  return WEEK_BADGES.filter((b) => passing.has(b.id) || lastEarned[b.id] === weekStart).map(
    (b) => b.id,
  );
}

// ── Inbox tracker ─────────────────────────────────────────────────────────────

/** Consecutive most-recent days at inbox zero (legacy getInboxStreak). */
export function inboxStreak(log: InboxLogEntry[]): number {
  let streak = 0;
  for (const e of [...log].sort((a, b) => b.date.localeCompare(a.date))) {
    if (e.count === 0) streak++;
    else break;
  }
  return streak;
}

export function todayInboxCount(log: InboxLogEntry[], today: string = todayIso()): number | null {
  return log.find((l) => l.date === today)?.count ?? null;
}

/** Last 7 days of inbox counts, oldest first (legacy getLast7Inbox). */
export function last7Inbox(
  log: InboxLogEntry[],
  today: string = todayIso(),
): { date: string; count: number | null }[] {
  return Array.from({ length: 7 }, (_, i) => addDays(today, i - 6)).map((iso) => ({
    date: iso,
    count: log.find((l) => l.date === iso)?.count ?? null,
  }));
}

// ── Section stat cards (legacy secStat / sum-grid) ────────────────────────────

export interface SectionStat {
  all: number; // active (not done, not scheduled-away) tasks in the section
  done: number; // done this week
  over: number; // active and overdue
}

/** Active tasks: not done and not scheduled for a future label (legacy `active`). */
export function activeTasks(tasks: Task[], today: string = todayIso()): Task[] {
  const todayLabel = fmtDate(today); // legacy TODAY_STR, e.g. 'Jul 6'
  return tasks.filter((t) => !t.done && (!t.scheduled_for || t.scheduled_for === todayLabel));
}

export function sectionTaskStats(
  tasks: Task[],
  section: string,
  weekStart: string,
  today: string = todayIso(),
): SectionStat {
  const act = activeTasks(tasks, today).filter((t) => t.section === section);
  const done = tasks.filter(
    (t) =>
      t.section === section &&
      t.done &&
      t.completed_date &&
      getWeekStart(t.completed_date) === weekStart,
  ).length;
  return { all: act.length, done, over: act.filter((t) => isOverdue(t.due_date, today)).length };
}

/** Community card numbers: % of family / friends contacted this week. */
export function communityWeekStats(
  people: Person[],
  contactLog: ContactLogEntry[],
  weekStart: string,
): { total: number; distinct: number; famPct: number; friPct: number } {
  const distinctIds = new Set(
    contactLog.filter((l) => l.date >= weekStart).map((l) => l.person_id),
  );
  const fam = people.filter((p) => p.tier === 'family');
  const fri = people.filter((p) => p.tier === 'friends');
  const famHit = fam.filter((p) => distinctIds.has(p.id)).length;
  const friHit = fri.filter((p) => distinctIds.has(p.id)).length;
  return {
    total: fam.length + fri.length,
    distinct: distinctIds.size,
    famPct: fam.length ? Math.round((famHit / fam.length) * 100) : 0,
    friPct: fri.length ? Math.round((friHit / fri.length) * 100) : 0,
  };
}

/** Journal entries + total savings shown on the Life card. */
export function lifeCardExtras(
  journal: JournalEntry[],
  finances: FinanceEntry[],
  weekStart: string,
): { journalCount: number; totalSaved: number } {
  return {
    journalCount: journal.filter((j) => j.date >= weekStart).length,
    totalSaved: finances
      .filter((f) => f.type === 'savings')
      .reduce((s, f) => s + num(f.amount), 0),
  };
}

// ── Past-week summary card (legacy “Last week” card) ──────────────────────────

export interface PastWeekDay {
  label: string; // Mon..Sun
  iso: string;
  xp: number;
  tasks: number;
  chores: number;
  contacts: number;
  acts: number;
  result: DayResult | null;
  runningSeries: string; // 'W-L' after this day
}

export interface PastWeekStats {
  weekStart: string;
  weekEnd: string;
  xp: number;
  tasksDone: number;
  choresDone: number;
  contacts: number;
  activities: number;
  pp: number;
  wins: number;
  losses: number;
  sectionXp: Record<SectionKey7, number>;
  sectionTotal: number;
  topSection: { key: SectionKey7; xp: number } | null;
  days: PastWeekDay[];
}

export interface PastWeekRows extends BalanceRows {
  dayResults: DayResult[];
}

/**
 * Stats for a completed week, `offset` weeks back (0 = last completed week).
 * Faithful to legacy, including its quirks: the per-section split here uses raw
 * task xp_value+PP (no completed_by discount) and does NOT fold home→chores.
 */
export function pastWeekStats(
  rows: PastWeekRows,
  xpMap: XpMap,
  currentWeekStart: string,
  offset: number,
): PastWeekStats {
  const targetKey = addDays(currentWeekStart, -7 * (offset + 1));
  const inTarget = (d: string | null | undefined): d is string =>
    !!d && getWeekStart(d) === targetKey;

  const wkTasks = rows.tasks.filter((t) => t.done && inTarget(t.completed_date));
  const wkMeChores = rows.choreLog.filter((l) => inTarget(l.date) && l.completed_by !== 'paige');
  const wkAllChores = rows.choreLog.filter((l) => inTarget(l.date));
  const wkContacts = rows.contactLog.filter((l) => inTarget(l.date));
  const wkActs = rows.activities.filter((a) => inTarget(a.date));

  const totals = weeklyXpTotals(rows, xpMap, currentWeekStart);
  const xp = Math.round(totals[targetKey] || 0);
  const pp =
    wkTasks.reduce((s, t) => s + num(t.proactive_points), 0) +
    wkAllChores.reduce((s, l) => s + num(l.proactive_points), 0);

  const sectionXp = emptySectionXp();
  wkTasks.forEach((t) => {
    const sec = (t.section || 'personal') as SectionKey7; // legacy: no home→chores mapping here
    if (sec in sectionXp) sectionXp[sec] += num(t.xp_value) + num(t.proactive_points);
  });
  rows.relActs.filter((r) => inTarget(r.last_done)).forEach(() => {
    sectionXp.paige += xpFor('relact_base', xpMap);
  });
  wkAllChores.forEach((l) => {
    sectionXp.chores += num(l.xp_earned);
  });
  wkContacts.forEach((l) => {
    sectionXp[isFamilyPerson(rows.people, l.person_id) ? 'community_family' : 'community_friends'] +=
      num(l.xp);
  });
  wkActs.forEach((a) => {
    sectionXp.health += activityXp(a, xpMap);
  });
  const sectionTotal = SECTION_KEYS.reduce((s, k) => s + sectionXp[k], 0);
  const topEntry = SECTION_KEYS.filter((k) => sectionXp[k] > 0).sort(
    (a, b) => sectionXp[b] - sectionXp[a],
  )[0];

  let wins = 0;
  let losses = 0;
  const days: PastWeekDay[] = weekDays(targetKey).map((iso, i) => {
    const dTasks = rows.tasks.filter((t) => t.done && t.completed_date === iso);
    const dChores = rows.choreLog.filter((l) => l.date === iso && l.completed_by !== 'paige');
    const dContacts = rows.contactLog.filter((l) => l.date === iso);
    const dActs = rows.activities.filter((a) => a.date === iso);
    const xpDay =
      dTasks.reduce((s, t) => s + num(t.xp_value) + num(t.proactive_points), 0) +
      dChores.reduce((s, l) => s + num(l.xp_earned), 0) +
      dContacts.reduce((s, l) => s + num(l.xp), 0) +
      dActs.reduce((s, a) => s + activityXp(a, xpMap), 0);
    const result = rows.dayResults.find((r) => r.date === iso) ?? null;
    if (result?.result === 'win') wins++;
    else if (result?.result === 'loss') losses++;
    return {
      label: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'][i],
      iso,
      xp: Math.round(xpDay),
      tasks: dTasks.length,
      chores: dChores.length,
      contacts: dContacts.length,
      acts: dActs.length,
      result,
      runningSeries: `${wins}-${losses}`,
    };
  });

  return {
    weekStart: targetKey,
    weekEnd: weekEnd(targetKey),
    xp,
    tasksDone: wkTasks.length,
    choresDone: wkMeChores.length,
    contacts: wkContacts.length,
    activities: wkActs.length,
    pp,
    wins,
    losses,
    sectionXp,
    sectionTotal,
    topSection: topEntry ? { key: topEntry, xp: sectionXp[topEntry] } : null,
    days,
  };
}
