// Balance card (legacy ⚖️ Balance section): this week's XP split by section as
// a stacked bar + legend, behind-pace callouts against targets/4-week
// baselines, and the heavy-week note when one section is >50% of the week.

import { Pressable, StyleSheet, Text, View } from 'react-native';

import { Card } from '@/components/ui';
import { useTheme } from '@/hooks/use-theme';
import { fonts } from '@/theme';
import type { PaceInfo, SectionKey7 } from '@/utils/compute';

import { BalanceBar, fmtNum, Mono, SECTION_DEFS, sectionColor } from './shared';

export function BalanceCard({
  bySection,
  pace,
  onTargetsPress,
}: {
  bySection: Record<SectionKey7, number>;
  pace: Record<SectionKey7, PaceInfo>;
  onTargetsPress: () => void;
}) {
  const { palette } = useTheme();
  const total = SECTION_DEFS.reduce((s, d) => s + bySection[d.key], 0);
  const behind = SECTION_DEFS.filter((d) => pace[d.key].status === 'behind').sort(
    (a, b) => (pace[a.key].ratio ?? 1) - (pace[b.key].ratio ?? 1),
  );
  const heavy = total > 0 ? SECTION_DEFS.find((d) => bySection[d.key] / total > 0.5) : undefined;

  return (
    <Card>
      <View style={styles.hd}>
        <Text style={{ fontSize: 14 }}>⚖️</Text>
        <Mono size={11} color={palette.text2} style={{ textTransform: 'uppercase', letterSpacing: 0.5 }}>
          Balance
        </Mono>
        <View style={{ flex: 1 }} />
        <Pressable onPress={onTargetsPress} hitSlop={6}>
          <View style={[styles.targetsBtn, { backgroundColor: palette.card2 }]}>
            <Mono size={10} color={palette.text2}>
              targets
            </Mono>
          </View>
        </Pressable>
      </View>

      {total > 0 ? (
        <>
          <View style={styles.totalRow}>
            <Mono size={10} color={palette.text2}>
              total this week
            </Mono>
            <Mono size={10} color={palette.text1} style={{ fontFamily: fonts.monoMedium }}>
              {fmtNum(total)} XP
            </Mono>
          </View>
          <BalanceBar
            segments={SECTION_DEFS.map((d) => ({
              pct: (bySection[d.key] / total) * 100,
              color: sectionColor(palette, d.key),
            }))}
          />
          <View style={styles.legend}>
            {SECTION_DEFS.filter((d) => bySection[d.key] > 0).map((d) => (
              <View key={d.key} style={styles.legendItem}>
                <View style={[styles.swatch, { backgroundColor: sectionColor(palette, d.key) }]} />
                <Mono size={10} color={palette.text2}>
                  {d.emoji} {Math.round((bySection[d.key] / total) * 100)}%
                </Mono>
              </View>
            ))}
          </View>
        </>
      ) : (
        <Mono size={11} style={{ textAlign: 'center', paddingVertical: 6 }}>
          No XP this week yet
        </Mono>
      )}

      {behind.length > 0 ? (
        <View style={[styles.callout, { backgroundColor: palette.xpBg }]}>
          <Mono size={10} color={palette.xp} style={{ textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 4 }}>
            behind pace
          </Mono>
          {behind.map((d) => {
            const p = pace[d.key];
            return (
              <View key={d.key} style={styles.behindRow}>
                <Text style={[styles.behindLabel, { color: palette.text1 }]}>
                  {d.emoji} {d.label}
                </Text>
                <Mono size={10} color={palette.text2}>
                  {Math.round((1 - (p.ratio ?? 1)) * 100)}% behind ·{' '}
                  {p.source === 'target' ? 'vs target' : 'vs avg'}
                </Mono>
              </View>
            );
          })}
        </View>
      ) : null}

      {heavy ? (
        <View style={[styles.callout, { backgroundColor: palette.choresBg }]}>
          <Mono size={10} color={palette.chores} style={{ textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 2 }}>
            heavy week
          </Mono>
          <Text style={[styles.behindLabel, { color: palette.text1 }]}>
            {heavy.emoji} {heavy.label} is {Math.round((bySection[heavy.key] / total) * 100)}% of this
            week's XP
          </Text>
        </View>
      ) : null}

      {!behind.length && !heavy && total > 0 ? (
        <Mono size={11} style={{ textAlign: 'center', paddingTop: 8 }}>
          ✓ balanced week
        </Mono>
      ) : null}
    </Card>
  );
}

const styles = StyleSheet.create({
  hd: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 10 },
  targetsBtn: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6 },
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  legend: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 8 },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 3 },
  swatch: { width: 8, height: 8, borderRadius: 2 },
  callout: { padding: 10, borderRadius: 8, marginTop: 10 },
  behindRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 2,
  },
  behindLabel: { fontFamily: fonts.sans, fontSize: 12 },
});
