// Which requests the service worker serves cache-first out of the bed cache.
//
// The per-job asset folders are /beds/ + /symbols/ (Home2Suites), /beds-wsrcc/
// + /symbols-wsrcc/ (WSRCC) and, from 10/7/26, /beds-baxter/ + /symbols-baxter/
// (Baxter). The first version of this match took the bare names and missed
// every WSRCC file, so no WSRCC map cached for offline -- the whole point of
// the worker in a yard with no signal. The pattern lives inside the PURE
// sentinels so this test can read exactly the expression the worker uses.

const { test } = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const path = require('path');

function loadPure() {
  const src = fs.readFileSync(path.join(__dirname, '..', 'sw.js'), 'utf8');
  const start = src.indexOf('// ---- PURE: testable, no SW globals ----');
  const end = src.indexOf('// ---- /PURE ----');
  if (start === -1 || end === -1) throw new Error('PURE sentinels not found in sw.js');
  const exp = {};
  new Function('exports', src.slice(start, end) +
    '\nexports.JOB_ASSET_RE = JOB_ASSET_RE;')(exp);
  return exp;
}

test('every job\'s bed and symbol folder is served from the bed cache', () => {
  const { JOB_ASSET_RE } = loadPure();
  for (const p of [
    '/Groundwork/beds/B01.jpg',
    '/Groundwork/beds/site-map.jpg',
    '/Groundwork/symbols/AP.png',
    '/Groundwork/beds-wsrcc/v3/site-map.jpg',
    '/Groundwork/symbols-wsrcc/PFA.png',
    '/Groundwork/beds-baxter/B01.jpg',
    '/Groundwork/beds-baxter/site-map.jpg',
    '/Groundwork/symbols-baxter/PF.png',
    '/Groundwork/beds-boulders/baxter-v1.jpg',
  ]) {
    assert.ok(JOB_ASSET_RE.test(p), p + ' should be a bed-cache asset');
  }
});

test('the shell and loose files are not bed-cache assets', () => {
  const { JOB_ASSET_RE } = loadPure();
  for (const p of ['/Groundwork/', '/Groundwork/index.html', '/Groundwork/jobs.js', '/Groundwork/beds-boulders.txt', '/Groundwork/sw.js']) {
    assert.ok(!JOB_ASSET_RE.test(p), p + ' should NOT be a bed-cache asset');
  }
});
