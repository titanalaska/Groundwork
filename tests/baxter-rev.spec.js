// The signed-off Baxter revision (10/7/26): the West (B01) and Northeast (B02)
// perimeter beds are deducted, four fence runs are added, and NOTHING else moves.
// Matt: "Groundwork's list is right as it is" -- so every species row and
// quantity, every saved count and the five other beds stay exactly as shipped.
//
// Expected values are worked out by hand from the SHIPPED beds (the original
// L1, read off the vector sheet), never read back from the app:
//   B03 Area A  {JH 2, MP 2, PF 3, SB 7, VT 3}              = 17
//   B04 Area D  {MP 3, PF 1, RR 1, SB 8, VT 9}              = 22
//   B05 Area B  {JH 1, MP 2, PF 1, SB 8, VT 1}              = 13
//   B06 Area C  {JH 1, PF 3, SB 3, VT 1}                    =  8
//   B07 SE bed  {BP 3, IS 12, JH 3, PF 17, PG 3, RR 12}     = 50
//   five beds = 17 + 22 + 13 + 8 + 50 = 110 = 204 - 44 (B01) - 50 (B02).
//   per species: PG 3; BP 3; MP 2+3+2 = 7; JH 2+1+1+3 = 7; IS 12;
//   PF 3+1+1+3+17 = 25; RR 1+12 = 13; SB 7+8+8+3 = 26; VT 3+9+1+1 = 14; SV 0.
// Fences, measured on the vector sheet (tools/baxter-rev-fences.py), rounded
// to 5 ft: green 435.1 -> 435, yellow 295.9 -> 295, blue 98.7 -> 100,
// magenta 51.3 -> 50 (the one approximate run).

const { test, expect } = require('@playwright/test');
const { loadApp, openJob } = require('./helpers');

async function openBeds(page, job) {
  await openJob(page, job);
  await page.evaluate(() => { view = 'zones'; renderAll(); });
}

test.beforeEach(async ({ page }) => {
  await loadApp(page);
  await openBeds(page, 'baxter');
});

test('Baxter shows five beds, B03 to B07, and no B01 or B02', async ({ page }) => {
  const got = await page.evaluate(() => ({
    beds: BEDS.map((b) => b.bed),
    markers: Object.keys(MAP_XY).sort(),
    cards: Array.from(document.querySelectorAll('.bed-card')).map((c) => c.id),
  }));
  // Ids are the shipped ids: nothing renumbered, so a mark on B03 is still on B03.
  expect(got.beds).toEqual(['B03', 'B04', 'B05', 'B06', 'B07']);
  expect(got.markers).toEqual(['B03', 'B04', 'B05', 'B06', 'B07']);
  expect(got.cards).toEqual(['bed-B03', 'bed-B04', 'bed-B05', 'bed-B06', 'bed-B07']);
});

test('a Staked mark on B03 is still on B03', async ({ page }) => {
  await page.evaluate(() => { staked['baxter:B03'] = true; renderAll(); });
  await expect(page.locator('#bed-B03 .act-btn').first()).toHaveText('Staked');
  await expect(page.locator('#bed-B04 .act-btn').first()).toHaveText('Mark staked');
});

test('the deducted note names both beds with their plants, and only on Baxter', async ({ page }) => {
  const note = page.locator('.deducted-note');
  await expect(note).toBeVisible();
  await expect(note).toContainText('B01');
  await expect(note).toContainText('West bed (McLean Pl)');
  await expect(note).toContainText('44 plants');
  await expect(note).toContainText('B02');
  await expect(note).toContainText('Northeast bed (Baxter Rd)');
  await expect(note).toContainText('50 plants');
  await expect(note).toContainText('3 boulders');          // 1 at B01 + 2 at B02
  for (const job of ['h2s', 'wsrcc']) {
    await openBeds(page, job);
    await expect(page.locator('.deducted-note')).toHaveCount(0);
    await expect(page.locator('.fences')).toHaveCount(0);
  }
});

test('the fences list shows the four added runs and the north deduct', async ({ page }) => {
  await expect(page.locator('.fences')).toBeVisible();
  const rows = await page.locator('.fence-row').allTextContents();
  expect(rows).toHaveLength(4);
  expect(rows[0]).toContain('6\' cedar good-neighbor fence');
  expect(rows[0]).toContain('about 435 ft');
  expect(rows[1]).toContain('6\' vinyl-coated');
  expect(rows[1]).toContain('about 295 ft');
  expect(rows[2]).toContain('4\' vinyl-coated');
  expect(rows[2]).toContain('about 100 ft');
  expect(rows[3]).toContain('3\' vinyl-coated');
  expect(rows[3]).toContain('about 50 ft');
  expect(rows[3]).toContain('approx');                       // the one run with no drawn corner
  await expect(page.locator('.fence-deducted')).toContainText('north');
  await expect(page.locator('.fences')).toContainText('Note 12');
});

test('"Go to bed" goes to 7, says there is no bed 1, and its max is the highest bed', async ({ page }) => {
  await expect(page.locator('#jumpBed')).toHaveAttribute('max', '7');
  await page.fill('#jumpBed', '1');
  await page.click('#jumpGo');
  await expect(page.locator('#jumpMsg')).toHaveText('No bed 1');
  await page.fill('#jumpBed', '7');
  await page.click('#jumpGo');
  await expect(page.locator('#jumpMsg')).toHaveText('');
  await expect(page.locator('#bed-B07')).toHaveClass(/bed-flash/);
});

test('the species list is exactly as it was: ten rows, original quantities, the new note first', async ({ page }) => {
  const got = await page.evaluate(() => {
    const j = JOBS.baxter, rows = {};
    Object.keys(j.groups).forEach((g) => j.groups[g].items.forEach((r) => { rows[r[0]] = r[1]; }));
    return { rows, flags: j.flags, flagsEs: j.flagsEs };
  });
  // 8 + 8 + 9 + 2 + 55 + 26 + 11 + 14 + 38 + 36 = 207
  expect(got.rows).toEqual({
    'Paper Birch': 8, 'Prairiefire Crabapple': 8, 'White Spruce': 9,
    'Hardy Purple Common Lilac': 2, 'Yellow Potentilla': 55, 'Birchleaf Spirea': 26,
    'Creeping Juniper': 11, 'Dwarf American Cranberry': 14, 'Rugosa Rose': 38,
    'Alaska Flag Iris': 36,
  });
  expect(got.flags).toHaveLength(3);
  expect(got.flagsEs).toHaveLength(3);                       // 1:1 or the Spanish notes are hidden
  expect(got.flags[0]).toContain('two beds deducted');
  expect(got.flags[0]).toContain('<strong>44</strong>');
  expect(got.flags[0]).toContain('<strong>50</strong>');
  expect(got.flags[0]).toContain('Plan Set 11465');          // where the numbers came from
  expect(got.flagsEs[0]).toContain('dos camas deducidas');
});

test('the new blocks read in Spanish', async ({ page }) => {
  await page.evaluate(() => { setLang('es'); view = 'zones'; renderAll(); });
  const note = page.locator('.deducted-note');
  await expect(note).toContainText('plantas');
  await expect(note).not.toContainText(' plants');
  const fences = page.locator('.fences');
  await expect(fences).toContainText('Cerca de cedro');
  await expect(fences).toContainText('unos 435 pies');
  await expect(fences).not.toContainText('good-neighbor');
  await expect(fences).not.toContainText('about 435');
});
