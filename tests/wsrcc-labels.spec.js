// Two WSRCC bed labels that sent a crew to the wrong place (field check 9/25).
//
// Bed 5 is the north frontage tree and lilac row, from the Boundary Ave
// driveway to the walkway. It was labelled "West side" -- its number marker
// sits by the driveway at the west end, and the label followed the marker.
//
// Bed 3's callouts cover TWO planters either side of that driveway: the 3
// Scotch Pine and 4 lilacs in the NW corner by the "3" marker, and the 123
// dogwoods in the hedge across the drive. Following the marker finds 7
// plants, not 130, so the card has to say where the rest are.

const { test, expect } = require('@playwright/test');
const { loadApp, openJob } = require('./helpers');

test.beforeEach(async ({ page }) => {
  await loadApp(page);
  await openJob(page, 'wsrcc');
  await page.evaluate(() => { view = 'zones'; renderAll(); });
});

test('bed 5 is on the north side', async ({ page }) => {
  await expect(page.locator('#bed-B05 .zone-place')).toContainText('North side');
});

test('bed 3 says its dogwoods are across the driveway', async ({ page }) => {
  const link = page.locator('#bed-B03 .bed-link');
  await expect(link).toContainText('This callout covers two planters.');
  await expect(link).toContainText('across the driveway');
});
