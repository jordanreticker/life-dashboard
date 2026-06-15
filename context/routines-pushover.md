# Claude Routines + Pushover Notifications

How scheduled Claude (Cowork) tasks read dashboard data and notify the user's phone.

## Architecture

```
Claude scheduled task (Cowork)
  → Supabase MCP connector: read-only SELECTs over app tables
  → Claude composes the summary (text + small JSON card payload)
  → text-only:  SELECT public.send_push(title, message, priority)
  → with image: SELECT public.send_push_card(jsonb payload)
       → pg_net POSTs to Edge Function /functions/v1/push-card
       → function renders card SVG → PNG (resvg-wasm) server-side
       → posts to api.pushover.net with the image attached
```

Why this shape: the Cowork sandbox's network allowlist blocks `api.pushover.net`,
`api.supabase.com` AND the project domain, so HTTP egress happens **from Postgres**
(`pg_net`) and data access goes through the **Supabase MCP connector**. Images are
rendered **inside the Edge Function** because LLM agents cannot reliably transcribe
base64 image bytes between tools (a single corrupted character = black image on the
phone). Agents pass only small JSON (task names, counts) — never image bytes.

## Components

- **Migrations**: `20260611210132_pushover_send_push.sql` (enables `pg_net`, initial
  function) and `20260611212418_send_push_html_attachments.sql` (current signature:
  `public.send_push(p_title, p_message, p_priority default 0, p_url default
  <dashboard URL>, p_attachment_b64 default null, p_attachment_type default
  'image/png')` — HTML always on, optional base64 image shown in the notification).
  `security definer`, pinned `search_path`, execute revoked from `anon`/`public`.
- **Migration 3**: `20260612023130_send_push_card.sql` — `public.send_push_card(jsonb)`
  posts the payload to the push-card Edge Function with the `x-push-secret` header
  (read from Vault secret `push_fn_secret`).
- **Edge Function**: `supabase/functions/push-card/index.ts` — deployed with
  `--no-verify-jwt` (auth = shared-secret header). Env secrets: PUSHOVER_APP_TOKEN,
  PUSHOVER_USER_KEY, PUSH_FN_SECRET (`supabase secrets set`). Renders `card.kind`
  "day" (briefing card) or "week" (trend chart); on render failure it still sends
  the text — never skips the push. Payload schema is documented at the top of the
  function file.
- **`send_push` v2** (`p_attachment_b64` param) remains for text-only pushes (drift
  detector). NEVER pass agent-transcribed base64 through it — that is the bug the
  Edge Function exists to fix.
- **Secrets**: Supabase Vault, names `pushover_app_token` and `pushover_user_key`
  (entered by the user via Dashboard → Vault UI; never committed). Local copies live
  in `.env.local` (gitignored). The same credentials exist in the legacy Apps Script
  (`migration-source/apps-script/Code.gs`, `setupPushover()`).
- **Routines** (Claude scheduled tasks, defined in Cowork — not in this repo):
  - `morning-briefing` — daily 08:00: due/overdue tasks, chores past interval,
    contacts past cadence, important dates ≤14d out, active focuses.
  - `drift-detector` — daily: pushes ONLY if something is quietly slipping
    (person ≥2× past cadence, high/urgent task stale ≥14d, health goal at 0
    past midweek, focus with no related completions). No push = all good.
  - `weekly-review` — Sunday evening: trends from weekly_stats, health goal hit
    rates, journal mood, section balance; artifact page + teaser push.

## Rules for agents

1. Routines use the MCP connector for **SELECT only** — never INSERT/UPDATE/DELETE/DDL
   (hard constraint 1 still applies; `select send_push(...)` is the one sanctioned
   side-effecting call).
2. Delivery check: `send_push` returns a `net` request id; response is async in
   `net._http_response` (rows expire ~6h). Pushover returns `{"status":1}` on success.
3. Message budget: Pushover truncates at 1024 chars; keep titles ≤250. HTML is
   enabled: <b>, <i>, <font color>, <a href> render; keep markup minimal.
4. Priority: use 0 (default); reserve 1 for genuinely urgent drift alerts. Never 2.
5. Schema changes for routine needs are still CLI migrations pushed by the user.
