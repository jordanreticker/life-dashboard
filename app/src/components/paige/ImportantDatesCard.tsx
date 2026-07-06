// Important dates — legacy rPaige's 📅 card: countdown-sorted anniversaries /
// birthdays / milestones. Annual dates roll forward to their next occurrence.
// Tap a row to reveal ✏️ edit / ✕ delete; + Add date opens the sheet (legacy
// paige-date-modal / openPaigeDateModal).

import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { Mono } from '@/components/summary/shared';
import { BottomSheet, Button, Card, Segmented, TextField } from '@/components/ui';
import { useTheme } from '@/hooks/use-theme';
import { useDataStore } from '@/stores/dataStore';
import { fonts } from '@/theme';
import { dayDiff, fmtDate, localIso, noon, todayIso } from '@/utils/dates';
import * as db from '@/utils/supabase/db';
import type { ImportantDate } from '@/utils/supabase/db';

import { DateField, SecHeader, SheetTitle } from './shared';

// Legacy getNextOccurrence: annual dates advance to this year / next year.
function getNextOccurrence(d: ImportantDate, today: string): string {
  if (d.recur !== 'annual') return d.date;
  const t = noon(today);
  const dt = noon(d.date);
  dt.setFullYear(t.getFullYear());
  if (dt < t) dt.setFullYear(t.getFullYear() + 1);
  return localIso(dt);
}

export function ImportantDatesCard() {
  const { palette } = useTheme();
  const { importantDates, upsertRow, removeRow } = useDataStore();

  const [selectedId, setSelectedId] = useState<string | null>(null);
  // Sheet: null = closed, '' = adding, id = editing.
  const [editingId, setEditingId] = useState<string | null>(null);
  const [name, setName] = useState('');
  const [date, setDate] = useState<string | null>(null);
  const [recur, setRecur] = useState<'annual' | ''>('annual');
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);

  const today = todayIso();
  const sorted = [...importantDates]
    .map((d) => {
      const next = getNextOccurrence(d, today);
      return { ...d, _next: next, _days: dayDiff(today, next) };
    })
    .sort((a, b) => a._days - b._days);

  const openSheet = (d: ImportantDate | null) => {
    setEditingId(d ? d.id : '');
    setName(d?.name ?? '');
    setDate(d?.date ?? null);
    setRecur(d ? (d.recur === 'annual' ? 'annual' : '') : 'annual');
    setNotes(d?.notes ?? '');
    setSaving(false);
  };

  const save = async () => {
    if (!name.trim() || !date || saving) return;
    setSaving(true);
    if (editingId) {
      const { data } = await db.importantDates.update(editingId, {
        name: name.trim(),
        date,
        recur,
        notes,
      });
      if (data) upsertRow('importantDates', data);
    } else {
      const { data } = await db.importantDates.insert({ name: name.trim(), date, recur, notes });
      if (data) upsertRow('importantDates', data);
    }
    setSaving(false);
    setEditingId(null);
  };

  const remove = async (id: string) => {
    const { error } = await db.importantDates.remove(id);
    if (!error) removeRow('importantDates', id);
    if (selectedId === id) setSelectedId(null);
  };

  const countdown = (days: number): { label: string; color: string; bg: string } => {
    const label =
      days === 0 ? 'today!' : days === 1 ? 'tomorrow' : days < 0 ? `${Math.abs(days)}d ago` : `in ${days}d`;
    if (days <= 7) return { label, color: palette.danger, bg: palette.dangerBg };
    if (days <= 30) return { label, color: palette.work, bg: palette.workBg };
    return { label, color: palette.text2, bg: palette.card2 };
  };

  return (
    <Card>
      <SecHeader emoji="📅" name="Important dates" count={sorted.length} />
      <View style={{ marginTop: 4 }}>
        {!sorted.length ? (
          <Mono size={11} style={{ paddingVertical: 8 }}>
            add anniversaries, birthdays, milestones...
          </Mono>
        ) : null}
        {sorted.map((d) => {
          const cd = countdown(d._days);
          const selected = selectedId === d.id;
          return (
            <Pressable
              key={d.id}
              onPress={() => setSelectedId(selected ? null : d.id)}
              style={[
                styles.row,
                { borderBottomColor: palette.border },
                selected && { backgroundColor: palette.card2 },
              ]}
            >
              <View style={{ flex: 1 }}>
                <Text style={{ fontFamily: fonts.sans, fontSize: 13, color: palette.text1 }}>
                  {d.name}
                </Text>
                <Mono size={10} style={{ marginTop: 1 }}>
                  {fmtDate(d._next)}
                  {d.recur === 'annual' ? ' · annual' : ''}
                  {d.notes ? ` · ${d.notes}` : ''}
                </Mono>
              </View>
              <View style={[styles.cdBadge, { backgroundColor: cd.bg }]}>
                <Mono size={10} color={cd.color}>
                  {cd.label}
                </Mono>
              </View>
              {selected ? (
                <>
                  <Pressable onPress={() => openSheet(d)} hitSlop={6}>
                    <Text style={{ fontSize: 12 }}>✏️</Text>
                  </Pressable>
                  <Pressable onPress={() => remove(d.id)} hitSlop={6}>
                    <Text style={{ fontSize: 11, color: palette.danger }}>✕</Text>
                  </Pressable>
                </>
              ) : null}
            </Pressable>
          );
        })}
      </View>
      <Button
        title="+ Add date"
        variant="ghost"
        onPress={() => openSheet(null)}
        style={{ marginTop: 10 }}
      />

      <BottomSheet visible={editingId !== null} onClose={() => setEditingId(null)}>
        <SheetTitle title={editingId ? 'Edit date' : 'Add important date'} />
        <View style={{ gap: 8 }}>
          <TextField
            placeholder="What is this date? (e.g. Anniversary)"
            value={name}
            onChangeText={setName}
          />
          <DateField value={date} onChange={setDate} />
          <Segmented
            options={[
              { value: 'annual', label: 'repeats annually' },
              { value: '', label: 'one-time' },
            ]}
            value={recur}
            onChange={setRecur}
            accentColor={palette.paige}
          />
          <TextField
            placeholder="Notes / gift ideas (optional)"
            value={notes}
            onChangeText={setNotes}
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
    </Card>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 9,
    paddingHorizontal: 2,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  cdBadge: {
    borderRadius: 12,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
});
