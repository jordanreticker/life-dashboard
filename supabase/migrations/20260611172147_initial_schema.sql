-- Initial schema: Sheets -> Supabase migration (see context/supabase-migration.md)
--
-- Conventions, applied uniformly:
--   * id uuid primary key default gen_random_uuid()  (except natural-key tables:
--     weekly_stats, inbox_log, day_results, xp_values, app_settings)
--   * user_id uuid not null default auth.uid() -> auth.users, RLS owner-only
--   * created_at timestamptz audit column (distinct from legacy date columns,
--     which are imported as *_date / date columns)
--   * Derived data (weeklySummary, chore lastDone) is NOT stored; people.last_contact
--     and rel_acts.last_done are kept as fallback seeds only — logs stay authoritative.

-- ── referenced-first tables ──────────────────────────────────────────────────

create table people (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id),
  name text not null,
  tier text not null check (tier in ('family', 'friends', 'work')),
  last_contact date,
  cadence_days int check (cadence_days > 0),
  created_at timestamptz not null default now()
);

create table chores (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id),
  name text not null,
  interval_days int not null default 7,
  xp_value numeric not null default 0,
  created_at timestamptz not null default now()
);

create table questions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id),
  question text not null,
  created_at timestamptz not null default now()
);

create table health_goals (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id),
  name text not null,
  target int not null default 7,
  created_at timestamptz not null default now()
);

-- ── core collections ─────────────────────────────────────────────────────────

create table tasks (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id),
  section text not null check (section in ('paige', 'work', 'community_family', 'community_friends', 'health', 'personal')),
  text text not null,
  done boolean not null default false,
  priority text check (priority in ('low', 'medium', 'high', 'urgent')),
  due_date date,
  person_id uuid references people (id) on delete set null,
  tags text[] not null default '{}',
  scheduled_for text,
  created_date date,
  completed_date date,
  proactive_points numeric not null default 0,
  xp_value numeric not null default 5,
  recurrence text,
  notes text not null default '',
  created_at timestamptz not null default now()
);
create index tasks_person_id_idx on tasks (person_id);

create table chore_log (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id),
  chore_id uuid references chores (id) on delete set null,
  chore_name text not null default '',
  date date not null,
  xp_earned numeric not null default 0,
  proactive_points numeric not null default 0,
  created_at timestamptz not null default now()
);
create index chore_log_chore_id_idx on chore_log (chore_id);

create table contact_log (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id),
  person_id uuid references people (id) on delete set null,
  person_name text not null default '',
  type text not null check (type in ('text', 'call', 'hangout')),
  note text not null default '',
  date date not null,
  xp numeric not null default 0,
  created_at timestamptz not null default now()
);
create index contact_log_person_id_idx on contact_log (person_id);

create table activities (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id),
  type text not null,
  date date,
  notes text not null default '',
  duration text not null default '',
  xp numeric,
  games int[] not null default '{}', -- legacy game1..game8 (bowling scores)
  created_at timestamptz not null default now()
);

create table question_answers (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id),
  question_id uuid references questions (id) on delete set null,
  question text not null default '', -- denormalized, like legacy
  answer text not null default '',
  date date,
  created_at timestamptz not null default now()
);

create table health_goal_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id),
  goal_id uuid not null references health_goals (id) on delete cascade,
  date date not null,
  created_at timestamptz not null default now(),
  unique (goal_id, date)
);

-- ── single-row profile / stats ───────────────────────────────────────────────

create table profile_stats (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) unique,
  xp numeric not null default 0,
  level int not null default 1,
  streak_days int not null default 0,
  best_streak int not null default 0,
  last_active_date date,
  badges text[] not null default '{}',
  proactive_points numeric not null default 0,
  total_tasks_done int not null default 0,
  total_chores_done int not null default 0,
  total_activities int not null default 0,
  all_time_tasks_done int not null default 0,
  all_time_chores_done int not null default 0,
  all_time_activities int not null default 0,
  weekly_badge_history jsonb not null default '{}',
  weekly_badge_last_earned jsonb not null default '{}',
  created_at timestamptz not null default now()
);

-- ── remaining collections ────────────────────────────────────────────────────

