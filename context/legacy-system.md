# Legacy System — Google Sheets + Apps Script

The system being replaced. Read this before touching any load/save code or planning import work. The legacy app keeps working until cutover (see [supabase-migration.md](supabase-migration.md)).

## Architecture

- A single Google Sheet; **each tab is a "table"** (one tab per data collection below).
- A Google Apps Script **web app** fronts the sheet. The deployed URL is the `API` constant at the top of the `<script>` in `index.html`.
- Two operations:
  - `GET {API}?action=getData` → JSON blob of every collection.
  - `POST {API}` body `{action:'saveData', <collection>: <full array>, ...}` → overwrites the named sheet tabs with the posted arrays. There is also a fire-and-forget `{action:'logChore', ...}` append.
- The user will provide the full Apps Script source in `migration-source/apps-script/` — read it to confirm exact column layouts per tab before writing the import.

## Client sync model (in `index.html`)

- Global state object `D` holds every collection in memory.
- **Dirty set:** any mutation adds its collection key to `D.dirty`; `sched()` debounces 300 ms then `saveAll()` POSTs only dirty collections — as *entire arrays* (whole-blob writes).
- **localStorage cache** (`jrdr-cache-v2`): written on every change for instant render on next load; server fetch then reconciles, skipping any key still in `D.dirty` (unsaved local edits win).
- Save retries twice with backoff; a sync pip (`synced/syncing/error`) shows status.
- **Port note:** under Supabase, whole-blob saves and the dirty set go away (per-row writes), but keep the localStorage instant-paint cache and the sync pip UX.

## Data collections (sheet tabs) and shapes

Shapes as normalized by `applyData()`; the Apps Script source is authoritative for raw column names.

| Collection | Shape (key fields) | Notes |
|---|---|---|
| `tasks` | id, section, text, done, priority, dueDate, personId, tags[], scheduledFor, createdAt, completedAt, proactivePoints, xpValue, recurrence, notes | sections: `paige`, `work`, `community_family`, `community_friends`, `health`, `personal`. Completing a recurring task clones it with an advanced dueDate |
| `chores` | id, name, intervalDays, lastDone, xpValue | "freshness" = % of interval remaining; negative = overdue. `chore_log` is the source of truth for lastDone |
| `choreLog` | id, choreId, choreName, date, xpEarned, proactivePoints | append-only |
| `people` | three arrays: `social_family`, `social_friends`, `work`; each: id, name, tier, lastContact, cadenceDays? | lastContact is derived from contactLog at render (reconciled); cadence defaults: family 7d, friends 14d |
| `contactLog` | id, personId, personName, type (text/call/hangout), note, date, xp | group hangouts/calls create one row per person |
| `activities` | id, type, date, notes, duration, xp, game1..game8? | bowling entries carry up to 8 game scores |
| `questions` | id, question | "ask Paige" prompts; random rotation |
| `paigeAnswers` | id, questionId, question, answer, date | |
| `gamification` | single object: xp, level, streakDays, bestStreak, lastActiveDate, badges[], proactivePoints, allTime counters, weeklyBadgeHistory{}, weeklyBadgeLastEarned{} | much of it is *re-derived* client-side; see XP economy below |
| `finances` | id, category, label, amount, type (expense/income/savings), notes, updatedAt | UI currently hidden but data retained |
| `journal` | id, date, text, mood, title | plus `journalLockHash` (SHA-256 of an optional password) stored separately |
| `weeklyStats` | weekStart, tasksDone, choresDone, activitiesLogged, contactsLogged, xpEarned, proactivePoints | snapshot written on manual "reset week" |
| `relActs` | id, name, intervalDays, lastDone | relationship acts; same freshness mechanic as chores |
| `encycNotes` | text, cat, done?, completedNote? | "Paigecyclopedia"; positional (no ids!) — deletes/toggles are by array index |
| `healthGoals` | id, name, target (days/week), logs[] (ISO dates) | logs reset on week reset |
| `inboxLog` | date, count | text-inbox count per day; inbox-zero streaks |
| `dayResults` | date, result (win/loss/''), stat1..stat3, notes | the 7-game weekly series; 4 wins = series |
| `paigeDates` | id, name, date, recur ('annual'/''), notes | important dates with next-occurrence logic |
| `paigeFocuses` | id, text, notes, status (active/completed/archived), createdAt, completedAt, reactivatedAt, sortOrder | max 3 active |
| `paigeActions` | id, kind (focus_hit/fight/mistake), date, xp | feeds the "Paige health" score |
| `shoppingList` / `groceryList` | id, text, done, addedAt, staple? | two lists, same shape |
| `xpValues` | key → number map | XP economy config; also stores `section_target_<key>` weekly balance targets |
| `dateIdeas` | id, text, preRating, date, notes, finalRating, starred, status (idea/done) | |
| `weeklySummary` | { weekStart, data: {…} } | **derived** — `rHome()` recomputes it from source rows every render; do NOT migrate as a table |

## XP economy (summary)

- Every action grants XP via `xp(key)` — looked up in `xpValues` with `DEFAULT_XP` fallbacks (task by priority, chores, contacts with 1.5× family multiplier, activities, rel acts, journal, inbox zero, day win/loss, series win 500 / sweep 1000, etc.).
- **Proactive points (PP)** reward early completion: tasks by days-before-due (3/5/7-day tiers), chores by % of interval remaining.
- Levels: all-time ladder (`LEVELS`) + within-week ladder (`WEEK_LEVELS`). Badges: permanent (`PERM_BADGES`) + weekly (`WEEK_BADGES`, reset weekly, history counted once per week via `weeklyBadgeLastEarned`).
- Weeks run **Monday–Sunday** (`getWeekStart`); "week reset" archives to `weeklyStats`, deletes completed tasks, clears health-goal logs and weekly badges.
- Negative Paige actions (fight/mistake) deliberately do **not** subtract all-time XP — they only lower the derived Paige health score.

## Known legacy gotchas (do not blindly port)

- Mixed id schemes: numeric `Date.now()` ids, `'c1'`/`'ra1'` seed ids, prefixed string ids — all become uuids at import; `personId` references in tasks/contactLog must be remapped to the new uuids.
- `encycNotes` has no ids (index-addressed) — assign uuids at import.
- Completed tasks are **deleted** on week reset, so all-time task counters in `gamification` exceed surviving task rows. Import the counters as-is into the profile/stats row; don't try to rebuild them from rows.
- `weekSummary`, person `lastContact`, and chore `lastDone` are all *reconciled from logs* at render — the logs (`choreLog`, `contactLog`) are authoritative; treat the denormalized copies as cache.
- Several self-healing blocks run on load (badge-count cleanup, PP auto-correct) — artifacts of blob-sync races that per-row writes eliminate; do not port them.
