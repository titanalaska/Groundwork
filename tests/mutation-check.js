#!/usr/bin/env node
// Do these tests actually catch anything?
//
// A suite that passes is only evidence if it would have failed on broken code.
// This breaks the counting logic on purpose, one bug at a time, into a
// throwaway copy of index.html, and checks that the test claiming to guard
// that bug really does go red.
//
// The first mutation is the real bug this suite was written for -- it puts the
// hardcoded "h2s:" prefix back, so the suite has to keep proving it catches it.
//
// Run with: npm run verify-tests
// index.html is never modified -- every mutation goes to a temp copy.

const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');

const REPO = path.resolve(__dirname, '..');
const SOURCE = path.join(REPO, 'index.html');
const MUTANT = path.join(REPO, '_mutant.html'); // gitignored, deleted below

const MUTATIONS = [
  {
    name: 'put the hardcoded "h2s:" count prefix back (the real bug)',
    find: 'if((state[jk + ":" + slug(row[0])] || 0) === 0){',
    replace: 'if((state["h2s:" + slug(row[0])] || 0) === 0){',
    caughtBy: 'OTHER job',
  },
  {
    name: 'resolve every code against the open tab, ignoring the job passed in',
    find: '  var jk = job || currentJob;',
    replace: '  var jk = currentJob;',
    caughtBy: 'asked about by job',
  },
  {
    name: 'treat a zero count as received, so nothing ever reads as owed',
    find: 'if((state[jk + ":" + slug(row[0])] || 0) === 0){',
    replace: 'if(false){',
    caughtBy: 'received NOTHING still reports',
  },
  {
    name: 'ignore the per-bed owed map that records a partial shortfall',
    find: '    var q = owedIn(b.bed, c, job);',
    replace: '    var q = 0;',
    caughtBy: 'owed map records',
  },
  {
    name: 'stop the map showing a planted-but-short bed as short',
    find: 'if(planted[bedKey(b.bed)]) return bedOutstanding(b).length ? "short" : "done";',
    replace: 'if(planted[bedKey(b.bed)]) return "done";',
    caughtBy: 'map colours a planted-but-unreceived',
  },
  {
    name: 'resolve codes against the open tab, ignoring the job asked for',
    find: '  var forJob = job || currentJob;',
    replace: '  var forJob = currentJob;',
    caughtBy: 'resolves while the WSRCC tab is open',
  },
  {
    // The original shape of the bug: one shared cache for every job, so
    // whichever job asked first answered for all of them. Takes three edits
    // because the cache is keyed in three places.
    name: 'share one code-to-row cache across every job (the original bug)',
    edits: [
      { find: '  if(!CODE_ROW_BY_JOB[forJob]){', replace: '  if(!CODE_ROW_BY_JOB.only){' },
      { find: '    CODE_ROW_BY_JOB[forJob] = map;', replace: '    CODE_ROW_BY_JOB.only = map;' },
      { find: '  return CODE_ROW_BY_JOB[forJob][code] || null;',
        replace: '  return CODE_ROW_BY_JOB.only[code] || null;' },
    ],
    // NOT caught by 'same thing whichever tab' -- that test seeds the cache
    // from Home2Suites, so with one shared cache BOTH reads hit the same stale
    // map and agree with each other. It checks consistency; the WSRCC tests
    // are what check correctness.
    caughtBy: 'everything received owes nothing',
  },
  {
    name: 'resolve WSRCC codes against the Home2Suites species list',
    find: '    var d = (forJob === "wsrcc") ? WSRCC : H2S;',
    replace: '    var d = H2S;',
    caughtBy: 'switching jobs rebuilds',
  },
  {
    name: 'put the species list back in plan order, shortages scattered through it',
    find: '    ordered.forEach(function(row){',
    replace: '    g.items.forEach(function(row){',
    caughtBy: 'biggest number outstanding',
  },
  {
    name: 'leave nothing-received with no class again, so it cannot be coloured',
    find: '  return "item" + (v > target ? " over" : v === target ? " complete" : v > 0 ? " partial" : " none");',
    replace: '  return "item" + (v > target ? " over" : v === target ? " complete" : v > 0 ? " partial" : "");',
    caughtBy: 'every state carries a class',
  },
  {
    // The ordering Matt rejected: state ahead of size, which floats a species
    // with none yet above one that is short by more.
    name: 'sort by state before size, floating none-yet above a bigger shortfall',
    edits: [
      {
        find: '      var ashort = Math.max(0, a[1] - av), bshort = Math.max(0, b[1] - bv);\n' +
              '      if(ashort !== bshort) return bshort - ashort;\n' +
              '      var ar = itemRank(av, a[1]), br = itemRank(bv, b[1]);\n' +
              '      if(ar !== br) return ar - br;',
        replace: '      var ashort = Math.max(0, a[1] - av), bshort = Math.max(0, b[1] - bv);\n' +
                 '      var ar = itemRank(av, a[1]), br = itemRank(bv, b[1]);\n' +
                 '      if(ar !== br) return ar - br;\n' +
                 '      if(ashort !== bshort) return bshort - ashort;',
      },
    ],
    caughtBy: 'biggest number outstanding',
  },
  {
    name: 'rank nothing-received as least urgent instead of most',
    find: '  if(v === 0) return 0;        // nothing has arrived',
    replace: '  if(v === 0) return 9;',
    caughtBy: 'urgency ranks',
  },
  {
    name: 'send the language toggle back to the bed view only',
    find: '  wireLangButtons();',
    replace: '  ;',
    caughtBy: 'active language is shown',
  },
  {
    // NOT "skip the render when the species view is open" -- that is an
    // equivalent mutant. Pressing ES there sets the language, and opening the
    // bed view renders it translated anyway, so the app behaves identically.
    // The real regression is setLang not repainting the view that IS open.
    name: 'stop setLang repainting, so pressing ES changes nothing on screen',
    find: '  // renderAll, not renderBeds: the buttons are in the header and reachable\n' +
          '  // from either view, so whichever one is open has to be the one rebuilt.\n' +
          '  renderAll();',
    replace: '  ;',
    caughtBy: 'from the species view still translates',
  },
  {
    name: 'stop the flag updating as somebody counts',
    find: '    flag.textContent = flagText(newVal);',
    replace: '    ;',
    caughtBy: 'without re-sorting under you',
  },
];

