// The four Newel St trees (beds 9, 10, 12, 14) are Columnar Swedish Aspen.
//
// The plan calls them "PT", a code with no schedule row, while DRAWING them
// with the aspen symbol on the PTE layer. Counted off the vector plan 9/25:
//   aspen trunks drawn: 19 = 15 in the lot islands + 4 on Newel St
//   aspen callouts:     15 (beds 17 2, 18 2, 19 1, 20 1, 21 2, 22 4, 23 3)
//   schedule:           19
// Matt's call: the four are the aspen. So the cards must now add up to 19.

const { test, expect } = require('@playwright/test');
const { loadApp, openJob } = require('./helpers');

test.beforeEach(async ({ page }) => {
  await loadApp(page);
  await openJob(page, 'wsrcc');
});

test('WSRCC bed cards carry all 19 aspen, 4 of them on Newel St', async ({ page }) => {
  const r = await page.evaluate(() => ({
    total: BEDS.reduce((n, b) => n + (b.items.PTE || 0), 0),
    newel: ['B09', 'B10', 'B12', 'B14'].map((id) =>
      BEDS.filter((b) => b.bed === id)[0].items.PTE || 0),
    pt: BEDS.filter((b) => b.items.PT).map((b) => b.bed),
  }));
  expect(r.total).toBe(19);
  expect(r.newel).toEqual([1, 1, 1, 1]);
  expect(r.pt, 'no WSRCC bed should still carry the unscheduled PT').toEqual([]);
});

test('every plant code on a WSRCC card has a name', async ({ page }) => {
  // Dropping PT from the species list is only safe if no bed still uses it.
  const nameless = await page.evaluate(() => {
    const out = [];
    BEDS.forEach((b) => Object.keys(b.items).forEach((c) => {
      if (!SPECIES[c]) out.push(b.bed + ' ' + c);
    }));
    return out;
  });
  expect(nameless).toEqual([]);
});

test('the Newel St aspen read as owed while no aspen are on hand', async ({ page }) => {
  // Aspen received is 0 on this job, so bed 10 cannot be finished yet -- and
  // under the old PT code it silently owed nothing, because PT had no row.
  const owed = await page.evaluate(() => {
    Object.keys(state).forEach((k) => { if (k.indexOf('wsrcc:') === 0) state[k] = 0; });
    return bedOutstanding(BEDS.filter((b) => b.bed === 'B10')[0]).map((o) => o.code).sort();
  });
  expect(owed).toContain('PTE');
});
