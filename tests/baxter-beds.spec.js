// Baxter Family Housing gets the bed view (10/7/26): seven beds off the vector
// bid set, numbered north to south, with the sheet's own callouts.
//
// Expected values are off the SHEET, worked by hand (BAXTER-readings.txt in
// the room), never read back from the app:
//   the callouts total 204 -- PG 7, BP 8, MP 7, SV 2, JH 11, IS 36, PF 55,
//   RR 38, SB 26, VT 14. The schedule says 207 (PG 9, MP 8); the sheet
//   disagrees with its own schedule and that is carried as a discrepancy,
//   not corrected here.
//   7 beds: B01 West bed (McLean Pl) ... B07 Southeast bed (Baxter Rd).
//   Home2Suites has 44 beds and WSRCC 47, both starting "North side".

const fs = require('fs');
const path = require('path');
const { test, expect } = require('@playwright/test');
const { loadApp, openJob } = require('./helpers');

const REPO = path.resolve(__dirname, '..');
const CALLOUTS = { PG: 7, BP: 8, MP: 7, SV: 2, JH: 11, IS: 36, PF: 55, RR: 38, SB: 26, VT: 14 };
const NAMES = {
  PG: 'White Spruce', BP: 'Paper Birch', MP: 'Prairiefire Crabapple',
  SV: 'Hardy Purple Common Lilac', JH: 'Creeping Juniper', IS: 'Alaska Flag Iris',
  PF: 'Yellow Potentilla', RR: 'Rugosa Rose', SB: 'Birchleaf Spirea',
  VT: 'Dwarf American Cranberry',
};

async function openBeds(page, job) {
  await openJob(page, job);
  await page.evaluate(() => { view = 'zones'; renderAll(); });
}

test.beforeEach(async ({ page }) => {
  await loadApp(page);
  await openBeds(page, 'baxter');
});

test('Baxter cards sum to the sheet\'s callouts, 204 over 7 beds', async ({ page }) => {
  const got = await page.evaluate(() => {
    const sums = {};
    BEDS.forEach((b) => Object.keys(b.items).forEach((c) => { sums[c] = (sums[c] || 0) + b.items[c]; }));
    return { sums, beds: BEDS.length, markers: Object.keys(MAP_XY).length, total: BEDS.reduce((m, b) => m + b.units, 0) };
  });
  expect(got.sums).toEqual(CALLOUTS);
  expect(got.total).toBe(204);
  expect(got.beds).toBe(7);
  expect(got.markers).toBe(7);
});

test('the sheet\'s disagreements with its own schedule are carried, not corrected', async ({ page }) => {
  const disc = await page.evaluate(() => DISCREPANCY);
  expect(Object.keys(disc).sort()).toEqual(['MP', 'PG', 'area C']);
  expect(disc.PG).toContain('callouts 7, schedule 9');
  expect(disc.MP).toContain('callouts 7, schedule 8');
});

test('every Baxter picture the app asks for is on disk', async ({ page }) => {
  const want = await page.evaluate(() => ({
    bedImg: BED_IMG, symImg: SYM_IMG,
    urls: [BED_IMG + 'site-map.jpg']
      .concat(BEDS.map((b) => BED_IMG + b.bed + '.jpg'))
      .concat(BED_RUNS.map((id) => BED_IMG + id + '-run.jpg'))
      .concat(Object.keys(SPECIES).filter((c) => NO_SYM.indexOf(c) === -1).map((c) => SYM_IMG + c + '.png')),
  }));
  expect(want.bedImg).toBe('./beds-baxter/');
  expect(want.symImg).toBe('./symbols-baxter/');
  expect(want.urls.length, '1 site map + 7 beds + 10 symbols').toBe(18);
  const missing = want.urls.filter((u) => !fs.existsSync(path.join(REPO, u)));
  expect(missing, 'these would render as no picture at all').toEqual([]);
});

test('all ten Baxter codes resolve to their checklist rows by name', async ({ page }) => {
  const got = await page.evaluate((codes) => {
    const out = {};
    codes.forEach((c) => { const row = codeRow(c, 'baxter'); out[c] = row ? row[0] : null; });
    return out;
  }, Object.keys(NAMES));
  expect(got).toEqual(NAMES);
});

test('switching jobs renders each job\'s own beds', async ({ page }) => {
  const seen = [];
  for (const job of ['h2s', 'wsrcc', 'baxter']) {
    await openBeds(page, job);
    seen.push(await page.evaluate(() => [BEDS.length, BEDS[0].where, document.querySelectorAll('.zone').length]));
  }
  expect(seen).toEqual([
    [44, 'North side', 44],
    [47, 'North side', 47],
    [7, 'West bed (McLean Pl)', 7],
  ]);
});

test('Staked on Baxter B01 writes the prefixed key, not Home2\'s bare one', async ({ page }) => {
  await page.evaluate(() => { delete staked['B01']; delete staked['baxter:B01']; });
  await page.evaluate(() => document.querySelector('#bed-B01 .act-btn').click());
  const keys = await page.evaluate(() => ({ prefixed: staked['baxter:B01'], bare: staked['B01'] }));
  expect(keys.prefixed).toBe(true);
  expect(keys.bare).toBeUndefined();
});

test('the zeros note is on a Baxter card and on no WSRCC card', async ({ page }) => {
  const note = page.locator('#bed-B01 .tape-zeros');
  await expect(note).toBeVisible();
  await expect(note).toContainText('Zeros assume the buildings and the Erna Court curbs are in.');
  await openBeds(page, 'wsrcc');
  await expect(page.locator('.tape-zeros')).toHaveCount(0);
});

test('every Baxter place and zone name has a Spanish line', async ({ page }) => {
  // The zone KEYS are street names (McLean Pl, Erna Court, Baxter Rd) and read
  // the same in Spanish; they are kept out of ES on purpose -- a bare compass
  // word there ("East") rewrote Home2's "East end of the curb" before that
  // line's own rule could run (10/7/26).
  const got = await page.evaluate(() => {
    const keys = BEDS.map((b) => b.where).concat(Object.keys(ZONES).map((z) => ZONES[z].name));
    return { missing: keys.filter((k) => typeof ES[k] !== 'string' || !ES[k]), zones: Object.keys(ZONES) };
  });
  expect(got.missing).toEqual([]);
  expect(got.zones).toEqual(['McLean Pl', 'Erna Court', 'Baxter Rd']);
});
