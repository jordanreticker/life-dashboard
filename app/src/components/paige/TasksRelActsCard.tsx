// The Paige pane's central card: the legacy tasks ⇄ rel-acts tabbed view.
//   Tasks tab — paige-section tasks with progress bar, done-this-week section,
//   add row (priority + due date), completion via a date-confirm sheet
//   (legacy openTaskDoneModal → completeTask, who is always 'me' for paige),
//   instant un-complete, delete and +7 dupe.
//   Rel acts tab — freshness-sorted acts (stalest first), tap to select then
//   tap again for the "💕 Just did this" confirm sheet (awardRelActCompletion),
//   ✏️ edit name/interval, ✕ delete, show-7/expand, add row with interval.

import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { Mono, ProgressBar } from '@/components/summary/shared';
import { BottomSheet, Button, Card, TextField } from '@/components/ui';
import { useTheme } from '@/hooks/use-theme';
import { useDataStore } from '@/stores/dataStore';
import { fonts, radius, type Palette } from '@/theme';
import {
  buildXpMap,
  calcProactivePoints,
  freshBarPct,
  freshness,
  xpFor,
} from '@/utils/compute';
import { fmtDate, fmtDateSmart, getWeekStart, isOverdue, todayIso } from '@/utils/dates';
import * as db from '@/utils/supabase/db';
import type { RelAct, Task } from '@/utils/supabase/db';
import { awardRelActCompletion, awardTaskCompletion, awardXp, xpValue } from '@/utils/xp';

import { AddRow, advanceDate, Check, DateField, freshColor, SheetTitle } from './shared';

type PaigeTab = 'tasks' | 'relacts';
type Priority = '' | 'low' | 'medium' | 'high' | 'urgent';

const PRIORITIES: Priority[] = ['', 'low', 'medium', 'high', 'urgent'];

function priColor(palette: Palette, pri: string | null): string {
  switch (pri) {
    case 'urgent':
      return palette.danger;
    case 'high':
      return palette.work;
    case 'medium':
      return palette.xp;
    default:
      return palette.chores;
  }
}

