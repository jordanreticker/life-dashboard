// Home tasks card (legacy 📋 Home tasks section): adhoc household to-dos,
// completable by you or Paige. Active tasks sort by due date (undated last);
// tasks done this week list under a divider. Add form with priority + due date
// extras (owner mode only, like the legacy isPaigeMode() guard).

import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { Mono } from '@/components/summary/shared';
import { Badge, Card, TextField } from '@/components/ui';
import { useTheme } from '@/hooks/use-theme';
import { fonts, radius } from '@/theme';
import { activeTasks, buildXpMap, taskBaseXp } from '@/utils/compute';
import { addDays, fmtDate, fmtDateSmart, getWeekStart, isOverdue, todayIso } from '@/utils/dates';
import * as db from '@/utils/supabase/db';
import type { Task } from '@/utils/supabase/db';
import { useDataStore } from '@/stores/dataStore';

import { DateField } from './DateField';

const PRIORITIES = ['urgent', 'high', 'medium', 'low'] as const;
type Priority = (typeof PRIORITIES)[number];

export function HomeTasksCard({
  paigeMode,
  onCompleteRequest,
}: {
  paigeMode: boolean;
  onCompleteRequest: (task: Task) => void;
}) {
  const { palette } = useTheme();
  const tasks = useDataStore((s) => s.tasks);
  const xpValues = useDataStore((s) => s.xpValues);
  const upsertRow = useDataStore((s) => s.upsertRow);
  const removeRow = useDataStore((s) => s.removeRow);

  const [text, setText] = useState('');
  const [priority, setPriority] = useState<Priority | null>(null);
  const [due, setDue] = useState<string | null>(null);

  const today = todayIso();
  const weekStart = getWeekStart(today);

  const homeActive = activeTasks(tasks, today)
    .filter((t) => t.section === 'home')
    .sort((a, b) => {
      if (!a.due_date && !b.due_date) return 0;
      if (!a.due_date) return 1;
      if (!b.due_date) return -1;
      return a.due_date.localeCompare(b.due_date);
    });
  const homeDone = tasks.filter(
    (t) =>
      t.section === 'home' &&
      t.done &&
      t.completed_date &&
      getWeekStart(t.completed_date) === weekStart,
  );

  const add = async () => {
    const txt = text.trim();
    if (!txt) return;
    const xpMap = buildXpMap(xpValues);
    const { data, error } = await db.tasks.insert({
      section: 'home',
      text: txt,
      done: false,
      priority: priority ?? '',
      due_date: due,
      tags: [],
      created_date: today,
      xp_value: taskBaseXp({ priority: priority ?? '', xp_value: 0 }, xpMap),
      completed_by: 'me',
    });
    if (error || !data) return;
    upsertRow('tasks', data);
    setText('');
    setPriority(null);
    setDue(null);
  };

  const uncomplete = async (t: Task) => {
    // Legacy toggleTask: un-completing is instant and does NOT refund XP.
    const { data, error } = await db.tasks.update(t.id, {
      done: false,
      completed_date: null,
      proactive_points: 0,
      completed_by: 'me',
    });
    if (error || !data) return;
    upsertRow('tasks', data);
  };

  const del = async (t: Task) => {
    const { error } = await db.tasks.remove(t.id);
    if (error) return;
    removeRow('tasks', t.id);
  };

  const dupe = async (t: Task) => {
    // Legacy dupeTask: clone scheduled for +7 days (label), due date cleared.
    const label = fmtDate(addDays(today, 7));
    const { data, error } = await db.tasks.insert({
      section: t.section,
      text: t.text,
      done: false,
      priority: t.priority,
      due_date: null,
      tags: t.tags,
      scheduled_for: label,
      created_date: today,
      xp_value: t.xp_value,
      recurrence: t.recurrence,
      notes: t.notes,
      completed_by: 'me',
    });
    if (error || !data) return;
    upsertRow('tasks', data);
  };

  const priColor = (p: string | null): string =>
    p === 'urgent'
      ? palette.danger
      : p === 'high'
        ? palette.work
        : p === 'medium'
          ? palette.xp
          : palette.text3;

  const row = (t: Task) => {
    const over = !t.done && isOverdue(t.due_date, today);
    return (
      <View key={t.id} style={styles.trow}>
        <Pressable
          hitSlop={8}
          onPress={() => (t.done ? uncomplete(t) : onCompleteRequest(t))}
          style={[
            styles.chk,
            { borderColor: t.done ? palette.success : palette.border2 },
            t.done && { backgroundColor: palette.success },
          ]}
        >
          {t.done ? <Text style={styles.chkMark}>✓</Text> : null}
        </Pressable>
        <View style={{ flex: 1, minWidth: 0 }}>
          <Text
            style={[
              styles.ttxt,
              { color: t.done ? palette.text3 : palette.text1 },
              t.done && { textDecorationLine: 'line-through' },
            ]}
          >
            {t.text}
          </Text>
          {t.priority || t.due_date || Number(t.proactive_points) > 0 || t.completed_by !== 'me' ? (
            <View style={styles.tmeta}>
              {t.priority ? (
                <Mono size={9} color={priColor(t.priority)}>
                  {t.priority}
                </Mono>
              ) : null}
              {t.due_date ? (
                <Mono size={9} color={over ? palette.danger : palette.text3}>
                  {over ? 'overdue · ' : ''}
                  {fmtDateSmart(t.due_date, today)}
                </Mono>
              ) : null}
              {Number(t.proactive_points) > 0 ? (
                <Mono size={9} color={palette.pp}>
                  +{Number(t.proactive_points)}PP ⚡
                </Mono>
              ) : null}
              {t.done && t.completed_by !== 'me' ? (
                <Mono size={9} color={palette.paige}>
                  {t.completed_by === 'joint' ? '🤝 both' : '💕 Paige'}
                </Mono>
              ) : null}
            </View>
          ) : null}
        </View>
        {!paigeMode && !t.done ? (
          <View style={{ flexDirection: 'row', gap: 2 }}>
            <Pressable hitSlop={6} onPress={() => dupe(t)} style={styles.actBtn}>
              <Mono size={10} color={palette.text3}>
                +7
              </Mono>
            </Pressable>
            <Pressable hitSlop={6} onPress={() => del(t)} style={styles.actBtn}>
              <Text style={{ fontSize: 11, color: palette.danger }}>✕</Text>
            </Pressable>
          </View>
        ) : null}
      </View>
    );
  };

  return (
    <Card>
      <View style={styles.hd}>
        <Text style={{ fontSize: 15 }}>📋</Text>
        <Text style={[styles.secName, { color: palette.text1 }]}>Home tasks</Text>
        <View style={{ flex: 1 }} />
        <Badge
          text={`${homeActive.length} to do`}
          color={homeActive.length ? palette.danger : palette.success}
          bg={homeActive.length ? palette.dangerBg : palette.healthBg}
        />
      </View>

      {!homeActive.length ? (
        <Mono size={11} style={{ textAlign: 'center', paddingVertical: 12 }}>
          no home tasks — add one below
        </Mono>
      ) : (
        homeActive.map(row)
      )}

      {homeDone.length ? (
        <>
          <View style={[styles.doneHd, { borderTopColor: palette.border }]}>
            <Mono size={10}>done this week</Mono>
          </View>
          {homeDone.map(row)}
        </>
      ) : null}

      <View style={[styles.addWrap, { borderTopColor: palette.border }]}>
        <View style={{ flexDirection: 'row', gap: 6 }}>
          <TextField
            placeholder="Add a home task..."
            value={text}
            onChangeText={setText}
            onSubmitEditing={add}
            returnKeyType="done"
            style={{ flex: 1 }}
          />
          <Pressable onPress={add} style={[styles.addBtn, { backgroundColor: palette.text1 }]}>
            <Text style={{ fontFamily: fonts.sansMedium, fontSize: 13, color: palette.bg }}>
              Add
            </Text>
          </Pressable>
        </View>
        {!paigeMode ? (
          <View style={styles.addExtras}>
            <View style={{ flexDirection: 'row', gap: 5, flexWrap: 'wrap', flex: 1 }}>
              {PRIORITIES.map((p) => {
                const sel = priority === p;
                return (
                  <Pressable
                    key={p}
                    onPress={() => setPriority(sel ? null : p)}
                    style={[
                      styles.priChip,
                      { borderColor: sel ? priColor(p) : palette.border2 },
                      sel && { backgroundColor: priColor(p) },
                    ]}
                  >
                    <Mono size={9} color={sel ? palette.surface : palette.text2}>
                      {p}
                    </Mono>
                  </Pressable>
                );
              })}
            </View>
            {due ? (
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                <DateField value={due} onChange={setDue} />
                <Pressable hitSlop={6} onPress={() => setDue(null)}>
                  <Mono size={10} color={palette.text3}>
                    ✕
                  </Mono>
                </Pressable>
              </View>
            ) : (
              <Pressable onPress={() => setDue(today)} hitSlop={6}>
                <Mono size={10} color={palette.text2}>
                  + due date
                </Mono>
              </Pressable>
            )}
          </View>
        ) : null}
      </View>
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
  secName: { fontFamily: fonts.sansMedium, fontSize: 14 },
  trow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 9,
    paddingVertical: 6,
  },
  chk: {
    width: 21,
    height: 21,
    borderRadius: 7,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  chkMark: { color: '#fff', fontSize: 12, lineHeight: 14 },
  ttxt: { fontFamily: fonts.sans, fontSize: 13, lineHeight: 18 },
  tmeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 1,
    flexWrap: 'wrap',
  },
  actBtn: { paddingHorizontal: 5, paddingVertical: 5 },
  doneHd: {
    borderTopWidth: StyleSheet.hairlineWidth,
    marginTop: 4,
    paddingTop: 6,
    paddingBottom: 2,
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
    gap: 8,
    marginTop: 8,
  },
  priChip: {
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 12,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
});
