// The mini task list used by the Health-tasks and Personal tabs (legacy
// miniTaskSec + trow): progress bar, active tasks (hidden while scheduled for
// a future week via the scheduled_for label), done-this-week list, add form
// with priority + due date, and the complete flow — checking opens a confirm
// sheet (date defaults to today, editable) exactly like the legacy
// task-done-modal; un-checking is instant and revokes nothing.

import { useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { Chip, DateField, SheetTitle, confirmAction } from '@/components/life/shared';
import { Mono, ProgressBar } from '@/components/summary/shared';
import { BottomSheet, Button, TextField } from '@/components/ui';
import { useTheme } from '@/hooks/use-theme';
import { useDataStore } from '@/stores/dataStore';
import { fonts, radius, type Palette } from '@/theme';
import { buildXpMap, calcProactivePoints, xpFor } from '@/utils/compute';
import {
  addDays,
  fmtDate,
  fmtDateSmart,
  getWeekStart,
  isOverdue,
  noon,
  todayIso,
} from '@/utils/dates';
import * as db from '@/utils/supabase/db';
import type { Task } from '@/utils/supabase/db';
import { awardTaskCompletion, awardXp } from '@/utils/xp';

const PRIORITIES = ['urgent', 'high', 'medium', 'low'] as const;
type Priority = (typeof PRIORITIES)[number];

const priorityColors = (palette: Palette, p: string): { fg: string; bg: string } => {
  switch (p) {
    case 'urgent':
      return { fg: palette.danger, bg: palette.dangerBg };
    case 'high':
      return { fg: palette.work, bg: palette.workBg };
    case 'medium':
      return { fg: palette.xp, bg: palette.xpBg };
    default:
      return { fg: palette.success, bg: palette.healthBg };
  }
};

/** Legacy advanceDate(): the next due date for a recurring task. */
function advanceDate(iso: string, rec: string): string {
  const d = noon(iso);
  if (rec === 'daily') d.setDate(d.getDate() + 1);
  else if (rec === 'weekly') d.setDate(d.getDate() + 7);
  else if (rec === 'monthly') d.setMonth(d.getMonth() + 1);
  return (
    d.getFullYear() +
    '-' +
    String(d.getMonth() + 1).padStart(2, '0') +
    '-' +
    String(d.getDate()).padStart(2, '0')
  );
}

export function MiniTaskSection({
  section,
  accent,
  onToast,
}: {
  section: 'health' | 'personal';
  accent: string;
  onToast: (msg: string) => void;
}) {
  const { palette } = useTheme();
  const { tasks, xpValues, upsertRow, removeRow } = useDataStore();

  const [text, setText] = useState('');
  const [priority, setPriority] = useState<Priority | null>(null);
  const [dueDate, setDueDate] = useState<string | null>(null);
  const [notesOpen, setNotesOpen] = useState<Record<string, boolean>>({});
  const [doneTarget, setDoneTarget] = useState<Task | null>(null);
  const [doneDate, setDoneDate] = useState(todayIso());

  const today = todayIso();
  const todayLabel = fmtDate(today); // legacy TODAY_STR ('Jul 6')
  const weekStart = getWeekStart(today);

  // Legacy hTasks/pTasks filters; personal sorts by due date (nulls last).
  const active = useMemo(() => {
    const list = tasks.filter(
      (t) => t.section === section && !t.done && (!t.scheduled_for || t.scheduled_for === todayLabel),
    );
    if (section === 'personal') {
      list.sort((a, b) => {
        if (!a.due_date && !b.due_date) return 0;
        if (!a.due_date) return 1;
        if (!b.due_date) return -1;
        return a.due_date.localeCompare(b.due_date);
      });
    }
    return list;
  }, [tasks, section, todayLabel]);

  const doneWk = useMemo(
    () =>
      tasks.filter(
        (t) =>
          t.section === section &&
          t.done &&
          t.completed_date &&
          getWeekStart(t.completed_date) === weekStart,
      ),
    [tasks, section, weekStart],
  );

  const pct = active.length + doneWk.length
    ? Math.round((doneWk.length / (active.length + doneWk.length)) * 100)
    : 0;

  // ── Handlers ────────────────────────────────────────────────────────────────

  const addTask = async () => {
    const t = text.trim();
    if (!t) return;
    const xpMap = buildXpMap(xpValues);
    const xpValue =
      priority === 'urgent'
        ? xpFor('task_urgent', xpMap)
        : priority === 'high'
          ? xpFor('task_high', xpMap)
          : priority === 'medium'
            ? xpFor('task_medium', xpMap)
            : priority === 'low'
              ? xpFor('task_low', xpMap)
              : xpFor('task_default', xpMap);
    const { data, error } = await db.tasks.insert({
      section,
      text: t,
      priority: priority || null,
      due_date: dueDate,
      xp_value: xpValue,
      created_date: today,
    });
    if (error || !data) {
      onToast('Save failed');
      return;
    }
    upsertRow('tasks', data);
    setText('');
    setPriority(null);
    setDueDate(null);
    // Legacy addTask calls markActive() — adding a task keeps the streak alive.
    await awardXp(0, { markActive: true });
  };

  const pressCheck = (t: Task) => {
    if (!t.done) {
      // Completing goes through the confirm sheet (legacy openTaskDoneModal).
      setDoneDate(todayIso());
      setDoneTarget(t);
      return;
    }
    // Un-completing stays instant; nothing is revoked (legacy toggleTask).
    const updated: Task = {
      ...t,
      done: false,
      completed_date: null,
      proactive_points: 0,
      completed_by: 'me',
    };
    upsertRow('tasks', updated);
    void db.tasks.update(t.id, {
      done: false,
      completed_date: null,
      proactive_points: 0,
      completed_by: 'me',
    });
  };

  const confirmComplete = async () => {
    const t = doneTarget;
    if (!t) return;
    setDoneTarget(null);
    const d = doneDate || todayIso();
    const pp = calcProactivePoints(t.due_date, d, buildXpMap(xpValues));
    const updated: Task = {
      ...t,
      done: true,
      completed_date: d,
      proactive_points: pp,
      completed_by: 'me',
    };
    upsertRow('tasks', updated);
    await db.tasks.update(t.id, {
      done: true,
      completed_date: d,
      proactive_points: pp,
      completed_by: 'me',
    });
    const award = await awardTaskCompletion(updated, d, 'me');
    onToast(`✓ +${award.baseXp}XP${award.pp > 0 ? ` +${award.pp}PP ⚡` : ''}`);
    // Auto-regenerate recurring tasks (legacy completeTask tail).
    if (t.recurrence) {
      const nextDate = advanceDate(t.due_date || d, t.recurrence);
      const { data } = await db.tasks.insert({
        section: t.section,
        text: t.text,
        priority: t.priority,
        due_date: nextDate,
        person_id: t.person_id,
        tags: t.tags,
        recurrence: t.recurrence,
        notes: t.notes,
        xp_value: t.xp_value,
        created_date: todayIso(),
      });
      if (data) {
        upsertRow('tasks', data);
        onToast(`🔁 Repeats ${t.recurrence} — next: ${fmtDate(nextDate)}`);
      }
    }
  };

  const dupeTask = async (t: Task) => {
    const lbl = fmtDate(addDays(today, 7));
    const { data, error } = await db.tasks.insert({
      section: t.section,
      text: t.text,
      priority: t.priority,
      due_date: null,
      person_id: t.person_id,
      tags: t.tags,
      recurrence: t.recurrence,
      notes: t.notes,
      xp_value: t.xp_value,
      scheduled_for: lbl,
      created_date: today,
    });
    if (error || !data) {
      onToast('Save failed');
      return;
    }
    upsertRow('tasks', data);
    onToast('📋 Duped → ' + lbl);
  };

  const deleteTask = (t: Task) => {
    removeRow('tasks', t.id);
    void db.tasks.remove(t.id);
  };

  // ── Row ─────────────────────────────────────────────────────────────────────

  const renderRow = (t: Task) => {
    const over = !t.done && isOverdue(t.due_date, today);
    const tags = Array.isArray(t.tags) ? t.tags : [];
    const pri = t.priority ? priorityColors(palette, t.priority) : null;
    const hasMeta =
      !!t.priority ||
      !!t.due_date ||
      tags.length > 0 ||
      !!t.scheduled_for ||
      t.proactive_points > 0 ||
      !!t.recurrence ||
      !!t.notes;
    return (
      <View
        key={t.id}
        style={[styles.trow, { borderBottomColor: palette.border }, t.done && { opacity: 0.55 }]}
      >
        <Pressable onPress={() => pressCheck(t)} hitSlop={10}>
          <View
            style={[
              styles.check,
              { borderColor: t.done ? accent : palette.border2 },
              t.done && { backgroundColor: accent },
            ]}
          >
            {t.done ? <Text style={{ color: '#fff', fontSize: 12, lineHeight: 14 }}>✓</Text> : null}
          </View>
        </Pressable>
        <View style={{ flex: 1 }}>
          <Text
            style={[
              styles.ttext,
              { color: palette.text1 },
              t.done && { textDecorationLine: 'line-through', color: palette.text2 },
            ]}
          >
            {t.text}
          </Text>
          {hasMeta ? (
            <View style={styles.tmeta}>
              {t.priority && pri ? (
                <View style={[styles.metaPill, { backgroundColor: pri.bg }]}>
                  <Mono size={10} color={pri.fg}>
                    {t.priority}
                  </Mono>
                </View>
              ) : null}
              {t.due_date ? (
                <Mono size={10} color={over ? palette.danger : palette.text3}>
                  {over ? 'overdue · ' : ''}
                  {fmtDateSmart(t.due_date, today)}
                </Mono>
              ) : null}
              {t.recurrence ? (
                <Mono size={10} color={palette.text3}>
                  🔁 {t.recurrence}
                </Mono>
              ) : null}
              {tags.map((g) => (
                <View key={g} style={[styles.metaPill, { backgroundColor: palette.communityBg }]}>
                  <Mono size={10} color={palette.community}>
                    #{g}
                  </Mono>
                </View>
              ))}
              {t.scheduled_for ? (
                <Mono size={10} color={palette.text3}>
                  → {t.scheduled_for}
                </Mono>
              ) : null}
              {t.proactive_points > 0 ? (
                <Mono size={10} color={palette.pp}>
                  +{t.proactive_points}PP ⚡
                </Mono>
              ) : null}
              {t.notes ? (
                <Pressable
                  onPress={() => setNotesOpen((n) => ({ ...n, [t.id]: !n[t.id] }))}
                  hitSlop={6}
                >
                  <Mono size={10} color={palette.text2}>
                    📝 note
                  </Mono>
                </Pressable>
              ) : null}
            </View>
          ) : null}
          {t.notes && notesOpen[t.id] ? (
            <Text style={[styles.tnotes, { color: palette.text2, backgroundColor: palette.card2 }]}>
              {t.notes}
            </Text>
          ) : null}
        </View>
        <View style={styles.tacts}>
          <Pressable onPress={() => dupeTask(t)} hitSlop={6}>
            <Mono size={10} color={palette.text3}>
              +7
            </Mono>
          </Pressable>
          <Pressable
            onPress={() => confirmAction('Delete task?', t.text, () => deleteTask(t))}
            hitSlop={6}
          >
            <Text style={{ fontSize: 11, color: palette.danger }}>✕</Text>
          </Pressable>
        </View>
      </View>
    );
  };

  return (
    <View>
      <ProgressBar pct={pct} color={accent} height={4} />

      {!active.length ? (
        <View style={styles.empty}>
          <Text style={{ fontSize: 18, marginBottom: 4 }}>✓</Text>
          <Mono size={11} color={palette.text3}>
            all clear here
          </Mono>
        </View>
      ) : null}
      {active.map(renderRow)}

      {doneWk.length ? (
        <>
          <View style={[styles.doneHd, { borderTopColor: palette.border }]}>
            <Mono size={10} color={palette.text3}>
              done this week
            </Mono>
          </View>
          {doneWk.map(renderRow)}
        </>
      ) : null}

      <View style={styles.addWrap}>
        <View style={styles.addMain}>
          <TextField
            placeholder="Add a task..."
            value={text}
            onChangeText={setText}
            onSubmitEditing={addTask}
            returnKeyType="done"
            style={{ flex: 1 }}
          />
          <Pressable onPress={addTask} style={[styles.addBtn, { backgroundColor: palette.text1 }]}>
            <Text style={{ fontFamily: fonts.sansMedium, fontSize: 13, color: palette.bg }}>
              Add
            </Text>
          </Pressable>
        </View>
        <View style={styles.addExtras}>
          {PRIORITIES.map((p) => (
            <Chip
              key={p}
              label={p}
              active={priority === p}
              activeColor={priorityColors(palette, p).fg}
              onPress={() => setPriority((cur) => (cur === p ? null : p))}
            />
          ))}
        </View>
        <DateField
          value={dueDate}
          onChange={setDueDate}
          placeholder="Due date (optional)"
        />
      </View>

      {/* Legacy task-done-modal: confirm completion date. */}
      <BottomSheet visible={!!doneTarget} onClose={() => setDoneTarget(null)}>
        <SheetTitle
          title={doneTarget ? '✓ ' + doneTarget.text : ''}
          sub={
            doneTarget?.due_date
              ? 'due ' + fmtDate(doneTarget.due_date) + ' · finishing early earns PP ⚡'
              : 'no due date'
          }
        />
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 12 }}>
          <Mono size={11} color={palette.text2}>
            Done on:
          </Mono>
          <DateField value={doneDate} onChange={setDoneDate} style={{ flex: 1 }} />
        </View>
        <Button title="Mark done" onPress={confirmComplete} variant="accent" accentColor={accent} />
        <Button
          title="Cancel"
          onPress={() => setDoneTarget(null)}
          variant="ghost"
          style={{ marginTop: 8 }}
        />
      </BottomSheet>
    </View>
  );
}

