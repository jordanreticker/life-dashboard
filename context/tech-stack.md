# Tech Stack

## What this app is

A single-page, mobile-first personal dashboard ("JrDr's Office") used by one person, installed to the iPhone home screen as a web app. Six tabs: Summary, Paige, Work, Community, Home (chores/lists), Life (health/journal). Heavy gamification layer (XP, levels, weekly + permanent badges, streaks, proactive points, a 7-game weekly "series").

## Stack and its non-negotiables

| Layer | Choice | Notes |
|---|---|---|
| UI | Vanilla JS + template-string rendering in one `index.html` | Render functions (`rHome`, `rPaige`, …) write `innerHTML` per tab pane; one permanent delegated click listener on `#main` |
| Styling | Hand-written CSS in `<style>`, CSS custom properties for theme | DM Sans / DM Mono via Google Fonts |
| Modules | Plain ES modules (`<script type="module">`), CDN imports | **No npm, no bundler, no build step — ever** |
| Backend (legacy) | Google Sheets + Apps Script web app | See [legacy-system.md](legacy-system.md) |
| Backend (target) | Supabase Postgres via `@supabase/supabase-js` from a CDN ESM URL (e.g. `https://esm.sh/@supabase/supabase-js@2`) | See [supabase-migration.md](supabase-migration.md) |
| Auth (target) | Supabase email/password for the single user; session persisted in localStorage by supabase-js | RLS restricts every table to the authenticated owner |
| Hosting | GitHub Pages serving the repo root from `main` | Push to `main` = deploy. No CI |
| Offline-ish | localStorage cache for instant first paint, then network refresh | Keep this pattern; it's what makes the app feel native |

The "no build step" constraint is structural: the deploy story is *git push*, and the app must stay editable as plain files. Frameworks, TypeScript compilation, and bundlers are out of scope unless the user explicitly changes this.

### Layout invariants (iOS standalone)

- `html,body` are `overflow:hidden`; `#app` is exactly `100dvh`; **`#main` is the only scroll container.** Body scrolling + fixed bars is unreliable in iOS standalone mode (panes got cut off at the bottom) — do not reintroduce body scrolling. Scroll listeners (pull-to-refresh, tab-bar auto-hide) attach to `#main`.
- `#tabbar` auto-hides: any `#main` scroll shows it, 1.5s of settle hides it (class `nav-hidden`), and it stays visible when the pane doesn't overflow. `switchTab()` calls `showNav()` so it never vanishes right after navigation.
- Manual ordering UIs follow one pattern: a small "reorder" toggle button enters a mode where rows show ↑/↓ buttons; each move rewrites `sort_order` (1-based) for changed rows only via `src/db.js`. Used by Community people (family + friends, `D._reorderingPeople`) and the shopping want-list (`D._reorderingShopping`).

## Running locally

```bash
cd ~/Code/life-dashboard
python3 -m http.server 8000
# open http://localhost:8000
```

`file://` does not work (ES modules + fetch are blocked). Test mobile layout with browser device emulation at 480px width.

## Target file layout (post-migration)

```
index.html                  # UI: markup, CSS, render functions, event wiring
src/
  supabaseClient.js         # createClient(URL, ANON_KEY) — the only place credentials appear
  db.js                     # per-table query objects — the ONLY file that touches supabase.from()
  compute.js                # (optional split) pure derived-data functions: XP totals, streaks, pace, freshness
supabase/
  migrations/               # append-only change history (CLI-generated filenames)
  schema.sql                # GENERATED current-state snapshot — never hand-edit
  schema-snapshot.gen.sql   # generator query (copied from PindejosBowling)
  refresh-schema-snapshot.sh
migration-source/           # gitignored; legacy .xlsx export + Apps Script source for reference
context/                    # agent reference docs (this directory)
AGENTS.md                   # index — hard constraints + context map
USER_TODO.md                # user-action migration checklist
.env.local                  # gitignored; SUPABASE_ACCESS_TOKEN for the CLI
```

Splitting `db.js` out of `index.html` is required (it's the data-layer boundary the hard constraints reference). Splitting `compute.js` is encouraged but optional; the render functions may stay in `index.html`.

## The data-layer pattern (mirrors PindejosBowling's `db.ts`)

One exported object per table; UI calls these and never `supabase.from()` directly:

```js
export const chores = {
  list: () => supabase.from('chores').select('*').order('name'),
  insert: (row) => supabase.from('chores').insert(row).select().single(),
  update: (id, patch) => supabase.from('chores').update(patch).eq('id', id),
  remove: (id) => supabase.from('chores').delete().eq('id', id),
  logDone: (choreId, entry) => supabase.from('chore_log').insert({ chore_id: choreId, ...entry }),
}
```

Load flow per tab: fetch raw rows through `db.js` → cache in the in-memory `D` state (and localStorage) → render → derive display values inline (pure compute). Writes go straight to Supabase per-row, then update `D` optimistically and re-render — replacing the legacy debounced whole-blob `saveAll()`.
