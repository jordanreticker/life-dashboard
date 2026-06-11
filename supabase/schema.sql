-- Current-state schema snapshot of the public schema.
-- GENERATED — do not edit by hand. Regenerate after every `supabase db push`.
-- Source of truth for CURRENT schema; migration files are append-only history.

-- =====================================================
-- TABLES
-- =====================================================

CREATE TABLE activities (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid(),
  type text NOT NULL,
  date date,
  notes text NOT NULL DEFAULT ''::text,
  duration text NOT NULL DEFAULT ''::text,
  xp numeric,
  games integer[] NOT NULL DEFAULT '{}'::integer[],
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

CREATE TABLE app_settings (
  key text NOT NULL,
  user_id uuid NOT NULL DEFAULT auth.uid(),
  value text NOT NULL DEFAULT ''::text,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

CREATE TABLE chore_log (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid(),
  chore_id uuid,
  chore_name text NOT NULL DEFAULT ''::text,
  date date NOT NULL,
  xp_earned numeric NOT NULL DEFAULT 0,
  proactive_points numeric NOT NULL DEFAULT 0,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

CREATE TABLE chores (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid(),
  name text NOT NULL,
  interval_days integer NOT NULL DEFAULT 7,
  xp_value numeric NOT NULL DEFAULT 0,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

CREATE TABLE contact_log (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid(),
  person_id uuid,
  person_name text NOT NULL DEFAULT ''::text,
  type text NOT NULL,
  note text NOT NULL DEFAULT ''::text,
  date date NOT NULL,
  xp numeric NOT NULL DEFAULT 0,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

CREATE TABLE date_ideas (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid(),
  text text NOT NULL,
  pre_rating numeric NOT NULL DEFAULT 0,
  date date,
  notes text NOT NULL DEFAULT ''::text,
  final_rating numeric NOT NULL DEFAULT 0,
  starred boolean NOT NULL DEFAULT false,
  status text NOT NULL DEFAULT 'idea'::text,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

CREATE TABLE day_results (
  date date NOT NULL,
  user_id uuid NOT NULL DEFAULT auth.uid(),
  result text,
  stat1 text NOT NULL DEFAULT ''::text,
  stat2 text NOT NULL DEFAULT ''::text,
  stat3 text NOT NULL DEFAULT ''::text,
  notes text NOT NULL DEFAULT ''::text,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

CREATE TABLE encyc_notes (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid(),
  text text NOT NULL,
  cat text NOT NULL DEFAULT ''::text,
  done boolean NOT NULL DEFAULT false,
  completed_note text NOT NULL DEFAULT ''::text,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

CREATE TABLE finance_entries (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid(),
  category text NOT NULL DEFAULT ''::text,
  label text NOT NULL DEFAULT ''::text,
  amount numeric NOT NULL DEFAULT 0,
  type text,
  notes text NOT NULL DEFAULT ''::text,
  updated_date date,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

CREATE TABLE focuses (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid(),
  text text NOT NULL,
  notes text NOT NULL DEFAULT ''::text,
  status text NOT NULL DEFAULT 'active'::text,
  created_date date,
  completed_date date,
  reactivated_date date,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

CREATE TABLE health_goal_logs (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid(),
  goal_id uuid NOT NULL,
  date date NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

CREATE TABLE health_goals (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid(),
  name text NOT NULL,
  target integer NOT NULL DEFAULT 7,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

CREATE TABLE important_dates (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid(),
  name text NOT NULL,
  date date NOT NULL,
  recur text NOT NULL DEFAULT ''::text,
  notes text NOT NULL DEFAULT ''::text,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

CREATE TABLE inbox_log (
  date date NOT NULL,
  user_id uuid NOT NULL DEFAULT auth.uid(),
  count integer NOT NULL DEFAULT 0,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

CREATE TABLE journal_entries (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid(),
  date date NOT NULL,
  text text NOT NULL DEFAULT ''::text,
  mood text NOT NULL DEFAULT ''::text,
  title text NOT NULL DEFAULT ''::text,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

CREATE TABLE list_items (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid(),
  list text NOT NULL,
  text text NOT NULL,
  done boolean NOT NULL DEFAULT false,
  added_date date,
  staple boolean NOT NULL DEFAULT false,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  sort_order integer NOT NULL DEFAULT 0
);

CREATE TABLE paige_actions (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid(),
  kind text NOT NULL,
  date date NOT NULL,
  xp numeric NOT NULL DEFAULT 0,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

CREATE TABLE people (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid(),
  name text NOT NULL,
  tier text NOT NULL,
  last_contact date,
  cadence_days integer,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  sort_order integer NOT NULL DEFAULT 0
);

CREATE TABLE profile_stats (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid(),
  xp numeric NOT NULL DEFAULT 0,
  level integer NOT NULL DEFAULT 1,
  streak_days integer NOT NULL DEFAULT 0,
  best_streak integer NOT NULL DEFAULT 0,
  last_active_date date,
  badges text[] NOT NULL DEFAULT '{}'::text[],
  proactive_points numeric NOT NULL DEFAULT 0,
  total_tasks_done integer NOT NULL DEFAULT 0,
  total_chores_done integer NOT NULL DEFAULT 0,
  total_activities integer NOT NULL DEFAULT 0,
  all_time_tasks_done integer NOT NULL DEFAULT 0,
  all_time_chores_done integer NOT NULL DEFAULT 0,
  all_time_activities integer NOT NULL DEFAULT 0,
  weekly_badge_history jsonb NOT NULL DEFAULT '{}'::jsonb,
  weekly_badge_last_earned jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

CREATE TABLE question_answers (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid(),
  question_id uuid,
  question text NOT NULL DEFAULT ''::text,
  answer text NOT NULL DEFAULT ''::text,
  date date,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

CREATE TABLE questions (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid(),
  question text NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

CREATE TABLE rel_acts (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid(),
  name text NOT NULL,
  interval_days integer NOT NULL DEFAULT 7,
  last_done date,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

CREATE TABLE tasks (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid(),
  section text NOT NULL,
  text text NOT NULL,
  done boolean NOT NULL DEFAULT false,
  priority text,
  due_date date,
  person_id uuid,
  tags text[] NOT NULL DEFAULT '{}'::text[],
  scheduled_for text,
  created_date date,
  completed_date date,
  proactive_points numeric NOT NULL DEFAULT 0,
  xp_value numeric NOT NULL DEFAULT 5,
  recurrence text,
  notes text NOT NULL DEFAULT ''::text,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

CREATE TABLE weekly_stats (
  week_start date NOT NULL,
  user_id uuid NOT NULL DEFAULT auth.uid(),
  tasks_done integer NOT NULL DEFAULT 0,
  chores_done integer NOT NULL DEFAULT 0,
  activities_logged integer NOT NULL DEFAULT 0,
  contacts_logged integer NOT NULL DEFAULT 0,
  xp_earned numeric NOT NULL DEFAULT 0,
  proactive_points numeric NOT NULL DEFAULT 0,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

CREATE TABLE xp_values (
  key text NOT NULL,
  user_id uuid NOT NULL DEFAULT auth.uid(),
  value numeric NOT NULL,
  description text NOT NULL DEFAULT ''::text,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);


-- =====================================================
-- CONSTRAINTS
-- =====================================================

ALTER TABLE activities ADD CONSTRAINT activities_pkey PRIMARY KEY (id);

ALTER TABLE activities ADD CONSTRAINT activities_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id);

ALTER TABLE app_settings ADD CONSTRAINT app_settings_pkey PRIMARY KEY (key);

ALTER TABLE app_settings ADD CONSTRAINT app_settings_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id);

ALTER TABLE chore_log ADD CONSTRAINT chore_log_chore_id_fkey FOREIGN KEY (chore_id) REFERENCES chores(id) ON DELETE SET NULL;

ALTER TABLE chore_log ADD CONSTRAINT chore_log_pkey PRIMARY KEY (id);

ALTER TABLE chore_log ADD CONSTRAINT chore_log_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id);

ALTER TABLE chores ADD CONSTRAINT chores_pkey PRIMARY KEY (id);

ALTER TABLE chores ADD CONSTRAINT chores_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id);

ALTER TABLE contact_log ADD CONSTRAINT contact_log_person_id_fkey FOREIGN KEY (person_id) REFERENCES people(id) ON DELETE SET NULL;

ALTER TABLE contact_log ADD CONSTRAINT contact_log_pkey PRIMARY KEY (id);

ALTER TABLE contact_log ADD CONSTRAINT contact_log_type_check CHECK ((type = ANY (ARRAY['text'::text, 'call'::text, 'hangout'::text])));

ALTER TABLE contact_log ADD CONSTRAINT contact_log_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id);

ALTER TABLE date_ideas ADD CONSTRAINT date_ideas_pkey PRIMARY KEY (id);

ALTER TABLE date_ideas ADD CONSTRAINT date_ideas_status_check CHECK ((status = ANY (ARRAY['idea'::text, 'done'::text])));

ALTER TABLE date_ideas ADD CONSTRAINT date_ideas_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id);

ALTER TABLE day_results ADD CONSTRAINT day_results_pkey PRIMARY KEY (date);

ALTER TABLE day_results ADD CONSTRAINT day_results_result_check CHECK ((result = ANY (ARRAY['win'::text, 'loss'::text])));

ALTER TABLE day_results ADD CONSTRAINT day_results_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id);

ALTER TABLE encyc_notes ADD CONSTRAINT encyc_notes_pkey PRIMARY KEY (id);

ALTER TABLE encyc_notes ADD CONSTRAINT encyc_notes_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id);

ALTER TABLE finance_entries ADD CONSTRAINT finance_entries_pkey PRIMARY KEY (id);

ALTER TABLE finance_entries ADD CONSTRAINT finance_entries_type_check CHECK ((type = ANY (ARRAY['expense'::text, 'income'::text, 'savings'::text])));

ALTER TABLE finance_entries ADD CONSTRAINT finance_entries_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id);

ALTER TABLE focuses ADD CONSTRAINT focuses_pkey PRIMARY KEY (id);

ALTER TABLE focuses ADD CONSTRAINT focuses_status_check CHECK ((status = ANY (ARRAY['active'::text, 'completed'::text, 'archived'::text])));

ALTER TABLE focuses ADD CONSTRAINT focuses_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id);

ALTER TABLE health_goal_logs ADD CONSTRAINT health_goal_logs_goal_id_date_key UNIQUE (goal_id, date);

ALTER TABLE health_goal_logs ADD CONSTRAINT health_goal_logs_goal_id_fkey FOREIGN KEY (goal_id) REFERENCES health_goals(id) ON DELETE CASCADE;

ALTER TABLE health_goal_logs ADD CONSTRAINT health_goal_logs_pkey PRIMARY KEY (id);

ALTER TABLE health_goal_logs ADD CONSTRAINT health_goal_logs_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id);

ALTER TABLE health_goals ADD CONSTRAINT health_goals_pkey PRIMARY KEY (id);

ALTER TABLE health_goals ADD CONSTRAINT health_goals_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id);

ALTER TABLE important_dates ADD CONSTRAINT important_dates_pkey PRIMARY KEY (id);

ALTER TABLE important_dates ADD CONSTRAINT important_dates_recur_check CHECK ((recur = ANY (ARRAY[''::text, 'annual'::text])));

ALTER TABLE important_dates ADD CONSTRAINT important_dates_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id);

ALTER TABLE inbox_log ADD CONSTRAINT inbox_log_pkey PRIMARY KEY (date);

ALTER TABLE inbox_log ADD CONSTRAINT inbox_log_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id);

ALTER TABLE journal_entries ADD CONSTRAINT journal_entries_pkey PRIMARY KEY (id);

ALTER TABLE journal_entries ADD CONSTRAINT journal_entries_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id);

ALTER TABLE list_items ADD CONSTRAINT list_items_list_check CHECK ((list = ANY (ARRAY['shopping'::text, 'grocery'::text])));

ALTER TABLE list_items ADD CONSTRAINT list_items_pkey PRIMARY KEY (id);

ALTER TABLE list_items ADD CONSTRAINT list_items_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id);

ALTER TABLE paige_actions ADD CONSTRAINT paige_actions_kind_check CHECK ((kind = ANY (ARRAY['focus_hit'::text, 'fight'::text, 'mistake'::text])));

ALTER TABLE paige_actions ADD CONSTRAINT paige_actions_pkey PRIMARY KEY (id);

ALTER TABLE paige_actions ADD CONSTRAINT paige_actions_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id);

ALTER TABLE people ADD CONSTRAINT people_cadence_days_check CHECK ((cadence_days > 0));

ALTER TABLE people ADD CONSTRAINT people_pkey PRIMARY KEY (id);

ALTER TABLE people ADD CONSTRAINT people_tier_check CHECK ((tier = ANY (ARRAY['family'::text, 'friends'::text, 'work'::text])));

ALTER TABLE people ADD CONSTRAINT people_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id);

ALTER TABLE profile_stats ADD CONSTRAINT profile_stats_pkey PRIMARY KEY (id);

ALTER TABLE profile_stats ADD CONSTRAINT profile_stats_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id);

ALTER TABLE profile_stats ADD CONSTRAINT profile_stats_user_id_key UNIQUE (user_id);

ALTER TABLE question_answers ADD CONSTRAINT question_answers_pkey PRIMARY KEY (id);

ALTER TABLE question_answers ADD CONSTRAINT question_answers_question_id_fkey FOREIGN KEY (question_id) REFERENCES questions(id) ON DELETE SET NULL;

ALTER TABLE question_answers ADD CONSTRAINT question_answers_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id);

ALTER TABLE questions ADD CONSTRAINT questions_pkey PRIMARY KEY (id);

ALTER TABLE questions ADD CONSTRAINT questions_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id);

ALTER TABLE rel_acts ADD CONSTRAINT rel_acts_pkey PRIMARY KEY (id);

ALTER TABLE rel_acts ADD CONSTRAINT rel_acts_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id);

