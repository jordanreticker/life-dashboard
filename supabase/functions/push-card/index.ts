// push-card — renders a notification card image server-side and sends it to
// Pushover. Exists because the Cowork sandbox cannot reach api.pushover.net and
// LLM agents cannot reliably transcribe base64 image bytes; here the bytes
// never leave Supabase. See context/routines-pushover.md.
//
// Deploy:  supabase functions deploy push-card --no-verify-jwt
// Secrets: supabase secrets set PUSHOVER_APP_TOKEN=... PUSHOVER_USER_KEY=... PUSH_FN_SECRET=...
// Caller auth is the x-push-secret header (verify_jwt is off; anon key is public).
//
// POST body: {
//   title: string, message: string, priority?: number, url?: string,
//   card?: { kind: "day", date: string, streak: number,
//            today: string[], overdue: {t: string, d: string}[], urgent: number,
//            health: {name: string, done: number, target: number}[],
//            chores: {due: number, worst: string[]},
//            week: ("win"|"loss"|null)[] }
//        | { kind: "week", weeks: {label: string, tasks: number, chores: number, xp: number}[] }
// }

import { initWasm, Resvg } from "npm:@resvg/resvg-wasm@2.6.2";

const WASM_URL =
  "https://cdn.jsdelivr.net/npm/@resvg/resvg-wasm@2.6.2/index_bg.wasm";
const FONT_URL =
  "https://cdn.jsdelivr.net/npm/dejavu-fonts-ttf@2.37.3/ttf/DejaVuSans.ttf";
const FONT_BOLD_URL =
  "https://cdn.jsdelivr.net/npm/dejavu-fonts-ttf@2.37.3/ttf/DejaVuSans-Bold.ttf";

let ready: Promise<{ fonts: Uint8Array[] }> | null = null;
function init() {
  ready ??= (async () => {
    await initWasm(fetch(WASM_URL));
    const fonts = await Promise.all(
      [FONT_URL, FONT_BOLD_URL].map(async (u) =>
        new Uint8Array(await (await fetch(u)).arrayBuffer())
      ),
    );
    return { fonts };
  })();
  return ready;
}

// Palette (matches the app's dark theme)
const BG = "#171a21", CARD = "#21252f", TXT = "#e8eaf0", DIM = "#8a90a0";
const GREEN = "#2ecc71", RED = "#e74c3c", AMBER = "#f0a030", BLUE = "#4aa3ff";
const SOFT_RED = "#f0a8a0";

const esc = (s: string) =>
  s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
const trunc = (s: string, n = 40) => (s.length > n ? s.slice(0, n - 1) + "…" : s);

function text(
  x: number, y: number, s: string,
  { size = 15, color = TXT, bold = false, anchor = "start" } = {},
) {
  return `<text x="${x}" y="${y}" font-family="DejaVu Sans" font-size="${size}" ` +
    `fill="${color}" ${bold ? 'font-weight="bold"' : ""} text-anchor="${anchor}">${esc(s)}</text>`;
}

function dayCard(c: any): string {
  const W = 600;
  const parts: string[] = [];
  let y = 56;
  parts.push(text(36, y, c.date ?? "", { size: 28, bold: true }));
  parts.push(text(W - 36, y, `streak ${c.streak ?? 0}`, { size: 17, color: AMBER, bold: true, anchor: "end" }));
  y += 44;

  // Tasks
  parts.push(text(36, y, "TASKS", { size: 13, color: DIM, bold: true })); y += 26;
  const list = (label: string, color: string, items: string[], itemColor: string) => {
    if (!items.length) return;
    parts.push(text(36, y, label, { size: 12, color, bold: true })); y += 24;
    for (const it of items.slice(0, 5)) {
      parts.push(text(48, y, "•  " + trunc(it), { size: 16, color: itemColor })); y += 26;
    }
    if (items.length > 5) {
      parts.push(text(48, y, `+ ${items.length - 5} more`, { size: 13, color: DIM })); y += 24;
    }
    y += 6;
  };
  list("TODAY", BLUE, c.today ?? [], TXT);
  list("OVERDUE", RED, (c.overdue ?? []).map((o: any) => `${o.t}  (${o.d})`), SOFT_RED);
  if (c.urgent > 0) {
    parts.push(text(48, y, `+ ${c.urgent} urgent without a date`, { size: 14, color: AMBER })); y += 28;
  }
  y += 8;

  // Health
  parts.push(text(36, y, "HEALTH · this week", { size: 13, color: DIM, bold: true })); y += 28;
  for (const g of c.health ?? []) {
    const pct = Math.min(1, g.target ? g.done / g.target : 0);
    parts.push(text(36, y, trunc(g.name, 32), { size: 16 }));
    parts.push(text(W - 36, y, `${g.done}/${g.target}`, {
      size: 16, color: g.done === 0 ? RED : GREEN, bold: true, anchor: "end",
    }));
    parts.push(`<rect x="36" y="${y + 8}" width="${W - 72}" height="9" rx="4.5" fill="${CARD}"/>`);
    if (pct > 0) {
      parts.push(`<rect x="36" y="${y + 8}" width="${(W - 72) * pct}" height="9" rx="4.5" fill="${GREEN}"/>`);
    }
    y += 42;
  }
  y += 10;

  // Chores
  parts.push(text(36, y, "CHORES", { size: 13, color: DIM, bold: true })); y += 30;
  parts.push(text(36, y, `${c.chores?.due ?? 0} due`, {
    size: 22, color: (c.chores?.due ?? 0) > 0 ? RED : GREEN, bold: true,
  }));
  if (c.chores?.worst?.length) {
    parts.push(text(150, y, "worst: " + trunc(c.chores.worst.join(" · "), 48), { size: 13.5, color: TXT }));
  }
  y += 44;

  // Week
  parts.push(text(36, y, "WEEK", { size: 13, color: DIM, bold: true })); y += 30;
  let x = 50;
  let w = 0, l = 0;
  for (const r of c.week ?? []) {
    const col = r === "win" ? GREEN : r === "loss" ? RED : DIM;
    if (r === "win") w++; if (r === "loss") l++;
    parts.push(`<circle cx="${x}" cy="${y}" r="11" fill="${col}"/>`);
    x += 36;
  }
  parts.push(text(W - 36, y + 6, `${w}W – ${l}L`, { size: 19, bold: true, anchor: "end" }));
  y += 50;

  const H = Math.max(y, 300);
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}">` +
    `<rect width="${W}" height="${H}" fill="${BG}"/>${parts.join("")}</svg>`;
}

