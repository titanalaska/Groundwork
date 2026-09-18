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

test('index.html round-trips itemMap and pulls through the shared payload', () => {
  const html = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');
  const payloadFn = html.slice(html.indexOf('function payload()'), html.indexOf('function applyPayload'));
  assert.match(payloadFn, /itemMap:\s*itemMap/, 'payload() must send itemMap');
  assert.match(payloadFn, /pulls:\s*pulls/, 'payload() must send pulls');

  const applyFn = html.slice(html.indexOf('function applyPayload'), html.indexOf('function applyPayload') + 1500);
  assert.match(applyFn, /mergeItemMap/, 'applyPayload() must merge rather than overwrite itemMap');
});

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

test('every plant row gets a pull control wired to the sheet', () => {
  const html = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');
  const fn = html.slice(html.indexOf('function renderItem('), html.indexOf('function renderGroups('));
  assert.match(fn, /openPullSheet\(/, 'renderItem must wire a control to openPullSheet');
  assert.match(fn, /pulledTotal/, 'the row must show what has already been pulled');
});
