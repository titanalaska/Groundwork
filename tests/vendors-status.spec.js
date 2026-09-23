// Vendor lines on status.html -- the page Chris and Todd read. The endpoint
// is stubbed and VENDORS replaced with a fixture, then the page re-rendered,
// so nothing depends on live data or on today's catalogs.
//
// Titles are chosen not to contain any existing mutation's caughtBy text.
const { test, expect } = require('@playwright/test');
const path = require('path');
const URL = 'file://' + path.resolve(__dirname, '..', 'status.html').replace(/\\/g, '/');

const RECORD = { ok: true, updatedAt: '2026-09-23T18:00:00.000Z',
  data: { counts: { 'h2s:false-spirea': 235 }, planted: {}, staked: {}, notes: {} } };
const FIX = {
  lists: { seedntree: { label: "Seed 'n' Tree", dated: "2026 list, rec'd 7/1/26" } },
  species: { 'paper-birch': { mapped: true, offers: {
    seedntree: [{ as: '<b>Alaska</b> paper birch', forms: [['2"', 238]] }] } } },
};

async function open(page, vendors) {
  await page.route('**/macros/s/**', (r) =>
    r.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(RECORD) }));
  await page.goto(URL);
  await page.waitForFunction(() => document.querySelectorAll('#sections section').length > 0);
  await page.evaluate(({ rec, vendors }) => { window.VENDORS = vendors; render(rec); }, { rec: RECORD, vendors });
}

const figures = (page) => page.evaluate(() => ({
  big: document.getElementById('big').textContent,
  cells: [...document.querySelectorAll('#sections td.n')].map((td) => td.textContent),
}));

test('who-carries lines sit under the species on each job that has it', async ({ page }) => {
  await open(page, FIX);
  for (const job of ['h2s', 'palmer', 'raspberry']) {
    const row = page.locator(`#${job} tr`, { has: page.locator('td', { hasText: /^Paper Birch/ }) });
    await expect(row.locator('.vl'), job).toContainText('2" $238 (2026 list, rec\'d 7/1/26)');
  }
});

test('a vendor name from the file is escaped before it reaches the page', async ({ page }) => {
  await open(page, FIX);
  const vl = page.locator('#h2s .vl', { hasText: 'paper birch' }).first();
  await expect(vl).toContainText('<b>Alaska</b>');
  expect(await vl.locator('b').count()).toBe(0);
});

test('adding vendor lines leaves every figure as it was', async ({ page }) => {
  await open(page, undefined);
  const without = await figures(page);
  await page.unrouteAll();
  await open(page, FIX);
  expect(await figures(page)).toEqual(without);
});

test('without vendors.js the page shows no vendor lines and still renders', async ({ page }) => {
  await open(page, undefined);
  await expect(page.locator('.vl')).toHaveCount(0);
  await expect(page.locator('#sections section').first()).toBeVisible();
});
