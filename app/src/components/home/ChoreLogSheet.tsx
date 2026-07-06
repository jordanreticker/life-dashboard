// Chore log entry sheet — the legacy #chorelog-modal: edit a completion's
// date, or delete the entry (which refunds its XP/PP through xp.ts).

import { useEffect, useState } from 'react';
import { Alert, View } from 'react-native';

import { Mono } from '@/components/summary/shared';
import { BottomSheet, Button } from '@/components/ui';
import { useDataStore } from '@/stores/dataStore';
import { todayIso, toDateStr } from '@/utils/dates';
import * as db from '@/utils/supabase/db';
import type { ChoreLogEntry } from '@/utils/supabase/db';
import { revokeChoreLogEntry } from '@/utils/xp';

import { DateField } from './DateField';
import { SheetTitle } from './shared';

export function ChoreLogSheet({
  entry,
  onClose,
}: {
  entry: ChoreLogEntry | null;
  onClose: () => void;
}) {
  const upsertRow = useDataStore((s) => s.upsertRow);
  const removeRow = useDataStore((s) => s.removeRow);

  const [date, setDate] = useState(todayIso());
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!entry) return;
    setDate(toDateStr(entry.date) || todayIso());
    setBusy(false);
  }, [entry?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  if (!entry) return <BottomSheet visible={false} onClose={onClose}>{null}</BottomSheet>;

  const xpE = Number(entry.xp_earned) || 0;
  const ppE = Number(entry.proactive_points) || 0;

  const save = async () => {
    if (busy) return;
    setBusy(true);
    const { data, error } = await db.choreLog.update(entry.id, { date });
    setBusy(false);
    if (error || !data) return;
    upsertRow('choreLog', data);
    onClose();
  };

  const del = () => {
    Alert.alert(
      'Delete completion?',
      `Delete this completion of "${entry.chore_name || 'chore'}"? Its ${xpE} XP will be removed.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            setBusy(true);
            const { error } = await db.choreLog.remove(entry.id);
            if (error) {
              setBusy(false);
              return;
            }
            // Remove + reflect first so the all-time recount sees fresh state.
            removeRow('choreLog', entry.id);
            await revokeChoreLogEntry(entry);
            setBusy(false);
            onClose();
          },
        },
      ],
    );
  };

  return (
    <BottomSheet visible={!!entry} onClose={onClose}>
      <SheetTitle>Edit chore completion</SheetTitle>
      <Mono size={11} style={{ marginBottom: 12 }}>
        🧹 {entry.chore_name || 'chore'} · +{xpE} XP{ppE > 0 ? ` (incl. ${ppE} PP)` : ''}
      </Mono>
      <View style={{ marginBottom: 14 }}>
        <DateField label="completed on" value={date} onChange={setDate} />
      </View>
      <Button title="Save" onPress={save} loading={busy} />
      <Button
        title="Delete entry (removes its XP)"
        onPress={del}
        variant="danger"
        style={{ marginTop: 8 }}
      />
      <Button title="Cancel" onPress={onClose} variant="ghost" style={{ marginTop: 8 }} />
    </BottomSheet>
  );
}
