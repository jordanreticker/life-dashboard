// ✦ Life pane — the port of the legacy rLife(): the 🏃 Health block (this-week
// activity grid + type buttons + recent sessions), the tabbed Goals / Health
// tasks / Personal card, 💵 Finances (re-added here with the legacy fin-modal
// behavior), the 📓 Journal (today's entry + lockable past entries), and the
// 📖 Paigecyclopedia notes. All numbers on screen are derived from raw store
// rows at render time; every write is per-row through src/utils/supabase/db.

import { useEffect, useMemo, useRef, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { EncycCard } from '@/components/life/EncycCard';
import { FinancesCard } from '@/components/life/FinancesCard';
import { GoalsSection } from '@/components/life/GoalsSection';
import { HealthWeekCard } from '@/components/life/HealthWeekCard';
import { JournalCard } from '@/components/life/JournalCard';
import { LogActivitySheet } from '@/components/life/LogActivitySheet';
import { MiniTaskSection } from '@/components/life/MiniTaskSection';
import { PastEntriesCard } from '@/components/life/PastEntriesCard';
import { SecDivider } from '@/components/life/shared';
import { Card, Loading, PaneTitle, Screen } from '@/components/ui';
import { useTheme } from '@/hooks/use-theme';
import { useDataStore } from '@/stores/dataStore';
import { fonts } from '@/theme';
import { fmtDate, todayIso } from '@/utils/dates';

type LifeTab = 'goals' | 'health' | 'personal';

export default function LifeScreen() {
  const { palette } = useTheme();
  const { loaded, loading, loadAll, tasks, healthGoals } = useDataStore();

  const [lifeTab, setLifeTab] = useState<LifeTab>('goals'); // legacy D.lifeTab
  const [actType, setActType] = useState<string | null>(null);

  // Transient toast (the legacy toast()).
  const [toast, setToast] = useState<string | null>(null);
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const showToast = (msg: string) => {
    if (toastTimer.current) clearTimeout(toastTimer.current);
    setToast(msg);
    toastTimer.current = setTimeout(() => setToast(null), 2400);
  };
  useEffect(
    () => () => {
      if (toastTimer.current) clearTimeout(toastTimer.current);
    },
    [],
  );

  useEffect(() => {
    if (!loaded) loadAll();
  }, [loaded, loadAll]);

  const today = todayIso();
  const todayLabel = fmtDate(today);

  // Tab counts (legacy lifeTabBtn counts: goals / open health / open personal).
  const counts = useMemo(() => {
    const openIn = (section: string) =>
      tasks.filter(
        (t) =>
          t.section === section &&
          !t.done &&
          (!t.scheduled_for || t.scheduled_for === todayLabel),
      ).length;
    return { goals: healthGoals.length, health: openIn('health'), personal: openIn('personal') };
  }, [tasks, healthGoals, todayLabel]);

  const tabs: { key: LifeTab; emoji: string; label: string; count: number }[] = [
    { key: 'goals', emoji: '🎯', label: 'Goals', count: counts.goals },
    { key: 'health', emoji: '🏃', label: 'Health tasks', count: counts.health },
    { key: 'personal', emoji: '✦', label: 'Personal', count: counts.personal },
  ];

  return (
    <View style={{ flex: 1 }}>
      <Screen onRefresh={loadAll} refreshing={loading && loaded}>
        <PaneTitle title="✦ Life" />

        {!loaded ? (
          <Loading label="loading life…" />
        ) : (
          <>
            <SecDivider label="🏃 Health" />
            <HealthWeekCard onLogType={setActType} />

            {/* Tabbed Goals / Health tasks / Personal (legacy default: goals). */}
            <Card>
              <View style={[styles.tabRow, { borderBottomColor: palette.border }]}>
                {tabs.map((t) => {
                  const active = lifeTab === t.key;
                  return (
                    <Pressable
                      key={t.key}
                      onPress={() => setLifeTab(t.key)}
                      style={[
                        styles.tab,
                        active && { borderBottomColor: palette.health, borderBottomWidth: 2 },
                      ]}
                    >
                      <Text
                        style={[
                          styles.tabText,
                          { color: active ? palette.health : palette.text3 },
                          active && { fontFamily: fonts.monoMedium },
                        ]}
                      >
                        {t.emoji} {t.label} ({t.count})
                      </Text>
                    </Pressable>
                  );
                })}
              </View>
              {lifeTab === 'goals' ? <GoalsSection onToast={showToast} /> : null}
              {lifeTab === 'health' ? (
                <MiniTaskSection section="health" accent={palette.health} onToast={showToast} />
              ) : null}
              {lifeTab === 'personal' ? (
                <MiniTaskSection section="personal" accent={palette.personal} onToast={showToast} />
              ) : null}
            </Card>

            <SecDivider label="💵 Finances" />
            <FinancesCard onToast={showToast} />

            <SecDivider label="📓 Journal" />
            <JournalCard onToast={showToast} />
            <PastEntriesCard onToast={showToast} />

            <SecDivider label="📖 Encyclopedia" />
            <EncycCard onToast={showToast} />
          </>
        )}

        <LogActivitySheet type={actType} onClose={() => setActType(null)} onToast={showToast} />
      </Screen>

      {toast ? (
        <View pointerEvents="none" style={styles.toastWrap}>
          <View style={[styles.toast, { backgroundColor: palette.text1 }]}>
            <Text style={{ fontFamily: fonts.sansMedium, fontSize: 12, color: palette.bg }}>
              {toast}
            </Text>
          </View>
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  tabRow: {
    flexDirection: 'row',
    borderBottomWidth: StyleSheet.hairlineWidth,
    marginBottom: 8,
  },
  tab: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 2,
  },
  tabText: {
    fontFamily: fonts.mono,
    fontSize: 11,
    textAlign: 'center',
  },
  toastWrap: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 24,
    alignItems: 'center',
  },
  toast: {
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: 20,
    maxWidth: '86%',
  },
});
