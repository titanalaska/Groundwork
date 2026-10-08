// The Share button in the header (Matt, 10/7/26): hands the permanent install
// link to the phone's share sheet so one crew member can send the app to
// another. The link is a constant -- the live Pages address -- never the page's
// own address, so a laptop preview or an old Wolf install can never hand out
// the wrong one. Desktop browsers have no share sheet: the link goes to the
// clipboard and the save line says so.

const { test, expect } = require('@playwright/test');
const { loadApp } = require('./helpers');

const INSTALL = 'https://titanalaska.github.io/Groundwork/';

test.beforeEach(async ({ page }) => {
  await loadApp(page);
});

test('the Share button sits in the language group, after EN and ES', async ({ page }) => {
  const btn = page.locator('#langWrap #shareBtn');
  await expect(btn).toBeVisible();
  await expect(btn).toHaveText('Share');
  const order = await page.evaluate(() =>
    Array.from(document.querySelectorAll('#langWrap button')).map((b) => b.id || b.dataset.lang));
  expect(order).toEqual(['en', 'es', 'shareBtn']);
});

test('tapping it opens the share sheet with the install link, not this page\'s address', async ({ page }) => {
  await page.evaluate(() => {
    window.__shared = null;
    Object.defineProperty(navigator, 'share', { configurable: true, value: (d) => { window.__shared = d; return Promise.resolve(); } });
  });
  await page.click('#shareBtn');
  const shared = await page.evaluate(() => window.__shared);
  expect(shared.url).toBe(INSTALL);
  expect(shared.title).toBe('Groundwork');
  expect(shared.url).not.toContain('file:');
});

test('without a share sheet it copies the link and says so', async ({ page }) => {
  await page.evaluate(() => {
    window.__copied = null;
    Object.defineProperty(navigator, 'share', { configurable: true, value: undefined });
    Object.defineProperty(navigator, 'clipboard', { configurable: true, value: { writeText: (t) => { window.__copied = t; return Promise.resolve(); } } });
  });
  await page.click('#shareBtn');
  expect(await page.evaluate(() => window.__copied)).toBe(INSTALL);
  const note = page.locator('#saveNote');
  await expect(note).toBeVisible();
  await expect(note).toContainText('Link copied');
});

test('in Spanish the button reads Compartir', async ({ page }) => {
  await page.evaluate(() => { lang = 'es'; renderAll(); });
  await expect(page.locator('#shareBtn')).toHaveText('Compartir');
});
