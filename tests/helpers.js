// Shared setup for the Wolf Checklist tests.
//
// These drive the counting logic directly rather than clicking the UI. The
// script block is top level, so every function and the state objects are
// reachable from page.evaluate().

const path = require('path');
const { pathToFileURL } = require('url');

// BOOTPRINT-style override so the mutation check can point the suite at a
// deliberately broken copy. See tests/mutation-check.js.
const APP = pathToFileURL(
  path.resolve(__dirname, '..', process.env.WOLF_APP || 'index.html')
).href;

// Load the app and fail loudly if it did not come up clean.
async function loadApp(page) {
  const errors = [];
  page.on('pageerror', (e) => errors.push(String(e)));
  page.on('console', (m) => {
    if (m.type() === 'error') errors.push('console error: ' + m.text());
  });

  await page.goto(APP);
  await page.waitForFunction(() => typeof bedOutstanding === 'function', null, { timeout: 15000 });

  if (errors.length) {
    throw new Error(
      'index.html did not load cleanly, so nothing below can be trusted:\n  ' +
      errors.join('\n  ')
    );
  }
  return page;
}

// Open a job the way the app does -- applyJobData() swaps BEDS, SPECIES, the
// alias table and clears the code-to-row cache. Setting currentJob alone would
// leave the previous job's checklist cached, which is its own old bug.
async function openJob(page, job) {
  await page.evaluate((j) => {
    currentJob = j;
    applyJobData();
  }, job);
}

// Set received counts for the OPEN job, keyed by species code. Counts live
// under "<job>:<slug of the checklist row name>", so the key is derived the
// same way the app derives it rather than hardcoded in the test.
async function setReceived(page, job, byCode) {
  await page.evaluate(
    ({ job, byCode }) => {
      Object.keys(byCode).forEach((code) => {
        const row = codeRow(code);
        if (!row) throw new Error(`no checklist row resolves for code ${code}`);
        state[job + ':' + slug(row[0])] = byCode[code];
      });
    },
    { job, byCode }
  );
}

// Directly poke a raw "<job>:<slug>" key, for setting the OTHER job's counts.
async function setRawCount(page, job, code, qty) {
  await page.evaluate(
    ({ job, code, qty }) => {
      const row = codeRow(code);
      if (!row) throw new Error(`no checklist row resolves for code ${code}`);
      state[job + ':' + slug(row[0])] = qty;
    },
    { job, code, qty }
  );
}

// What does the app say is still owed in this bed?
async function outstandingFor(page, bedId) {
  return page.evaluate((id) => {
    const bed = BEDS.filter((b) => b.bed === id)[0];
    if (!bed) throw new Error(`no bed ${id} in the open job`);
    return bedOutstanding(bed).map((o) => ({ code: o.code, qty: o.qty, recorded: o.recorded }));
  }, bedId);
}

// The bed's colour on the map: open / staked / short / done.
async function mapStateFor(page, bedId) {
  return page.evaluate((id) => {
    const bed = BEDS.filter((b) => b.bed === id)[0];
    planted[bedKey(bed.bed)] = true; // a bed only reads short/done once planted
    return bedMapState(bed);
  }, bedId);
}

// Start each test from a clean slate -- these globals persist across evaluates.
async function resetCounts(page) {
  await page.evaluate(() => {
    Object.keys(state).forEach((k) => { state[k] = 0; });
    Object.keys(owed).forEach((k) => { delete owed[k]; });
    Object.keys(planted).forEach((k) => { delete planted[k]; });
    Object.keys(staked).forEach((k) => { delete staked[k]; });
  });
}

module.exports = {
  APP, loadApp, openJob, setReceived, setRawCount,
  outstandingFor, mapStateFor, resetCounts,
};
