// Substitution options in the daily-log draft.
//
// The draft is a DIFF against the state when Matt last tapped "Posted it"
// (see draftDailyLog() in index.html). Subs go in the same way counts do: what
// was added, changed or dropped since then -- not the whole list every day.
//
// What has to hold:
//
//   - The baseline carries subs, so tomorrow's draft does not repeat today's.
//   - A baseline from BEFORE subs existed counts as having none. That is true
//     -- there were none -- and it errs towards saying a line twice rather than
//     swallowing a day's entry, which is the failure the log exists to prevent.
//   - Options are matched by species within a row, so a new quantity reads as a
//     change, not as one dropped and one added.
//   - Record only: subs never produce a Received or Count-correction line.
//   - An option with no species picked is not logged.

const { test, expect } = require('@playwright/test');
const { loadApp, resetCounts } = require('./helpers');

test.beforeEach(async ({ page }) => {
  await loadApp(page);
  await resetCounts(page);
  await page.evaluate(() => {
    Object.keys(notes).forEach((k) => { if (k.indexOf('subs-') === 0) delete notes[k]; });
    lastLogged = logSnapshot();
  });
});

const draft = (page) => page.evaluate(() => draftDailyLog());

test('an option added since the last log is drafted', async ({ page }) => {
  await page.evaluate(() => writeSubs('ntmb', 'Early Forsythia',
    [{ sp: 'Vanhoutte Spirea', qty: 12, note: 'Chris ok' }]));
  const d = await draft(page);
  expect(d.empty).toBe(false);
  expect(d.text).toContain('Sub options (record only, counts unchanged):');
  expect(d.text).toContain('  NTMB — Early Forsythia: added Vanhoutte Spirea × 12 (Chris ok)');
});

test('a quantity set later reads as a change, not a drop and an add', async ({ page }) => {
  await page.evaluate(() => {
    writeSubs('ntmb', 'Early Forsythia', [{ sp: 'Pink Beauty Potentilla', qty: null, note: '' }]);
    lastLogged = logSnapshot();
    writeSubs('ntmb', 'Early Forsythia', [{ sp: 'Pink Beauty Potentilla', qty: 8, note: '' }]);
  });
  const d = await draft(page);
  expect(d.text).toContain('  NTMB — Early Forsythia: Pink Beauty Potentilla, qty open → × 8');
  expect(d.text).not.toContain('added');
  expect(d.text).not.toContain('dropped');
});

test('a changed note is drafted', async ({ page }) => {
  await page.evaluate(() => {
    writeSubs('h2s', 'Paper Birch', [{ sp: 'Quaking Aspen', qty: 3, note: '' }]);
    lastLogged = logSnapshot();
    writeSubs('h2s', 'Paper Birch', [{ sp: 'Quaking Aspen', qty: 3, note: 'Chris approved' }]);
  });
  const d = await draft(page);
  expect(d.text).toContain('  Home2Suites — Paper Birch: Quaking Aspen × 3, note: Chris approved');
});

test('an option removed since the last log is drafted as dropped', async ({ page }) => {
  await page.evaluate(() => {
    writeSubs('h2s', 'Paper Birch', [{ sp: 'Quaking Aspen', qty: 3, note: '' }]);
    lastLogged = logSnapshot();
    writeSubs('h2s', 'Paper Birch', []);
  });
  const d = await draft(page);
  expect(d.text).toContain('  Home2Suites — Paper Birch: dropped Quaking Aspen × 3');
});

test('nothing changed since the snapshot means nothing to draft', async ({ page }) => {
  const d = await page.evaluate(() => {
    writeSubs('ntmb', 'Early Forsythia', [{ sp: 'Vanhoutte Spirea', qty: 12, note: '' }]);
    lastLogged = logSnapshot();
    return draftDailyLog();
  });
  expect(d.empty, 'yesterday\'s subs are not today\'s news').toBe(true);
});

test('a baseline from before subs existed treats them all as new', async ({ page }) => {
  const d = await page.evaluate(() => {
    writeSubs('ntmb', 'Early Forsythia', [{ sp: 'Vanhoutte Spirea', qty: 12, note: '' }]);
    // What an old baseline -- or an old Wolf install's "Posted it" -- looks like.
    delete lastLogged.subs;
    return draftDailyLog();
  });
  expect(d.text).toContain('added Vanhoutte Spirea × 12');
});

test('an option with no species picked is not logged', async ({ page }) => {
  const d = await page.evaluate(() => {
    writeSubs('ntmb', 'Early Forsythia', [{ sp: '', qty: 5, note: 'thinking' }]);
    return draftDailyLog();
  });
  expect(d.empty).toBe(true);
});

test('subs never show up as received or corrected material', async ({ page }) => {
  const d = await page.evaluate(() => {
    writeSubs('ntmb', 'Early Forsythia', [{ sp: 'Vanhoutte Spirea', qty: 12, note: '' }]);
    return draftDailyLog();
  });
  expect(d.text).not.toContain('Received on site');
  expect(d.text).not.toContain('Count corrections');
});
