// Inline add-task bar — the legacy .add-wrap at the bottom of a section pane:
// a main row (text + Add) and an extras row (#tag input, priority, due date).
// Generic over section: the parent passes the insert handler.

import { useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { Button, TextField } from '@/components/ui';

import { DateField, PriorityPicker } from './fields';
import type { Priority } from './taskActions';

export function AddTaskBar({
  accentColor,
  placeholder = 'Add a task...',
  onAdd,
}: {
  accentColor?: string;
  placeholder?: string;
  onAdd: (input: { text: string; tags: string[]; priority: Priority; dueDate: string }) => void;
}) {
  const [text, setText] = useState('');
  const [tag, setTag] = useState('');
  const [priority, setPriority] = useState<Priority>('');
  const [dueDate, setDueDate] = useState('');

  const add = () => {
    if (!text.trim()) return;
    // Legacy tag parsing: split on spaces/commas, strip leading '#'.
    const tags = tag
      .split(/[\s,]+/)
      .map((t) => t.replace(/^#/, ''))
      .filter(Boolean);
    onAdd({ text, tags, priority, dueDate });
    setText('');
    setTag('');
    setPriority('');
    setDueDate('');
  };

  return (
    <View style={styles.wrap}>
      <View style={styles.mainRow}>
        <TextField
          value={text}
          onChangeText={setText}
          placeholder={placeholder}
          onSubmitEditing={add}
          returnKeyType="done"
          style={{ flex: 1 }}
        />
        <Button title="Add" variant="accent" accentColor={accentColor} onPress={add} />
      </View>
      <View style={styles.extrasRow}>
        <TextField value={tag} onChangeText={setTag} placeholder="#tag" style={styles.tagField} />
        <DateField
          value={dueDate}
          onChange={setDueDate}
          accentColor={accentColor}
          style={{ flex: 1 }}
        />
      </View>
      <PriorityPicker value={priority} onChange={setPriority} />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: 8, marginTop: 10 },
  mainRow: { flexDirection: 'row', gap: 8, alignItems: 'center' },
  extrasRow: { flexDirection: 'row', gap: 8, alignItems: 'center' },
  tagField: { width: 90 },
});
