// Person edit sheet (legacy person-edit-modal / openPersonEdit +
// savePersonEdit): rename and set a per-person contact cadence override.
// Clearing / zeroing the cadence falls back to the tier default (family 7d,
// friends 14d → cadence_days null).

import { useEffect, useState } from 'react';
import { StyleSheet, Text } from 'react-native';

import { Mono } from '@/components/summary/shared';
import { BottomSheet, Button, TextField } from '@/components/ui';
import { useTheme } from '@/hooks/use-theme';
import { useDataStore } from '@/stores/dataStore';
import { fonts } from '@/theme';
import * as db from '@/utils/supabase/db';
import type { Person } from '@/utils/supabase/db';

import { defaultCadence } from './health';

export function PersonEditSheet({
  person,
  onClose,
  onToast,
}: {
  person: Person | null;
  onClose: () => void;
  onToast: (msg: string) => void;
}) {
  const { palette } = useTheme();
  const upsertRow = useDataStore((s) => s.upsertRow);

  const [name, setName] = useState('');
  const [cadence, setCadence] = useState('');
  const [saving, setSaving] = useState(false);

  const fallback = person ? defaultCadence(person.tier) : 7;

  // Seed fields whenever the sheet opens (legacy openPersonEdit).
  useEffect(() => {
    if (!person) return;
    setName(person.name ?? '');
    setCadence(
      String(Number(person.cadence_days) > 0 ? person.cadence_days : defaultCadence(person.tier)),
    );
    setSaving(false);
  }, [person?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  const save = async () => {
    if (!person || saving) return;
    setSaving(true);
    const newName = name.trim();
    const cadenceVal = Number(cadence) || 0;
    const { data } = await db.people.update(person.id, {
      name: newName || person.name,
      cadence_days: cadenceVal > 0 ? cadenceVal : null,
    });
    if (data) upsertRow('people', data);
    setSaving(false);
    onToast('Updated');
    onClose();
  };

  return (
    <BottomSheet visible={!!person} onClose={onClose}>
      <Text style={[styles.title, { color: palette.text1 }]}>
        Edit person{person ? ' · ' + person.name : ''}
      </Text>
      <Mono size={11} style={{ marginBottom: 12 }}>
        Default for {person?.tier === 'family' ? 'family' : 'friends'}: every {fallback}d
      </Mono>
      <TextField value={name} onChangeText={setName} placeholder="Name" />
      <TextField
        value={cadence}
        onChangeText={setCadence}
        placeholder={`default ${fallback}`}
        keyboardType="number-pad"
        style={{ marginTop: 8 }}
      />
      <Mono size={10} style={{ marginTop: 6 }}>
        contact cadence (days between contacts)
      </Mono>
      <Button title="Save" onPress={save} loading={saving} style={{ marginTop: 12 }} />
    </BottomSheet>
  );
}

const styles = StyleSheet.create({
  title: { fontFamily: fonts.sansMedium, fontSize: 17, marginBottom: 3 },
});
