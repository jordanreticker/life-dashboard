// Balance targets sheet (legacy openBalanceTargets/saveBalanceTargets):
// per-section weekly XP targets stored in xp_values as section_target_<key>.
// A target overrides the 4-week baseline in the pace math; blank/0 = auto.

import { useEffect, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { BottomSheet, Button, TextField } from '@/components/ui';
import { useTheme } from '@/hooks/use-theme';
import { useDataStore } from '@/stores/dataStore';
import { fonts } from '@/theme';
import * as db from '@/utils/supabase/db';

import { Mono, SECTION_DEFS } from './shared';

export function TargetsSheet({ visible, onClose }: { visible: boolean; onClose: () => void }) {
  const { palette } = useTheme();
  const xpValues = useDataStore((s) => s.xpValues);
  const upsertRow = useDataStore((s) => s.upsertRow);
  const removeRow = useDataStore((s) => s.removeRow);
  const [values, setValues] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!visible) return;
    const seeded: Record<string, string> = {};
    SECTION_DEFS.forEach((d) => {
      const row = useDataStore.getState().xpValues.find((x) => x.key === 'section_target_' + d.key);
      seeded[d.key] = row && Number(row.value) > 0 ? String(Number(row.value)) : '';
    });
    setValues(seeded);
    setSaving(false);
  }, [visible]);

  const save = async () => {
    if (saving) return;
    setSaving(true);
    for (const d of SECTION_DEFS) {
      const key = 'section_target_' + d.key;
      const v = Number(values[d.key]) || 0;
      const had = xpValues.some((x) => x.key === key);
      if (v > 0) {
        const { data } = await db.xpValues.upsert({ key, value: v });
        if (data) upsertRow('xpValues', data);
      } else if (had) {
        await db.xpValues.remove(key);
        removeRow('xpValues', key);
      }
    }
    setSaving(false);
    onClose();
  };

  return (
    <BottomSheet visible={visible} onClose={onClose}>
      <Text style={[styles.title, { color: palette.text1 }]}>Weekly XP targets</Text>
      <Mono size={10} style={{ marginBottom: 12 }}>
        blank = auto (4-week average)
      </Mono>
      <View style={{ gap: 8 }}>
        {SECTION_DEFS.map((d) => (
          <View key={d.key} style={styles.row}>
            <Text style={[styles.rowLabel, { color: palette.text1 }]}>
              {d.emoji} {d.label}
            </Text>
            <TextField
              value={values[d.key] ?? ''}
              onChangeText={(t) => setValues((v) => ({ ...v, [d.key]: t }))}
              placeholder="auto"
              keyboardType="number-pad"
              style={styles.input}
            />
            <Mono size={10} style={{ width: 22 }}>
              XP
            </Mono>
          </View>
        ))}
      </View>
      <Button title="Save targets" onPress={save} loading={saving} style={{ marginTop: 14 }} />
    </BottomSheet>
  );
}

const styles = StyleSheet.create({
  title: { fontFamily: fonts.sansMedium, fontSize: 17, marginBottom: 3 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  rowLabel: { flex: 1, fontFamily: fonts.sans, fontSize: 13 },
  input: { width: 90, textAlign: 'right' },
});
