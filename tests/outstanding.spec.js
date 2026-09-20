// What a bed still owes.
//
// bedOutstanding() decides whether a planted bed reads "complete" or "planted,
// still owed" -- on the card, and as the colour on the map. Both of its
// failure directions are silent:
//
//   over-reporting  a bed sits amber and somebody goes looking for material
//                   that is already in the ground
//   under-reporting a bed reads finished when the plants never arrived
//
// The second one is how a job gets closed out short. It is the one these tests
// exist for.
//
// WSRCC bed B01 is {CA: 46, CS: 44}. CA (Ivory Halo Dogwood) is WSRCC-only;
// CS (Red-Twig Dogwood) has a same-named row in Home2Suites. One bed, both
// directions.

const { test, expect } = require('@playwright/test');
const {
  loadApp, openJob, setReceived, setRawCount,
  outstandingFor, mapStateFor, resetCounts,
} = require('./helpers');

test.beforeEach(async ({ page }) => {
  await loadApp(page);
  await resetCounts(page);
});

test('a WSRCC bed with everything received owes nothing', async ({ page }) => {
  // Ivory Halo is a WSRCC species with no Home2Suites row at all. If the
  // received count is looked up in the wrong job it comes back undefined,
  // reads as "nothing received", and the bed reports all 46 as owed while 46
  // are sitting in the ground.
  await openJob(page, 'wsrcc');
  await setReceived(page, 'wsrcc', { CA: 46, CS: 44 });

  const owed = await outstandingFor(page, 'B01');
  expect(
    owed,
    `B01 has 46 Ivory Halo and 44 Red-Twig received against 46 and 44 called ` +
    `for, so nothing is outstanding. Got: ` +
    JSON.stringify(owed) + '. Somebody will be sent looking for material that ' +
    `is already planted.`
  ).toEqual([]);
});

test('a WSRCC bed that received NOTHING still reports what it is owed', async ({ page }) => {
  await openJob(page, 'wsrcc');
  await setReceived(page, 'wsrcc', { CA: 0, CS: 0 });

  const owed = await outstandingFor(page, 'B01');
  const codes = owed.map((o) => o.code).sort();
  expect(codes, `nothing received, so both species are owed. Got ${JSON.stringify(owed)}`)
    .toEqual(['CA', 'CS']);
});

test('the OTHER job\'s stock does not mark a WSRCC bed complete', async ({ page }) => {
  // The dangerous direction, and it is live: WSRCC has received 0 Columnar
  // Swedish Aspen while Home2Suites holds 14. If the lookup reads Home2Suites,
  // it sees 14, decides the species is "partially received", falls through to
  // the manual owed map -- which is empty -- and reports NOTHING owed.
  //
  // A bed reading finished when no material has arrived is exactly the phantom
  // that has already cost two trips on this job.
  await openJob(page, 'wsrcc');
  await setReceived(page, 'wsrcc', { CA: 0, CS: 0 });   // WSRCC has nothing
  await setRawCount(page, 'h2s', 'CA', 99);             // the other job is full
  await setRawCount(page, 'h2s', 'CS', 99);

  const owed = await outstandingFor(page, 'B01');
  const codes = owed.map((o) => o.code).sort();
  expect(
    codes,
    `WSRCC received nothing, so B01 owes both species. Got ` +
    JSON.stringify(owed) + `. Home2Suites' stock is being counted as WSRCC's, ` +
    `so a bed with no material on site reads as complete.`
  ).toEqual(['CA', 'CS']);
});

test('the map colours a planted-but-unreceived WSRCC bed as short', async ({ page }) => {
  await openJob(page, 'wsrcc');
  await setReceived(page, 'wsrcc', { CA: 0, CS: 0 });
  await setRawCount(page, 'h2s', 'CA', 99);
  await setRawCount(page, 'h2s', 'CS', 99);

  const colour = await mapStateFor(page, 'B01');
  expect(
    colour,
    `B01 is planted with nothing received, so the map must show "short" ` +
    `(planted, still owed). Got "${colour}".`
  ).toBe('short');
});

test('a partially received species owes only what the owed map records', async ({ page }) => {
  // With some stock received the app cannot infer which bed is short -- only
  // the person who planted it knows. That is what the per-bed owed stepper is
  // for, and a bed with nothing recorded there must report nothing.
  await openJob(page, 'wsrcc');
  await setReceived(page, 'wsrcc', { CA: 20, CS: 20 }); // partial, not zero

  const before = await outstandingFor(page, 'B01');
  expect(before, 'nothing recorded by hand yet, so nothing is claimed as owed').toEqual([]);

  await page.evaluate(() => { setOwed('B01', 'CA', 8, 46); });
  const after = await outstandingFor(page, 'B01');
  expect(after).toEqual([{ code: 'CA', qty: 8, recorded: true }]);
});

test('Home2Suites beds still work', async ({ page }) => {
  // The job that was never broken. If a fix for WSRCC breaks this, the fix is
  // wrong.
  await openJob(page, 'h2s');
  const bed = await page.evaluate(() => {
    const b = BEDS[0];
    return { id: b.bed, codes: Object.keys(b.items) };
  });

  await page.evaluate((codes) => {
    codes.forEach((c) => {
      const row = codeRow(c);
      if (row) state['h2s:' + slug(row[0])] = 0;
    });
  }, bed.codes);

  const owed = await outstandingFor(page, bed.id);
  expect(
    owed.length > 0,
    `${bed.id} received nothing, so it must report what it is owed. Got ${JSON.stringify(owed)}`
  ).toBe(true);
});
