// Paige health bar — the legacy pane's top card. Score out of 100:
//   rel acts on schedule 30pt · weekly Paige tasks 25pt (target 3/wk) ·
//   recent date ≤30d 15pt · active focuses 10pt · weekly actions 20pt
//   (starts at 10; focus hits +4 capped +10, fights -8 / mistakes -3 capped -10).
// Also hosts the ✨/😬/💢 action buttons (logPaigeAction) and the recent-actions
// log with its "undo last" affordance (undoLastPaigeAction).

import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { Mono, ProgressBar } from '@/components/summary/shared';
import { Card } from '@/components/ui';
import { useTheme } from '@/hooks/use-theme';
import { useDataStore } from '@/stores/dataStore';
import { fonts, radius } from '@/theme';
import { freshness } from '@/utils/compute';
import { fmtDate, getWeekStart, noon, todayIso } from '@/utils/dates';
import * as db from '@/utils/supabase/db';
import { awardPaigeAction, revokeXp } from '@/utils/xp';

type ActionKind = 'focus_hit' | 'fight' | 'mistake';

// Row xp mirrors legacy logPaigeAction's map (and awardPaigeAction in xp.ts).
const KIND_XP: Record<ActionKind, number> = { focus_hit: 75, fight: -150, mistake: -50 };
const KIND_LABEL: Record<string, string> = {
  focus_hit: '✨ focus hit',
  fight: '💢 fight',
  mistake: '😬 mistake',
};

export function HealthCard() {
  const { palette } = useTheme();
  const { tasks, relActs, focuses, dateIdeas, paigeActions, upsertRow } = useDataStore();
  const [busy, setBusy] = useState(false);

  const today = todayIso();
  const weekStart = getWeekStart(today);

  // ── Score inputs (pure derivations, legacy rPaige) ──────────────────────────
  const paigeTasks = tasks.filter(
    (t) => t.section === 'paige' && (!t.scheduled_for || t.scheduled_for === fmtDate(today)),
  );
  const donePaige = paigeTasks.filter(
    (t) => t.done && t.completed_date && getWeekStart(t.completed_date) === weekStart,
  );
  const activeFocuses = focuses.filter((f) => f.status === 'active');

  const relTotal = relActs.length;
  const relHealthy = relActs.filter((r) => !freshness(r.last_done, r.interval_days, today).overdue)
    .length;
  const relScore = relTotal ? Math.round((30 * relHealthy) / relTotal) : 0;
  const taskScore = Math.min(25, donePaige.length * 9);
  const recentDate = dateIdeas
    .filter((d) => d.status === 'done' && d.date)
    .some((d) => (Date.now() - noon(d.date!).getTime()) / 86400000 <= 30);
  const dateScore = recentDate ? 15 : 0;
  const focusScore = activeFocuses.length > 0 ? 10 : 0;

  const wkActions = paigeActions.filter((a) => a.date >= weekStart);
  const focusHits = wkActions.filter((a) => a.kind === 'focus_hit').length;
  const fights = wkActions.filter((a) => a.kind === 'fight').length;
  const mistakes = wkActions.filter((a) => a.kind === 'mistake').length;
  const actionDelta = Math.min(10, focusHits * 4) - Math.min(10, fights * 8 + mistakes * 3);
  const actionScore = Math.max(0, Math.min(20, 10 + actionDelta));
  const score = Math.min(100, relScore + taskScore + dateScore + focusScore + actionScore);

  const scoreColor =
    score >= 65 ? palette.success : score >= 45 ? palette.xp : score >= 25 ? palette.work : palette.danger;
  const scoreLabel =
    score >= 85
      ? 'strong'
      : score >= 65
        ? 'healthy'
        : score >= 45
          ? 'okay'
          : score >= 25
            ? 'needs attention'
            : 'at risk';

  // ── logPaigeAction ──────────────────────────────────────────────────────────
  const log = async (kind: ActionKind) => {
    if (busy) return;
    setBusy(true);
    const { data } = await db.paigeActions.insert({ kind, date: today, xp: KIND_XP[kind] });
    if (data) upsertRow('paigeActions', data);
    // focus_hit awards +75; fights/mistakes only lower the health score.
    await awardPaigeAction(kind);
    setBusy(false);
  };

  const actionBtn = (kind: ActionKind, label: string, color: string, bg: string) => (
    <Pressable
      key={kind}
      onPress={() => log(kind)}
      disabled={busy}
      style={({ pressed }) => [
        styles.actBtn,
        { backgroundColor: bg, borderColor: color, opacity: pressed || busy ? 0.6 : 1 },
      ]}
    >
      <Text style={{ fontFamily: fonts.sansMedium, fontSize: 11, color }}>{label}</Text>
    </Pressable>
  );

  return (
    <Card style={{ backgroundColor: palette.paigeBg, borderColor: 'transparent' }}>
      <View style={styles.hdRow}>
        <Text style={{ fontSize: 22 }}>💕</Text>
        <View style={{ flex: 1 }}>
          <Text style={{ fontFamily: fonts.sansMedium, fontSize: 13, color: palette.paige }}>
            Paige health
          </Text>
          <Mono size={10} color={palette.text2}>
            {scoreLabel}
          </Mono>
        </View>
        <Text style={{ fontFamily: fonts.monoMedium, fontSize: 24, color: scoreColor }}>
          {score}
          <Text style={{ fontFamily: fonts.mono, fontSize: 11, color: palette.text3 }}>/100</Text>
        </Text>
      </View>

      <ProgressBar pct={score} color={scoreColor} height={10} />

      <View style={styles.breakdown}>
        <Mono size={10} color={palette.text2}>
          💝 {relHealthy}/{relTotal} ({relScore}pt)
        </Mono>
        <Mono size={10} color={palette.text2}>
          ✓ {donePaige.length} tasks ({taskScore}pt)
        </Mono>
        <Mono size={10} color={palette.text2}>
          📅 {recentDate ? 'date' : 'no date'} ({dateScore}pt)
        </Mono>
        <Mono size={10} color={palette.text2}>
          🎯 {activeFocuses.length} focus ({focusScore}pt)
        </Mono>
        <Mono
          size={10}
          color={actionDelta > 0 ? palette.success : actionDelta < 0 ? palette.danger : palette.text2}
        >
          ⚡ {focusHits}✨ {fights}💢 ({actionScore}pt)
        </Mono>
      </View>

      <View style={[styles.actRow, { borderTopColor: palette.border }]}>
        {actionBtn('focus_hit', '✨ Focus hit', palette.success, palette.healthBg)}
        {actionBtn('mistake', '😬 Mistake', palette.work, palette.xpBg)}
        {actionBtn('fight', '💢 Fight', palette.danger, palette.dangerBg)}
      </View>
    </Card>
  );
}

