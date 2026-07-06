// 📖 Paigecyclopedia (legacy rPaige encyc block, relocated to the Life pane):
// collapsible card with category filter chips, notes ordered by sort_order,
// a completion checkbox for actionable categories (date/gift ideas) with an
// optional "how it went" note (+encyc_complete XP, no revoke on un-check),
// tap-to-edit, delete, add with category, and a manual ↑/↓ reorder mode that
// rewrites 1-based sort_order for changed rows only.

import { useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { Chip, SecHeader, SheetTitle } from '@/components/life/shared';
import { Mono } from '@/components/summary/shared';
import { BottomSheet, Button, Card, TextField } from '@/components/ui';
import { useTheme } from '@/hooks/use-theme';
import { useDataStore } from '@/stores/dataStore';
import { fonts, radius } from '@/theme';
import * as db from '@/utils/supabase/db';
import type { EncycNote } from '@/utils/supabase/db';
import { awardXp, xpValue } from '@/utils/xp';

/** Categories whose notes get a completion checkbox (legacy isActionable). */
const isActionable = (cat: string | null | undefined): boolean =>
  ['dateideas', 'giftideas', 'gift ideas', 'date ideas', 'dateidea', 'giftidea'].includes(
    (cat || '').toLowerCase().replace(/\s+/g, ''),
  );

export function EncycCard({ onToast }: { onToast: (msg: string) => void }) {
  const { palette } = useTheme();
  const { encycNotes, upsertRow, removeRow } = useDataStore();

  const [open, setOpen] = useState(false); // legacy D.encycOpen
  const [filter, setFilter] = useState(''); // legacy D.encycFilter
  const [reordering, setReordering] = useState(false);
  const [text, setText] = useState('');
  const [cat, setCat] = useState('');
  const [completing, setCompleting] = useState<EncycNote | null>(null);
  const [completedNote, setCompletedNote] = useState('');
  const [editing, setEditing] = useState<EncycNote | null>(null);
  const [editText, setEditText] = useState('');
  const [editCat, setEditCat] = useState('');

  const sorted = useMemo(
    () => [...encycNotes].sort((a, b) => a.sort_order - b.sort_order),
    [encycNotes],
  );
  const allCats = useMemo(
    () => [...new Set(sorted.map((n) => n.cat).filter(Boolean))].sort(),
    [sorted],
  );
  const filtered = filter
    ? sorted.filter((n) => (n.cat || '').toLowerCase() === filter.toLowerCase())
    : sorted;

  // ── Handlers ────────────────────────────────────────────────────────────────

  const add = async () => {
    const t = text.trim();
    if (!t) return;
    const sortOrder = sorted.reduce((m, n) => Math.max(m, n.sort_order), 0) + 1;
    const { data, error } = await db.encycNotes.insert({
      text: t,
      cat: cat.trim(),
      sort_order: sortOrder,
    });
    if (error || !data) {
      onToast('Save failed');
      return;
    }
    upsertRow('encycNotes', data);
    setText('');
    setCat('');
  };

  const toggle = (n: EncycNote) => {
    if (!n.done) {
      // Legacy prompt('Done! Add a note about how it went (optional):').
      setCompletedNote('');
      setCompleting(n);
    } else {
      const updated = { ...n, done: false, completed_note: '' };
      upsertRow('encycNotes', updated);
      void db.encycNotes.update(n.id, { done: false, completed_note: '' });
    }
  };

  const confirmComplete = async () => {
    const n = completing;
    if (!n) return;
    setCompleting(null);
    const note = completedNote.trim();
    const updated = { ...n, done: true, completed_note: note };
    upsertRow('encycNotes', updated);
    await db.encycNotes.update(n.id, { done: true, completed_note: note });
    const amount = xpValue('encyc_complete');
    await awardXp(amount);
    onToast(`Marked complete +${amount} XP`);
  };

  const openEdit = (n: EncycNote) => {
    setEditText(n.text);
    setEditCat(n.cat || '');
    setEditing(n);
  };

  const saveEdit = async () => {
    const n = editing;
    if (!n || !editText.trim()) return;
    setEditing(null);
    const { data, error } = await db.encycNotes.update(n.id, {
      text: editText.trim(),
      cat: editCat.trim(),
    });
    if (error || !data) {
      onToast('Save failed');
      return;
    }
    upsertRow('encycNotes', data);
    onToast('Updated');
  };

  const deleteNote = (n: EncycNote) => {
    removeRow('encycNotes', n.id);
    void db.encycNotes.remove(n.id);
  };

  // Reorder mode: swap with the neighbor, rewrite 1-based sort_order for
  // changed rows only (only offered on the unfiltered list).
  const move = (idx: number, dir: 'up' | 'down') => {
    const arr = [...sorted];
    const j = dir === 'up' ? idx - 1 : idx + 1;
    if (j < 0 || j >= arr.length) return;
    [arr[idx], arr[j]] = [arr[j], arr[idx]];
    arr.forEach((n, i) => {
      const so = i + 1;
      if (n.sort_order !== so) {
        upsertRow('encycNotes', { ...n, sort_order: so });
        void db.encycNotes.update(n.id, { sort_order: so });
      }
    });
  };

  return (
    <Card>
      <SecHeader
        emoji="📖"
        name="Paigecyclopedia"
        count={encycNotes.length}
        open={open}
        onPress={() => setOpen((o) => !o)}
        right={
          open && !filter ? (
            <Pressable
              onPress={() => setReordering((r) => !r)}
              style={[
                styles.reorderBtn,
                { backgroundColor: reordering ? palette.personal : palette.card2 },
              ]}
            >
              <Mono size={10} color={reordering ? '#fff' : palette.text2}>
                {reordering ? 'done' : 'reorder'}
              </Mono>
            </Pressable>
          ) : undefined
        }
      />

      {open ? (
        <View>
          {allCats.length ? (
            <View style={[styles.filters, { borderBottomColor: palette.border }]}>
              <Chip
                label={`all (${sorted.length})`}
                active={!filter}
                activeColor={palette.personal}
                onPress={() => setFilter('')}
              />
              {allCats.map((c) => (
                <Chip
                  key={c}
                  label={`${c} (${sorted.filter((n) => (n.cat || '').toLowerCase() === c.toLowerCase()).length})`}
                  active={filter === c}
                  activeColor={palette.personal}
                  onPress={() => setFilter(c)}
                />
              ))}
            </View>
          ) : null}

          {!filtered.length ? (
            <Mono size={11} color={palette.text3} style={{ paddingVertical: 10 }}>
              no notes here yet
            </Mono>
          ) : null}

          {filtered.map((n, i) => {
            const showCheck = isActionable(n.cat);
            return (
              <View key={n.id} style={[styles.item, n.done && { opacity: 0.5 }]}>
                {showCheck ? (
                  <Pressable onPress={() => toggle(n)} hitSlop={8}>
                    <View
                      style={[
                        styles.check,
                        { borderColor: palette.border2 },
                        n.done && {
                          backgroundColor: palette.personal,
                          borderColor: palette.personal,
                        },
                      ]}
                    >
                      {n.done ? (
                        <Text style={{ color: '#fff', fontSize: 10, lineHeight: 12 }}>✓</Text>
                      ) : null}
                    </View>
                  </Pressable>
                ) : null}
                <Pressable onPress={() => openEdit(n)} style={{ flex: 1 }}>
                  <Text
                    style={[
                      styles.itemText,
                      { color: palette.text1 },
                      n.done && { textDecorationLine: 'line-through' },
                    ]}
                  >
                    {n.text}
                  </Text>
                  {n.cat ? (
                    <Mono size={10} color={palette.text3}>
                      {n.cat}
                    </Mono>
                  ) : null}
                  {n.completed_note ? (
                    <Text style={[styles.completedNote, { color: palette.text3 }]}>
                      &ldquo;{n.completed_note}&rdquo;
                    </Text>
                  ) : null}
                </Pressable>
                {reordering && !filter ? (
                  <View style={styles.moveBtns}>
                    <Pressable onPress={() => move(i, 'up')} hitSlop={6}>
                      <Mono size={12} color={palette.text2}>
                        ↑
                      </Mono>
                    </Pressable>
                    <Pressable onPress={() => move(i, 'down')} hitSlop={6}>
                      <Mono size={12} color={palette.text2}>
                        ↓
                      </Mono>
                    </Pressable>
                  </View>
                ) : (
                  <Pressable onPress={() => deleteNote(n)} hitSlop={8}>
                    <Text style={{ fontSize: 11, color: palette.danger }}>✕</Text>
                  </Pressable>
                )}
              </View>
            );
          })}

          <View style={styles.addWrap}>
            <View style={styles.addMain}>
              <TextField
                placeholder="Add a note..."
                value={text}
                onChangeText={setText}
                onSubmitEditing={add}
                returnKeyType="done"
                style={{ flex: 1 }}
              />
              <Pressable onPress={add} style={[styles.addBtn, { backgroundColor: palette.text1 }]}>
                <Text style={{ fontFamily: fonts.sansMedium, fontSize: 13, color: palette.bg }}>
                  Add
                </Text>
              </Pressable>
            </View>
            <TextField
              placeholder="category"
              value={cat}
              onChangeText={setCat}
              style={{ width: 130 }}
            />
          </View>
        </View>
      ) : null}

      {/* Legacy completion prompt. */}
      <BottomSheet visible={!!completing} onClose={() => setCompleting(null)}>
        <SheetTitle
          title="Done! 🎉"
          sub="Add a note about how it went (optional):"
        />
        <TextField
          placeholder="How did it go?"
          value={completedNote}
          onChangeText={setCompletedNote}
          style={{ marginBottom: 12 }}
        />
        <Button
          title="Mark complete"
          onPress={confirmComplete}
          variant="accent"
          accentColor={palette.personal}
        />
        <Button
          title="Cancel"
          onPress={() => setCompleting(null)}
          variant="ghost"
          style={{ marginTop: 8 }}
        />
      </BottomSheet>

      {/* Note edit sheet. */}
      <BottomSheet visible={!!editing} onClose={() => setEditing(null)}>
        <SheetTitle title="Edit note" />
        <TextField
          placeholder="Note"
          value={editText}
          onChangeText={setEditText}
          multiline
          style={{ minHeight: 60, textAlignVertical: 'top', marginBottom: 8 }}
        />
        <TextField
          placeholder="category"
          value={editCat}
          onChangeText={setEditCat}
          style={{ marginBottom: 12 }}
        />
        <Button title="Save" onPress={saveEdit} />
        <Button
          title="Cancel"
          onPress={() => setEditing(null)}
          variant="ghost"
          style={{ marginTop: 8 }}
        />
      </BottomSheet>
    </Card>
  );
}

const styles = StyleSheet.create({
  reorderBtn: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: radius.sm,
  },
  filters: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 5,
    paddingBottom: 8,
    marginBottom: 4,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  item: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 7,
  },
  check: {
    width: 15,
    height: 15,
    borderRadius: 3,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  itemText: {
    fontFamily: fonts.sans,
    fontSize: 13,
  },
  completedNote: {
    fontFamily: fonts.sans,
    fontSize: 10,
    fontStyle: 'italic',
    marginTop: 2,
  },
  moveBtns: {
    flexDirection: 'row',
    gap: 12,
    paddingHorizontal: 2,
  },
  addWrap: {
    marginTop: 10,
    gap: 8,
  },
  addMain: {
    flexDirection: 'row',
    gap: 8,
  },
  addBtn: {
    borderRadius: radius.md,
    paddingHorizontal: 18,
    justifyContent: 'center',
  },
});
