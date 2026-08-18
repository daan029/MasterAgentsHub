# Daan's Master Agents

A 3D command-deck visualization of Daan's autonomous agent fleet. Fully
self-contained: fonts, Three.js and all styling/JS are inlined into
`index.html` — nothing to install, nothing to build, no dependencies.

## Live link (phone-bookmarkable)

**https://daan029.github.io/MasterAgentsHub/** — hosted via GitHub Pages
(repo is public since 2026-08-18 specifically to allow this; the free
GitHub plan doesn't support Pages on a private repo). Push to `main` and
the live site updates automatically within ~a minute.

This is deliberately **not** hosted as a Claude Artifact: Artifacts run
in a sandbox with a strict CSP that blocks all external fetch/XHR except
to Google Fonts, which silently breaks the live YouTube Data API call
this page makes (works fine opened as a local `file://`, since there's
no CSP there — that's what made the bug non-obvious the first time).
GitHub Pages has no such restriction. `index.html` has an explicit
`<!DOCTYPE html>` at the top for this reason too — the Artifact tool
injects one automatically at publish time, but a standalone static host
serves the file as-is, and without it the browser renders in quirks mode.

## Open it locally

Just open `index.html` in a browser — double-click it, or:
```
start index.html
```
(or, to view it over a local network, e.g. from another device on the
same wifi: `python -m http.server 8080` from this folder, then visit
`http://<this-machine's-ip>:8080`.)

## Verify the live site after a change

`node verify_pages.js` drives the live GitHub Pages URL with Playwright
(same Edge-via-`executablePath` setup as `screenshot.js`/`debug.js`) and
prints console/page errors plus the rendered body text — use it to
confirm a push actually went live with real data before trusting it,
rather than guessing from the source.

## Adding an agent

Edit the `AGENTS` array near the top of the `<script>` block in
`index.html`:
```js
var AGENTS = [
  {
    id: "unique-id",
    name: "Display Name",
    role: "One-line description of what it does",
    status: "offline",   // "online" | "busy" | "offline" | "error"
    detail: "Longer description shown in the detail panel.",
    lastActive: "Not yet deployed"
  },
  // add more entries here — they auto-distribute evenly around the hub
];
```
Status colors: **blue** = online, **green** = busy, **grey (no glow)** =
offline, **red** = error. Both grey and red read as "not online" per how
this was scoped, but are kept visually distinct since that split is
useful at a glance.

## Live status

The online/busy/offline/error dot is still a static value you edit by
hand in the `AGENTS` array — making that reflect the production
laptop's actual real-time state needs a live data source and is a
deliberate deferral, not wired up yet.

**Videos posted / total views / last published**, however, *are* live
(wired up 2026-08-17) — the page fetches them directly from the public
YouTube Data API every time it loads, via the `youtube: { handle: ... }`
field on an agent and the `YOUTUBE_API_KEY` constant near the top of the
`<script>` block. This means those figures stay accurate even when the
production laptop is asleep or offline — they don't depend on that
machine at all, only on the browser having internet access.

To set it up: paste a YouTube Data API key (Google Cloud Console →
APIs & Services → Credentials → Create Credentials → API key, then
restrict it under "API restrictions" to YouTube Data API v3 only — it's
read-only public data, so it's safe to ship inside this static page) into
`YOUTUBE_API_KEY` in `index.html`. Until a real key is set, the stats
panel shows "—" with a note explaining it isn't wired up yet, instead of
silently showing wrong numbers.
