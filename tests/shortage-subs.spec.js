// Substitution options on the shortage page.
//
// This page is Home2Suites only and argues a case to Chris and Jeremi, so the
// subs shown are the H2S ones, under the rows the page already has. Same rules
// as the status page (tests/status-subs.spec.js), and the same reader -- both
// pages call subsFor() in live.js, so they cannot drift apart:
//
//   - Record only: no Callouts / Schedule / Required / On hand / Short figure
//     moves.
//   - Home2Suites only. The page reads "h2s:" keys; a WSRCC sub on the same
//     species must not appear here.
//   - Item one's lilac row is filled by TWO app rows (Miss Kim and the #2 common
//     purple), so it shows the subs of both.
//   - Typed text is text; a garbled entry is skipped, not fatal.
//
// Every response is stubbed.

const { test, expect } = require('@playwright/test');
const path = require('path');

const URL = 'file://' + path.resolve(__dirname, '..', 'shortage.html').replace(/\\/g, '/');

const BASE = {
  ok: true,
  updatedAt: '2026-09-22T18:00:00.000Z',
  data: {
    counts: {
      'h2s:miss-kim-lilac': 46,
      'h2s:hardy-purple-common-lilac-2-sub': 27,
      'h2s:false-spirea': 252,
      'h2s:birchleaf-spirea': 62,
      'h2s:gold-crinkled-hair-grass-sub': 68,
      'h2s:columnar-swedish-aspen': 14,
    },
    notes: {},
  },
};

const WITH_SUBS = JSON.parse(JSON.stringify(BASE));
WITH_SUBS.data.notes = {
  'subs-h2s:paper-birch': JSON.stringify([
    { sp: 'Quaking Aspen', qty: 3, note: 'from the pit, if released' },
    { sp: 'Columnar Swedish Aspen', qty: null, note: '' },
  ]),
  'subs-wsrcc:paper-birch': JSON.stringify([{ sp: 'Scotch Pine', qty: 9, note: 'WSRCC only' }]),
  'subs-h2s:miss-kim-lilac': JSON.stringify([{ sp: 'Late Lilac', qty: 4, note: '' }]),
  'subs-h2s:hardy-purple-common-lilac-2-sub': JSON.stringify([{ sp: 'Miss Canada Lilac', qty: 2, note: '' }]),
  'subs-h2s:gold-crinkled-hair-grass-sub': JSON.stringify([{ sp: 'Karl Foerster Reed Grass', qty: 64, note: '<b>ask Chris</b>' }]),
  'subs-h2s:quaking-aspen': '{not json',
};

async function open(page, record) {
  await page.route('**/macros/s/**', (r) =>
    r.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(record) }));
  await page.goto(URL);
  await page.waitForFunction(
    () => document.querySelectorAll('#itemTwo tr').length > 1 ||
          (document.getElementById('state') || {}).className === 'state err',
    null, { timeout: 10000 }
  );
}

// Found by the species cell STARTING with the name. Plain hasText is not
// enough once subs are on the page: Paper Birch's sub line reads "Quaking Aspen
// x 3", so "the row containing Quaking Aspen" found Paper Birch first.
const rowOf = (page, table, name) => page.locator(`#${table} tr`, {
  has: page.locator('td.sp', { hasText: new RegExp('^\\s*' + name) }),
});

// Every figure cell on the page, in order.
const figures = (page) => page.evaluate(() =>
  [...document.querySelectorAll('#itemOne td.n, #itemTwo td.n')].map((td) => td.textContent));

test('item two shows a species\' sub options under it', async ({ page }) => {
  await open(page, WITH_SUBS);
  const lines = rowOf(page, 'itemTwo', 'Paper Birch').locator('.so');
  await expect(lines).toHaveCount(2);
  await expect(lines.nth(0)).toHaveText('sub option: Quaking Aspen × 3 — from the pit, if released');
  await expect(lines.nth(1)).toHaveText('sub option: Columnar Swedish Aspen (qty open)');
});

test('only Home2Suites subs appear on this page', async ({ page }) => {
  await open(page, WITH_SUBS);
  await expect(page.locator('.wrap')).not.toContainText('Scotch Pine');
});

test('the lilac row shows the subs of both rows that fill it', async ({ page }) => {
  await open(page, WITH_SUBS);
  const lines = rowOf(page, 'itemOne', 'Miss Kim Lilac').locator('.so');
  await expect(lines).toHaveText([
    'sub option: Late Lilac × 4',
    'sub option: Miss Canada Lilac × 2',
  ]);
});

test('subs change no figure on the page', async ({ page }) => {
  await open(page, BASE);
  const without = await figures(page);
  await page.unrouteAll();
  await open(page, WITH_SUBS);
  expect(await figures(page)).toEqual(without);
});

test('a typed note is text, and a garbled entry does not stop the page', async ({ page }) => {
  await open(page, WITH_SUBS);
  // The row is labelled Tufted Hair Grass -- the approved substitute -- but it
  // is the Gold Crinkled (sub) row underneath, and that is where the sub lives.
  const grass = rowOf(page, 'itemTwo', 'Tufted Hair Grass').locator('.so');
  await expect(grass).toContainText('<b>ask Chris</b>');
  expect(await grass.locator('b').count()).toBe(0);

  await expect(rowOf(page, 'itemTwo', 'Quaking Aspen').locator('.so')).toHaveCount(0);
  await expect(page.locator('#itemOne tr td.sp')).toHaveCount(3);
  await expect(page.locator('#itemTwo tr td.sp')).toHaveCount(4);
});
