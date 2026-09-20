// generateReport() -- the summary that goes to Chris.
//
// It walks BOTH jobs in one pass, but the globals it leans on (SPECIES,
// SPECIES_ALIAS, the CODE_ROW cache) follow whichever tab happens to be open.
// The author knew the Home2Suites branch was exposed and passed the job in
// explicitly:
//
//     var o = bedOutstanding(b, "h2s");
//
// That fixes the COUNT lookup. It does not fix codeRow(), which still resolves
// against the open tab -- so a species that exists in Home2Suites and not in
// WSRCC returns no row and is dropped by `if(!row) return;`, without a word.

const { test, expect } = require('@playwright/test');
const { loadApp, resetCounts } = require('./helpers');

test.beforeEach(async ({ page }) => {
  await loadApp(page);
  await resetCounts(page);
});

test('switching jobs rebuilds the code-to-row map', async ({ page }) => {
  // Codes are resolved against the open job's checklist and cached. The cache
  // is invalidated two ways -- codeRow() compares the cached job to the open
  // one, and applyJobData() nulls it outright -- so this holds even if one of
  // those is removed. It is what stopped every WSRCC code being answered with
  // a Home2Suites row.
  const resolved = await page.evaluate(() => {
    currentJob = 'wsrcc';
    applyJobData();
    const wsrccOnly = codeRow('CAO');            // Overdam Reed Grass, WSRCC only
    currentJob = 'h2s';
    applyJobData();
    const h2sOnly = codeRow('JH');               // a Home2Suites-only code
    const staleWsrcc = codeRow('CAO');           // must NOT resolve under h2s
    return {
      wsrccOnly: wsrccOnly ? wsrccOnly[0] : null,
      h2sOnly: h2sOnly ? h2sOnly[0] : null,
      staleWsrcc: staleWsrcc ? staleWsrcc[0] : null,
    };
  });

  expect(resolved.wsrccOnly, 'CAO should resolve while WSRCC is open').toBeTruthy();
  expect(
    resolved.h2sOnly,
    `after switching to Home2Suites, its own codes must resolve. Got ` +
    `${JSON.stringify(resolved)} -- the previous job's checklist is still cached.`
  ).toBeTruthy();
});

test('a bed can be asked about by job, whatever tab is open', async ({ page }) => {
  // generateReport() walks Home2Suites beds while the globals follow the open
  // tab, and passes the job in explicitly to compensate. If that argument is
  // ignored, the counts come from the wrong job.
  const { withArg, expected } = await page.evaluate(() => {
    // The WSRCC tab is OPEN while we ask about a Home2Suites bed -- which is
    // the only arrangement where the job argument can matter at all. Asking
    // about h2s while h2s is open proves nothing.
    currentJob = 'wsrcc';
    applyJobData();

    // A Home2Suites bed whose codes also exist in WSRCC, so they still resolve
    // to a row and the count lookup is what is actually under test.
    const shared = ['AP', 'CS', 'BP', 'PTE', 'CAK'];
    const bed = H2S.beds.filter((b) =>
      Object.keys(b.items).length && Object.keys(b.items).every((c) => shared.indexOf(c) >= 0)
    )[0];
    const codes = Object.keys(bed.items);

    // Home2Suites has received nothing. WSRCC is full.
    codes.forEach((c) => {
      const row = codeRow(c);
      if (!row) return;
      state['h2s:' + slug(row[0])] = 0;
      state['wsrcc:' + slug(row[0])] = 99;
    });

    const out = bedOutstanding(bed, 'h2s').map((o) => o.code).sort();
    return { withArg: out, expected: codes.filter((c) => codeRow(c)).sort() };
  });

  expect(
    withArg,
    `Home2Suites received nothing, so this bed owes everything in it. Got ` +
    `${JSON.stringify(withArg)}. The job argument is being ignored and WSRCC's ` +
    `stock is answering for Home2Suites.`
  ).toEqual(expected);
});

test('every Home2Suites code resolves while the H2S tab is open', async ({ page }) => {
  // The normal case, and it is fine. This is here so the fixme below is
  // clearly about the cross-job path and not about code resolution generally.
  const unresolved = await page.evaluate(() => {
    currentJob = 'h2s';
    applyJobData();
    const missing = new Set();
    H2S.beds.forEach((b) => {
      Object.keys(b.items).forEach((c) => { if (!codeRow(c)) missing.add(c); });
    });
    return [...missing];
  });

  expect(unresolved, `these H2S codes do not resolve to a checklist row at all`).toEqual([]);
});

test('every Home2Suites code resolves while the WSRCC tab is open', async ({ page }) => {
  // Was broken until 2026-09-19: 17 Home2Suites codes vanished and 36 of the
  // 44 H2S beds were affected, silently, in the report Chris reads.
  // codeRow(code, job) now resolves against a named job.
  const unresolved = await page.evaluate(() => {
    currentJob = 'wsrcc';
    applyJobData();
    const missing = new Set();
    H2S.beds.forEach((b) => {
      Object.keys(b.items).forEach((c) => { if (!codeRow(c, 'h2s')) missing.add(c); });
    });
    return [...missing];
  });

  expect(
    unresolved,
    `generateReport() walks Home2Suites beds whatever tab is open. These codes ` +
    `resolve to nothing and are silently dropped from the report Chris reads.`
  ).toEqual([]);
});

test('a bed reports the same thing whichever tab happens to be open', async ({ page }) => {
  // The whole point of the job argument: generateReport() asks about
  // Home2Suites beds from wherever the user left the app. The answer must not
  // depend on that.
  const { fromH2S, fromWSRCC, bed } = await page.evaluate(() => {
    const read = (openTab) => {
      currentJob = openTab;
      applyJobData();
      const b = H2S.beds.filter((x) => Object.keys(x.items).length >= 2)[0];
      return {
        bed: b.bed,
        out: bedOutstanding(b, 'h2s').map((o) => o.code).sort(),
      };
    };
    // Home2Suites has received nothing, so every code in the bed is owed.
    currentJob = 'h2s';
    applyJobData();
    H2S.beds.forEach((b) => {
      Object.keys(b.items).forEach((c) => {
        const row = codeRow(c, 'h2s');
        if (row) state['h2s:' + slug(row[0])] = 0;
      });
    });

    const a = read('h2s');
    const z = read('wsrcc');
    return { fromH2S: a.out, fromWSRCC: z.out, bed: a.bed };
  });

  expect(
    fromWSRCC,
    `bed ${bed} reported ${JSON.stringify(fromH2S)} with the Home2Suites tab ` +
    `open and ${JSON.stringify(fromWSRCC)} with WSRCC open. Which tab someone ` +
    `left the app on must not change what a bed is owed.`
  ).toEqual(fromH2S);
});
