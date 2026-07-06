// Task edit sheet — the legacy edit-modal (openEditTask): text, priority, due
// date, recurrence, notes; completed tasks additionally expose their completion
// date, and changing either date re-grades the proactive bonus (the XP/PP
// delta is applied by taskActions.saveTaskEdit → regradeTaskProactive).

import { useEffect, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { BottomSheet, Button, TextField } from '@/components/ui';
import { Mono } from '@/components/summary/shared';
import { useTheme } from '@/hooks/use-theme';
import { fonts } from '@/theme';
import { todayIso } from '@/utils/dates';
import type { Task } from '@/utils/supabase/db';

import { DateField, PriorityPicker, RecurrencePicker } from './fields';
import type { Priority, Recurrence, TaskEditPatch } from './taskActions';

export function TaskEditSheet({
  task,
  accentColor,
  onClose,
  onSave,
}: {
  task: Task | null;
  accentColor?: string;
  onClose: () => void;
  onSave: (task: Task, edit: TaskEditPatch) => void;
}) {
  const { palette } = useTheme();
  const [text, setText] = useState('');
  const [priority, setPriority] = useState<Priority>('');
  const [dueDate, setDueDate] = useState('');
  const [recurrence, setRecurrence] = useState<Recurrence>('');
  const [notes, setNotes] = useState('');
  const [completedDate, setCompletedDate] = useState('');

  // Seed fields whenever the sheet opens (legacy openEditTask).
  useEffect(() => {
    if (!task) return;
    setText(task.text);
    setPriority((task.priority ?? '') as Priority);
    setDueDate(task.due_date ?? '');
    setRecurrence((task.recurrence ?? '') as Recurrence);
    setNotes(task.notes ?? '');
    setCompletedDate(task.done ? (task.completed_date ?? '') : '');
  }, [task]);

  return (
    <BottomSheet visible={!!task} onClose={onClose}>
      <Text style={[styles.title, { color: palette.text1 }]}>✏️ Edit task</Text>

      <View style={{ gap: 10 }}>
        <TextField value={text} onChangeText={setText} placeholder="Task text" multiline />
        <View>
          <Mono size={10} style={styles.fieldLabel}>
            PRIORITY
          </Mono>
          <PriorityPicker value={priority} onChange={setPriority} />
        </View>
        <View>
          <Mono size={10} style={styles.fieldLabel}>
            DUE DATE
          </Mono>
          <DateField value={dueDate} onChange={setDueDate} accentColor={accentColor} />
        </View>
        <View>
          <Mono size={10} style={styles.fieldLabel}>
            REPEATS
          </Mono>
          <RecurrencePicker value={recurrence} onChange={setRecurrence} accentColor={accentColor} />
        </View>
        <TextField value={notes} onChangeText={setNotes} placeholder="Notes" multiline />

        {task?.done ? (
          <View>
            <Mono size={10} style={styles.fieldLabel}>
              COMPLETED ON
            </Mono>
            <DateField
              value={completedDate}
              onChange={(d) => setCompletedDate(d || task.completed_date || todayIso())}
              accentColor={accentColor}
            />
            <Mono size={9} style={{ marginTop: 4 }}>
              changing dates re-grades the proactive bonus ⚡
            </Mono>
          </View>
        ) : null}
      </View>

      <Button
        title="Save"
        variant="accent"
        accentColor={accentColor}
        onPress={() => {
          if (!task) return;
          onSave(task, {
            text,
            priority,
            dueDate,
            recurrence,
            notes,
            completedDate: task.done ? completedDate : undefined,
          });
        }}
        style={{ marginTop: 14 }}
      />
    </BottomSheet>
  );
}

const styles = StyleSheet.create({
  title: { fontFamily: fonts.sansMedium, fontSize: 16, marginBottom: 12 },
  fieldLabel: { letterSpacing: 1, marginBottom: 6 },
});
