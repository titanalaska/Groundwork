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
    name: 'let an unticked line in a planted bed owe nothing (pine lands, bed goes green)',
    find: '    if(planted[k] && !lineIn(b, c, job)){',
    replace: '    if(false){',
    caughtBy: 'pine arriving does NOT turn the bed green',
    tag: 'line-ticks',
  },
  {
    name: 'call a bed planted while lines with material are still not in',
    find: '  if(anyIn && rest) planted[k] = true; else delete planted[k];',
    replace: '  if(anyIn) planted[k] = true; else delete planted[k];',
    caughtBy: 'one line in, the rest have material',
    tag: 'line-ticks',
  },
  {
    name: 'Mark planted ticks the pine too, though none is on site',
    find: '    Object.keys(b.items).forEach(function(c){ plantedLine[k][c] = !noMaterial(b, c); });',
    replace: '    Object.keys(b.items).forEach(function(c){ plantedLine[k][c] = true; });',
    caughtBy: 'Mark planted ticks what has material',
    tag: 'line-ticks',
  },
  {
    name: 'drop the line ticks from the sync payload',
    find: 'owed: owed, plantedLine: plantedLine, lastLogged',
    replace: 'owed: owed, lastLogged',
    caughtBy: 'line ticks ride the sync payload',
    tag: 'line-ticks',
  },
  {
    name: 'use the Home2Suites zoom figure on WSRCC',
    find: '  if(currentJob !== "wsrcc") return "1.6";',
    replace: '  return "1.6";',
    caughtBy: 'WSRCC bed picture: 0.8 in a pixel',
    tag: 'zoom',
  },
  {
    name: 'put bed 5 back on the west side',
    find: '{"bed":"B05","where":"North side","units":37,',
    replace: '{"bed":"B05","where":"West side","units":37,',
    caughtBy: 'bed 5 is on the north side',
    tag: 'labels',
  },
  {
    name: 'drop the note that bed 3 is two planters',
    find: 'var WSRCC_BED_LINKS = {\n  B03:',
    replace: 'var WSRCC_BED_LINKS = {\n  B03_:',
    caughtBy: 'across the driveway',
    tag: 'labels',
  },
  {
    name: 'convert feet to inches wrong on the tape table',
    find: '  var inch = Math.round(ft * 12);',
    replace: '  var inch = Math.round(ft * 10);',
    caughtBy: "25' 4\" east of the SW corner post",
    tag: 'stakes',
  },
  {
    name: 'swap inside and outside the fence on the card',
    find: '({site: "inside the fence", street: "outside the fence",',
    replace: '({site: "outside the fence", street: "inside the fence",',
    caughtBy: 'the table is on the card',
    tag: 'stakes',
  },
  {
    name: 'never hand the WSRCC job its tape table',
    find: 'stakes: WSRCC_STAKES,',
    replace: 'stakes: null,',
    caughtBy: 'exactly one tape row',
    tag: 'stakes',
  },
  {
    name: 'build the tape table but never put it on the card',
    find: '    card.insertAdjacentHTML("beforeend", stakeTableHTML(b));',
    replace: '',
    caughtBy: 'the table is on the card',
    tag: 'stakes',
  },
  {
    name: 'leave the whole-run strips out of Save for offline',
    find: '    return BED_IMG + id + "-run.jpg";',
    replace: '    return BED_IMG + "site-map.jpg";',
    caughtBy: 'Save for offline takes the strips too',
    tag: 'runs',
  },
  {
    name: 'put a whole-run strip on every bed',
    find: 'if(BED_RUNS.indexOf(b.bed) !== -1){',
    replace: 'if(true){',
    caughtBy: 'on the four long beds and no others',
    tag: 'runs',
  },
  {
    name: 'point WSRCC back at the pictures without the fence',
    find: 'bedImg: "./beds-wsrcc/v2/"',
    replace: 'bedImg: "./beds-wsrcc/"',
    caughtBy: 'the fenced set',
    tag: 'runs',
  },
  {
    name: 'ask for a strip that was never built',
    find: 'runs: ["B01", "B03", "B05", "B06"],',
    replace: 'runs: ["B01", "B03", "B05", "B06", "B02"],',
    caughtBy: 'is on disk',
    tag: 'runs',
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
    // The bug that actually happened when two branches met: the flag and the
    // Pull button each fitted alone, and together pushed Pull off the edge.
    name: 'stop the plant row wrapping, so Pull hangs off the edge on a phone',
    find: '    flex-wrap:wrap;\n    row-gap:8px;',
    replace: '    row-gap:8px;',
    caughtBy: 'hangs off the edge on a phone',
  },
  {
    name: 'let the pull note read across every job again',
    find: '  var already = pulledTotal(pulledForJob(pulls[slug(name)], JOBS[jobKey] ? JOBS[jobKey].label : jobKey));',
    replace: '  var already = pulledTotal(pulls[slug(name)]);',
    caughtBy: 'this job only',
  },
  {
    name: 'stop the flag updating as somebody counts',
    find: '    flag.textContent = flagText(newVal);',
    replace: '    ;',
    caughtBy: 'without re-sorting under you',
  },
  {
    // The bug itself: the count stays under the old name and the new row reads
    // zero, so a planted job reports 27 short.
    name: 'never carry the split lilac count across',
    find: '  migrateLilacSplit();',
    replace: '  ;',
    caughtBy: 'move to the new one',
  },
  {
    // Guard on truthiness instead of presence. A deliberate zero on the new row
    // then looks like "no value here" and gets overwritten with 27 -- the app
    // inventing plants that somebody explicitly said had not arrived.
    name: 'treat a deliberate zero as an empty slot',
    find: '  if(state[sub] !== undefined && state[sub] !== null) return;',
    replace: '  if(state[sub]) return;',
    caughtBy: 'zero on the new row is a real answer',
  },
  {
    // Drop the cap. A wild number under the old row then fills the new one far
    // past what the job asks for.
    name: 'let the carried count overflow the new row',
    find: '  state[sub] = Math.min(had - 46, 27);',
    replace: '  state[sub] = had - 46;',
    caughtBy: 'never fills past what the job asks for',
  },

  // --- Substitution options (tests/subs.spec.js) ---
  {
    // The tempting "clean" design: subs as their own top-level field. The old
    // Wolf app writes the whole document without it, so one tap on an old
    // install wipes every sub. This is why they live inside notes.
    name: 'store subs as a top-level field the old app does not carry',
    edits: [
      { find: 'var SUBS_PREFIX = "subs-";', replace: 'var SUBS_PREFIX = "subs-"; var subsTop = {};' },
      { find: '  var raw = notes[subsKey(jobKey, name)];', replace: '  var raw = subsTop[subsKey(jobKey, name)];' },
      { find: '  if(list.length) notes[key] = JSON.stringify(list);\n  else delete notes[key];',
        replace: '  if(list.length) subsTop[key] = JSON.stringify(list);\n  else delete subsTop[key];' },
      { find: 'itemMap: itemMap, pulls: pulls,', replace: 'itemMap: itemMap, pulls: pulls, subs: subsTop,' },
      { find: '  migrateLilacSplit();\n', replace: '  migrateLilacSplit();\n  subsTop = Object.assign({}, p.subs || {});\n' },
    ],
    caughtBy: 'old Wolf install does not wipe',
  },
  {
    name: 'pre-fill a substitute nobody chose',
    find: '  if(!raw) return [];',
    replace: '  if(!raw) return jobKey === "ntmb" ? [{sp: "Vanhoutte Spirea", qty: null, note: ""}] : [];',
    caughtBy: 'nothing is pre-filled',
  },
  {
    name: 'start a new option line at quantity 0',
    find: '      list.push({sp: "", qty: null, note: ""});',
    replace: '      list.push({sp: "", qty: 0, note: ""});',
    caughtBy: 'new option line is blank',
  },
  {
    name: 'save a cleared quantity as 0 instead of undecided',
    find: 'update(i, {qty: v === "" || isNaN(n) ? null : Math.max(0, n)});',
    replace: 'update(i, {qty: v === "" || isNaN(n) ? 0 : Math.max(0, n)});',
    caughtBy: 'blank quantity stays blank',
  },
  {
    name: 'offer a species as a substitute for itself',
    find: '        if(s !== skip && !seen[s]) seen[s] = decode(r[0]);',
    replace: '        if(!seen[s]) seen[s] = decode(r[0]);',
    caughtBy: 'except the row itself',
  },
  {
    name: 'ignore what is typed into the Other box',
    find: 'otherBox.addEventListener("input", function(){ update(i, {sp: otherBox.value.trim()}); });',
    replace: 'otherBox.addEventListener("input", function(){});',
    caughtBy: '"Other" takes',
  },
  {
    name: 'leave an empty [] behind when the last option is removed',
    find: '  else delete notes[key];',
    replace: '  else notes[key] = "[]";',
    caughtBy: 'clears the entry',
  },
  {
    name: 'let a sub quantity count as received',
    find: '  if(list.length) notes[key] = JSON.stringify(list);',
    replace: '  if(list.length){ notes[key] = JSON.stringify(list); var sk = key.slice(SUBS_PREFIX.length); state[sk] = (state[sk] || 0) + (list[0].qty || 0); }',
    caughtBy: 'never move a count',
  },
  {
    name: 'blank the one-line summary on the collapsed row',
    find: '    summary.textContent = named.length ? "sub: " + named.map(subLabel).join("; ") : "";',
    replace: '    summary.textContent = "";',
    caughtBy: 'comes back after a reload',
  },
  {
    name: 'let a sync repaint steal the field being typed in',
    find: '  if(refocus){\n    var back',
    replace: '  if(false){\n    var back',
    caughtBy: 'sync repaint keeps',
  },
  {
    name: 'close every open sub panel on a sync repaint',
    find: 'ae.selectionEnd} : null;\n  container.innerHTML = "";',
    replace: 'ae.selectionEnd} : null;\n  subsOpen = {};\n  container.innerHTML = "";',
    caughtBy: 'sync repaint keeps',
  },
  {
    name: 'leave the sub options out of the status report',
    find: '          if(!o.sp) return;',
    replace: '          return;',
    caughtBy: 'status report lists',
  },

  // --- Sub options in the daily-log draft (tests/log-subs.spec.js) ---
  {
    name: 'leave subs out of the Posted-it baseline, so every draft repeats them',
    find: '    subs: subsSnapshot(),',
    replace: '',
    tag: 'log-subs',
    caughtBy: 'nothing changed since the snapshot',
  },
  {
    // The tempting "safe" default: treat a missing baseline as today's subs.
    // It silently swallows everything entered before the first new baseline.
    name: "treat a baseline with no subs as already having today's",
    find: '  var subLines = [], prevSubs = prev.subs || {};',
    replace: '  var subLines = [], prevSubs = prev.subs || subsSnapshot();',
    tag: 'log-subs',
    caughtBy: 'before subs existed',
  },
  {
    name: 'stop matching options by species, so a new quantity reads as drop + add',
    find: '      if(used.indexOf(j) < 0 && before[j].sp === o.sp){ i = j; break; }',
    replace: '      if(false){ i = j; break; }',
    tag: 'log-subs',
    caughtBy: 'change, not a drop',
  },
  {
    name: 'ignore a changed note',
    find: '    if((p.note || "") !== (o.note || "")) bits.push(o.note ? "note: " + o.note : "note cleared");',
    replace: '    ;',
    tag: 'log-subs',
    caughtBy: 'changed note',
  },
  {
    name: 'never log a dropped option',
    find: '    if(used.indexOf(j) < 0) out.push("dropped " + full(p));',
    replace: '    ;',
    tag: 'log-subs',
    caughtBy: 'drafted as dropped',
  },
  {
    name: 'log an option with no species picked',
    find: '  function named(l){ return (l || []).filter(function(o){ return o && o.sp; }); }',
    replace: '  function named(l){ return (l || []).filter(function(o){ return o; }); }',
    tag: 'log-subs',
    caughtBy: 'no species picked',
  },
  {
    name: 'file sub options under Received on site',
    find: '  block("Sub options (record only, counts unchanged):", subLines);',
    replace: '  block("Received on site:", subLines);',
    tag: 'log-subs',
    caughtBy: 'never show up as received',
  },
  {
    name: 'leave the sub section out of the draft',
    find: '  block("Sub options (record only, counts unchanged):", subLines);',
    replace: '',
    tag: 'log-subs',
    caughtBy: 'added since the last log',
  },

  // --- Who carries it, in the Subs panel (tests/vendors-app.spec.js) ---
  {
    name: 'leave the vendor block out of the Subs panel',
    find: '    panel.appendChild(vend);',
    replace: '',
    tag: 'vendors',
    caughtBy: 'names who carries the plant',
  },
  {
    name: 'let a missing vendors.js break the panel instead of saying so',
    find: '    (vl || ["Vendor lists not loaded."]).forEach(function(t){',
    replace: '    vl.forEach(function(t){',
    tag: 'vendors',
    caughtBy: 'says the lists are not loaded',
  },
  {
    // Passing the raw plan name (with its HTML entity) instead of the slug
    // would look up nothing and call every species unmapped.
    name: 'look vendors up by plan name instead of the slug',
    find: '    var vl = (typeof vendorLines === "function") ? vendorLines(slug(name), decode(name)) : null;',
    replace: '    var vl = (typeof vendorLines === "function") ? vendorLines(name, decode(name)) : null;',
    tag: 'vendors',
    caughtBy: 'names who carries the plant',
  },

  // --- Spanish ---
  {
    name: 'read the language only inside applyPayload, which a fresh phone skips',
    find: '  try{\n    var savedLang = localStorage.getItem("wolf-lang");\n' +
          '    if(savedLang === "es" || savedLang === "en") lang = savedLang;\n' +
          '  }catch(e){}\n  // 1. Paint',
    replace: '  // 1. Paint',
    tag: 'spanish',
    caughtBy: 'fresh install set to Spanish',
  },
  {
    name: 'store a count under the Spanish name on the Spanish screen',
    find: '  var k = jobKey + ":" + slug(name);\n  var received = state[k] || 0;',
    replace: '  var k = jobKey + ":" + slug(lang === "es" ? translateString(name) : name);\n  var received = state[k] || 0;',
    tag: 'spanish',
    caughtBy: 'stored under the English name',
  },
  {
    name: 'leave the static header in Spanish after switching back',
    find: '  if(lang !== "es") restoreEnglish();',
    replace: '',
    tag: 'spanish',
    caughtBy: 'switching back to English restores',
  },
  {
    name: 'stop watching the screen, so late messages stay English',
    find: '  watchForSpanish();\n',
    replace: '',
    tag: 'spanish',
    caughtBy: 'message set after the screen is drawn',
  },
  {
    name: 'let the phrase pass into the vendor lines',
    find: '    vend.setAttribute("data-no-es", "");\n',
    replace: '',
    tag: 'spanish',
    caughtBy: 'vendor product name stays',
  },
  {
    name: 'show the Spanish notes even when one is missing',
    find: '  var shown = (lang === "es" && job.flagsEs && job.flagsEs.length === job.flags.length)',
    replace: '  var shown = (lang === "es" && job.flagsEs)',
    tag: 'spanish',
    caughtBy: 'line up one-to-one',
  },
  {
    name: 'put the English draft in the Spanish log box',
    find: '    textarea.value = lang === "es" ? logToSpanish(d.text) : d.text;',
    replace: '    textarea.value = d.text;',
    tag: 'spanish',
    caughtBy: 'daily log box is Spanish',
  },
  {
    name: 'try short phrases first, so "Both crews" eats "Both crews, last"',
    find: 'var ES_KEYS = Object.keys(ES).sort(function(a, b){ return b.length - a.length; });',
    replace: 'var ES_KEYS = Object.keys(ES).sort(function(a, b){ return a.length - b.length; });',
    tag: 'spanish',
    caughtBy: 'longest phrase wins',
  },
  {
    // Both anchors: dropping one alone still leaves "Go" pinned at its other end.
    name: 'drop the word anchors, so "Go" turns "Goodbye" into "Irodbye"',
    edits: [
      { find: '    var pre  = /^[A-Za-z0-9]/.test(k) ? "\\\\b" : "";', replace: '    var pre  = "";' },
      { find: '    var post = /[A-Za-z0-9]$/.test(k) ? "\\\\b" : "";', replace: '    var post = "";' },
    ],
    tag: 'spanish',
    caughtBy: 'longest phrase wins',
  },
];

// MUTATE_ONLY=<text> runs just the mutations whose name contains it -- the
// whole list is ~40 runs of the full suite, over half an hour. Use it while
// working; run the whole thing before calling a change done.
if (process.env.MUTATE_ONLY) {
  const keep = MUTATIONS.filter((m) => m.name.includes(process.env.MUTATE_ONLY) ||
    (m.tag && m.tag.includes(process.env.MUTATE_ONLY)));
  MUTATIONS.length = 0;
  keep.forEach((m) => MUTATIONS.push(m));
}

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
