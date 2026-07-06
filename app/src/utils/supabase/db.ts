import type { PostgrestError } from '@supabase/supabase-js';

import { supabase } from './client';

import type { Database, Tables, TablesInsert, TablesUpdate } from './database.types';

// ALL Supabase queries live in this file, grouped into typed query objects —
// one object per table (context/agent-rules.md §4). Screens and hooks must
// never call the raw supabase client directly; add a method here instead.
// Writes are per-row — the legacy whole-blob save model is gone.

export type Task = Tables<'tasks'>;
export type Chore = Tables<'chores'>;
export type ChoreLogEntry = Tables<'chore_log'>;
export type Person = Tables<'people'>;
export type ContactLogEntry = Tables<'contact_log'>;
export type Activity = Tables<'activities'>;
export type Question = Tables<'questions'>;
export type QuestionAnswer = Tables<'question_answers'>;
export type FinanceEntry = Tables<'finance_entries'>;
export type JournalEntry = Tables<'journal_entries'>;
export type RelAct = Tables<'rel_acts'>;
export type EncycNote = Tables<'encyc_notes'>;
export type HealthGoal = Tables<'health_goals'>;
export type HealthGoalLog = Tables<'health_goal_logs'>;
export type ImportantDate = Tables<'important_dates'>;
export type Focus = Tables<'focuses'>;
export type PaigeAction = Tables<'paige_actions'>;
export type ListItem = Tables<'list_items'>;
export type DateIdea = Tables<'date_ideas'>;
export type Recipe = Tables<'recipes'>;
export type RecipeIngredient = Tables<'recipe_ingredients'>;
export type ProfileStats = Tables<'profile_stats'>;
export type WeeklyStats = Tables<'weekly_stats'>;
export type InboxLogEntry = Tables<'inbox_log'>;
export type DayResult = Tables<'day_results'>;
export type XpValue = Tables<'xp_values'>;
export type AppSetting = Tables<'app_settings'>;

type TableName = keyof Database['public']['Tables'];

export type ListResult<T> = { data: T[] | null; error: PostgrestError | null };
export type RowResult<T> = { data: T | null; error: PostgrestError | null };
export type DeleteResult = { error: PostgrestError | null };

// Generic per-row CRUD. The `as any` on `from()` sidesteps supabase-js's
// generic-name variance; the exported method signatures stay fully typed.
const table = <N extends TableName>(
  name: N,
  { orderBy = 'created_at', ascending = false }: { orderBy?: string; ascending?: boolean } = {},
) => {
  const t = () => supabase.from(name) as any;
  return {
    list: (): Promise<ListResult<Tables<N>>> => t().select('*').order(orderBy, { ascending }),
    insert: (row: TablesInsert<N>): Promise<RowResult<Tables<N>>> =>
      t().insert(row).select().single(),
    update: (id: string, patch: TablesUpdate<N>): Promise<RowResult<Tables<N>>> =>
      t().update(patch).eq('id', id).select().single(),
    remove: (id: string): Promise<DeleteResult> => t().delete().eq('id', id),
  };
};

export const tasks = table('tasks');
export const chores = table('chores', { orderBy: 'name', ascending: true });
export const choreLog = table('chore_log', { orderBy: 'date' });
export const people = {
  ...table('people'),
  list: (): Promise<ListResult<Person>> =>
    (supabase.from('people') as any).select('*').order('sort_order').order('name'),
};
export const contactLog = table('contact_log', { orderBy: 'date' });
export const activities = table('activities', { orderBy: 'date' });
export const questions = table('questions', { orderBy: 'created_at', ascending: true });
export const questionAnswers = table('question_answers', { orderBy: 'date' });
export const financeEntries = table('finance_entries');
export const journalEntries = table('journal_entries', { orderBy: 'date' });
export const relActs = table('rel_acts', { orderBy: 'name', ascending: true });
export const encycNotes = table('encyc_notes', { orderBy: 'sort_order', ascending: true });
export const healthGoals = table('health_goals', { orderBy: 'created_at', ascending: true });
export const importantDates = table('important_dates', { orderBy: 'date', ascending: true });
export const focuses = table('focuses', { orderBy: 'sort_order', ascending: true });
export const paigeActions = table('paige_actions', { orderBy: 'date' });
export const listItems = {
  ...table('list_items'),
  list: (): Promise<ListResult<ListItem>> =>
    (supabase.from('list_items') as any).select('*').order('sort_order').order('added_date'),
};
export const dateIdeas = table('date_ideas');
export const recipes = table('recipes', { orderBy: 'name', ascending: true });
export const recipeIngredients = {
  ...table('recipe_ingredients', { orderBy: 'sort_order', ascending: true }),
  removeByRecipe: (recipeId: string): Promise<DeleteResult> =>
    (supabase.from('recipe_ingredients') as any).delete().eq('recipe_id', recipeId),
};

