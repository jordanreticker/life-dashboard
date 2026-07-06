// Home-task completion sheet — the legacy #task-done-modal for section='home':
// completion date (backdatable) plus the who-did-it toggle (home tasks follow
// the chore rules: Paige solo earns you nothing, Both earns half, no PP unless
// solo). Recurring tasks auto-regenerate on completion, like legacy.

import { useEffect, useState } from 'react';
import { View } from 'react-native';

import { Mono } from '@/components/summary/shared';
import { BottomSheet, Button, Segmented } from '@/components/ui';
import { useTheme } from '@/hooks/use-theme';
import { useDataStore } from '@/stores/dataStore';
import { usePaigeModeStore } from '@/stores/paigeModeStore';
import { buildXpMap, calcProactivePoints } from '@/utils/compute';
import { fmtDate, noon, localIso, todayIso } from '@/utils/dates';
import * as db from '@/utils/supabase/db';
import type { Task } from '@/utils/supabase/db';
import { awardTaskCompletion, type CompletedBy } from '@/utils/xp';

import { DateField } from './DateField';
import { SheetTitle } from './shared';

/** Legacy advanceDate for recurring tasks. */
function advanceDate(iso: string, rec: string): string {
  const d = noon(iso);
  if (rec === 'daily') d.setDate(d.getDate() + 1);
  else if (rec === 'weekly') d.setDate(d.getDate() + 7);
  else if (rec === 'monthly') d.setMonth(d.getMonth() + 1);
  return localIso(d);
}

export function TaskDoneSheet({ task, onClose }: { task: Task | null; onClose: () => void }) {
  const { palette } = useTheme();
  const paigeMode = usePaigeModeStore((s) => s.active);
  const upsertRow = useDataStore((s) => s.upsertRow);

  const [who, setWho] = useState<CompletedBy>('me');
  const [date, setDate] = useState(todayIso());
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!task) return;
    setWho(paigeMode ? 'paige' : 'me');
    setDate(todayIso());
    setSaving(false);
  }, [task?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  if (!task) return <BottomSheet visible={false} onClose={onClose}>{null}</BottomSheet>;

  const confirm = async () => {
    if (saving || task.done) return;
    setSaving(true);
    // Same PP math awardTaskCompletion applies — stored on the row like legacy.
    const xpMap = buildXpMap(useDataStore.getState().xpValues);
    const pp = who === 'me' ? calcProactivePoints(task.due_date, date, xpMap) : 0;

    const { data, error } = await db.tasks.update(task.id, {
      done: true,
      completed_date: date,
      completed_by: who,
      proactive_points: pp,
    });
    if (error || !data) {
      setSaving(false);
      return;
    }
    upsertRow('tasks', data);
    await awardTaskCompletion(task, date, who);

    // Auto-regenerate recurring tasks (legacy completeTask tail).
    if (task.recurrence) {
      const next = advanceDate(task.due_date || date, task.recurrence);
      const clone = await db.tasks.insert({
        section: task.section,
        text: task.text,
        done: false,
        priority: task.priority,
        due_date: next,
        tags: task.tags,
        created_date: todayIso(),
        xp_value: task.xp_value,
        recurrence: task.recurrence,
        notes: task.notes,
        completed_by: 'me',
      });
      if (clone.data) upsertRow('tasks', clone.data);
    }

    setSaving(false);
    onClose();
  };

  return (
    <BottomSheet visible={!!task} onClose={onClose}>
      <SheetTitle>{`✓ ${task.text}`}</SheetTitle>
      <Mono size={11} style={{ marginBottom: 12 }}>
        {task.due_date
          ? `due ${fmtDate(task.due_date)} · finishing early earns PP ⚡`
          : 'no due date'}
      </Mono>
      <Segmented
        options={[
          { value: 'me', label: 'I did it' },
          { value: 'joint', label: 'Both' },
          { value: 'paige', label: 'Paige did it' },
        ]}
        value={who}
        onChange={setWho}
        accentColor={who === 'paige' ? palette.paige : palette.chores}
      />
      <View style={{ marginTop: 12, marginBottom: 14 }}>
        <DateField label="completed on" value={date} onChange={setDate} />
      </View>
      <Button
        title="✓ Mark done"
        onPress={confirm}
        loading={saving}
        variant="accent"
        accentColor={palette.chores}
      />
      <Button title="Cancel" onPress={onClose} variant="ghost" style={{ marginTop: 8 }} />
    </BottomSheet>
  );
}
