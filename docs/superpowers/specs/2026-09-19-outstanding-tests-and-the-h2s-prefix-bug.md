# Wolf Checklist — what a bed still owes, and the bug the tests found

**Date:** 2026-09-19
**Status:** Both bugs fixed. 11 tests passing, 8 mutations caught.

## The bug

`bedOutstanding()` decides whether a planted bed reads **complete** or
**planted, still owed** — on the card and as the colour on the map. It looked
up received counts like this:

```js
if((state["h2s:" + slug(row[0])] || 0) === 0){
```

Every other count read in the file builds the key as `jobKey + ":" + slug(...)`.
This one was pinned to Home2Suites, and `bedOutstanding` is called from the bed
card, the map colour and the daily log for **whichever job tab is open**.

So every WSRCC bed was answered with Home2Suites' stock. It failed both ways:

| | |
|---|---|
| **Over-reporting** | A WSRCC-only species has no `h2s:` key at all. Ivory Halo Dogwood had 97 received; the lookup returned undefined, read as zero, and bed B01 claimed all 46 were owed. Somebody gets sent looking for plants that are already in the ground. |
| **Under-reporting** | A species in both jobs reads the other job's count. WSRCC had received **0** Columnar Swedish Aspen while Home2Suites held 14 — so it read 14, decided the species was "partially received", fell through to the manual owed map (empty), and reported **nothing owed**. A bed reads finished with no material on site. |

**43 of the 47 WSRCC beds** contained at least one affected code.

The under-reporting direction is the one that costs money, and it is the same
family as the phantom shortages already logged in this file's own comments —
*"65 Birchleaf Spirea sitting at the Home2 Suites staging area that were always
WSRCC's"*. Material in the right company and the wrong place.

It is also the same mistake the `CODE_ROW` cache had, fixed a few lines above
with the comment *"which silently fed the wrong row to bedOutstanding"*. The
fix landed on the cache and missed the line below it.

## The fix

```js
var jk = job || currentJob;
...
if((state[jk + ":" + slug(row[0])] || 0) === 0){
```

`job || currentJob` matches what `owedIn()` already does, so the count lookup
and the owed map now agree on which job they are talking about.

## The second bug, found by the same tests

`generateReport()` walks **both** jobs in one pass while the globals follow the
open tab. It passed the job in explicitly for the counts, but `codeRow()` still
resolved against the open tab — so with the WSRCC tab open, **17 Home2Suites
species codes resolved to nothing and were silently dropped, across 36 of the
44 H2S beds.**

That is the report Chris reads. It understated the shortfall list, the same
direction of failure as the bug above.

**Fixed.** `codeRow(code, job)` now resolves against a named job, and its cache
is a map keyed by job rather than one shared slot:

```js
var CODE_ROW_BY_JOB = {};
function codeRow(code, job){
  var forJob = job || currentJob;
  ...
}
```

`bedOutstanding` passes its own `jk` down, so the row lookup and the count
lookup can no longer disagree about which job they are discussing.
`applyJobData()` no longer clears the cache — each job's map stays valid, which
is the point.

`codeForName()` and `logSpecies()` deliberately still follow the open tab: they
are display helpers and are never called across jobs.

**Verified in the browser, not just in tests.** With the WSRCC tab open, all
44 of 44 Home2Suites beds report, across 22 distinct species. Before the fix,
36 of 44 were silently incomplete.

## The tests

`npm test` — 11 passing, ~10 s. They load `index.html` over `file://` and drive
the counting functions directly; the script block is top level so everything is
reachable, and `applyJobData()` is used to change jobs so the tests switch the
way the app does.

`npm run verify-tests` — breaks the logic on purpose, one bug at a time into a
gitignored copy, and checks the guarding test goes red. Eight mutations, all
caught. The first one puts the `"h2s:"` prefix back, so the suite has to keep
proving it catches the bug it was written for.

### Three things the mutation check taught us

**A test that passes can still be testing nothing.** The first version of *"a
bed can be asked about by job"* set `currentJob = 'h2s'` and then passed
`'h2s'` — so the mutation `jk = currentJob` produced an identical value and the
test could not tell the difference. The job argument only matters when it
differs from the open tab.

**Not every surviving mutation is a hole.** Before the refactor the cache was
invalidated twice over — `codeRow()` compared the cached job to the open one,
*and* `applyJobData()` nulled it. Breaking either alone changed no behaviour at
all: an equivalent mutant, and the suite was right to stay green. Only breaking
both at once tested anything.

**A test can check consistency and call it correctness.** *"A bed reports the
same thing whichever tab happens to be open"* does not catch a single shared
cache — it seeds that cache from Home2Suites, so both reads hit the same stale
map and agree with each other perfectly while both being wrong. The WSRCC tests
are what actually catch it. Two readings agreeing is not evidence that either
is right, and the mutation list records which test does the real work.

## Deploy note

`sw.js` `CACHE_VERSION` bumped v31 → v32. Without it, installed phones keep
serving the old shell and would never receive this fix.
