/* Flashcards (src/js/features/400-flashcards.js) in the real build: nav entry, deck counts per certification,
 * keyboard flip and grading, Again returning in the same session, saving across a restart, and import merge. */
const { chromium } = require('playwright'); const fs = require('fs'); const path = require('path');
const U = '__CW_APP__'; const dir = path.join(__dirname, 'pflashcards'); fs.rmSync(dir, { recursive: true, force: true }); const errs = [];
const counts = async p => ['new', 'learning', 'known'].map(k => k).join('/') + ' = ' + (await Promise.all(['new', 'learning', 'known'].map(k => p.locator('#fc-n-' + k).innerText()))).join('/');
const card = async p => `${(await p.locator('#fc-pos').innerText())} | ${(await p.locator('#fc-term').innerText())}`;
(async () => {
  let ctx = await chromium.launchPersistentContext(dir, { viewport: { width: 1024, height: 1000 } }); let p = ctx.pages()[0];
  p.on('pageerror', e => errs.push(e.message)); p.on('console', m => { if (m.type() === 'error' && !/Failed to load resource/.test(m.text())) errs.push(m.text()); }); /* web fonts may be blocked offline */
  await p.goto(U); await p.waitForTimeout(1500); await p.click('[data-action="ob-skip"]');
  const nav = await p.evaluate(() => [...document.querySelectorAll('#nav a')].map(a => [a.getAttribute('href'), a.textContent.trim()]));
  const at = nav.findIndex(n => n[0] === '#/study'); console.log('1 nav: after Study comes', JSON.stringify(nav[at + 1]));

  await p.click('#nav a[href="#/flashcards"]'); await p.waitForTimeout(300);
  console.log('2 deck, all certifications:', await counts(p), '|', await p.locator('#fc-summary').innerText());
  await p.click('[data-action="flashcards-exam"][data-exam="CDL"]'); await p.waitForTimeout(300);
  console.log('3 deck, CDL:', await counts(p), '| pressed:', await p.locator('[data-action="flashcards-exam"][aria-pressed="true"]').innerText(), '| focus kept on chip:', await p.evaluate(() => document.activeElement.dataset.exam), '| list items:', await p.locator('.fc-list li').count());
  await p.click('[data-action="flashcards-start"]'); await p.waitForTimeout(400);
  console.log('4 study:', await p.evaluate(() => location.hash), '|', await card(p), '| progress', await p.locator('.fc-progress').getAttribute('aria-valuenow'));
  const first = await p.locator('#fc-term').innerText();

  /* keyboard only: flip, then Tab to the first grade (Again) and press Enter */
  await p.focus('#fc-flip'); await p.keyboard.press('Enter'); await p.waitForTimeout(200);
  console.log('5 flipped by keyboard: focus on', await p.evaluate(() => document.activeElement.id), '| definition shown:', await p.locator('.fc-def').isVisible());
  await p.keyboard.press('Tab'); console.log('  Tab reaches:', await p.evaluate(() => document.activeElement.textContent.split(':')[0]));
  await p.keyboard.press('Enter'); await p.waitForTimeout(200);
  console.log('6 after Again:', await card(p), '| focus on', await p.evaluate(() => document.activeElement.id));
  for (const g of ['good', 'easy', 'hard']) { await p.click('#fc-flip'); await p.click(`[data-action="flashcards-grade"][data-grade="${g}"]`); await p.waitForTimeout(120); }
  const back = await p.locator('#fc-term').innerText(); console.log('7 card 5 is the missed term again:', back === first, '|', await card(p));
  await p.click('#fc-flip'); await p.click('[data-action="flashcards-grade"][data-grade="good"]'); await p.waitForTimeout(150);

  await p.setViewportSize({ width: 390, height: 900 }); await p.waitForTimeout(150);
  console.log('8 phone width: overflow', await p.evaluate(() => document.documentElement.scrollWidth - innerWidth), '| grade grid columns after flip:', (await (async () => { await p.click('#fc-flip'); return p.locator('.fc-grade-row').evaluate(e => getComputedStyle(e).gridTemplateColumns.split(' ').length); })()));
  await p.setViewportSize({ width: 1024, height: 1000 });
  await p.goto(U + '#/flashcards'); await p.waitForTimeout(300); console.log('9 deck after 5 grades:', await counts(p), '|', await p.locator('#fc-summary').innerText());
  const ids = await p.evaluate(() => [...document.querySelectorAll('.fc-list li')].filter(li => /Learning/.test(li.textContent)).map(li => decodeURIComponent(li.querySelector('a').getAttribute('href').split('/').pop())));
  await p.waitForTimeout(1800); await ctx.close();

  ctx = await chromium.launchPersistentContext(dir, { viewport: { width: 1024, height: 1000 } }); p = ctx.pages()[0]; p.on('pageerror', e => errs.push(e.message));
  await p.goto(U + '#/flashcards'); await p.waitForTimeout(2500);
  console.log('10 after restart:', await counts(p), '| exam kept:', await p.locator('[data-action="flashcards-exam"][aria-pressed="true"]').innerText());

  /* import: one card newer (moves to the 14-day step, so known), one card older (ignored), an older exam choice (ignored) */
  const now = Date.now(); const ws = { format: 'cloudwalker-workspace', version: 4, workspace: { flashcards: { exam: 'ACE', updated: 1, cards: {
    [ids[0]]: { step: 4, due: now + 14 * 864e5, last: now, reviews: 9, lapses: 0, updated: now + 5000 },
    [ids[1]]: { step: 5, due: now + 30 * 864e5, last: 1, reviews: 1, lapses: 0, updated: 1 } } } } };
  await p.goto(U + '#/settings'); await p.waitForTimeout(400);
  await p.evaluate(txt => { const inp = document.querySelector('#fileWorkspace'); const dt = new DataTransfer(); dt.items.add(new File([txt], 'ws.json', { type: 'application/json' })); inp.files = dt.files; inp.dispatchEvent(new Event('change', { bubbles: true })); }, JSON.stringify(ws));
  await p.waitForTimeout(1200); await p.goto(U + '#/flashcards'); await p.waitForTimeout(300);
  console.log('11 after import merge:', await counts(p), '| exam still:', await p.locator('[data-action="flashcards-exam"][aria-pressed="true"]').innerText());
  console.log('errors:', errs.length ? errs : 'none'); await ctx.close();
})();
