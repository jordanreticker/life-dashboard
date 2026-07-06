// Day result sheet — the legacy day-result-modal flow (openDayResult /
// confirmDayResult): pick W or L with 3 required reasons + notes, or skip the
// W/L and just save the stats for later. XP (day_win/day_loss + series
// bonuses) is only awarded the first time a row is created for that date.

import { useEffect, useState } from 'react';
import { Alert, Pressable, StyleSheet, Text, View } from 'react-native';

import { BottomSheet, Button, TextField } from '@/components/ui';
import { useTheme } from '@/hooks/use-theme';
import { useDataStore } from '@/stores/dataStore';
import { fonts } from '@/theme';
import { fmtDateSmart, getWeekStart, todayIso } from '@/utils/dates';
import * as db from '@/utils/supabase/db';
import { awardDayResult } from '@/utils/xp';

import { Mono } from './shared';

export function DayResultSheet({ date, onClose }: { date: string | null; onClose: () => void }) {
  const { palette } = useTheme();
  const dayResults = useDataStore((s) => s.dayResults);
  const upsertRow = useDataStore((s) => s.upsertRow);

  const existing = date ? (dayResults.find((r) => r.date === date) ?? null) : null;
  const [result, setResult] = useState<'win' | 'loss' | null>(null);
  const [stat1, setStat1] = useState('');
  const [stat2, setStat2] = useState('');
  const [stat3, setStat3] = useState('');
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);

  // Seed fields whenever the sheet opens for a date (legacy openDayResult).
  useEffect(() => {
    if (!date) return;
    const r = useDataStore.getState().dayResults.find((x) => x.date === date) ?? null;
    setResult(r?.result === 'win' ? 'win' : r?.result === 'loss' ? 'loss' : null);
    setStat1(r?.stat1 ?? '');
    setStat2(r?.stat2 ?? '');
    setStat3(r?.stat3 ?? '');
    setNotes(r?.notes ?? '');
    setSaving(false);
  }, [date]);

  const save = async () => {
    if (!date || saving) return;
    const s1 = stat1.trim();
    const s2 = stat2.trim();
    const s3 = stat3.trim();
    const n = notes.trim();

    // No W/L picked → save stats only, keep any previously-committed result.
    if (!result) {
      if (!s1 && !s2 && !s3 && !n) {
        Alert.alert('Add at least one stat or note');
        return;
      }
      setSaving(true);
      const { data } = await db.dayResults.upsert({
        date,
        result: existing?.result ?? null,
        stat1: s1,
        stat2: s2,
        stat3: s3,
        notes: n,
      });
      if (data) upsertRow('dayResults', data);
      setSaving(false);
      onClose();
      return;
    }

    if (!s1 || !s2 || !s3) {
      Alert.alert('All 3 reasons required to commit W/L');
      return;
    }
    setSaving(true);
    const isNew = !existing; // XP only on the first row for this date (legacy)
    const { data } = await db.dayResults.upsert({
      date,
      result,
      stat1: s1,
      stat2: s2,
      stat3: s3,
      notes: n,
    });
    if (data) upsertRow('dayResults', data);
    if (isNew) {
      await awardDayResult(
        result,
        useDataStore.getState().dayResults,
        getWeekStart(todayIso()),
      );
    }
    setSaving(false);
    onClose();
  };

  const wlBtn = (kind: 'win' | 'loss', label: string) => {
    const sel = result === kind;
    const selColor = kind === 'win' ? palette.success : palette.danger;
    return (
      <Pressable
        onPress={() => setResult(kind)}
        style={[
          styles.wlBtn,
          { backgroundColor: sel ? selColor : palette.card2, borderColor: palette.border },
        ]}
      >
        <Text
          style={{
            fontFamily: fonts.sansMedium,
            fontSize: 14,
            color: sel ? palette.surface : palette.text1,
          }}
        >
          {label}
        </Text>
      </Pressable>
    );
  };

  return (
    <BottomSheet visible={!!date} onClose={onClose}>
      <Text style={[styles.title, { color: palette.text1 }]}>
        How did {date ? fmtDateSmart(date) : ''} go?
      </Text>
      <Mono size={11} style={{ marginBottom: 12 }}>
        {existing
          ? existing.result
            ? 'Update your result'
            : 'Continue logging — pick W/L when ready'
          : 'Add 3 reasons + W/L · or save stats now'}
      </Mono>
      <View style={styles.wlRow}>
        {wlBtn('win', 'W · Win')}
        {wlBtn('loss', 'L · Loss')}
      </View>
      <View style={{ gap: 8 }}>
        <TextField placeholder="Reason 1" value={stat1} onChangeText={setStat1} />
        <TextField placeholder="Reason 2" value={stat2} onChangeText={setStat2} />
        <TextField placeholder="Reason 3" value={stat3} onChangeText={setStat3} />
        <TextField placeholder="Notes (optional)" value={notes} onChangeText={setNotes} multiline />
      </View>
      <Button
        title={result ? (result === 'win' ? 'Log the W' : 'Log the L') : 'Save stats · commit W/L later'}
        onPress={save}
        loading={saving}
        style={{ marginTop: 12 }}
      />
    </BottomSheet>
  );
}

const styles = StyleSheet.create({
  title: { fontFamily: fonts.sansMedium, fontSize: 17, marginBottom: 3 },
  wlRow: { flexDirection: 'row', gap: 8, marginBottom: 12 },
  wlBtn: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 12,
    borderRadius: 10,
    borderWidth: StyleSheet.hairlineWidth,
  },
});
