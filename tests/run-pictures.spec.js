// The WSRCC pictures after the fence went on (9/25).
//
// Two things can go silently wrong here, and neither shows as an error:
//
//   A picture the app asks for is not on disk. imgOrNothing() removes a broken
//   <img>, so a missing file is not a broken icon -- it is simply no picture,
//   and a crew staking a bed has nothing to stake it from.
//
//   The whole-run strip lands on the wrong beds. Beds 1, 3, 5 and 6 run ~250 ft
//   along Boundary Ave and their callout-centred crop shows only one end. The
//   strip is for them; on a 1-plant bed it is noise.

const fs = require('fs');
const path = require('path');
const { test, expect } = require('@playwright/test');
const { loadApp, openJob } = require('./helpers');

const REPO = path.resolve(__dirname, '..');
const RUN_BEDS = ['B01', 'B03', 'B05', 'B06'];

test.beforeEach(async ({ page }) => {
  await loadApp(page);
  await openJob(page, 'wsrcc');
});

test('every WSRCC picture the app asks for is on disk', async ({ page }) => {
  const want = await page.evaluate(() =>
    [BED_IMG + 'site-map.jpg']
      .concat(BEDS.map((b) => BED_IMG + b.bed + '.jpg'))
      .concat(BED_RUNS.map((id) => BED_IMG + id + '-run.jpg')));
  expect(want.length, '1 site map + 47 beds + 4 runs').toBe(52);
  const missing = want.filter((u) => !fs.existsSync(path.join(REPO, u)));
  expect(missing, 'these would render as no picture at all').toEqual([]);
});

test('the WSRCC pictures are the current set (fence + PTE pills), not an old one', async ({ page }) => {
  // v2/ (fence, but "PT" pills) and the unfenced originals are still on disk
  // for installs on an older shell, so pointing back at either would pass the
  // file check and quietly bring back "PT" -- or drop the fence.
  expect(await page.evaluate(() => BED_IMG)).toBe('./beds-wsrcc/v3/');
});

test('the whole-run strip is on the four long beds and no others', async ({ page }) => {
  await page.evaluate(() => { view = 'zones'; renderAll(); });
  const withRun = await page.evaluate(() =>
    Array.from(document.querySelectorAll('.bed-run a[data-lb]'))
      .map((a) => a.closest('section').id.replace('bed-', '')).sort());
  expect(withRun).toEqual(RUN_BEDS);
  const href = await page.locator('#bed-B03 .bed-run a').getAttribute('href');
  expect(href).toBe('./beds-wsrcc/v3/B03-run.jpg');
});

test('Home2Suites has no strips', async ({ page }) => {
  await openJob(page, 'h2s');
  expect(await page.evaluate(() => BED_RUNS)).toEqual([]);
});

test('Save for offline takes the strips too', async ({ page }) => {
  // Out in the yard with no signal, a strip that was never saved is a blank.
  // page.route cannot see fetch() over file://, so record it in the page.
  const asked = await page.evaluate(() => {
    const seen = [];
    window.fetch = (u) => { seen.push(String(u)); return Promise.resolve({ ok: true }); };
    const b = document.createElement('button');
    document.body.appendChild(b);
    saveMapsOffline(b);
    return seen;
  });
  RUN_BEDS.forEach((id) => expect(asked).toContain('./beds-wsrcc/v3/' + id + '-run.jpg'));
  expect(asked).toContain('./beds-wsrcc/v3/site-map.jpg');
});
