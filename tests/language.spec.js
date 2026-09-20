// The EN/ES toggle.
//
// It used to be built into the bed view's jump bar, which meant it did not
// exist at all unless you were in that view and had scrolled to it. It now
// lives in the sticky header. The thing worth pinning is that it works from
// EITHER view -- that is the whole reason it moved.

const { test, expect } = require('@playwright/test');
const { loadApp } = require('./helpers');

test.beforeEach(async ({ page }) => { await loadApp(page); });

test('the toggle is in the header, not buried in the bed view', async ({ page }) => {
  const where = await page.evaluate(() => ({
    inHeader: !!document.querySelector('header #langWrap .lang-btn'),
    inJumpBar: document.querySelectorAll('.jump-bar .lang-btn').length,
  }));

  expect(where.inHeader, 'the EN/ES buttons must sit in the sticky header').toBe(true);
  expect(where.inJumpBar, 'and must not be duplicated back into the jump bar').toBe(0);
});

test('switching to Spanish from the species view still translates the beds', async ({ page }) => {
  // The case the old placement could not do at all: the button did not exist
  // outside the bed view, so there was nothing to press from here.
  const result = await page.evaluate(() => {
    const press = (l) =>
      document.querySelector('#langWrap .lang-btn[data-lang="' + l + '"]').click();

    currentJob = 'wsrcc'; applyJobData(); view = 'species'; renderAll();
    press('es');
    const langAfterPress = lang;

    currentJob = 'h2s'; applyJobData(); view = 'zones'; renderAll();
    const spanish = [...document.querySelectorAll('.ss-head, .zone-place')]
      .slice(0, 2).map((e) => e.textContent.trim());

    press('en');
    const english = [...document.querySelectorAll('.ss-head, .zone-place')]
      .slice(0, 2).map((e) => e.textContent.trim());

    // The press above is the ONLY thing that ran -- no renderAll() of our own.
    // Without this the test re-renders by hand and so cannot tell whether
    // setLang repaints anything at all.
    const beforePress = [...document.querySelectorAll('.ss-head, .zone-place')]
      .slice(0, 2).map((e) => e.textContent.trim());
    press('es');
    const afterPress = [...document.querySelectorAll('.ss-head, .zone-place')]
      .slice(0, 2).map((e) => e.textContent.trim());
    press('en');

    return {
      langAfterPress, spanish, english,
      repaintedItself: JSON.stringify(beforePress) !== JSON.stringify(afterPress),
    };
  });

  expect(result.langAfterPress, 'pressing ES from the species view must take').toBe('es');
  expect(result.repaintedItself, [
    'pressing ES while the bed view was open did not change the text on screen.',
    'setLang has to re-render the view that is actually open -- it used to call',
    'renderBeds() only, which was fine when the button lived in the bed view.',
  ].join(' ')).toBe(true);
  expect(
    result.spanish,
    `bed text stayed as ${JSON.stringify(result.spanish)} -- the language was set ` +
    `from the species view but the bed cards never got translated.`
  ).not.toEqual(result.english);
  expect(result.english.join(' ')).toMatch(/Marking out|corner|side/);
});

test('the active language is shown on the button', async ({ page }) => {
  const state = await page.evaluate(() => {
    const btn = (l) => document.querySelector('#langWrap .lang-btn[data-lang="' + l + '"]');
    btn('es').click();
    const es = { es: btn('es').className, en: btn('en').className,
                 pressed: btn('es').getAttribute('aria-pressed') };
    btn('en').click();
    const en = { es: btn('es').className, en: btn('en').className,
                 pressed: btn('en').getAttribute('aria-pressed') };
    return { es, en };
  });

  expect(state.es.es).toContain('on');
  expect(state.es.en).not.toContain('on');
  expect(state.es.pressed).toBe('true');
  expect(state.en.en).toContain('on');
  expect(state.en.es).not.toContain('on');
});
