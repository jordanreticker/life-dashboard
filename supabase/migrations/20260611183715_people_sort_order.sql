-- The friends list supports manual reordering; the legacy app persisted array
-- order implicitly. Make order explicit with a sort_order column, seeded from
-- name order so the initial view is stable.

alter table people add column sort_order int not null default 0;

update people p
set sort_order = sub.rn
from (select id, row_number() over (order by name) as rn from people) sub
where p.id = sub.id;
