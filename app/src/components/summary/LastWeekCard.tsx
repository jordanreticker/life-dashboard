// Past-week summary card (legacy "Last week" / .alltime-card block): navigable
// by week offset, with the 6-stat grid, series line, daily breakdown with a
// running series score, the balance bar, and the heaviest-area note.

import { Pressable, StyleSheet, Text, View } from 'react-native';

import { Card } from '@/components/ui';
import { useTheme } from '@/hooks/use-theme';
import { fonts } from '@/theme';
import type { PastWeekStats } from '@/utils/compute';
import { fmtDate } from '@/utils/dates';

import { BalanceBar, fmtNum, Mono, SECTION_DEFS, sectionColor, StatCell } from './shared';

export function LastWeekCard({
  stats,
  offset,
  onOffsetChange,
}: {
  stats: PastWeekStats;
  offset: number;
  onOffsetChange: (offset: number) => void;
}) {
  const { palette } = useTheme();
  const title = offset === 0 ? 'Last week' : offset === 1 ? '2 weeks ago' : `${offset + 1} weeks ago`;

  return (
    <Card>
      <View style={styles.nav}>
        <Pressable
          onPress={() => onOffsetChange(offset + 1)}
          hitSlop={8}
          style={[styles.navBtn, { backgroundColor: palette.card2 }]}
        >
          <Text style={{ color: palette.text2, fontSize: 13 }}>◀</Text>
        </Pressable>
        <View style={{ flex: 1, alignItems: 'center' }}>
          <Text style={[styles.title, { color: palette.text1 }]}>{title}</Text>
          <Mono size={10}>
            {fmtDate(stats.weekStart)} – {fmtDate(stats.weekEnd)}
          </Mono>
        </View>
        <Pressable
          onPress={() => onOffsetChange(Math.max(0, offset - 1))}
          disabled={offset === 0}
          hitSlop={8}
          style={[styles.navBtn, { backgroundColor: palette.card2, opacity: offset === 0 ? 0.3 : 1 }]}
        >
          <Text style={{ color: palette.text2, fontSize: 13 }}>▶</Text>
        </Pressable>
      </View>

      <View style={styles.statRow}>
        <StatCell value={fmtNum(stats.xp)} label="XP" />
        <StatCell value={stats.tasksDone} label="tasks" />
        <StatCell value={stats.choresDone} label="chores" />
        <StatCell value={stats.contacts} label="contacts" />
        <StatCell value={stats.activities} label="activities" />
        <StatCell value={stats.pp} label="PP ⚡" color={palette.pp} />
      </View>

      {stats.wins || stats.losses ? (
        <View style={[styles.divider, { borderTopColor: palette.border }]}>
          <Mono size={11} color={palette.text2} style={{ textAlign: 'center' }}>
            series:{' '}
            <Mono size={11} color={palette.success} style={{ fontFamily: fonts.monoMedium }}>
              {stats.wins}W
            </Mono>{' '}
            ·{' '}
            <Mono size={11} color={palette.danger} style={{ fontFamily: fonts.monoMedium }}>
              {stats.losses}L
            </Mono>
          </Mono>
        </View>
      ) : null}

      <View style={[styles.divider, { borderTopColor: palette.border }]}>
        <Mono size={9} style={{ textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 6 }}>
          daily breakdown
        </Mono>
        <View style={styles.daysRow}>
          {stats.days.map((d) => {
            const isEmpty = !d.xp && !d.tasks && !d.chores && !d.contacts && !d.acts && !d.result;
            const resColor =
              d.result?.result === 'win'
                ? palette.success
                : d.result?.result === 'loss'
                  ? palette.danger
                  : palette.text3;
            const resChar = d.result ? (d.result.result === 'win' ? 'W' : d.result.result === 'loss' ? 'L' : '·') : '';
            return (
              <View
                key={d.iso}
                style={[
                  styles.dayCell,
                  !isEmpty && { backgroundColor: palette.card2, borderColor: palette.border },
                ]}
              >
                <Mono size={8} style={{ textTransform: 'uppercase' }}>
                  {d.label}
                </Mono>
                <Mono
                  size={10}
                  color={isEmpty ? palette.text3 : palette.text1}
                  style={{ fontFamily: fonts.monoMedium, marginVertical: 1 }}
                >
                  {d.xp || '—'}
                </Mono>
                <Mono size={7} color={palette.text2}>
                  {[
                    d.tasks ? `✓${d.tasks}` : '',
                    d.chores ? `🏠${d.chores}` : '',
                    d.contacts ? `👥${d.contacts}` : '',
                    d.acts ? `🏃${d.acts}` : '',
                  ]
                    .filter(Boolean)
                    .join('')}
                </Mono>
                {d.result?.result ? (
                  <View style={styles.resRow}>
                    <Mono size={9} color={resColor} style={{ fontFamily: fonts.monoMedium }}>
                      {resChar}
                    </Mono>
                    <Mono size={7}>{d.runningSeries}</Mono>
                  </View>
                ) : null}
              </View>
            );
          })}
        </View>
      </View>

      {stats.sectionTotal > 0 ? (
        <View style={[styles.divider, { borderTopColor: palette.border }]}>
          <Mono size={9} style={{ textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 6 }}>
            balance
          </Mono>
          <BalanceBar
            segments={SECTION_DEFS.map((d) => ({
              pct: (stats.sectionXp[d.key] / stats.sectionTotal) * 100,
              color: sectionColor(palette, d.key),
            }))}
          />
          <View style={styles.legend}>
            {SECTION_DEFS.filter((d) => stats.sectionXp[d.key] > 0).map((d) => (
              <View key={d.key} style={styles.legendItem}>
                <View style={[styles.swatch, { backgroundColor: sectionColor(palette, d.key) }]} />
                <Mono size={10} color={palette.text2}>
                  {d.emoji} {Math.round((stats.sectionXp[d.key] / stats.sectionTotal) * 100)}%
                </Mono>
              </View>
            ))}
          </View>
        </View>
      ) : null}

      {stats.topSection ? (
        <View style={[styles.divider, { borderTopColor: palette.border }]}>
          <Mono size={11} color={palette.text2} style={{ textAlign: 'center' }}>
            heaviest area:{' '}
            {SECTION_DEFS.find((d) => d.key === stats.topSection!.key)?.emoji}{' '}
            {stats.topSection.key.replace('community_', '')} ({fmtNum(stats.topSection.xp)} XP)
          </Mono>
        </View>
      ) : null}
    </Card>
  );
}

const styles = StyleSheet.create({
  nav: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 10 },
  navBtn: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 6 },
  title: { fontFamily: fonts.sansMedium, fontSize: 14 },
  statRow: { flexDirection: 'row' },
  divider: { marginTop: 10, paddingTop: 10, borderTopWidth: StyleSheet.hairlineWidth },
  daysRow: { flexDirection: 'row', gap: 4 },
  dayCell: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 5,
    paddingHorizontal: 1,
    borderRadius: 6,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'transparent',
  },
  resRow: { flexDirection: 'row', alignItems: 'center', gap: 3, marginTop: 2 },
  legend: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 6 },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 3 },
  swatch: { width: 8, height: 8, borderRadius: 2 },
});
