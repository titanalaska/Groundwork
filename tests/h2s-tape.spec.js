// Tape it out for Home2 Suites (9/30), off the VECTOR L102 found on the Trello
// card. Numbers a crew stakes from, so they are checked against the plan worked
// by hand -- never against whatever the table happens to say.
//
// Scale: 3.6 pt = 1 ft (drawn bar, 60 ft = 216.0 pt; and 1" = 20' on Corvus's
// 42x30 title block). Plan coordinates, upright sheet frame, from the CAD
// insertion point of each symbol:
//   B01 Helena Maple trunks  x 878.7, 950.7, 1022.7, 1094.7, 1166.7, 1238.7, 1310.7
//     -> every step 72.0 pt / 3.6 = 20.0 ft (20' 0" on centre)
//   B10 Swedish Aspen trunks y 844.5, 887.7, 930.9 (x 1281.0 for all three)
//     -> every step 43.2 pt / 3.6 = 12.0 ft (12' 0" on centre)
//   Birchleaf: 63 drawn = the schedule's 63; 58 called out. The 5 without a
//   callout: 2 in the NW corner bed (B03), 1 by B28, 2 on the south frontage.

const { test, expect } = require('@playwright/test');
const { loadApp, openJob } = require('./helpers');

test.beforeEach(async ({ page }) => {
  await loadApp(page);
  await openJob(page, 'h2s');
});

// Every tree and shrub species except Miss Kim, which is held (below).
const STAKED = ['AGN', 'AP', 'BP', 'MSB', 'PT', 'PTE', 'CS', 'JH', 'JS', 'RSA', 'SBG', 'SBT', 'SV'];