export function TasksRelActsCard() {
  const { palette } = useTheme();
  const store = useDataStore();
  const { tasks, relActs, xpValues, upsertRow, removeRow } = store;
  const [tab, setTab] = useState<PaigeTab>('tasks');

  // ── Tasks tab state ──────────────────────────────────────────────────────────
  const [doneTaskId, setDoneTaskId] = useState<string | null>(null);
  const [doneDate, setDoneDate] = useState(todayIso());
  const [addPri, setAddPri] = useState<Priority>('');
  const [addDue, setAddDue] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  // ── Rel acts tab state ───────────────────────────────────────────────────────
  const [selectedRelId, setSelectedRelId] = useState<string | null>(null);
  const [relExpanded, setRelExpanded] = useState(false);
  const [pendingRelId, setPendingRelId] = useState<string | null>(null);
  const [editingRelId, setEditingRelId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [editInterval, setEditInterval] = useState('7');
  const [addInterval, setAddInterval] = useState('7');

  const today = todayIso();
  const weekStart = getWeekStart(today);
  const xpMap = buildXpMap(xpValues);

  // Legacy rPaige task filters.
  const paigeTasks = tasks.filter(
    (t) => t.section === 'paige' && (!t.scheduled_for || t.scheduled_for === fmtDate(today)),
  );
  const activePaige = paigeTasks.filter((t) => !t.done);
  const donePaige = paigeTasks.filter(
    (t) => t.done && t.completed_date && getWeekStart(t.completed_date) === weekStart,
  );
  const pend = activePaige.length;
  const pct = paigeTasks.length
    ? Math.round(((paigeTasks.length - pend) / paigeTasks.length) * 100)
    : 0;

  const sortedRel = [...relActs].sort(
    (a, b) =>
      freshness(a.last_done, a.interval_days, today).pct -
      freshness(b.last_done, b.interval_days, today).pct,
  );
  const staleRel = sortedRel.filter((r) => freshness(r.last_done, r.interval_days, today).overdue)
    .length;
  const relShown = relExpanded ? sortedRel : sortedRel.slice(0, 7);
  const relHidden = sortedRel.length - relShown.length;

  // ── Task actions (legacy addTask / completeTask / toggleTask / dupeTask) ─────
  const addTask = async (text: string) => {
    const xpVal =
      addPri === 'urgent'
        ? xpFor('task_urgent', xpMap)
        : addPri === 'high'
          ? xpFor('task_high', xpMap)
          : addPri === 'medium'
            ? xpFor('task_medium', xpMap)
            : addPri === 'low'
              ? xpFor('task_low', xpMap)
              : xpFor('task_default', xpMap);
    const { data } = await db.tasks.insert({
      section: 'paige',
      text,
      done: false,
      priority: addPri || null,
      due_date: addDue,
      tags: [],
      created_date: today,
      xp_value: xpVal,
      completed_by: 'me',
    });
    if (data) upsertRow('tasks', data);
    setAddPri('');
    setAddDue(null);
    await awardXp(0, { markActive: true }); // legacy addTask calls markActive()
  };

  const confirmDone = async () => {
    const t = tasks.find((x) => x.id === doneTaskId);
    if (!t || t.done || busy) return;
    setBusy(true);
    const d = doneDate || today;
    const pp = calcProactivePoints(t.due_date, d, xpMap);
    const { data } = await db.tasks.update(t.id, {
      done: true,
      completed_by: 'me',
      completed_date: d,
      proactive_points: pp,
    });
    if (data) upsertRow('tasks', data);
    await awardTaskCompletion(t, d, 'me');
    // Auto-regenerate recurring tasks (legacy completeTask tail).
    if (t.recurrence) {
      const { data: clone } = await db.tasks.insert({
        section: t.section,
        text: t.text,
        done: false,
        priority: t.priority,
        due_date: advanceDate(t.due_date || d, t.recurrence),
        person_id: t.person_id,
        tags: t.tags,
        created_date: today,
        xp_value: t.xp_value,
        recurrence: t.recurrence,
        notes: t.notes,
        completed_by: 'me',
      });
      if (clone) upsertRow('tasks', clone);
    }
    setBusy(false);
    setDoneTaskId(null);
  };

  // Un-completing is instant and refunds nothing (legacy toggleTask).
  const uncomplete = async (t: Task) => {
    const { data } = await db.tasks.update(t.id, {
      done: false,
      completed_date: null,
      proactive_points: 0,
      completed_by: 'me',
    });
    if (data) upsertRow('tasks', data);
  };

  const deleteTask = async (t: Task) => {
    const { error } = await db.tasks.remove(t.id);
    if (!error) removeRow('tasks', t.id);
  };

  const dupeTask = async (t: Task) => {
    const next = new Date();
    next.setDate(next.getDate() + 7);
    const lbl = next.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    const { data } = await db.tasks.insert({
      section: t.section,
      text: t.text,
      done: false,
      priority: t.priority,
      scheduled_for: lbl,
      due_date: null,
      person_id: t.person_id,
      tags: t.tags,
      created_date: t.created_date,
      xp_value: t.xp_value,
      recurrence: t.recurrence,
      notes: t.notes,
      completed_by: 'me',
    });
    if (data) upsertRow('tasks', data);
  };

  // ── Rel act actions ───────────────────────────────────────────────────────────
  const addRelAct = async (name: string) => {
    const { data } = await db.relActs.insert({
      name,
      interval_days: Number(addInterval) || 7,
      last_done: null,
    });
    if (data) upsertRow('relActs', data);
    setAddInterval('7');
  };

  // Legacy confirmRelAct: bump last_done, then award relact_base (+PP if ≥50% fresh).
  const confirmRelAct = async () => {
    const r = relActs.find((x) => x.id === pendingRelId);
    if (!r || busy) return;
    setBusy(true);
    const { data } = await db.relActs.update(r.id, { last_done: today });
    if (data) upsertRow('relActs', data);
    await awardRelActCompletion(r); // pass the pre-bump row — freshness judged on prior state
    setBusy(false);
    setPendingRelId(null);
  };

  const saveRelEdit = async () => {
    const r = relActs.find((x) => x.id === editingRelId);
    if (!r || busy) return;
    setBusy(true);
    const { data } = await db.relActs.update(r.id, {
      name: editName.trim() || r.name,
      interval_days: Number(editInterval) || 7,
    });
    if (data) upsertRow('relActs', data);
    setBusy(false);
    setEditingRelId(null);
  };

  const deleteRelAct = async (r: RelAct) => {
    const { error } = await db.relActs.remove(r.id);
    if (!error) removeRow('relActs', r.id);
    if (selectedRelId === r.id) setSelectedRelId(null);
  };

  // ── Render bits ───────────────────────────────────────────────────────────────
  const tabBtn = (key: PaigeTab, emoji: string, label: string, count: number) => {
    const active = tab === key;
    return (
      <Pressable
        key={key}
        onPress={() => setTab(key)}
        style={[
          styles.tabBtn,
          { borderBottomColor: active ? palette.paige : 'transparent' },
        ]}
      >
        <Mono
          size={11}
          color={active ? palette.paige : palette.text3}
          style={active ? { fontFamily: fonts.monoMedium } : undefined}
        >
          {emoji} {label} ({count})
        </Mono>
      </Pressable>
    );
  };

  const taskRow = (t: Task) => {
    const over = !t.done && isOverdue(t.due_date, today);
    const hasMeta =
      t.priority || t.due_date || (t.tags || []).length > 0 || t.scheduled_for ||
      Number(t.proactive_points) > 0 || t.recurrence;
    return (
      <View key={t.id} style={[styles.taskRow, t.done && { opacity: 0.55 }]}>
        <Check
          checked={t.done}
          color={palette.paige}
          onPress={() => (t.done ? uncomplete(t) : (setDoneDate(today), setDoneTaskId(t.id)))}
        />
        <View style={{ flex: 1 }}>
          <Text
            style={{
              fontFamily: fonts.sans,
              fontSize: 13,
              color: palette.text1,
              textDecorationLine: t.done ? 'line-through' : 'none',
            }}
          >
            {t.text}
          </Text>
          {hasMeta ? (
            <View style={styles.metaRow}>
              {t.priority ? (
                <Mono size={9} color={priColor(palette, t.priority)}>
                  {t.priority}
                </Mono>
              ) : null}
              {t.due_date ? (
                <Mono size={9} color={over ? palette.danger : palette.text3}>
                  {over ? 'overdue · ' : ''}
                  {fmtDateSmart(t.due_date, today)}
                </Mono>
              ) : null}
              {t.recurrence ? <Mono size={9}>🔁 {t.recurrence}</Mono> : null}
              {(t.tags || []).map((g) => (
                <Mono key={g} size={9} color={palette.text2}>
                  #{g}
                </Mono>
              ))}
              {t.scheduled_for ? <Mono size={9}>→ {t.scheduled_for}</Mono> : null}
              {Number(t.proactive_points) > 0 ? (
                <Mono size={9} color={palette.pp}>
                  +{Number(t.proactive_points)}PP ⚡
                </Mono>
              ) : null}
            </View>
          ) : null}
          {t.notes ? (
            <Text
              style={{
                fontFamily: fonts.sans,
                fontSize: 11,
                fontStyle: 'italic',
                color: palette.text3,
                marginTop: 2,
              }}
            >
              {t.notes}
            </Text>
          ) : null}
        </View>
        {!t.done ? (
          <Pressable onPress={() => dupeTask(t)} hitSlop={6}>
            <Mono size={10} color={palette.text3}>
              +7
            </Mono>
          </Pressable>
        ) : null}
        <Pressable onPress={() => deleteTask(t)} hitSlop={6}>
          <Text style={{ fontSize: 11, color: palette.danger, opacity: 0.7 }}>✕</Text>
        </Pressable>
      </View>
    );
  };

  const relRow = (r: RelAct) => {
    const f = freshness(r.last_done, r.interval_days, today);
    const color = freshColor(palette, f.tone);
    const selected = selectedRelId === r.id;
    return (
      <Pressable
        key={r.id}
        onPress={() => {
          if (selected) {
            setSelectedRelId(null);
            setPendingRelId(r.id);
          } else {
            setSelectedRelId(r.id);
          }
        }}
        style={[styles.relRow, selected && { backgroundColor: palette.card2, borderRadius: radius.sm }]}
      >
        <View style={{ flex: 1 }}>
          <Text style={{ fontFamily: fonts.sans, fontSize: 13, color: palette.text1 }}>
            {r.name}
          </Text>
          <Mono size={10} color={color} style={{ marginTop: 1 }}>
            {f.label} · every {r.interval_days}d
          </Mono>
        </View>
        <View style={{ width: 74 }}>
          <ProgressBar pct={freshBarPct(f.pct)} color={color} height={5} />
          <Mono size={9} color={color} style={{ marginTop: 2, textAlign: 'right' }}>
            {f.pct}%
          </Mono>
        </View>
        {selected ? (
          <>
            <Pressable
              onPress={() => {
                setEditName(r.name);
                setEditInterval(String(r.interval_days || 7));
                setEditingRelId(r.id);
              }}
              hitSlop={6}
            >
              <Text style={{ fontSize: 12 }}>✏️</Text>
            </Pressable>
            <Pressable onPress={() => deleteRelAct(r)} hitSlop={6}>
              <Text style={{ fontSize: 11, color: palette.danger }}>✕</Text>
            </Pressable>
          </>
        ) : null}
      </Pressable>
    );
  };

  const doneTask = tasks.find((t) => t.id === doneTaskId) ?? null;
  const pendingRel = relActs.find((r) => r.id === pendingRelId) ?? null;
  const pendingFresh = pendingRel
    ? freshness(pendingRel.last_done, pendingRel.interval_days, today)
    : null;

  return (
    <Card>
      <View style={[styles.tabRow, { borderBottomColor: palette.border }]}>
        {tabBtn('tasks', '💕', 'Tasks', pend)}
        {tabBtn('relacts', '💝', 'Rel acts', sortedRel.length)}
      </View>

      {tab === 'tasks' ? (
        <View>
          <ProgressBar pct={pct} color={palette.paige} height={5} />
          <View style={{ marginTop: 6 }}>
            {!activePaige.length ? (
              <View style={{ alignItems: 'center', paddingVertical: 14 }}>
                <Text style={{ fontSize: 18, marginBottom: 4 }}>✓</Text>
                <Mono size={11}>all clear here</Mono>
              </View>
            ) : (
              activePaige.map(taskRow)
            )}
            {donePaige.length ? (
              <>
                <Mono
                  size={10}
                  style={{ ...styles.doneDivider, borderTopColor: palette.border }}
                >
                  done this week
                </Mono>
                {donePaige.map(taskRow)}
              </>
            ) : null}
          </View>
          <AddRow
            placeholder="Add a task..."
            onAdd={addTask}
            extras={
              <View style={styles.extrasRow}>
                <View style={{ flexDirection: 'row', gap: 4, flexWrap: 'wrap', flex: 1 }}>
                  {PRIORITIES.map((p) => {
                    const active = addPri === p;
                    return (
                      <Pressable
                        key={p || 'none'}
                        onPress={() => setAddPri(p)}
                        style={[
                          styles.priChip,
                          {
                            backgroundColor: active ? priColor(palette, p) : palette.card2,
                            borderColor: palette.border,
                          },
                        ]}
                      >
                        <Mono size={9} color={active ? '#fff' : palette.text2}>
                          {p || 'priority'}
                        </Mono>
                      </Pressable>
                    );
                  })}
                </View>
                <DateField value={addDue} onChange={setAddDue} placeholder="due date" allowClear />
              </View>
            }
          />
        </View>
      ) : (
        <View>
          {staleRel ? (
            <Mono size={10} color={palette.danger} style={{ paddingVertical: 4 }}>
              {staleRel} overdue
            </Mono>
          ) : null}
          {relShown.map(relRow)}
          {relHidden > 0 ? (
            <Pressable onPress={() => setRelExpanded(true)} style={styles.expandBtn}>
              <Mono size={11} color={palette.text2}>
                show {relHidden} more
              </Mono>
            </Pressable>
          ) : null}
          {relExpanded && sortedRel.length > 7 ? (
            <Pressable onPress={() => setRelExpanded(false)} style={styles.expandBtn}>
              <Mono size={11} color={palette.text2}>
                show less
              </Mono>
            </Pressable>
          ) : null}
          <Mono size={10} style={{ textAlign: 'center', marginTop: 6 }}>
            tap to mark done · ✏️ to edit
          </Mono>
          <AddRow
            placeholder="New rel act..."
            onAdd={addRelAct}
            extras={
              <View style={styles.intervalRow}>
                <Mono size={11} color={palette.text2}>
                  Every
                </Mono>
                <TextField
                  value={addInterval}
                  onChangeText={setAddInterval}
                  keyboardType="number-pad"
                  style={{ width: 60, textAlign: 'center' }}
                />
                <Mono size={11} color={palette.text2}>
                  days
                </Mono>
              </View>
            }
          />
        </View>
      )}

      {/* Legacy task-done-modal (paige tasks are always completed as 'me'). */}
      <BottomSheet visible={!!doneTask} onClose={() => setDoneTaskId(null)}>
        {doneTask ? (
          <>
            <SheetTitle
              title={`✓ ${doneTask.text}`}
              sub={
                doneTask.due_date
                  ? `due ${fmtDate(doneTask.due_date)} · finishing early earns PP ⚡`
                  : 'no due date'
              }
            />
            <View style={styles.intervalRow}>
              <Mono size={11}>completed on</Mono>
              <DateField value={doneDate} onChange={(d) => setDoneDate(d ?? today)} />
            </View>
            <Button
              title="✓ Log completion"
              onPress={confirmDone}
              loading={busy}
              style={{ marginTop: 14 }}
            />
          </>
        ) : null}
      </BottomSheet>

      {/* Legacy rel-modal — 💕 Just did this. */}
      <BottomSheet visible={!!pendingRel} onClose={() => setPendingRelId(null)}>
        {pendingRel && pendingFresh ? (
          <>
            <SheetTitle
              title={pendingRel.name}
              sub={`last: ${pendingFresh.label} · every ${pendingRel.interval_days}d · ${xpValue('relact_base')} XP`}
            />
            <Button
              title="💕 Just did this"
              variant="accent"
              accentColor={palette.paige}
              onPress={confirmRelAct}
              loading={busy}
            />
          </>
        ) : null}
      </BottomSheet>

      {/* Legacy rel-edit-modal. */}
      <BottomSheet visible={!!editingRelId} onClose={() => setEditingRelId(null)}>
        <SheetTitle title="Edit relationship act" />
        <View style={{ gap: 8 }}>
          <TextField placeholder="Act name" value={editName} onChangeText={setEditName} />
          <View style={styles.intervalRow}>
            <Mono size={11} color={palette.text2}>
              Every
            </Mono>
            <TextField
              value={editInterval}
              onChangeText={setEditInterval}
              keyboardType="number-pad"
              style={{ width: 60, textAlign: 'center' }}
            />
            <Mono size={11} color={palette.text2}>
              days
            </Mono>
          </View>
        </View>
        <Button
          title="Save"
          variant="accent"
          accentColor={palette.paige}
          onPress={saveRelEdit}
          loading={busy}
          style={{ marginTop: 12 }}
        />
      </BottomSheet>
    </Card>
  );
}

const styles = StyleSheet.create({
  tabRow: {
    flexDirection: 'row',
    borderBottomWidth: StyleSheet.hairlineWidth,
    marginBottom: 8,
  },
  tabBtn: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 2,
  },
  taskRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    paddingVertical: 7,
  },
  metaRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginTop: 2,
    alignItems: 'center',
  },
  doneDivider: {
    borderTopWidth: StyleSheet.hairlineWidth,
    paddingTop: 6,
    marginTop: 4,
  },
  extrasRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  priChip: {
    borderRadius: 6,
    borderWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: 8,
    paddingVertical: 5,
  },
  expandBtn: {
    alignItems: 'center',
    paddingVertical: 8,
  },
  relRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 8,
    paddingHorizontal: 4,
  },
  intervalRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
});