ALTER TABLE tasks ADD CONSTRAINT tasks_person_id_fkey FOREIGN KEY (person_id) REFERENCES people(id) ON DELETE SET NULL;

ALTER TABLE tasks ADD CONSTRAINT tasks_pkey PRIMARY KEY (id);

ALTER TABLE tasks ADD CONSTRAINT tasks_priority_check CHECK ((priority = ANY (ARRAY['low'::text, 'medium'::text, 'high'::text, 'urgent'::text])));

ALTER TABLE tasks ADD CONSTRAINT tasks_section_check CHECK ((section = ANY (ARRAY['paige'::text, 'work'::text, 'community_family'::text, 'community_friends'::text, 'health'::text, 'personal'::text])));

ALTER TABLE tasks ADD CONSTRAINT tasks_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id);

ALTER TABLE weekly_stats ADD CONSTRAINT weekly_stats_pkey PRIMARY KEY (week_start);

ALTER TABLE weekly_stats ADD CONSTRAINT weekly_stats_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id);

ALTER TABLE xp_values ADD CONSTRAINT xp_values_pkey PRIMARY KEY (key);

ALTER TABLE xp_values ADD CONSTRAINT xp_values_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id);


-- =====================================================
-- INDEXES
-- =====================================================

CREATE INDEX chore_log_chore_id_idx ON public.chore_log USING btree (chore_id);

