// Inbox tracker card — the legacy 📬 Text inbox card in rCommunity:
// big unread count (falls back, dimmed, to the last logged count on days not
// yet logged), inbox-zero streak, a 7-day bar chart, and the update / inbox-
// zero actions (setInboxCount). Hitting zero for the first time on a day
// awards inbox_zero XP via xp.ts.

import { useEffect, useMemo, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { Button, Card, Label, TextField } from '@/components/ui';
import { useTheme } from '@/hooks/use-theme';
import { useDataStore } from '@/stores/dataStore';
import { fonts } from '@/theme';
import { inboxStreak, last7Inbox, todayInboxCount } from '@/utils/compute';
import { fmtDate, noon, todayIso } from '@/utils/dates';
import * as db from '@/utils/supabase/db';
import { awardInboxZero } from '@/utils/xp';

const DAY_LETTERS = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];

export function InboxCard({ onToast }: { onToast: (msg: string) => void }) {
  const { palette } = useTheme();
  const inboxLog = useDataStore((s) => s.inboxLog);
  const upsertRow = useDataStore((s) => s.upsertRow);

  const today = todayIso();
  const todayCount = todayInboxCount(inboxLog, today);
  const streak = inboxStreak(inboxLog);
  const last7 = useMemo(() => last7Inbox(inboxLog, today), [inboxLog, today]);

  const [input, setInput] = useState(todayCount === null ? '' : String(todayCount));
  const [saving, setSaving] = useState(false);

  // Keep the input synced with today's logged count (legacy re-render seeding).
  useEffect(() => {
    setInput(todayCount === null ? '' : String(todayCount));
  }, [todayCount]);

  // Most recent count regardless of date — shown dimmed on unlogged days.
  const lastLogged = useMemo(
    () => [...inboxLog].sort((a, b) => (b.date || '').localeCompare(a.date || ''))[0] ?? null,
    [inboxLog],
  );
  const displayCount = todayCount !== null ? todayCount : (lastLogged?.count ?? null);
  const isStale = todayCount === null && !!lastLogged;
  const maxCount = Math.max(...last7.map((d) => d.count ?? 0), 1);
  const alreadyZeroToday = todayCount === 0;

  const countColor = (n: number): string =>
    n === 0 ? palette.health : n < 50 ? palette.work : palette.danger;
  const bigColor = displayCount === null ? palette.text1 : countColor(displayCount);
  const statusText =
    todayCount === null
      ? lastLogged
        ? 'last logged ' + fmtDate(lastLogged.date)
        : 'not logged yet'
      : todayCount === 0
        ? 'inbox zero!'
        : todayCount + ' unread';

  const setCount = async (raw: string) => {
    const val = parseInt(raw, 10);
    if (isNaN(val) || val < 0 || saving) return;
    setSaving(true);
    const wasZero =
      useDataStore.getState().inboxLog.find((l) => l.date === today)?.count === 0;
    const { data } = await db.inboxLog.upsert({ date: today, count: val });
    if (data) upsertRow('inboxLog', data);
    if (val === 0 && !wasZero) {
      const r = await awardInboxZero();
      onToast('Inbox zero! +' + r.xp + ' XP');
    }
    setSaving(false);
  };

  return (
    <Card>
      <Label>📬 Text inbox</Label>
      <View style={styles.countRow}>
        <Text style={[styles.big, { color: bigColor, opacity: isStale ? 0.55 : 1 }]}>
          {displayCount === null ? '—' : displayCount}
        </Text>
        <View style={{ flex: 1 }}>
          <Text style={{ fontFamily: fonts.sans, fontSize: 12, color: palette.text2 }}>
            {statusText}
          </Text>
          {streak > 0 ? (
            <Text style={[styles.streak, { color: palette.xp }]}>
              🔥 {streak}-day inbox zero streak
            </Text>
          ) : null}
        </View>
      </View>

      <View style={styles.chart}>
        {last7.map((d) => {
          // Bar height relative to this week's max; empties get a stub, zero
          // days a small green base (legacy heights: 6 / 10 / 14..72px).
          const h =
            d.count === null
              ? 6
              : d.count === 0
                ? 10
                : Math.max(14, Math.round((d.count / maxCount) * 72));
          const color = d.count === null ? palette.border : countColor(d.count);
          const isToday = d.date === today;
          const showCount = d.count !== null && d.count > 0;
          return (
            <View key={d.date} style={styles.sparkDay}>
              {showCount ? (
                <Text style={[styles.sparkCount, { color }]}>{d.count}</Text>
              ) : null}
              <View
                style={[
                  styles.sparkBar,
                  { height: h, backgroundColor: color },
                  isToday && { borderWidth: 1.5, borderColor: palette.text1 },
                ]}
              />
              <Text
                style={[styles.sparkLbl, { color: isToday ? palette.text1 : palette.text3 }]}
              >
                {DAY_LETTERS[noon(d.date).getDay()]}
              </Text>
            </View>
          );
        })}
      </View>

      <View style={styles.actions}>
        <TextField
          value={input}
          onChangeText={setInput}
          placeholder="0"
          keyboardType="number-pad"
          returnKeyType="done"
          onSubmitEditing={() => setCount(input)}
          style={{ flex: 1 }}
        />
        <Button title="Update count" onPress={() => setCount(input)} loading={saving} />
        <Button
          title="✓ Inbox zero"
          variant="accent"
          accentColor={palette.health}
          disabled={alreadyZeroToday}
          onPress={() => setCount('0')}
        />
      </View>
    </Card>
  );
}

const styles = StyleSheet.create({
  countRow: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 8 },
  big: { fontFamily: fonts.sansLight, fontSize: 40, letterSpacing: -1 },
  streak: { fontFamily: fonts.monoMedium, fontSize: 10, marginTop: 2 },
  chart: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 4,
    height: 96,
    marginBottom: 10,
    paddingHorizontal: 4,
  },
  sparkDay: { flex: 1, alignItems: 'center', justifyContent: 'flex-end' },
  sparkCount: { fontFamily: fonts.monoMedium, fontSize: 9, marginBottom: 2 },
  sparkBar: { width: '100%', borderRadius: 2 },
  sparkLbl: { fontFamily: fonts.mono, fontSize: 9, marginTop: 3 },
  actions: { flexDirection: 'row', alignItems: 'center', gap: 6 },
});
