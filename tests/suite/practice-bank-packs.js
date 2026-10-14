const { chromium } = require('playwright'); const fs = require('fs'); const path = require('path');
const U = '__CW_APP__';
const dir = __dirname + '/pn1'; fs.rmSync(dir, { recursive: true, force: true });
const PK = __dirname + '/packs'; const files = fs.readdirSync(PK).filter(f => f.endsWith('.json')).sort();
const errs = []; const txt = async p => (await p.locator('main').innerText());
(async () => {
  let ctx = await chromium.launchPersistentContext(dir, { viewport: { width: 1024, height: 1200 }, acceptDownloads: true });
  let p = ctx.pages()[0]; p.on('pageerror', e => errs.push(e.message)); p.on('dialog', d => d.accept());
  await p.goto(U); await p.waitForTimeout(1500); await p.click('[data-action="ob-skip"]'); await p.waitForTimeout(300);
  await p.goto(U + '#/exams'); await p.waitForTimeout(500); const cardsBefore = await p.locator('.exam-card').count();
  console.log('0 exam cards before packs:', cardsBefore);
  const t0 = Date.now(); let okAll = true;
  for (const f of files) {
    await p.goto(U + '#/packs'); await p.waitForTimeout(250);
    const [fc] = await Promise.all([p.waitForEvent('filechooser'), p.click('[data-action="p8-file"]')]); await fc.setFiles(path.join(PK, f)); await p.waitForTimeout(400);
    const chip = await p.locator('.pk-preview .chip').innerText();
    const row = (await p.locator('.pk-preview tbody tr').first().innerText()).replace(/\t/g, ' ');
    const prof = (await p.locator('.pk-preview tbody tr').nth(3).innerText()).replace(/\t/g, ' ');
    const ok = chip === 'Checksum verified' && /Questions 200 0 0 0 0/.test(row);
    okAll = okAll && ok;
    console.log('1', f.replace('-practice-2026.10.1.json', ''), '|', chip, '|', row, '|', prof, ok ? '' : '  <-- CHECK');
    await p.click('[data-action="p8-merge"]'); await p.waitForTimeout(500);
  }
  console.log('  all 15 verified and merged:', okAll, '| seconds:', Math.round((Date.now() - t0) / 1000));
  await p.goto(U + '#/packs'); await p.waitForTimeout(400); let t = await txt(p);
  console.log('2 installed rows:', await p.locator('#h-pk-i').locator('xpath=..').locator('tbody tr').count(), '|', (t.match(/\d+ questions, \d+ lessons[^\n]*/) || ['?'])[0]);
  console.log('3 drafts section:', (t.match(/Your packs hold[^\n]*/) || ['missing'])[0]);
  console.log('  checkbox checked:', await p.locator('#pk-drafts').isChecked());
  await p.goto(U + '#/exams'); await p.waitForTimeout(400); console.log('4 exam cards with drafts off:', await p.locator('.exam-card').count());
  await p.goto(U + '#/packs'); await p.waitForTimeout(300);
  await p.locator('#pk-drafts').check(); await p.waitForTimeout(500);
  console.log('5 after toggle: checked', await p.locator('#pk-drafts').isChecked(), '| focus on toggle:', await p.evaluate(() => document.activeElement && document.activeElement.id));
  await p.goto(U + '#/exams'); await p.waitForTimeout(600); const cardsOn = await p.locator('.exam-card').count();
  console.log('6 exam cards with drafts on:', cardsOn, '(+' + (cardsOn - cardsBefore) + ')');
  const clf = (await p.locator('.exam-card', { hasText: 'Cloud Practitioner' }).innerText()).split('\n').slice(0, 5).join(' / ');
  console.log('  CLF card:', clf);
  // exam setup weights
  for (const code of ['CLF-C02', 'AZ-900', 'PCSE', 'TF-004', 'PDE']) {
    await p.goto(U + '#/exams'); await p.waitForTimeout(300);
    await p.click(`[data-action="exam-setup"][data-exam="${code}"]`); await p.waitForTimeout(500); t = await txt(p);
    const side = (await p.locator('main section.card').nth(1).innerText()).replace(/\n+/g, ' / ').slice(0, 260);
    console.log('7', code, '|', (t.match(/\d+ questions eligible\.[^\n]*/) || ['?'])[0], '\n   setup:', (await p.locator('main section.card').first().innerText()).replace(/\n+/g, ' / ').slice(0, 260), '\n   blueprint:', side);
  }
  // start a CLF exam, answer one, look for draft label
  await p.goto(U + '#/exams'); await p.waitForTimeout(300); await p.click('[data-action="exam-setup"][data-exam="CLF-C02"]'); await p.waitForTimeout(400);
  if (await p.locator('[data-action="p4-kind"][data-v="custom"]').count()) { await p.click('[data-action="p4-kind"][data-v="custom"]'); await p.waitForTimeout(300); }
  await p.fill('#x4-count', '10'); await p.locator('#x4-count').dispatchEvent('change'); await p.waitForTimeout(200); await p.click('[data-action="p4-start"]'); await p.waitForTimeout(800);
  t = await txt(p); console.log('8 runner draft chip:', /Draft pr/.test(t), '|', (t.match(/Question 1 of \d+/) || ['?'])[0]);
  await p.keyboard.press('1'); await p.waitForTimeout(300);
  // practice (study) count
  await p.goto(U + '#/content'); await p.waitForTimeout(700); t = await txt(p); console.log('9 content review:', (t.match(/Review status:[^\n]*/) || ['?'])[0].slice(0, 140));
  // reload persistence
  await ctx.close(); ctx = await chromium.launchPersistentContext(dir, { viewport: { width: 1024, height: 1200 } }); p = ctx.pages()[0]; p.on('pageerror', e => errs.push(e.message));
  await p.goto(U + '#/packs'); await p.waitForTimeout(2500);
  console.log('10 after reload: toggle', await p.locator('#pk-drafts').isChecked(), '| installed', await p.locator('#h-pk-i').locator('xpath=..').locator('tbody tr').count());
  await p.goto(U + '#/exams'); await p.waitForTimeout(600); console.log('   exam cards:', await p.locator('.exam-card').count());
  await p.goto(U + '#/about'); await p.waitForTimeout(400); console.log('11 version:', ((await txt(p)).match(/V1[0-9][^\n·]*/) || ['?'])[0]);
  // toggle off again
  await p.goto(U + '#/packs'); await p.waitForTimeout(400); await p.locator('#pk-drafts').uncheck(); await p.waitForTimeout(400);
  await p.goto(U + '#/exams'); await p.waitForTimeout(500); console.log('12 cards after toggle off:', await p.locator('.exam-card').count());
  // phone width overflow on packs page
  await p.setViewportSize({ width: 390, height: 900 }); await p.goto(U + '#/packs'); await p.waitForTimeout(500);
  console.log('13 overflow at 390:', await p.evaluate(() => document.documentElement.scrollWidth - innerWidth));
  await p.screenshot({ path: __dirname + '/packs390.png', fullPage: false });
  console.log('errors:', errs.length ? errs : 'none');
  await ctx.close();
})();
