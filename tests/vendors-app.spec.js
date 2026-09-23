// The who-carries-it block in the Subs panel. VENDORS is replaced with a
// fixture so these never depend on what today's catalogs say.
//
// Titles are chosen not to contain any existing mutation's caughtBy text --
// the mutation runners match failing tests by title substring.
const { test, expect } = require('@playwright/test');
const { loadApp, resetCounts } = require('./helpers');

const FIX = {
  lists: {
    seedntree: { label: "Seed 'n' Tree", dated: "2026 list, rec'd 7/1/26" },
    bron: { label: 'Bron & Sons', dated: '2027 booking form' },
    // Never read for Paper Birch below: it must not claim "not on list".
    stewart: { label: 'Stewart Bros', dated: '2025-26 availability, no prices' },
  },
  species: {
    'paper-birch': { mapped: true, offers: {
      seedntree: [{ as: 'Alaska paper birch', forms: [['2"', 238]] }],
      bron: null,
    } },
  },
};

test.beforeEach(async ({ page }) => {
  await loadApp(page);
  await resetCounts(page);
});

async function openSubs(page, job, name, vendors) {
  await page.evaluate(({ job, name, vendors }) => {
    window.VENDORS = vendors;
    currentJob = job; applyJobData(); view = 'species';
    subsOpen[job + ':' + slug(name)] = true;
    renderAll();
  }, { job, name, vendors });
  return page.locator('.item', { has: page.locator(`.item-name:text-is("${name}")`) });
}

test('the Subs panel names who carries the plant, dated', async ({ page }) => {
  const row = await openSubs(page, 'h2s', 'Paper Birch', FIX);
  const block = row.locator('.subs-panel .vendors');
  await expect(block).toContainText('Seed \'n\' Tree as "Alaska paper birch": 2" $238 (2026 list, rec\'d 7/1/26)');
  await expect(block).toContainText('Bron & Sons: not on list (2027 booking form)');
  await expect(block, 'Stewart was never read for this species').not.toContainText('Stewart');
});

test('a species with no vendor mapping says Not mapped yet', async ({ page }) => {
  const row = await openSubs(page, 'ntmb', 'Early Forsythia', FIX);
  await expect(row.locator('.subs-panel .vendors')).toContainText('Not mapped yet');
});

test('without vendors.js the panel says the lists are not loaded', async ({ page }) => {
  const row = await openSubs(page, 'h2s', 'Paper Birch', undefined);
  await expect(row.locator('.subs-panel .vendors')).toHaveText('Vendor lists not loaded.');
  await expect(row.locator('.subs-add'), 'and the sub options still work').toBeVisible();
});

test('opening the vendor block leaves state untouched', async ({ page }) => {
  const before = await page.evaluate(() => JSON.stringify(state));
  await openSubs(page, 'h2s', 'Paper Birch', FIX);
  expect(await page.evaluate(() => JSON.stringify(state))).toBe(before);
});
