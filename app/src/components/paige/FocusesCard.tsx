// Paige focuses — the legacy "💕 active focuses" card (max 3, numbered, with
// notes; ✓ complete / ✕ archive / tap to edit), the collapsible "📜 Past
// focuses" card (↻ reactivate / ✕ delete), and the add/edit focus sheet
// (legacy focus-modal / openFocusModal and friends).

import { useState } from 'react';
import { Alert, Pressable, StyleSheet, Text, View } from 'react-native';

import { Mono } from '@/components/summary/shared';
import { BottomSheet, Button, Card, TextField } from '@/components/ui';
import { useTheme } from '@/hooks/use-theme';
import { useDataStore } from '@/stores/dataStore';
import { fonts } from '@/theme';
import { fmtDate, todayIso } from '@/utils/dates';
import * as db from '@/utils/supabase/db';
import type { Focus } from '@/utils/supabase/db';

import { confirmAction, SecHeader, SheetTitle } from './shared';

const activeOf = (focuses: Focus[]) =>
  focuses
    .filter((f) => f.status === 'active')
    .sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0));

export function FocusesCard() {
  const { palette } = useTheme();
  const { focuses, upsertRow, removeRow } = useDataStore();

  // Sheet state: null = closed, '' = adding, id = editing.
  const [editingId, setEditingId] = useState<string | null>(null);
  const [text, setText] = useState('');
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);
  const [pastOpen, setPastOpen] = useState(false);

  const activeFocuses = activeOf(focuses);
  const pastFocuses = focuses
    .filter((f) => f.status === 'completed' || f.status === 'archived')
    .sort((a, b) => (b.completed_date || '').localeCompare(a.completed_date || ''));

  const openSheet = (focus: Focus | null) => {
    setEditingId(focus ? focus.id : '');
    setText(focus?.text ?? '');
    setNotes(focus?.notes ?? '');
    setSaving(false);
  };

  // Legacy openFocusModal confirm.
  const save = async () => {
    const t = text.trim();
    if (!t || saving) return;
    setSaving(true);
    if (editingId) {
      const { data } = await db.focuses.update(editingId, { text: t, notes: notes.trim() });
      if (data) upsertRow('focuses', data);
    } else {
      if (activeOf(useDataStore.getState().focuses).length >= 3) {
        Alert.alert('Max 3 active focuses');
        setSaving(false);
        return;
      }
      const order = activeFocuses.reduce((m, f) => Math.max(m, f.sort_order || 0), 0) + 1;
      const { data } = await db.focuses.insert({
        text: t,
        notes: notes.trim(),
        status: 'active',
        created_date: todayIso(),
        sort_order: order,
      });
      if (data) upsertRow('focuses', data);
    }
    setSaving(false);
    setEditingId(null);
  };

  const complete = async (f: Focus) => {
    const { data } = await db.focuses.update(f.id, {
      status: 'completed',
      completed_date: todayIso(),
    });
    if (data) upsertRow('focuses', data);
  };

  const archive = (f: Focus) =>
    confirmAction(`Archive "${f.text}"?`, 'Can be reactivated later.', async () => {
      const { data } = await db.focuses.update(f.id, { status: 'archived' });
      if (data) upsertRow('focuses', data);
    }, 'Archive');

  const reactivate = async (f: Focus) => {
    if (activeOf(useDataStore.getState().focuses).length >= 3) {
      Alert.alert('Max 3 active focuses');
      return;
    }
    const { data } = await db.focuses.update(f.id, {
      status: 'active',
      reactivated_date: todayIso(),
      completed_date: null,
    });
    if (data) upsertRow('focuses', data);
  };

  const deleteFocus = (f: Focus) =>
    confirmAction(`Permanently delete "${f.text}"?`, undefined, async () => {
      const { error } = await db.focuses.remove(f.id);
      if (!error) removeRow('focuses', f.id);
    });

  return (
    <>
      <Card style={{ borderColor: palette.paige, borderWidth: StyleSheet.hairlineWidth }}>
        <View style={styles.hdRow}>
          <Text style={{ fontFamily: fonts.sansMedium, fontSize: 13, color: palette.paige }}>
            💕 active focuses
          </Text>
          {activeFocuses.length < 3 ? (
            <Pressable onPress={() => openSheet(null)} hitSlop={8}>
              <Text style={{ fontFamily: fonts.sansMedium, fontSize: 12, color: palette.paige }}>
                + Add focus
              </Text>
            </Pressable>
          ) : null}
        </View>
        {activeFocuses.length ? (
          activeFocuses.map((f, i) => (
            <Pressable key={f.id} onPress={() => openSheet(f)} style={styles.focusRow}>
              <View style={[styles.num, { backgroundColor: palette.paigeBg }]}>
                <Mono size={11} color={palette.paige}>
                  {i + 1}
                </Mono>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={{ fontFamily: fonts.sans, fontSize: 13, color: palette.text1 }}>
                  {f.text}
                </Text>
                {f.notes ? (
                  <Text
                    style={{
                      fontFamily: fonts.sans,
                      fontSize: 11,
                      color: palette.text3,
                      marginTop: 3,
                      lineHeight: 14,
                    }}
                  >
                    {f.notes}
                  </Text>
                ) : null}
              </View>
              <Pressable onPress={() => complete(f)} hitSlop={8}>
                <Text style={{ fontSize: 14, color: palette.health }}>✓</Text>
              </Pressable>
              <Pressable onPress={() => archive(f)} hitSlop={8}>
                <Text style={{ fontSize: 11, color: palette.danger, opacity: 0.7 }}>✕</Text>
              </Pressable>
            </Pressable>
          ))
        ) : (
          <Mono size={11} style={{ paddingVertical: 8 }}>
            No active focuses — tap + Add focus to set one
          </Mono>
        )}
      </Card>

      {pastFocuses.length ? (
        <Card>
          <SecHeader
            emoji="📜"
            name="Past focuses"
            count={pastFocuses.length}
            open={pastOpen}
            onPress={() => setPastOpen((o) => !o)}
          />
          {pastOpen
            ? pastFocuses.map((f) => (
                <View
                  key={f.id}
                  style={[styles.pastRow, { backgroundColor: palette.card2 }]}
                >
                  <View style={{ flex: 1 }}>
                    <Text
                      style={{
                        fontFamily: fonts.sans,
                        fontSize: 13,
                        color: f.status === 'completed' ? palette.text1 : palette.text3,
                        fontStyle: f.status === 'completed' ? 'normal' : 'italic',
                      }}
                    >
                      {f.text}
                    </Text>
                    {f.notes ? (
                      <Text
                        style={{
                          fontFamily: fonts.sans,
                          fontSize: 11,
                          color: palette.text3,
                          marginTop: 2,
                        }}
                      >
                        {f.notes}
                      </Text>
                    ) : null}
                    <Mono size={9} style={{ marginTop: 3 }}>
                      {f.status === 'completed' ? '✓ completed' : 'archived'}
                      {f.completed_date ? ` · ${fmtDate(f.completed_date)}` : ''}
                    </Mono>
                  </View>
                  <Pressable onPress={() => reactivate(f)} hitSlop={8}>
                    <Text style={{ fontSize: 14, color: palette.paige }}>↻</Text>
                  </Pressable>
                  <Pressable onPress={() => deleteFocus(f)} hitSlop={8}>
                    <Text style={{ fontSize: 10, color: palette.danger, opacity: 0.7 }}>✕</Text>
                  </Pressable>
                </View>
              ))
            : null}
        </Card>
      ) : null}

      <BottomSheet visible={editingId !== null} onClose={() => setEditingId(null)}>
        <SheetTitle title={editingId ? 'Edit focus' : 'Add focus'} />
        <View style={{ gap: 8 }}>
          <TextField placeholder="What to focus on..." value={text} onChangeText={setText} />
          <TextField
            placeholder="Notes (optional)"
            value={notes}
            onChangeText={setNotes}
            multiline
            style={{ minHeight: 70 }}
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
      </BottomSheet>
    </>
  );
}

const styles = StyleSheet.create({
  hdRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  focusRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    paddingVertical: 9,
  },
  num: {
    width: 20,
    height: 20,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 1,
  },
  pastRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    padding: 8,
    borderRadius: 8,
    marginTop: 6,
  },
});
