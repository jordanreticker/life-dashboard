// Contact history list (legacy rCommunity .tlist person blocks): one block per
// person — name + mini health bar + freshness label, then their contact logs
// (most recent only, expandable to all via ▼/▲), each row with type emoji,
// date, note, earned XP and a delete button.

import { Pressable, StyleSheet, Text, View } from 'react-native';

import { useTheme } from '@/hooks/use-theme';
import { fonts } from '@/theme';
import { fmtDate } from '@/utils/dates';
import type { ContactLogEntry, Person } from '@/utils/supabase/db';

import { contactTypeEmoji, type PersonHealth } from './health';
import { HealthBar } from './PeopleGrid';

export function ContactHistory({
  people,
  contactLog,
  healthFor,
  expanded,
  onToggleExpanded,
  onDeleteLog,
}: {
  people: Person[];
  contactLog: ContactLogEntry[];
  healthFor: (p: Person) => PersonHealth;
  expanded: Record<string, boolean>;
  onToggleExpanded: (personId: string) => void;
  onDeleteLog: (log: ContactLogEntry) => void;
}) {
  const { palette } = useTheme();

  return (
    <View>
      {people.map((p) => {
        const h = healthFor(p);
        const allLogs = contactLog
          .filter((l) => l.person_id === p.id)
          .sort((a, b) => (b.date || '').localeCompare(a.date || ''));
        const isExpanded = !!expanded[p.id];
        const shownLogs = isExpanded ? allLogs : allLogs.slice(0, 1);
        const hasMore = allLogs.length > 1;
        return (
          <View key={p.id} style={styles.block}>
            <View style={styles.nameRow}>
              <Text style={[styles.name, { color: palette.text1 }]}>{p.name}</Text>
              <HealthBar health={h} width={42} />
              <Text numberOfLines={1} style={[styles.freshLabel, { color: h.color }]}>
                {h.label}
              </Text>
            </View>
            {allLogs.length ? (
              <View style={styles.logs}>
                {shownLogs.map((l) => (
                  <View key={l.id} style={styles.logRow}>
                    <Text style={{ fontSize: 11 }}>{contactTypeEmoji(l.type)}</Text>
                    <Text style={[styles.logDate, { color: palette.text2 }]}>
                      {fmtDate(l.date)}
                    </Text>
                    {l.note ? (
                      <Text
                        numberOfLines={1}
                        style={[styles.logNote, { color: palette.text2 }]}
                      >
                        {l.note}
                      </Text>
                    ) : (
                      <View style={{ flex: 1 }} />
                    )}
                    <Text style={[styles.logXp, { color: palette.xp }]}>+{Number(l.xp)}</Text>
                    <Pressable hitSlop={8} onPress={() => onDeleteLog(l)}>
                      <Text style={[styles.logDel, { color: palette.danger }]}>✕</Text>
                    </Pressable>
                  </View>
                ))}
                {hasMore ? (
                  <Pressable hitSlop={4} onPress={() => onToggleExpanded(p.id)}>
                    <Text style={[styles.more, { color: palette.text3 }]}>
                      {isExpanded ? '▲ show less' : `▼ show ${allLogs.length - 1} more`}
                    </Text>
                  </Pressable>
                ) : null}
              </View>
            ) : null}
          </View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  block: { marginBottom: 8 },
  nameRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  name: { fontFamily: fonts.sansMedium, fontSize: 13 },
  freshLabel: { fontFamily: fonts.mono, fontSize: 9, flexShrink: 1 },
  logs: { marginTop: 4, marginBottom: 2, gap: 3 },
  logRow: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingVertical: 2 },
  logDate: { fontFamily: fonts.mono, fontSize: 10 },
  logNote: { fontFamily: fonts.mono, fontSize: 10, flex: 1 },
  logXp: { fontFamily: fonts.mono, fontSize: 10 },
  logDel: { fontFamily: fonts.mono, fontSize: 10, paddingHorizontal: 4 },
  more: { fontFamily: fonts.mono, fontSize: 9, paddingVertical: 3 },
});
