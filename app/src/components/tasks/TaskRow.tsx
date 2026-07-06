// A single task row — the port of the legacy taskCard (compact, used inside
// the week view) and trow (full meta, used for done-this-week and other
// lists): checkbox, text, priority/tag/date/recurrence/PP/notes meta, and the
// ✏️ / +7 / ✕ action buttons. Generic over section.

import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { useTheme } from '@/hooks/use-theme';
import { fonts, radius } from '@/theme';
import { fmtDateSmart, isOverdue } from '@/utils/dates';
import type { Task } from '@/utils/supabase/db';

import { priorityColors } from './fields';

function Pill({ text, fg, bg }: { text: string; fg: string; bg: string }) {
  return (
    <View style={[styles.pill, { backgroundColor: bg }]}>
      <Text style={[styles.pillText, { color: fg }]}>{text}</Text>
    </View>
  );
}

export function TaskRow({
  task,
  variant = 'full',
  onToggle,
  onEdit,
  onDupe,
  onDelete,
  onPressRow,
}: {
  task: Task;
  /** 'compact': priority + tags only (legacy week-view taskCard). 'full': all meta (legacy trow). */
  variant?: 'compact' | 'full';
  onToggle: (t: Task) => void;
  onEdit?: (t: Task) => void;
  onDupe?: (t: Task) => void;
  onDelete?: (t: Task) => void;
  /** Legacy trow: tapping a done row (outside the checkbox) opens the editor. */
  onPressRow?: (t: Task) => void;
}) {
  const { palette } = useTheme();
  const [noteOpen, setNoteOpen] = useState(false);

  const over = !task.done && isOverdue(task.due_date);
  const tags = task.tags ?? [];
  const pri = task.priority ?? '';
  const priC = priorityColors(palette)[pri];
  const full = variant === 'full';
  const hasMeta = full
    ? !!(pri || task.due_date || tags.length || task.scheduled_for || Number(task.proactive_points) > 0 || task.recurrence || task.notes)
    : !!(pri || tags.length);

  const body = (
    <>
      {/* Checkbox */}
      <Pressable
        onPress={() => onToggle(task)}
        hitSlop={8}
        style={[
          styles.chk,
          { borderColor: over ? palette.danger : palette.border2 },
          task.done && { backgroundColor: palette.text1, borderColor: palette.text1 },
        ]}
      >
        {task.done ? <Text style={[styles.chkMark, { color: palette.bg }]}>✓</Text> : null}
      </Pressable>

      {/* Body */}
      <View style={{ flex: 1 }}>
        <Text
          style={[
            styles.text,
            { color: palette.text1 },
            over && { color: palette.danger, fontFamily: fonts.sansMedium },
            task.done && { color: palette.text3, textDecorationLine: 'line-through' },
          ]}
        >
          {task.text}
        </Text>
        {hasMeta ? (
          <View style={styles.meta}>
            {pri && priC ? <Pill text={pri} fg={priC.fg} bg={priC.bg} /> : null}
            {full && task.due_date ? (
              <Text
                style={[styles.metaText, { color: over ? palette.danger : palette.text3 }]}
              >
                {over ? 'overdue · ' : ''}
                {fmtDateSmart(task.due_date)}
              </Text>
            ) : null}
            {full && task.recurrence ? (
              <Pill text={`🔁 ${task.recurrence}`} fg={palette.text2} bg={palette.card2} />
            ) : null}
            {tags.map((g) => (
              <Pill key={g} text={`#${g}`} fg={palette.community} bg={palette.communityBg} />
            ))}
            {full && task.scheduled_for ? (
              <Text style={[styles.metaText, { color: palette.text3 }]}>
                → {task.scheduled_for}
              </Text>
            ) : null}
            {full && Number(task.proactive_points) > 0 ? (
              <Text style={[styles.metaText, { color: palette.pp }]}>
                +{Number(task.proactive_points)}PP ⚡
              </Text>
            ) : null}
            {full && task.notes ? (
              <Pressable onPress={() => setNoteOpen((o) => !o)} hitSlop={6}>
                <Text style={[styles.metaText, { color: palette.text2 }]}>📝 note</Text>
              </Pressable>
            ) : null}
          </View>
        ) : null}
        {full && task.notes && noteOpen ? (
          <Text style={[styles.note, { color: palette.text2, backgroundColor: palette.card2 }]}>
            {task.notes}
          </Text>
        ) : null}
      </View>

      {/* Actions */}
      {onEdit || onDupe || onDelete ? (
        <View style={styles.acts}>
          {onEdit ? (
            <Pressable onPress={() => onEdit(task)} hitSlop={6} style={styles.actBtn}>
              <Text style={styles.actText}>✏️</Text>
            </Pressable>
          ) : null}
          {onDupe ? (
            <Pressable onPress={() => onDupe(task)} hitSlop={6} style={styles.actBtn}>
              <Text style={[styles.actText, { color: palette.text2, fontFamily: fonts.mono }]}>
                +7
              </Text>
            </Pressable>
          ) : null}
          {onDelete ? (
            <Pressable onPress={() => onDelete(task)} hitSlop={6} style={styles.actBtn}>
              <Text style={[styles.actText, { color: palette.danger }]}>✕</Text>
            </Pressable>
          ) : null}
        </View>
      ) : null}
    </>
  );

  const rowStyle = [styles.row, over && { backgroundColor: palette.dangerBg }];
  return onPressRow ? (
    <Pressable onPress={() => onPressRow(task)} style={rowStyle}>
      {body}
    </Pressable>
  ) : (
    <View style={rowStyle}>{body}</View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    paddingVertical: 5,
    paddingHorizontal: 4,
    borderRadius: radius.sm,
    marginBottom: 3,
  },
  chk: {
    width: 18,
    height: 18,
    borderRadius: 9,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 1,
  },
  chkMark: { fontSize: 11, lineHeight: 13, fontFamily: fonts.sansBold },
  text: { fontFamily: fonts.sans, fontSize: 13, lineHeight: 18 },
  meta: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: 5,
    marginTop: 3,
  },
  metaText: { fontFamily: fonts.mono, fontSize: 10 },
  pill: {
    paddingHorizontal: 5,
    paddingVertical: 1,
    borderRadius: 4,
  },
  pillText: { fontFamily: fonts.mono, fontSize: 10 },
  note: {
    fontFamily: fonts.sans,
    fontSize: 12,
    lineHeight: 17,
    marginTop: 4,
    padding: 8,
    borderRadius: radius.sm,
  },
  acts: { flexDirection: 'row', gap: 2, marginLeft: 2 },
  actBtn: { paddingHorizontal: 5, paddingVertical: 2 },
  actText: { fontSize: 12 },
});