CREATE INDEX contact_log_person_id_idx ON public.contact_log USING btree (person_id);

CREATE INDEX tasks_person_id_idx ON public.tasks USING btree (person_id);


-- =====================================================
-- ROW LEVEL SECURITY
-- =====================================================

ALTER TABLE activities ENABLE ROW LEVEL SECURITY;

CREATE POLICY owner_all ON activities AS PERMISSIVE FOR ALL TO authenticated
  USING ((user_id = auth.uid()))
  WITH CHECK ((user_id = auth.uid()));

ALTER TABLE app_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY owner_all ON app_settings AS PERMISSIVE FOR ALL TO authenticated
  USING ((user_id = auth.uid()))
  WITH CHECK ((user_id = auth.uid()));

ALTER TABLE chore_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY owner_all ON chore_log AS PERMISSIVE FOR ALL TO authenticated
  USING ((user_id = auth.uid()))
  WITH CHECK ((user_id = auth.uid()));

ALTER TABLE chores ENABLE ROW LEVEL SECURITY;

CREATE POLICY owner_all ON chores AS PERMISSIVE FOR ALL TO authenticated
  USING ((user_id = auth.uid()))
  WITH CHECK ((user_id = auth.uid()));

ALTER TABLE contact_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY owner_all ON contact_log AS PERMISSIVE FOR ALL TO authenticated
  USING ((user_id = auth.uid()))
  WITH CHECK ((user_id = auth.uid()));

