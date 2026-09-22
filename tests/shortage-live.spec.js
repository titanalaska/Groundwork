// The shortage page, now that its numbers come from the record.
//
// This one is not a dashboard. It is an argument put to two people who can act
// on it -- why material came up short, what was done, and the one thing still
// outstanding. The prose is written by hand and should be. The figures were
// too, and they went stale within days: it still said Miss Kim was short 27 and
// False Spirea short 26 long after both had been covered from Titan's own
// nursery, and it was still asking Chris and Todd for direction on decisions
// that had already been made.
//
// A page that asks for something it has already been given is worse than no
// page. These tests are mostly about the figures never getting ahead of, or
// behind, the record.

const { test, expect } = require('@playwright/test');
const path = require('path');

const URL = 'file://' + path.resolve(__dirname, '..', 'shortage.html').replace(/\\/g, '/');

// Item one covered, item two still short -- the state the job is actually in.
const RECORD = {
  ok: true,
  updatedAt: '2026-09-21T21:58:56.394Z',
  data: {
    counts: {
      'h2s:miss-kim-lilac': 46,
      // The 73 L102 calls for is 46 Miss Kim plus these 27. Leaving this key
      // out made the row read short 27 -- correctly, which is how the first
      // version of this fixture proved the summing works.
      'h2s:hardy-purple-common-lilac-2-sub': 27,
      'h2s:false-spirea': 252,
      'h2s:birchleaf-spirea': 62,
      'h2s:gold-crinkled-hair-grass-sub': 68,
      'h2s:columnar-swedish-aspen': 14,
    },
  },
};

const serve = (body) => (r) =>
  r.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(body) });

async function open(page, fulfil) {
  await page.route('**/macros/s/**', fulfil);
  await page.goto(URL);
  await page.waitForFunction(
    () => document.querySelectorAll('#itemTwo tr').length > 1 ||
          (document.getElementById('state') || {}).className === 'state err',
    null, { timeout: 10000 }
  );
}

const rows = (page, id) => page.evaluate((sel) => {
  return Array.from(document.querySelectorAll(sel + ' tr'))
    .filter((tr) => tr.querySelector('td'))
    .map((tr) => Array.from(tr.querySelectorAll('td')).map((td) => td.textContent.trim()));
}, id);

test('item two shows what is actually still short', async ({ page }) => {
  await open(page, serve(RECORD));
  const r = await rows(page, '#itemTwo');
  const hair = r.find((x) => /Tufted Hair Grass/.test(x[0]));
  // 132 required, 68 on hand. The typed page said 68 short; it is 64.
  expect(hair[1]).toBe('132');
  expect(hair[2]).toBe('68');
  expect(hair[3]).toBe('64');
});

test('a partly delivered species is not reported as nothing delivered', async ({ page }) => {
  // The typed page had Columnar Swedish Aspen at 0 on hand and short 28, long
  // after 14 had arrived. Reporting a shortage twice the real size to the
  // people being asked to fix it is the fastest way to stop being believed.
  await open(page, serve(RECORD));
  const r = await rows(page, '#itemTwo');
  const aspen = r.find((x) => /Columnar Swedish Aspen/.test(x[0]));
  expect(aspen[2]).toBe('14');
  expect(aspen[3]).toBe('14');
});

test('item one reports covered, not short, once the record says so', async ({ page }) => {
  await open(page, serve(RECORD));
  const r = await rows(page, '#itemOne');
  const kim = r.find((x) => /Miss Kim/.test(x[0]));
  const fs = r.find((x) => /False Spirea/.test(x[0]));
  expect(kim[4]).toBe('covered');
  expect(fs[4]).toBe('covered');
});

test('item one still shows the callout-versus-schedule gap', async ({ page }) => {
  // Covering the shortfall did not fix the DRAWING. The next person to read
  // L102 hits the same disagreement, so the record of it has to survive the
  // numbers going green.
  await open(page, serve(RECORD));
  const r = await rows(page, '#itemOne');
  const kim = r.find((x) => /Miss Kim/.test(x[0]));
  expect(kim[1]).toBe('73');   // callouts
  expect(kim[2]).toBe('45');   // schedule
});

test('a surplus reads as spare rather than a shortfall', async ({ page }) => {
  await open(page, serve(RECORD));
  const r = await rows(page, '#itemOne');
  const birch = r.find((x) => /Birchleaf/.test(x[0]));
  // 58 callouts, 62 on hand.
  expect(birch[4]).toBe('4 spare');
});

test('it no longer asks for direction on item one', async ({ page }) => {
  await open(page, serve(RECORD));
  const ask = await page.locator('.ask').textContent();
  expect(ask).toContain('Item one is closed');
  expect(ask).not.toMatch(/direction on how you want/);
  expect(ask).toContain('only thing still outstanding');
});

test('the size exception is on the page, not just in somebody memory', async ({ page }) => {
  await open(page, serve(RECORD));
  const body = await page.locator('.callout').first().textContent();
  expect(body).toMatch(/common purple/i);
  expect(body).toMatch(/#2/);
  expect(body).toMatch(/accepted/i);
});

test('a dead endpoint empties the tables and says so', async ({ page }) => {
  // The written case still stands without the numbers. The numbers must not
  // stand without the record.
  await open(page, (r) => r.abort('failed'));
  await expect(page.locator('#state')).toHaveClass(/err/);
  expect(await rows(page, '#itemOne')).toHaveLength(0);
  expect(await rows(page, '#itemTwo')).toHaveLength(0);
  await expect(page.locator('#stamp')).toHaveText('Counts unavailable');
  // The argument survives.
  await expect(page.locator('.ask')).toContainText('outstanding');
});

test('the stamp says when the count was taken', async ({ page }) => {
  await open(page, serve(RECORD));
  await expect(page.locator('#stamp')).toContainText('September 21');
  await expect(page.locator('#stamp')).toContainText('Chris Dietrich');
});

test('a poll with a newer record repaints without duplicating rows', async ({ page }) => {
  await open(page, serve(RECORD));
  const before = (await rows(page, '#itemTwo')).length;

  const moved = JSON.parse(JSON.stringify(RECORD));
  moved.updatedAt = '2026-09-22T12:00:00.000Z';
  moved.data.counts['h2s:columnar-swedish-aspen'] = 28;
  await page.route('**/macros/s/**', serve(moved));
  await page.evaluate(() => startLive.poll());
  await page.waitForTimeout(300);

  const after = await rows(page, '#itemTwo');
  expect(after).toHaveLength(before);           // rebuilt, not appended
  const aspen = after.find((x) => /Columnar Swedish Aspen/.test(x[0]));
  expect(aspen[3]).toBe('covered');
});

test('a missing live.js says so instead of loading forever', async ({ page }) => {
  // live.js is its own request now. Without a guard the page sits on "Reading
  // the live count" indefinitely, which reads as a slow network rather than a
  // broken deploy. No numbers are shown either way; this makes it legible.
  await page.route('**/live.js', (r) => r.abort('failed'));
  await page.route('**/macros/s/**', serve(RECORD));
  await page.goto(URL);
  await page.waitForTimeout(600);
  await expect(page.locator('#state')).toHaveClass(/err/);
  await expect(page.locator('#state')).toContainText('live.js');
  expect(await rows(page, '#itemTwo')).toHaveLength(0);
});
