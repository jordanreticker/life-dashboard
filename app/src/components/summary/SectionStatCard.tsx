// Per-section "areas at a glance" card (legacy scCard + the custom Home card).
// Same math as legacy: big number is remaining (all-done) when positive, else
// done; bar fills done/all; pace shows as a colored border (green ahead /
// amber behind).

import { Pressable, StyleSheet, Text, View } from 'react-native';

import { useTheme } from '@/hooks/use-theme';
import { fonts, radius } from '@/theme';
import type { SectionStat } from '@/utils/compute';

import { Mono, ProgressBar } from './shared';

export function SectionStatCard({
  icon,
  name,
  color,
  stat,
  extra,
  pace,
  onPress,
  bigOverride,
  subOverride,
  barPctOverride,
}: {
  icon: string;
  name: string;
  color: string;
  stat: SectionStat;
  extra?: string;
  pace?: 'ahead' | 'behind' | 'neutral' | null;
  onPress: () => void;
  // The legacy Home card computes its own big/sub/bar instead of scCard's.
  bigOverride?: string | number;
  subOverride?: string;
  barPctOverride?: number;
}) {
  const { palette } = useTheme();
  const pct = stat.all ? Math.round((stat.done / stat.all) * 100) : 0;
  const big =
    bigOverride !== undefined ? bigOverride : stat.all - stat.done > 0 ? stat.all - stat.done : stat.done;
  const sub = subOverride !== undefined ? subOverride : `${stat.done} done${extra ? ' · ' + extra : ''}`;
  const borderColor =
    pace === 'ahead' ? palette.success : pace === 'behind' ? palette.xp : palette.border;

  return (
    <Pressable
      onPress={onPress}
      style={[
        styles.card,
        {
          backgroundColor: palette.card,
          borderColor,
          borderWidth: pace === 'ahead' || pace === 'behind' ? 1.5 : StyleSheet.hairlineWidth,
        },
      ]}
    >
      <View style={[styles.accent, { backgroundColor: color }]} />
      <Text style={styles.icon}>{icon}</Text>
      <Mono size={9} style={{ textTransform: 'uppercase', letterSpacing: 0.5 }}>
        {name}
      </Mono>
      <Text style={[styles.big, { color: palette.text1 }]}>{big}</Text>
      <Mono size={9} color={palette.text2} style={{ marginBottom: 6 }}>
        {sub}
      </Mono>
      {stat.over ? (
        <Mono size={9} color={palette.danger} style={{ marginBottom: 4 }}>
          {stat.over} overdue
        </Mono>
      ) : null}
      <ProgressBar pct={barPctOverride !== undefined ? barPctOverride : pct} color={color} height={4} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    width: '48.5%',
    borderRadius: radius.lg,
    padding: 12,
    paddingTop: 10,
    overflow: 'hidden',
  },
  accent: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 3,
  },
  icon: { fontSize: 18, marginBottom: 4, marginTop: 2 },
  big: {
    fontFamily: fonts.sansLight,
    fontSize: 26,
    letterSpacing: -1,
    marginTop: 2,
  },
});
