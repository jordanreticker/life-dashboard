// "This week's split" card (legacy 🤝 section): you-vs-Paige household bar from
// chore_log + completed home tasks. Expands to this week's chore completions —
// the entry point to the chore-log edit sheet (legacy data-chorelog-edit rows).

import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { Mono } from '@/components/summary/shared';
import { Card } from '@/components/ui';
import { useTheme } from '@/hooks/use-theme';
import { fonts } from '@/theme';
import { fmtDate, toDateStr } from '@/utils/dates';
import type { ChoreLogEntry, Task } from '@/utils/supabase/db';

import { choreSplit } from './shared';

export function SplitCard({
  choreLog,
  tasks,
  weekStart,
  paigeMode,
  onEditLogEntry,
}: {
  choreLog: ChoreLogEntry[];
  tasks: Task[];
  weekStart: string;
  paigeMode: boolean;
  onEditLogEntry: (entry: ChoreLogEntry) => void;
}) {
  const { palette } = useTheme();
  const [logOpen, setLogOpen] = useState(false);

  const split = choreSplit(choreLog, tasks, weekStart);
  const total = split.me + split.paige;

  const wkLog = choreLog
    .filter((l) => (toDateStr(l.date) || '') >= weekStart)
    .sort((a, b) => String(b.date).localeCompare(String(a.date)) || b.created_at.localeCompare(a.created_at));

  return (
    <Card>
      <Pressable onPress={() => setLogOpen((v) => !v)} style={styles.hd}>
        <Text style={{ fontSize: 13 }}>🤝</Text>
        <Mono size={11} color={palette.text2} style={{ fontFamily: fonts.monoMedium }}>
          This week's split
        </Mono>
        <View style={{ flex: 1 }} />
        <Mono size={11} color={palette.text3}>
          You {split.me} · Paige {split.paige} {wkLog.length ? (logOpen ? '▲' : '▼') : ''}
        </Mono>
      </Pressable>
      {total ? (
        <View style={[styles.bar, { backgroundColor: palette.border }]}>
          <View style={{ flex: split.me, backgroundColor: palette.chores }} />
          <View style={{ flex: split.paige, backgroundColor: palette.paige }} />
        </View>
      ) : (
        <Mono size={10} style={{ marginTop: 4 }}>
          no chores logged yet this week
        </Mono>
      )}

      {logOpen && wkLog.length ? (
        <View style={[styles.log, { borderTopColor: palette.border }]}>
          {wkLog.map((l) => {
            const xpE = Number(l.xp_earned) || 0;
            const ppE = Number(l.proactive_points) || 0;
            const who = l.completed_by === 'paige' ? 'Paige' : l.completed_by === 'joint' ? 'Both' : 'You';
            return (
              <Pressable
                key={l.id}
                disabled={paigeMode}
                onPress={() => onEditLogEntry(l)}
                style={styles.logRow}
              >
                <Text style={[styles.logText, { color: palette.text1 }]} numberOfLines={1}>
                  🧹 {l.chore_name || 'chore'}
                </Text>
                <Mono size={9} color={palette.text3}>
                  {who} · {fmtDate(l.date)}
                </Mono>
                {xpE > 0 ? (
                  <Mono size={9} color={palette.xp}>
                    +{xpE} XP{ppE > 0 ? ` · ${ppE} PP ⚡` : ''}
                  </Mono>
                ) : null}
                {!paigeMode ? (
                  <Mono size={9} color={palette.text3}>
                    ✏️
                  </Mono>
                ) : null}
              </Pressable>
            );
          })}
        </View>
      ) : null}
    </Card>
  );
}

const styles = StyleSheet.create({
  hd: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  bar: {
    flexDirection: 'row',
    height: 6,
    borderRadius: 3,
    overflow: 'hidden',
  },
  log: {
    borderTopWidth: StyleSheet.hairlineWidth,
    marginTop: 10,
    paddingTop: 6,
  },
  logRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 6,
  },
  logText: {
    fontFamily: fonts.sans,
    fontSize: 12,
    flex: 1,
  },
});
