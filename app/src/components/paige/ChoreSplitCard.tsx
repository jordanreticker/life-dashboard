// Household chore split — legacy rPaige's 🤝 card: who's carrying which chores,
// derived from chore_log plus completed home-section tasks (joint credits both).
// Collapsed shows the 7-day You/Paige bar; expanded adds all-time totals and the
// per-chore breakdown.

import { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { Mono } from '@/components/summary/shared';
import { Card } from '@/components/ui';
import { useTheme } from '@/hooks/use-theme';
import { useDataStore } from '@/stores/dataStore';
import { fonts } from '@/theme';
import { addDays, todayIso } from '@/utils/dates';
import type { ChoreLogEntry, Task } from '@/utils/supabase/db';

import { SecHeader } from './shared';

interface Split {
  me: number;
  paige: number;
  per: Record<string, { me: number; paige: number }>;
}

// Legacy choreSplit(fromDate): null = all-time.
function choreSplit(choreLog: ChoreLogEntry[], tasks: Task[], fromDate: string | null): Split {
  const split: Split = { me: 0, paige: 0, per: {} };
  const bump = (name: string, who: string | null) => {
    const per = (split.per[name] ??= { me: 0, paige: 0 });
    if (who === 'paige') {
      split.paige++;
      per.paige++;
    } else if (who === 'joint') {
      // joint completions credit both you and Paige
      split.me++;
      split.paige++;
      per.me++;
      per.paige++;
    } else {
      split.me++;
      per.me++;
    }
  };
  choreLog.forEach((l) => {
    if (fromDate && l.date < fromDate) return;
    bump(l.chore_name || '(deleted chore)', l.completed_by);
  });
  // Completed home tasks are household contributions too.
  tasks.forEach((t) => {
    if (t.section !== 'home' || !t.done || !t.completed_date) return;
    if (fromDate && t.completed_date < fromDate) return;
    bump(t.text || '(home task)', t.completed_by);
  });
  return split;
}

function SplitBar({
  me,
  paige,
  height = 8,
  meColor,
  paigeColor,
}: {
  me: number;
  paige: number;
  height?: number;
  meColor: string;
  paigeColor: string;
}) {
  const { palette } = useTheme();
  const tot = me + paige;
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
      {tot ? (
        <>
          <View style={{ width: `${(me / tot) * 100}%`, backgroundColor: meColor }} />
          <View style={{ width: `${(paige / tot) * 100}%`, backgroundColor: paigeColor }} />
        </>
      ) : null}
    </View>
  );
}

export function ChoreSplitCard() {
  const { palette } = useTheme();
  const { choreLog, tasks } = useDataStore();
  const [open, setOpen] = useState(false);

  const split7 = choreSplit(choreLog, tasks, addDays(todayIso(), -7));
  const splitAll = choreSplit(choreLog, tasks, null);
  const tot7 = split7.me + split7.paige;
  const perRows = Object.keys(splitAll.per)
    .map((n) => ({ name: n, ...splitAll.per[n] }))
    .filter((r) => r.paige > 0 || r.me > 0)
    .sort((a, b) => b.me + b.paige - (a.me + a.paige));

  return (
    <Card>
      <SecHeader
        emoji="🤝"
        name="Household chore split"
        count="7d"
        open={open}
        onPress={() => setOpen((o) => !o)}
      />
      <View style={{ paddingTop: 8 }}>
        <View style={styles.totalsRow}>
          <Mono size={11} color={palette.chores}>
            You {split7.me}
          </Mono>
          <Mono size={11} color={palette.paige}>
            Paige {split7.paige}
          </Mono>
        </View>
        {tot7 ? (
          <SplitBar
            me={split7.me}
            paige={split7.paige}
            meColor={palette.chores}
            paigeColor={palette.paige}
          />
        ) : (
          <Mono size={10}>no chores logged in the last 7 days</Mono>
        )}
        {open ? (
          <>
            <Mono size={9} style={{ marginTop: 4 }}>
              all-time: you {splitAll.me} · Paige {splitAll.paige}
            </Mono>
            {perRows.length ? (
              <Mono size={9} style={{ textTransform: 'uppercase', letterSpacing: 0.5, marginTop: 10, marginBottom: 4 }}>
                by chore (all-time)
              </Mono>
            ) : null}
            {perRows.map((r) => (
              <View key={r.name} style={styles.perRow}>
                <Text
                  style={{ flex: 1, fontFamily: fonts.sans, fontSize: 12, color: palette.text1 }}
                  numberOfLines={1}
                >
                  {r.name}
                </Text>
                <Mono size={10} color={palette.text3}>
                  {r.me}/{r.paige}
                </Mono>
                <View style={{ width: 60 }}>
                  <SplitBar
                    me={r.me}
                    paige={r.paige}
                    height={5}
                    meColor={palette.chores}
                    paigeColor={palette.paige}
                  />
                </View>
              </View>
            ))}
          </>
        ) : null}
      </View>
    </Card>
  );
}

const styles = StyleSheet.create({
  totalsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  perRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 3,
  },
});
