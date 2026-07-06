// 🏠 Home pane — the port of the legacy chores tab (rChores): grocery/shopping
// lists (with the ranked shopping want-list + reorder mode), home tasks, the
// you-vs-Paige weekly split, recurring chores and ordering/restock items with
// freshness bars, plus the recipe manager / picker. This is the pane Paige
// mode restricts to: edit/reorder/delete controls hide, completion sheets
// default to "Paige did it", and a long-press on the title exits the mode.

import { useEffect, useMemo, useState } from 'react';
import { Alert } from 'react-native';

import { ChoreCompletionSheet } from '@/components/home/ChoreCompletionSheet';
import { ChoreEditSheet } from '@/components/home/ChoreEditSheet';
import { ChoreLogSheet } from '@/components/home/ChoreLogSheet';
import { ChoresCard } from '@/components/home/ChoresCard';
import { HomeTasksCard } from '@/components/home/HomeTasksCard';
import { ListsCard } from '@/components/home/ListsCard';
import { RecipeDetailSheet } from '@/components/home/RecipeDetailSheet';
import { RecipeEditSheet, type RecipeEditTarget } from '@/components/home/RecipeEditSheet';
import { RecipeManageSheet } from '@/components/home/RecipeManageSheet';
import { RecipePickerSheet } from '@/components/home/RecipePickerSheet';
import { SplitCard } from '@/components/home/SplitCard';
import { TaskDoneSheet } from '@/components/home/TaskDoneSheet';
import { Loading, PaneTitle, Screen } from '@/components/ui';
import { useDataStore } from '@/stores/dataStore';
import { usePaigeModeStore } from '@/stores/paigeModeStore';
import { choreLastDoneMap } from '@/utils/compute';
import { getWeekStart, todayIso } from '@/utils/dates';
import * as db from '@/utils/supabase/db';
import type { Chore, ChoreLogEntry, Task } from '@/utils/supabase/db';

