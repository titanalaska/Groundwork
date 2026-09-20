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

test('Lady Fern stays under Shrubs, where the proposal filed it', async ({ page }) => {
  // This looks like a mistake and is not one. A fern is a perennial -- it dies
  // back and grows new every year -- but the proposal is the document Palmer
  // gets ordered and reconciled against, so the app matches it. Without this
  // test somebody eventually "fixes" it and the app stops lining up with the
  // paperwork.
  await loadApp(page);
  const where = await page.evaluate(() => {
    const groupOf = (name) => Object.keys(JOBS.palmer.groups)
      .find((g) => JOBS.palmer.groups[g].items.some((row) => row[0] === name));
    return {
      ladyFern: groupOf('Lady Fern'),
      grassLabel: JOBS.palmer.groups.grasses.label,
      grassItems: JOBS.palmer.groups.grasses.items.map((r) => r[0]),
    };
  });

  expect(where.ladyFern, 'the proposal lists Lady Fern under Shrubs').toBe('shrubs');
  expect(where.grassItems, 'what is left really is just grasses')
    .toEqual(['Feather Reed Grass', 'Gold Crinkled Hair Grass']);
  expect(where.grassLabel).toBe('Grasses');
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

test('the pull note answers for this job only, not every job at once', async ({ page }) => {
  // Paper Birch is on all six jobs. Before this was filtered, pulling 40 for
  // Home2Suites made every other job's row claim 40 had been pulled for it --
  // and that note exists specifically to stop a double pull at 6am.
  await loadApp(page);

  const notes = await page.evaluate(() => {
    pulls[slug('Paper Birch')] = [
      { qty: 40, job: 'Home2Suites', who: 'Matthew', at: new Date().toISOString() },
      { qty: 5, job: 'Palmer Public Library', who: 'Matthew', at: new Date().toISOString() },
    ];
    const noteOn = (job) => {
      currentJob = job; applyJobData(); view = 'species'; renderAll();
      const row = [...document.querySelectorAll('.item')]
        .find((r) => r.querySelector('.item-name').textContent.trim() === 'Paper Birch');
      const n = row && row.querySelector('.pull-note');
      return n ? n.textContent : '';
    };
    const out = {
      h2s: noteOn('h2s'),
      palmer: noteOn('palmer'),
      raspberry: noteOn('raspberry'),
    };
    delete pulls[slug('Paper Birch')];
    return out;
  });

  expect(notes.h2s, '40 really did go to Home2Suites').toContain('40');
  expect(notes.palmer, 'and 5 to Palmer').toContain('5');
  expect(notes.palmer, 'but Palmer must not claim Home2Suites\' 40').not.toContain('40');
  expect(notes.raspberry, 'nothing was pulled for Raspberry, so it says nothing').toBe('');
});
