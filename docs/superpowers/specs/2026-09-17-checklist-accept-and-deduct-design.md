# Inline accept-and-deduct on the Wolf checklist

**Date:** 2026-09-17
**Author:** Matt Walsh, Nursery & Field Operations Manager (design assisted by Claude)
**Status:** Approved for implementation

## Why

The checklist is a purchase planner. It says what each job needs and lets you tally
what you have placed, but stock that physically leaves the yard for a job is not
recorded anywhere at the moment it leaves. That gap is the cause of a whole class of
error already documented: side-job pulls silently consume commercial stock and nobody
credits them, so the next order re-buys material Titan already owns.

This feature closes the gap at the source — you record the pull on the row where you
made the decision, and Inventory subtracts it for real.

Originally requested 2026-07-24 and deliberately deferred. The companion feature (a
bulk pull window) shipped 2026-07-26 inside the Inventory app; this is the other half.

## Decisions taken

Three questions were settled before design:

1. **Auth: PIN sign-in on the checklist.** The checklist obtains a real Inventory
   session token. Rejected: relaying through the checklist's own backend, because
   `bulkPull` credits `auth.name` in the Change Log and a relayed write could only ever
   say "the checklist did it". Knowing *who* pulled is the point of the feature.
2. **Item mapping: pick once, remember.** The first person to pull a species picks its
   Inventory item from a search list; the mapping saves to shared state and everyone
   inherits it. Rejected: fuzzy name matching (the failure mode the photo pipeline hit —
   it looks like it works until it silently matches the wrong thing) and a full
   up-front mapping table (blocks shipping on data entry).
3. **Quantity: ships blank.** The row shows `need` and `tallied` for reference; the box
   waits for a typed number. Neither existing number is reliably what went on the truck.
   This follows the standing rule that judgment values ship empty and are never defaulted.

## Architecture

Two Apps Script deployments already exist and stay separate:

| | Deployment | Credential |
|---|---|---|
| Checklist shared state | `AKfycbwZ_nE…` | write key in `localStorage["wolf-sync-key"]` |
| Inventory / stock | `AKfycbyudFaJ…` | session token from PIN, `guard_(req.token)` |

The checklist gains a **second, independent** client to the Inventory deployment. It does
not proxy through its own backend and the two credentials never mix.

**No change to `Code.js` is required.** `bulkPull` already accepts `{items:[{id,qty}], job,
kind, who, token}`, takes a script lock so two phones cannot both deduct from the same
"before" number, writes a PULL row to the Change Log, and credits `auth.name`.

### Calls used

- **Sign in** — GET `?action=verifyPin&id=<profileId>&pin=<pin>`
  → `{valid, token, expires, name, isAdmin, status}`. Token TTL is 45 days.
- **Deduct** — POST, `Content-Type: text/plain;charset=utf-8` (this dodges the CORS
  preflight Apps Script does not answer — it is load-bearing, not a tidy-up target),
  body `{action:'bulkPull', items:[{id, qty}], job, kind:'plants', who, token}`
  → `{results:[{id, ok, requested, applied, before, after, reason}]}`
  or `{error, authRequired:true}`.

## Ownership of truth

**Inventory is the only place a stock number lives.** The checklist never caches one.
Storing stock in two places is the trap that produced the earlier localStorage data loss,
and a stale count on a phone is worse than no count.

The checklist's shared doc gains exactly two new structures:

- `itemMap` — `{ "<species-slug>": { itemId, itemName, mappedBy, mappedAt } }`
- `pulls` — `{ "<species-slug>": [ { qty, job, who, at } ] }`

`pulls` is a record of what this tool sent, not a derived stock figure. Its job is to let a
row say *already pulled 40 for Home2Suites* so you are never guessing at 6am whether you
did it. The Change Log in the Sheet remains the authoritative ledger.

## The flow

1. A **Pull** control appears on each plant row beside the `− n +` counter.
2. Tapping opens a sheet: species name, `need` and `tallied` shown read-only for
   reference, an **empty** quantity box, the job (from the active job tab), and the
   mapped Inventory item.
3. If the species is unmapped, a searchable Inventory item list appears first. The pick
   writes to `itemMap`.
4. If this device has no valid token, the PIN prompt appears first. Token and profile
   cache to `localStorage` under checklist-specific keys — never reusing Inventory's keys,
   since the two apps are different origins and must not assume each other's storage.
5. Confirm sends one `bulkPull`. The row reads back what actually happened.

## Failure handling

- **Short stock** — `bulkPull` returns `applied` < `requested`. Surface both
  (*asked 58, got 41 — yard is empty*) and record only `applied` in `pulls`.
- **No signal** — refuse, do not queue. A deduction is a real-world event; applying it
  silently twenty minutes later, after the pull has already been written down elsewhere,
  produces a double count. Show *need signal to pull*.
- **Expired or refused token** (`authRequired`) — re-prompt the PIN, retry once, then stop.
- **Double tap** — the confirm button disables for the duration of the call, and `pulls`
  history is shown on the row so a repeat is a visible choice rather than an accident.

## Testing

- Extract both `<script>` blocks from `index.html` and run `node --check` (existing practice).
- Preview on port 8139 via `preview_start {name:"wolf-checklist"}`.
- Live-path test uses a **throwaway test item** added to the Inventory sheet, not a real
  species. Verify: mapping persists across a reload; a short-stock pull reports honestly;
  a refused token re-prompts; the Change Log row shows the right person, job and quantity.

## Out of scope

- Any change to `Code.js` or the Inventory app.
- Offline queuing of deductions.
- Returning stock to the yard from the checklist (`bulkPull` has a counterpart concept,
  but un-pulling is a different decision with different failure modes).
- Back-filling pulls that happened before this shipped.
