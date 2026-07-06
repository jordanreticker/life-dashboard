// Work pane — the port of the legacy rWork(): the 📆 This-week card with a
// Mon–Sun day-bucketed view of active work tasks (priority-sorted), ⚠ overdue /
// upcoming / unscheduled groups, the done-this-week list (tap to edit, checkbox
// to un-complete — XP is never revoked), the active-tag bar, and the inline
// add bar (#tag / priority / due date). Completing goes through the confirm
// sheet (editable done date → PP for finishing early, recurrence clones).

import { useEffect, useMemo, useRef, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { AddTaskBar } from '@/components/tasks/AddTaskBar';
import { TaskCompleteSheet } from '@/components/tasks/TaskCompleteSheet';
import { TaskEditSheet } from '@/components/tasks/TaskEditSheet';
import { TaskRow } from '@/components/tasks/TaskRow';
import {
  addTask,
  completeTask,
  completionToast,
  deleteTask,
  dupeTask,
  saveTaskEdit,
  sortByPriority,
  uncompleteTask,
  type Priority,
  type TaskEditPatch,
} from '@/components/tasks/taskActions';
import { Mono, ProgressBar } from '@/components/summary/shared';
import { Badge, Card, Loading, PaneTitle, Screen } from '@/components/ui';
import { useTheme } from '@/hooks/use-theme';
import { useDataStore } from '@/stores/dataStore';
import { fonts } from '@/theme';
import { fmtDate, getWeekStart, noon, todayIso, weekDays, weekEnd } from '@/utils/dates';
import type { Task } from '@/utils/supabase/db';
import type { CompletedBy } from '@/utils/xp';

const SECTION = 'work';
const DAY_NAMES = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

export default function WorkScreen() {
  const { palette } = useTheme();
  const { loaded, loading, loadAll, tasks } = useDataStore();

  const [completing, setCompleting] = useState<Task | null>(null);
  const [editing, setEditing] = useState<Task | null>(null);

  // Transient toast (the legacy toast()).
  const [toast, setToast] = useState<string | null>(null);
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const showToast = (msg: string) => {
    if (toastTimer.current) clearTimeout(toastTimer.current);
    setToast(msg);
    toastTimer.current = setTimeout(() => setToast(null), 2600);
  };
  useEffect(
    () => () => {
      if (toastTimer.current) clearTimeout(toastTimer.current);
    },
    [],
  );

  useEffect(() => {
    if (!loaded) loadAll();
  }, [loaded, loadAll]);

  const today = todayIso();
  const weekStart = getWeekStart(today);
  const wkEnd = weekEnd(weekStart);
  const days = weekDays(weekStart);

  // ── Derivations (legacy rWork, pure at render time) ─────────────────────────
  const {
    active,
    done,
    byDay,
    overdue,
    future,
    unscheduled,
    allTags,
  } = useMemo(() => {
    const allWork = tasks.filter((t) => t.section === SECTION);
    const act = allWork.filter((t) => !t.done);
    const dn = allWork.filter(
      (t) => t.done && t.completed_date && getWeekStart(t.completed_date) === weekStart,
    );
    const by: Record<string, Task[]> = {};
    days.forEach((iso) => {
      by[iso] = [];
    });
    const over: Task[] = [];
    const fut: Task[] = [];
    const unsch: Task[] = [];
    act.forEach((t) => {
      if (t.due_date && t.due_date >= weekStart && t.due_date <= wkEnd) by[t.due_date].push(t);
      else if (t.due_date && t.due_date < weekStart) over.push(t);
      else if (t.due_date && t.due_date > wkEnd) fut.push(t);
      else unsch.push(t);
    });
    days.forEach((iso) => {
      by[iso] = sortByPriority(by[iso]);
    });
    return {
      active: act,
      done: dn,
      byDay: by,
      overdue: sortByPriority(over),
      future: sortByPriority(fut),
      unscheduled: sortByPriority(unsch),
      allTags: [...new Set(act.flatMap((t) => t.tags ?? []))].sort(),
    };
  }, [tasks, weekStart, wkEnd, days]);

  const pend = active.length;
  const pct = pend + done.length ? Math.round((done.length / (pend + done.length)) * 100) : 0;

  // ── Handlers ────────────────────────────────────────────────────────────────

  // Legacy toggleTask: completing confirms via the sheet; un-completing is
  // instant (and never revokes XP).
  const toggle = (t: Task) => {
    if (t.done) void uncompleteTask(t);
    else setCompleting(t);
  };

  const confirmComplete = async (task: Task, doneDate: string, who: CompletedBy) => {
    setCompleting(null);
    const { award, nextDate } = await completeTask(task, doneDate, who);
    let msg = completionToast(task, award, who);
    if (nextDate) msg += ` · 🔁 next ${fmtDate(nextDate)}`;
    showToast(msg);
  };

  const handleEditSave = async (task: Task, edit: TaskEditPatch) => {
    setEditing(null);
    const { ppDelta } = await saveTaskEdit(task, edit);
    showToast(
      ppDelta !== 0
        ? `✏️ Updated · ⚡ ${ppDelta > 0 ? '+' : ''}${ppDelta} PP re-graded`
        : '✏️ Updated',
    );
  };

  const handleDupe = async (t: Task) => {
    const { label } = await dupeTask(t);
    showToast('📋 Duped → ' + label);
  };

  const handleAdd = (input: { text: string; tags: string[]; priority: Priority; dueDate: string }) => {
    void addTask({ section: SECTION, ...input });
  };

  const rowActions = {
    onToggle: toggle,
    onEdit: setEditing,
    onDupe: handleDupe,
    onDelete: (t: Task) => void deleteTask(t.id), // legacy: instant, no confirm
  };

  const groupHeader = (label: string, color: string) => (
    <View style={[styles.groupHeader, { borderTopColor: palette.border }]}>
      <Mono size={11} color={color} style={{ fontFamily: fonts.monoMedium }}>
        {label}
      </Mono>
    </View>
  );

  return (
    <View style={{ flex: 1 }}>
      <Screen onRefresh={loadAll} refreshing={loading && loaded}>
        <PaneTitle title="💼 Work" />

        {!loaded ? (
          <Loading label="loading work…" />
        ) : (
          <Card>
            {/* Header: 📆 This week · N left · P% */}
            <View style={styles.secHead}>
              <Text style={{ fontSize: 15 }}>📆</Text>
              <Text style={[styles.secName, { color: palette.text1 }]}>This week</Text>
              <View style={{ marginLeft: 'auto' }}>
                <Badge
                  text={`${pend} left · ${pct}%`}
                  color={pend ? palette.work : palette.success}
                  bg={pend ? palette.workBg : palette.healthBg}
                />
              </View>
            </View>
            <ProgressBar pct={pct} color={palette.work} height={4} />

            {/* Mon–Sun day buckets */}
            <View style={{ marginTop: 10 }}>
              {days.map((iso) => {
                const dayTasks = byDay[iso] ?? [];
                const isToday = iso === today;
                const isPast = iso < today;
                const d = noon(iso);
                return (
                  <View
                    key={iso}
                    style={{
                      marginBottom: dayTasks.length ? 10 : 4,
                      opacity: isPast && !isToday ? 0.55 : 1,
                    }}
                  >
                    <View style={styles.dayHead}>
                      <Mono
                        size={11}
                        color={isToday ? palette.text1 : palette.text2}
                        style={{ fontFamily: fonts.monoMedium }}
                      >
                        {DAY_NAMES[d.getDay()]} {d.getDate()}
                      </Mono>
                      {isToday ? (
                        <View style={[styles.todayPill, { backgroundColor: palette.text1 }]}>
                          <Mono size={9} color={palette.bg}>
                            today
                          </Mono>
                        </View>
                      ) : null}
                      {!dayTasks.length ? <Mono size={10}>—</Mono> : null}
                    </View>
                    {dayTasks.map((t) => (
                      <TaskRow key={t.id} task={t} variant="compact" {...rowActions} />
                    ))}
                  </View>
                );
              })}

              {/* ⚠ Overdue (before this week) */}
              {overdue.length ? (
                <View>
                  {groupHeader(`⚠ overdue (${overdue.length})`, palette.danger)}
                  {overdue.map((t) => (
                    <TaskRow key={t.id} task={t} variant="compact" {...rowActions} />
                  ))}
                </View>
              ) : null}

              {/* Upcoming (after this week) */}
              {future.length ? (
                <View>
                  {groupHeader(`upcoming (${future.length})`, palette.text3)}
                  {future.map((t) => (
                    <TaskRow key={t.id} task={t} variant="compact" {...rowActions} />
                  ))}
                </View>
              ) : null}

              {/* Unscheduled */}
              {unscheduled.length ? (
                <View>
                  {groupHeader('unscheduled', palette.text3)}
                  {unscheduled.map((t) => (
                    <TaskRow key={t.id} task={t} variant="compact" {...rowActions} />
                  ))}
                </View>
              ) : null}

              {/* Done this week — full rows; tap opens edit, checkbox un-completes */}
              {done.length ? (
                <View>
                  {groupHeader('done this week', palette.text3)}
                  {done.map((t) => (
                    <TaskRow
                      key={t.id}
                      task={t}
                      variant="full"
                      {...rowActions}
                      onPressRow={setEditing}
                    />
                  ))}
                </View>
              ) : null}
            </View>

            {/* Active tag bar */}
            {allTags.length ? (
              <View style={[styles.tagBar, { borderTopColor: palette.border }]}>
                {allTags.map((g) => (
                  <View key={g} style={[styles.tagPill, { backgroundColor: palette.communityBg }]}>
                    <Mono size={11} color={palette.community}>
                      #{g}
                    </Mono>
                  </View>
                ))}
              </View>
            ) : null}

            <AddTaskBar accentColor={palette.work} onAdd={handleAdd} />
          </Card>
        )}

        <TaskCompleteSheet
          task={completing}
          accentColor={palette.work}
          onClose={() => setCompleting(null)}
          onConfirm={confirmComplete}
        />
        <TaskEditSheet
          task={editing}
          accentColor={palette.work}
          onClose={() => setEditing(null)}
          onSave={handleEditSave}
        />
      </Screen>

      {toast ? (
        <View pointerEvents="none" style={styles.toastWrap}>
          <View style={[styles.toast, { backgroundColor: palette.text1 }]}>
            <Text style={{ fontFamily: fonts.sansMedium, fontSize: 12, color: palette.bg }}>
              {toast}
            </Text>
          </View>
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  secHead: { flexDirection: 'row', alignItems: 'center', gap: 7, marginBottom: 8 },
  secName: { fontFamily: fonts.sansMedium, fontSize: 14 },
  dayHead: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 4 },
  todayPill: { paddingHorizontal: 6, paddingVertical: 1, borderRadius: 10 },
  groupHeader: {
    borderTopWidth: StyleSheet.hairlineWidth,
    paddingTop: 8,
    marginTop: 4,
    marginBottom: 6,
  },
  tagBar: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    borderTopWidth: StyleSheet.hairlineWidth,
    paddingTop: 10,
    marginTop: 10,
  },
  tagPill: { paddingHorizontal: 9, paddingVertical: 3, borderRadius: 4 },
  toastWrap: { position: 'absolute', left: 0, right: 0, bottom: 24, alignItems: 'center' },
  toast: {
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: 20,
    maxWidth: '86%',
  },
});
