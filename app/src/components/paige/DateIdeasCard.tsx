// Date ideas — legacy rPaige's 💖 collapsible card. "To try" ideas are sorted
// by excitement (pre_rating); marking one done opens the sheet (legacy
// dateidea-modal) to log the date, final star rating and notes. Past dates are
// a nested collapse — favorites (★) float to the top and can be toggled; rows
// can be re-edited or deleted. Adding uses the excitement star row (default 3).

import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { Mono } from '@/components/summary/shared';
import { BottomSheet, Button, Card, TextField } from '@/components/ui';
import { useTheme } from '@/hooks/use-theme';
import { useDataStore } from '@/stores/dataStore';
import { fonts } from '@/theme';
import { fmtDate, todayIso } from '@/utils/dates';
import * as db from '@/utils/supabase/db';
import type { DateIdea } from '@/utils/supabase/db';

import { AddRow, confirmAction, DateField, SecHeader, SheetTitle, Stars } from './shared';

export function DateIdeasCard() {
  const { palette } = useTheme();
  const { dateIdeas, upsertRow, removeRow } = useDataStore();

  const [open, setOpen] = useState(false);
  const [pastOpen, setPastOpen] = useState(false);
  const [preRating, setPreRating] = useState(3);

  // Mark-done / edit sheet.
  const [editingId, setEditingId] = useState<string | null>(null);
  const [doneDate, setDoneDate] = useState<string | null>(null);
  const [finalRating, setFinalRating] = useState(0);
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);

  const pending = dateIdeas.filter((i) => i.status !== 'done');
  const completed = dateIdeas.filter((i) => i.status === 'done');
  const starred = completed.filter((i) => i.starred);
  const sortedPending = [...pending].sort(
    (a, b) => (Number(b.pre_rating) || 0) - (Number(a.pre_rating) || 0),
  );
  // Favorites first, then most recent (legacy).
  const sortedDone = [...completed].sort((a, b) => {
    if (a.starred && !b.starred) return -1;
    if (!a.starred && b.starred) return 1;
    return (b.date || '').localeCompare(a.date || '');
  });

  const editing = dateIdeas.find((i) => i.id === editingId) ?? null;

  const openSheet = (idea: DateIdea) => {
    setEditingId(idea.id);
    setDoneDate(idea.date || todayIso());
    setNotes(idea.notes || '');
    setFinalRating(Number(idea.final_rating) || 0);
    setSaving(false);
  };

  const add = async (text: string) => {
    const { data } = await db.dateIdeas.insert({
      text,
      pre_rating: preRating,
      date: null,
      notes: '',
      final_rating: 0,
      starred: false,
      status: 'idea',
    });
    if (data) upsertRow('dateIdeas', data);
    setPreRating(3);
  };

  // Legacy saveDateIdeaDone.
  const save = async () => {
    if (!editing || saving) return;
    setSaving(true);
    const { data } = await db.dateIdeas.update(editing.id, {
      date: doneDate || todayIso(),
      notes: notes.trim(),
      final_rating: finalRating,
      status: 'done',
    });
    if (data) upsertRow('dateIdeas', data);
    setSaving(false);
    setEditingId(null);
  };

  const toggleStar = async (idea: DateIdea) => {
    const { data } = await db.dateIdeas.update(idea.id, { starred: !idea.starred });
    if (data) upsertRow('dateIdeas', data);
  };

  const remove = (idea: DateIdea) =>
    confirmAction(`Delete "${idea.text}"?`, undefined, async () => {
      const { error } = await db.dateIdeas.remove(idea.id);
      if (!error) removeRow('dateIdeas', idea.id);
    });

  return (
    <Card>
      <SecHeader
        emoji="💖"
        name="Date ideas"
        count={pending.length}
        open={open}
        onPress={() => setOpen((o) => !o)}
      />
      {open ? (
        <View style={{ marginTop: 6 }}>
          {sortedPending.length ? (
            <Mono size={10} style={{ marginBottom: 2 }}>
              to try ({sortedPending.length})
            </Mono>
          ) : null}
          {sortedPending.map((idea) => (
            <Pressable
              key={idea.id}
              onPress={() => openSheet(idea)}
              style={[styles.row, { borderBottomColor: palette.border }]}
            >
              <View style={{ flex: 1 }}>
                <Text style={{ fontFamily: fonts.sans, fontSize: 13, color: palette.text1 }}>
                  {idea.text}
                </Text>
                {Number(idea.pre_rating) > 0 ? (
                  <Text style={{ fontSize: 9, color: palette.xp, marginTop: 2 }}>
                    {'⭐'.repeat(Number(idea.pre_rating) || 0)}
                  </Text>
                ) : null}
              </View>
              <Pressable
                onPress={() => openSheet(idea)}
                style={[styles.doneBtn, { backgroundColor: palette.paigeBg }]}
              >
                <Text style={{ fontFamily: fonts.sansMedium, fontSize: 10, color: palette.paige }}>
                  mark done
                </Text>
              </Pressable>
            </Pressable>
          ))}

          {completed.length ? (
            <Pressable
              onPress={() => setPastOpen((o) => !o)}
              style={[styles.pastHd, { borderTopColor: palette.border }]}
            >
              <Mono size={10}>{pastOpen ? '▲' : '▼'}</Mono>
              <Mono size={10}>past dates ({completed.length})</Mono>
              <View style={{ flex: 1, height: StyleSheet.hairlineWidth, backgroundColor: palette.border }} />
              {starred.length ? (
                <Mono size={10} color={palette.xp}>
                  ⭐ {starred.length}
                </Mono>
              ) : null}
            </Pressable>
          ) : null}
          {pastOpen
            ? sortedDone.map((idea) => (
                <View
                  key={idea.id}
                  style={[
                    styles.row,
                    { borderBottomColor: palette.border, alignItems: 'flex-start' },
                    idea.starred && { backgroundColor: palette.xpBg },
                  ]}
                >
                  <Pressable onPress={() => toggleStar(idea)} hitSlop={6}>
                    <Text
                      style={{ fontSize: 16, color: idea.starred ? palette.xp : palette.border2 }}
                    >
                      {idea.starred ? '★' : '☆'}
                    </Text>
                  </Pressable>
                  <Pressable style={{ flex: 1 }} onPress={() => openSheet(idea)}>
                    <Text style={{ fontFamily: fonts.sans, fontSize: 13, color: palette.text1 }}>
                      {idea.text}
                    </Text>
                    <Mono size={9} style={{ marginTop: 2 }}>
                      {idea.date ? fmtDate(idea.date) : ''}
                      {Number(idea.final_rating) > 0
                        ? ` · ${'⭐'.repeat(Number(idea.final_rating))}`
                        : ''}
                    </Mono>
                    {idea.notes ? (
                      <Text
                        style={{
                          fontFamily: fonts.sans,
                          fontSize: 11,
                          fontStyle: 'italic',
                          color: palette.text2,
                          marginTop: 3,
                        }}
                      >
                        "{idea.notes}"
                      </Text>
                    ) : null}
                  </Pressable>
                  <Pressable onPress={() => remove(idea)} hitSlop={6}>
                    <Text style={{ fontSize: 10, color: palette.danger, opacity: 0.7 }}>✕</Text>
                  </Pressable>
                </View>
              ))
            : null}

          <AddRow
            placeholder="New date idea..."
            onAdd={add}
            extras={
              <View style={styles.excitementRow}>
                <Mono size={11} color={palette.text2}>
                  Excitement:
                </Mono>
                <Stars rating={preRating} onChange={setPreRating} size={16} />
              </View>
            }
          />
        </View>
      ) : null}

      {/* Legacy dateidea-modal. */}
      <BottomSheet visible={!!editing} onClose={() => setEditingId(null)}>
        {editing ? (
          <>
            <SheetTitle
              title={editing.status === 'done' ? 'Edit date' : 'Mark date done'}
              sub={editing.text}
              subColor={palette.paige}
            />
            <View style={{ gap: 10 }}>
              <View>
                <Mono size={10} style={{ marginBottom: 4 }}>
                  when was it?
                </Mono>
                <DateField value={doneDate} onChange={setDoneDate} />
              </View>
              <View>
                <Mono size={10} style={{ marginBottom: 4 }}>
                  how was it?
                </Mono>
                <Stars rating={finalRating} onChange={setFinalRating} size={26} />
              </View>
              <TextField
                placeholder="How did it go? Highlights / what to remember..."
                value={notes}
                onChangeText={setNotes}
                multiline
                style={{ minHeight: 80 }}
              />
            </View>
            <Button
              title="Save"
              variant="accent"
              accentColor={palette.paige}
              onPress={save}
              loading={saving}
              style={{ marginTop: 12 }}
            />
          </>
        ) : null}
      </BottomSheet>
    </Card>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 8,
    paddingHorizontal: 2,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  doneBtn: {
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  pastHd: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingTop: 8,
    paddingBottom: 6,
    marginTop: 4,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  excitementRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
});
