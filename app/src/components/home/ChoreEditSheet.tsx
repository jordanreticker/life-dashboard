// Chore edit sheet — the legacy #chore-edit-modal: name, "every N days",
// XP value, and the 🧹 Chore vs 📦 Ordering kind toggle.

import { useEffect, useState } from 'react';
import { View } from 'react-native';

import { Mono } from '@/components/summary/shared';
import { BottomSheet, Button, Segmented, TextField } from '@/components/ui';
import { useTheme } from '@/hooks/use-theme';
import { useDataStore } from '@/stores/dataStore';
import * as db from '@/utils/supabase/db';
import type { Chore } from '@/utils/supabase/db';

import { SheetTitle } from './shared';

export function ChoreEditSheet({ chore, onClose }: { chore: Chore | null; onClose: () => void }) {
  const { palette } = useTheme();
  const upsertRow = useDataStore((s) => s.upsertRow);

  const [name, setName] = useState('');
  const [interval, setInterval] = useState('7');
  const [xp, setXp] = useState('8');
  const [kind, setKind] = useState<'chore' | 'ordering'>('chore');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!chore) return;
    setName(chore.name);
    setInterval(String(chore.interval_days || 7));
    setXp(String(Number(chore.xp_value) || 0));
    setKind(chore.kind === 'ordering' ? 'ordering' : 'chore');
    setSaving(false);
  }, [chore?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  const save = async () => {
    if (!chore || saving) return;
    const n = name.trim();
    if (!n) return;
    setSaving(true);
    const { data, error } = await db.chores.update(chore.id, {
      name: n,
      interval_days: parseInt(interval, 10) || 7,
      xp_value: parseInt(xp, 10) || 8,
      kind,
    });
    setSaving(false);
    if (error || !data) return;
    upsertRow('chores', data);
    onClose();
  };

  return (
    <BottomSheet visible={!!chore} onClose={onClose}>
      <SheetTitle>Edit chore</SheetTitle>
      <View style={{ gap: 8, marginTop: 10 }}>
        <TextField placeholder="Chore name" value={name} onChangeText={setName} />
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
          <Mono size={11} color={palette.text2}>
            Every
          </Mono>
          <TextField
            value={interval}
            onChangeText={setInterval}
            keyboardType="number-pad"
            style={{ width: 62, textAlign: 'center' }}
          />
          <Mono size={11} color={palette.text2}>
            days
          </Mono>
          <TextField
            value={xp}
            onChangeText={setXp}
            keyboardType="number-pad"
            placeholder="XP"
            style={{ width: 62, textAlign: 'center' }}
          />
          <Mono size={11} color={palette.text2}>
            XP
          </Mono>
        </View>
        <Segmented
          options={[
            { value: 'chore', label: '🧹 Chore' },
            { value: 'ordering', label: '📦 Ordering' },
          ]}
          value={kind}
          onChange={setKind}
          accentColor={palette.chores}
        />
      </View>
      <Button title="Save" onPress={save} loading={saving} style={{ marginTop: 14 }} />
      <Button title="Cancel" onPress={onClose} variant="ghost" style={{ marginTop: 8 }} />
    </BottomSheet>
  );
}
