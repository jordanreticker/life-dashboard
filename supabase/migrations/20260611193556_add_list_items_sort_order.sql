-- Manual prioritization for list items (the shopping "want list" is user-ordered).
-- Backfill existing rows with their current display order so nothing jumps.
alter table public.list_items add column sort_order integer not null default 0;

update public.list_items li
set sort_order = sub.rn
from (
  select id, row_number() over (partition by list order by added_date, created_at) as rn
  from public.list_items
) sub
where li.id = sub.id;
