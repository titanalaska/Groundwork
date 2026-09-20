const { test } = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const path = require('path');

// sw.js runs in a service worker and has no exports. Pull the one pure
// function out by its sentinels and run it here.
function loadPure() {
  const src = fs.readFileSync(path.join(__dirname, '..', 'sw.js'), 'utf8');
  const start = src.indexOf('// ---- PURE: testable, no SW globals ----');
  const end = src.indexOf('// ---- /PURE ----');
  if (start === -1 || end === -1) throw new Error('PURE sentinels not found in sw.js');
  const exp = {};
  new Function('exports', src.slice(start, end) +
    '\nexports.cachesToDelete = cachesToDelete;')(exp);
  return exp;
}

// Both apps live on titanalaska.github.io and the Cache API is origin-scoped,
// so Groundwork can see -- and delete -- Wolf Checklist's caches. It must not.
const ON_THE_ORIGIN = [
  'groundwork-shell-v1',
  'groundwork-shell-v2',
  'wolf-shell-v34',
  'wolf-beds-v2',
];

test('an old Groundwork shell is cleaned up', () => {
  const { cachesToDelete } = loadPure();
  const out = cachesToDelete(ON_THE_ORIGIN, ['groundwork-shell-v2', 'wolf-beds-v2']);
  assert.ok(out.includes('groundwork-shell-v1'));
});

test('the current shell is never deleted', () => {
  const { cachesToDelete } = loadPure();
  const out = cachesToDelete(ON_THE_ORIGIN, ['groundwork-shell-v2', 'wolf-beds-v2']);
  assert.ok(!out.includes('groundwork-shell-v2'));
});

test('Wolf Checklist\'s shell is NEVER deleted', () => {
  const { cachesToDelete } = loadPure();
  const out = cachesToDelete(ON_THE_ORIGIN, ['groundwork-shell-v2', 'wolf-beds-v2']);
  assert.ok(!out.includes('wolf-shell-v34'),
    'deleting this breaks the old app offline for whoever has not migrated yet');
});

test('the shared bed images are NEVER deleted', () => {
  const { cachesToDelete } = loadPure();
  const out = cachesToDelete(ON_THE_ORIGIN, ['groundwork-shell-v2', 'wolf-beds-v2']);
  assert.ok(!out.includes('wolf-beds-v2'),
    'deleting this re-downloads ~27MB over cell data');
});

test('nothing outside our own prefix is ever returned', () => {
  const { cachesToDelete } = loadPure();
  const out = cachesToDelete(['something-else-v1', 'wolf-shell-v34'], []);
  assert.deepStrictEqual(out, []);
});
