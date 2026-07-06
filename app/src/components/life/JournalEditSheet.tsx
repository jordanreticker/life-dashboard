// Edit-journal-entry sheet (legacy #journal-edit-modal): mood row (8 presets +
// custom), title and text. Save updates the row; no XP is involved.

import { useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { MOOD_BUTTONS, SheetTitle } from '@/components/life/shared';
import { Mono } from '@/components/summary/shared';
import { BottomSheet, Button, TextField } from '@/components/ui';
import { useTheme } from '@/hooks/use-theme';
import { useDataStore } from '@/stores/dataStore';
import { fmtDate } from '@/utils/dates';
import * as db from '@/utils/supabase/db';
import type { JournalEntry } from '@/utils/supabase/db';

export function JournalEditSheet({
  entry,
  onClose,
  onToast,
}: {
  entry: JournalEntry | null; // null = hidden
  onClose: () => void;
  onToast: (msg: string) => void;
}) {
  const { palette } = useTheme();
  const upsertRow = useDataStore((s) => s.upsertRow);

  const [mood, setMood] = useState('');
  const [title, setTitle] = useState('');
  const [text, setText] = useState('');
  const [customOpen, setCustomOpen] = useState(false);
  const [customMood, setCustomMood] = useState('');

  useEffect(() => {
    if (entry) {
      setMood(entry.mood || '');
      setTitle(entry.title || '');
      setText(entry.text || '');
      setCustomOpen(false);
      setCustomMood('');
    }
  }, [entry]);

  const isCustomMood = !!mood && !MOOD_BUTTONS.includes(mood as (typeof MOOD_BUTTONS)[number]);

  const save = async () => {
    if (!entry) return;
    // Legacy saveJournalEdit keeps the old mood if none is picked.
    const { data, error } = await db.journalEntries.update(entry.id, {
      title: title.trim(),
      text: text.trim(),
      mood: mood || entry.mood,
    });
    if (error || !data) {
      onToast('Save failed');
      return;
    }
    upsertRow('journalEntries', data);
    onClose();
    onToast('Updated');
  };

  return (
    <BottomSheet visible={!!entry} onClose={onClose}>
      <SheetTitle title="Edit entry" sub={entry ? fmtDate(entry.date) : ''} />

      <View style={styles.moodRow}>
        {MOOD_BUTTONS.map((m) => (
          <Pressable
            key={m}
            onPress={() => setMood(m)}
            style={[
              styles.moodBtn,
              { backgroundColor: palette.card2, borderColor: palette.border2 },
              mood === m && { backgroundColor: palette.text1, borderColor: palette.text1 },
            ]}
          >
            <Text style={{ fontSize: 18, lineHeight: 22 }}>{m}</Text>
          </Pressable>
        ))}
        <Pressable
          onPress={() => setCustomOpen((o) => !o)}
          style={[
            styles.moodBtn,
            styles.customBtn,
            { backgroundColor: palette.card2, borderColor: palette.border2 },
            isCustomMood && { borderColor: palette.text1 },
          ]}
        >
          <Mono size={11} color={palette.text2}>
            + custom{isCustomMood ? ': ' + mood : ''}
          </Mono>
        </Pressable>
      </View>

      {customOpen ? (
        <View style={styles.customRow}>
          <TextField
            placeholder="Type or paste an emoji"
            value={customMood}
            onChangeText={setCustomMood}
            returnKeyType="done"
            onSubmitEditing={() => {
              if (customMood.trim()) setMood(customMood.trim());
              setCustomOpen(false);
              setCustomMood('');
            }}
            style={{ flex: 1 }}
          />
          <Button
            title="Set"
            variant="ghost"
            onPress={() => {
              if (customMood.trim()) setMood(customMood.trim());
              setCustomOpen(false);
              setCustomMood('');
            }}
          />
        </View>
      ) : null}

      <TextField
        placeholder="Title (optional)"
        value={title}
        onChangeText={setTitle}
        style={{ marginBottom: 8 }}
      />
      <TextField
        placeholder="Entry"
        value={text}
        onChangeText={setText}
        multiline
        style={{ minHeight: 100, textAlignVertical: 'top', marginBottom: 12 }}
      />

      <Button title="Save" onPress={save} />
      <Button title="Cancel" onPress={onClose} variant="ghost" style={{ marginTop: 8 }} />
    </BottomSheet>
  );
}

const styles = StyleSheet.create({
  moodRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: 6,
    marginBottom: 8,
  },
  moodBtn: {
    borderRadius: 6,
    borderWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: 8,
    paddingVertical: 5,
  },
  customBtn: {
    paddingHorizontal: 10,
    paddingVertical: 9,
  },
  customRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 8,
  },
});
