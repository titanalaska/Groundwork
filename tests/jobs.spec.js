// The job list, and the line that counts it.
//
// That line said "four active jobs" as a literal string while jobs were being
// added to the app. A sentence that was true when written is the easiest kind
// to stop noticing, so it is derived now and this test says so.

const { test, expect } = require('@playwright/test');
const { loadApp } = require('./helpers');

test('the jobs line counts the jobs rather than claiming a number', async ({ page }) => {
  await loadApp(page);

  const seen = await page.evaluate(() => {
    const line = () => document.getElementById('jobsLine').textContent;
    const real = Object.keys(JOBS).length;

    // Add a job and re-render. If the line is derived it follows; if it is a
    // typed string it does not.
    JOBS.__probe = { label: 'Probe', short: 'Probe', groups: {}, flags: [] };
    renderAll();
    const afterAdding = line();
    delete JOBS.__probe;
    renderAll();

    return { real, withProbe: afterAdding, restored: line() };
  });

  expect(seen.withProbe).toContain(String(seen.real + 1));
  expect(seen.restored).toContain(String(seen.real));
  expect(seen.restored).not.toContain('four');
});

test('Palmer and Raspberry are in the app with their proposal counts', async ({ page }) => {
  await loadApp(page);

  const jobs = await page.evaluate(() => {
    const total = (key) => Object.keys(JOBS[key].groups)
      .reduce((sum, g) => sum + JOBS[key].groups[g].items
        .reduce((s, row) => s + row[1], 0), 0);
    return {
      keys: Object.keys(JOBS),
      palmer: { label: JOBS.palmer.label, total: total('palmer') },
      raspberry: { label: JOBS.raspberry.label, total: total('raspberry') },
    };
  });

  expect(jobs.keys).toContain('palmer');
  expect(jobs.keys).toContain('raspberry');

  // Straight off the proposals: 44 trees + 108 shrubs + 374 perennials, and
  // 94 trees + 400 shrubs.
  expect(jobs.palmer.total, 'Palmer Public Library, proposal of 2/9/26').toBe(526);
  expect(jobs.raspberry.total, 'Raspberry Townhomes Lot 4, proposal of 7/7/26').toBe(494);
});

test('both new jobs start at zero, because nothing has arrived', async ({ page }) => {
  await loadApp(page);

  const counts = await page.evaluate(() => {
    const out = {};
    ['palmer', 'raspberry'].forEach((key) => {
      let nonZero = 0;
      Object.keys(JOBS[key].groups).forEach((g) => {
        JOBS[key].groups[g].items.forEach((row) => {
          if ((state[key + ':' + slug(row[0])] || 0) !== 0) nonZero++;
        });
      });
      out[key] = nonZero;
    });
    return out;
  });

  expect(counts.palmer, 'no Palmer material has been received').toBe(0);
  expect(counts.raspberry, 'no Raspberry material has been received').toBe(0);
});

test('neither new job offers a bed view, because neither has callouts', async ({ page }) => {
  await loadApp(page);
  const bedViews = await page.evaluate(() => ({
    palmer: hasBedView('palmer'),
    raspberry: hasBedView('raspberry'),
    h2s: hasBedView('h2s'),
  }));

  expect(bedViews.palmer, 'a proposal carries no bed callouts to build a bed view from').toBe(false);
  expect(bedViews.raspberry).toBe(false);
  expect(bedViews.h2s, 'the jobs that do have plan sets keep theirs').toBe(true);
});

test('both new jobs say where their numbers came from', async ({ page }) => {
  await loadApp(page);
  const flags = await page.evaluate(() => ({
    palmer: JOBS.palmer.flags.join(' '),
    raspberry: JOBS.raspberry.flags.join(' '),
  }));

  expect(flags.palmer).toContain('proposal');
  expect(flags.raspberry).toContain('proposal');
});