ALTER TABLE date_ideas ENABLE ROW LEVEL SECURITY;

CREATE POLICY owner_all ON date_ideas AS PERMISSIVE FOR ALL TO authenticated
  USING ((user_id = auth.uid()))
  WITH CHECK ((user_id = auth.uid()));

ALTER TABLE day_results ENABLE ROW LEVEL SECURITY;

CREATE POLICY owner_all ON day_results AS PERMISSIVE FOR ALL TO authenticated
  USING ((user_id = auth.uid()))
  WITH CHECK ((user_id = auth.uid()));

ALTER TABLE encyc_notes ENABLE ROW LEVEL SECURITY;

CREATE POLICY owner_all ON encyc_notes AS PERMISSIVE FOR ALL TO authenticated
  USING ((user_id = auth.uid()))
  WITH CHECK ((user_id = auth.uid()));

ALTER TABLE finance_entries ENABLE ROW LEVEL SECURITY;

CREATE POLICY owner_all ON finance_entries AS PERMISSIVE FOR ALL TO authenticated
  USING ((user_id = auth.uid()))
  WITH CHECK ((user_id = auth.uid()));

ALTER TABLE focuses ENABLE ROW LEVEL SECURITY;

CREATE POLICY owner_all ON focuses AS PERMISSIVE FOR ALL TO authenticated
  USING ((user_id = auth.uid()))
  WITH CHECK ((user_id = auth.uid()));

