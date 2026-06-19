-- Track who completed a chore so the household split (you vs. Paige) can be
-- computed. Existing completions are all yours, so default + backfill to 'me'.
-- Paige completions reset the chore's freshness timer but earn no XP and are
-- excluded from the owner's gamification stats (computed client-side).
alter table public.chore_log add column completed_by text not null default 'me';
