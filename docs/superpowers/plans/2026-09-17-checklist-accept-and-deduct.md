# Inline Accept-and-Deduct Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let someone record on a plant row what actually left the yard, and have the Titan Inventory sheet deduct it for real, credited to the person who pulled it.

**Architecture:** `index.html` gains a second, independent client to the Inventory Apps Script deployment (the checklist's own sync deployment is untouched and the two credentials never mix). Pure logic lives in a sentinel-marked region of the first `<script>` block so a node test can extract and exercise it without a DOM. No backend change: `bulkPull` already does the deduction, locking and Change Log write.

**Tech Stack:** Vanilla ES5-style JS in a single HTML file, `node:test` (Node 24, no dependencies), Apps Script web app over a Google Sheet.

**Spec:** `docs/superpowers/specs/2026-09-17-checklist-accept-and-deduct-design.md`

## Global Constraints

- Inventory endpoint: `https://script.google.com/macros/s/AKfycbyudFaJ0dsSYMo_uO8KF5WTvJrB-l3eppbTHenmbcPRO19qhcVg8_YJR5boDIsCU1QC/exec`
- POSTs to Apps Script MUST use `Content-Type: text/plain;charset=utf-8`. This dodges a CORS preflight Apps Script does not answer. It is load-bearing — do not "tidy" it to `application/json`.
- **Never cache a stock number in the checklist.** Inventory is the only place a quantity lives.
- The quantity box ships **blank**. Never pre-fill it from `need` or from the tally.
- No offline queuing of deductions. Refuse when there is no signal.
- **No changes to `titan-inventory-script/Code.js` or to the Inventory app.**
- localStorage keys are checklist-specific: `wolf-inv-token`, `wolf-inv-profile`. Never read or write Inventory's `titan_token` / `titan_profile` — different origin, different app.
- All code in `index.html`. Do not add a served `.js` file; `sw.js` caches a fixed list and a new file would need to be added there.
- Existing style: `var`, `function`, no arrow functions or template literals in the first script block.

---

### Task 1: Pure logic and its tests

**Files:**
- Modify: `index.html` (first `<script>` block, insert after `function slug(name)` which ends at ~line 1282)
- Create: `tests/deduct-logic.test.js`

**Interfaces:**
- Consumes: `slug(name)` — existing, returns a lowercase hyphenated key.
- Produces:
  - `mergeItemMap(base, incoming)` → object. Last-write-wins per species by `mappedAt`.
  - `recordPull(list, entry)` → new array. Appends newest-first, caps at 20.
  - `summarizePull(result)` → `{ ok, applied, text }` for one `bulkPull` per-item result.
  - `pulledTotal(list)` → number. Sum of `qty` in a pull list.

- [ ] **Step 1: Write the failing test**

Create `tests/deduct-logic.test.js`:

```js
const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const path = require('path');

// The app is one HTML file on purpose (a service worker caches a fixed list, so
// a new .js file would have to be added there too). To test the logic without a
// DOM we extract only the region between the PURE sentinels and eval that.
function loadPure() {
  const html = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');
  const start = html.indexOf('// ---- PURE: testable, no DOM ----');
  const end = html.indexOf('// ---- /PURE ----');
  if (start === -1 || end === -1) throw new Error('PURE sentinels not found in index.html');
  const src = html.slice(start, end);
  const sandbox = {};
  new Function('exports', src + '\nexports.mergeItemMap = mergeItemMap;'
    + '\nexports.recordPull = recordPull;'
    + '\nexports.summarizePull = summarizePull;'
    + '\nexports.pulledTotal = pulledTotal;')(sandbox);
  return sandbox;
}

test('mergeItemMap keeps the newer mapping when both sides have one', () => {
  const { mergeItemMap } = loadPure();
  const base = { 'amur-maple': { itemId: 11, itemName: 'Amur Maple', mappedAt: '2026-09-01T00:00:00Z' } };
  const incoming = { 'amur-maple': { itemId: 12, itemName: 'Amur Maple 5gal', mappedAt: '2026-09-05T00:00:00Z' } };
  assert.strictEqual(mergeItemMap(base, incoming)['amur-maple'].itemId, 12);
});

test('mergeItemMap does not lose a species the other side has never seen', () => {
  const { mergeItemMap } = loadPure();
  const base = { 'amur-maple': { itemId: 11, mappedAt: '2026-09-01T00:00:00Z' } };
  const incoming = { 'savin-juniper': { itemId: 20, mappedAt: '2026-09-02T00:00:00Z' } };
  const out = mergeItemMap(base, incoming);
  assert.strictEqual(out['amur-maple'].itemId, 11);
  assert.strictEqual(out['savin-juniper'].itemId, 20);
});

test('recordPull puts the newest entry first and caps the list at 20', () => {
  const { recordPull } = loadPure();
  let list = [];
  for (let i = 0; i < 25; i++) list = recordPull(list, { qty: i, job: 'Home2Suites', who: 'Matthew', at: '2026-09-17T00:00:00Z' });
  assert.strictEqual(list.length, 20);
  assert.strictEqual(list[0].qty, 24);
});

test('recordPull does not mutate the list it was given', () => {
  const { recordPull } = loadPure();
  const original = [];
  recordPull(original, { qty: 5, job: 'Charter', who: 'Matthew', at: '2026-09-17T00:00:00Z' });
  assert.strictEqual(original.length, 0);
});

test('summarizePull reports a clean full pull', () => {
  const { summarizePull } = loadPure();
  const s = summarizePull({ id: 11, ok: true, requested: 40, applied: 40, before: 63, after: 23 });
  assert.strictEqual(s.ok, true);
  assert.strictEqual(s.applied, 40);
  assert.match(s.text, /pulled 40/);
  assert.match(s.text, /23 left/);
});

test('summarizePull says so when the yard could not cover it', () => {
  const { summarizePull } = loadPure();
  const s = summarizePull({ id: 11, ok: true, requested: 58, applied: 41, before: 41, after: 0 });
  assert.strictEqual(s.applied, 41);
  assert.match(s.text, /asked 58/);
  assert.match(s.text, /got 41/);
});

test('summarizePull surfaces a failure reason and applies nothing', () => {
  const { summarizePull } = loadPure();
  const s = summarizePull({ id: 99, ok: false, reason: 'not found' });
  assert.strictEqual(s.ok, false);
  assert.strictEqual(s.applied, 0);
  assert.match(s.text, /not found/);
});

test('pulledTotal sums what this tool has sent for a species', () => {
  const { pulledTotal } = loadPure();
  assert.strictEqual(pulledTotal([{ qty: 40 }, { qty: 18 }]), 58);
  assert.strictEqual(pulledTotal([]), 0);
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `node --test tests/deduct-logic.test.js`
Expected: FAIL — `PURE sentinels not found in index.html`

- [ ] **Step 3: Write the minimal implementation**

In `index.html`, immediately after the closing brace of `function slug(name){...}`, insert:

```js
// ---- PURE: testable, no DOM ----
// Everything between these sentinels must stay free of document, window, fetch
// and localStorage. tests/deduct-logic.test.js extracts this exact region and
// runs it in node. Reaching for the DOM in here breaks that test with a
// confusing error rather than an obvious one.

// Two phones can map the same species before either syncs. Newest stamp wins;
// neither side's unique species is dropped.
function mergeItemMap(base, incoming){
  var out = {};
  var k;
  for(k in (base || {})) if(Object.prototype.hasOwnProperty.call(base, k)) out[k] = base[k];
  for(k in (incoming || {})){
    if(!Object.prototype.hasOwnProperty.call(incoming, k)) continue;
    var mine = out[k], theirs = incoming[k];
    if(!mine){ out[k] = theirs; continue; }
    var mineAt = Date.parse(mine.mappedAt || "") || 0;
    var theirsAt = Date.parse(theirs.mappedAt || "") || 0;
    out[k] = theirsAt >= mineAt ? theirs : mine;
  }
  return out;
}

// Returns a NEW array. The caller's copy is never mutated, because the shared
// payload is serialised straight from these structures and an in-place push has
// bitten this app before.
function recordPull(list, entry){
  var out = [entry].concat(list || []);
  return out.slice(0, 20);
}

// One per-item result from bulkPull, turned into something a row can say out loud.
function summarizePull(result){
  if(!result || !result.ok){
    return { ok: false, applied: 0,
             text: "not pulled - " + ((result && result.reason) || "unknown reason") };
  }
  var requested = Number(result.requested) || 0;
  var applied = Number(result.applied) || 0;
  var after = Number(result.after) || 0;
  if(applied < requested){
    return { ok: true, applied: applied,
             text: "asked " + requested + ", got " + applied + " - " + after + " left" };
  }
  return { ok: true, applied: applied,
           text: "pulled " + applied + " - " + after + " left" };
}

function pulledTotal(list){
  var total = 0;
  (list || []).forEach(function(e){ total += Number(e && e.qty) || 0; });
  return total;
}
// ---- /PURE ----
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `node --test tests/deduct-logic.test.js`
Expected: PASS, 8 tests

- [ ] **Step 5: Commit**

```bash
git add tests/deduct-logic.test.js index.html
git commit -m "Pure logic for accept-and-deduct, with tests"
```

---

### Task 2: Shared state carries the mapping and the pull history

**Files:**
- Modify: `index.html` — `payload()` (~line 1418), `applyPayload(p)` (~line 1424), and the top-level state declarations near `var LOCAL_KEY` (~line 1243)
- Modify: `tests/deduct-logic.test.js`

**Interfaces:**
- Consumes: `mergeItemMap` (Task 1), existing `payload()` / `applyPayload()` / `scheduleSave()`.
- Produces: top-level `itemMap` (object) and `pulls` (object of arrays), both round-tripped through the shared doc.

- [ ] **Step 1: Write the failing test**

Append to `tests/deduct-logic.test.js`:

```js
test('index.html round-trips itemMap and pulls through the shared payload', () => {
  const html = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');
  const payloadFn = html.slice(html.indexOf('function payload()'), html.indexOf('function applyPayload'));
  assert.match(payloadFn, /itemMap:\s*itemMap/, 'payload() must send itemMap');
  assert.match(payloadFn, /pulls:\s*pulls/, 'payload() must send pulls');

  const applyFn = html.slice(html.indexOf('function applyPayload'), html.indexOf('function applyPayload') + 1500);
  assert.match(applyFn, /mergeItemMap/, 'applyPayload() must merge rather than overwrite itemMap');
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `node --test tests/deduct-logic.test.js`
Expected: FAIL — `payload() must send itemMap`

- [ ] **Step 3: Write the minimal implementation**

Near the other top-level state declarations (beside `var LOCAL_KEY = "wolf-field-checklist-v1";`), add:

```js
var itemMap = {};   // species slug -> {itemId, itemName, mappedBy, mappedAt}
var pulls = {};     // species slug -> [{qty, job, who, at}], newest first
```

In `payload()`, add the two keys:

```js
function payload(){
  return {counts: state, notes: notes, staked: staked, planted: planted,
          measured: measured, owed: owed, lastLogged: lastLogged,
          itemMap: itemMap, pulls: pulls,
          updatedAt: new Date().toISOString()};
}
```

In `applyPayload(p)`, after the existing assignments, add:

```js
  // Merged, not replaced: another phone may have mapped a species this device
  // has never seen, and a straight assignment would throw that away on the next
  // save from here.
  itemMap = mergeItemMap(itemMap, p.itemMap);
  if(p.pulls && typeof p.pulls === "object") pulls = p.pulls;
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `node --test tests/deduct-logic.test.js`
Expected: PASS, 9 tests

- [ ] **Step 5: Commit**

```bash
git add index.html tests/deduct-logic.test.js
git commit -m "Carry itemMap and pull history in the shared checklist doc"
```

---

### Task 3: The Inventory client

**Files:**
- Modify: `index.html` — add at the end of the **first** `<script>` block (the second block is the service-worker registration only)
- Modify: `tests/deduct-logic.test.js`

**Interfaces:**
- Consumes: nothing from earlier tasks at runtime.
- Produces:
  - `INV_URL` (string constant)
  - `invToken()` → string, `setInvToken(tok, profile)`, `invProfile()` → `{id, name}` or null
  - `invBootstrap()` → Promise of `{items, profiles}`
  - `invVerifyPin(id, pin)` → Promise of `{valid, token, name, status, attemptsLeft}`
  - `invBulkPull(itemId, qty, job)` → Promise of one per-item result object

- [ ] **Step 1: Write the failing test**

Append to `tests/deduct-logic.test.js`:

```js
test('the Inventory client uses the text/plain content type Apps Script needs', () => {
  const html = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');
  const at = html.indexOf('function invBulkPull');
  assert.ok(at !== -1, 'invBulkPull must exist');
  const fn = html.slice(at, at + 900);
  assert.match(fn, /text\/plain;charset=utf-8/, 'must post as text/plain or Apps Script CORS rejects it');
  assert.match(fn, /action:\s*['"]bulkPull['"]/);
});

test('the checklist never reads the Inventory app storage keys', () => {
  const html = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');
  assert.ok(!/titan_token|titan_profile/.test(html), 'different origin - must not assume Inventory localStorage');
  assert.match(html, /wolf-inv-token/);
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `node --test tests/deduct-logic.test.js`
Expected: FAIL — `invBulkPull must exist`

- [ ] **Step 3: Write the minimal implementation**

At the end of the first `<script>` block, add:

```js
// ---- the Inventory deployment --------------------------------------------
// A SECOND, separate Apps Script app from the checklist's own sync store above.
// Different URL, different credential. They must never share either: the sync
// key writes checklist counts, this token moves real stock.
var INV_URL = "https://script.google.com/macros/s/AKfycbyudFaJ0dsSYMo_uO8KF5WTvJrB-l3eppbTHenmbcPRO19qhcVg8_YJR5boDIsCU1QC/exec";
var INV_TOKEN_STORE = "wolf-inv-token";
var INV_PROFILE_STORE = "wolf-inv-profile";

function invToken(){
  try{ return localStorage.getItem(INV_TOKEN_STORE) || ""; }catch(e){ return ""; }
}

function invProfile(){
  try{ return JSON.parse(localStorage.getItem(INV_PROFILE_STORE) || "null"); }catch(e){ return null; }
}

function setInvToken(tok, profile){
  try{
    if(tok){ localStorage.setItem(INV_TOKEN_STORE, tok); }
    else { localStorage.removeItem(INV_TOKEN_STORE); }
    if(profile){ localStorage.setItem(INV_PROFILE_STORE, JSON.stringify(profile)); }
    else { localStorage.removeItem(INV_PROFILE_STORE); }
  }catch(e){}
}

// One open call gives both the item list for the picker and the profile list
// for the sign-in sheet. Apps Script has a ~2s floor per request, so two calls
// would double the wait before anything appears.
function invBootstrap(){
  return fetch(INV_URL + "?action=bootstrap&t=" + Date.now(), {cache: "no-store"})
    .then(function(r){ return r.json(); });
}

function invVerifyPin(id, pin){
  return fetch(INV_URL + "?action=verifyPin&id=" + encodeURIComponent(id) +
               "&pin=" + encodeURIComponent(pin) + "&t=" + Date.now(), {cache: "no-store"})
    .then(function(r){ return r.json(); });
}

// Resolves with the single per-item result, or rejects. An expired session
// rejects with .authRequired so the caller can re-prompt rather than showing a
// meaningless failure.
function invBulkPull(itemId, qty, job){
  return fetch(INV_URL, {
    method: "POST",
    headers: {"Content-Type": "text/plain;charset=utf-8"},
    body: JSON.stringify({
      action: "bulkPull",
      items: [{id: Number(itemId), qty: Number(qty)}],
      job: job,
      kind: "plants",
      token: invToken()
    })
  }).then(function(r){ return r.json(); }).then(function(j){
    if(j && j.authRequired){ var e = new Error(j.error || "sign in again"); e.authRequired = true; throw e; }
    if(!j || !j.results || !j.results.length){ throw new Error((j && j.error) || "no result from inventory"); }
    return j.results[0];
  });
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `node --test tests/deduct-logic.test.js`
Expected: PASS, 11 tests

- [ ] **Step 5: Commit**

```bash
git add index.html tests/deduct-logic.test.js
git commit -m "Client for the Inventory deployment: bootstrap, PIN, bulkPull"
```

---

### Task 4: The Pull control on each row

**Files:**
- Modify: `index.html` — `renderItem()` (~line 1634), plus CSS beside the `.counter` rules (~line 255)
- Modify: `tests/deduct-logic.test.js`

**Interfaces:**
- Consumes: `pulledTotal` (Task 1), `pulls` (Task 2), existing `slug()`, `decode()`.
- Produces: calls `openPullSheet(jobKey, name, target)` — stubbed here, implemented in Task 5.

- [ ] **Step 1: Write the failing test**

Append to `tests/deduct-logic.test.js`:

```js
test('every plant row gets a pull control wired to the sheet', () => {
  const html = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');
  const fn = html.slice(html.indexOf('function renderItem('), html.indexOf('function renderGroups('));
  assert.match(fn, /openPullSheet\(/, 'renderItem must wire a control to openPullSheet');
  assert.match(fn, /pulledTotal/, 'the row must show what has already been pulled');
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `node --test tests/deduct-logic.test.js`
Expected: FAIL — `renderItem must wire a control to openPullSheet`

- [ ] **Step 3: Write the minimal implementation**

Add CSS beside the `.counter` rules:

```css
  .pull-btn{
    background:none;border:1px solid var(--line);color:var(--fg);
    border-radius:8px;padding:4px 10px;font-size:13px;margin-left:8px;cursor:pointer;
  }
  .pull-btn:active{background:var(--line);}
  .pull-note{font-size:12px;opacity:.75;margin-top:2px;}
```

In `renderItem()`, after the `info.innerHTML = ...` assignment:

```js
  // What this tool has already sent to Inventory for this species. Shown so
  // nobody has to remember at 6am whether they already pulled these.
  var already = pulledTotal(pulls[slug(name)]);
  if(already > 0){
    var note = document.createElement("div");
    note.className = "pull-note";
    note.textContent = "pulled " + already + " so far";
    info.appendChild(note);
  }
```

Then, after `counter.appendChild(plus);`:

```js
  var pullBtn = document.createElement("button");
  pullBtn.className = "pull-btn";
  pullBtn.textContent = "Pull";
  pullBtn.setAttribute("aria-label", "record a yard pull of " + decode(name));
  pullBtn.addEventListener("click", function(){ openPullSheet(jobKey, name, target); });
  counter.appendChild(pullBtn);
```

Add a stub beside the Inventory client (replaced in Task 5):

```js
function openPullSheet(jobKey, name, target){
  console.log("pull sheet", jobKey, name, target);
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `node --test tests/deduct-logic.test.js`
Expected: PASS, 12 tests

Then verify in the browser: `preview_start {name:"wolf-checklist"}`, port 8139. A **Pull** button renders on every plant row; clicking one logs to the console.

- [ ] **Step 5: Commit**

```bash
git add index.html tests/deduct-logic.test.js
git commit -m "Pull control and already-pulled note on each plant row"
```

---

### Task 5: The pull sheet — sign in, map, enter, confirm

**Files:**
- Modify: `index.html` — replace the `openPullSheet` stub; add sheet CSS beside `.pull-btn`
- Modify: `tests/deduct-logic.test.js`

**Interfaces:**
- Consumes: `invBootstrap`, `invVerifyPin`, `invBulkPull`, `setInvToken`, `invToken`, `invProfile` (Task 3); `mergeItemMap`, `recordPull`, `summarizePull` (Task 1); `itemMap`, `pulls` (Task 2); existing `JOBS`, `state`, `scheduleSave`, `renderGroups`, `decode`, `slug`.
- Produces: nothing consumed by later tasks.

- [ ] **Step 1: Write the failing test**

Append to `tests/deduct-logic.test.js`:

```js
test('the quantity box ships blank - never pre-filled from need or tally', () => {
  const html = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');
  const at = html.indexOf('function openPullSheet(');
  const fn = html.slice(at, at + 9000);
  const qtyLine = fn.split('\n').find(l => /qtyInput\.value\s*=/.test(l));
  assert.ok(qtyLine === undefined || /=\s*""/.test(qtyLine),
    'the quantity must ship empty: ' + qtyLine);
});

test('a pull refuses rather than queuing when there is no signal', () => {
  const html = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');
  const at = html.indexOf('function openPullSheet(');
  const fn = html.slice(at, at + 9000);
  assert.match(fn, /navigator\.onLine/, 'must check for signal before sending');
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `node --test tests/deduct-logic.test.js`
Expected: FAIL — `must check for signal before sending`

- [ ] **Step 3: Write the minimal implementation**

Add the sheet CSS:

```css
  .sheet-back{position:fixed;inset:0;background:rgba(0,0,0,.6);display:flex;
    align-items:flex-end;justify-content:center;z-index:50;}
  .sheet{background:var(--card);border-top:1px solid var(--line);border-radius:14px 14px 0 0;
    width:100%;max-width:560px;padding:16px;max-height:86vh;overflow:auto;}
  .sheet h3{margin:0 0 4px;font-size:17px;}
  .sheet .ref{font-size:13px;opacity:.75;margin-bottom:12px;}
  .sheet label{display:block;font-size:13px;margin:10px 0 4px;}
  .sheet input[type=number],.sheet input[type=text],.sheet input[type=password],.sheet select{
    width:100%;padding:10px;border-radius:8px;border:1px solid var(--line);
    background:var(--bg);color:var(--fg);font-size:16px;}
  .sheet .row{display:flex;gap:8px;margin-top:14px;}
  .sheet .row button{flex:1;padding:12px;border-radius:10px;border:1px solid var(--line);
    background:none;color:var(--fg);font-size:15px;cursor:pointer;}
  .sheet .go{background:#2f6b3f;}
  .sheet .msg{font-size:13px;margin-top:10px;min-height:18px;}
```

Replace the `openPullSheet` stub with:

```js
function closeSheet(){
  var b = document.getElementById("pullSheetBack");
  if(b) b.remove();
}

function openPullSheet(jobKey, name, target){
  closeSheet();
  var sKey = slug(name);
  var back = document.createElement("div");
  back.className = "sheet-back";
  back.id = "pullSheetBack";
  back.addEventListener("click", function(e){ if(e.target === back) closeSheet(); });

  var sheet = document.createElement("div");
  sheet.className = "sheet";
  back.appendChild(sheet);
  document.body.appendChild(back);

  var msg = document.createElement("div");
  msg.className = "msg";
  function say(t){ msg.textContent = t || ""; }

  // ---- step 3: the actual pull -------------------------------------------
  function showPullStep(){
    sheet.innerHTML = "";
    var h = document.createElement("h3");
    h.textContent = decode(name);
    var ref = document.createElement("div");
    ref.className = "ref";
    var tallied = state[jobKey + ":" + sKey] || 0;
    ref.textContent = "need " + target + " - tallied " + tallied +
                      " - mapped to " + (itemMap[sKey] ? itemMap[sKey].itemName : "?");

    var qtyLabel = document.createElement("label");
    qtyLabel.textContent = "How many actually left the yard?";
    var qtyInput = document.createElement("input");
    qtyInput.type = "number";
    qtyInput.inputMode = "numeric";
    qtyInput.min = "1";
    // Deliberately blank. Neither the plan nor the tally is reliably what went
    // on the truck, and a pre-filled number is one distracted tap from a wrong
    // deduction that has to be unwound by hand in the Sheet.
    qtyInput.value = "";

    var jobLabel = document.createElement("label");
    jobLabel.textContent = "Job";
    var jobInput = document.createElement("input");
    jobInput.type = "text";
    jobInput.value = JOBS[jobKey] ? JOBS[jobKey].label : jobKey;

    var row = document.createElement("div");
    row.className = "row";
    var cancel = document.createElement("button");
    cancel.textContent = "Cancel";
    cancel.addEventListener("click", closeSheet);
    var go = document.createElement("button");
    go.className = "go";
    go.textContent = "Pull from inventory";

    go.addEventListener("click", function(){
      var qty = Math.max(0, parseInt(qtyInput.value, 10) || 0);
      if(qty <= 0){ say("Enter how many left the yard."); return; }
      if(!navigator.onLine){
        // No queueing on purpose: applying this later, after the pull has been
        // written down somewhere else, produces a double count.
        say("Need signal to pull. Nothing was deducted.");
        return;
      }
      go.disabled = true;
      say("Pulling...");
      invBulkPull(itemMap[sKey].itemId, qty, jobInput.value.trim())
        .then(function(result){
          var s = summarizePull(result);
          if(s.ok && s.applied > 0){
            pulls[sKey] = recordPull(pulls[sKey], {
              qty: s.applied,
              job: jobInput.value.trim(),
              who: (invProfile() && invProfile().name) || "",
              at: new Date().toISOString()
            });
            scheduleSave();
            renderGroups();
          }
          say(s.text);
          go.disabled = false;
          if(s.ok) setTimeout(closeSheet, 1600);
        })
        .catch(function(err){
          go.disabled = false;
          if(err && err.authRequired){ setInvToken("", null); showSignInStep(); return; }
          say(err && err.message ? err.message : "could not reach inventory");
        });
    });

    row.appendChild(cancel);
    row.appendChild(go);
    sheet.appendChild(h);
    sheet.appendChild(ref);
    sheet.appendChild(qtyLabel);
    sheet.appendChild(qtyInput);
    sheet.appendChild(jobLabel);
    sheet.appendChild(jobInput);
    sheet.appendChild(row);
    sheet.appendChild(msg);
    qtyInput.focus();
  }

  // ---- step 2: map this species once -------------------------------------
  function showMapStep(items){
    sheet.innerHTML = "";
    var h = document.createElement("h3");
    h.textContent = "Which inventory item is " + decode(name) + "?";
    var ref = document.createElement("div");
    ref.className = "ref";
    ref.textContent = "Picked once. Everyone on the checklist gets this mapping.";

    var search = document.createElement("input");
    search.type = "text";
    search.placeholder = "Type to filter";

    var sel = document.createElement("select");
    sel.size = 8;

    function fill(){
      var q = search.value.toLowerCase();
      sel.innerHTML = "";
      items.filter(function(it){
        return !q || String(it.name).toLowerCase().indexOf(q) !== -1;
      }).slice(0, 200).forEach(function(it){
        var o = document.createElement("option");
        o.value = it.id;
        o.textContent = it.name + "  (" + it.qty + " on hand)";
        sel.appendChild(o);
      });
    }
    // Seed the filter with the species name; usually right, saves typing. If it
    // matches nothing, fall back to the full list rather than an empty box.
    search.value = decode(name);
    fill();
    if(!sel.options.length){ search.value = ""; fill(); }
    search.addEventListener("input", fill);

    var row = document.createElement("div");
    row.className = "row";
    var cancel = document.createElement("button");
    cancel.textContent = "Cancel";
    cancel.addEventListener("click", closeSheet);
    var go = document.createElement("button");
    go.className = "go";
    go.textContent = "Use this item";
    go.addEventListener("click", function(){
      if(!sel.value){ say("Pick an item first."); return; }
      var chosen = items.filter(function(it){ return String(it.id) === String(sel.value); })[0];
      var add = {};
      add[sKey] = { itemId: chosen.id, itemName: chosen.name,
                    mappedBy: (invProfile() && invProfile().name) || "",
                    mappedAt: new Date().toISOString() };
      itemMap = mergeItemMap(itemMap, add);
      scheduleSave();
      showPullStep();
    });

    row.appendChild(cancel);
    row.appendChild(go);
    sheet.appendChild(h);
    sheet.appendChild(ref);
    sheet.appendChild(search);
    sheet.appendChild(sel);
    sheet.appendChild(row);
    sheet.appendChild(msg);
  }

  // ---- step 1: sign in ----------------------------------------------------
  function showSignInStep(){
    sheet.innerHTML = "";
    var h = document.createElement("h3");
    h.textContent = "Sign in to pull stock";
    var ref = document.createElement("div");
    ref.className = "ref";
    ref.textContent = "Same PIN as the Inventory app. The Change Log records who pulled.";

    var sel = document.createElement("select");
    var pin = document.createElement("input");
    pin.type = "password";
    pin.inputMode = "numeric";
    pin.placeholder = "PIN";

    var row = document.createElement("div");
    row.className = "row";
    var cancel = document.createElement("button");
    cancel.textContent = "Cancel";
    cancel.addEventListener("click", closeSheet);
    var go = document.createElement("button");
    go.className = "go";
    go.textContent = "Sign in";

    say("Loading...");
    invBootstrap().then(function(data){
      var profiles = (data && data.profiles) || [];
      profiles.filter(function(p){ return String(p.status) === "approved"; })
              .forEach(function(p){
        var o = document.createElement("option");
        o.value = p.id;
        o.textContent = p.name;
        sel.appendChild(o);
      });
      say(sel.options.length ? "" : "No approved profiles found.");
      // Held for the mapping step so it does not cost a second round trip.
      sheet._items = (data && data.items) || [];
    }).catch(function(){ say("Could not reach inventory."); });

    go.addEventListener("click", function(){
      if(!sel.value){ say("Pick your name."); return; }
      go.disabled = true;
      say("Checking...");
      invVerifyPin(sel.value, pin.value).then(function(r){
        go.disabled = false;
        if(!r || !r.valid){
          say("Wrong PIN" + (r && r.attemptsLeft !== undefined ? " - " + r.attemptsLeft + " tries left" : ""));
          return;
        }
        if(!r.token){ say("That profile is " + (r.status || "not approved") + "."); return; }
        setInvToken(r.token, {id: r.id, name: r.name});
        if(itemMap[sKey]) showPullStep();
        else showMapStep(sheet._items || []);
      }).catch(function(){ go.disabled = false; say("Could not reach inventory."); });
    });

    row.appendChild(cancel);
    row.appendChild(go);
    sheet.appendChild(h);
    sheet.appendChild(ref);
    sheet.appendChild(sel);
    sheet.appendChild(pin);
    sheet.appendChild(row);
    sheet.appendChild(msg);
  }

  // Route to the first step that is actually needed.
  if(!invToken()){ showSignInStep(); return; }
  if(!itemMap[sKey]){
    say("Loading inventory...");
    sheet.appendChild(msg);
    invBootstrap().then(function(data){ showMapStep((data && data.items) || []); })
                  .catch(function(){ say("Could not reach inventory."); });
    return;
  }
  showPullStep();
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `node --test tests/deduct-logic.test.js`
Expected: PASS, 14 tests

- [ ] **Step 5: Commit**

```bash
git add index.html tests/deduct-logic.test.js
git commit -m "Pull sheet: PIN sign-in, pick-once mapping, blank quantity"
```

---

### Task 6: Verify against the live sheet, then ship

**Files:**
- No code changes expected. Fix whatever this surfaces.

**Interfaces:**
- Consumes: everything above.
- Produces: a deployed checklist.

- [ ] **Step 1: Syntax-check both script blocks**

```bash
node --test tests/deduct-logic.test.js
node -e "const fs=require('fs');const h=fs.readFileSync('index.html','utf8');const m=[...h.matchAll(/<script>([\s\S]*?)<\/script>/g)];m.forEach((b,i)=>{new Function(b[1]);console.log('block',i+1,'parses');});"
```

Expected: all tests pass, both blocks parse.

- [ ] **Step 2: Add a throwaway test item to the Inventory sheet**

In the `Titan Alaska Inventory` spreadsheet, append a row: name `ZZ TEST - delete me`, qty `5`, category `NURSERY STOCK`. Note its id from column A.

**Do not practice on a real species.** A wrong deduction has to be unwound by hand in the Change Log.

- [ ] **Step 3: Walk the whole path in the browser**

`preview_start {name:"wolf-checklist"}`, port 8139. On any plant row:

1. Tap **Pull** — the sign-in step appears. Pick a name, enter the PIN.
2. The mapping step appears. Filter for `ZZ TEST` and pick it.
3. Confirm the quantity box is **empty** on open. Enter `2`.
4. Tap **Pull from inventory**. Expect `pulled 2 - 3 left`.
5. Reload. The row reads `pulled 2 so far`, and tapping **Pull** goes straight to the quantity step — no sign-in, no mapping.
6. Pull `99`. Expect `asked 99, got 3 - 0 left`.
7. Check the Change Log in the Sheet: two PULL rows, the right name, the job name from the tab.

- [ ] **Step 4: Clean up**

Delete the `ZZ TEST` row from the sheet. In the browser console run, for the species used:

```js
delete itemMap['<species-slug>']; delete pulls['<species-slug>']; scheduleSave();
```

so no real row ships mapped to a deleted item.

- [ ] **Step 5: Commit and deploy**

```bash
git add -A
git commit -m "Accept-and-deduct verified against the live sheet"
git push
```

Then confirm the Pages build: `gh run list -R titanalaska/Wolf-Checklist --limit 1`

---

## Self-Review

**Spec coverage:** PIN auth → Tasks 3, 5. Pick-once mapping → Tasks 1, 2, 5. Blank quantity → Task 5, asserted by test. Inventory as sole owner of stock → no stock field appears in `payload()`, Task 2. `itemMap` / `pulls` shapes → Task 2. Short stock → `summarizePull`, Task 1. No offline queue → Task 5, asserted by test. Expired-token re-prompt → Task 5 `catch` on `authRequired`. Double tap → `go.disabled` plus the already-pulled note, Task 4. Testing → Task 6. No `Code.js` change → no task touches it.

**Placeholder scan:** none. Every code step carries its code.

**Type consistency:** `mergeItemMap`, `recordPull`, `summarizePull`, `pulledTotal` are defined in Task 1 and used under those exact names in Tasks 2, 4, 5. `invBulkPull(itemId, qty, job)` is defined in Task 3 and called with that arity in Task 5. `itemMap[sKey].itemId` matches the shape written by Task 5's mapping step and declared in Task 2. Test counts are cumulative: 8, 9, 11, 12, 14.

**Known gap:** un-pulling (returning stock from the checklist) is explicitly out of scope per the spec. A mis-entered quantity is corrected in the Inventory app, not here.