export const healthGoalLogs = {
  list: (): Promise<ListResult<HealthGoalLog>> =>
    (supabase.from('health_goal_logs') as any).select('*').order('date'),
  insert: (row: TablesInsert<'health_goal_logs'>): Promise<RowResult<HealthGoalLog>> =>
    (supabase.from('health_goal_logs') as any).insert(row).select().single(),
  remove: (id: string): Promise<DeleteResult> =>
    (supabase.from('health_goal_logs') as any).delete().eq('id', id),
  removeByGoalDate: (goalId: string, date: string): Promise<DeleteResult> =>
    (supabase.from('health_goal_logs') as any).delete().eq('goal_id', goalId).eq('date', date),
  // week reset clears all logs (legacy behavior)
  clear: (): Promise<DeleteResult> =>
    (supabase.from('health_goal_logs') as any).delete().gte('date', '1900-01-01'),
};

// Single-row table: read it once, update by id.
export const profileStats = {
  get: (): Promise<RowResult<ProfileStats>> =>
    (supabase.from('profile_stats') as any).select('*').single(),
  update: (id: string, patch: TablesUpdate<'profile_stats'>): Promise<RowResult<ProfileStats>> =>
    (supabase.from('profile_stats') as any).update(patch).eq('id', id).select().single(),
};

// Natural-key tables (no uuid id): upsert on their primary key.
export const weeklyStats = {
  list: (): Promise<ListResult<WeeklyStats>> =>
    (supabase.from('weekly_stats') as any).select('*').order('week_start', { ascending: false }),
  upsert: (row: TablesInsert<'weekly_stats'>): Promise<RowResult<WeeklyStats>> =>
    (supabase.from('weekly_stats') as any).upsert(row).select().single(),
};

export const inboxLog = {
  list: (): Promise<ListResult<InboxLogEntry>> =>
    (supabase.from('inbox_log') as any).select('*').order('date'),
  upsert: (row: TablesInsert<'inbox_log'>): Promise<RowResult<InboxLogEntry>> =>
    (supabase.from('inbox_log') as any).upsert(row).select().single(),
};

export const dayResults = {
  list: (): Promise<ListResult<DayResult>> =>
    (supabase.from('day_results') as any).select('*').order('date'),
  upsert: (row: TablesInsert<'day_results'>): Promise<RowResult<DayResult>> =>
    (supabase.from('day_results') as any).upsert(row).select().single(),
  remove: (date: string): Promise<DeleteResult> =>
    (supabase.from('day_results') as any).delete().eq('date', date),
};

export const xpValues = {
  list: (): Promise<ListResult<XpValue>> =>
    (supabase.from('xp_values') as any).select('*').order('key'),
  upsert: (row: TablesInsert<'xp_values'>): Promise<RowResult<XpValue>> =>
    (supabase.from('xp_values') as any).upsert(row).select().single(),
  remove: (key: string): Promise<DeleteResult> =>
    (supabase.from('xp_values') as any).delete().eq('key', key),
};

export const appSettings = {
  get: (key: string): Promise<RowResult<AppSetting>> =>
    (supabase.from('app_settings') as any).select('*').eq('key', key).maybeSingle(),
  set: (key: string, value: string): Promise<RowResult<AppSetting>> =>
    (supabase.from('app_settings') as any).upsert({ key, value }).select().single(),
};
