// What a person reads must say Groundwork. What the machine reads must not
// change -- see tests/rename-guards.test.js.
const { test, expect } = require('@playwright/test');
const { loadApp } = require('./helpers');

test('the app calls itself Groundwork on screen', async ({ page }) => {
  await loadApp(page);
  const seen = await page.evaluate(() => ({
    title: document.title,
    heading: document.querySelector('h1').textContent.trim(),
    appleTitle: (document.querySelector('meta[name="apple-mobile-web-app-title"]') || {}).content,
  }));

  expect(seen.title).toBe('Groundwork');
  expect(seen.heading).toBe('Groundwork');
  expect(seen.appleTitle).toBe('Groundwork');
});

test('no user-facing text still says Wolf Architect Jobs', async ({ page }) => {
  await loadApp(page);
  const body = await page.evaluate(() => document.body.innerText);
  expect(
    body.includes('Wolf Architect Jobs'),
    'the old name is still on screen somewhere'
  ).toBe(false);
});
