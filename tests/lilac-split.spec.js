// Splitting a species row must carry its count across.
//
// On 21 Sep the Home2Suites lilac went from one row of 73 to two: Miss Kim at
// 46, and Hardy Purple Common Lilac (#2 sub) at 27 for the balance. The 27 had
// already been pulled from the nursery and delivered. But they had been
// counted against MISS KIM, because until that moment Miss Kim was the only
// row there was -- so the split left the count under the old name and the new
// row read zero. A fully planted job reported 27 short.
//
// Nothing was lost. A key moved and the value did not follow, which is the
// same failure this repo guards against for localStorage renames; a row split
// is just a rename that does not look like one.
//
// migrateLilacSplit() carries it over. These tests exist because that repair
// is invisible when it works and silent when it breaks, and because it has to
// survive a sync: applyPayload() REPLACES state wholesale, so a repair that
// only ran at startup would be undone the next time another phone synced.

const { test, expect } = require('@playwright/test');
const { loadApp } = require('./helpers');

const KIM = 'h2s:miss-kim-lilac';
const SUB = 'h2s:hardy-purple-common-lilac-2-sub';

// Push a payload through the real load path and read the two keys back.
async function load(page, counts) {
  return page.evaluate(({ counts, KIM, SUB }) => {
    applyPayload({ counts: counts });
    return { kim: state[KIM], sub: state[SUB] };
  }, { counts, KIM, SUB });
}

test.beforeEach(async ({ page }) => { await loadApp(page); });

test('the 27 counted under the old single row move to the new one', async ({ page }) => {
  // 73 under Miss Kim was 46 Miss Kim plus the 27 that cover the rest.
  const s = await load(page, { [KIM]: 73 });
  expect(s.kim).toBe(46);
  expect(s.sub).toBe(27);
});

test('a sync replaying the old payload does not strand it again', async ({ page }) => {
  await load(page, { [KIM]: 73 });
  // Another phone still holding the pre-split shape syncs over the top. This
  // is why the repair cannot live in init().
  const s = await load(page, { [KIM]: 73 });
  expect(s.kim).toBe(46);
  expect(s.sub).toBe(27);
});

test('a count already on the new row is never overwritten', async ({ page }) => {
  // Somebody counts the sub row down to 20 -- 7 went back, or were miscounted.
  // The repair must not helpfully put it back to 27.
  const s = await load(page, { [KIM]: 46, [SUB]: 20 });
  expect(s.sub).toBe(20);
});

test('zero on the new row is a real answer, not an empty one', async ({ page }) => {
  // The guard is "is the key absent", not "is it falsy". A deliberate zero is
  // somebody saying none arrived, and it has to outrank the repair.
  const s = await load(page, { [KIM]: 73, [SUB]: 0 });
  expect(s.sub).toBe(0);
});

test('a phone that never counted the 27 is left alone', async ({ page }) => {
  const s = await load(page, { [KIM]: 46 });
  expect(s.kim).toBe(46);
  expect(s.sub).toBeUndefined();
});

test('a partial count carries over partially', async ({ page }) => {
  // 56 under the old row is 46 plus 10 of the 27.
  const s = await load(page, { [KIM]: 56 });
  expect(s.kim).toBe(46);
  expect(s.sub).toBe(10);
});

test('the new row never fills past what the job asks for', async ({ page }) => {
  // A bad number under the old row must not invent 154 lilacs on the new one.
  const s = await load(page, { [KIM]: 200 });
  expect(s.sub).toBe(27);
});

test('a fresh install starts both rows from the seed', async ({ page }) => {
  const s = await page.evaluate(({ KIM, SUB }) => {
    state = {};
    applyPayload({ counts: {} });
    fillMissingFromSeed();
    return { kim: state[KIM], sub: state[SUB] };
  }, { KIM, SUB });
  // The 27 are delivered, so a phone installing today must not open on a
  // shortfall that does not exist.
  expect(s.kim).toBe(46);
  expect(s.sub).toBe(27);
});