// Normalised to LF. Git checks this repo out with CRLF on Windows, so any
// find string containing \n silently matched nothing and the mutation was
// reported as SKIPPED -- which counts as a hole, but for the wrong reason.
// The mutant is a throwaway copy, so rewriting its line endings costs nothing.
const original = fs.readFileSync(SOURCE, 'utf8').replace(/\r\n/g, '\n');
let holes = 0;

console.log(`Checking ${MUTATIONS.length} deliberate bugs against the suite.\n`);

for (const m of MUTATIONS) {
  // A mutation is either one find/replace, or several that must all land --
  // some behaviour is guarded twice over and breaking one guard proves nothing.
  const edits = m.edits || [{ find: m.find, replace: m.replace }];
  if (edits.some((e) => !original.includes(e.find))) {
    console.log(`  ?  ${m.name}`);
    console.log(`     SKIPPED -- the code it patches has moved. Update this mutation.\n`);
    holes++;
    continue;
  }

  let mutated = original;
  edits.forEach((e) => { mutated = mutated.replace(e.find, e.replace); });
  fs.writeFileSync(MUTANT, mutated);

  // Run Playwright's CLI through node directly. Going via `npx` fails here:
  // Node on Windows refuses to spawn a .cmd without a shell (EINVAL), and the
  // failure is silent enough to look like every test passing.
  const run = spawnSync(
    process.execPath,
    [require.resolve('@playwright/test/cli'), 'test', '--reporter=json'],
    {
      cwd: REPO,
      env: { ...process.env, WOLF_APP: '_mutant.html' },
      encoding: 'utf8',
      maxBuffer: 32 * 1024 * 1024,
    }
  );

  const failedTitles = [];
  try {
    const raw = run.stdout || '';
    const report = JSON.parse(raw.slice(raw.indexOf('{')));
    const walk = (suites) => (suites || []).forEach((s) => {
      (s.specs || []).forEach((spec) => { if (!spec.ok) failedTitles.push(spec.title); });
      walk(s.suites);
    });
    walk(report.suites);
  } catch {
    console.log(`  ?  ${m.name}`);
    console.log(`     could not read the test report -- treating as a hole.\n`);
    holes++;
    continue;
  }

  const caught = failedTitles.some((t) => t.includes(m.caughtBy));
  if (caught) {
    console.log(`  CAUGHT  ${m.name}`);
    console.log(`          by "${failedTitles.find((t) => t.includes(m.caughtBy))}"`);
    if (failedTitles.length > 1) {
      console.log(`          (${failedTitles.length} tests went red in total)`);
    }
  } else {
    holes++;
    console.log(`  MISSED  ${m.name}`);
    console.log(`          nothing matching "${m.caughtBy}" failed.`);
    console.log(`          ${failedTitles.length} other test(s) failed: ${failedTitles.slice(0, 3).join(', ') || 'none'}`);
  }
  console.log('');
}

fs.rmSync(MUTANT, { force: true });

if (holes === 0) {
  console.log(`All ${MUTATIONS.length} bugs were caught. The suite has teeth.`);
  process.exit(0);
}
console.log(`${holes} of ${MUTATIONS.length} bugs slipped through. That is a hole in the suite.`);
process.exit(1);
