-- Recipe library for the grocery-list integration. A recipe is just a name plus
-- a set of ingredient lines (e.g. "1 tbsp butter") stored one-per-row so we can
-- add quantities/categories later. Picking a recipe lets the user add its
-- ingredients to the grocery list. Steps/links come later as columns on recipes.

create table recipes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id),
  name text not null,
  created_at timestamptz not null default now()
);

create table recipe_ingredients (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id),
  recipe_id uuid not null references recipes (id) on delete cascade,
  text text not null,
  sort_order integer not null default 0,
  created_at timestamptz not null default now()
);

-- Owner-only RLS, same boundary as every other table.
do $$
declare
  t text;
begin
  foreach t in array array['recipes', 'recipe_ingredients'] loop
    execute format('alter table %I enable row level security', t);
    execute format(
      'create policy owner_all on %I for all to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid())',
      t
    );
  end loop;
end $$;
