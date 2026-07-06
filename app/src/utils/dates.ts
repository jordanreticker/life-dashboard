// Date helpers ported from the legacy web app (index.html inline script).
// Conventions preserved exactly:
//   - All dates are LOCAL-time ISO strings (YYYY-MM-DD), never UTC.
//   - Parsed date strings are anchored at T12:00:00 to dodge DST/offset drift.
//   - Weeks start on MONDAY (Sunday belongs to the preceding week).

/** Local YYYY-MM-DD for a Date (legacy localIso). */
export function localIso(d: Date = new Date()): string {
  return (
    d.getFullYear() +
    '-' +
    String(d.getMonth() + 1).padStart(2, '0') +
    '-' +
    String(d.getDate()).padStart(2, '0')
  );
}

/** Today's local ISO date. A function (not a constant) so long-lived screens stay correct. */
export function todayIso(): string {
  return localIso(new Date());
}

/** Noon-anchored Date for an ISO date string (legacy `new Date(iso+'T12:00:00')`). */
export function noon(iso: string): Date {
  return new Date(iso + 'T12:00:00');
}

/** Normalize any date-ish value to YYYY-MM-DD, or null (legacy toDateStr). */
export function toDateStr(v: unknown): string | null {
  if (!v) return null;
  if (v instanceof Date) return localIso(v);
  const s = String(v);
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s;
  if (s.includes('T') || s.includes('Z')) {
    const d = new Date(s);
    return isNaN(d.getTime()) ? null : localIso(d);
  }
  return null;
}

/**
 * Monday-start week for a date (legacy getWeekStart): Sunday maps back 6 days,
 * any other day maps back to its Monday. No argument = this week.
 */
export function getWeekStart(d?: Date | string): string {
  const dd =
    d instanceof Date ? new Date(d) : d ? noon(toDateStr(d) ?? String(d)) : new Date();
  const day = dd.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  dd.setDate(dd.getDate() + diff);
  return localIso(dd);
}

/** ISO date n days after (or before, if negative) the given ISO date. */
export function addDays(iso: string, n: number): string {
  const d = noon(iso);
  d.setDate(d.getDate() + n);
  return localIso(d);
}

/** Last day (Sunday) of the Monday-start week. */
export function weekEnd(weekStart: string): string {
  return addDays(weekStart, 6);
}

/** The 7 ISO dates of a week, Monday..Sunday. */
export function weekDays(weekStart: string): string[] {
  return Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));
}

/** Whole days from `fromIso` to `toIso` (positive when toIso is later). */
export function dayDiff(fromIso: string, toIso: string): number {
  return Math.floor((noon(toIso).getTime() - noon(fromIso).getTime()) / 86400000);
}

/** Legacy isOverdue: strictly before today. */
export function isOverdue(dueIso: string | null | undefined, today: string = todayIso()): boolean {
  if (!dueIso) return false;
  const d = toDateStr(dueIso);
  return !!d && d < today;
}

/** 'Jul 6' (legacy fmtDate / TODAY_STR format). */
export function fmtDate(iso: string | null | undefined): string {
  if (!iso) return '';
  const ds = toDateStr(iso) ?? String(iso);
  const d = noon(ds);
  return isNaN(d.getTime()) ? '' : d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

/** 'Sunday' */
export function fmtWeekday(iso: string): string {
  const d = noon(iso);
  return isNaN(d.getTime()) ? '' : d.toLocaleDateString('en-US', { weekday: 'long' });
}

/** 'Jul 6, 2026' (legacy top-date second line). */
export function fmtLong(iso: string): string {
  const d = noon(iso);
  return isNaN(d.getTime())
    ? ''
    : d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

/**
 * Legacy fmtDateSmart: 'today' / 'tomorrow' / weekday name inside the current
 * Monday-start week, else 'Jul 6'.
 */
export function fmtDateSmart(iso: string | null | undefined, today: string = todayIso()): string {
  if (!iso) return '';
  const ds = toDateStr(iso) ?? String(iso);
  if (ds === today) return 'today';
  const ws = getWeekStart(today);
  const we = weekEnd(ws);
  if (ds >= ws && ds <= we) {
    if (ds === addDays(today, 1)) return 'tomorrow';
    return fmtWeekday(ds);
  }
  return fmtDate(ds);
}
