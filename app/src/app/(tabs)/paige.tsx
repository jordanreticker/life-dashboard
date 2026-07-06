// Paige pane — the port of the legacy rPaige() view, section order preserved:
// health bar (+ action buttons), household chore split, recent paige actions,
// active/past focuses, tasks ⇄ rel acts tabs, important dates, date ideas,
// Paigecyclopedia, and the daily question. All data flows from the central
// store; writes go per-row through db.ts and are reflected back immediately.

import { useEffect } from 'react';

import { ChoreSplitCard } from '@/components/paige/ChoreSplitCard';
import { DateIdeasCard } from '@/components/paige/DateIdeasCard';
import { EncycCard } from '@/components/paige/EncycCard';
import { FocusesCard } from '@/components/paige/FocusesCard';
import { HealthCard, RecentActionsCard } from '@/components/paige/HealthCard';
import { ImportantDatesCard } from '@/components/paige/ImportantDatesCard';
import { QuestionCard } from '@/components/paige/QuestionCard';
import { TasksRelActsCard } from '@/components/paige/TasksRelActsCard';
import { Loading, PaneTitle, Screen } from '@/components/ui';
import { useDataStore } from '@/stores/dataStore';

export default function PaigeScreen() {
  const { loaded, loading, loadAll } = useDataStore();

  useEffect(() => {
    if (!loaded) loadAll();
  }, [loaded, loadAll]);

  return (
    <Screen onRefresh={loadAll} refreshing={loading && loaded}>
      <PaneTitle title="💕 Paige" />
      {!loaded ? (
        <Loading label="loading…" />
      ) : (
        <>
          <HealthCard />
          <ChoreSplitCard />
          <RecentActionsCard />
          <FocusesCard />
          <TasksRelActsCard />
          <ImportantDatesCard />
          <DateIdeasCard />
          <EncycCard />
          <QuestionCard />
        </>
      )}
    </Screen>
  );
}
