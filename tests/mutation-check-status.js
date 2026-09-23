#!/usr/bin/env node
// Do the guards on the pages Chris and Todd read actually catch anything?
//
// mutation-check.js patches index.html only, so everything on status.html,
// shortage.html and live.js -- the polling, and the rules about what may be
// shown when a fetch fails -- had tests but no evidence those tests could
// fail.
//
// It earned its keep on the first run. Swapping the poll's failure handler for
// fail() left the page intact and the test passed -- not because the guard
// worked, but because fail() looked up a banner render() had already removed,
// and threw. The guard was untested AND fail() was unusable after a render.
//
// Each mutation names the file it patches, because this logic has already
// moved once: the poll guards started in status.html and now live in live.js,
// where both pages share them. A mutation pointing at the wrong file reports
// SKIPPED, which reads like a pass.
//
// Run with: npm run verify-tests
// Files are restored after every mutation.

const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');

const REPO = path.resolve(__dirname, '..');

// Two guards are deliberately NOT mutated here, because breaking them changes
// nothing observable -- they are equivalent mutants, not untested code, and a
// permanently-red check is worse than an honest note.
//
//   the `if (!j.ok) throw` in fetchRecord()
//     Removed, a refused record still ends in the error state: render() cannot
//     build a page out of a record with no `data`, so it throws, and
//     startLive's catch turns that into fail(). Checked by hand -- state
//     "state err", 0 sections, "Counts unavailable". The check stays because
//     it states the intent, and because that second mechanism is an accident
//     of render() being strict rather than a promise it makes.
//
//   the `sections.innerHTML = ""` in fail()
//     fail() only ever fires when nothing has rendered yet, so clearing is a
//     no-op in every path a test can currently reach. It stays as defence for
//     a later poll whose render throws.
//
// If either is ever the ONLY thing standing between a refusal and a screen of
// zeros, write the test first and then add the mutation back.

const MUTATIONS = [
  // ---- live.js: the shared fetch and poll rules ----------------------------
  {
    file: 'live.js',
    name: 'poll even while the tab is hidden',
    find: '    if (document.hidden) return;',
    replace: '    ;',
    caughtBy: 'skipped while the tab is hidden',
  },
  {
    file: 'live.js',
    name: 'repaint on every poll, moved or not',
    find: '      if (!j.updatedAt || j.updatedAt === lastSeen) return;',
    replace: '      ;',
    caughtBy: 'does not repaint',
  },
  {
    file: 'live.js',
    name: 'blank a good record when a refresh fails',
    find: '      if (++missed >= 2 && painted && onStale) onStale(lastSeen);',
    replace: '      onFail("refresh failed");',
    caughtBy: 'keeps the numbers already on screen',
  },
  {
    file: 'live.js',
    name: 'stay quiet about being out of date',
    find: '      if (++missed >= 2 && painted && onStale) onStale(lastSeen);',
    replace: '      ;',
    caughtBy: 'stop the page claiming to be live',
  },
  // ---- status.html: what it paints -----------------------------------------
  {
    file: 'status.html',
    name: 'call a shortfall complete',
    find: '  if (r.short > 0 && r.got === 0) return {cls: "no", text: "none yet"};',
    replace: '  if (false) return {cls: "no", text: "none yet"};',
    caughtBy: 'reads as none yet',
  },
  // ---- shortage.html: the case put to Chris and Todd -----------------------
  {
    file: 'shortage.html',
    name: 'read the lilac callout off one row instead of both',
    find: '      callouts += need;',
    replace: '      callouts = need;',
    caughtBy: 'callout-versus-schedule gap',
  },
  {
    file: 'shortage.html',
    name: 'append poll results instead of rebuilding the tables',
    find: '  while (t.rows.length > 1) t.deleteRow(1);',
    replace: '  ;',
    caughtBy: 'without duplicating rows',
  },
  // Note: "leave stale figures up when the record cannot be read" is covered by
  // the clearRows mutation above rather than separately. clearRows is the only
  // thing that empties either table, so breaking it fails BOTH the duplicate-
  // rows test and the dead-endpoint one -- a second mutation of the same
  // function would only be proving the same guard twice.
  {
    file: 'status.html',
    name: 'leave a count out of the job total',
    find: '    totalShort += r.short; totalDone += r.done; totalRows += r.rows;',
    replace: '    totalDone += r.done; totalRows += r.rows;',
    caughtBy: 'totals are the sum of the rows',
  },

  // ---- status.html: substitution options (tests/status-subs.spec.js) -------
  {
    file: 'status.html',
    name: 'build HTML out of a note typed on a phone',
    find: "return '<span class=\"so\">' + escapeHtml(t) + '</span>';",
    replace: "return '<span class=\"so\">' + t + '</span>';",
    caughtBy: 'shown as text',
  },
  {
    // The h2s-prefix bug, a fourth time: read every job's subs off Home2Suites.
    file: 'status.html',
    name: 'read subs off Home2Suites for every job',
    find: '        subs: subsFor(notes, key),',
    replace: '        subs: subsFor(notes, "h2s:" + slugOf(name)),',
    caughtBy: 'own job only',
  },
  {
    file: 'live.js',
    name: 'let one garbled sub throw and blank the page',
    find: '  try { list = JSON.parse(raw); } catch (e) { return []; }',
    replace: '  list = JSON.parse(raw);',
    caughtBy: 'garbled entry',
  },
  {
    // Later key wins in an object literal, so this overrides the real short.
    file: 'status.html',
    name: 'let a sub quantity reduce the shortfall',
    find: '        subs: subsFor(notes, key),',
    replace: '        subs: subsFor(notes, key), short: Math.max(0, (known ? target - got : target) - 12 * subsFor(notes, key).length),',
    caughtBy: 'change no number',
  },
  {
    file: 'live.js',
    name: 'show an option with no species picked',
    find: 'return o && typeof o.sp === "string" && o.sp; })',
    replace: 'return o && typeof o.sp === "string"; })',
    caughtBy: 'quantity and note',
  },

  // ---- shortage.html: substitution options (tests/shortage-subs.spec.js) ---
  {
    file: 'shortage.html',
    name: 'build HTML out of a sub note on the shortage page',
    find: "      out += '<span class=\"so\">' + escapeHtml(t) + '</span>';",
    replace: "      out += '<span class=\"so\">' + t + '</span>';",
    caughtBy: 'typed note is text',
  },
  {
    // Miss Kim's callout is filled by two app rows since the lilac split.
    file: 'shortage.html',
    name: 'read the lilac subs off one row instead of both',
    find: "      subsHtml(notes, r.filledBy) + '</td>' +",
    replace: "      subsHtml(notes, r.filledBy.slice(0, 1)) + '</td>' +",
    caughtBy: 'both rows that fill it',
  },
  {
    file: 'shortage.html',
    name: "let another job's subs onto the Home2Suites page",
    find: '    subsFor(notes, "h2s:" + slugOf(n)).forEach(function(t){',
    replace: '    subsFor(notes, "wsrcc:" + slugOf(n)).concat(subsFor(notes, "h2s:" + slugOf(n))).forEach(function(t){',
    caughtBy: 'only Home2Suites',
  },
  {
    file: 'shortage.html',
    name: 'count a sub as on hand',
    find: '    var have = onHand(counts, r.name);',
    replace: '    var have = onHand(counts, r.name) + (subsFor(notes, "h2s:" + slugOf(r.name)).length ? 3 : 0);',
    caughtBy: 'change no figure',
  },

  // ---- status.html + vendors-view.js: who carries it (vendors-*.spec.js) ----
  {
    file: 'status.html',
    name: 'build HTML out of a vendor name',
    find: "      r.vendors.map(function(t){ return '<span class=\"vl\">' + escapeHtml(t) + '</span>'; }).join('') + '</td>' +",
    replace: "      r.vendors.map(function(t){ return '<span class=\"vl\">' + t + '</span>'; }).join('') + '</td>' +",
    caughtBy: 'escaped before it reaches the page',
  },
  {
    file: 'vendors-view.js',
    name: 'drop the list date from a vendor line',
    find: '        " (" + list.dated + ")");',
    replace: '        "");',
    caughtBy: 'on each job that has it',
  },
  {
    file: 'vendors-view.js',
    name: 'say "not on list" for a vendor that was never read',
    find: '    if (!Object.prototype.hasOwnProperty.call(sp.offers, v)) return;',
    replace: '    if (!Object.prototype.hasOwnProperty.call(sp.offers, v)) { out.push(VENDORS.lists[v].label + ": not on list"); return; }',
    caughtBy: 'names who carries the plant',
  },
];

