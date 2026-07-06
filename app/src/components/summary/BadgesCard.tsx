// Badges display (legacy .badges-section): weekly badges with ×count history,
// then all-time permanent badges. Unearned badges render dimmed ("locked").

import { StyleSheet, Text, View } from 'react-native';

import { Card } from '@/components/ui';
import { useTheme } from '@/hooks/use-theme';
import { fonts } from '@/theme';
import { PERM_BADGES, WEEK_BADGES, type BadgeDef } from '@/utils/compute';

import { Mono } from './shared';

function BadgeTile({
  badge,
  earned,
  count,
  weekly,
}: {
  badge: BadgeDef;
  earned: boolean;
  count?: number;
  weekly?: boolean;
}) {
  const { palette } = useTheme();
  return (
    <View
      style={[
        styles.tile,
        { backgroundColor: palette.card2, borderColor: palette.border },
        earned && weekly && { backgroundColor: palette.ppBg, borderColor: palette.pp },
        earned && !weekly && { backgroundColor: palette.xpBg, borderColor: palette.xp },
        !earned && { opacity: 0.45 },
      ]}
    >
      <Text style={styles.emoji}>{badge.emoji}</Text>
      <Text style={[styles.name, { color: palette.text1 }]} numberOfLines={1}>
        {badge.label}
        {count && count > 0 ? ` ×${count}` : ''}
      </Text>
      <Mono size={8} style={{ textAlign: 'center' }}>
        {badge.desc}
      </Mono>
    </View>
  );
}

export function BadgesCard({
  weekEarnedIds,
  permEarnedIds,
  weeklyHistory,
}: {
  weekEarnedIds: string[];
  permEarnedIds: string[];
  weeklyHistory: Record<string, number>;
}) {
  const { palette } = useTheme();
  return (
    <Card>
      <Mono size={10} color={palette.text2} style={{ textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 8 }}>
        Badges earned this week
      </Mono>
      <View style={styles.grid}>
        {WEEK_BADGES.map((b) => (
          <BadgeTile
            key={b.id}
            badge={b}
            weekly
            earned={weekEarnedIds.includes(b.id)}
            count={weeklyHistory[b.id] || 0}
          />
        ))}
      </View>
      <Mono size={10} color={palette.text2} style={{ textTransform: 'uppercase', letterSpacing: 0.5, marginTop: 14, marginBottom: 8 }}>
        All-time badges
      </Mono>
      <View style={styles.grid}>
        {PERM_BADGES.map((b) => (
          <BadgeTile key={b.id} badge={b} earned={permEarnedIds.includes(b.id)} />
        ))}
      </View>
    </Card>
  );
}

const styles = StyleSheet.create({
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  tile: {
    width: '31.5%',
    alignItems: 'center',
    borderRadius: 10,
    borderWidth: StyleSheet.hairlineWidth,
    paddingVertical: 10,
    paddingHorizontal: 4,
    gap: 2,
  },
  emoji: { fontSize: 20 },
  name: { fontFamily: fonts.sansMedium, fontSize: 10 },
});