function weekCard(c: any): string {
  const W = 640, H = 420, padL = 50, padB = 60, padT = 70, padR = 30;
  const weeks = c.weeks ?? [];
  const parts: string[] = [];
  parts.push(text(36, 40, "8-Week Trend", { size: 22, bold: true }));
  parts.push(text(W - 30, 40, "XP line · tasks/chores bars", { size: 12, color: DIM, anchor: "end" }));
  const plotW = W - padL - padR, plotH = H - padT - padB;
  const maxBar = Math.max(1, ...weeks.map((w: any) => Math.max(w.tasks, w.chores)));
  const maxXp = Math.max(1, ...weeks.map((w: any) => w.xp));
  const slot = plotW / Math.max(1, weeks.length);
  const pts: string[] = [];
  weeks.forEach((wk: any, i: number) => {
    const cx = padL + slot * i + slot / 2;
    const bw = Math.min(18, slot / 3);
    const th = (wk.tasks / maxBar) * plotH, ch = (wk.chores / maxBar) * plotH;
    parts.push(`<rect x="${cx - bw - 2}" y="${padT + plotH - th}" width="${bw}" height="${th}" fill="${BLUE}"/>`);
    parts.push(`<rect x="${cx + 2}" y="${padT + plotH - ch}" width="${bw}" height="${ch}" fill="${GREEN}"/>`);
    pts.push(`${cx},${padT + plotH - (wk.xp / maxXp) * plotH}`);
    parts.push(text(cx, H - 28, wk.label, { size: 12, color: DIM, anchor: "middle" }));
  });
  parts.push(`<polyline points="${pts.join(" ")}" fill="none" stroke="${AMBER}" stroke-width="3"/>`);
  for (const p of pts) {
    const [px, py] = p.split(",");
    parts.push(`<circle cx="${px}" cy="${py}" r="4.5" fill="${AMBER}"/>`);
  }
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}">` +
    `<rect width="${W}" height="${H}" fill="${BG}"/>${parts.join("")}</svg>`;
}

Deno.serve(async (req) => {
  if (req.method !== "POST") return new Response("POST only", { status: 405 });
  if (req.headers.get("x-push-secret") !== Deno.env.get("PUSH_FN_SECRET")) {
    return new Response("forbidden", { status: 403 });
  }
  const token = Deno.env.get("PUSHOVER_APP_TOKEN");
  const user = Deno.env.get("PUSHOVER_USER_KEY");
  if (!token || !user) return new Response("missing pushover secrets", { status: 500 });

  let body: any;
  try { body = await req.json(); } catch { return new Response("bad json", { status: 400 }); }
  if (!body.title || !body.message) return new Response("title and message required", { status: 400 });

  const form = new FormData();
  form.set("token", token);
  form.set("user", user);
  form.set("title", String(body.title).slice(0, 250));
  form.set("message", String(body.message).slice(0, 1024));
  form.set("html", "1");
  form.set("priority", String(body.priority ?? 0));
  form.set("url", body.url ?? "https://jordanreticker.github.io/life-dashboard");

  if (body.card) {
    try {
      const { fonts } = await init();
      const svg = body.card.kind === "week" ? weekCard(body.card) : dayCard(body.card);
      const png = new Resvg(svg, {
        background: BG,
        font: { fontBuffers: fonts, defaultFontFamily: "DejaVu Sans", loadSystemFonts: false },
      }).render().asPng();
      form.set("attachment", new Blob([png], { type: "image/png" }), "card.png");
    } catch (e) {
      // Never block the notification on a render failure — send text-only.
      console.error("card render failed:", e);
    }
  }

  const res = await fetch("https://api.pushover.net/1/messages.json", {
    method: "POST",
    body: form,
  });
  const out = await res.text();
  return new Response(out, {
    status: res.status,
    headers: { "Content-Type": "application/json" },
  });
});