const styles = StyleSheet.create({
  empty: {
    alignItems: 'center',
    paddingVertical: 14,
  },
  trow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 9,
    paddingVertical: 9,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  check: {
    width: 21,
    height: 21,
    borderRadius: 11,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 1,
  },
  ttext: {
    fontFamily: fonts.sans,
    fontSize: 13,
    lineHeight: 18,
  },
  tmeta: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: 6,
    marginTop: 3,
  },
  metaPill: {
    borderRadius: 4,
    paddingHorizontal: 5,
    paddingVertical: 1,
  },
  tnotes: {
    fontFamily: fonts.sans,
    fontSize: 12,
    lineHeight: 17,
    borderRadius: radius.sm,
    padding: 8,
    marginTop: 6,
  },
  tacts: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingTop: 3,
  },
  doneHd: {
    borderTopWidth: StyleSheet.hairlineWidth,
    marginTop: 4,
    paddingTop: 6,
    paddingBottom: 4,
  },
  addWrap: {
    marginTop: 10,
    gap: 8,
  },
  addMain: {
    flexDirection: 'row',
    gap: 8,
  },
  addBtn: {
    borderRadius: radius.md,
    paddingHorizontal: 18,
    justifyContent: 'center',
  },
  addExtras: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 5,
  },
});
