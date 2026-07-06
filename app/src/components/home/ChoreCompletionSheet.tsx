// Chore completion sheet — the legacy #chore-modal: "I did it" / "Both" /
// "Paige did it" toggle plus an editable (backdatable) completion date.
// Inserts the chore_log row (source of truth for lastDone) then awards XP
// through xp.ts. Paige mode defaults the toggle to "Paige did it".

import { useEffect, useState } from 'react';
import { View } from 'react-native';

import { Mono } from '@/components/summary/shared';
import { BottomSheet, Button, Segmented } from '@/components/ui';
import { useTheme } from '@/hooks/use-theme';
import { usePaigeModeStore } from '@/stores/paigeModeStore';
import { useDataStore } from '@/stores/dataStore';
import {
  buildXpMap,
  calcChoreProactivePoints,
  choreLastDoneMap,
  freshness,
} from '@/utils/compute';
import { todayIso } from '@/utils/dates';
import * as db from '@/utils/supabase/db';
import type { Chore } from '@/utils/supabase/db';
import { awardChoreCompletion, type CompletedBy } from '@/utils/xp';

import { DateField } from './DateField';
import { SheetTitle } from './shared';

export function ChoreCompletionSheet({
  chore,
  onClose,
}: {
  chore: Chore | null;
  onClose: () => void;
}) {
  const { palette } = useTheme();
  const paigeMode = usePaigeModeStore((s) => s.active);
  const choreLog = useDataStore((s) => s.choreLog);
  const upsertRow = useDataStore((s) => s.upsertRow);

  const [who, setWho] = useState<CompletedBy>('me');
  const [date, setDate] = useState(todayIso());
  const [saving, setSaving] = useState(false);

  // Re-seed on open (legacy openChoreModal): who defaults by mode, date today.
  useEffect(() => {
    if (!chore) return;
    setWho(paigeMode ? 'paige' : 'me');
    setDate(todayIso());
    setSaving(false);
  }, [chore?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  if (!chore) return <BottomSheet visible={false} onClose={onClose}>{null}</BottomSheet>;

  const lastDoneBefore = choreLastDoneMap(choreLog)[chore.id] ?? null;
  const f = freshness(lastDoneBefore, chore.interval_days);

  const confirm = async () => {
    if (saving) return;
    setSaving(true);
    // Proactive bonus only on solo completions; joint earns half base, no PP;
    // Paige earns nothing — same math awardChoreCompletion applies.
    const xpMap = buildXpMap(useDataStore.getState().xpValues);
    const pp = who === 'me' ? calcChoreProactivePoints(lastDoneBefore, chore.interval_days, xpMap) : 0;
    const base = Number(chore.xp_value) || 0;
    const totalXp = who === 'me' ? base + pp : who === 'joint' ? Math.round(base / 2) : 0;

    const { data, error } = await db.choreLog.insert({
      chore_id: chore.id,
      chore_name: chore.name,
      date,
      xp_earned: totalXp,
      proactive_points: pp,
      completed_by: who,
    });
    if (error || !data) {
      setSaving(false);
      return;
    }
    upsertRow('choreLog', data);
    await awardChoreCompletion(chore, who, lastDoneBefore);
    setSaving(false);
    onClose();
  };

  return (
    <BottomSheet visible={!!chore} onClose={onClose}>
      <SheetTitle>{chore.name}</SheetTitle>
      <Mono size={11} style={{ marginBottom: 12 }}>
        last: {f.label} · every {chore.interval_days}d · {Number(chore.xp_value) || 0} XP
      </Mono>
      <Segmented
        options={[
          { value: 'me', label: 'I did it' },
          { value: 'joint', label: 'Both' },
          { value: 'paige', label: 'Paige did it' },
        ]}
        value={who}
        onChange={setWho}
        accentColor={who === 'paige' ? palette.paige : palette.chores}
      />
      <View style={{ marginTop: 12, marginBottom: 14 }}>
        <DateField label="completed on" value={date} onChange={setDate} />
      </View>
      <Button title="✓ Log completion" onPress={confirm} loading={saving} accentColor={palette.chores} variant="accent" />
      <Button title="Cancel" onPress={onClose} variant="ghost" style={{ marginTop: 8 }} />
    </BottomSheet>
  );
}
