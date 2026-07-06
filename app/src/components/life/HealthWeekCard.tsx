// The 🏃 Health "This week" card (legacy rLife top section): sessions-this-week
// badge, the rolling 7-day dot grid (ending today), the activity-type quick
// buttons that open the log sheet, and the collapsible recent-sessions list.

import { useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { ACT_TYPES, Chip, SecHeader } from '@/components/life/shared';
import { Mono } from '@/components/summary/shared';
import { Card } from '@/components/ui';
import { useTheme } from '@/hooks/use-theme';
import { useDataStore } from '@/stores/dataStore';
import { fonts } from '@/theme';
import { addDays, dayDiff, fmtDate, fmtWeekday, todayIso } from '@/utils/dates';

export function HealthWeekCard({ onLogType }: { onLogType: (type: string) => void }) {
  const { palette } = useTheme();
  const activities = useDataStore((s) => s.activities);
  const [recentOpen, setRecentOpen] = useState(false); // legacy D.actRecentOpen

  const today = todayIso();

  // Rolling last-7-days grid (legacy weekDays: today-6 … today).
  const gridDays = useMemo(
    () => Array.from({ length: 7 }, (_, i) => addDays(today, i - 6)),
    [today],
  );
  const byDate = useMemo(() => {
    const m: Record<string, number> = {};
    activities.forEach((a) => {
      if (a.date) m[a.date] = (m[a.date] || 0) + 1;
    });
    return m;
  }, [activities]);
  const actWeek = useMemo(
    () => activities.filter((a) => a.date && dayDiff(a.date, today) <= 7).length,
    [activities, today],
  );
  const recent = useMemo(
    () =>
      [...activities]
        .sort(
          (a, b) =>
            (b.date ?? '').localeCompare(a.date ?? '') || b.created_at.localeCompare(a.created_at),
        )
        .slice(0, 6),
    [activities],
  );

  return (
    <Card>
      <SecHeader
        emoji="📅"
        name="This week"
        right={
          <View style={[styles.sessBadge, { backgroundColor: palette.card2 }]}>
            <Mono size={10} color={palette.text2}>
              {actWeek} sessions
            </Mono>
          </View>
        }
      />

      <View style={styles.grid}>
        {gridDays.map((iso) => {
          const ct = byDate[iso] || 0;
          const isToday = iso === today;
          return (
            <View key={iso} style={styles.day}>
              <Mono size={9} color={palette.text3}>
                {fmtWeekday(iso).slice(0, 1)}
              </Mono>
              <View
                style={[
                  styles.dot,
                  { backgroundColor: palette.card2, borderColor: palette.border },
                  ct > 0 && { backgroundColor: palette.text1, borderColor: palette.text1 },
                  isToday && { borderWidth: 2, borderColor: palette.health },
                ]}
              >
                {ct > 0 ? (
                  <Text style={[styles.dotText, { color: palette.bg }]}>{ct}</Text>
                ) : null}
              </View>
            </View>
          );
        })}
      </View>

      <View style={styles.types}>
        {ACT_TYPES.map((t) => (
          <Chip key={t} label={t} onPress={() => onLogType(t)} />
        ))}
      </View>

      {recent.length ? (
        <View style={[styles.recentWrap, { borderTopColor: palette.border }]}>
          <Pressable onPress={() => setRecentOpen((o) => !o)} style={styles.recentHd}>
            <Mono size={11} color={palette.text2}>
              📋 Recent sessions ({recent.length})
            </Mono>
            <Mono size={10} color={palette.text3}>
              {recentOpen ? '▲' : '▼'}
            </Mono>
          </Pressable>
          {recentOpen
            ? recent.map((a) => (
                <View key={a.id} style={[styles.recentRow, { borderBottomColor: palette.border }]}>
                  <View style={[styles.typeBadge, { backgroundColor: palette.card2 }]}>
                    <Mono size={10} color={palette.text2}>
                      {a.type}
                    </Mono>
                  </View>
                  <Text style={[styles.recentNotes, { color: palette.text1 }]} numberOfLines={1}>
                    {a.notes || '—'}
                  </Text>
                  <Mono size={10} color={palette.text3}>
                    {fmtDate(a.date)}
                  </Mono>
                </View>
              ))
            : null}
        </View>
      ) : null}
    </Card>
  );
}

const styles = StyleSheet.create({
  sessBadge: {
    borderRadius: 10,
    paddingHorizontal: 7,
    paddingVertical: 2,
  },
  grid: {
    flexDirection: 'row',
    gap: 3,
    marginBottom: 10,
  },
  day: {
    flex: 1,
    alignItems: 'center',
    gap: 3,
  },
  dot: {
    width: 28,
    height: 28,
    borderRadius: 14,
    borderWidth: StyleSheet.hairlineWidth,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dotText: {
    fontFamily: fonts.mono,
    fontSize: 10,
  },
  types: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 5,
  },
  recentWrap: {
    borderTopWidth: StyleSheet.hairlineWidth,
    marginTop: 10,
    paddingTop: 8,
  },
  recentHd: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 2,
  },
  recentRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
    paddingVertical: 7,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  typeBadge: {
    borderRadius: 20,
    paddingHorizontal: 7,
    paddingVertical: 2,
  },
  recentNotes: {
    flex: 1,
    fontFamily: fonts.sans,
    fontSize: 12,
  },
});
