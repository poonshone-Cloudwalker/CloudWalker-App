const { chromium } = require('playwright');
const U9 = '__CW_APP__';
const errs = [];
(async () => {
  const b = await chromium.launch();
  const p = await (await b.newContext({ viewport: { width: 900, height: 1100 } })).newPage();
  p.on('pageerror', e => errs.push(e.message));
  let native = 0; p.on('dialog', d => { native++; d.dismiss(); });
  await p.goto(U9 + '#/settings'); await p.waitForTimeout(1200);

  const press = () => p.evaluate(() => { const bt = document.createElement('button'); bt.dataset.action = 'reset'; bt.id = 'tmpReset'; document.body.append(bt); bt.click(); bt.remove(); });
  await press(); await p.waitForTimeout(200);
  console.log('1 confirm modal opens (no native dialog):', await p.locator('#dlg4[open]').count() === 1, native === 0);
  console.log('2 modal title:', await p.locator('#dlg4-t').innerText());
  await p.click('#dlg4-cancel'); await p.waitForTimeout(150);
  console.log('3 cancel closes it:', await p.locator('#dlg4[open]').count() === 0);
  await press(); await p.waitForTimeout(150); await p.click('#dlg4-ok'); await p.waitForTimeout(500);
  console.log('4 confirm runs the reset:', (await p.locator('main .notice').first().innerText().catch(() => '')).includes('Runtime session reset'));

  console.log('5 diagnostics card present:', await p.locator('#diagCard').count() === 1);
  console.log('6 diagnostics says nothing failed quietly:', (await p.locator('#diagCard').innerText()).includes('nothing to report'));
  console.log('7 AI tab-only option present:', await p.locator('#ai-session').count() === 1);
  console.log('8 native dialogs:', native);
  console.log('errors:', errs.length ? errs : 'none');
  await b.close();
})();
