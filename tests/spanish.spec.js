// Spanish on every screen (9/23).
//
// The phrase pass is only safe because it never touches data. Species names
// are the storage keys -- slug(name) -- so the thing most worth pinning is
// that a count tapped on a Spanish screen still lands under the English slug.
// The rest guards the ways a translation fails quietly: a fresh install that
// starts in the wrong language, a message set after render that nobody
// translates, a vendor's own product name rewritten, a Spanish note shown
// without the English note it belongs with.

const { test, expect } = require('@playwright/test');
const { loadApp } = require('./helpers');

async function spanishFirst(page) {
  await page.addInitScript(() => { localStorage.setItem('wolf-lang', 'es'); });
}

test('a fresh install set to Spanish opens in Spanish, header and all', async ({ page }) => {
  // No saved counts on this phone. applyPayload() returns early in that case,
  // so the language has to be read on its own or the header stays English.
  await spanishFirst(page);
  await loadApp(page);
  const got = await page.evaluate(() => ({
    report: document.getElementById('reportBtn').textContent.trim(),
    esOn: document.querySelector('#langWrap .lang-btn[data-lang="es"]').classList.contains('on'),
    enOn: document.querySelector('#langWrap .lang-btn[data-lang="en"]').classList.contains('on'),
  }));
  expect(got.report).toBe('Exportar reporte de estado');
  expect(got.esOn, 'the ES button must show as the active one').toBe(true);
  expect(got.enOn).toBe(false);
});

test('a count tapped on the Spanish screen is stored under the English name', async ({ page }) => {
  await spanishFirst(page);
  await loadApp(page);
  const r = await page.evaluate(() => {
    currentJob = 'h2s'; applyJobData(); view = 'species'; renderAll();
    const before = state['h2s:paper-birch'] || 0;
    const row = [...document.querySelectorAll('#groups .item')]
      .find((el) => el.querySelector('.item-name').textContent.trim() === 'Abedul papirífera');
    if (!row) return { found: false };
    const plus = [...row.querySelectorAll('.counter button')].find((b) => b.textContent === '+');
    plus.click();
    return {
      found: true, before, after: state['h2s:paper-birch'],
      spanishKey: Object.keys(state).some((k) => /abedul/.test(k)),
    };
  });
  expect(r.found, 'the Paper Birch row should read in Spanish').toBe(true);
  expect(r.after, 'one tap is one more under h2s:paper-birch').toBe(r.before + 1);
  expect(r.spanishKey, 'nothing may ever be stored under a Spanish key').toBe(false);
});

test('switching back to English restores the header, which no render rebuilds', async ({ page }) => {
  await loadApp(page);
  const text = await page.evaluate(() => {
    const press = (l) => document.querySelector('#langWrap .lang-btn[data-lang="' + l + '"]').click();
    press('es');
    const es = document.getElementById('reportBtn').textContent.trim();
    press('en');
    return { es, en: document.getElementById('reportBtn').textContent.trim(),
             hint: document.querySelector('.share-hint').textContent.replace(/\s+/g, ' ').trim() };
  });
  expect(text.es).toBe('Exportar reporte de estado');
  expect(text.en).toBe('Export status report');
  expect(text.hint).toMatch(/^These two are safe to send\. Do not send this checklist/);
});

test('a message set after the screen is drawn still comes out in Spanish', async ({ page }) => {
  // Save notes, sheet steps and relabelled options are set by textContent long
  // after any render. The observer is what reaches them.
  await spanishFirst(page);
  await loadApp(page);
  await page.evaluate(() => setSaveNote('Counts loaded from this device.'));
  await expect(page.locator('#saveNote')).toHaveText('Conteos cargados de este teléfono.');
});

test('a vendor product name stays exactly as the vendor printed it', async ({ page }) => {
  await spanishFirst(page);
  await loadApp(page);
  const lines = await page.evaluate(async () => {
    currentJob = 'wsrcc'; applyJobData(); view = 'species'; renderAll();
    const row = [...document.querySelectorAll('#groups .item')]
      .find((el) => el.querySelector('.item-name').textContent.trim().startsWith('Álamo temblón columnar'));
    row.querySelector('.subs-btn').click();
    await new Promise((r) => setTimeout(r, 50));
    return [...row.querySelectorAll('.vendors div')].map((d) => d.textContent);
  });
  const bailey = lines.find((l) => l.startsWith('Bailey'));
  expect(bailey, 'the frame translates').toContain(' como "');
  // Translating inside the quotes would send somebody looking for a name that
  // is on no vendor's sheet.
  expect(bailey).toContain('"Populus tremula Columnar Swedish Aspen"');
});

test('Spanish notes show only while they line up one-to-one with the English', async ({ page }) => {
  await spanishFirst(page);
  await loadApp(page);
  const r = await page.evaluate(() => {
    currentJob = 'wsrcc'; applyJobData(); view = 'species'; renderAll();
    const matched = document.querySelector('#flagsSlot .flag-item').textContent;
    // An English note added without its Spanish.
    JOBS.wsrcc.flags = JOBS.wsrcc.flags.concat(['<strong>New English note.</strong>']);
    renderAll();
    const items = [...document.querySelectorAll('#flagsSlot .flag-item')].map((e) => e.textContent);
    return { matched, items };
  });
  expect(r.matched).toMatch(/El plano cambi/);
  expect(r.items.length).toBe(6);
  expect(r.items[5], 'the whole English set, not five Spanish and one missing').toMatch(/New English note/);
  expect(r.items[0]).toMatch(/The plan changed/);
});

test('the daily log box is Spanish, and the draft underneath stays English', async ({ page }) => {
  await spanishFirst(page);
  await loadApp(page);
  const r = await page.evaluate(() => {
    currentJob = 'h2s'; applyJobData();
    lastLogged = logSnapshot();
    state['h2s:paper-birch'] = (state['h2s:paper-birch'] || 0) + 2;
    document.getElementById('logBtn').click();
    return { box: document.getElementById('logText').value, draft: draftDailyLog().text };
  });
  expect(r.draft, 'draftDailyLog() is what the other tests read').toContain('Received on site:');
  expect(r.box).toContain('Recibido en el sitio:');
  expect(r.box).toContain('Abedul papirífera');
  expect(r.box).not.toContain('Received on site:');
});

test('longest phrase wins, and a short one never bites into a word', async ({ page }) => {
  await loadApp(page);
  const out = await page.evaluate(() => [
    translateString('Both crews, last'),
    translateString('Goodbye'),
    translateString('Gold Crinkled Hair Grass (sub)'),
    translateString('Karl Foerster Feather Reed Grass'),
    translateString('Hardy Purple Common Lilac (#2 sub)'),
  ]);
  expect(out).toEqual([
    'Ambas cuadrillas, al final',
    'Goodbye',                        // "Go" is a key; it must not eat "Goodbye"
    'Pasto ondulado dorado (sustituto)',
    "Pasto plumoso 'Karl Foerster'",
    'Lila común morada (sustituto #2)',
  ]);
});
