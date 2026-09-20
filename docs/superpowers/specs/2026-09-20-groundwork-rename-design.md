# Wolf Checklist becomes Groundwork

**Date:** 2026-09-20
**Author:** Matt Walsh, Nursery & Field Operations Manager (design assisted by Claude)
**Status:** Draft for review

## Why

The app is called **Wolf Architect Jobs** and lives at
`titanalaska.github.io/Wolf-Checklist/`. It already carries four jobs —
Home2Suites, Wasilla Charter Academy, Baxter Family Housing and WSRCC — and
Palmer Public Library and Raspberry Townhomes are queued behind them. Only one
of those is a Wolf job.

The name is now actively misleading: somebody reading a WSRCC bed off a screen
headed *Wolf Architect Jobs* has to ignore the title to trust the page. That
gets worse with every job added, and the intent is to keep adding them — a job
checklist that consumes live inventory is the pattern for everything that
follows, not a one-off for this season.

**Groundwork** is the name. It describes a platform rather than a tool, and it
covers everything that starts at the ground: planting now, and whatever the
next trade is. It sits beside Bootprint as a pair rather than under it.

## Destination

`titanalaska.github.io/Groundwork/`.

A custom domain was considered and rejected for now. The cost is real and
stated plainly: **every move strands installed phones**, so choosing a github.io
path today means a second stranding event if a domain is ever wanted later.
That was weighed and accepted — the alternative was buying a domain before the
name has been lived with.

## What the origin actually is, verified

Checked against the live site on 2026-09-20, not assumed:

```
origin      https://titanalaska.github.io     shared by all three apps
path        /Wolf-Checklist/
caches      wolf-shell-v33, wolf-beds-v2      ORIGIN-scoped, not path-scoped
sw scope    /Wolf-Checklist/                  PATH-scoped
```

Three consequences fall directly out of that, and they drive the whole design.

### 1. localStorage keys do not change

`localStorage` is scoped to the **origin**, so `/Groundwork/` inherits every
key `/Wolf-Checklist/` wrote — `wolf-sync-key`, `wolf-checklist-*`,
`wolf-lang`, `wolf-inv-token`, `wolf-inv-profile` — with no migration code at
all. Renaming them to `groundwork-*` would throw that away: the value does not
follow the name, so every phone would silently lose its sync key and stop
sharing, and every saved count would read as zero.

**The `wolf-*` key names stay, permanently, as documented internal plumbing.**
Exactly the standing rule already in force for `yardMeasure*` in Bootprint.

This also explains why the accept-and-deduct work was careful to use
`wolf-inv-token` rather than Inventory's `titan_token`: the Inventory app is on
the *same origin*, so those keys genuinely share one namespace. That care was
necessary, not defensive.

### 2. Cache names must change, and so must the cleanup filter

This is the one that would do damage. `sw.js` `activate()` runs:

```js
names.filter(n => n.startsWith('wolf-') && !keep.includes(n))
     .map(n => caches.delete(n))
```

The Cache API is **origin-scoped**. A Groundwork worker running that filter
would delete `wolf-shell-v33` — the shell of the app people are still using —
breaking Wolf-Checklist offline mid-migration, on the phones of whoever has not
moved yet.

Groundwork uses `groundwork-shell-*` **and its cleanup only ever touches its
own prefix.** Neither app may delete the other's caches while both exist.

### 3. The bed-image cache keeps its name

`wolf-beds-v2` holds roughly 27 MB of bed crops, site maps and symbols across
two jobs. It is deliberately un-versioned so that a deploy does not throw it
away and pull it back down over cell data. Renaming it would force exactly that
re-download, for everyone, for no benefit.

**`wolf-beds-v2` stays.** Both apps may read it; neither deletes it.

## The migration

### Do not redirect the old path

This is the Bootprint mistake, and it is worth stating exactly. When Yard
Measure moved, `/Yard-Measure/sw.js` began returning a **301 to a different
origin**. The Service Worker spec forbids redirects on the worker script, so
the update check fails — silently. **Five PMs are still frozen on old
measurement code today**, with nothing on screen telling them why.

The checklist must not repeat it, and the stakes are higher: two silent
data bugs were fixed in this app on 2026-09-19, and a stranded phone would read
WSRCC beds against Home2Suites stock indefinitely.

### Order of work

1. **Merge and push accept-and-deduct first.** Renaming underneath an unmerged
   feature branch makes both harder to reason about and to revert.
2. **Create `/Groundwork/`** — new repo `titanalaska/Groundwork`, Pages
   enabled, the app renamed in title, manifest and icons.
3. **Ship one final update to `/Wolf-Checklist/`** that keeps working and
   shows a persistent banner: *this has moved to Groundwork, install the new
   one*. Because `sw.js` is **not** redirected, installed phones receive this
   update normally. That is the whole difference from Bootprint.
4. **Move people individually**, confirming each one. Install Groundwork from
   the new URL, check the job counts look right, then remove the old icon.
   Their data is already there — same origin — so nothing is carried by hand.
5. **Send Chris and Todd the new `status.html` link.** The old one keeps
   working throughout; it is a plain page with no service worker of its own.
6. **Retire `/Wolf-Checklist/` only when everyone is confirmed moved** — not
   assumed, not on a timer. Until then it stays live and working.

## What changes on screen

- `<h1>Wolf Architect Jobs</h1>` → `Groundwork`
- `manifest.json` `name` / `short_name` → `Groundwork`
- Icon label on the home screen
- The four job tabs are unchanged — they already carry their own names

Nothing about how the app works changes. This is a rename and a move, not a
redesign.

## Testing

- `npm test` and `npm run verify-tests` stay green throughout. Counts as of
  2026-09-20: **main is 19 Playwright; the accept-and-deduct branch is 14 node
  plus 22 Playwright.** Since that branch merges first (step 1), the figure to
  hold against during the rename is 14 + 22, not 19.
- A new test asserting **Groundwork's service worker never deletes a cache it
  does not own.** That is the failure with real consequences and it is
  invisible until somebody is offline in the yard.
- Install Groundwork on one phone, confirm the saved counts and sync key came
  across untouched, and confirm the old app still opens and still shows its
  banner.

## Out of scope

- A custom domain. Deliberately deferred, with the second-stranding cost
  understood and accepted.
- Renaming `localStorage` keys or the bed cache. Both are load-bearing as-is.
- Any change to what the app does. Accept-and-deduct ships on its own merits
  before this starts.
- Renaming the Inventory app or Bootprint.

## Open question

**Does anything outside the app link to `/Wolf-Checklist/`?** BuilderTrend
entries, a bookmark on the office TV, a link in an email to Chris or Corvus. A
link that outlives the old path becomes a dead end for somebody who was never
told about the move. Worth an answer before step 6, not before step 1.
