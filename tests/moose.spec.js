// Moose fence on the phone and on the status page. The material arithmetic
// is proven in moose.test.js; this file checks that the pages show it, that
// "Trees caged" counts like a boulder row, and that it stays out of plants.
//
// Targets: Home2Suites 85 trees, Charter 8 (worked in moose.test.js).

const { test, expect } = require('@playwright/test');
const { loadApp, openJob } = require('./helpers');

test.describe('app', () => {
  test.beforeEach(async ({ page }) => {
    await loadApp(page);
  });

  const section = (page) => page.evaluate(() => {
    view = 'species'; renderAll();
    const sec = document.querySelector('section.moose');
    if (!sec) return null;
    return {
      title: sec.querySelector('.group-title').textContent,
      names: [...sec.querySelectorAll('.item-name')].map((e) => e.textContent),
      target: sec.querySelector('.item-target').textContent,
      kit: sec.querySelector('.moose-kit').textContent,
      buttons: sec.querySelectorAll('.pull-btn, .subs-btn').length,
    };
  });

  test('Home2Suites: one "Trees caged" row of 85, and the whole-job material', async ({ page }) => {
    await openJob(page, 'h2s');
    const s = await section(page);
    expect(s.title).toBe('Moose fence');
    expect(s.names).toEqual(['Trees caged']);
    expect(s.target).toContain('need 85');
    expect(s.kit).toContain('340 T-posts');
    expect(s.kit).toContain('2,380 LF');
    expect(s.kit).toContain('680 ties');
    expect(s.kit).not.toContain('stakes');   // Home2 plans show none
    expect(s.buttons, 'a cage is not a plant: no Pull, no Subs').toBe(0);
  });

  test('Charter shows its 24 wood stakes', async ({ page }) => {
    await openJob(page, 'charter');
    const s = await section(page);
    expect(s.target).toContain('need 8');
    expect(s.kit).toContain('32 T-posts');
    expect(s.kit).toContain('224 LF');
    expect(s.kit).toContain('64 ties');
    expect(s.kit).toContain('24 wood stakes');
  });

  test('a job without a fence on its plans gets no section', async ({ page }) => {
    await openJob(page, 'wsrcc');
    expect(await section(page)).toBeNull();
  });

  test('a cage saves under its own key and reaches the report', async ({ page }) => {
    await openJob(page, 'h2s');
    const r = await page.evaluate(() => {
      view = 'species'; renderAll();
      const plus = document.querySelectorAll('section.moose .counter button')[1];
      plus.click(); plus.click(); plus.click();
      return { key: state['h2s:trees-caged'], report: generateReport() };
    });
    expect(r.key).toBe(3);
    // 85 - 3 = 82.
    expect(r.report).toContain('Trees caged: 3/85 -- short 82');
  });

  test('the cage key exists from the first load, so the log sees the first one', async ({ page }) => {
    const keys = await page.evaluate(() => [state['h2s:trees-caged'], state['charter:trees-caged']]);
    expect(keys).toEqual([0, 0]);
  });

  test('cages stay out of the plant totals', async ({ page }) => {
    // Home2's plant rows, 10/3/26: trees 85 + shrubs 414 + grasses 1351 = 1850.
    // A "Trees caged" row inside `groups` would make it 1935.
    const n = await page.evaluate(() => Object.keys(JOBS.h2s.groups)
      .reduce((t, g) => t + JOBS.h2s.groups[g].items.reduce((s, r) => s + r[1], 0), 0));
    expect(n).toBe(1850);
  });

  test('Spanish', async ({ page }) => {
    await openJob(page, 'h2s');
    const s = await page.evaluate(() => {
      setLang('es'); view = 'species'; renderAll();
      const sec = document.querySelector('section.moose');
      return {
        title: sec.querySelector('.group-title').textContent,
        name: sec.querySelector('.item-name').textContent,
        kit: sec.querySelector('.moose-kit').textContent,
      };
    });
    expect(s.title).toBe('Cerca contra alces');
    expect(s.name).toBe('Árboles con cerca');
    expect(s.kit).toContain('340 postes T');
  });
});

test.describe('status page', () => {
  const path = require('path');
  const STATUS = 'file://' + path.resolve(__dirname, '..', 'status.html').replace(/\\/g, '/');
  const RECORD = {
    ok: true,
    updatedAt: '2026-10-03T18:00:00.000Z',
    data: { counts: { 'h2s:trees-caged': 12, 'charter:trees-caged': 8 }, planted: {}, staked: {} },
  };

  test.beforeEach(async ({ page }) => {
    await page.route('**/macros/s/**', (r) => r.fulfill({
      status: 200, contentType: 'application/json', body: JSON.stringify(RECORD) }));
    await page.goto(STATUS);
    await page.waitForFunction(() => document.querySelectorAll('#sections section').length > 0);
  });

  const line = (page, job) => page.locator(`#${job} .sub`, { hasText: /^Moose fence ·/ });

  test('shows cages done against trees', async ({ page }) => {
    // Home2 85 - 12 = 73 to go.
    await expect(line(page, 'h2s')).toHaveText('Moose fence · 12 of 85 trees caged, 73 to go');
    await expect(line(page, 'charter')).toHaveText('Moose fence · all 8 trees caged');
  });

  test('carries the material', async ({ page }) => {
    await expect(page.locator('#h2s .moose-kit')).toContainText('340 T-posts');
    await expect(page.locator('#charter .moose-kit')).toContainText('24 wood stakes');
  });

  test('a job with no fence gets no line', async ({ page }) => {
    await expect(line(page, 'wsrcc')).toHaveCount(0);
  });
});
