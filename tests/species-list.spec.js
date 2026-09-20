// The species list -- what gets read off the office TV.
//
// Two things have to hold, and neither is about taste:
//
//   1. The colour has to rank by urgency. It used to run backwards: "nothing
//      received" and "short" were plain white rows while "complete" and "over"
//      were the only tinted ones, so the rows that needed somebody to act were
//      the least visible on the screen.
//   2. The worst rows have to be at the top. In plan order the shortages were
//      scattered through the list and somebody had to narrate which mattered.

const { test, expect } = require('@playwright/test');
const { loadApp, resetCounts } = require('./helpers');

test.beforeEach(async ({ page }) => {
  await loadApp(page);
  await resetCounts(page);
});

test('urgency ranks nothing-received worst and complete best', async ({ page }) => {
  const ranks = await page.evaluate(() => ({
    nothingReceived: itemRank(0, 10),
    short: itemRank(4, 10),
    over: itemRank(12, 10),
    complete: itemRank(10, 10),
  }));

  expect(ranks.nothingReceived).toBeLessThan(ranks.short);
  expect(ranks.short).toBeLessThan(ranks.over);
  expect(ranks.over).toBeLessThan(ranks.complete);
});

test('every state carries a class, including nothing-received', async ({ page }) => {
  const classes = await page.evaluate(() => ({
    nothingReceived: itemClass(0, 10),
    short: itemClass(4, 10),
    over: itemClass(12, 10),
    complete: itemClass(10, 10),
  }));

  expect(
    classes.nothingReceived,
    'nothing-received used to return a bare "item" with no modifier, which is ' +
    'why it could not be given a colour'
  ).toBe('item none');
  expect(classes.short).toBe('item partial');
  expect(classes.over).toBe('item over');
  expect(classes.complete).toBe('item complete');
});

// Seed a deliberate MIX of states across each group, in plan order, so the
// sort has something to actually do.
//
// Without this every count is zero, every row is "nothing received", and any
// order whatsoever is trivially "sorted" -- the test passes while proving
// nothing. That is how the first version of this file went green against a
// list that had not been sorted at all.
const SEED_MIX = `
  currentJob = 'wsrcc';
  applyJobData();
  Object.keys(JOBS.wsrcc.groups).forEach(function(gk){
    JOBS.wsrcc.groups[gk].items.forEach(function(row, i){
      var target = row[1];
      var v = [0, Math.max(1, Math.floor(target * 0.1)), target, target + 5,
               Math.max(1, Math.floor(target * 0.6))][i % 5];
      state['wsrcc:' + slug(row[0])] = v;
    });
  });
  view = 'species';
  renderAll();
`;

test('the list leads with the biggest number outstanding', async ({ page }) => {
  const groups = await page.evaluate((seed) => {
    // eslint-disable-next-line no-eval
    eval(seed);

    const states = [...document.querySelectorAll('.item')]
      .map((el) => el.className.replace('item', '').trim() || 'none');
    if (new Set(states).size < 3) {
      throw new Error(
        'the seed produced only ' + [...new Set(states)].join('/') +
        ' -- with one state the sort cannot be tested at all'
      );
    }

    return [...document.querySelectorAll('section.group')].map((section) => ({
      rows: [...section.querySelectorAll('.item')].map((el) => {
        const cls = el.className.replace('item', '').trim() || 'none';
        const flag = el.querySelector('.item-flag');
        const txt = flag ? flag.textContent : '';
        const short = /SHORT (\d+)/.exec(txt);
        const none = /NONE YET \D*(\d+)/.exec(txt);
        // A row with nothing received is short by the whole target, and the
        // sort treats it that way -- so the test has to as well.
        return { state: cls, short: short ? Number(short[1]) : (none ? Number(none[1]) : 0) };
      }),
    }));
  }, SEED_MIX);

  for (const g of groups) {
    // Biggest shortfall first, whatever state it is in. A species with none
    // yet does NOT jump above one that is short by more -- status.html has
    // always ranked by size and the two surfaces have to agree.
    const shortfalls = g.rows.map((r) => r.short);
    expect(
      shortfalls,
      `rows came out as ${JSON.stringify(g.rows)}. The biggest number ` +
      `outstanding has to lead, or somebody has to narrate the list.`
    ).toEqual([...shortfalls].sort((a, b) => b - a));

    // Everything still outstanding sits above everything that is not.
    const lastOutstanding = shortfalls.lastIndexOf(
      shortfalls.filter((s) => s > 0).slice(-1)[0]
    );
    const settled = g.rows.slice(lastOutstanding + 1).map((r) => r.state);
    expect(
      settled.every((s) => s === 'over' || s === 'complete'),
      `rows after the last outstanding one were ${JSON.stringify(settled)} -- ` +
      `only spare and finished rows belong down there`
    ).toBe(true);
  }
});

test('the flag says the number so nobody has to subtract', async ({ page }) => {
  const flags = await page.evaluate((seed) => {
    // eslint-disable-next-line no-eval
    eval(seed);
    const out = {};
    document.querySelectorAll('.item').forEach((el) => {
      const cls = el.className.replace('item', '').trim() || 'none';
      const flag = el.querySelector('.item-flag');
      if (!(cls in out)) out[cls] = flag ? flag.textContent : null;
    });
    return out;
  }, SEED_MIX);

  // All four states must actually be present, or this test is checking air.
  ['none', 'partial', 'over', 'complete'].forEach((s) => {
    expect(s in flags, `no "${s}" row was rendered, so its flag was never checked`).toBe(true);
  });

  expect(flags.partial).toMatch(/^SHORT \d+$/);
  expect(flags.none).toMatch(/^NONE YET/);
  expect(flags.over).toMatch(/SPARE$/);
  expect(flags.complete, 'a finished row needs no flag').toBe('');
});

test('counting a species up changes its state without re-sorting under you', async ({ page }) => {
  // The colour and the number must track every tap. The ORDER must not --
  // re-sorting mid-count would slide the row out from under a finger.
  const result = await page.evaluate(() => {
    currentJob = 'wsrcc';
    applyJobData();
    view = 'species';
    renderAll();

    const rowsBefore = [...document.querySelectorAll('.item-name')].map((n) => n.textContent);
    const el = document.querySelector('.item.none');
    const name = el.querySelector('.item-name').textContent;
    const before = { state: el.className, flag: el.querySelector('.item-flag').textContent };

    // By intent, not by position. The counter gained a Pull button after this
    // test was written, which made button:last-child the wrong control -- it
    // opened the pull sheet instead of adding one, and the test failed with a
    // confusing message about the row's state.
    const plus = el.querySelector('.counter button[aria-label^="increase"]');
    if (!plus) throw new Error('no increase button on the row -- the counter markup has changed');
    plus.click();

    const after = { state: el.className, flag: el.querySelector('.item-flag').textContent };
    const rowsAfter = [...document.querySelectorAll('.item-name')].map((n) => n.textContent);
    return { name, before, after, orderHeld: JSON.stringify(rowsBefore) === JSON.stringify(rowsAfter) };
  });

  expect(result.before.state).toContain('none');
  expect(result.after.state, `${result.name} took a count so it is no longer "nothing received"`)
    .toContain('partial');
  expect(result.after.flag).toMatch(/^SHORT \d+$/);
  expect(result.orderHeld, 'the list must not re-sort while somebody is counting').toBe(true);
});
