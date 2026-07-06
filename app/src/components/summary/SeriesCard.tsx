// 7-game series card (legacy .series-card): the week as a best-of-7 — one W/L
// per day, first to 4 wins takes the series. Tapping a day opens the day
// result sheet for that date.

import { Pressable, StyleSheet, Text, View } from 'react-native';

import { Card } from '@/components/ui';
import { useTheme } from '@/hooks/use-theme';
import { fonts } from '@/theme';
import { seasonRecord, weekRecord } from '@/utils/compute';
import { weekDays } from '@/utils/dates';
import type { DayResult } from '@/utils/supabase/db';

import { Mono } from './shared';

const DAY_LETTERS = ['M', 'T', 'W', 'T', 'F', 'S', 'S'];

export function SeriesCard({
  dayResults,
  weekStart,
  today,
  onDayPress,
}: {
  dayResults: DayResult[];
  weekStart: string;
  today: string;
  onDayPress: (iso: string) => void;
}) {
  const { palette } = useTheme();
  const rec = weekRecord(dayResults, weekStart);
  const season = seasonRecord(dayResults, weekStart);
  const recordColor =
    rec.wins >= 4
      ? palette.success
      : rec.losses >= 4
        ? palette.danger
        : rec.wins > rec.losses
          ? palette.success
          : rec.losses > rec.wins
            ? palette.danger
            : palette.text2;
  const status =
    rec.wins >= 7
      ? '🌟 SWEEP!'
      : rec.wins >= 4
        ? '🏆 Series won!'
        : rec.losses >= 4
          ? '💀 Series lost'
          : rec.wins + rec.losses >= 7
            ? 'series complete'
            : 'first to 4 wins';

  return (
    <Card>
      <View style={styles.hd}>
        <View>
          <Text style={[styles.title, { color: palette.text1 }]}>7-game series</Text>
          <Mono size={11} style={{ marginTop: 2 }}>
            season: {season.wins}–{season.losses}
          </Mono>
        </View>
        <Text style={[styles.record, { color: recordColor }]}>
          {rec.wins}–{rec.losses}
        </Text>
      </View>
      <View style={styles.grid}>
        {weekDays(weekStart).map((iso, i) => {
          const r = dayResults.find((x) => x.date === iso);
          const isFuture = iso > today;
          const isToday = iso === today;
          const hasStats = !!r && !!(r.stat1 || r.stat2 || r.stat3 || r.notes);
          const isPartial = hasStats && !r?.result;
          const symbol =
            r?.result === 'win'
              ? 'W'
              : r?.result === 'loss'
                ? 'L'
                : isFuture
                  ? '·'
                  : isPartial
                    ? '•'
                    : isToday
                      ? '?'
                      : '·';
          const symbolColor =
            r?.result === 'win'
              ? palette.success
              : r?.result === 'loss'
                ? palette.danger
                : isPartial
                  ? palette.xp
                  : palette.text3;
          return (
            <Pressable
              key={iso}
              disabled={isFuture}
              onPress={() => onDayPress(iso)}
              style={[
                styles.day,
                { backgroundColor: palette.card2, borderColor: 'transparent' },
                isToday && { borderColor: palette.text1 },
                r?.result === 'win' && { backgroundColor: palette.healthBg },
                r?.result === 'loss' && { backgroundColor: palette.dangerBg },
                isFuture && { opacity: 0.4 },
              ]}
            >
              <Mono size={9}>{DAY_LETTERS[i]}</Mono>
              <Text style={[styles.symbol, { color: symbolColor }]}>{symbol}</Text>
            </Pressable>
          );
        })}
      </View>
      <Mono
        size={10}
        color={rec.wins >= 7 ? palette.xp : palette.text3}
        style={{ textAlign: 'center', marginTop: 8 }}
      >
        {status}
      </Mono>
    </Card>
  );
}

const styles = StyleSheet.create({
  hd: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  title: { fontFamily: fonts.sansMedium, fontSize: 14 },
  record: { fontFamily: fonts.sansLight, fontSize: 26, letterSpacing: -1 },
  grid: { flexDirection: 'row', gap: 4 },
  day: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 7,
    borderRadius: 8,
    borderWidth: 1,
    gap: 2,
  },
  symbol: { fontFamily: fonts.monoMedium, fontSize: 14 },
});
