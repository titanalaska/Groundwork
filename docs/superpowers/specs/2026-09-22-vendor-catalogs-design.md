# Vendor catalogs in Groundwork — "who carries it"

Design for review. Matt Walsh, Nursery & Field Operations Manager, 9/22/26.
Nothing here is built yet.

## The idea

When a species is short, the answer is often **the same plant from another
grower**, not a different plant. Titan already holds wholesale lists from
several nurseries. Groundwork should show, under each species, which of those
lists carries it — at what size, what price, and from which dated list — so a
shortage can be filled without re-reading five catalogs on a phone.

## Decisions already made (Matt, 9/22)

| Question | Decision |
|---|---|
| What the catalogs give you | **Who carries THIS species.** Not stand-in species. |
| Where it shows | **App (Subs panel) and status page.** |
| Prices | **Shown on the status page too.** Matt chose this knowing the status page is a public, no-login URL. `vendors.js` ships with the app on the same public site, so the prices are public either way. |
| Old lists | **Every line shows its list date.** Nothing hidden, no cutoff. |

## What it looks like

In the Subs panel, above the sub options, and under the species on status.html:

```
Paper Birch — who carries it
  Seed 'n' Tree: 1.5" $175 · 2" $238 · 2.5" $325 …   (2026 list, rec'd 7/1/26)
  McKay, as "Canoe Birch": …                         (list of 7/20/26)
  Bron: not on list                                   (2027 booking form)
Early Forsythia — not mapped yet
```

- The vendor's own name is shown whenever it differs from the plan name.
- "Not on list" is only said for a vendor whose list was read for that species.
  A species the alias table has not covered says **"not mapped yet"** — never a
  guess, never a silent blank.
- Record only, like subs: nothing here touches a count, a shortfall or a total.
- It **never ranks vendors, recommends one, or totals a cost.** It shows what
  each list says. The buying call is Matt's.

## Architecture

```
catalog files (claudes room)          species-alias-table.json
  Bron .txt, McKay .xlsx,        ──►   plan name → each vendor's name
  Stewart .txt, Bailey quote,          (verified off the books)
  Seed 'n' Tree .pdf/.txt                        │
            │                                    │
            └────────► tools/build-vendors.py ◄──┘
                                │
                                ▼
                  Wolf-Checklist-repo/vendors.js   (generated, committed)
                                │
             ┌──────────────────┴──────────────────┐
             ▼                                     ▼
   index.html — Subs panel                status.html — under each species
```

### `vendors.js`

Loaded with a plain `<script src>` exactly like `jobs.js`, so it works with no
signal. Precached by `sw.js`, **not** as CRITICAL: without it the app still
works and the block reads "vendor lists not loaded".

```js
var VENDORS = {
  lists: {
    seedntree: { label: "Seed 'n' Tree", listed: "2026 list", received: "2026-07-01" },
    mckay:     { label: "McKay", listed: "list of 7/20/26", received: "2026-07-21" },
    ...
  },
  // keyed by the same slug the app uses for a species row
  species: {
    "paper-birch": {
      mapped: true,
      seedntree: { as: "Alaska paper birch", forms: [["1.5\"", 175], ["2\"", 238], ...] },
      mckay:     { as: "Canoe Birch", forms: [...] },
      bron:      null            // read, not on the list
    },
    "early-forsythia": { mapped: false }
  }
};
```

### `tools/build-vendors.py`

Reads each catalog file and the alias table, writes `vendors.js`. Rules:

1. **Matching only through the alias table.** A plain name search is exactly how
   "Paper Birch" returns nothing at McKay (filed as Canoe Birch) and "contorta"
   hits Harry Lauder's Walkingstick. The script looks up the vendor's own name
   from the table and finds that line; it does not search by plan name.
2. **Extracts four things per line and nothing else:** the vendor's name as
   printed, size, price, and the list's date. No notes, no free text. That is
   what keeps anything a vendor list says about its own business out of the
   app by construction.
3. **Deterministic.** Same inputs, same file. Re-run it when a new list lands.

### Alias table: 23 → 51 species

