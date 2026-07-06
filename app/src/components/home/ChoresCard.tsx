// One chore section card (legacy choreSection): freshness-sorted rows grouped
// into needs-doing / due-soon / fresh, a distribution bar, an expandable fresh
// group, and (for the recurring-chores card) the inline add form. Both the
// 🧹 Recurring chores and 📦 Ordering/restock sections render through this.

import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { Mono, ProgressBar } from '@/components/summary/shared';
import { Badge, Card, TextField } from '@/components/ui';
import { useTheme } from '@/hooks/use-theme';
import { fonts, radius } from '@/theme';
import { freshBarPct, freshness, type Freshness } from '@/utils/compute';
import { todayIso } from '@/utils/dates';
import type { Chore } from '@/utils/supabase/db';

import { CompleterChip, freshColor, lastChoreCompleter, type Completer } from './shared';
import type { ChoreLogEntry } from '@/utils/supabase/db';

interface ChoreWithFresh {
  chore: Chore;
  fresh: Freshness;
  lastBy: Completer | null;
}

export function ChoresCard({
  emoji,
  title,
  chores,
  choreLog,
  lastDoneByChore,
  expanded,
  onToggleExpanded,
  selectedId,
  onSelect,
  onComplete,
  onEdit,
  onDelete,
  paigeMode,
  emptyMsg,
  showAdd = false,
  onAdd,
}: {
  emoji: string;
  title: string;
  chores: Chore[];
  choreLog: ChoreLogEntry[];
  lastDoneByChore: Record<string, string>;
  expanded: boolean;
  onToggleExpanded: (v: boolean) => void;
  selectedId: string | null;
  onSelect: (id: string | null) => void;
  onComplete: (chore: Chore) => void;
  onEdit: (chore: Chore) => void;
  onDelete: (chore: Chore) => void;
  paigeMode: boolean;
  emptyMsg: string;
  showAdd?: boolean;
  onAdd?: (name: string, intervalDays: number, xp: number) => void;
}) {
  const { palette } = useTheme();
  const today = todayIso();

  const [addName, setAddName] = useState('');
  const [addInterval, setAddInterval] = useState('7');
  const [addXp, setAddXp] = useState('8');

  const withFresh: ChoreWithFresh[] = chores
    .map((chore) => ({
      chore,
      fresh: freshness(lastDoneByChore[chore.id] ?? null, chore.interval_days, today),
      lastBy: lastChoreCompleter(choreLog, chore.id),
    }))
    .sort((a, b) => a.fresh.pct - b.fresh.pct);
  const over = withFresh.filter((c) => c.fresh.overdue);
  const soon = withFresh.filter((c) => !c.fresh.overdue && c.fresh.pct < 40);
  const freshOnes = withFresh.filter((c) => !c.fresh.overdue && c.fresh.pct >= 40);
  const total = withFresh.length;

  const submitAdd = () => {
    const name = addName.trim();
    if (!name || !onAdd) return;
    onAdd(name, parseInt(addInterval, 10) || 7, parseInt(addXp, 10) || 8);
    setAddName('');
  };

  const row = ({ chore, fresh, lastBy }: ChoreWithFresh) => {
    const color = freshColor(fresh, palette);
    const sel = selectedId === chore.id;
    const barPct = freshBarPct(fresh.pct);
    const xpLabel = Number(chore.xp_value) > 0 ? `${Number(chore.xp_value)}XP` : 'set XP →';
    return (
      <Pressable
        key={chore.id}
        onPress={() => {
          // Legacy two-tap flow: first tap selects (reveals edit/✕), second opens the completion sheet.
          if (sel) {
            onSelect(null);
            onComplete(chore);
          } else {
            onSelect(chore.id);
          }
        }}
        style={[
          styles.crow,
          { borderLeftColor: color, backgroundColor: sel ? palette.card2 : 'transparent' },
        ]}
      >
        <View style={{ flex: 1, minWidth: 0 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            <Text style={[styles.cname, { color: palette.text1 }]} numberOfLines={1}>
              {chore.name}
            </Text>
            <CompleterChip who={lastBy} />
          </View>
          <Mono size={10} color={color}>
            {fresh.label} · every {chore.interval_days}d · {xpLabel}
            {fresh.overdue && fresh.label !== 'never done' ? ' ⚠️' : ''}
          </Mono>
        </View>
        <View style={styles.fwrap}>
          <View style={{ flex: 1 }}>
            <ProgressBar pct={barPct} color={color} height={5} />
          </View>
          <Mono size={9} color={color} style={{ width: 34, textAlign: 'right' }}>
            {fresh.pct}%
          </Mono>
        </View>
        {sel && !paigeMode ? (
          <View style={{ flexDirection: 'row', gap: 4 }}>
            <Pressable
              hitSlop={6}
              onPress={() => onEdit(chore)}
              style={styles.actBtn}
            >
              <Text style={{ fontSize: 13 }}>✏️</Text>
            </Pressable>
            <Pressable hitSlop={6} onPress={() => onDelete(chore)} style={styles.actBtn}>
              <Text style={{ fontSize: 12, color: palette.danger }}>✕</Text>
            </Pressable>
          </View>
        ) : null}
      </Pressable>
    );
  };

  const group = (label: string, gEmoji: string, color: string, arr: ChoreWithFresh[]) =>
    !arr.length ? null : (
      <View key={label}>
        <View style={styles.groupHd}>
          <Text style={{ fontSize: 12 }}>{gEmoji}</Text>
          <Mono size={10} color={color} style={{ textTransform: 'uppercase', letterSpacing: 0.7 }}>
            {label}
          </Mono>
          <View style={[styles.groupRule, { backgroundColor: palette.border }]} />
          <Mono size={10} color={color}>
            {arr.length}
          </Mono>
        </View>
        {arr.map(row)}
      </View>
    );

  return (
    <Card>
      <View style={styles.hd}>
        <Text style={{ fontSize: 15 }}>{emoji}</Text>
        <Text style={[styles.secName, { color: palette.text1 }]}>{title}</Text>
        <View style={{ flex: 1 }} />
        <Badge
          text={over.length ? `${over.length} overdue` : 'all fresh'}
          color={over.length ? palette.danger : palette.success}
          bg={over.length ? palette.dangerBg : palette.healthBg}
        />
      </View>

      {total ? (
        <>
          <View style={[styles.distBar, { backgroundColor: palette.border }]}>
            {(
              [
                [palette.danger, over.length],
                [palette.work, soon.length],
                [palette.success, freshOnes.length],
              ] as const
            ).map(([color, count], i) =>
              count ? (
                <View
                  key={i}
                  style={{ flex: count / total, backgroundColor: color, height: '100%' }}
                />
              ) : null,
            )}
          </View>
          <View style={styles.distLegend}>
            <Mono size={9} color={palette.danger}>
              {over.length} overdue
            </Mono>
            <Mono size={9} color={palette.work}>
              {soon.length} due soon
            </Mono>
            <Mono size={9} color={palette.success}>
              {freshOnes.length} fresh
            </Mono>
          </View>
        </>
      ) : null}

      {!total ? (
        <Mono size={11} style={{ textAlign: 'center', paddingVertical: 12 }}>
          {emptyMsg}
        </Mono>
      ) : null}
      {group('needs doing', '⚠️', palette.danger, over)}
      {group('due soon', '⏳', palette.work, soon)}
      {expanded ? group('fresh', '✅', palette.success, freshOnes) : null}

      {freshOnes.length ? (
        <Pressable onPress={() => onToggleExpanded(!expanded)} style={styles.expandBtn}>
          <Mono size={11} color={palette.text2}>
            {expanded ? 'hide fresh' : `✅ show ${freshOnes.length} fresh`}
          </Mono>
        </Pressable>
      ) : null}

      <Mono size={9} style={{ textAlign: 'center', marginTop: 6 }}>
        tap to mark done · ✏️ to edit
      </Mono>

      {showAdd ? (
        <View style={[styles.addWrap, { borderTopColor: palette.border }]}>
          <View style={{ flexDirection: 'row', gap: 6 }}>
            <TextField
              placeholder="New chore name..."
              value={addName}
              onChangeText={setAddName}
              onSubmitEditing={submitAdd}
              returnKeyType="done"
              style={{ flex: 1 }}
            />
            <Pressable
              onPress={submitAdd}
              style={[styles.addBtn, { backgroundColor: palette.text1 }]}
            >
              <Text style={{ fontFamily: fonts.sansMedium, fontSize: 13, color: palette.bg }}>
                Add
              </Text>
            </Pressable>
          </View>
          <View style={styles.addExtras}>
            <Mono size={11} color={palette.text2}>
              Every
            </Mono>
            <TextField
              value={addInterval}
              onChangeText={setAddInterval}
              keyboardType="number-pad"
              style={{ width: 56, textAlign: 'center' }}
            />
            <Mono size={11} color={palette.text2}>
              days
            </Mono>
            <TextField
              value={addXp}
              onChangeText={setAddXp}
              keyboardType="number-pad"
              placeholder="XP"
              style={{ width: 56, textAlign: 'center' }}
            />
            <Mono size={11} color={palette.text2}>
              XP
            </Mono>
          </View>
          {!paigeMode ? (
            <Mono size={9} style={{ marginTop: 6, opacity: 0.7 }}>
              tip: tap ✏️ on a chore to make it an 📦 Ordering task
            </Mono>
          ) : null}
        </View>
      ) : null}
    </Card>
  );
}

const styles = StyleSheet.create({
  hd: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
    marginBottom: 8,
  },
  secName: {
    fontFamily: fonts.sansMedium,
    fontSize: 14,
  },
  distBar: {
    flexDirection: 'row',
    height: 6,
    borderRadius: 3,
    overflow: 'hidden',
    marginBottom: 3,
  },
  distLegend: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 4,
  },
  groupHd: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingTop: 10,
    paddingBottom: 4,
  },
  groupRule: { flex: 1, height: StyleSheet.hairlineWidth },
  crow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    borderLeftWidth: 3,
    borderRadius: radius.sm,
    paddingVertical: 7,
    paddingHorizontal: 8,
    marginBottom: 2,
  },
  cname: {
    fontFamily: fonts.sans,
    fontSize: 13,
    flexShrink: 1,
  },
  fwrap: {
    width: 92,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  actBtn: {
    paddingHorizontal: 4,
    paddingVertical: 6,
  },
  expandBtn: {
    alignItems: 'center',
    paddingVertical: 8,
  },
  addWrap: {
    borderTopWidth: StyleSheet.hairlineWidth,
    marginTop: 8,
    paddingTop: 10,
  },
  addBtn: {
    borderRadius: radius.md,
    paddingHorizontal: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  addExtras: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 6,
  },
});
