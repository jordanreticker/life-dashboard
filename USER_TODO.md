# USER TODO — Sheets → Supabase Migration

Everything **you** (the user) must do by hand. Agents cannot do these steps but will keep this checklist current and pick up immediately after each one. Agent-facing design lives in [context/supabase-migration.md](context/supabase-migration.md).

---

## Phase A — Provide the legacy source material

- [x] **A1. Export the Google Sheet as Excel.** In the Sheet: *File → Download → Microsoft Excel (.xlsx)*. Save it as `migration-source/legacy-data.xlsx` in this repo (create the folder). Every tab must be included — this is the entire database.
- [x] **A2. Copy the Apps Script source.** *(done — `migration-source/apps-script/Code.gs`)* In the Sheet: *Extensions → Apps Script*. Copy the full contents of every `.gs` file into `migration-source/apps-script/` (one file per script file, e.g. `Code.gs`). Agents need this to confirm the exact column layout of each tab before writing the import.
- [ ] **A3. Note the deployed web-app URL** (the `API` constant already in `index.html` — just confirm it's the current deployment, in case the import needs a live read for verification).

> `migration-source/` will be gitignored — it contains personal data and never gets committed.

## Phase B — Supabase project setup

- [x] **B1. Create a Supabase project** at https://supabase.com/dashboard (free tier is fine). Pick a region near you. Save the **database password** somewhere safe — the CLI link step needs it.
- [x] **B2. Collect credentials** from *Project Settings*:
  - Project **ref** (the short id in the URL) and project **URL** (`https://<ref>.supabase.co`)
  - **anon (public) key** — *Settings → API Keys* (this one ships in the app; that's expected)
  - A **personal access token** for the CLI — https://supabase.com/dashboard/account/tokens → "Generate new token"
- [x] **B3. Install the Supabase CLI** (if not already): `brew install supabase/tap/supabase`
- [x] **B4. Create `.env.local`** at the repo root containing: *(done — reused the account-level token from PindejosBowling with user approval)*
  ```
  SUPABASE_ACCESS_TOKEN=<your personal access token>
  ```
- [x] **B5. Link the repo to the project.** *(done 2026-06-11 — linked to `rhotxathnmkzbtlgxgjv`, verified fresh/empty database)* From the repo root:
  ```bash
  supabase init          # only if supabase/ doesn't exist yet (an agent may have done this)
  supabase link --project-ref <ref>
  ```
  Enter the database password when prompted.
- [x] **B6. Create your user account.** Dashboard → *Authentication → Users → Add user*: your email + a password (this is the app's single login). Note the generated **user UUID**.
- [x] **B7. Hand the agent:** *(done — recorded in `context/agent-rules.md`)* project ref, project URL, anon key, and your auth user UUID (none of these are secret in a problematic way; the access token stays only in `.env.local`). The agent will record ref/URL in `context/agent-rules.md`.

## Phase C — Schema + app build (agent work; your checkpoints)

- [x] **C1. Review the initial schema migration** the agent authors in `supabase/migrations/` (tables per the mapping in [context/supabase-migration.md](context/supabase-migration.md), RLS on every table). Approve before push.
- [x] **C2. Confirm the push:** *(pushed 2026-06-11; 25 tables, RLS on all; `supabase/schema.sql` regenerated)* agent runs `supabase db push`, regenerates `supabase/schema.sql`. Sanity-check tables exist in the Dashboard *Table Editor*.
- [x] **C3. Decide on the import dry-run:** the agent generates `migration-source/legacy-import.sql` from your xlsx. You may apply it yourself in *Dashboard → SQL Editor*, or give the agent explicit go-ahead to apply it once. Either way it runs **exactly once** — record the date here when done: `imported: 2026-06-11` *(user-approved CLI apply; will be regenerated + re-applied into truncated tables at D1 data freeze)*
- [ ] **C4. Verify the import** with the agent: row counts per table match sheet tab counts ✅ *(verified 2026-06-11: all 24 tables match; XP 33669, level 5, 10 badges, all-time counters intact, zero orphan FK refs)*; XP total, badges, and current-week numbers **in the new app** match the live legacy app *(pending — needs the rewired app, D2)*.

## Phase D — Cutover

- [x] **D1. Data freeze.** *(n/a — user confirmed 2026-06-11 that no legacy data changed after the A1 export, so the one-time import already covers everything; no re-import needed)*
- [x] **D2. Test locally** *(done 2026-06-11 — signed in, clicked through; chore lastDone derivation bug found and fixed)*
- [ ] **D3. Deploy:** merge/push to `main` — GitHub Pages serves the new version automatically (no Pages settings change needed). Open it on your phone and sign in once.
- [ ] **D4. Soak period (a few days–a week).** Use the app normally. The Google Sheet remains untouched as a rollback archive.

## Phase E — Decommission the legacy backend

- [ ] **E1. Archive the Apps Script deployment:** in the Apps Script editor, *Deploy → Manage deployments → Archive* (the web-app URL stops responding).
- [ ] **E2. Keep the Google Sheet** as a read-only historical archive (rename it e.g. "JrDr Office — pre-Supabase archive"). Do not delete it.
- [ ] **E3. Confirm cleanup:** agent removes the `API` constant and all dead Sheets sync code from `index.html`.

## Phase F — Push-notification routines (Claude + Pushover)

Claude's Cowork sandbox cannot reach `api.supabase.com` or `api.pushover.net`, so these two steps run from **your** terminal at the repo root:

- [ ] **F1. Push the `send_push` migration** (enables `pg_net`, adds `public.send_push()` reading creds from Vault — review `supabase/migrations/20260611210132_pushover_send_push.sql` first). Note: file was agent-named with a UTC timestamp (CLI unavailable in sandbox); format matches CLI convention so `db push` accepts it.
  ```bash
  SUPABASE_ACCESS_TOKEN=$(grep '^SUPABASE_ACCESS_TOKEN=' .env.local | cut -d'=' -f2) \
    supabase db push --linked --workdir $(pwd)
  ./supabase/refresh-schema-snapshot.sh
  ```
- [ ] **F2. Store Pushover credentials in Supabase Vault** via the Dashboard UI (no hand-run SQL): *Project Settings → Vault → Add new secret*. Create two secrets — values are in `.env.local`:
  | Name | Value |
  |---|---|
  | `pushover_app_token` | the `PUSHOVER_APP_TOKEN` value |
  | `pushover_user_key` | the `PUSHOVER_USER_KEY` value |
- [x] **F3. Tell Claude it's done** — *(done 2026-06-11; test pushes delivered, 3 routines created)* it will test `send_push` (read-only `select`) and activate the scheduled routines (morning briefing 8:00, drift detector 17:00, Sunday weekly review 18:00).
- [ ] **F4. Push the send_push v2 migration** (`20260611212418_send_push_html_attachments.sql` — HTML formatting + image attachments). ⚠️ The routines already call the new 6-arg signature, so push this **before the next 8:00 AM run** or the briefing will fail. Same commands as F1 (db push + snapshot refresh).

## Phase G — Image cards via Edge Function

Why: agents cannot reliably transcribe image bytes (the "black image" bug), so card images are now rendered **inside Supabase** by `supabase/functions/push-card/index.ts` and posted straight to Pushover. Your steps, from the repo root:

- [ ] **G1. Set Edge Function secrets** (values for the first two are in `.env.local`; the third is a new shared secret that authenticates callers of the function):
  ```bash
  SUPABASE_ACCESS_TOKEN=$(grep '^SUPABASE_ACCESS_TOKEN=' .env.local | cut -d'=' -f2) \
    supabase secrets set --linked --workdir $(pwd) \
    PUSHOVER_APP_TOKEN=<from .env.local> \
    PUSHOVER_USER_KEY=<from .env.local> \
    PUSH_FN_SECRET=a17f3b64e57e8032e5b2d19cd9f9d44bf96104c619ad2ee0
  ```
- [ ] **G2. Add the shared secret to Vault** (Dashboard → Project Settings → Vault → Add new secret) so Postgres can authenticate to the function:
  | Name | Value |
  |---|---|
  | `push_fn_secret` | `a17f3b64e57e8032e5b2d19cd9f9d44bf96104c619ad2ee0` |
- [ ] **G3. Deploy the function** (`--no-verify-jwt` because auth is the shared-secret header, not a JWT):
  ```bash
  SUPABASE_ACCESS_TOKEN=$(grep '^SUPABASE_ACCESS_TOKEN=' .env.local | cut -d'=' -f2) \
    supabase functions deploy push-card --no-verify-jwt --linked --workdir $(pwd)
  ```
- [ ] **G4. Push the `send_push_card` migration + refresh snapshot** (same commands as F1; the pending migration is `20260612023130_send_push_card.sql`).
- [ ] **G5. Tell Claude it's done** — it will fire a test card and update the routines.

---

## Ongoing (post-migration) rules that involve you

- Schema changes are agent-authored migrations — you never run SQL by hand in the Dashboard after C3/D1 (the SQL Editor is for *reading* only from then on).
- If `supabase gen`-style commands ever complain about "Legacy API keys are disabled", toggle them in *Settings → API*, run the command, toggle back (known quirk from the PindejosBowling workflow).
- Your `.env.local` token is the only secret. If it leaks, revoke it at https://supabase.com/dashboard/account/tokens and make a new one.
