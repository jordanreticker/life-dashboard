-- Home tasks: adhoc, non-recurring household to-dos that live on the Home tab,
-- completable by Jordan or Paige. Modeled as regular tasks under a new 'home'
-- section, with a completed_by column mirroring chore_log so completions can
-- record who did it (me / paige / joint) and apply the household XP rules.

ALTER TABLE tasks DROP CONSTRAINT tasks_section_check;

ALTER TABLE tasks ADD CONSTRAINT tasks_section_check
  CHECK ((section = ANY (ARRAY['paige'::text, 'work'::text, 'community_family'::text, 'community_friends'::text, 'health'::text, 'personal'::text, 'home'::text])));

ALTER TABLE tasks ADD COLUMN completed_by text NOT NULL DEFAULT 'me'::text;
