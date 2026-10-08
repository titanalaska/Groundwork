// Tape it out on Baxter (10/7/26): distances a crew stakes from, so they are
// checked against the plan, worked on paper -- never against what the table
// happens to say.
//
// Scale: the drawn bar, 60 ft = 46.59 pt, so 0.7765 pt = 1 ft.
//
// The paper row, Area B's first crabapple (BAXTER-trunks.json, displayed
// sheet points):
//   plant MP at (533.46, 252.79)
//   zero = south end of the Area B island curb, southwest side:
//          a = (525.90, 259.80), the curb runs to b = (533.90, 249.63)
//   L = sqrt(8.00^2 + 10.17^2) = 12.939 pt; u = (0.61829, -0.78600)
//   v = p - a = (7.56, -7.01)
//   along = v.u = 7.56*0.61829 + 7.01*0.78600 = 10.184 pt / 0.7765 = 13.115 ft
//         = 157.4 in -> 13' 1"
//   off   = v x u = 7.56*0.78600 - 7.01*0.61829 = 1.608 pt / 0.7765 = 2.071 ft
//         = 24.9 in -> 2' 1"
//   side: the square vector from the curb to the plant is (+1.29, +1.02); +y is
//         south on this sheet, so that points east -> "east of the curb"
//   dir:  the curb runs (8.00, -10.17) = north-east-ish, nearer north -> "going north"
//
// The side word is the mirrored-sides guard: on 9/30 every Home2 row came out
// on the wrong side of its edge from a left/right sign.

const { test, expect } = require('@playwright/test');
const { loadApp, openJob } = require('./helpers');

const STAKED = ['PG', 'BP', 'MP', 'SV', 'JH', 'PF', 'RR', 'SB', 'VT'];

async function openBeds(page, job) {
  await openJob(page, job);
  await page.evaluate(() => { view = 'zones'; renderAll(); });
}

test.beforeEach(async ({ page }) => {
  await loadApp(page);
  await openBeds(page, 'baxter');
});

test('every tree and shrub on a Baxter card has exactly one tape row', async ({ page }) => {
  const bad = await page.evaluate((codes) => {
    const out = [];
    BEDS.forEach((b) => {
      const st = BED_STAKES.beds[b.bed];
      codes.forEach((c) => {
        const want = b.items[c] || 0;
        const got = st ? st.rows.filter((r) => r.code === c).length : 0;
        if (want !== got) out.push(`${b.bed} ${c}: card ${want}, table ${got}`);
      });
    });
    return out;
  }, STAKED);
  expect(bad).toEqual([]);
});

test('all ten boulders are accounted for: seven on the shown beds, three at the deducted ones', async ({ page }) => {
  // The sheet draws 10: B01 1, B02 2, B03 2, B05 2, B06 2, B07 1. The revision
  // deducts B01 and B02, so 7 have tape rows on their beds' zeros and the other
  // 3 (1 + 2) are counted in the deducted note, not given rows.
  const got = await page.evaluate(() => ({
    onBeds: Object.keys(BED_BOULDERS.beds).reduce((m, k) => m + BED_BOULDERS.beds[k].filter((r) => r.code === 'BLDR').length, 0),
    own: Object.keys(BED_BOULDERS.own).length,
    beds: Object.keys(BED_BOULDERS.beds).sort(),
    deducted: BED_DEDUCTED.reduce((m, d) => m + d.boulders, 0),
  }));
  expect(got).toEqual({ onBeds: 7, own: 0, beds: ['B03', 'B05', 'B06', 'B07'], deducted: 3 });
});

test('no tape row names a code its card lacks', async ({ page }) => {
  const bad = await page.evaluate(() => {
    const out = [];
    BEDS.forEach((b) => {
      const st = BED_STAKES.beds[b.bed];
      if (!st) return;
      st.rows.forEach((r) => { if (!b.items[r.code]) out.push(`${b.bed} ${r.code}`); });
    });
    return out;
  });
  expect(bad).toEqual([]);
});

test('the Area B crabapple is where the plan puts it: 13\' 1" north, 2\' 1" east of the curb', async ({ page }) => {
  const card = page.locator('#bed-B05');
  await expect(card.locator('.tape-zero').first()).toContainText('South end of the Area B island curb, southwest side');
  const rows = card.locator('.tape-row', { hasText: 'Prairiefire Crabapple' });
  await expect(rows).toHaveCount(2);
  const first = rows.filter({ hasText: '13′ 1″' });
  await expect(first).toHaveCount(1);
  await expect(first).toContainText('going north');
  await expect(first).toContainText('2′ 1″');
  await expect(first).toContainText('east of the curb');
});

test('the eighth crabapple, drawn with no callout, is measured on Area C and flagged', async ({ page }) => {
  const extra = page.locator('#bed-B06 .tape-row.tape-flag', { hasText: 'Prairiefire Crabapple' });
  await expect(extra).toHaveCount(1);
  await expect(extra).toContainText('NO callout');
});

test('the tape table is on the card, every row of it', async ({ page }) => {
  const want = await page.evaluate(() =>
    BED_STAKES.beds.B07.rows.length + (BED_STAKES.extra.B07 || []).length + (BED_BOULDERS.beds.B07 || []).length);
  // The Southeast bed: BP 3 + JH 3 + PF 17 + PG 3 + RR 12 = 38 staked plants (its
  // 12 iris are massed, no rows) + 1 boulder = 39, off the readings.
  expect(want).toBe(39);
  await expect(page.locator('#bed-B07 .tape-row')).toHaveCount(want);
});

test('a bed with no built edge shows no tape section, and no Baxter bed lacks one', async ({ page }) => {
  expect(await page.evaluate(() => BED_STAKES.no_edge)).toEqual([]);
  await page.evaluate(() => {
    delete BED_STAKES.beds.B06; delete BED_STAKES.extra.B06; delete BED_BOULDERS.beds.B06;
    renderBeds();
  });
  await expect(page.locator('#bed-B06 .sub-head', { hasText: 'Tape it out' })).toHaveCount(0);
  await expect(page.locator('#bed-B05 .sub-head', { hasText: 'Tape it out' })).toHaveCount(1);
});
