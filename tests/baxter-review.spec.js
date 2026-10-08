// What the whole-branch review of the Baxter bed view found (10/7/26), each
// pinned before it was fixed:
//
//   1. In Spanish, a Baxter zero line came out "Sur end of the Area B island
//      curb..." -- the phrase pass swapped the first word and the Home2 rule,
//      which only knows "curb beside this bed", never matched. Baxter's edges
//      carry their own names, so the rule takes any edge name and the names
//      get their own Spanish lines.
//   2. The discrepancy note under the bed list sent every job to Peter Briggs
//      at Corvus. Baxter's plan is The Boutet Company's and its three open
//      questions sit with Chris, so the contact is per job -- and "3 species"
//      was counting "area C".
//   3. The status report printed "undefined: ..." for "area C", the first
//      discrepancy key that is not a species code.
//   4. "Check the bed against the count" rendered on the three perimeter beds
//      with "Plan needs 0 sq ft": Baxter's only massed species (iris) has no
//      spacing on the sheet, so the box had nothing to compare and still asked
//      the crew to pace the bed.

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

test('Spanish: a Baxter zero line translates whole, edge name and all', async ({ page }) => {
  await page.evaluate(() => { lang = 'es'; renderAll(); });
  const zero = page.locator('#bed-B05 .tape-zero').first();
  await expect(zero).toBeVisible();
  await expect(zero).toContainText('Extremo sur del bordillo de la isla del Área B, lado suroeste (va de sur a norte)');
  await expect(zero).not.toContainText('end of the');
  // Home2's own shape still translates by the same rule.
  await openBeds(page, 'h2s');
  await expect(page.locator('#bed-B01 .tape-zero').first()).toContainText('Extremo este del bordillo junto a esta cama (va de este a oeste)');
});

test('the discrepancy note sends Baxter to Chris, and WSRCC still to Corvus', async ({ page }) => {
  const note = page.locator('.zone-note');
  await expect(note).toBeVisible();
  await expect(note).toContainText('3 things do not add up.');
  await expect(note).toContainText('Chris');
  await expect(note).not.toContainText('Corvus');
  await openBeds(page, 'wsrcc');
  await expect(page.locator('.zone-note')).toContainText('3 species do not add up.');
  await expect(page.locator('.zone-note')).toContainText('Peter Briggs at Corvus');
});

test('the status report names "area C", never undefined', async ({ page }) => {
  const report = await page.evaluate(() => generateReport());
  expect(report).toContain('  area C: callouts 0 trees, sheet line says 1');
  expect(report).not.toContain('undefined');
});

test('no fit box on a bed whose only massed species has no spacing', async ({ page }) => {
  // Iris only grows on the three perimeter beds; B01 and B02 are deducted, so B07
  // is the one left. The interior beds (B03-B06) hold no iris at all.
  for (const bed of ['B07']) {
    await expect(page.locator(`#bed-${bed} .fit-row`)).toHaveCount(0);
    await expect(page.locator(`#bed-${bed}`)).not.toContainText('Plan needs');
  }
  // Home2's massed species carry a spacing, so its box stays.
  await openBeds(page, 'h2s');
  expect(await page.locator('#bed-B36 .fit-row').count()).toBeGreaterThan(0);
});
