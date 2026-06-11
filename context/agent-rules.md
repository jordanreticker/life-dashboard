# Agent Rules — full text + commands

These expand the hard constraints indexed in [../AGENTS.md](../AGENTS.md). The commands are lifted from the proven workflow in `~/Code/PindejosBowling` and adapted to this repo's layout (env file at repo root, no TypeScript).

## 1. All database changes go through migration files

Every schema change (DDL: `CREATE`, `ALTER`, `DROP`, indexes, RLS policies, triggers, functions) MUST be a `.sql` file in `supabase/migrations/` applied via `supabase db push`. The Supabase CLI may ONLY be used for:

- **Reading** — `supabase db query` to inspect current state.
- **Pushing migrations** — `supabase db push` for a migration file already written.

Never use `db query` (or any tool) to execute write statements against the live database. If a change needs to be made, write a migration first.

**One-time exception:** the legacy data import from Google Sheets (see [supabase-migration.md](supabase-migration.md) §Import and [../USER_TODO.md](../USER_TODO.md)). It is generated as a reviewable SQL file, applied exactly once, and the completion date is recorded in `USER_TODO.md`. After that, the no-direct-writes rule has no exceptions.

**Creating a migration file** — always via the CLI, never hand-named (the timestamp prefix must be CLI-generated):

```bash
SUPABASE_ACCESS_TOKEN=$(grep '^SUPABASE_ACCESS_TOKEN=' .env.local | cut -d'=' -f2) \
  supabase migration new short_description --workdir $(pwd)
```

This creates `supabase/migrations/YYYYMMDDHHMMSS_short_description.sql`. `--workdir` must be the repo root — pointing it at `supabase/migrations` nests the file incorrectly.

**Applying a migration:**

```bash
SUPABASE_ACCESS_TOKEN=$(grep '^SUPABASE_ACCESS_TOKEN=' .env.local | cut -d'=' -f2) \
  supabase db push --linked --workdir $(pwd)
```

**Reading current state:**

```bash
SUPABASE_ACCESS_TOKEN=$(grep '^SUPABASE_ACCESS_TOKEN=' .env.local | cut -d'=' -f2) \
  supabase db query --linked --workdir $(pwd) \
  "SELECT ..."
```

**Project details** (linked 2026-06-11):

- Project ref: `rhotxathnmkzbtlgxgjv`
- Project URL: `https://rhotxathnmkzbtlgxgjv.supabase.co`
- Auth user UUID (the app's single owner): `379084fd-cd67-43a0-87bc-128d45587687`
- The anon key is public by design and lives in `src/supabaseClient.js`.
- ⚠️ The sibling repo `~/Code/PindejosBowling` links to a *different* project on the same account. The shared `SUPABASE_ACCESS_TOKEN` is account-level; the per-repo link (`supabase/.temp/project-ref`) is what targets commands. Always run supabase commands from this repo root with `--workdir $(pwd)` so they can never hit the bowling database.

## 2. Migrations are history; `supabase/schema.sql` is current state

The `supabase/migrations/` directory is an append-only log of changes over time. Reading or grepping migration files to answer "what does table X look like now?" produces stale, wrong answers once superseding migrations exist. For current schema:

- **`supabase/schema.sql`** — a generated single-file snapshot of the live `public` schema (tables, constraints, indexes, RLS policies, functions, triggers). Machine-generated; **never hand-edit.** Regenerate as the last step of every push:

  ```bash
  ./supabase/refresh-schema-snapshot.sh
  ```

  The script and its generator query (`supabase/schema-snapshot.gen.sql`) are copied verbatim from `~/Code/PindejosBowling/supabase/` — they read the live DB via `supabase db query --linked` and require no Docker.

- **[supabase-migration.md](supabase-migration.md)** — the prose layer (mapping, invariants, rationale) the raw DDL doesn't capture. As the schema stabilizes post-migration, split a dedicated `context/database-schema.md` out of it.

Only open a migration file to understand history or to author a new one.

## 3. Environment / CLI setup

- Secrets live in `.env.local` at the repo root: `SUPABASE_ACCESS_TOKEN` (personal access token for the CLI). `.env.local` is gitignored — never commit it, never echo its contents into logs.
- Every `supabase` command needs the token plus `--linked --workdir $(pwd)`, exactly as shown above. Without them the CLI fails with 401.
- No Supabase MCP server is configured; use the CLI.
- The browser app itself uses only the **project URL** and **anon key** — these are public by design (they ship in `index.html` on GitHub Pages) and are safe ONLY because every table has RLS restricting access to the authenticated owner. Never relax RLS to "anon can read/write".

## 4. Data layer: `src/db.js` only

All Supabase reads/writes go through per-table query objects in `src/db.js` (the plain-JS analog of PindejosBowling's `db.ts`):

```js
// src/db.js
import { supabase } from './supabaseClient.js'

export const tasks = {
  list: () => supabase.from('tasks').select('*').order('created_at', { ascending: false }),
  insert: (row) => supabase.from('tasks').insert(row).select().single(),
  update: (id, patch) => supabase.from('tasks').update(patch).eq('id', id),
  remove: (id) => supabase.from('tasks').delete().eq('id', id),
}
```

- UI code never calls `supabase.from(...)` directly.
- Screens that need joined data get a dedicated read method with `.select('*, related(*)')` — one round-trip, not N.
- Writes are **per-row**. Do not reintroduce the legacy whole-array save model.

## 5. Pure compute, derived not stored

Derived values (weekly XP totals, streaks, balance/pace, freshness %, person health, season records) are computed client-side from raw rows on each render. They are not persisted. The legacy app already moved this direction (`rHome()` derives `weekSummary` from source data and overrides the stored copy) — the Supabase version completes it by not storing the derived blob at all.

## 6. Verification

There is no test suite. Verify by serving the repo locally and clicking through the affected flows:

```bash
python3 -m http.server 8000   # then open http://localhost:8000
```

ES-module imports and `fetch` do not work from `file://` — always use the local server. Production is GitHub Pages serving the repo root from `main`; pushing to `main` deploys.

## 7. Misc

- All new ids are `uuid` (generated by Postgres `gen_random_uuid()` defaults). JS treats them as opaque strings.
- Dates persist as `date` / ISO `YYYY-MM-DD` strings, matching the legacy `localIso()` convention (local time, never UTC-shifted). Keep using the existing `localIso`/`toDateStr` helpers.
- HTML-escape all user content with the existing `escH()` before injecting into innerHTML.