// ── Recent paige actions log (last 5) with undo ───────────────────────────────
export function RecentActionsCard() {
  const { palette } = useTheme();
  const { paigeActions, removeRow } = useDataStore();
  const [busy, setBusy] = useState(false);

  const sorted = [...paigeActions].sort((a, b) =>
    (b.created_at || '').localeCompare(a.created_at || ''),
  );
  if (!sorted.length) return null;
  const recent = sorted.slice(0, 5);

  const kindColor = (kind: string) =>
    kind === 'focus_hit' ? palette.success : kind === 'fight' ? palette.danger : palette.xp;

  // Legacy undoLastPaigeAction: pop the newest row, refund positive XP only.
  const undoLast = async () => {
    if (busy) return;
    const last = sorted[0];
    setBusy(true);
    const { error } = await db.paigeActions.remove(last.id);
    if (!error) {
      removeRow('paigeActions', last.id);
      if (Number(last.xp) > 0) await revokeXp(Number(last.xp), { clampAtZero: true });
    }
    setBusy(false);
  };

  return (
    <Card>
      <View style={styles.recentHd}>
        <Mono size={10}>recent paige actions</Mono>
        <Pressable onPress={undoLast} hitSlop={8} disabled={busy}>
          <Mono size={10} color={palette.text2}>
            ↶ undo last
          </Mono>
        </Pressable>
      </View>
      {recent.map((a) => (
        <View key={a.id} style={styles.recentRow}>
          <Mono size={11} color={kindColor(a.kind)}>
            {KIND_LABEL[a.kind] ?? a.kind}
          </Mono>
          <Mono size={11} color={palette.text3}>
            {fmtDate(a.date)}
          </Mono>
        </View>
      ))}
    </Card>
  );
}

const styles = StyleSheet.create({
  hdRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 8,
  },
  breakdown: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    gap: 6,
    marginTop: 8,
    marginBottom: 10,
  },
  actRow: {
    flexDirection: 'row',
    gap: 6,
    paddingTop: 10,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  actBtn: {
    flex: 1,
    borderRadius: radius.md,
    borderWidth: StyleSheet.hairlineWidth,
    paddingVertical: 8,
    alignItems: 'center',
  },
  recentHd: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 5,
  },
  recentRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 2,
  },
});
