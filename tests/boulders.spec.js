// Boulders, from Chris Dietrich's four emails of 9/28/26.
//
// Expected values are HIS numbers, copied off the emails -- not whatever the
// app renders:
//   Home2 Suites        Type A 18 (Class 4), Type B 28 (Class 3)          = 46
//   Carpenters (WSRCC)  Type A 4, Type B 16, Type C 4 (Class 2)           = 24
//   Wasilla Charter     6 Type A (class 4), 13 Type B (Class 3)           = 19
//   Baxter              9 Class 3, no placement plan yet (waiting on H5)  =  9
//
// The other half of this file is what boulders must NOT do: they are not
// plants, and every plant total, picker and button has to stay as it was.

const { test, expect } = require('@playwright/test');
const { loadApp, openJob } = require('./helpers');

test.beforeEach(async ({ page }) => {
  await loadApp(page);
});

test('each job carries Chris\'s boulder counts', async ({ page }) => {
  const got = await page.evaluate(() => {
    const out = {};
    Object.keys(JOBS).forEach((k) => {
      if (JOBS[k].boulders) out[k] = JOBS[k].boulders.items.map((r) => [r[0], r[1]]);
    });
    return out;
  });
  expect(got).toEqual({
    h2s: [['Type A Boulder (Class 4)', 18], ['Type B Boulder (Class 3)', 28]],
    charter: [['Type A Boulder (Class 4)', 6], ['Type B Boulder (Class 3)', 13]],
    baxter: [['Class 3 Boulder', 9]],
    wsrcc: [['Type A Boulder (Class 4)', 4], ['Type B Boulder (Class 3)', 16],
            ['Type C Boulder (Class 2)', 4]],
  });
});

test('boulders stay out of the plant totals', async ({ page }) => {
  // WSRCC's plant schedule totals 1008 (jobs.js header). 24 rocks must not
  // turn that into 1032.
  const wsrcc = await page.evaluate(() => Object.keys(JOBS.wsrcc.groups)
    .reduce((n, g) => n + JOBS.wsrcc.groups[g].items.reduce((s, r) => s + r[1], 0), 0));
  expect(wsrcc).toBe(1008);
});

test('the Boulders section renders rows, sizes and the plan, with no Pull or Subs', async ({ page }) => {
  await openJob(page, 'wsrcc');
  const s = await page.evaluate(() => {
    view = 'species'; renderAll();
    const sec = document.querySelector('section.rocks');
    return {
      title: sec.querySelector('.group-title').textContent,
      names: [...sec.querySelectorAll('.item-name')].map((e) => e.textContent),
      sizes: [...sec.querySelectorAll('.rock-size')].map((e) => e.textContent),
      buttons: sec.querySelectorAll('.pull-btn, .subs-btn').length,
      pics: [...sec.querySelectorAll('.rock-pic img')].map((i) => i.getAttribute('src')),
    };
  });
  expect(s.title).toBe('Boulders');
  // Biggest shortfall first, like every plant group. Nothing counted, so each
  // is short its whole target: B 16, then A 4 and C 4 tied -- ties keep A-B-C.
  expect(s.names).toEqual(['Type B Boulder (Class 3)', 'Type A Boulder (Class 4)',
                           'Type C Boulder (Class 2)']);
  // L501 detail 7: a = 12' / 45", b = 9' / 33", c = 6' / 21".
  expect(s.sizes[0]).toContain("9'");
  expect(s.sizes[0]).toContain('33"');
  expect(s.sizes[1]).toContain("12'");
  expect(s.sizes[1]).toContain('45"');
  expect(s.sizes[2]).toContain("6'");
  expect(s.sizes[2]).toContain('21"');
  expect(s.buttons, 'Pull goes to plant Inventory; Subs offers species').toBe(0);
  expect(s.pics).toEqual(['./beds-boulders/wsrcc-v1.jpg', './beds-boulders/schedule-v1.jpg']);
});

test('Baxter shows the missing-plan note and borrows no size from another sheet', async ({ page }) => {
  await openJob(page, 'baxter');
  const s = await page.evaluate(() => {
    view = 'species'; renderAll();
    const sec = document.querySelector('section.rocks');
    return {
      note: sec.querySelector('.rock-note').textContent,
      sizes: sec.querySelectorAll('.rock-size').length,
      pics: sec.querySelectorAll('.rock-pic').length,
    };
  });
  expect(s.note).toContain('No placement plan yet');
  expect(s.sizes).toBe(0);
  expect(s.pics, 'no plan, and no schedule without a size').toBe(0);
});

