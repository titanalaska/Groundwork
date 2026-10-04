// Moose fence material, per Corvus "Moose Protection" detail (4/L501 on
// Home2Suites, the same detail on Charter's L5.1):
//   "Four posts required per tree."  "7'-0" between poles, typ."
//   10' steel T-post w/ spade, green.  4'-0" welded wire, 2"x4" mesh, PVC.
//   "two (2) metal ties per post."
// Charter adds detail 3, "Deciduous Tree Planting - Staked": (3) 2x2x6' wood
// stakes. Home2's tree detail shows no stakes (Jeremi flagged it, 10/2/26).
//
// Worked on paper. A cage is a 7' x 7' square, so 4 sides x 7' = 28 LF:
//   Home2   85 trees (28 + 22 + 15 + 8 + 3 + 9, every tree on L102 is deciduous)
//           posts 85 x 4 = 340   wire 85 x 28 = 2380   ties 340 x 2 = 680   stakes 0
//   Charter  8 trees (6 Paper Birch + 2 Parkland Pillar)
//           posts  8 x 4 =  32   wire  8 x 28 =  224   ties  32 x 2 =  64   stakes 8 x 3 = 24
// Jeremi's map package (10/2/26) prints the same eight numbers. Two readings
// agreeing is not proof on its own -- these are checked against the detail.

const { test } = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const ctx = {};
vm.createContext(ctx);
vm.runInContext(fs.readFileSync(path.join(__dirname, '..', 'jobs.js'), 'utf8'), ctx);

// An object made inside the vm has the vm's Object prototype, so
// deepStrictEqual fails it against a literal here even with identical fields.
// Copy it out first; the comparison is still field-by-field and strict.
const plain = (o) => ({ ...o });

test('only Home2Suites and Charter carry a moose fence', () => {
  const withFence = Object.keys(ctx.JOBS).filter((k) => ctx.JOBS[k].moose);
  assert.deepStrictEqual(withFence.sort(), ['charter', 'h2s']);
});

test('tree count comes off the job\'s own tree list', () => {
  assert.strictEqual(ctx.mooseTrees(ctx.JOBS.h2s), 85);
  assert.strictEqual(ctx.mooseTrees(ctx.JOBS.charter), 8);
});

test('Home2Suites material', () => {
  assert.deepStrictEqual(plain(ctx.mooseMaterials(85, 0)),
    { posts: 340, wireFt: 2380, ties: 680, stakes: 0 });
});

test('Charter material, with its 3 stakes per tree', () => {
  assert.deepStrictEqual(plain(ctx.mooseMaterials(8, 3)),
    { posts: 32, wireFt: 224, ties: 64, stakes: 24 });
});

// The two tests above hand the stake count in. This one reads it off each
// job, so a wrong `stakesPerTree` in jobs.js fails here -- the mutation
// check found that a 3 -> 2 on Charter passed every test above.
test('each job\'s own order, from its own data', () => {
  const order = (k) => plain(ctx.mooseMaterials(ctx.mooseTrees(ctx.JOBS[k]), ctx.JOBS[k].moose.stakesPerTree));
  assert.deepStrictEqual(order('h2s'), { posts: 340, wireFt: 2380, ties: 680, stakes: 0 });
  assert.deepStrictEqual(order('charter'), { posts: 32, wireFt: 224, ties: 64, stakes: 24 });
});

test('one tree is one cage: 4 posts, 28 LF, 8 ties', () => {
  // The unit case, so a wrong side length or tie count shows on its own and
  // is not hidden inside a big product.
  assert.deepStrictEqual(plain(ctx.mooseMaterials(1, 0)),
    { posts: 4, wireFt: 28, ties: 8, stakes: 0 });
});
