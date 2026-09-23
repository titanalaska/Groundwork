// vendorLines() -- the text under a species in the Subs panel and on
// status.html. Expected lines are written out from the fixture, which is
// shaped like the real vendors.js (Martin's Paper Birch, McKay's two aspen
// products, Stewart's unpriced sizes).
const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const SRC = fs.readFileSync(path.join(__dirname, '..', process.env.VIEW_JS || 'vendors-view.js'), 'utf8');

// Arrays built inside the vm belong to another realm, and deepStrictEqual
// rejects them on prototype alone. Hand back plain copies so the comparison
// is about the text.
function load(VENDORS) {
  const ctx = { VENDORS };
  vm.createContext(ctx);
  vm.runInContext(SRC, ctx);
  const plain = (x) => (x == null ? x : JSON.parse(JSON.stringify(x)));
  return {
    vendorPrice: ctx.vendorPrice,
    vendorLines: (slug, name) => plain(ctx.vendorLines(slug, name)),
  };
}

const FIX = {
  lists: {
    seedntree: { label: "Seed 'n' Tree", dated: "2026 list, rec'd 7/1/26" },
    bron: { label: 'Bron & Sons', dated: '2027 booking form' },
    mckay: { label: 'McKay', dated: 'list of 7/20/26' },
    stewart: { label: 'Stewart Bros', dated: '2025-26 availability, no prices' },
  },
  species: {
    'paper-birch': { mapped: true, offers: {
      // Deliberately out of lists order: the LISTS order must win.
      stewart: [{ as: 'Paper Birch', forms: [['#15', null]] },
                { as: 'Paper Birch Clump', forms: [['1"', null]] }],
      seedntree: [{ as: 'Alaska paper birch', forms: [['1.5"', 175], ['2"', 238]] }],
      mckay: null,
    } },
    'colorado-green-spruce': { mapped: true, offers: {
      seedntree: [{ as: 'Colorado green spruce. Idaho, Specimen trees', forms: [["7'-8'", 1128]] }],
    } },
    'early-forsythia': { mapped: false },
    'late-lilac': { mapped: true, offers: {} },
  },
};

test('one line per product, in lists order, each ending with its date', () => {
  assert.deepStrictEqual(load(FIX).vendorLines('paper-birch', 'Paper Birch'), [
    'Seed \'n\' Tree as "Alaska paper birch": 1.5" $175 · 2" $238 (2026 list, rec\'d 7/1/26)',
    'McKay: not on list (list of 7/20/26)',
    'Stewart Bros: #15 (2025-26 availability, no prices)',
    'Stewart Bros as "Paper Birch Clump": 1" (2025-26 availability, no prices)',
  ]);
});

test('a vendor that was never read for the species gets no line at all', () => {
  const lines = load(FIX).vendorLines('paper-birch', 'Paper Birch');
  assert.ok(!lines.some((l) => l.indexOf('Bron') === 0), 'Bron was not read for this fixture row');
});

test('the vendor name is not repeated when it matches the plan name', () => {
  const lines = load(FIX).vendorLines('paper-birch', 'Paper Birch');
  assert.strictEqual(lines[2], 'Stewart Bros: #15 (2025-26 availability, no prices)');
});

test('thousands get a comma, cents only when there are cents', () => {
  const ctx = load(FIX);
  assert.strictEqual(ctx.vendorPrice(1128), ' $1,128');
  assert.strictEqual(ctx.vendorPrice(23.79), ' $23.79');
  assert.strictEqual(ctx.vendorPrice(22.5), ' $22.50');
  assert.strictEqual(ctx.vendorPrice(null), '');
  assert.deepStrictEqual(ctx.vendorLines('colorado-green-spruce', 'Colorado Green Spruce'),
    ['Seed \'n\' Tree as "Colorado green spruce. Idaho, Specimen trees": 7\'-8\' $1,128 (2026 list, rec\'d 7/1/26)']);
});

test('an unmapped species says so, and so does one not in the file', () => {
  const NM = ['Not mapped yet — no vendor list has been matched to this species.'];
  assert.deepStrictEqual(load(FIX).vendorLines('early-forsythia', 'Early Forsythia'), NM);
  assert.deepStrictEqual(load(FIX).vendorLines('no-such-plant', 'X'), NM);
});

test('mapped with no list read says that, not "not on list"', () => {
  assert.deepStrictEqual(load(FIX).vendorLines('late-lilac', 'Late Lilac'),
    ['No vendor list has been read for this species yet.']);
});

test('null when vendors.js did not load', () => {
  assert.strictEqual(load(undefined).vendorLines('paper-birch', 'Paper Birch'), null);
});

test('the source is ASCII', () => {
  assert.ok(/^[\x00-\x7F]*$/.test(SRC), 'status.html declares no charset');
});
