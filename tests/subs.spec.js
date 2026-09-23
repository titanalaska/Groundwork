// Substitution options -- the Subs panel under every species row.
//
// What Matt asked for, 9/22: under each species, somewhere to write down what
// could stand in for it, picked from the species already in Groundwork, with a
// quantity and a note. Chris had just asked about NTMB "substitute what we have
// in the nursery for what we don't have", and nowhere in the app could hold
// the answer.
//
// The things that have to hold:
//
//   1. It ships EMPTY. No row has a pre-filled substitute and a new line has no
//      default species or quantity -- those are judgment calls and he makes them.
//   2. It is a RECORD, not arithmetic. Entering a sub must not move a count, a
//      shortfall or the order of the list. When a sub is final it becomes its
//      own row, the way the lilac split did.
//   3. It survives the OLD app. The old Wolf install is still live and writes the
//      whole shared document on every tap. A new top-level field would be wiped
//      by it. Subs live inside `notes`, which the old app copies through whole.
//   4. It survives a sync repaint. A snapshot from another phone rebuilds the
//      list; an open panel must still be open and a half-typed note kept.

const { test, expect } = require('@playwright/test');
const { loadApp, resetCounts } = require('./helpers');

test.beforeEach(async ({ page }) => {
  await loadApp(page);
  await resetCounts(page);
  await page.evaluate(() => {
    Object.keys(notes).forEach((k) => { if (k.indexOf('subs-') === 0) delete notes[k]; });
    currentJob = 'ntmb'; applyJobData(); view = 'species'; renderAll();
  });
});

// The row for a species on the open job, found by its visible name.
const rowFor = (name) => `.item:has(.item-name:text-is("${name}"))`;

test('nothing is pre-filled: every row on every job starts with no subs', async ({ page }) => {
  const found = await page.evaluate(() => {
    const out = [];
    Object.keys(JOBS).forEach((jk) => Object.keys(JOBS[jk].groups).forEach((g) =>
      JOBS[jk].groups[g].items.forEach((row) => {
        if (readSubs(jk, row[0]).length) out.push(jk + ':' + row[0]);
      })));
    return out;
  });
  expect(found, 'no substitute is decided for him').toEqual([]);
});

test('a new option line is blank -- no species, no quantity, no note', async ({ page }) => {
  const row = page.locator(rowFor('Early Forsythia'));
  await row.locator('.subs-btn').click();
  await row.locator('.subs-add').click();

  const line = row.locator('.sub-line').first();
  await expect(line.locator('select')).toHaveValue('');
  await expect(line.locator('.sub-qty')).toHaveValue('');
  await expect(line.locator('.sub-note')).toHaveValue('');
});

test('the picker offers every Groundwork species except the row itself', async ({ page }) => {
  const row = page.locator(rowFor('Early Forsythia'));
  await row.locator('.subs-btn').click();
  await row.locator('.subs-add').click();

  const offered = await row.locator('.sub-line select option').allTextContents();
  const expected = await page.evaluate(() => {
    const seen = {};
    Object.keys(JOBS).forEach((jk) => Object.keys(JOBS[jk].groups).forEach((g) =>
      JOBS[jk].groups[g].items.forEach((r) => { seen[slug(r[0])] = decode(r[0]); })));
    return Object.keys(seen).length;
  });

  expect(offered, 'not the species being replaced').not.toContain('Early Forsythia');
  // Species from OTHER jobs are offered -- that is the point of a shared list.
  expect(offered).toContain('Karl Foerster Reed Grass');   // Home2Suites only
  expect(offered).toContain('Lady Fern');                  // Palmer only
  expect(offered).toContain("Bishop's Weed (Goutweed)");   // entity decoded
  // Every distinct species minus the row itself, plus the blank and "Other".
  expect(offered.length).toBe(expected - 1 + 2);
});

test('an option is saved into notes and comes back after a reload', async ({ page }) => {
  const row = page.locator(rowFor('Early Forsythia'));
  await row.locator('.subs-btn').click();
  await row.locator('.subs-add').click();
  const line = row.locator('.sub-line').first();
  await line.locator('select').selectOption('Vanhoutte Spirea');
  await line.locator('.sub-qty').fill('12');
  await line.locator('.sub-note').fill('Chris ok 9/22');

  const saved = await page.evaluate(() => notes['subs-ntmb:early-forsythia']);
  expect(JSON.parse(saved)).toEqual([{ sp: 'Vanhoutte Spirea', qty: 12, note: 'Chris ok 9/22' }]);

  // The collapsed row says it without opening anything -- the TV case.
  await expect(row.locator('.subs-summary')).toContainText('Vanhoutte Spirea');
  await expect(row.locator('.subs-summary')).toContainText('12');
  await expect(row.locator('.subs-btn')).toHaveText('Subs 1');

  await page.reload();
  await page.waitForFunction(() => typeof bedOutstanding === 'function');
  const back = await page.evaluate(() => readSubs('ntmb', 'Early Forsythia'));
  expect(back).toEqual([{ sp: 'Vanhoutte Spirea', qty: 12, note: 'Chris ok 9/22' }]);
});

