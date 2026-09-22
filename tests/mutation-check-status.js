#!/usr/bin/env node
// Do the status page guards actually catch anything?
//
// mutation-check.js patches index.html only, so everything on status.html --
// the polling, and the rules about what may be shown when a fetch fails --
// had tests but no evidence those tests could fail.
//
// It found one immediately: swapping the poll failure handler for fail() left
// the page intact and the test passed, because fail() looked up an element
// render() had already removed and threw. The guard was untested and fail()
// was unusable after a render. Both fixed; this is what keeps them fixed.
//
// Run with: npm run verify-tests
// status.html is restored after every mutation, including on a crash path.

const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');

const REPO = path.resolve(__dirname, '..');
const FILE = path.join(REPO, 'status.html');
const original = fs.readFileSync(FILE, 'utf8');

const MUTATIONS = [
  {
    name: 'poll even while the tab is hidden',
    find: '  if (document.hidden) return;',
    replace: '  ;',
    caughtBy: 'skipped while the tab is hidden',
  },
  {
    name: 'repaint on every poll, moved or not',
    find: '      if (!j.updatedAt || j.updatedAt === lastSeen) return;  // nothing moved',
    replace: '      ;',
    caughtBy: 'does not repaint',
  },
  {
    name: 'blank the page when a poll fails',
    find: '      if (++missed >= 2) staleStamp();',
    replace: '      fail("poll failed");',
    caughtBy: 'keeps the numbers already on screen',
  },
  {
    name: 'keep claiming to be live after failed polls',
    find: 'function staleStamp(){\n  var el = document.getElementById("stamp");\n  if (!el || !lastSeen) return;',
    replace: 'function staleStamp(){\n  var el = document.getElementById("stamp");\n  if (!el || !lastSeen) return;\n  return;',
    caughtBy: 'stop the page claiming to be live',
  },
];

let holes = 0;
console.log('Breaking ' + MUTATIONS.length + ' guards on status.html.\n');

for (const m of MUTATIONS) {
  const eol = original.includes('\r\n')
    ? (s) => s.split('\n').join('\r\n')
    : (s) => s;
  const find = eol(m.find);
  if (original.indexOf(find) === -1) {
    console.log('  ?  ' + m.name + '\n     SKIPPED -- the code it patches has moved.\n');
    holes++;
    continue;
  }
  fs.writeFileSync(FILE, original.replace(find, eol(m.replace)), 'utf8');

  const run = spawnSync(
    process.execPath,
    [require.resolve('@playwright/test/cli'),
     'test', 'tests/status-live.spec.js', '-g', m.caughtBy, '--reporter=json'],
    { cwd: REPO, encoding: 'utf8', maxBuffer: 32 * 1024 * 1024 }
  );

  let failed = 0, ran = 0;
  try {
    const raw = run.stdout || '';
    const rep = JSON.parse(raw.slice(raw.indexOf('{')));
    const walk = (ss) => (ss || []).forEach((s) => {
      (s.specs || []).forEach((sp) => { ran++; if (!sp.ok) failed++; });
      walk(s.suites);
    });
    walk(rep.suites);
  } catch (e) { console.log('     (could not read the report)'); }

  if (ran === 0) {
    console.log('  ?  ' + m.name + '\n     no test matched "' + m.caughtBy + '"\n');
    holes++;
  } else if (failed > 0) {
    console.log('  CAUGHT  ' + m.name + '\n          by "' + m.caughtBy + '"\n');
  } else {
    console.log('  MISSED  ' + m.name + '\n          "' + m.caughtBy + '" passed on broken code\n');
    holes++;
  }

  fs.writeFileSync(FILE, original, 'utf8');
}

fs.writeFileSync(FILE, original, 'utf8');
console.log(holes ? holes + ' guard(s) not actually tested.' : 'All ' + MUTATIONS.length + ' guards are really tested.');
process.exit(holes ? 1 : 0);
