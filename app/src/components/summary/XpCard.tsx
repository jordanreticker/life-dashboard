// All-time XP / level card with the weekly-level second bar and the
// week-over-week comparison line — legacy .xp-card in rHome().

import { StyleSheet, Text, View } from 'react-native';

import { Card } from '@/components/ui';
import { useTheme } from '@/hooks/use-theme';
import { fonts } from '@/theme';
import {
  getLevelIdx,
  getWkLevelIdx,
  wkXpPct,
  xpPct,
  LEVELS,
  WEEK_LEVELS,
  type WeekComparison,
} from '@/utils/compute';

import { fmtNum, Mono, ProgressBar } from './shared';

export function XpCard({
  xp,
  proactivePoints,
  weekXp,
  weekPP,
  comparison,
}: {
  xp: number;
  proactivePoints: number;
  weekXp: number;
  weekPP: number;
  comparison: WeekComparison;
}) {
  const { palette } = useTheme();
  const lvlIdx = getLevelIdx(xp);
  const lvl = LEVELS[lvlIdx];
  const wkLvl = WEEK_LEVELS[getWkLevelIdx(weekXp)];
  const arrow = comparison.diff > 0 ? '▲' : comparison.diff < 0 ? '▼' : '·';
  const diffColor = comparison.diff >= 0 ? palette.success : palette.danger;

  return (
    <Card>
      <View style={styles.topRow}>
        <Text style={[styles.levelLabel, { color: palette.text1 }]}>
          {lvl.emoji} {lvl.label}
        </Text>
        <View style={{ alignItems: 'flex-end' }}>
          <Mono size={12} color={palette.text1} style={{ fontFamily: fonts.monoMedium }}>
            {fmtNum(xp)} XP · Lv{lvlIdx + 1}
          </Mono>
          <Mono size={10} color={palette.pp}>
            ⚡ {fmtNum(proactivePoints)} PP all-time
          </Mono>
        </View>
      </View>
      <ProgressBar pct={xpPct(xp)} color={palette.text1} />

      <View style={[styles.weekRow, { borderTopColor: palette.border }]}>
        <Mono size={11} color={palette.text2}>
          {wkLvl.emoji} {wkLvl.label}
        </Mono>
        <View style={{ flex: 1 }}>
          <ProgressBar pct={wkXpPct(weekXp)} color={palette.xp} />
        </View>
        <Mono size={11} color={palette.text2} style={{ fontFamily: fonts.monoMedium }}>
          {fmtNum(weekXp)} XP
        </Mono>
      </View>
      <Mono size={9} style={styles.rightNote}>
        this week · ⚡ {fmtNum(weekPP)} PP
      </Mono>
      <Text style={styles.cmpLine}>
        <Mono size={9} color={diffColor}>
          {arrow}
          {fmtNum(Math.abs(comparison.diff))}
        </Mono>
        <Mono size={9}> vs last wk to-date ({fmtNum(comparison.lastWkToDate)})</Mono>
        {comparison.lastWkFull !== null ? (
          <Mono size={9}> · last wk total {fmtNum(comparison.lastWkFull)}</Mono>
        ) : null}
        {comparison.avg !== null ? <Mono size={9}> · avg {fmtNum(comparison.avg)}</Mono> : null}
      </Text>
    </Card>
  );
}

const styles = StyleSheet.create({
  topRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  levelLabel: {
    fontFamily: fonts.sansMedium,
    fontSize: 14,
    flexShrink: 1,
    paddingRight: 8,
  },
  weekRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 10,
    paddingTop: 10,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  rightNote: {
    marginTop: 3,
    textAlign: 'right',
  },
  cmpLine: {
    marginTop: 3,
    textAlign: 'right',
  },
});
