-- Expand recipes with detail fields: pasteable steps, a source link, a 1-5
-- rating (0 = unrated), and a free-text category (autocompleted client-side from
-- existing values). Ingredients stay in recipe_ingredients.
alter table public.recipes add column steps text not null default '';
alter table public.recipes add column link text not null default '';
alter table public.recipes add column rating numeric not null default 0;
alter table public.recipes add column category text not null default '';
