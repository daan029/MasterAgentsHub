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

**TikTok / Instagram followers** (Klipje agent) work differently, because
unlike YouTube neither platform has a public, key-only read API — both
require an OAuth user token tied to the @klipje0 account, which expires
and has to be refreshed periodically. A token like that can't safely live
inside this static, public page. Instead:

- `.github/workflows/social-stats.yml` runs `scripts/fetch-social-stats.js`
  on a schedule (every 6h, plus manual `workflow_dispatch`). That script
  refreshes the TikTok/Meta OAuth tokens, fetches follower/post counts,
  writes `social-stats.json` at the repo root, and commits it to `main` if
  it changed.
- Because tokens rotate/expire, the script also writes any refreshed token
  back into GitHub Actions secrets via the `gh` CLI, authenticated with a
  dedicated PAT (`GH_PAT` secret) — `GITHUB_TOKEN` can update repo
  *contents* but not repo *secrets*, so a PAT is required for that part.
  Use a fine-grained PAT scoped to only this repo (Contents: read,
  Secrets: write) rather than a classic `repo`-scoped one, since this repo
  is public.
- `index.html` just does a plain `fetch('./social-stats.json')` at page
  load (`refreshSocialStats()`) and fills in the Klipje agent's TikTok/
  Instagram stat lines — no secrets ever reach the browser. Before the
  workflow's first successful run (or on a network hiccup), it leaves the
  existing "stats not wired up" placeholder text alone rather than
  showing an error.

**One-time setup** (only needs doing once, by hand — OAuth consent can't
be scripted):

*TikTok:* create a developer app at developers.tiktok.com for @klipje0,
add the "Login Kit" product with scopes `user.info.basic` +
`user.info.stats`, register redirect URI `http://localhost:8787/callback`
(use `ngrok http 8787` instead if TikTok requires HTTPS), and if the app
isn't through review yet, add @klipje0 as an authorized test user. Then
run `TIKTOK_CLIENT_KEY=... TIKTOK_CLIENT_SECRET=... node
scripts/tiktok-init-auth.js` locally, open the printed URL, approve as
@klipje0, and copy the printed refresh token.

*Instagram/Meta:* confirm @klipje0 is a Business/Creator account linked
to a Facebook Page you control, create a "Business" app at
developers.facebook.com/apps, then in the Graph API Explorer generate a
token with `instagram_basic` + `pages_show_list` +
`pages_read_engagement` (check current Meta docs for whether
`instagram_manage_insights` is also needed), use "Extend Access Token" in
the Access Token Debugger to get a long-lived token, then call
`GET /me/accounts` to find the linked Page ID and
`GET /{page-id}?fields=instagram_business_account` to find the IG
Business Account ID.

Then add these to the repo (Settings → Secrets and variables → Actions):
secrets `TIKTOK_CLIENT_KEY`, `TIKTOK_CLIENT_SECRET`,
`TIKTOK_REFRESH_TOKEN`, `META_APP_ID`, `META_APP_SECRET`,
`META_LONG_LIVED_USER_TOKEN`, `GH_PAT`; variables `META_PAGE_ID`,
`META_IG_USER_ID` (not secrets — just IDs). Finally, trigger the workflow
once by hand (`gh workflow run social-stats.yml`) — and again right after,
to confirm the second run also succeeds using the token the first run
just rotated — before trusting the schedule.
