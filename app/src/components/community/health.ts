// Person contact-cadence health, ported verbatim from the legacy
// getPersonHealth() (index.html). The color is a continuous, data-driven HSL
// gradient (bright green → faded green → yellow → bright orange → faded red →
// dark red) that encodes how close a person is to their contact cadence — it
// is deliberately the same in light and dark themes (like the legacy app) and
// cannot be expressed as palette tokens.

import { dayDiff, todayIso } from '@/utils/dates';
import type { ContactLogEntry, Person } from '@/utils/supabase/db';

export interface PersonHealth {
  pct: number; // 100 = just contacted, 0 = at cadence boundary (or overdue)
  color: string;
  label: string;
  daysSince: number | null;
  cadence: number;
  overdue: boolean;
  neverLogged: boolean;
}

/** Family default cadence: 7 days. Friends (and work): 14 days. */
export function defaultCadence(tier: string): number {
  return tier === 'family' ? 7 : 14;
}

/** contact_log is authoritative: latest log date per person (legacy rCommunity head). */
export function lastContactMap(contactLog: ContactLogEntry[]): Record<string, string> {
  const m: Record<string, string> = {};
  contactLog.forEach((l) => {
    if (!l.date || !l.person_id) return;
    if (!m[l.person_id] || l.date > m[l.person_id]) m[l.person_id] = l.date;
  });
  return m;
}

/**
 * Render-time reconcile (legacy): the log date wins only when NEWER than the
 * stored people.last_contact. Nothing is written back.
 */
export function effectiveLastContact(p: Person, logMap: Record<string, string>): string | null {
  const fromLog = logMap[p.id];
  if (fromLog && (!p.last_contact || fromLog > p.last_contact)) return fromLog;
  return p.last_contact;
}

export function personHealth(
  lastContact: string | null,
  tier: string,
  cadenceDays: number | null | undefined,
  today: string = todayIso(),
): PersonHealth {
  const cadence = Number(cadenceDays) > 0 ? Number(cadenceDays) : defaultCadence(tier);
  if (!lastContact) {
    return {
      pct: 0,
      color: 'hsl(0, 70%, 35%)', // legacy #991B1B
      label: 'never logged',
      daysSince: null,
      cadence,
      overdue: false,
      neverLogged: true,
    };
  }
  const daysSince = Math.max(0, dayDiff(lastContact, today));
  const ratio = daysSince / cadence; // 0 = fresh, 1 = at cadence, >1 = overdue
  const pct = Math.max(0, Math.min(100, Math.round((1 - ratio) * 100)));
  const overdue = ratio > 1;

  let color: string;
  let label: string;
  if (overdue) {
    // Dark red, darkens further the more overdue (cap at ratio=2).
    const overRatio = Math.min(ratio - 1, 1);
    const lightness = Math.round(35 - overRatio * 10); // 35% → 25%
    color = `hsl(0, 75%, ${lightness}%)`;
    label = daysSince - cadence + 'd overdue';
  } else if (ratio <= 0.3) {
    // Bright green → faded green
    const t = ratio / 0.3;
    const lightness = Math.round(40 + t * 8); // 40% → 48%
    color = `hsl(142, 70%, ${lightness}%)`;
    label = daysSince === 0 ? 'today' : daysSince + 'd ago';
  } else if (ratio <= 0.55) {
    // Faded green → yellow
    const t = (ratio - 0.3) / 0.25;
    const hue = Math.round(142 - t * 95); // 142 → 47
    color = `hsl(${hue}, 75%, 48%)`;
    label = daysSince + 'd ago';
  } else if (ratio <= 0.8) {
    // Yellow → bright orange
    const t = (ratio - 0.55) / 0.25;
    const hue = Math.round(47 - t * 25); // 47 → 22
    color = `hsl(${hue}, 90%, 50%)`;
    label = daysSince + 'd ago';
  } else {
    // Bright orange → faded red
    const t = (ratio - 0.8) / 0.2;
    const hue = Math.round(22 - t * 22); // 22 → 0
    const lightness = Math.round(50 - t * 8); // 50% → 42%
    color = `hsl(${hue}, 85%, ${lightness}%)`;
    label = daysSince + 'd ago · at risk';
  }
  return { pct, color, label, daysSince, cadence, overdue, neverLogged: false };
}

export const CONTACT_TYPE_EMOJI: Record<string, string> = {
  text: '💬',
  call: '📞',
  hangout: '🤝',
};

export function contactTypeEmoji(type: string | null | undefined): string {
  return CONTACT_TYPE_EMOJI[type ?? ''] ?? '👥';
}