export default function HomeScreen() {
  const loaded = useDataStore((s) => s.loaded);
  const loading = useDataStore((s) => s.loading);
  const loadAll = useDataStore((s) => s.loadAll);
  const chores = useDataStore((s) => s.chores);
  const choreLog = useDataStore((s) => s.choreLog);
  const tasks = useDataStore((s) => s.tasks);
  const upsertRow = useDataStore((s) => s.upsertRow);
  const removeRow = useDataStore((s) => s.removeRow);
  const paigeMode = usePaigeModeStore((s) => s.active);
  const disablePaigeMode = usePaigeModeStore((s) => s.disable);

  useEffect(() => {
    if (!loaded) loadAll();
  }, [loaded, loadAll]);

  // ── Pane UI state (legacy D.* flags) ────────────────────────────────────────
  const [selectedChoreId, setSelectedChoreId] = useState<string | null>(null);
  const [choresExpanded, setChoresExpanded] = useState(false);
  const [orderingExpanded, setOrderingExpanded] = useState(false);

  // Sheets
  const [completingChore, setCompletingChore] = useState<Chore | null>(null);
  const [editingChore, setEditingChore] = useState<Chore | null>(null);
  const [logEntry, setLogEntry] = useState<ChoreLogEntry | null>(null);
  const [doneTask, setDoneTask] = useState<Task | null>(null);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [pickerPreId, setPickerPreId] = useState<string | null>(null);
  const [manageOpen, setManageOpen] = useState(false);
  const [detailId, setDetailId] = useState<string | null>(null);
  const [recipeEdit, setRecipeEdit] = useState<RecipeEditTarget>(null);
  const [editReturnsToManage, setEditReturnsToManage] = useState(false);

  const today = todayIso();
  const weekStart = getWeekStart(today);
  const lastDoneByChore = useMemo(() => choreLastDoneMap(choreLog), [choreLog]);

  const choreItems = chores.filter((c) => c.kind !== 'ordering');
  const orderItems = chores.filter((c) => c.kind === 'ordering');

  // ── Chore actions ───────────────────────────────────────────────────────────
  const addChore = async (name: string, intervalDays: number, xp: number) => {
    const { data, error } = await db.chores.insert({
      name,
      interval_days: intervalDays,
      xp_value: xp,
      kind: 'chore',
    });
    if (error || !data) return;
    upsertRow('chores', data);
  };

  const deleteChore = async (chore: Chore) => {
    // Legacy deleteChore is immediate (the ✕ only appears on a selected row).
    const { error } = await db.chores.remove(chore.id);
    if (error) return;
    removeRow('chores', chore.id);
    if (selectedChoreId === chore.id) setSelectedChoreId(null);
  };

  // ── Paige mode exit: long-press the pane title (legacy bindLongPress) ───────
  const onTitleLongPress = () => {
    if (!paigeMode) return;
    Alert.alert('Exit Paige mode?', 'Return to the full app?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Exit', style: 'destructive', onPress: () => disablePaigeMode() },
    ]);
  };

  const choresCardShared = {
    choreLog,
    lastDoneByChore,
    selectedId: selectedChoreId,
    onSelect: setSelectedChoreId,
    onComplete: setCompletingChore,
    onEdit: (c: Chore) => setEditingChore(c),
    onDelete: deleteChore,
    paigeMode,
  };

  return (
    <Screen onRefresh={loadAll} refreshing={loading && loaded}>
      <PaneTitle title="🏠 Home" onLongPress={onTitleLongPress} />

      {!loaded ? (
        <Loading label="loading the household…" />
      ) : (
        <>
          <ListsCard
            paigeMode={paigeMode}
            onOpenRecipePicker={() => {
              setPickerPreId(null);
              setPickerOpen(true);
            }}
            onOpenRecipeManage={() => setManageOpen(true)}
          />

          <HomeTasksCard paigeMode={paigeMode} onCompleteRequest={setDoneTask} />

          <SplitCard
            choreLog={choreLog}
            tasks={tasks}
            weekStart={weekStart}
            paigeMode={paigeMode}
            onEditLogEntry={setLogEntry}
          />

          <ChoresCard
            emoji="🧹"
            title="Recurring chores"
            chores={choreItems}
            expanded={choresExpanded}
            onToggleExpanded={setChoresExpanded}
            emptyMsg="no chores"
            showAdd
            onAdd={addChore}
            {...choresCardShared}
          />

          {orderItems.length ? (
            <ChoresCard
              emoji="📦"
              title="Ordering / restock"
              chores={orderItems}
              expanded={orderingExpanded}
              onToggleExpanded={setOrderingExpanded}
              emptyMsg="no ordering tasks"
              {...choresCardShared}
            />
          ) : null}
        </>
      )}

      {/* ── Sheets ── */}
      <ChoreCompletionSheet chore={completingChore} onClose={() => setCompletingChore(null)} />
      <ChoreEditSheet chore={editingChore} onClose={() => setEditingChore(null)} />
      <ChoreLogSheet entry={logEntry} onClose={() => setLogEntry(null)} />
      <TaskDoneSheet task={doneTask} onClose={() => setDoneTask(null)} />

      <RecipePickerSheet
        visible={pickerOpen}
        preselectId={pickerPreId}
        onClose={() => setPickerOpen(false)}
      />
      <RecipeManageSheet
        visible={manageOpen}
        onClose={() => setManageOpen(false)}
        onOpenDetail={(r) => {
          // legacy openRecipeDetail: close manage, open the full-screen detail
          setManageOpen(false);
          setDetailId(r.id);
        }}
        onEdit={(r) => {
          setManageOpen(false);
          setEditReturnsToManage(true);
          setRecipeEdit(r);
        }}
        onNew={() => {
          setManageOpen(false);
          setEditReturnsToManage(true);
          setRecipeEdit('new');
        }}
      />
      <RecipeDetailSheet
        recipeId={detailId}
        onClose={() => {
          // legacy rd-back returns to the manage list
          setDetailId(null);
          setManageOpen(true);
        }}
        onEdit={(id) => {
          const r = useDataStore.getState().recipes.find((x) => x.id === id);
          if (!r) return;
          setDetailId(null);
          setEditReturnsToManage(false);
          setRecipeEdit(r);
        }}
        onAddToGrocery={(id) => {
          setDetailId(null);
          setPickerPreId(id);
          setPickerOpen(true);
        }}
      />
      <RecipeEditSheet
        target={recipeEdit}
        onClose={() => {
          const wasEditing = recipeEdit && recipeEdit !== 'new' ? recipeEdit.id : null;
          setRecipeEdit(null);
          if (editReturnsToManage) setManageOpen(true);
          else if (wasEditing) setDetailId(wasEditing);
        }}
      />
    </Screen>
  );
}