test('Charter records the Type C disagreement instead of picking a side', async ({ page }) => {
  await openJob(page, 'charter');
  const note = await page.evaluate(() => {
    view = 'species'; renderAll();
    return document.querySelector('section.rocks .rock-note').textContent;
  });
  expect(note).toContain('6 Type A and 13 Type B');
  expect(note).toContain('(3) Type C');
});

test('a boulder count saves under its own key and reaches the report', async ({ page }) => {
  await openJob(page, 'h2s');
  const r = await page.evaluate(() => {
    view = 'species'; renderAll();
    const row = [...document.querySelectorAll('section.rocks .item')]
      .find((e) => e.querySelector('.item-name').textContent === 'Type A Boulder (Class 4)');
    row.querySelectorAll('.counter button')[1].click();   // +
    row.querySelectorAll('.counter button')[1].click();   // +
    return { key: state['h2s:type-a-boulder-class-4'], report: generateReport() };
  });
  expect(r.key).toBe(2);
  // 18 planned - 2 on site = short 16.
  expect(r.report).toContain('Type A Boulder (Class 4): 2/18 -- short 16');
});

test('boulder keys exist from the first load, so the log can see the first delivery', async ({ page }) => {
  const keys = await page.evaluate(() => [
    'h2s:type-b-boulder-class-3', 'wsrcc:type-c-boulder-class-2', 'baxter:class-3-boulder',
  ].map((k) => state[k]));
  expect(keys).toEqual([0, 0, 0]);
});

test('Spanish translates the boulder rows', async ({ page }) => {
  await openJob(page, 'wsrcc');
  const s = await page.evaluate(() => {
    setLang('es'); view = 'species'; renderAll();
    const sec = document.querySelector('section.rocks');
    return {
      title: sec.querySelector('.group-title').textContent,
      first: sec.querySelector('.item-name').textContent,
      size: sec.querySelector('.rock-size').textContent,
    };
  });
  expect(s.title).toBe('Rocas');
  expect(s.first).toBe('Roca tipo B (clase 3)');   // B leads: short 16
  expect(s.size).toContain('de contorno');
  expect(s.size).toContain('de alto');
});

// ---- the status page, the link Chris and Todd read ----
test.describe('status page', () => {
  const path = require('path');
  const STATUS = 'file://' + path.resolve(__dirname, '..', 'status.html').replace(/\\/g, '/');

  // Worked on paper, against Chris's targets:
  //   WSRCC   A 4 - 4 = 0,  B 16 - 10 = 6,  C 4 - 1 = 3  -> "6 Type B (Class 3), 3 Type C (Class 2)"
  //           (A is done, so it is left off; B leads because 6 > 3)
  //   Charter A 6 - 6 = 0,  B 13 - 13 = 0                -> "all on site"
  //   Baxter  nothing counted, 9 - 0 = 9                 -> "9 Class 3"
  const RECORD = {
    ok: true,
    updatedAt: '2026-09-28T18:00:00.000Z',
    data: {
      counts: {
        'wsrcc:type-a-boulder-class-4': 4,
        'wsrcc:type-b-boulder-class-3': 10,
        'wsrcc:type-c-boulder-class-2': 1,
        'charter:type-a-boulder-class-4': 6,
        'charter:type-b-boulder-class-3': 13,
      },
      planted: {}, staked: {},
    },
  };

  test.beforeEach(async ({ page }) => {
    await page.route('**/macros/s/**', (r) => r.fulfill({
      status: 200, contentType: 'application/json', body: JSON.stringify(RECORD) }));
    await page.goto(STATUS);
    await page.waitForFunction(() => document.querySelectorAll('#sections section').length > 0);
  });

  const summary = (page, job) => page.locator(`#${job} .sub`, { hasText: 'Boulders' });

  test('the summary breaks the shortfall out by type, worst first', async ({ page }) => {
    await expect(summary(page, 'wsrcc'))
      .toHaveText('Boulders · still need 6 Type B (Class 3), 3 Type C (Class 2)');
    await expect(summary(page, 'baxter')).toHaveText('Boulders · still need 9 Class 3');
  });

  test('a job with every boulder on site says so', async ({ page }) => {
    await expect(summary(page, 'charter')).toHaveText('Boulders · all on site');
  });

  test('a job with no boulders gets no boulder line', async ({ page }) => {
    await expect(summary(page, 'palmer')).toHaveCount(0);
  });
});
