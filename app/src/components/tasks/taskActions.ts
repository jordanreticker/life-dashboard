// Shared task mutations for the section panes (Work, Home, …) — the RN port of
// the legacy addTask / completeTask / toggleTask / dupeTask / deleteTask /
// openEditTask flows. Every mutation is a per-row write through db.ts,
// reflected in the data store, with XP handled by the xp.ts helpers
// (agent-rules §4/§6). Screens own the toasts; helpers return what happened.

import { useDataStore } from '@/stores/dataStore';
import { buildXpMap, calcProactivePoints, taskBaseXp } from '@/utils/compute';
import { addDays, fmtDate, localIso, noon, todayIso } from '@/utils/dates';
import * as db from '@/utils/supabase/db';
import type { Task } from '@/utils/supabase/db';
import type { TablesUpdate } from '@/utils/supabase/database.types';
import {
  awardTaskCompletion,
  awardXp,
  regradeTaskProactive,
  type CompletedBy,
  type TaskAward,
} from '@/utils/xp';

export type Priority = '' | 'urgent' | 'high' | 'medium' | 'low';
export type Recurrence = '' | 'daily' | 'weekly' | 'monthly';

export const PRIORITIES: Exclude<Priority, ''>[] = ['urgent', 'high', 'medium', 'low'];
export const RECURRENCES: Exclude<Recurrence, ''>[] = ['daily', 'weekly', 'monthly'];

const PRI_ORDER: Record<string, number> = { urgent: 0, high: 1, medium: 2, low: 3 };

/** Legacy sortP: urgent → high → medium → low → none (stable). */
export function sortByPriority(tasks: Task[]): Task[] {
  return [...tasks].sort(
    (a, b) => (PRI_ORDER[a.priority ?? ''] ?? 4) - (PRI_ORDER[b.priority ?? ''] ?? 4),
  );
}

/** Legacy advanceDate() for recurring tasks. */
export function advanceDate(iso: string, rec: string): string {
  const d = noon(iso);
  if (rec === 'daily') d.setDate(d.getDate() + 1);
  else if (rec === 'weekly') d.setDate(d.getDate() + 7);
  else if (rec === 'monthly') d.setMonth(d.getMonth() + 1);
  return localIso(d);
}

const state = () => useDataStore.getState();
const xpMap = () => buildXpMap(state().xpValues);

// ── Add ───────────────────────────────────────────────────────────────────────

/** Legacy addTask(): xp_value is locked in from the priority at creation. */
export async function addTask(input: {
  section: string;
  text: string;
  priority?: Priority;
  dueDate?: string;
  tags?: string[];
  recurrence?: Recurrence;
  notes?: string;
  personId?: string | null;
}): Promise<Task | null> {
  const text = input.text.trim();
  if (!text) return null;
  const { data, error } = await db.tasks.insert({
    section: input.section,
    text,
    priority: input.priority || null,
    due_date: input.dueDate || null,
    person_id: input.personId || null,
    tags: input.tags ?? [],
    recurrence: input.recurrence || null,
    notes: input.notes ?? '',
    created_date: todayIso(),
    xp_value: taskBaseXp({ priority: input.priority || null, xp_value: 0 }, xpMap()),
  });
  if (error) console.warn('[tasks] add failed:', error.message);
  if (data) state().upsertRow('tasks', data);
  await awardXp(0, { markActive: true }); // legacy addTask calls markActive()
  return data;
}

// ── Complete / un-complete ────────────────────────────────────────────────────

export interface CompleteResult {
  award: TaskAward;
  nextDate: string | null; // due date of the recurrence clone, if one spawned
}

/**
 * Legacy completeTask(): mark done (who: 'me' | 'joint' | 'paige' for home
 * tasks), grade the proactive bonus, award XP, spawn the recurrence clone.
 */
export async function completeTask(
  task: Task,
  doneDate: string,
  who: CompletedBy = 'me',
): Promise<CompleteResult> {
  const pp = who === 'me' ? calcProactivePoints(task.due_date, doneDate, xpMap()) : 0;
  const patch: TablesUpdate<'tasks'> = {
    done: true,
    completed_date: doneDate,
    proactive_points: pp,
    completed_by: who,
  };
  const updated = { ...task, ...patch } as Task;
  state().upsertRow('tasks', updated); // reflect before badge checks run
  const { data, error } = await db.tasks.update(task.id, patch);
  if (error) console.warn('[tasks] complete failed:', error.message);
  if (data) state().upsertRow('tasks', data);
  const award = await awardTaskCompletion(updated, doneDate, who);

  // Auto-regenerate recurring tasks (legacy: next due from due date, else done date).
  let nextDate: string | null = null;
  if (task.recurrence) {
    nextDate = advanceDate(task.due_date || doneDate, task.recurrence);
    const { data: clone, error: cloneErr } = await db.tasks.insert({
      section: task.section,
      text: task.text,
      priority: task.priority,
      due_date: nextDate,
      person_id: task.person_id,
      tags: task.tags,
      scheduled_for: task.scheduled_for,
      created_date: todayIso(),
      xp_value: task.xp_value,
      recurrence: task.recurrence,
      notes: task.notes,
    });
    if (cloneErr) console.warn('[tasks] recur clone failed:', cloneErr.message);
    if (clone) state().upsertRow('tasks', clone);
  }
  return { award, nextDate };
}

