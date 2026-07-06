// Paigecyclopedia — legacy rPaige's 📖 collapsible notes card: category filter
// chips, checkable rows for actionable categories (date/gift ideas — checking
// one awards encyc_complete XP and can store a "how it went" note), add with
// optional category, delete. The completion-note prompt is a small sheet
// (legacy used window.prompt).

import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { Mono } from '@/components/summary/shared';
import { BottomSheet, Button, Card, TextField } from '@/components/ui';
import { useTheme } from '@/hooks/use-theme';
import { useDataStore } from '@/stores/dataStore';
import { fonts } from '@/theme';
import * as db from '@/utils/supabase/db';
import type { EncycNote } from '@/utils/supabase/db';
import { awardXp, xpValue } from '@/utils/xp';

import { AddRow, Chip, SecHeader, SheetTitle } from './shared';

// Legacy isActionable(cat).
const isActionable = (cat: string | null): boolean =>
  ['dateideas', 'giftideas', 'gift ideas', 'date ideas', 'dateidea', 'giftidea'].includes(
    (cat || '').toLowerCase().replace(/\s+/g, ''),
  );

export function EncycCard() {
  const { palette } = useTheme();
  const { encycNotes, upsertRow, removeRow } = useDataStore();

  const [open, setOpen] = useState(false);
  const [filter, setFilter] = useState('');
  const [cat, setCat] = useState('');
  // Completion-note sheet for actionable notes being checked off.
  const [completingId, setCompletingId] = useState<string | null>(null);
  const [completedNote, setCompletedNote] = useState('');
  const [saving, setSaving] = useState(false);

  const allCats = [...new Set(encycNotes.map((n) => n.cat).filter(Boolean))].sort();
  const filtered = filter
    ? encycNotes.filter((n) => (n.cat || '').toLowerCase() === filter.toLowerCase())
    : encycNotes;

  const add = async (text: string) => {
    const order = encycNotes.reduce((m, x) => Math.max(m, Number(x.sort_order) || 0), 0) + 1;
    const { data } = await db.encycNotes.insert({
      text,
      cat: cat.trim(),
      done: false,
      completed_note: '',
      sort_order: order,
    });
    if (data) upsertRow('encycNotes', data);
    setCat('');
  };

  const toggle = (n: EncycNote) => {
    if (!n.done) {
      // Legacy: prompt('Done! Add a note about how it went (optional)').
      setCompletingId(n.id);
      setCompletedNote('');
      setSaving(false);
    } else {
      void (async () => {
        const { data } = await db.encycNotes.update(n.id, { done: false, completed_note: '' });
        if (data) upsertRow('encycNotes', data);
      })();
    }
  };

  const confirmComplete = async () => {
    if (!completingId || saving) return;
    setSaving(true);
    const { data } = await db.encycNotes.update(completingId, {
      done: true,
      completed_note: completedNote.trim(),
    });
    if (data) upsertRow('encycNotes', data);
    // Legacy: addXP(xp('encyc_complete')) — no streak mark.
    await awardXp(xpValue('encyc_complete'));
    setSaving(false);
    setCompletingId(null);
  };

  const remove = async (n: EncycNote) => {
    const { error } = await db.encycNotes.remove(n.id);
    if (!error) removeRow('encycNotes', n.id);
  };

  return (
    <Card>
      <SecHeader
        emoji="📖"
        name="Paigecyclopedia"
        count={encycNotes.length}
        open={open}
        onPress={() => setOpen((o) => !o)}
      />
      {open ? (
        <View style={{ marginTop: 8 }}>
          {allCats.length ? (
            <View style={styles.filters}>
              <Chip
                label={`all (${encycNotes.length})`}
                color={!filter ? '#fff' : palette.text2}
                bg={!filter ? palette.paige : palette.card2}
                onPress={() => setFilter('')}
              />
              {allCats.map((c) => (
                <Chip
                  key={c}
                  label={`${c} (${encycNotes.filter((n) => (n.cat || '').toLowerCase() === c.toLowerCase()).length})`}
                  color={filter === c ? '#fff' : palette.text2}
                  bg={filter === c ? palette.paige : palette.card2}
                  onPress={() => setFilter(c)}
                />
              ))}
            </View>
          ) : null}

          {!filtered.length ? (
            <Mono size={11} style={{ paddingVertical: 8 }}>
              no notes here yet
            </Mono>
          ) : null}
          {filtered.map((n) => (
            <View
              key={n.id}
              style={[styles.row, { borderBottomColor: palette.border }, n.done && { opacity: 0.55 }]}
            >
              {isActionable(n.cat) ? (
                <Pressable onPress={() => toggle(n)} hitSlop={8}>
                  <View
                    style={[
                      styles.check,
                      { borderColor: n.done ? palette.paige : palette.border2 },
                      n.done && { backgroundColor: palette.paige },
                    ]}
                  >
                    {n.done ? (
                      <Text style={{ color: '#fff', fontSize: 11, lineHeight: 13 }}>✓</Text>
                    ) : null}
                  </View>
                </Pressable>
              ) : null}
              <View style={{ flex: 1 }}>
                <Text
                  style={{
                    fontFamily: fonts.sans,
                    fontSize: 13,
                    color: palette.text1,
                    textDecorationLine: n.done ? 'line-through' : 'none',
                  }}
                >
                  {n.text}
                </Text>
                {n.cat ? (
                  <Mono size={9} color={palette.paige} style={{ marginTop: 2 }}>
                    {n.cat}
                  </Mono>
                ) : null}
                {n.completed_note ? (
                  <Text
                    style={{
                      fontFamily: fonts.sans,
                      fontSize: 10,
                      fontStyle: 'italic',
                      color: palette.text3,
                      marginTop: 2,
                    }}
                  >
                    "{n.completed_note}"
                  </Text>
                ) : null}
              </View>
              <Pressable onPress={() => remove(n)} hitSlop={6}>
                <Text style={{ fontSize: 11, color: palette.danger, opacity: 0.7 }}>✕</Text>
              </Pressable>
            </View>
          ))}

          <AddRow
            placeholder="Add a note..."
            onAdd={add}
            extras={
              <TextField
                placeholder="category"
                value={cat}
                onChangeText={setCat}
                style={{ width: 130 }}
              />
            }
          />
        </View>
      ) : null}

      <BottomSheet visible={!!completingId} onClose={() => setCompletingId(null)}>
        <SheetTitle title="Done!" sub="Add a note about how it went (optional)" />
        <TextField
          placeholder="How did it go?"
          value={completedNote}
          onChangeText={setCompletedNote}
          multiline
          style={{ minHeight: 70 }}
        />
        <Button
          title="✓ Mark complete"
          variant="accent"
          accentColor={palette.paige}
          onPress={confirmComplete}
          loading={saving}
          style={{ marginTop: 12 }}
        />
      </BottomSheet>
    </Card>
  );
}

const styles = StyleSheet.create({
  filters: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginBottom: 8,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    paddingVertical: 8,
    paddingHorizontal: 2,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  check: {
    width: 19,
    height: 19,
    borderRadius: 5,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 1,
  },
});
