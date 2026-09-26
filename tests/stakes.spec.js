// Tape it out: distances to stake every WSRCC tree and lilac (9/25).
//
// These are numbers a crew stakes from, so the tests check them against the
// plan, worked on paper -- never against what the table happens to say.
//
// Scale: the drawn bar, 60 ft = 216.0 pt, so 3.6 pt = 1 ft. Checked against
// the parking layout: stalls stripe at 32.4 pt = 9 ft.
//
// Plan coordinates used below (points, off WSRCC Landscape Plans.pdf L102):
//   SW fence corner post        x 670.5
//   first south-row lilac       x 761.58
//     -> (761.58 - 670.5) / 3.6 = 25.30 ft = 303.6 in -> 25' 4"
//   west edge of the walkway    x 1800.5
//   first spruce west of it     x 1778.9 (trunk cross)
//     -> 21.6 / 3.6 = 6.00 ft -> 6' 0"
//   south-row lilacs are 72 pt apart = 20 ft exactly.

const { test, expect } = require('@playwright/test');
const { loadApp, openJob } = require('./helpers');

test.beforeEach(async ({ page }) => {
  await loadApp(page);
  await openJob(page, 'wsrcc');
});

const STAKED = ['PS', 'PP', 'BP', 'AP', 'SP', 'PT'];

test('every tree and lilac on a card has exactly one tape row', async ({ page }) => {
  // The table and the card are built separately. If they disagree, a crew
  // either has a tree with no distance or a distance with no tree.
  const bad = await page.evaluate((codes) => {
    const out = [];
    BEDS.forEach((b) => {
      const st = BED_STAKES.beds[b.bed];
      codes.forEach((c) => {
        const want = b.items[c] || 0;
        const got = st ? st.rows.filter((r) => r.code === c).length : 0;
        if (want !== got) out.push(`${b.bed} ${c}: card ${want}, table ${got}`);
      });
    });
    return out;
  }, STAKED);
  expect(bad).toEqual([]);
});

test('south row: first lilac is 25\' 4" east of the SW corner post', async ({ page }) => {
  const r = await page.evaluate(() => {
    const st = BED_STAKES.beds.B31;
    return { ref: st.ref, first: feetIn(st.rows[0].along), dir: st.rows[0].dir,
             gap: st.rows[1].along - st.rows[0].along, side: st.rows[0].side };
  });
  expect(r.ref).toBe('SW fence corner post');
  expect(r.first).toBe('25′ 4″');
  expect(r.dir).toBe('east');
  expect(r.gap).toBeCloseTo(20, 1);           // 72 pt on centre
  expect(r.side).toBe('site');
});

test('bed 5: first spruce is 6\' 0" west of the walkway, inside the fence', async ({ page }) => {
  const r = await page.evaluate(() => {
    const st = BED_STAKES.beds.B05;
    const x = st.rows[0];
    return { ref: st.ref, code: x.code, d: feetIn(x.along), dir: x.dir, side: x.side };
  });
  expect(r).toEqual({ ref: 'west edge of the walkway', code: 'PP',
                      d: '6′ 0″', dir: 'west', side: 'site' });
});

test('the trees the fence angles away from are flagged OUTSIDE', async ({ page }) => {
  // Where the fence dips to cross the driveway, the pine nearest the drive on
  // each side ends up outside it: the east-most of bed 3's three, and the two
  // at bed 5's driveway end. A plain offset would call them "3 ft in".
  const out = await page.evaluate(() => {
    const pick = (bed) => BED_STAKES.beds[bed].rows
      .filter((r) => r.code === 'PS' && r.side === 'street').map((r) => !!r.note);
    return { b3: pick('B03'), b5: pick('B05') };
  });
  expect(out.b3).toEqual([true]);
  expect(out.b5).toEqual([true, true]);
});

test('Newel St trees are outside the fence; west and south rows inside', async ({ page }) => {
  const sides = await page.evaluate(() => {
    const s = (bed) => [...new Set(BED_STAKES.beds[bed].rows.map((r) => r.side))];
    return { b9: s('B09'), b12: s('B12'), b26: s('B26'), b7: s('B07'), b40: s('B40') };
  });
  expect(sides).toEqual({ b9: ['street'], b12: ['street'], b26: ['street'],
                          b7: ['site'], b40: ['site'] });
});

test('one zero per bed, and every row says which way to tape', async ({ page }) => {
  const bad = await page.evaluate(() => Object.entries(BED_STAKES.beds)
    .filter(([, st]) => !st.ref || st.rows.some((r) =>
      ['north', 'south', 'east', 'west'].indexOf(r.dir) === -1))
    .map(([b]) => b));
  expect(bad).toEqual([]);
});

test('the 72nd lilac, drawn with no callout, shows on bed 27', async ({ page }) => {
  await page.evaluate(() => { view = 'zones'; renderAll(); });
  const txt = await page.locator('#bed-B27').innerText();
  expect(txt).toContain('NO callout');
});

test('the table is on the card, and Home2Suites has none', async ({ page }) => {
  await page.evaluate(() => { view = 'zones'; renderAll(); });
  await expect(page.locator('#bed-B05 .tape-row')).toHaveCount(37);   // 13 PP + 6 PS + 18 SP
  // The words, not just the data: a swapped label stakes a tree on the wrong
  // side of a fence that is already built.
  await expect(page.locator('#bed-B09 .tape-row').first()).toContainText('outside the fence');
  await expect(page.locator('#bed-B31 .tape-row').first()).toContainText('inside the fence');
  await expect(page.locator('#bed-B31 .tape-row').first()).toContainText('25′ 4″');
  await openJob(page, 'h2s');
  await page.evaluate(() => { view = 'zones'; renderAll(); });
  await expect(page.locator('.tape-row')).toHaveCount(0);
});
