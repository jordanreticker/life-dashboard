// Log-activity sheet (legacy #act-modal / openActModal): date (defaults to
// today), notes, duration, and per-game bowling scores (up to 8) for bowling.
// XP is type-based — bowling/volleyball are low-impact — stored on the row and
// awarded through xp.ts (awardActivityLogged bumps all_time_activities and the
// streak, exactly like the legacy confirm handler).

import { useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { DateField, SheetTitle } from '@/components/life/shared';
import { Mono } from '@/components/summary/shared';
import { BottomSheet, Button, TextField } from '@/components/ui';
import { useTheme } from '@/hooks/use-theme';
import { useDataStore } from '@/stores/dataStore';
import { fmtDate, todayIso } from '@/utils/dates';
import * as db from '@/utils/supabase/db';
import { awardActivityLogged, xpValue } from '@/utils/xp';

export function LogActivitySheet({
  type,
  onClose,
  onToast,
}: {
  type: string | null; // null = hidden
  onClose: () => void;
  onToast: (msg: string) => void;
}) {
  const { palette } = useTheme();
  const upsertRow = useDataStore((s) => s.upsertRow);

  const [date, setDate] = useState(todayIso());
  const [notes, setNotes] = useState('');
  const [duration, setDuration] = useState('');
  const [games, setGames] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);

  const isBowling = !!type && type.includes('bowling');

  // Reset the form whenever the sheet opens (legacy openActModal).
  useEffect(() => {
    if (type) {
      setDate(todayIso());
      setNotes('');
      setDuration('');
      setGames(type.includes('bowling') ? [''] : []);
      setSaving(false);
    }
  }, [type]);

  const actXp = type
    ? type.includes('bowling') || type.includes('volleyball')
      ? xpValue('activity_lowimpact')
      : xpValue('activity_workout')
    : 0;

  const logIt = async () => {
    if (!type || saving) return; // guard against double-tap
    setSaving(true);
    const gameScores = isBowling
      ? games
          .slice(0, 8)
          .map((g) => g.trim())
          .filter((g) => g !== '')
          .map((g) => Number(g) || 0)
      : [];
    const { data, error } = await db.activities.insert({
      type,
      date,
      notes,
      duration,
      xp: actXp,
      games: gameScores,
    });
    if (error || !data) {
      setSaving(false);
      onToast('Save failed');
      return;
    }
    upsertRow('activities', data);
    const { xp } = await awardActivityLogged(data);
    onClose();
    const dateLabel = date !== todayIso() ? ' on ' + fmtDate(date) : '';
    onToast(`💪 Logged${dateLabel}! +${xp} XP`);
  };

  return (
    <BottomSheet visible={!!type} onClose={onClose}>
      <SheetTitle title="Log activity" sub={type ?? ''} />

      <View style={styles.row}>
        <Mono size={11} color={palette.text2}>
          When:
        </Mono>
        <DateField value={date} onChange={setDate} style={{ flex: 1 }} />
      </View>
      <TextField
        placeholder="Notes (optional)"
        value={notes}
        onChangeText={setNotes}
        style={styles.field}
      />
      <TextField
        placeholder="Duration (e.g. 45 min)"
        value={duration}
        onChangeText={setDuration}
        style={styles.field}
      />

      {isBowling ? (
        <View style={styles.field}>
          <Mono size={11} color={palette.text2} style={{ marginBottom: 6 }}>
            🎳 Games
          </Mono>
          {games.map((g, i) => (
            <TextField
              key={i}
              placeholder={`Game ${i + 1} score`}
              value={g}
              onChangeText={(v) => setGames((gs) => gs.map((x, j) => (j === i ? v : x)))}
              keyboardType="number-pad"
              style={{ marginBottom: 6 }}
            />
          ))}
          {games.length < 8 ? (
            <Pressable onPress={() => setGames((gs) => [...gs, ''])} hitSlop={6}>
              <Text style={{ fontSize: 12, color: palette.text2 }}>+ add game</Text>
            </Pressable>
          ) : null}
        </View>
      ) : null}

      <Button
        title={saving ? 'Logging...' : `Log it +${actXp} XP`}
        onPress={logIt}
        disabled={saving}
        variant="accent"
        accentColor={palette.health}
        style={{ marginTop: 4 }}
      />
      <Button title="Cancel" onPress={onClose} variant="ghost" style={{ marginTop: 8 }} />
    </BottomSheet>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  field: {
    marginBottom: 8,
  },
});
