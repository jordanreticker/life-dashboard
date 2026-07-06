# The Expo App (`app/`) — JrDr's Office native

The native iOS app (personal TestFlight deploy) that replaces the single-file
web app as the primary client. Architecture is copied deliberately from the
sibling repo `~/Code/music-club-app` — when in doubt about a pattern, look there.

## Stack

| Layer | Choice |
|---|---|
| Framework | Expo SDK ~56, React Native 0.85, React 19, TypeScript strict |
| Routing | expo-router (file-based, typed routes), `src/app/` |
| State | zustand stores in `src/stores/` |
| Backend | Same Supabase project as the web app (`rhotxathnmkzbtlgxgjv`) — same tables, same RLS, same single-owner auth |
| Styling | RN `StyleSheet` + theme tokens from `src/theme/index.ts`; **never hardcode hex in components** — use `useTheme()` |
| Fonts | DM Sans / DM Mono via `@expo-google-fonts` (loaded in `src/app/_layout.tsx`) |
| Builds | EAS Build (cloud) → TestFlight; `ios/`+`android/` are **gitignored** (regenerate with `npx expo prebuild`) |

## Directory layout (`app/src/`)

```
app/            expo-router routes: _layout.tsx (auth guard), sign-in.tsx,
                (tabs)/ — summary, paige, work, community, home, life
components/     ui.tsx shared primitives (Screen, Card, Button, BottomSheet, …)
                + per-domain component dirs (summary/, tasks/, …)
stores/         zustand: authStore, themeStore, paigeModeStore, dataStore
theme/          palette (light = legacy cream theme, dark twin), radius, fonts
utils/          dates.ts, compute.ts (pure derivations), xp.ts (XP mutations)
utils/supabase/ client.ts, db.ts (ALL queries), database.types.ts (generated)
```

## Hard rules (extend the repo-wide ones in agent-rules.md)

1. **All Supabase queries live in `app/src/utils/supabase/db.ts`** as typed query
   objects — screens/hooks never touch the raw client. (Same rule as the web
   app's `src/db.js`, both wrap the same database.)
2. **`database.types.ts` is generated** — regenerate after every migration push:
   `set -a && source .env.local && set +a && supabase gen types typescript --linked --workdir $(pwd) > app/src/utils/supabase/database.types.ts` (repo root).
3. **Theme tokens only.** No hex literals in components; add tokens to
   `src/theme/index.ts` (both palettes) if a new color is needed.
4. **Data flow:** `dataStore.loadAll()` fetches every collection once at boot
   (the RN port of the legacy `loadData()`); screens derive views from raw rows
   at render time (`useMemo`, pure functions from `utils/compute.ts`). Writes go
   per-row through `db.ts`, then update the store via
   `upsertRow`/`removeRow`/`setProfileStats` — never re-fetch the world after a
   single-row change.
5. **XP economy:** all XP mutations go through `utils/xp.ts` helpers; never
   update `profile_stats` ad hoc from a screen.
6. **Verification:** no test suite. `cd app && npx tsc --noEmit` must pass;
   exercise behavior with `npx expo start` (Expo Go or simulator).
7. **Env:** `EXPO_PUBLIC_SUPABASE_URL` / `EXPO_PUBLIC_SUPABASE_ANON_KEY` come
   from `app/.env.local` locally and from `eas.json` per-profile env in EAS
   builds (cloud builds can't read `.env.local`). These are public-safe; RLS is
   the boundary. CLI-only secrets stay in the repo-root `.env.local`.

## Paige mode

`stores/paigeModeStore.ts` — persisted flag, same semantics as the web app's
`?mode=paige`: only the Home tab is visible (others get `href: null` in
`(tabs)/_layout.tsx`), edit controls hidden, completions log
`completed_by='paige'`. Enable: Summary → settings sheet → "Hand to Paige".
Exit: long-press the Home pane title → confirm.

## Deploy story

- **TestFlight (primary):** GitHub Actions workflow
  `.github/workflows/eas-build.yml` (manual dispatch) triggers EAS Build with
  `--auto-submit`; see [Queue a TestFlight Build.md](../Queue%20a%20TestFlight%20Build.md).
  Personal app → Internal Testing only, no App Review. Build numbers are
  EAS-managed (`appVersionSource: remote`, `autoIncrement`).
- **Web (legacy, still live):** repo-root `index.html` on GitHub Pages remains
  the fallback client until the native app fully proves out; both clients hit
  the same Supabase backend, so they coexist safely. Retire it deliberately —
  see USER_TODO Phase I.

## Running locally

```bash
cd ~/Code/life-dashboard/app
npm install          # first time
npx expo start       # QR code → Expo Go on the phone, or i for iOS simulator
npx tsc --noEmit     # typecheck
```
