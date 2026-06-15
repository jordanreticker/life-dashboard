# Native App Feel — PWA Polish TODO

Goal: make "JrDr's Office" install to the iPhone home screen and look/feel like a
real native app, matching the pass just done on the sibling `music-club-app`.

**Good news:** this app already does most of the hard part. The interaction layer
(standalone mode, notch-safe areas, status-bar styling, no tap-highlight, no
document bounce, `100dvh` layout, fixed thumb-reach tab bar) is already in
`index.html`. What's missing is the **installable-PWA layer**: a web manifest, a
real home-screen app icon, and a couple of small interaction tweaks.

> **Stack rule (AGENTS.md #5): NO build step.** This is plain static `index.html`
> on GitHub Pages. Do these as direct file edits — no npm, no bundler, no framework.

> **Paths must be relative.** The site is served from a subpath
> (`https://jordanreticker.github.io/life-dashboard/`). Use relative hrefs
> (`manifest.json`, `icons/...`) and a relative manifest `start_url`/`scope` of `"."`
> so nothing breaks under the subpath (and it still works on a custom domain/root).

---

## Already done (don't redo — for reference)

- [x] `viewport-fit=cover` + `user-scalable=no` + `maximum-scale=1` (no zoom jank)
- [x] `apple-mobile-web-app-capable` (standalone launch, no browser chrome)
- [x] `apple-mobile-web-app-status-bar-style="black-translucent"` + `apple-mobile-web-app-title`
- [x] Safe-area insets wired (`--safe-t` / `--safe-b`, frosted status-bar strip, tab bar padding)
- [x] `-webkit-tap-highlight-color: transparent` and `overscroll-behavior: none`
- [x] Single-scroll-container `100dvh` layout (body never scrolls)

---

## Phase 1 — App icon (user-provided source, then generate sizes)

- [ ] **1a. Drop in a 1024×1024 source icon** as `icon-source.png` in the repo root.
  Square, full-bleed art on a solid background (no transparency at the corners so
  the iOS home-screen icon has no black edges). Match the brand bg `#F4F2ED` or a
  bold accent.
- [ ] **1b. Generate the sized icons** (macOS `sips`, no install needed):
  ```sh
  mkdir -p icons
  sips -z 180 180 icon-source.png --out icons/apple-touch-icon.png
  sips -z 192 192 icon-source.png --out icons/icon-192.png
  sips -z 512 512 icon-source.png --out icons/icon-512.png
  sips -z 32  32  icon-source.png --out icons/favicon-32.png
  ```

## Phase 2 — Web manifest

- [x] **2a. Create `manifest.json`** in the repo root (relative paths → subpath-safe):
  ```json
  {
    "name": "JrDr's Office",
    "short_name": "JrDr",
    "description": "Personal life dashboard — tasks, chores, journal, finances, and gamified streaks.",
    "start_url": ".",
    "scope": ".",
    "display": "standalone",
    "orientation": "portrait",
    "background_color": "#F4F2ED",
    "theme_color": "#F4F2ED",
    "icons": [
      { "src": "icons/icon-192.png", "sizes": "192x192", "type": "image/png", "purpose": "any" },
      { "src": "icons/icon-512.png", "sizes": "512x512", "type": "image/png", "purpose": "any" },
      { "src": "icons/icon-512.png", "sizes": "512x512", "type": "image/png", "purpose": "maskable" }
    ]
  }
  ```

## Phase 3 — Wire the icon + manifest into `<head>`

- [x] **3a. Add these lines to the `<head>` of `index.html`** (just after the existing
  `apple-mobile-web-app-title` meta):
  ```html
  <meta name="mobile-web-app-capable" content="yes"/>
  <meta name="application-name" content="JrDr's Office"/>
  <meta name="theme-color" content="#F4F2ED"/>
  <link rel="manifest" href="manifest.json"/>
  <link rel="apple-touch-icon" href="icons/apple-touch-icon.png"/>
  <link rel="icon" type="image/png" sizes="32x32" href="icons/favicon-32.png"/>
  ```

## Phase 4 — Small interaction tweaks (parity with music-club-app)

- [x] **4a. In the base CSS** (the `html,body{...}` rule), add the no-zoom / no-callout
  / smoothing bits the other app got. The `*{...}` rule already kills tap-highlight;
  add:
  ```css
  html{ -webkit-text-size-adjust:100%; text-size-adjust:100%; }
  body{
    -webkit-font-smoothing:antialiased;
    -moz-osx-font-smoothing:grayscale;
    touch-action:manipulation;        /* no 300ms delay / double-tap zoom */
    -webkit-touch-callout:none;        /* no long-press "save image" menu on chrome */
  }
  /* keep real text fields first-class */
  input,textarea,[contenteditable="true"]{
    -webkit-user-select:text; user-select:text; -webkit-touch-callout:default;
  }
  ```

## Phase 5 — Verify

- [ ] **5a.** Commit + push; wait for GitHub Pages to deploy.
- [ ] **5b.** On the iPhone, open the site in **Safari → Share → Add to Home Screen**.
  Confirm: the real app icon shows (not a screenshot), it launches full-screen with
  no Safari chrome, the status bar sits cleanly over the frosted strip, and there's
  no zoom-on-input or grey tap flash.
- [ ] **5c.** (Optional) Run Lighthouse → "Installable" PWA check in Chrome DevTools.

---

### Out of scope / not applicable here
- **No `+html.tsx`** — that was the Expo mechanism in `music-club-app`. This app has
  no router/build, so the equivalent is editing `index.html`'s `<head>` directly (Phase 3).
- A service worker / offline caching isn't required for the home-screen "feels like an
  app" goal and would add complexity against the no-build rule — skip unless you
  specifically want offline support later.
