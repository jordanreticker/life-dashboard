# Supabase Migration — Architecture & Plan

How the Google Sheets backend ([legacy-system.md](legacy-system.md)) becomes Supabase Postgres, following the proven patterns of `~/Code/PindejosBowling`. User-action steps live in [../USER_TODO.md](../USER_TODO.md); this file is the agent-facing design.

## Guiding decisions

1. **Same workflow as PindejosBowling:** migrations-only writes, CLI-generated migration files, `supabase/schema.sql` generated snapshot refreshed after every push (copy `refresh-schema-snapshot.sh` + `schema-snapshot.gen.sql` from that repo verbatim).
2. **Single-user, public static host.** The anon key ships in `index.html` on GitHub Pages, so:
   - Every table gets **RLS enabled** with policies restricted to `auth.uid()` = the owner (either a `user_id uuid` column defaulting to `auth.uid()`, or simply `TO authenticated USING (true)` since there is exactly one user — decide once, apply uniformly; the `user_id` column is cheap future-proofing and preferred).
   - The app requires a Supabase email/password sign-in (one account). supabase-js persists the session; the user signs in once per device.
3. **Per-row CRUD replaces whole-blob saves.** Each mutation calls a `src/db.js` method immediately (optimistic local update + background write). The dirty-set/debounce machinery is removed; the localStorage instant-paint cache and sync pip stay.
4. **Derived data is not migrated.** `weeklySummary` is dropped (recomputed at render). Person `lastContact` and chore `lastDone` may be kept as columns for cheap reads but the logs remain authoritative — same as legacy.
5. **All ids uuid**, `gen_random_uuid()` defaults, legacy ids remapped at import (with a temporary `legacy_id text` column where cross-references must be rewired, dropped after import).

## Sheet → table mapping

| Legacy collection | Table | Notes |
|---|---|---|
| tasks | `tasks` | `section` text CHECK-constrained; `tags text[]`; dates as `date` |
| chores | `chores` | |
| choreLog | `chore_log` | FK → chores (nullable; keep `chore_name` denormalized like legacy) |
| people.* | `people` | `tier` text CHECK (`family`/`friends`/`work`); `cadence_days int null` |
| contactLog | `contact_log` | FK → people (nullable, keep `person_name`) |
| activities | `activities` | bowling `game1..game8` → `games int[]` |
| questions | `questions` | |
| paigeAnswers | `question_answers` | FK → questions nullable + denormalized question text |
| gamification | `profile_stats` | single row: xp, streaks, badge arrays, all-time counters, `weekly_badge_history jsonb` |
| finances | `finance_entries` | |
| journal (+ journalLockHash) | `journal_entries` + lock hash in `app_settings` | |
| weeklyStats | `weekly_stats` | PK on `week_start date` |
| relActs | `rel_acts` | |
| encycNotes | `encyc_notes` | gets uuids (legacy had none) |
| healthGoals (+ logs[]) | `health_goals` + `health_goal_logs` | logs become rows (goal_id, date) |
| inboxLog | `inbox_log` | PK on `date` |
| dayResults | `day_results` | PK on `date` |
| paigeDates | `important_dates` | |
| paigeFocuses | `focuses` | |
| paigeActions | `paige_actions` | |
| shoppingList + groceryList | `list_items` | `list` text CHECK (`shopping`/`grocery`) |
| xpValues | `xp_values` | key/value (`key text PK, value numeric`); includes `section_target_*` |
| dateIdeas | `date_ideas` | |
| weeklySummary | — | **not migrated** (derived) |

## Import strategy (one-time, sanctioned exception)

1. User provides the full Sheet as `.xlsx` and the Apps Script source under `migration-source/` (gitignored).
2. Agent reads the xlsx (e.g. `python3` + `openpyxl`) and **generates a single reviewable SQL file** of `INSERT`s (`migration-source/legacy-import.sql`), remapping ids to uuids and rewiring `person_id`/`chore_id`/`question_id` references.
3. Schema migrations are pushed first (`supabase db push`); the import SQL is then applied **once** — via the Supabase Studio SQL editor by the user, or by the agent with explicit user go-ahead. Record the completion date in `USER_TODO.md`.
4. Verify: row counts per table vs. sheet tab row counts; spot-check XP total, badge list, and a recent week's derived summary against the live legacy app.
5. The import file is never re-run. After cutover, the migrations-only rule has no exceptions.

## Cutover sequence

1. Build the Supabase path behind the existing UI (new `src/supabaseClient.js`, `src/db.js`; `index.html` load/save rewired) on a branch, tested locally against the real project.
2. **Data freeze:** user stops using the live app, takes the final xlsx export; regenerate + apply the import against truncated tables (or import into a fresh project) so nothing is lost in the gap.
3. Merge to `main` → GitHub Pages deploys the Supabase version. Sign in once on the phone.
4. Soak for a few days; the Google Sheet stays untouched as a rollback/archive.
5. Decommission: user archives the Apps Script web-app deployment; remove the `API` constant and any dead Sheets code from `index.html`.

## Status (2026-06-11)

Schema pushed (2 migrations), legacy data imported and verified, and `index.html`
rewired on the `upgrade` branch: auth overlay + `boot()` gate, `loadData()` reads via
`fetchAllData()` (parallel `db.js` lists, snake→camel converters), every mutation site
calls `dbWrite()` per-row, gamification persists through a debounced `saveStats()`
single-row update, and the dirty-set/`saveAll` machinery is deleted. The localStorage
cache moved to key `jrdr-cache-v3` (legacy-shaped `data` blob, no `weeklySummary`).
`people.sort_order` was added (second migration) to preserve the friends-reorder feature.
Remaining: user signs in locally and clicks through (D2), then cutover (data freeze → re-import → deploy).

## What changes in `index.html`

- `loadData()` → parallel `db.js` list calls per collection → populate `D` → render (localStorage cache flow unchanged).
- `sched()/schedNow()/saveAll()/D.dirty` → removed; each mutation site calls its `db.js` write directly, updates `D`, re-renders, and flips the sync pip on failure.
- `applyData()` normalization shrinks drastically — Postgres returns clean types (booleans, arrays, dates) instead of stringly sheet values.
- Self-healing blob-race patches (badge cleanup, PP auto-correct, lastContact reconcile-and-mark-dirty) are deleted, not ported.