test('a blank quantity stays blank rather than becoming 0', async ({ page }) => {
  const row = page.locator(rowFor('Early Forsythia'));
  await row.locator('.subs-btn').click();
  await row.locator('.subs-add').click();
  await row.locator('.sub-line select').selectOption('Vanhoutte Spirea');

  const untouched = await page.evaluate(() => readSubs('ntmb', 'Early Forsythia'));
  expect(untouched[0].qty, 'undecided is not zero').toBeNull();

  // The case the first version of this test never exercised: a number typed
  // and then deleted. The input handler has to hand back null, not 0 -- the
  // mutation check caught this test passing without touching the box.
  const qty = row.locator('.sub-qty');
  await qty.fill('12');
  await qty.fill('');
  const cleared = await page.evaluate(() => readSubs('ntmb', 'Early Forsythia'));
  expect(cleared[0].qty, 'a cleared box is undecided again, not zero').toBeNull();
});

test('"Other" takes a species that is not on any job yet', async ({ page }) => {
  const row = page.locator(rowFor('Early Forsythia'));
  await row.locator('.subs-btn').click();
  await row.locator('.subs-add').click();
  await row.locator('.sub-line select').selectOption('__other');
  await row.locator('.sub-line .sub-other').fill('Tatarian Honeysuckle');

  const saved = await page.evaluate(() => readSubs('ntmb', 'Early Forsythia'));
  expect(saved[0].sp).toBe('Tatarian Honeysuckle');
});

test('removing the last option clears the entry instead of leaving []', async ({ page }) => {
  const row = page.locator(rowFor('Early Forsythia'));
  await row.locator('.subs-btn').click();
  await row.locator('.subs-add').click();
  await row.locator('.sub-line select').selectOption('Vanhoutte Spirea');
  await row.locator('.sub-remove').click();

  const left = await page.evaluate(() => 'subs-ntmb:early-forsythia' in notes);
  expect(left).toBe(false);
  await expect(row.locator('.subs-btn')).toHaveText('Subs');
});

test('subs never move a count, a shortfall or the list order', async ({ page }) => {
  const before = await page.evaluate(() => ({
    state: JSON.stringify(state),
    order: [...document.querySelectorAll('.item-name')].map((e) => e.textContent),
    flags: [...document.querySelectorAll('.item-flag')].map((e) => e.textContent),
  }));

  await page.evaluate(() => {
    writeSubs('ntmb', 'Early Forsythia', [{ sp: 'Vanhoutte Spirea', qty: 20, note: '' }]);
    writeSubs('ntmb', 'Quaking Aspen', [{ sp: 'Paper Birch', qty: 9, note: '' }]);
    renderAll();
  });

  const after = await page.evaluate(() => ({
    state: JSON.stringify(state),
    order: [...document.querySelectorAll('.item-name')].map((e) => e.textContent),
    flags: [...document.querySelectorAll('.item-flag')].map((e) => e.textContent),
  }));

  expect(after.state, 'no count changes').toBe(before.state);
  expect(after.flags, 'Forsythia still reads NONE YET · 20, not covered').toEqual(before.flags);
  expect(after.order).toEqual(before.order);
});

test('a save from an old Wolf install does not wipe the subs', async ({ page }) => {
  // The old app's payload has no idea subs exist. It does carry `notes` through
  // whole, which is exactly why subs are stored there.
  const survived = await page.evaluate(() => {
    writeSubs('ntmb', 'Early Forsythia', [{ sp: 'Vanhoutte Spirea', qty: 12, note: '' }]);
    const fromGroundwork = JSON.parse(JSON.stringify(payload()));

    // What an old install sends back after somebody taps a count: the fields it
    // knows, notes copied through, and nothing else.
    const oldApp = {
      counts: Object.assign({}, fromGroundwork.counts, { 'h2s:rugosa-rose': 5 }),
      notes: fromGroundwork.notes,
      staked: {}, planted: {}, measured: {}, owed: {},
      updatedAt: new Date(Date.now() + 1000).toISOString(),
    };
    applyPayload(oldApp);
    return readSubs('ntmb', 'Early Forsythia');
  });

  expect(survived).toEqual([{ sp: 'Vanhoutte Spirea', qty: 12, note: '' }]);
});

test('a sync repaint keeps the panel open and the half-typed note', async ({ page }) => {
  const row = page.locator(rowFor('Early Forsythia'));
  await row.locator('.subs-btn').click();
  await row.locator('.subs-add').click();
  await row.locator('.sub-line select').selectOption('Vanhoutte Spirea');
  const note = row.locator('.sub-note');
  await note.click();
  await page.keyboard.type('waiting on Ch');

  // What onSnapshot does when another phone saves.
  await page.evaluate(() => { applyPayload(JSON.parse(JSON.stringify(payload()))); renderAll(); });

  const fresh = page.locator(rowFor('Early Forsythia'));
  await expect(fresh.locator('.subs-panel'), 'the panel is still open').toBeVisible();
  await expect(fresh.locator('.sub-note')).toHaveValue('waiting on Ch');
  await page.keyboard.type('ris');
  await expect(fresh.locator('.sub-note'), 'and the cursor is still in it').toHaveValue('waiting on Chris');
});

test('the status report lists the options under their species', async ({ page }) => {
  const text = await page.evaluate(() => {
    writeSubs('ntmb', 'Early Forsythia', [
      { sp: 'Vanhoutte Spirea', qty: 12, note: 'Chris ok' },
      { sp: 'Pink Beauty Potentilla', qty: null, note: '' },
    ]);
    return generateReport();
  });
  expect(text).toContain('sub option: Vanhoutte Spirea x 12 -- Chris ok');
  expect(text).toContain('sub option: Pink Beauty Potentilla (qty open)');
});
