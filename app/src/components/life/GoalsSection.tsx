// Weekly health goals (legacy rLife 'goals' tab + toggleHealthGoalDay):
// each goal shows a Mon–Sun day row for the current week; tapping a day
// toggles a health_goal_logs row on/off. Toggling ON awards daily XP (or the
// full-week bonus + one-time 'goal_<id>' super badge when the target is hit);
// toggling OFF just deletes the log — legacy revokes nothing. Future days are
// blocked. Add form takes a name + days/week target; delete is instant.

import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { Mono } from '@/components/summary/shared';
import { TextField } from '@/components/ui';
import { useTheme } from '@/hooks/use-theme';
import { useDataStore } from '@/stores/dataStore';
import { fonts, radius } from '@/theme';
import { getWeekStart, todayIso, weekDays } from '@/utils/dates';
import * as db from '@/utils/supabase/db';
import type { HealthGoal } from '@/utils/supabase/db';
import { awardHealthGoalDay } from '@/utils/xp';

const DAY_LETTERS = ['M', 'T', 'W', 'T', 'F', 'S', 'S'];

export function GoalsSection({ onToast }: { onToast: (msg: string) => void }) {
  const { palette } = useTheme();
  const { healthGoals, healthGoalLogs, upsertRow, removeRow, setCollection } = useDataStore();

  const [name, setName] = useState('');
  const [target, setTarget] = useState('7');
  const [busyKey, setBusyKey] = useState<string | null>(null);

  const today = todayIso();
  const weekStart = getWeekStart(today);
  const days = weekDays(weekStart);

  const toggleDay = async (g: HealthGoal, iso: string) => {
    if (iso > today) {
      onToast("Can't log future days");
      return;
    }
    const key = g.id + ':' + iso;
    if (busyKey === key) return;
    setBusyKey(key);
    try {
      const existing = healthGoalLogs.find((l) => l.goal_id === g.id && l.date === iso);
      if (existing) {
        // Toggle off — no XP revocation (legacy behavior).
        removeRow('healthGoalLogs', existing.id);
        await db.healthGoalLogs.removeByGoalDate(g.id, iso);
        onToast('Removed');
      } else {
        const { data, error } = await db.healthGoalLogs.insert({ goal_id: g.id, date: iso });
        if (error || !data) {
          onToast('Save failed');
          return;
        }
        upsertRow('healthGoalLogs', data);
        const hitsThisWeek =
          healthGoalLogs.filter(
            (l) => l.goal_id === g.id && l.date >= weekStart && l.date !== iso,
          ).length + 1;
        const res = await awardHealthGoalDay(g, hitsThisWeek);
        const tgt = Number(g.target) || 7;
        if (res.fullWeek) {
          // Legacy only toasts the (one-time) super badge in the full-week branch.
          if (res.superBadgeEarned) onToast(`🌟 Super badge! "${g.name}" — full week!`);
        } else {
          onToast(`✓ ${hitsThisWeek}/${tgt} +${res.xp}XP`);
        }
      }
    } finally {
      setBusyKey(null);
    }
  };

  const addGoal = async () => {
    const n = name.trim();
    if (!n) return;
    const t = Math.max(1, Math.min(7, Number(target) || 7));
    const { data, error } = await db.healthGoals.insert({ name: n, target: t });
    if (error || !data) {
      onToast('Save failed');
      return;
    }
    upsertRow('healthGoals', data);
    setName('');
    setTarget('7');
  };

  const deleteGoal = async (g: HealthGoal) => {
    removeRow('healthGoals', g.id);
    // goal_id is ON DELETE CASCADE — reflect the cascaded log deletes too.
    setCollection(
      'healthGoalLogs',
      healthGoalLogs.filter((l) => l.goal_id !== g.id),
    );
    await db.healthGoals.remove(g.id);
  };

  return (
    <View>
      {!healthGoals.length ? (
        <Mono size={11} color={palette.text3} style={styles.empty}>
          no goals yet — add one below
        </Mono>
      ) : null}

      {healthGoals.map((g) => {
        const hitSet = new Set(
          healthGoalLogs.filter((l) => l.goal_id === g.id && l.date >= weekStart).map((l) => l.date),
        );
        const hit = hitSet.size;
        const tgt = Number(g.target) || 7;
        const full = hit >= tgt;
        return (
          <View key={g.id} style={[styles.goalRow, { borderBottomColor: palette.border }]}>
            <View style={styles.goalTop}>
              <Text style={[styles.goalName, { color: palette.text1 }]}>{g.name}</Text>
              <Mono size={11} color={full ? palette.xp : palette.text2}>
                {hit}/{tgt}
                {full ? ' 🌟' : ''}
              </Mono>
              <Pressable onPress={() => deleteGoal(g)} hitSlop={8}>
                <Text style={{ fontSize: 11, color: palette.danger }}>✕</Text>
              </Pressable>
            </View>
            <View style={styles.dayRow}>
              {days.map((iso, i) => {
                const isHit = hitSet.has(iso);
                const isToday = iso === today;
                const isFuture = iso > today;
                return (
                  <Pressable
                    key={iso}
                    onPress={() => toggleDay(g, iso)}
                    style={[
                      styles.dayBtn,
                      { backgroundColor: palette.card2, borderColor: palette.border },
                      isHit && { backgroundColor: palette.health, borderColor: palette.health },
                      isToday && { borderWidth: 1.5, borderColor: palette.text1 },
                      isFuture && !isHit && { opacity: 0.4 },
                    ]}
                  >
                    <Text
                      style={[
                        styles.dayText,
                        { color: isHit ? '#fff' : palette.text2 },
                        isHit && { fontFamily: fonts.monoMedium },
                      ]}
                    >
                      {DAY_LETTERS[i]}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          </View>
        );
      })}

      <View style={styles.addWrap}>
        <View style={styles.addMain}>
          <TextField
            placeholder="e.g. Go to bed before 11pm"
            value={name}
            onChangeText={setName}
            onSubmitEditing={addGoal}
            returnKeyType="done"
            style={{ flex: 1 }}
          />
          <Pressable onPress={addGoal} style={[styles.addBtn, { backgroundColor: palette.text1 }]}>
            <Text style={{ fontFamily: fonts.sansMedium, fontSize: 13, color: palette.bg }}>
              Add
            </Text>
          </Pressable>
        </View>
        <View style={styles.addExtras}>
          <Mono size={11} color={palette.text2}>
            Target:
          </Mono>
          <TextField
            value={target}
            onChangeText={setTarget}
            keyboardType="number-pad"
            style={{ width: 55, textAlign: 'center' }}
          />
          <Mono size={11} color={palette.text2}>
            days/week
          </Mono>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  empty: {
    paddingVertical: 10,
    paddingHorizontal: 8,
  },
  goalRow: {
    paddingVertical: 10,
    paddingHorizontal: 2,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  goalTop: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 6,
  },
  goalName: {
    flex: 1,
    fontFamily: fonts.sans,
    fontSize: 13,
  },
  dayRow: {
    flexDirection: 'row',
    gap: 4,
  },
  dayBtn: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: radius.sm,
    borderWidth: StyleSheet.hairlineWidth,
    alignItems: 'center',
  },
  dayText: {
    fontFamily: fonts.mono,
    fontSize: 11,
  },
  addWrap: {
    marginTop: 10,
    gap: 8,
  },
  addMain: {
    flexDirection: 'row',
    gap: 8,
  },
  addBtn: {
    borderRadius: radius.md,
    paddingHorizontal: 18,
    justifyContent: 'center',
  },
  addExtras: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
});
