// Completion confirm sheet — the legacy task-done-modal (openTaskDoneModal):
// completing a task goes through a confirm with an editable done date
// (defaults to today; backdating skips PP / streak per the xp.ts rules), and —
// for home-section tasks only — a "who did it" row (Me / Both / Paige).

import { useEffect, useState } from 'react';
import { StyleSheet, Text } from 'react-native';

import { BottomSheet, Button, Segmented } from '@/components/ui';
import { Mono } from '@/components/summary/shared';
import { useTheme } from '@/hooks/use-theme';
import { fonts } from '@/theme';
import { fmtDate, todayIso } from '@/utils/dates';
import type { Task } from '@/utils/supabase/db';
import type { CompletedBy } from '@/utils/xp';

import { DateField } from './fields';

export function TaskCompleteSheet({
  task,
  accentColor,
  onClose,
  onConfirm,
}: {
  task: Task | null;
  accentColor?: string;
  onClose: () => void;
  onConfirm: (task: Task, doneDate: string, who: CompletedBy) => void;
}) {
  const { palette } = useTheme();
  const [date, setDate] = useState(todayIso());
  const [who, setWho] = useState<CompletedBy>('me');

  // Re-seed whenever the sheet opens for a task (legacy openTaskDoneModal).
  useEffect(() => {
    if (!task) return;
    setDate(todayIso());
    setWho('me');
  }, [task]);

  const isHome = task?.section === 'home';

  return (
    <BottomSheet visible={!!task} onClose={onClose}>
      <Text style={[styles.title, { color: palette.text1 }]}>✓ {task?.text ?? ''}</Text>
      <Mono size={11} style={{ marginBottom: 12 }}>
        {task?.due_date
          ? `due ${fmtDate(task.due_date)} · finishing early earns PP ⚡`
          : 'no due date'}
      </Mono>

      <Mono size={10} style={styles.fieldLabel}>
        COMPLETED ON
      </Mono>
      <DateField value={date} onChange={(d) => setDate(d || todayIso())} accentColor={accentColor} />

      {isHome ? (
        <>
          <Mono size={10} style={{ ...styles.fieldLabel, marginTop: 12 }}>
            🏠 WHO DID IT?
          </Mono>
          <Segmented<CompletedBy>
            options={[
              { value: 'me', label: 'Me' },
              { value: 'joint', label: '🤝 Both' },
              { value: 'paige', label: 'Paige' },
            ]}
            value={who}
            onChange={setWho}
            accentColor={accentColor}
          />
        </>
      ) : null}

      <Button
        title="Mark done"
        variant="accent"
        accentColor={accentColor}
        onPress={() => {
          if (task) onConfirm(task, date || todayIso(), isHome ? who : 'me');
        }}
        style={{ marginTop: 14 }}
      />
    </BottomSheet>
  );
}

const styles = StyleSheet.create({
  title: { fontFamily: fonts.sansMedium, fontSize: 16, marginBottom: 3 },
  fieldLabel: { letterSpacing: 1, marginBottom: 6 },
});