create table finance_entries (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id),
  category text not null default '',
  label text not null default '',
  amount numeric not null default 0,
  type text check (type in ('expense', 'income', 'savings')),
  notes text not null default '',
  updated_date date,
  created_at timestamptz not null default now()
);

create table journal_entries (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id),
  date date not null,
  text text not null default '',
  mood text not null default '',
  title text not null default '',
  created_at timestamptz not null default now()
);

create table weekly_stats (
  week_start date primary key,
  user_id uuid not null default auth.uid() references auth.users (id),
  tasks_done int not null default 0,
  chores_done int not null default 0,
  activities_logged int not null default 0,
  contacts_logged int not null default 0,
  xp_earned numeric not null default 0,
  proactive_points numeric not null default 0,
  created_at timestamptz not null default now()
);

create table rel_acts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id),
  name text not null,
  interval_days int not null default 7,
  last_done date, -- no log table exists for rel acts; this column is authoritative
  created_at timestamptz not null default now()
);

create table encyc_notes (
  id uuid primary key default gen_random_uuid(), -- legacy rows had no ids (positional)
  user_id uuid not null default auth.uid() references auth.users (id),
  text text not null,
  cat text not null default '',
  done boolean not null default false,
  completed_note text not null default '',
  sort_order int not null default 0,
  created_at timestamptz not null default now()
);

create table inbox_log (
  date date primary key,
  user_id uuid not null default auth.uid() references auth.users (id),
  count int not null default 0,
  created_at timestamptz not null default now()
);

create table day_results (
  date date primary key,
  user_id uuid not null default auth.uid() references auth.users (id),
  result text check (result in ('win', 'loss')), -- null = not yet decided
  stat1 text not null default '',
  stat2 text not null default '',
  stat3 text not null default '',
  notes text not null default '',
  created_at timestamptz not null default now()
);

create table important_dates (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id),
  name text not null,
  date date not null,
  recur text not null default '' check (recur in ('', 'annual')),
  notes text not null default '',
  created_at timestamptz not null default now()
);

create table focuses (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id),
  text text not null,
  notes text not null default '',
  status text not null default 'active' check (status in ('active', 'completed', 'archived')),
  created_date date,
  completed_date date,
  reactivated_date date,
  sort_order int not null default 0,
  created_at timestamptz not null default now()
);

create table paige_actions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id),
  kind text not null check (kind in ('focus_hit', 'fight', 'mistake')),
  date date not null,
  xp numeric not null default 0,
  created_at timestamptz not null default now()
);

create table list_items (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id),
  list text not null check (list in ('shopping', 'grocery')),
  text text not null,
  done boolean not null default false,
  added_date date,
  staple boolean not null default false,
  created_at timestamptz not null default now()
);

create table xp_values (
  key text primary key,
  user_id uuid not null default auth.uid() references auth.users (id),
  value numeric not null,
  description text not null default '',
  created_at timestamptz not null default now()
);

create table date_ideas (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id),
  text text not null,
  pre_rating numeric not null default 0,
  date date,
  notes text not null default '',
  final_rating numeric not null default 0,
  starred boolean not null default false,
  status text not null default 'idea' check (status in ('idea', 'done')),
  created_at timestamptz not null default now()
);

create table app_settings (
  key text primary key, -- e.g. 'journal_lock_hash'
  user_id uuid not null default auth.uid() references auth.users (id),
  value text not null default '',
  created_at timestamptz not null default now()
);

-- ── RLS: every table owner-only (anon key is public; this is the security boundary)

do $$
declare
  t text;
begin
  foreach t in array array[
    'people', 'chores', 'questions', 'health_goals', 'tasks', 'chore_log',
    'contact_log', 'activities', 'question_answers', 'health_goal_logs',
    'profile_stats', 'finance_entries', 'journal_entries', 'weekly_stats',
    'rel_acts', 'encyc_notes', 'inbox_log', 'day_results', 'important_dates',
    'focuses', 'paige_actions', 'list_items', 'xp_values', 'date_ideas',
    'app_settings'
  ] loop
    execute format('alter table %I enable row level security', t);
    execute format(
      'create policy owner_all on %I for all to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid())',
      t
    );
  end loop;
end $$;
