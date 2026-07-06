import { create } from 'zustand';

import * as db from '@/utils/supabase/db';
import type {
  Activity,
  AppSetting,
  Chore,
  ChoreLogEntry,
  ContactLogEntry,
  DateIdea,
  DayResult,
  EncycNote,
  FinanceEntry,
  Focus,
  HealthGoal,
  HealthGoalLog,
  ImportantDate,
  InboxLogEntry,
  JournalEntry,
  ListItem,
  PaigeAction,
  Person,
  ProfileStats,
  Question,
  QuestionAnswer,
  Recipe,
  RecipeIngredient,
  RelAct,
  Task,
  WeeklyStats,
  XpValue,
} from '@/utils/supabase/db';

// Central in-memory dataset, the RN equivalent of the legacy app's loadData():
// everything is fetched once at boot (and on pull-to-refresh); screens derive
// views from these raw rows at render time (pure compute, agent-rules §7).
// Mutation pattern: write the row through db.ts, then reflect it here with
// upsertRow/removeRow — never re-fetch the world after a single-row change.

export interface Collections {
  tasks: Task[];
  chores: Chore[];
  choreLog: ChoreLogEntry[];
  people: Person[];
  contactLog: ContactLogEntry[];
  activities: Activity[];
  questions: Question[];
  questionAnswers: QuestionAnswer[];
  financeEntries: FinanceEntry[];
  journalEntries: JournalEntry[];
  relActs: RelAct[];
  encycNotes: EncycNote[];
  healthGoals: HealthGoal[];
  healthGoalLogs: HealthGoalLog[];
  importantDates: ImportantDate[];
  focuses: Focus[];
  paigeActions: PaigeAction[];
  listItems: ListItem[];
  dateIdeas: DateIdea[];
  recipes: Recipe[];
  recipeIngredients: RecipeIngredient[];
  weeklyStats: WeeklyStats[];
  inboxLog: InboxLogEntry[];
  dayResults: DayResult[];
  xpValues: XpValue[];
}

type CollectionKey = keyof Collections;

// Row identity per collection — most use uuid `id`; natural-key tables differ.
const rowKey: { [K in CollectionKey]?: string } = {
  weeklyStats: 'week_start',
  inboxLog: 'date',
  dayResults: 'date',
  xpValues: 'key',
};

interface DataStore extends Collections {
  loaded: boolean;
  loading: boolean;
  error: string | null;
  profileStats: ProfileStats | null;
  appSettings: AppSetting[];

  loadAll: () => Promise<void>;
  upsertRow: <K extends CollectionKey>(key: K, row: Collections[K][number]) => void;
  removeRow: (key: CollectionKey, id: string) => void;
  setCollection: <K extends CollectionKey>(key: K, rows: Collections[K]) => void;
  setProfileStats: (row: ProfileStats) => void;
}

const emptyCollections: Collections = {
  tasks: [],
  chores: [],
  choreLog: [],
  people: [],
  contactLog: [],
  activities: [],
  questions: [],
  questionAnswers: [],
  financeEntries: [],
  journalEntries: [],
  relActs: [],
  encycNotes: [],
  healthGoals: [],
  healthGoalLogs: [],
  importantDates: [],
  focuses: [],
  paigeActions: [],
  listItems: [],
  dateIdeas: [],
  recipes: [],
  recipeIngredients: [],
  weeklyStats: [],
  inboxLog: [],
  dayResults: [],
  xpValues: [],
};