test('every staked plant on a Home2 card has exactly one tape row', async ({ page }) => {
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

test('B01: seven maples 20\' 0" apart, all on one side of the curb', async ({ page }) => {
  const r = await page.evaluate(() => {
    const rows = BED_STAKES.beds.B01.rows;
    return {
      n: rows.length,
      gaps: rows.slice(1).map((x, i) => x.along - rows[i].along),
      sides: [...new Set(rows.map((x) => x.sideText))],
      edge: BED_STAKES.beds.B01.edge,
    };
  });
  expect(r.n).toBe(7);
  r.gaps.forEach((g) => expect(Math.abs(g - 20.0)).toBeLessThan(0.05));
  expect(r.sides).toHaveLength(1);
  expect(r.edge).toBe('curb');
});

test('B10: three aspen 12\' 0" apart, off the building wall', async ({ page }) => {
  const r = await page.evaluate(() => {
    const pte = BED_STAKES.beds.B10.rows.filter((x) => x.code === 'PTE');
    return { gaps: pte.slice(1).map((x, i) => x.along - pte[i].along), edge: BED_STAKES.beds.B10.edge };
  });
  expect(r.edge).toBe('building wall');
  expect(r.gaps.map((g) => Math.round(g * 10) / 10)).toEqual([12.0, 12.0]);
});

test('the 5 Birchleaf drawn with no callout are listed and flagged', async ({ page }) => {
  const r = await page.evaluate(() => {
    const all = Object.values(BED_STAKES.extra).flat();
    return { n: all.length, codes: [...new Set(all.map((x) => x.code))], b03: (BED_STAKES.extra.B03 || []).length,
             flagged: all.every((x) => /NO callout/.test(x.note)) };
  });
  expect(r).toEqual({ n: 5, codes: ['SBT'], b03: 2, flagged: true });
});

test('Miss Kim gets no distances, and its beds say why', async ({ page }) => {
  const spa = await page.evaluate(() => Object.values(BED_STAKES.beds)
    .flatMap((st) => st.rows).filter((x) => x.code === 'SPA').length);
  expect(spa).toBe(0);
  await page.evaluate(() => { view = 'zones'; renderAll(); });
  // B03 carries 5 SPA on its card
  await expect(page.locator('#bed-B03')).toContainText('Miss Kim Lilac (SPA) is not listed');
});

test('the card says which edge the tape runs along', async ({ page }) => {
  await page.evaluate(() => { view = 'zones'; renderAll(); });
  await expect(page.locator('#bed-B01 .tape-row')).toHaveCount(7);
  await expect(page.locator('#bed-B01 .tape-row').first()).toContainText('of the curb');
  await expect(page.locator('#bed-B01')).toContainText('face or back of curb');
  await expect(page.locator('#bed-B10')).toContainText('along the building wall and square off it');
  await expect(page.locator('#bed-B10 .tape-row').first()).toContainText('of the building wall');
});

test('WSRCC keeps its fence wording', async ({ page }) => {
  await openJob(page, 'wsrcc');
  await page.evaluate(() => { view = 'zones'; renderAll(); });
  await expect(page.locator('#bed-B31')).toContainText('along the fence line and square off it');
  await expect(page.locator('#bed-B31 .tape-row').first()).toContainText('inside the fence');
});

test('Spanish: the zero, the side and the footer all translate', async ({ page }) => {
  await page.evaluate(() => { setLang('es'); view = 'zones'; renderAll(); });
  const card = page.locator('#bed-B01');
  // B01's zero is the east end of the curb that runs east-west
  await expect(card).toContainText('Extremo este del bordillo junto a esta cama (va de este a oeste)');
  await expect(card.locator('.tape-row').first()).toContainText('del bordillo');
  await expect(card).toContainText('a lo largo del bordillo y en escuadra');
  await expect(card).not.toContainText('of the curb');
  await expect(page.locator('#bed-B10')).toContainText('de la pared del edificio');
});

// WHICH SIDE, worked by hand off the drawing (sheet y grows SOUTH). This is the
// test that was missing: on 9/30 every side word came out mirrored -- right
// distance, wrong side of the curb -- and the "all on one side" check could not
// see it.
//   B01: curb line at y 535.28, first maple at y 515.28 -> the tree is 20.0 pt
//        = 5.56 ft NORTH of the curb (5' 7").
//   B10: wall line at x 1266.05, first aspen at x 1281.0 -> 14.95 pt = 4.15 ft
//        EAST of the wall (4' 2").
test('which side: B01 maples north of the curb, B10 aspen east of the wall', async ({ page }) => {
  const r = await page.evaluate(() => ({
    b01: BED_STAKES.beds.B01.rows[0], b10: BED_STAKES.beds.B10.rows.find((x) => x.code === 'PTE'),
  }));
  expect(r.b01.sideText).toBe('north of the curb');
  expect(feetInStr(r.b01.off)).toBe("5' 7\"");
  expect(r.b10.sideText).toBe('east of the building wall');
  expect(feetInStr(r.b10.off)).toBe("4' 2\"");
});

function feetInStr(ft) { const i = Math.round(ft * 12); return Math.floor(i / 12) + "' " + (i % 12) + '"'; }

// Boulders off L101 (1" = 30'), mapped onto L102 by the building outline at
// exactly 1.5x. L101 draws 18 "a" + 27 "b" = 45; Chris's email says 18 + 28.
test('Home2 boulders: all 45 drawn are on a card, A 18 and B 27', async ({ page }) => {
  const n = await page.evaluate(() => {
    const rows = Object.values(BED_BOULDERS.beds).flat()
      .concat(Object.values(BED_BOULDERS.own).flatMap((o) => o.rows));
    return { A: rows.filter((x) => x.code === 'BLDR-A').length, B: rows.filter((x) => x.code === 'BLDR-B').length };
  });
  expect(n).toEqual({ A: 18, B: 27 });
});

test('boulders show on the card, and B16 (grass only) gets its own zero', async ({ page }) => {
  await page.evaluate(() => { view = 'zones'; renderAll(); });
  await expect(page.locator('#bed-B38 .tape-row', { hasText: 'Type A Boulder' })).toHaveCount(3);
  await expect(page.locator('#bed-B38')).toContainText('Boulders off the same zero');
  await expect(page.locator('#bed-B16 .tape-row', { hasText: 'Boulder' })).toHaveCount(2);
  await expect(page.locator('#bed-B16')).toContainText('Boulders — zero:');
});

test('WSRCC has no Home2 boulders', async ({ page }) => {
  await openJob(page, 'wsrcc');
  await page.evaluate(() => { view = 'zones'; renderAll(); });
  await expect(page.locator('.tape-row', { hasText: 'Boulder' })).toHaveCount(0);
});

test('Spanish: boulder rows translate', async ({ page }) => {
  await page.evaluate(() => { setLang('es'); view = 'zones'; renderAll(); });
  await expect(page.locator('#bed-B38 .tape-row', { hasText: 'Roca tipo A' })).toHaveCount(3);
  await expect(page.locator('#bed-B38')).toContainText('al centro de la roca');
  await expect(page.locator('#bed-B38')).toContainText('desde el mismo cero');
  await expect(page.locator('#bed-B16')).toContainText('Rocas — cero:');
  await expect(page.locator('#bed-B38')).not.toContainText('Type A Boulder');
});
