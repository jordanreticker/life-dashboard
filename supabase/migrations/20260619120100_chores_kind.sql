-- Distinguish "ordering / restock" chores (Order Toilet Paper) from normal
-- physical chores so they render in a separate group on the Home tab. Same
-- recurring mechanics (interval, xp, freshness); only the grouping differs.
-- Existing rows are all normal chores.
alter table public.chores add column kind text not null default 'chore';
