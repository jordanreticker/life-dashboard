// Data layer: the ONLY file that touches supabase.from() (context/agent-rules.md §4).
// One exported object per table; UI code calls these and never supabase directly.
// Writes are per-row — the legacy whole-blob save model is gone.
import { supabase } from './supabaseClient.js'

export const auth = {
  getSession: () => supabase.auth.getSession(),
  onAuthStateChange: (cb) => supabase.auth.onAuthStateChange(cb),
  signIn: (email, password) => supabase.auth.signInWithPassword({ email, password }),
  signOut: () => supabase.auth.signOut(),
}

const table = (name, { orderBy = 'created_at', ascending = false } = {}) => ({
  list: () => supabase.from(name).select('*').order(orderBy, { ascending }),
  insert: (row) => supabase.from(name).insert(row).select().single(),
  update: (id, patch) => supabase.from(name).update(patch).eq('id', id).select().single(),
  remove: (id) => supabase.from(name).delete().eq('id', id),
})

export const tasks = table('tasks')
export const chores = table('chores', { orderBy: 'name', ascending: true })
export const choreLog = table('chore_log', { orderBy: 'date' })
export const people = {
  ...table('people'),
  list: () => supabase.from('people').select('*').order('sort_order').order('name'),
}
export const contactLog = table('contact_log', { orderBy: 'date' })
export const activities = table('activities', { orderBy: 'date' })
export const questions = table('questions', { orderBy: 'created_at', ascending: true })
export const questionAnswers = table('question_answers', { orderBy: 'date' })
export const financeEntries = table('finance_entries')
export const journalEntries = table('journal_entries', { orderBy: 'date' })
export const relActs = table('rel_acts', { orderBy: 'name', ascending: true })
export const encycNotes = table('encyc_notes', { orderBy: 'sort_order', ascending: true })
export const healthGoals = table('health_goals', { orderBy: 'created_at', ascending: true })
export const importantDates = table('important_dates', { orderBy: 'date', ascending: true })
export const focuses = table('focuses', { orderBy: 'sort_order', ascending: true })
export const paigeActions = table('paige_actions', { orderBy: 'date' })
export const listItems = {
  ...table('list_items'),
  list: () => supabase.from('list_items').select('*').order('sort_order').order('added_date'),
}
export const dateIdeas = table('date_ideas')
export const recipes = table('recipes', { orderBy: 'name', ascending: true })
export const recipeIngredients = {
  ...table('recipe_ingredients', { orderBy: 'sort_order', ascending: true }),
  removeByRecipe: (recipeId) =>
    supabase.from('recipe_ingredients').delete().eq('recipe_id', recipeId),
}

export const healthGoalLogs = {
  list: () => supabase.from('health_goal_logs').select('*').order('date'),
  insert: (row) => supabase.from('health_goal_logs').insert(row).select().single(),
  remove: (id) => supabase.from('health_goal_logs').delete().eq('id', id),
  removeByGoalDate: (goalId, date) =>
    supabase.from('health_goal_logs').delete().eq('goal_id', goalId).eq('date', date),
  // week reset clears all logs (legacy behavior)
  clear: () => supabase.from('health_goal_logs').delete().gte('date', '1900-01-01'),
}

// Single-row table: read it once, update by id.
export const profileStats = {
  get: () => supabase.from('profile_stats').select('*').single(),
  update: (id, patch) =>
    supabase.from('profile_stats').update(patch).eq('id', id).select().single(),
}

// Natural-key tables (no uuid id): upsert on their primary key.
export const weeklyStats = {
  list: () => supabase.from('weekly_stats').select('*').order('week_start', { ascending: false }),
  upsert: (row) => supabase.from('weekly_stats').upsert(row).select().single(),
}

export const inboxLog = {
  list: () => supabase.from('inbox_log').select('*').order('date'),
  upsert: (row) => supabase.from('inbox_log').upsert(row).select().single(),
}

export const dayResults = {
  list: () => supabase.from('day_results').select('*').order('date'),
  upsert: (row) => supabase.from('day_results').upsert(row).select().single(),
  remove: (date) => supabase.from('day_results').delete().eq('date', date),
}

export const xpValues = {
  list: () => supabase.from('xp_values').select('*').order('key'),
  upsert: (row) => supabase.from('xp_values').upsert(row).select().single(),
  remove: (key) => supabase.from('xp_values').delete().eq('key', key),
}

export const appSettings = {
  get: (key) => supabase.from('app_settings').select('*').eq('key', key).maybeSingle(),
  set: (key, value) => supabase.from('app_settings').upsert({ key, value }).select().single(),
}
