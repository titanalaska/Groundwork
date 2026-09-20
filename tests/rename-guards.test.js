const { test } = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..');
const html = () => fs.readFileSync(path.join(root, 'index.html'), 'utf8');
const sw = () => fs.readFileSync(path.join(root, 'sw.js'), 'utf8');

// These names are load-bearing. localStorage and the Cache API are scoped to
// the ORIGIN, and titanalaska.github.io is shared by all three apps -- so
// /Groundwork/ inherits every one of these for free. Renaming does not move a
// value, it abandons it.

test('the shared doc path is untouched', () => {
  assert.ok(html().includes('var DOC_PATH = "checklist/wolf";'),
    'DOC_PATH is the shared-state key on the sync backend. Changing it orphans ' +
    'every user\'s shared checklist state.');
});

test('the local storage key is untouched', () => {
  assert.ok(html().includes('var LOCAL_KEY = "wolf-field-checklist-v1";'),
    'renaming this makes every saved count read as zero');
});

test('the inventory credential keys are untouched', () => {
  const h = html();
  assert.ok(h.includes('wolf-inv-token'), 'the pull feature signs in with this');
  assert.ok(h.includes('wolf-inv-profile'));
});

test('the sync key name is untouched', () => {
  assert.ok(html().includes('wolf-sync-key'),
    'renaming this silently un-shares every phone');
});

test('the bed image cache is untouched', () => {
  assert.ok(sw().includes("const BED_CACHE = 'wolf-beds-v2';"),
    'renaming this re-downloads ~27MB of bed crops over cell data');
});
