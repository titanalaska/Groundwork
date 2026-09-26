// Ticking each plant line in a bed.
//
// Field ask, 9/25, WSRCC: Matt stakes beds ahead of the crew while the Scotch
// Pine has not arrived, and the crew plants behind him. One "Planted" button
// per bed cannot say "the dogwoods and lilacs are in, the pine is not". So
// every line in a bed gets its own tick.
//
// Worked on paper. WSRCC B03 is {CA: 61, CS: 62, PS: 3, SP: 4} = 130.
//   Received for these tests: CA 61, CS 62, SP 4, PS 0 (no pine on site).
//
//   tick CA only            -> 61 of 130 in. CS and SP have material and are
//                              not in, so the crew still owes work: NOT planted.
//   tick CA, CS, SP         -> 127 of 130 in. The only line left is PS, and
//                              there is no pine to plant: the bed is planted,
//                              still owed 3 Scotch Pine -> amber ("short").
//   pine arrives (PS = 16)  -> STILL amber, still owes 3 PS. The pine is on
//                              site, not in the ground. The old single flag
//                              went green here, because "owed" was worked out
//                              from what had been received.
//   tick PS                 -> 130 of 130, nothing owed -> green ("done").

const { test, expect } = require('@playwright/test');
const { loadApp, openJob, setReceived, resetCounts } = require('./helpers');

test.beforeEach(async ({ page }) => {
  await loadApp(page);
  await resetCounts(page);
  await page.evaluate(() => { Object.keys(plantedLine).forEach((k) => { delete plantedLine[k]; }); });
  await openJob(page, 'wsrcc');
  await setReceived(page, 'wsrcc', { CA: 61, CS: 62, SP: 4, PS: 0 });
});

// Tick lines the way the button does, then read back what the bed says.
async function tick(page, codes, on = true) {
  return page.evaluate(({ codes, on }) => {
    const b = BEDS.filter((x) => x.bed === 'B03')[0];
    codes.forEach((c) => setLineIn(b, c, on));
  }, { codes, on });
}

async function bedReads(page) {
  return page.evaluate(() => {
    const b = BEDS.filter((x) => x.bed === 'B03')[0];
    const p = bedLineProgress(b);
    return {
      planted: !!planted[bedKey('B03')],
      map: bedMapState(b),
      owed: bedOutstanding(b).map((o) => o.code + ' ' + o.qty),
      inQty: p.inQty, total: p.total,
    };
  });
}

test('one line in, the rest have material: not planted yet', async ({ page }) => {
  await tick(page, ['CA']);
  const r = await bedReads(page);
  expect(r.inQty, '61 Ivory Halo ticked').toBe(61);
  expect(r.total, 'B03 is 61+62+3+4').toBe(130);
  expect(r.planted,
    'CS and SP are on site and not in the ground, so the crew still has work ' +
    'here. Calling the bed planted would hide that.').toBe(false);
});

test('everything with material ticked: planted, still owed the pine', async ({ page }) => {
  await tick(page, ['CA', 'CS', 'SP']);
  const r = await bedReads(page);
  expect(r.inQty).toBe(127);
  expect(r.planted, 'the only line left has no material on site').toBe(true);
  expect(r.map).toBe('short');
  expect(r.owed).toEqual(['PS 3']);
});

test('pine arriving does NOT turn the bed green until it is ticked', async ({ page }) => {
  await tick(page, ['CA', 'CS', 'SP']);
  await setReceived(page, 'wsrcc', { PS: 16 });
  let r = await bedReads(page);
  expect(r.map,
    'The pine is on site, not in the ground. A bed reading complete here is ' +
    'how a job gets closed out 3 trees short.').toBe('short');
  expect(r.owed).toEqual(['PS 3']);

  await tick(page, ['PS']);
  r = await bedReads(page);
  expect(r.inQty).toBe(130);
  expect(r.map).toBe('done');
  expect(r.owed).toEqual([]);
});

test('unticking a line in a finished bed takes it back off planted', async ({ page }) => {
  await setReceived(page, 'wsrcc', { PS: 16 });
  await tick(page, ['CA', 'CS', 'SP', 'PS']);
  expect((await bedReads(page)).map).toBe('done');
  await tick(page, ['CS'], false);
  const r = await bedReads(page);
  expect(r.inQty).toBe(68);          // 130 - 62
  expect(r.planted).toBe(false);
});

test('Mark planted ticks what has material and leaves the pine open', async ({ page }) => {
  await page.evaluate(() => {
    const b = BEDS.filter((x) => x.bed === 'B03')[0];
    setBedPlanted(b, true);
  });
  let r = await bedReads(page);
  expect(r.inQty).toBe(127);
  expect(r.map).toBe('short');
  // And the pine turning up must not finish it on its own.
  await setReceived(page, 'wsrcc', { PS: 16 });
  r = await bedReads(page);
  expect(r.map).toBe('short');
  expect(r.owed).toEqual(['PS 3']);
});

test('unmarking the bed clears every line tick', async ({ page }) => {
  await tick(page, ['CA', 'CS', 'SP']);
  await page.evaluate(() => {
    setBedPlanted(BEDS.filter((x) => x.bed === 'B03')[0], false);
  });
  const r = await bedReads(page);
  expect(r.inQty).toBe(0);
  expect(r.planted).toBe(false);
});

test('a bed planted before line ticks existed reads exactly as it did', async ({ page }) => {
  // Two WSRCC beds and most of Home2Suites were marked planted with the single
  // button. With no line data, every received line counts as in and a line
  // with nothing received is what it is owed -- the old rule, unchanged.
  await page.evaluate(() => { planted[bedKey('B03')] = true; });
  const r = await bedReads(page);
  expect(r.inQty).toBe(127);
  expect(r.owed).toEqual(['PS 3']);
  expect(r.map).toBe('short');
});

test('line ticks ride the sync payload and come back', async ({ page }) => {
  await tick(page, ['CA', 'CS']);
  const back = await page.evaluate(() => {
    const p = JSON.parse(JSON.stringify(payload()));
    Object.keys(plantedLine).forEach((k) => { delete plantedLine[k]; });
    applyPayload(p);
    return bedLineProgress(BEDS.filter((x) => x.bed === 'B03')[0]).inQty;
  });
  expect(back, 'another phone must see the same 123 in').toBe(123);
});

test('tapping the tick on the card marks the line and survives a re-render', async ({ page }) => {
  // A fresh test browser has no sync key, so this tap saves locally only and
  // never reaches the crew's shared checklist.
  await page.evaluate(() => { view = 'zones'; renderAll(); });
  const box = page.locator('#bed-B03 .in-b[data-code="CA"]');
  await box.click();
  await expect(page.locator('#bed-B03 .in-b[data-code="CA"]')).toHaveClass(/\bon\b/);
  await expect(page.locator('#bed-B03 .zone-prog')).toHaveText('61 of 130 in');
});