ALTER TABLE health_goal_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY owner_all ON health_goal_logs AS PERMISSIVE FOR ALL TO authenticated
  USING ((user_id = auth.uid()))
  WITH CHECK ((user_id = auth.uid()));

ALTER TABLE health_goals ENABLE ROW LEVEL SECURITY;

CREATE POLICY owner_all ON health_goals AS PERMISSIVE FOR ALL TO authenticated
  USING ((user_id = auth.uid()))
  WITH CHECK ((user_id = auth.uid()));

ALTER TABLE important_dates ENABLE ROW LEVEL SECURITY;

CREATE POLICY owner_all ON important_dates AS PERMISSIVE FOR ALL TO authenticated
  USING ((user_id = auth.uid()))
  WITH CHECK ((user_id = auth.uid()));

ALTER TABLE inbox_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY owner_all ON inbox_log AS PERMISSIVE FOR ALL TO authenticated
  USING ((user_id = auth.uid()))
  WITH CHECK ((user_id = auth.uid()));

ALTER TABLE journal_entries ENABLE ROW LEVEL SECURITY;

CREATE POLICY owner_all ON journal_entries AS PERMISSIVE FOR ALL TO authenticated
  USING ((user_id = auth.uid()))
  WITH CHECK ((user_id = auth.uid()));

ALTER TABLE list_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY owner_all ON list_items AS PERMISSIVE FOR ALL TO authenticated
  USING ((user_id = auth.uid()))
  WITH CHECK ((user_id = auth.uid()));

