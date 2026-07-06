# JrDr's Office (life-dashboard) — Agent Reference

## ⛔ HARD CONSTRAINTS — read first, no exceptions

Every agent working in this codebase MUST follow these rules. They override any default behavior. Full text + commands in [context/agent-rules.md](context/agent-rules.md).

1. **Migrations only.** Once the Supabase backend exists, ALL database changes go through `.sql` files in `supabase/migrations/` applied via `supabase db push`. NEVER execute `INSERT`/`UPDATE`/`DELETE`/DDL directly against the live database. The Supabase CLI is for exactly two things: reading (`db query`) and pushing migrations (`db push`). The single sanctioned exception is the **one-time legacy data import** described in [USER_TODO.md](USER_TODO.md) — it runs once, is never repeated, and is recorded when done.
2. **Never read migrations to learn the current schema.** Migration files are append-only *history*. Current-state DDL lives in [supabase/schema.sql](supabase/schema.sql) (generated snapshot — never hand-edit; regenerate with `./supabase/refresh-schema-snapshot.sh` as the last step of every push). Only open a migration to understand history or to author a new one.
3. **Supabase CLI setup.** Every `supabase` command needs `SUPABASE_ACCESS_TOKEN` loaded from `.env.local` (repo root, gitignored) plus `--linked --workdir $(pwd)` — otherwise it fails with 401. A Supabase MCP connector exists in Claude Cowork: reads + `send_push()` invocation only, never DDL/DML (see [context/routines-pushover.md](context/routines-pushover.md)).
4. **All data comes from Supabase; all queries live in the data layer.** Never scatter raw `supabase.from(...)` calls through UI code. Web client: per-table query objects in `src/db.js`. Native app: typed query objects in `app/src/utils/supabase/db.ts` (regenerate `database.types.ts` after every migration push — see [context/expo-app.md](context/expo-app.md)).
5. **No build step in the legacy web client.** The repo-root `index.html` app is static files served by GitHub Pages — plain HTML + ES modules + CDN imports, no npm/bundler/framework, ever. The **native app in `app/` is the sanctioned exception**: an Expo/React Native project (Metro, EAS Build → TestFlight) with its own rules in [context/expo-app.md](context/expo-app.md). Never mix the two — no build tooling at the repo root, no CDN-import hacks inside `app/`.
6. **Writes are per-row, not whole-blob.** The legacy app saved entire arrays back to Sheets. The Supabase version inserts/updates/deletes individual rows through `src/db.js`. Do not port the dirty-set "save everything" model to Supabase.
7. **Compute functions are pure and client-side.** XP totals, streaks, weekly summaries, pace/balance, freshness percentages are *derived* from raw rows at render time — never persisted as duplicated state when they can be recomputed. (The legacy `weekSummary` blob is dropped, not migrated.)
8. **All ids are `uuid` / JS `string`.** Legacy `Date.now()` numeric ids and `'c1'`-style ids are mapped to uuids at import time. No integer keys in new tables.
9. **No test suite.** Web client: verify by serving locally (`python3 -m http.server`) and exercising the UI in a browser (ES-module imports do not work from `file://`). Native app: `cd app && npx tsc --noEmit` must pass, then exercise via `npx expo start`.
10. **This `AGENTS.md` is an INDEX, never a content file.** Reference material lives in self-contained markdown files under [context/](context/), one file per domain — `AGENTS.md` holds only a one-line table row per file plus these rules. When documenting a finding, pattern, or system: prefer updating the existing `context/*.md` file; otherwise create a new `context/<domain>.md` and add a row linking to it in the table below. Never paste reference content into `AGENTS.md`.

## Project overview

"JrDr's Office" is a personal life dashboard (tasks, chores, relationship acts, contacts, activities, journal, finances, gamified XP/badges/streaks) used by one person on a phone. It has **two clients sharing one Supabase backend**:

- **Native app (primary, in `app/`):** Expo/React Native + TypeScript, deployed personally via EAS Build → TestFlight. Architecture copied from the sibling repo `~/Code/music-club-app`. Documented in [context/expo-app.md](context/expo-app.md); deploy runbook in [Queue a TestFlight Build.md](Queue%20a%20TestFlight%20Build.md).
- **Web client (legacy, repo-root `index.html`):** the original single-file app on GitHub Pages; stays live as a fallback until the native app proves out (USER_TODO Phase I).
- **Backend:** Supabase Postgres (migrations-only workflow, generated schema snapshot, centralized typed query layer, pure client-side compute — patterns proven in `~/Code/PindejosBowling`). Migration history from the old Google Sheets backend: [context/supabase-migration.md](context/supabase-migration.md), [context/legacy-system.md](context/legacy-system.md); user-action checklist in [USER_TODO.md](USER_TODO.md).

This file is an **index**. Read the context file relevant to your task rather than loading everything.

## Context map

| File | Read it when you need… |
|---|---|
| [context/agent-rules.md](context/agent-rules.md) | The full text of the hard constraints above — exact CLI commands, migration workflow, snapshot regeneration, env setup |
| [context/expo-app.md](context/expo-app.md) | The native app in `app/` — Expo/RN stack, directory layout, data-flow + theme rules, Paige mode, EAS/TestFlight deploy story, local dev commands |
| [context/tech-stack.md](context/tech-stack.md) | Tech stack and its constraints (single HTML file, no build, GitHub Pages), how to run locally, planned file layout, the `src/db.js` data-layer pattern |
| [context/legacy-system.md](context/legacy-system.md) | The Google Sheets / Apps Script system being replaced — every data collection and its shape, the sync model (dirty set, localStorage cache, debounced saves), the XP economy, and gotchas |
| [context/supabase-migration.md](context/supabase-migration.md) | The migration architecture — sheet → table mapping, auth/RLS model for a public static site, import strategy, cutover sequence, and what is intentionally **not** migrated |
| [context/routines-pushover.md](context/routines-pushover.md) | Claude scheduled routines + Pushover push notifications — `send_push()` function, Vault secrets, pg_net egress, per-routine specs, MCP read-only rules |

## External source-of-truth docs

- **Reference implementation:** the sibling repo `~/Code/PindejosBowling` is the known-working template for this stack's backend layer. Specifically reusable: `supabase/refresh-schema-snapshot.sh` + `supabase/schema-snapshot.gen.sql` (copy verbatim), the migration workflow in its `context/agent-rules.md`, and the per-table query-object shape of `app/src/utils/supabase/db.ts` (adapted to plain JS here).
- **User migration checklist:** [USER_TODO.md](USER_TODO.md) — everything the user must do by hand (Supabase project creation, exports, credentials, cutover). Agents keep this file's checkboxes current as steps complete.
