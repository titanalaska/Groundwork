// The 1x zoom hint: how much ground one pixel covers.
//
// It said 1.6 in everywhere -- Home2Suites' figure. On WSRCC that is twice too
// coarse on a bed picture. Worked on paper from tools/wsrcc-pills.py and the
// drawn bar (3.6 pt = 1 ft):
//   bed crop / strip: 1500 px over 360 pt = 4.167 px/pt -> 15.0 px/ft -> 0.8 in
//   site map:         4013 px over 2100 pt = 1.911 px/pt -> 6.88 px/ft -> 1.7 in

const { test, expect } = require('@playwright/test');
const { loadApp, openJob } = require('./helpers');

async function hintAt1x(page, src) {
  return page.evaluate(async (s) => {
    showLightbox(s, '');
    const img = document.getElementById('lbImg');
    await new Promise((r) => (img.complete && img.naturalWidth ? r() : (img.onload = r)));
    lbZoom = '1';
    applyZoom();
    return document.getElementById('lbHint').textContent;
  }, src);
}

test.beforeEach(async ({ page }) => { await loadApp(page); });

test('WSRCC bed picture: 0.8 in a pixel', async ({ page }) => {
  await openJob(page, 'wsrcc');
  expect(await hintAt1x(page, './beds-wsrcc/v3/B03.jpg')).toContain('about 0.8 in');
});

test('WSRCC whole-run strip: 0.8 in a pixel', async ({ page }) => {
  await openJob(page, 'wsrcc');
  expect(await hintAt1x(page, './beds-wsrcc/v3/B05-run.jpg')).toContain('about 0.8 in');
});

test('WSRCC site map: 1.7 in a pixel', async ({ page }) => {
  await openJob(page, 'wsrcc');
  expect(await hintAt1x(page, './beds-wsrcc/v3/site-map.jpg')).toContain('about 1.7 in');
});

test('Home2Suites keeps its 1.6 in', async ({ page }) => {
  await openJob(page, 'h2s');
  expect(await hintAt1x(page, './beds/B03.jpg')).toContain('about 1.6 in');
});

// Double-tap. It went Fit -> 2x, and 2x counts the DRAWING's pixels, not the
// screen's: a 1500 px bed picture on a 375 px phone is 4x Fit at "1x", so 2x
// was 8x what the eye had just seen (21x on the site map). Matt, 9/28/26:
// "2x is too strong". Double-tap now goes to 1x; the buttons are unchanged.
test('double-tap steps Fit -> 1x -> Fit, never straight to 2x', async ({ page }) => {
  await openJob(page, 'h2s');
  const steps = await page.evaluate(async () => {
    showLightbox('./beds/B03.jpg', '');
    const img = document.getElementById('lbImg');
    await new Promise((r) => (img.complete && img.naturalWidth ? r() : (img.onload = r)));
    const out = [lbZoom];
    img.dispatchEvent(new MouseEvent('dblclick', { bubbles: true }));
    out.push(lbZoom, document.querySelector('.lb-z.on').dataset.z);
    img.dispatchEvent(new MouseEvent('dblclick', { bubbles: true }));
    out.push(lbZoom);
    return out;
  });
  expect(steps[0], 'a picture opens at Fit').toBe('fit');
  expect(steps[1], 'one double-tap lands on 1x').toBe('1');
  expect(steps[2], 'and the 1x button lights up to say so').toBe('1');
  expect(steps[3], 'a second double-tap goes back to Fit').toBe('fit');
});
