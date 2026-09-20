// Wolf Checklist tests.
//
// These load index.html over file:// and drive its counting logic directly.
// Run with: npm test

const { defineConfig } = require('@playwright/test');

module.exports = defineConfig({
  testDir: './tests',
  // The counting is deterministic. A retry would only hide a real failure.
  retries: 0,
  reporter: [['list']],
  use: {
    browserName: 'chromium',
    headless: true,
  },
});
