// Every control on a plant row has to be reachable on a phone.
//
// This app is used outdoors on a phone, and this exact class of bug has landed
// here before -- there is a whole commit called "Stop the bed rows clipping
// their right edge on a phone". It came back the moment two independent pieces
// of work met: the SHORT 88 flag and the Pull button were each fine alone, and
// together they pushed Pull 18px off the edge of the row where nobody could
// tap it.
//
// Neither change was wrong. Nothing but a test at phone width catches it.

const { test, expect } = require('@playwright/test');
const { loadApp, resetCounts } = require('./helpers');

// A real phone, and a small one. If it fits here it fits on Matt's S25.
const PHONE = { width: 375, height: 812 };
// The office TV. The counter must NOT wrap here -- the wide layout was tuned
// deliberately and a stray wrap would undo it.
const TV = { width: 1920, height: 1080 };

async function auditRows(page) {
  return page.evaluate(() => {
    currentJob = 'h2s';
    applyJobData();
    view = 'species';
    renderAll();

    const rows = [...document.querySelectorAll('.item')];
    const over = [];
    let wrapped = 0;

    rows.forEach((r) => {
      const rr = r.getBoundingClientRect();
      const info = r.querySelector('.item-info').getBoundingClientRect();
      const counter = r.querySelector('.counter').getBoundingClientRect();
      if (counter.top >= info.bottom - 1) wrapped++;

      r.querySelectorAll('.counter button, .item-flag').forEach((el) => {
        const b = el.getBoundingClientRect();
        const spill = Math.round(b.right - rr.right);
        if (spill > 0) {
          over.push({
            row: r.querySelector('.item-name').textContent,
            control: el.getAttribute('aria-label') || el.textContent.trim(),
            spill,
          });
        }
      });
    });

    return {
      rows: rows.length,
      wrapped,
      over,
      hScroll: document.documentElement.scrollWidth > window.innerWidth,
    };
  });
}

test('nothing on a plant row hangs off the edge on a phone', async ({ page }) => {
  await page.setViewportSize(PHONE);
  await loadApp(page);
  await resetCounts(page);

  const a = await auditRows(page);
  expect(a.rows, 'no rows rendered, so nothing was actually checked').toBeGreaterThan(5);
  expect(
    a.over,
    `controls hanging off the right edge of their row at ${PHONE.width}px: ` +
    JSON.stringify(a.over, null, 1) + ' -- these cannot be tapped.'
  ).toEqual([]);
  expect(a.hScroll, 'the page must not scroll sideways on a phone').toBe(false);
});

test('the row wraps on a phone rather than shrinking the controls', async ({ page }) => {
  // The controls are tapped outdoors, often with gloves. Making them smaller to
  // fit is the wrong fix, so the counter is expected to drop to its own line.
  await page.setViewportSize(PHONE);
  await loadApp(page);
  await resetCounts(page);

  const a = await auditRows(page);
  expect(
    a.wrapped,
    'at phone width the counter should sit below the name, not beside it'
  ).toBe(a.rows);
});

test('the office TV still gets one line per row', async ({ page }) => {
  await page.setViewportSize(TV);
  await loadApp(page);
  await resetCounts(page);

  const a = await auditRows(page);
  expect(
    a.wrapped,
    `${a.wrapped} of ${a.rows} rows wrapped at ${TV.width}px. The wide layout ` +
    `is read from across the office and was tuned to fit on one line.`
  ).toBe(0);
  expect(a.over).toEqual([]);
});
