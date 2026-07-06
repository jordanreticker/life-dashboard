// 📓 Today's journal entry (legacy rLife journal form + submitJournal): mood
// row (8 presets + custom emoji), mood-specific reflection prompts, optional
// title, the entry textarea with live word count, the journal-streak line, and
// Save → insert + flat journal_entry XP (no streak mark — legacy submitJournal
// never called markActive).

import { useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { MOOD_BUTTONS, MOOD_PROMPTS, SecHeader } from '@/components/life/shared';
import { Mono } from '@/components/summary/shared';
import { Button, Card, TextField } from '@/components/ui';
import { useTheme } from '@/hooks/use-theme';
import { useDataStore } from '@/stores/dataStore';
import { fonts, radius } from '@/theme';
import { addDays, todayIso } from '@/utils/dates';
import * as db from '@/utils/supabase/db';
import { awardJournalEntry } from '@/utils/xp';

export function JournalCard({ onToast }: { onToast: (msg: string) => void }) {
  const { palette } = useTheme();
  const { journalEntries, upsertRow } = useDataStore();

  const [mood, setMood] = useState('');
  const [title, setTitle] = useState('');
  const [text, setText] = useState('');
  const [customOpen, setCustomOpen] = useState(false);
  const [customMood, setCustomMood] = useState('');
  const [saving, setSaving] = useState(false);

  const today = todayIso();
  const isCustomMood = !!mood && !MOOD_BUTTONS.includes(mood as (typeof MOOD_BUTTONS)[number]);
  const prompts = mood ? (MOOD_PROMPTS[mood] ?? []) : [];
  const wordCount = text.trim().split(/\s+/).filter(Boolean).length;

  // Legacy journal streak: consecutive days with an entry, ending today.
  const streak = useMemo(() => {
    const dates = journalEntries
      .map((j) => j.date)
      .filter(Boolean)
      .sort()
      .reverse();
    let n = 0;
    let check = today;
    for (const d of dates) {
      if (d === check) {
        n++;
        check = addDays(check, -1);
      } else if (d < check) break;
    }
    return n;
  }, [journalEntries, today]);

  const setCustom = () => {
    const e = customMood.trim();
    if (e) setMood(e);
    setCustomOpen(false);
    setCustomMood('');
  };

  const save = async () => {
    const txt = text.trim();
    if (!txt || saving) return;
    setSaving(true);
    const { data, error } = await db.journalEntries.insert({
      date: today,
      text: txt,
      mood,
      title: title.trim(),
    });
    setSaving(false);
    if (error || !data) {
      onToast('Save failed');
      return;
    }
    upsertRow('journalEntries', data);
    setText('');
    setTitle('');
    setMood('');
    const { xp } = await awardJournalEntry();
    onToast(`Saved +${xp} XP`);
  };

  return (
    <Card>
      <SecHeader emoji="✏️" name="Today's entry" />

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
            onSubmitEditing={setCustom}
            returnKeyType="done"
            style={{ flex: 1 }}
          />
          <Button title="Set" onPress={setCustom} variant="ghost" />
        </View>
      ) : null}

      {prompts.length ? (
        <View style={[styles.prompts, { backgroundColor: palette.card2 }]}>
          {prompts.map((p) => (
            <Text key={p} style={[styles.promptText, { color: palette.text2 }]}>
              • {p}
            </Text>
          ))}
        </View>
      ) : null}

      <TextField
        placeholder="Title (optional)"
        value={title}
        onChangeText={setTitle}
        style={{ marginBottom: 6, fontFamily: fonts.sansMedium }}
      />
      <TextField
        placeholder={mood ? 'Write your thoughts...' : 'Pick a mood, then write...'}
        value={text}
        onChangeText={setText}
        multiline
        style={{ minHeight: 72, textAlignVertical: 'top' }}
      />

      <View style={styles.metaRow}>
        <Mono size={10} color={palette.text3}>
          {wordCount} words
        </Mono>
        {streak > 1 ? (
          <Mono size={10} color={palette.journal}>
            📓 {streak}-day journal streak
          </Mono>
        ) : null}
      </View>

      <Button
        title={saving ? 'Saving...' : 'Save entry'}
        onPress={save}
        disabled={saving}
        style={{ marginTop: 6 }}
      />
    </Card>
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
    borderRadius: radius.sm,
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
  prompts: {
    borderRadius: radius.sm,
    paddingHorizontal: 11,
    paddingVertical: 9,
    marginBottom: 8,
    gap: 4,
  },
  promptText: {
    fontFamily: fonts.sans,
    fontSize: 12,
    lineHeight: 19,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 6,
  },
});
