# Daan's Master Agents

A 3D command-deck visualization of Daan's autonomous agent fleet. Fully
self-contained: fonts, Three.js and all styling/JS are inlined into
`index.html` — nothing to install, nothing to build, no dependencies.

## Open it

Just open `index.html` in a browser — double-click it, or:
```
start index.html
```
(or, to view it over a local network, e.g. from another device on the
same wifi: `python -m http.server 8080` from this folder, then visit
`http://<this-machine's-ip>:8080`.)

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

## Live status (not yet wired up)

Right now status is a static value you edit by hand. Making it reflect
real agent state (e.g. the YouTube Agent's actual production-run status)
needs a live data source — worth a dedicated follow-up conversation
rather than guessing at an approach here.
