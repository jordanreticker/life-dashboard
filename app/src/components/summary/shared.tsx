// Shared bits for the Summary pane components: the 7-section balance defs
// (legacy SECTION_DEFS), tiny mono/stat primitives matching the legacy visual
// language, and a hairline progress bar.

import type { ReactNode } from 'react';
import { StyleSheet, Text, View, type TextStyle } from 'react-native';

import { useTheme } from '@/hooks/use-theme';
import { fonts, type Palette } from '@/theme';
import type { SectionKey7 } from '@/utils/compute';

export interface SectionDef {
  key: SectionKey7;
  label: string;
  emoji: string;
  paletteKey: keyof Palette;
}

// Legacy SECTION_DEFS (balance card / filter chips) with palette-token colors.
export const SECTION_DEFS: SectionDef[] = [
  { key: 'paige', label: 'Paige', emoji: '💕', paletteKey: 'paige' },
  { key: 'work', label: 'Work', emoji: '💼', paletteKey: 'work' },
  { key: 'community_family', label: 'Family', emoji: '👨‍👩‍👧', paletteKey: 'community' },
  { key: 'community_friends', label: 'Friends', emoji: '👥', paletteKey: 'community' },
  { key: 'health', label: 'Health', emoji: '🏃', paletteKey: 'health' },
  { key: 'chores', label: 'Chores', emoji: '🏠', paletteKey: 'chores' },
  { key: 'personal', label: 'Personal', emoji: '✦', paletteKey: 'personal' },
];

export function sectionColor(palette: Palette, key: SectionKey7): string {
  const def = SECTION_DEFS.find((d) => d.key === key);
  return def ? palette[def.paletteKey] : palette.personal;
}

/** DM Mono caption text — the legacy 'DM Mono' metadata styling. */
export function Mono({
  children,
  size = 10,
  color,
  style,
}: {
  children: ReactNode;
  size?: number;
  color?: string;
  style?: TextStyle;
}) {
  const { palette } = useTheme();
  return (
    <Text style={[{ fontFamily: fonts.mono, fontSize: size, color: color ?? palette.text3 }, style]}>
      {children}
    </Text>
  );
}

/** Big-number / small-label stat cell (legacy .ws / .at-stat). */
export function StatCell({
  value,
  label,
  color,
}: {
  value: string | number;
  label: string;
  color?: string;
}) {
  const { palette } = useTheme();
  return (
    <View style={styles.statCell}>
      <Text
        style={{
          fontFamily: fonts.sansLight,
          fontSize: 20,
          letterSpacing: -0.5,
          color: color ?? palette.text1,
        }}
      >
        {value}
      </Text>
      <Mono size={9} style={{ textTransform: 'uppercase', marginTop: 1 }}>
        {label}
      </Mono>
    </View>
  );
}

/** Hairline track + fill (legacy .xp-track / .sc-bar). */
export function ProgressBar({
  pct,
  color,
  height = 6,
}: {
  pct: number;
  color: string;
  height?: number;
}) {
  const { palette } = useTheme();
  return (
    <View style={{ height, borderRadius: height / 2, backgroundColor: palette.border, overflow: 'hidden' }}>
      <View
        style={{
          width: `${Math.max(0, Math.min(100, pct))}%`,
          height: '100%',
          borderRadius: height / 2,
          backgroundColor: color,
        }}
      />
    </View>
  );
}

/** Segmented multi-color bar (the balance bar). */
export function BalanceBar({
  segments,
  height = 8,
}: {
  segments: { pct: number; color: string }[];
  height?: number;
}) {
  const { palette } = useTheme();
  return (
    <View
      style={{
        flexDirection: 'row',
        height,
        borderRadius: height / 2,
        backgroundColor: palette.border,
        overflow: 'hidden',
      }}
    >
      {segments
        .filter((s) => s.pct >= 0.5)
        .map((s, i) => (
          <View key={i} style={{ width: `${s.pct}%`, height: '100%', backgroundColor: s.color }} />
        ))}
    </View>
  );
}

export function fmtNum(n: number): string {
  return n.toLocaleString('en-US');
}

const styles = StyleSheet.create({
  statCell: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 4,
  },
});
