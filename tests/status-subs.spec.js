// Substitution options on the status page -- the page Chris and Todd read.
//
// The app stores them in the shared record under notes["subs-<job>:<slug>"]
// (see the Subs panel in index.html and tests/subs.spec.js). This page shows
// them under their species. What has to hold:
//
//   - A record, not arithmetic. Plan, on site, short and every total stay what
//     they were -- a sub under consideration is not a plant on site.
//   - Pinned to its job. Paper Birch is on six jobs; a Home2Suites sub must not
//     show up under WSRCC's Paper Birch. That shape of bug has shipped here
//     three times (the h2s-prefix bugs).
//   - Typed text is text. The note is free text off a phone and this page
//     builds HTML, so it is escaped.
//   - One bad entry cannot blank the page. A status page that dies on a
//     garbled sub shows Chris nothing at all.
//
// Every response is stubbed; nothing here touches the real endpoint.

const { test, expect } = require('@playwright/test');
const path = require('path');

const URL = 'file://' + path.resolve(__dirname, '..', 'status.html').replace(/\\/g, '/');

const subs = (list) => JSON.stringify(list);

const BASE = {
  ok: true,
  updatedAt: '2026-09-22T18:00:00.000Z',
  data: {
    counts: { 'h2s:false-spirea': 235, 'h2s:birchleaf-spirea': 62 },
    planted: {}, staked: {},
    notes: {},
  },
};

const WITH_SUBS = JSON.parse(JSON.stringify(BASE));
WITH_SUBS.updatedAt = '2026-09-22T18:05:00.000Z';
WITH_SUBS.data.notes = {
  'notes-h2s': 'ordinary job notes, not a sub',
  'subs-ntmb:early-forsythia': subs([
    { sp: 'Vanhoutte Spirea', qty: 12, note: 'Chris ok 9/22' },
    { sp: 'Pink Beauty Potentilla', qty: null, note: '' },
    { sp: '', qty: 5, note: 'species not picked yet' },
  ]),
  'subs-h2s:paper-birch': subs([{ sp: 'Quaking Aspen', qty: 3, note: '' }]),
  'subs-ntmb:hedge-cotoneaster': subs([{ sp: 'Alpine Currant', qty: 2, note: '<img src=x onerror=alert(1)><b>bold</b>' }]),
  'subs-ntmb:quaking-aspen': '{not json',
};

async function open(page, record) {
  await page.route('**/macros/s/**', (r) =>
    r.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(record) }));
  await page.goto(URL);
  await page.waitForFunction(
    () => document.querySelectorAll('#sections section').length > 0 ||
          (document.getElementById('state') || {}).className === 'state err',
    null, { timeout: 10000 }
  );
}

const figures = (page) => page.evaluate(() => ({
  big: document.getElementById('big').textContent,
  cells: [...document.querySelectorAll('#sections td.n')].map((td) => td.textContent),
  pills: [...document.querySelectorAll('#sections .pill')].map((p) => p.textContent),
}));

test('a sub option shows under its species with quantity and note', async ({ page }) => {
  await open(page, WITH_SUBS);
  const row = page.locator('#ntmb tr', { hasText: 'Early Forsythia' });
  const lines = row.locator('.so');

  await expect(lines).toHaveCount(2);  // the unpicked line is left off
  await expect(lines.nth(0)).toHaveText('sub option: Vanhoutte Spirea × 12 — Chris ok 9/22');
  await expect(lines.nth(1)).toHaveText('sub option: Pink Beauty Potentilla (qty open)');
});

test('subs change no number on the page', async ({ page }) => {
  await open(page, BASE);
  const without = await figures(page);
  await page.unrouteAll();
  await open(page, WITH_SUBS);
  const withSubs = await figures(page);

  expect(withSubs.big, 'the headline totals').toBe(without.big);
  expect(withSubs.cells, 'every plan / on-site / short cell').toEqual(without.cells);
  expect(withSubs.pills, 'every status pill').toEqual(without.pills);
});

test('a sub shows on its own job only', async ({ page }) => {
  await open(page, WITH_SUBS);
  // The Home2Suites Paper Birch sub.
  await expect(page.locator('#h2s tr', { hasText: 'Paper Birch' }).locator('.so'))
    .toHaveText('sub option: Quaking Aspen × 3');
  // Paper Birch is on WSRCC, Palmer and Raspberry too. None of them has a sub.
  for (const job of ['wsrcc', 'palmer', 'raspberry']) {
    await expect(page.locator(`#${job} tr`, { hasText: 'Paper Birch' }).locator('.so'),
      `${job} must not borrow the Home2Suites sub`).toHaveCount(0);
  }
});

test('a typed note is shown as text, never run as markup', async ({ page }) => {
  let alerted = false;
  page.on('dialog', (d) => { alerted = true; d.dismiss(); });
  await open(page, WITH_SUBS);

  const line = page.locator('#ntmb tr', { hasText: 'Hedge Cotoneaster' }).locator('.so');
  await expect(line).toContainText('<b>bold</b>');
  expect(await line.locator('b, img').count(), 'no element was built from the note').toBe(0);
  expect(alerted).toBe(false);
});

test('a garbled entry is skipped and the rest of the page still renders', async ({ page }) => {
  await open(page, WITH_SUBS);
  const jobs = await page.evaluate(() => Object.keys(JOBS).length);
  await expect(page.locator('#sections section')).toHaveCount(jobs);
  await expect(page.locator('#ntmb tr', { hasText: 'Quaking Aspen' }).locator('.so')).toHaveCount(0);
  await expect(page.locator('#ntmb tr', { hasText: 'Early Forsythia' }).locator('.so')).toHaveCount(2);
});