The table covers 23 species; Groundwork has 51. Part of Phase 1 is reading the
books for the other 28 the same way the first 23 were — each entry off a
document in hand, `status` marked `unresolved` where the books do not settle
it. Known already:

- **Early Forsythia (NTMB)** — Seed 'n' Tree carries only "Meadowlark". Whether
  that is the plan's plant is not assumed; needs the NTMB schedule's botanical.
- **Karl Foerster** — Seed 'n' Tree writes "Carl forester" (and Bron "Foerster's").
- **Hedge Cotoneaster** — Seed 'n' Tree lists it at #3 ($32), not #5. Shown as listed.

## Sources

| Vendor | File on laptop | Prices | Phase |
|---|---|---|---|
| Seed 'n' Tree | `Seed-n-Tree-2026-pricelist.pdf` + `.txt` (2026 season, rec'd 7/1/26) | yes | 1 |
| Bron & Sons | `Bron-2027-Spring-Booking-Order-Form.txt` | yes (2027) | 1 |
| McKay | `McKay … Availability … 7.20.26.xlsx` | yes | 1 |
| Stewart Bros | `Stewart-Brothers-Availability.txt` | **none on the sheet** — sizes only | 1 |
| Bailey | **quote of 8-4-26 is NOT on the laptop** — only a derived cross-check .docx | yes, 2026 (expired) | 1, once the quote is saved |
| Kalco | not obtained | — | 2 |

Verified 9/22 against the Seed 'n' Tree text: Helena Maple 2" $635, Paper Birch
2" $238, Swedish Columnar Aspen 2" $606 — the 9/19 sourcing figures match.

## Testing

Same rules as the rest of the suite: expected values worked out from the
catalog page, not pasted from output; every guard seen failing first.

- **Build script (node or python test):** named catalog lines produce the
  expected entries — Paper Birch finds McKay's "Canoe Birch" line; a
  "contorta" search never lands on Corylus; Hedge Cotoneaster keeps #3/$32;
  an unmapped species comes out `mapped: false`.
- **No free text leaks:** the generated file contains no string from outside
  the four extracted fields (asserted by scanning `vendors.js` for words that
  only appear in list prose).
- **App (Playwright):** the block renders in the Subs panel; every line carries
  its list date; "not mapped yet" shows for an unmapped species; a missing
  `vendors.js` degrades to a message instead of breaking the row.
- **Status page:** lines render under the right species on every job, escaped;
  totals unchanged.
- **Mutation checks** for each of the above, added to both runners.

## Out of scope

- Ranking, recommending, or costing vendors.
- Stand-in species from catalogs (Matt chose same-species only).
- Live fetching of any vendor's site or email.
- Anything about a vendor's business beyond its printed prices.

## Open before building

1. Save the **Bailey 8-4-26 availability quote** to `claudes room`.
2. The NTMB plan's botanical names (Early Forsythia at least) — or accept
   "unresolved" for those rows at first.
3. Kalco's list, whenever Chris sends it (Phase 2).

## Amendment 9/23 — offers come from the alias table, verified against the catalogs

Found while planning: `species-alias-table.json` already holds hand-read sizes
and prices per vendor (e.g. Bron Pink Beauty #5 $23.79), taken off the books on
9/19. Parsing all five catalog formats a second time would create a second,
automatic copy of that record, and two copies drift. So:

- The table gains a structured `offers` field (`as`, `forms: [{size, price}]`).
  That is the record.
- `build_vendors.py` **verifies** it: every `as` name must be printed in that
  vendor's catalog, and every price must be printed near it, or the build is
  refused. Catalogs are the check, not the source.
- The builder rejects any field besides `as`/`forms`/`size`/`price`, so the
  table's notes can never reach `vendors.js`.
- **The Groundwork repo is public.** The alias table and catalogs stay in
  `claudes room` and are never committed; only generated `vendors.js` is.
- Bailey's quote was found 9/23: "TITAN AVAILABILITY QUOTE 8-4-26.xlsx", Aaron
  Rivera's email of 8/4/26 in the Titan Outlook. To be saved to `claudes room`.

Plan: `docs/superpowers/plans/2026-09-23-vendor-catalogs.md`.
