// Wolf Checklist tests.
//
// These load index.html over file:// and drive its counting logic directly.
// Run with: npm test

const { defineConfig } = require('@playwright/test');

module.exports = defineConfig({
  testDir: './tests',
  // Two runners share this folder: Playwright owns *.spec.js, node --test owns
  // *.test.js (the pure logic, which needs no browser). Playwright's default
  // match includes *.test.js, and it does not fail on one -- it loads the file,
  // finds none of its own tests, and contributes zero. So the node tests would
  // quietly never run. `npm test` runs both.
  testMatch: '**/*.spec.js',
  // The counting is deterministic. A retry would only hide a real failure.
  retries: 0,
  reporter: [['list']],
  use: {
    browserName: 'chromium',
    headless: true,
  },
});