ALTER TABLE paige_actions ENABLE ROW LEVEL SECURITY;

CREATE POLICY owner_all ON paige_actions AS PERMISSIVE FOR ALL TO authenticated
  USING ((user_id = auth.uid()))
  WITH CHECK ((user_id = auth.uid()));

ALTER TABLE people ENABLE ROW LEVEL SECURITY;

CREATE POLICY owner_all ON people AS PERMISSIVE FOR ALL TO authenticated
  USING ((user_id = auth.uid()))
  WITH CHECK ((user_id = auth.uid()));

ALTER TABLE profile_stats ENABLE ROW LEVEL SECURITY;

CREATE POLICY owner_all ON profile_stats AS PERMISSIVE FOR ALL TO authenticated
  USING ((user_id = auth.uid()))
  WITH CHECK ((user_id = auth.uid()));

ALTER TABLE question_answers ENABLE ROW LEVEL SECURITY;

CREATE POLICY owner_all ON question_answers AS PERMISSIVE FOR ALL TO authenticated
  USING ((user_id = auth.uid()))
  WITH CHECK ((user_id = auth.uid()));

ALTER TABLE questions ENABLE ROW LEVEL SECURITY;

CREATE POLICY owner_all ON questions AS PERMISSIVE FOR ALL TO authenticated
  USING ((user_id = auth.uid()))
  WITH CHECK ((user_id = auth.uid()));

ALTER TABLE rel_acts ENABLE ROW LEVEL SECURITY;

CREATE POLICY owner_all ON rel_acts AS PERMISSIVE FOR ALL TO authenticated
  USING ((user_id = auth.uid()))
  WITH CHECK ((user_id = auth.uid()));

ALTER TABLE tasks ENABLE ROW LEVEL SECURITY;

CREATE POLICY owner_all ON tasks AS PERMISSIVE FOR ALL TO authenticated
  USING ((user_id = auth.uid()))
  WITH CHECK ((user_id = auth.uid()));

ALTER TABLE weekly_stats ENABLE ROW LEVEL SECURITY;

CREATE POLICY owner_all ON weekly_stats AS PERMISSIVE FOR ALL TO authenticated
  USING ((user_id = auth.uid()))
  WITH CHECK ((user_id = auth.uid()));

ALTER TABLE xp_values ENABLE ROW LEVEL SECURITY;

CREATE POLICY owner_all ON xp_values AS PERMISSIVE FOR ALL TO authenticated
  USING ((user_id = auth.uid()))
  WITH CHECK ((user_id = auth.uid()));


-- =====================================================
-- FUNCTIONS & PROCEDURES
-- =====================================================

CREATE OR REPLACE FUNCTION public.rls_auto_enable()
 RETURNS event_trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'pg_catalog'
AS $function$
DECLARE
  cmd record;
BEGIN
  FOR cmd IN
    SELECT *
    FROM pg_event_trigger_ddl_commands()
    WHERE command_tag IN ('CREATE TABLE', 'CREATE TABLE AS', 'SELECT INTO')
      AND object_type IN ('table','partitioned table')
  LOOP
     IF cmd.schema_name IS NOT NULL AND cmd.schema_name IN ('public') AND cmd.schema_name NOT IN ('pg_catalog','information_schema') AND cmd.schema_name NOT LIKE 'pg_toast%' AND cmd.schema_name NOT LIKE 'pg_temp%' THEN
      BEGIN
        EXECUTE format('alter table if exists %s enable row level security', cmd.object_identity);
        RAISE LOG 'rls_auto_enable: enabled RLS on %', cmd.object_identity;
      EXCEPTION
        WHEN OTHERS THEN
          RAISE LOG 'rls_auto_enable: failed to enable RLS on %', cmd.object_identity;
      END;
     ELSE
        RAISE LOG 'rls_auto_enable: skip % (either system schema or not in enforced list: %.)', cmd.object_identity, cmd.schema_name;
     END IF;
  END LOOP;
END;
$function$
;


-- =====================================================
-- TRIGGERS
-- =====================================================