export const useDataStore = create<DataStore>((set, get) => ({
  ...emptyCollections,
  loaded: false,
  loading: false,
  error: null,
  profileStats: null,
  appSettings: [],

  loadAll: async () => {
    if (get().loading) return;
    set({ loading: true, error: null });
    try {
      const [
        tasks,
        chores,
        choreLog,
        people,
        contactLog,
        activities,
        questions,
        questionAnswers,
        financeEntries,
        journalEntries,
        relActs,
        encycNotes,
        healthGoals,
        healthGoalLogs,
        importantDates,
        focuses,
        paigeActions,
        listItems,
        dateIdeas,
        recipes,
        recipeIngredients,
        weeklyStats,
        inboxLog,
        dayResults,
        xpValues,
        profile,
      ] = await Promise.all([
        db.tasks.list(),
        db.chores.list(),
        db.choreLog.list(),
        db.people.list(),
        db.contactLog.list(),
        db.activities.list(),
        db.questions.list(),
        db.questionAnswers.list(),
        db.financeEntries.list(),
        db.journalEntries.list(),
        db.relActs.list(),
        db.encycNotes.list(),
        db.healthGoals.list(),
        db.healthGoalLogs.list(),
        db.importantDates.list(),
        db.focuses.list(),
        db.paigeActions.list(),
        db.listItems.list(),
        db.dateIdeas.list(),
        db.recipes.list(),
        db.recipeIngredients.list(),
        db.weeklyStats.list(),
        db.inboxLog.list(),
        db.dayResults.list(),
        db.xpValues.list(),
        db.profileStats.get(),
      ]);
      const firstError = [
        tasks, chores, choreLog, people, contactLog, activities, questions,
        questionAnswers, financeEntries, journalEntries, relActs, encycNotes,
        healthGoals, healthGoalLogs, importantDates, focuses, paigeActions,
        listItems, dateIdeas, recipes, recipeIngredients, weeklyStats, inboxLog,
        dayResults, xpValues, profile,
      ].find((r) => r.error)?.error;
      set({
        tasks: tasks.data ?? [],
        chores: chores.data ?? [],
        choreLog: choreLog.data ?? [],
        people: people.data ?? [],
        contactLog: contactLog.data ?? [],
        activities: activities.data ?? [],
        questions: questions.data ?? [],
        questionAnswers: questionAnswers.data ?? [],
        financeEntries: financeEntries.data ?? [],
        journalEntries: journalEntries.data ?? [],
        relActs: relActs.data ?? [],
        encycNotes: encycNotes.data ?? [],
        healthGoals: healthGoals.data ?? [],
        healthGoalLogs: healthGoalLogs.data ?? [],
        importantDates: importantDates.data ?? [],
        focuses: focuses.data ?? [],
        paigeActions: paigeActions.data ?? [],
        listItems: listItems.data ?? [],
        dateIdeas: dateIdeas.data ?? [],
        recipes: recipes.data ?? [],
        recipeIngredients: recipeIngredients.data ?? [],
        weeklyStats: weeklyStats.data ?? [],
        inboxLog: inboxLog.data ?? [],
        dayResults: dayResults.data ?? [],
        xpValues: xpValues.data ?? [],
        profileStats: profile.data ?? null,
        loaded: true,
        loading: false,
        error: firstError ? firstError.message : null,
      });
    } catch (e) {
      set({ loading: false, error: e instanceof Error ? e.message : String(e) });
    }
  },

  upsertRow: (key, row) => {
    const idKey = rowKey[key] ?? 'id';
    const rows = get()[key] as Record<string, unknown>[];
    const r = row as Record<string, unknown>;
    const i = rows.findIndex((x) => x[idKey] === r[idKey]);
    const next = i >= 0 ? [...rows.slice(0, i), row, ...rows.slice(i + 1)] : [...rows, row];
    set({ [key]: next } as Partial<DataStore>);
  },

  removeRow: (key, id) => {
    const idKey = rowKey[key] ?? 'id';
    const rows = get()[key] as Record<string, unknown>[];
    set({ [key]: rows.filter((x) => x[idKey] !== id) } as Partial<DataStore>);
  },

  setCollection: (key, rows) => {
    set({ [key]: rows } as Partial<DataStore>);
  },

  setProfileStats: (row) => set({ profileStats: row }),
}));