/** Legacy completion toast text (screens append the recurrence part). */
export function completionToast(task: Task, award: TaskAward, who: CompletedBy): string {
  if (who === 'paige') return `🤝 ${task.text} — Paige did it`;
  if (who === 'joint') return `🤝 +${award.earnedXp}XP (joint)`;
  return `✓ +${award.baseXp}XP${award.pp > 0 ? ` +${award.pp}PP ⚡` : ''}`;
}

/** Legacy toggleTask() on a done task: instant, XP is never revoked. */
export async function uncompleteTask(task: Task): Promise<void> {
  const patch: TablesUpdate<'tasks'> = {
    done: false,
    completed_date: null,
    proactive_points: 0,
    completed_by: 'me',
  };
  state().upsertRow('tasks', { ...task, ...patch } as Task);
  const { data, error } = await db.tasks.update(task.id, patch);
  if (error) console.warn('[tasks] uncomplete failed:', error.message);
  if (data) state().upsertRow('tasks', data);
}

// ── Dupe / delete ─────────────────────────────────────────────────────────────

/** Legacy dupeTask() ("+7"): clone scheduled a week out, due date cleared. */
export async function dupeTask(task: Task): Promise<{ label: string; task: Task | null }> {
  const label = fmtDate(addDays(todayIso(), 7));
  const { data, error } = await db.tasks.insert({
    section: task.section,
    text: task.text,
    priority: task.priority,
    due_date: null,
    person_id: task.person_id,
    tags: task.tags,
    scheduled_for: label,
    created_date: task.created_date,
    xp_value: task.xp_value,
    recurrence: task.recurrence,
    notes: task.notes,
  });
  if (error) console.warn('[tasks] dupe failed:', error.message);
  if (data) state().upsertRow('tasks', data);
  return { label, task: data };
}

/** Legacy deleteTask(): immediate, no confirm, no XP change. */
export async function deleteTask(id: string): Promise<void> {
  state().removeRow('tasks', id);
  const { error } = await db.tasks.remove(id);
  if (error) console.warn('[tasks] delete failed:', error.message);
}

// ── Edit ──────────────────────────────────────────────────────────────────────

export interface TaskEditPatch {
  text: string;
  priority: Priority;
  dueDate: string; // '' = none
  recurrence: Recurrence;
  notes: string;
  completedDate?: string; // done tasks only; '' keeps the existing date
}

/**
 * Legacy edit-modal confirm: empty text keeps the old text; xp_value is NOT
 * re-derived from a changed priority (legacy quirk, kept). For completed tasks
 * a due/completed date change re-grades the proactive bonus and applies the
 * XP/PP delta (regradeTaskProactive).
 */
export async function saveTaskEdit(
  task: Task,
  edit: TaskEditPatch,
): Promise<{ ppDelta: number }> {
  const patch: TablesUpdate<'tasks'> = {
    text: edit.text.trim() || task.text,
    priority: edit.priority || null,
    due_date: edit.dueDate || null,
    recurrence: edit.recurrence || null,
    notes: edit.notes,
  };
  let oldPp = 0;
  let newPp = 0;
  if (task.done) {
    const completed = edit.completedDate || task.completed_date;
    patch.completed_date = completed;
    oldPp = Number(task.proactive_points) || 0;
    newPp = calcProactivePoints(patch.due_date, completed, xpMap());
    if (newPp !== oldPp) patch.proactive_points = newPp;
  }
  state().upsertRow('tasks', { ...task, ...patch } as Task);
  const { data, error } = await db.tasks.update(task.id, patch);
  if (error) console.warn('[tasks] edit failed:', error.message);
  if (data) state().upsertRow('tasks', data);
  if (task.done && newPp !== oldPp) await regradeTaskProactive(oldPp, newPp);
  return { ppDelta: task.done ? newPp - oldPp : 0 };
}