const originals = {};
const paths = {};
[...new Set(MUTATIONS.map((m) => m.file))].forEach((f) => {
  paths[f] = path.join(REPO, f);
  originals[f] = fs.readFileSync(paths[f], 'utf8');
});
const restoreAll = () =>
  Object.keys(originals).forEach((f) => fs.writeFileSync(paths[f], originals[f], 'utf8'));

process.on('exit', restoreAll);
process.on('SIGINT', () => { restoreAll(); process.exit(130); });

let holes = 0;
console.log('Breaking ' + MUTATIONS.length + ' guards on the pages Chris and Todd read.\n');

for (const m of MUTATIONS) {
  const src = originals[m.file];
  const eol = src.includes('\r\n') ? (s) => s.split('\n').join('\r\n') : (s) => s;
  const find = eol(m.find);

  if (src.indexOf(find) === -1) {
    console.log('  ?  ' + m.name + '  [' + m.file + ']');
    console.log('     SKIPPED -- the code it patches has moved. Update this mutation.\n');
    holes++;
    continue;
  }

  fs.writeFileSync(paths[m.file], src.replace(find, eol(m.replace)), 'utf8');

  const run = spawnSync(
    process.execPath,
    [require.resolve('@playwright/test/cli'),
     'test', 'tests/status-live.spec.js', 'tests/shortage-live.spec.js', 'tests/status-subs.spec.js', 'tests/shortage-subs.spec.js', 'tests/vendors-status.spec.js', 'tests/vendors-app.spec.js',
     '-g', m.caughtBy, '--reporter=json'],
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
  } catch (e) {
    console.log('     (could not read the test report)');
  }

  if (ran === 0) {
    console.log('  ?  ' + m.name + '  [' + m.file + ']');
    console.log('     no test matched "' + m.caughtBy + '"\n');
    holes++;
  } else if (failed > 0) {
    console.log('  CAUGHT  ' + m.name + '  [' + m.file + ']');
    console.log('          by "' + m.caughtBy + '"' +
                (failed > 1 ? '  (' + failed + ' tests went red)' : '') + '\n');
  } else {
    console.log('  MISSED  ' + m.name + '  [' + m.file + ']');
    console.log('          "' + m.caughtBy + '" passed on broken code\n');
    holes++;
  }

  fs.writeFileSync(paths[m.file], src, 'utf8');
}

restoreAll();
console.log(holes
  ? holes + ' guard(s) are not actually tested. That is a hole, not a pass.'
  : 'All ' + MUTATIONS.length + ' guards are really tested.');
process.exit(holes ? 1 : 0);
