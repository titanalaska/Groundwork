// The page Chris and Todd read, now that it renders itself.
//
// It used to be typed by hand, and every number on it was a second copy of
// something the app already knew. They drifted every time one was corrected
// and the other was not. It now reads the plan from jobs.js and the counts
// from the same sync document the app writes to.
//
// That removes the drift and introduces a worse failure in its place: a page
// that renders from a fetch can render from a fetch that did not work. A
// status page showing confident zeros is more dangerous than no page, because
// somebody will go and buy plants against it. Most of what is below is about
// that.
//
// Every response here is stubbed, so these never touch the real endpoint and
// never depend on what is in the yard today.

const { test, expect } = require('@playwright/test');
const path = require('path');

const URL = 'file://' + path.resolve(__dirname, '..', 'status.html').replace(/\\/g, '/');

// A small but complete-shaped record. Home2Suites numbers only; the other jobs
// fall through to "nothing counted", which is itself worth rendering.
const RECORD = {
  ok: true,
  updatedAt: '2026-09-21T18:20:52.383Z',
  data: {
    counts: {
      'h2s:miss-kim-lilac': 46,
      'h2s:hardy-purple-common-lilac-2-sub': 27,
      'h2s:false-spirea': 235,
      'h2s:birchleaf-spirea': 62,
    },
    planted: { B01: true, B03: true },
    staked: { B02: true },
  },
};

async function open(page, fulfil) {
  await page.route('**/macros/s/**', fulfil);
  await page.goto(URL);
  await page.waitForFunction(
    () => document.querySelectorAll('#sections section').length > 0 ||
          (document.getElementById('state') || {}).className === 'state err',
    null, { timeout: 10000 }
  );
}

const serve = (body) => (r) =>
  r.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(body) });

test('it renders a row from the record, not from anything typed', async ({ page }) => {
  await open(page, serve(RECORD));
  const row = page.locator('#h2s tr', { hasText: 'Hardy Purple Common Lilac' });
  await expect(row).toContainText('27');
  await expect(row.locator('.pill')).toHaveText('complete');
});

test('a species the record says nothing about reads as none yet', async ({ page }) => {
  await open(page, serve(RECORD));
  // Paper Birch is in the plan and absent from the counts above.
  const row = page.locator('#h2s tr', { hasText: 'Paper Birch' }).first();
  await expect(row.locator('.pill')).toHaveText('none yet');
});

test('a shortfall is shown even when a note calls it settled', async ({ page }) => {
  // False Spirea: the plan asks 252, the record holds 235. The prose beside it
  // says the shortfall is being covered. The NUMBER has to win -- this is the
  // exact disagreement that made the page worth rebuilding.
  await open(page, serve(RECORD));
  const row = page.locator('#h2s tr', { hasText: 'False Spirea' });
  await expect(row).toContainText('235');
  await expect(row.locator('.pill')).toHaveText('short 17');
});

test('every job in the plan gets a section', async ({ page }) => {
  await open(page, serve(RECORD));
  const jobs = await page.evaluate(() => Object.keys(JOBS).length);
  await expect(page.locator('#sections section')).toHaveCount(jobs);
});

test('the totals are the sum of the rows, not a typed number', async ({ page }) => {
  await open(page, serve(RECORD));
  const sums = await page.evaluate(() => {
    let short = 0, done = 0, rows = 0;
    document.querySelectorAll('#sections section tr').forEach((tr) => {
      const td = tr.querySelectorAll('td');
      if (!td.length) return;
      rows++;
      const n = parseInt(td[3].textContent.replace(/\D/g, ''), 10);
      if (isNaN(n)) done++; else short += n;
    });
    const big = document.querySelectorAll('#big b');
    return {
      short, done, rows,
      shownDone: parseInt(big[0].textContent, 10),
      shownRows: parseInt(big[0].querySelector('span').textContent.replace('/', ''), 10),
      shownShort: parseInt(big[1].textContent, 10),
    };
  });
  expect(sums.shownShort).toBe(sums.short);
  expect(sums.shownDone).toBe(sums.done);
  expect(sums.shownRows).toBe(sums.rows);
});

test('bed status comes from the record, not from the markup', async ({ page }) => {
  // The bed rows are still hand-written -- the bed list is plan data this page
  // does not carry -- so their pills start out as whatever was typed. They
  // have to be repainted from the record, including back to "not started" for
  // a bed the record does not mention.
  await open(page, serve(RECORD));
  const seen = await page.evaluate(() => {
    const out = {};
    document.querySelectorAll('#beds tr').forEach((tr) => {
      const b = tr.querySelector('td b');
      if (!b) return;
      const pill = tr.querySelector('.pill');
      out[b.textContent.trim()] = pill ? pill.textContent.trim() : '-';
    });
    return out;
  });
  expect(seen['01']).toBe('planted');   // in the record
  expect(seen['02']).toBe('staked');    // staked, not planted
  expect(seen['03']).toBe('planted');
  expect(seen['04']).toBe('-');         // absent from the record entirely
});

test('a dead endpoint shows an error and NO numbers', async ({ page }) => {
  await open(page, (r) => r.abort('failed'));
  await expect(page.locator('#state')).toHaveClass(/err/);
  await expect(page.locator('#sections section')).toHaveCount(0);
  await expect(page.locator('#big')).toBeEmpty();
  await expect(page.locator('#stamp')).toHaveText('Counts unavailable');
});

test('a refusal from the endpoint is treated the same as being down', async ({ page }) => {
  // ok:false is the shape the sync backend returns when it declines. Rendering
  // its absent data as zeros would be the worst outcome on this page.
  await open(page, serve({ ok: false, error: 'nope' }));
  await expect(page.locator('#state')).toHaveClass(/err/);
  await expect(page.locator('#sections section')).toHaveCount(0);
});

test('rendering twice paints the same page and does not throw', async ({ page }) => {
  // Found live: the second render died removing a banner the first one had
  // already removed -- after painting a correct page, so the damage was a
  // thrown error nobody would see until this page started polling.
  await open(page, serve(RECORD));
  const twice = await page.evaluate(async () => {
    const j = await fetch('https://script.google.com/macros/s/x/exec?action=get').then((r) => r.json());
    const before = document.querySelectorAll('#sections section').length;
    let threw = null;
    try { render(j); } catch (e) { threw = String(e); }
    return { before, after: document.querySelectorAll('#sections section').length, threw };
  });
  expect(twice.threw).toBeNull();
  expect(twice.after).toBe(twice.before);
});

test('a missing jobs.js fails loudly instead of showing an empty job list', async ({ page }) => {
  // jobs.js is a separate file now, so it is a thing that can fail to load.
  // If it does, JOBS is undefined and render() throws -- which must land in
  // the same "no numbers" path as a dead endpoint, not in a page of zeros.
  await page.route('**/jobs.js', (r) => r.abort('failed'));
  await open(page, serve(RECORD));
  await expect(page.locator('#state')).toHaveClass(/err/);
  await expect(page.locator('#sections section')).toHaveCount(0);
  await expect(page.locator('#big')).toBeEmpty();
});

test('the stamp says when the count was taken', async ({ page }) => {
  await open(page, serve(RECORD));
  // Not "as of whenever somebody last edited this file", which is what a typed
  // date meant and why it was always slightly wrong.
  await expect(page.locator('#stamp')).toContainText('September 21');
  await expect(page.locator('#stamp')).toContainText('Live');
});
