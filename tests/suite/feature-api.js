/* Builds a throwaway copy of the app with a small test feature, then checks that registerFeature
 * wires its nav entry, view, action, text input, CSS, boot hook, saving and workspace-import merge. */
const { chromium } = require('playwright'); const fs = require('fs'); const path = require('path'); const { execFileSync } = require('child_process');
const ROOT = process.env.CW_ROOT; const work = path.join(__dirname, 'feature-api-src'); fs.rmSync(work, { recursive: true, force: true }); fs.cpSync(path.join(ROOT, 'src'), work, { recursive: true });
fs.writeFileSync(path.join(work, 'js/features/990-hello.js'), `registerFeature({
  id: 'hello', css: '.hello-box{border:2px dashed currentColor;padding:12px}',
  views: { hello: () => { const h = S.ws.hello ||= { count: 0, updated: 0 }; return \`<div class="page-head"><div><h1>Hello feature</h1></div></div><div class="card hello-box"><p id="hello-n">Count: \${h.count}</p><button class="btn primary" data-action="hello-add">Add one</button><input type="text" id="hello-name" aria-label="Name" data-input="hello-name" value="\${esc(h.name || '')}"><input type="checkbox" id="hello-ok" aria-label="OK" data-input="hello-ok" \${h.ok ? 'checked' : ''}></div>\`; } },
  nav: [{ route: 'hello', label: 'Hello test', group: 'Certify', after: 'study', icon: '<circle cx="12" cy="12" r="8"/>' }],
  actions: { 'hello-add': () => { const h = S.ws.hello ||= { count: 0, updated: 0 }; h.count++; h.updated = Date.now(); markDirty(); persistSoon(SAVE_QUICK); render(); } },
  inputs: { 'hello-name': (d, el) => { const h = S.ws.hello; h.name = el.value; h.edits = (h.edits || 0) + 1; window.__helloEdits = h.edits; h.updated = Date.now(); markDirty(); persistSoon(SAVE_QUICK); }, 'hello-ok': (d, el) => { const h = S.ws.hello; h.ok = el.checked; h.toggles = (h.toggles || 0) + 1; window.__helloToggles = h.toggles; markDirty(); persistSoon(SAVE_QUICK); } },
  onBoot() { window.__helloBooted = true; },
  mergeImport(w) { if (w.hello && (w.hello.updated || 0) > ((S.ws.hello || {}).updated || 0)) S.ws.hello = w.hello; }
});
registerFeature({ id: 'clash', views: { settings: () => 'hijacked' } });
registerFeature({ id: 'badaction', actions: { go: () => {} } });
registerFeature({ id: 'badinput', inputs: { note: () => {} } });\n`);
const man = JSON.parse(fs.readFileSync(path.join(work, 'manifest.json'))); man.js.splice(man.js.indexOf('js/boot.js'), 0, 'js/features/990-hello.js'); fs.writeFileSync(path.join(work, 'manifest.json'), JSON.stringify(man, null, 2));
const out = path.join(__dirname, 'feature-api-app.html'); execFileSync('node', [path.join(ROOT, 'build.js'), '--src', work, '--out', out], { stdio: 'ignore' });
const U = 'file://' + out; const dir = path.join(__dirname, 'pfeature'); fs.rmSync(dir, { recursive: true, force: true }); const errs = [];
(async () => {
  let ctx = await chromium.launchPersistentContext(dir, { viewport: { width: 1200, height: 900 } }); let p = ctx.pages()[0]; p.on('pageerror', e => errs.push(e.message)); const consoleErrs = []; p.on('console', m => { if (m.type() === 'error') consoleErrs.push(m.text()); });
  await p.goto(U); await p.waitForTimeout(1500); await p.click('[data-action="ob-skip"]');
  const nav = (await p.locator('#nav').innerText()).split('\n').filter(Boolean); console.log('1 nav: after Study comes', JSON.stringify(nav[nav.indexOf('Study') + 1]), '| boot hook ran:', await p.evaluate(() => window.__helloBooted === true));
  console.log('1b refused features:', consoleErrs.filter(x => /registerFeature/.test(x)).map(x => x.replace(/ The feature.*$/, '')).join(' | '));
  await p.goto(U + '#/settings'); await p.waitForTimeout(300); console.log('1c settings page intact:', !/hijacked/.test(await p.locator('main').innerText()));
  await p.click('#nav a[href="#/hello"]'); await p.waitForTimeout(300);
  for (let i = 0; i < 3; i++) { await p.click('[data-action="hello-add"]'); await p.waitForTimeout(150); }
  console.log('2 view and action:', await p.locator('#hello-n').innerText(), '| css:', await p.locator('.hello-box').evaluate(e => getComputedStyle(e).borderStyle), '| current nav:', await p.locator('#nav a[href="#/hello"]').getAttribute('aria-current'));
  await p.fill('#hello-name', ''); await p.type('#hello-name', 'abc'); await p.click('#hello-ok'); await p.waitForTimeout(150);
  console.log('2b text input: focus on', await p.evaluate(() => document.activeElement.id), '| handler calls for 3 keystrokes:', await p.evaluate(() => window.__helloEdits), '| checkbox handled once:', await p.evaluate(() => window.__helloToggles));
  await p.waitForTimeout(1800); await ctx.close();
  ctx = await chromium.launchPersistentContext(dir, { viewport: { width: 1200, height: 900 } }); p = ctx.pages()[0]; p.on('pageerror', e => errs.push(e.message));
  await p.goto(U + '#/hello'); await p.waitForTimeout(2500); console.log('3 saved across reload:', await p.locator('#hello-n').innerText(), '| name:', await p.inputValue('#hello-name'), '| checked:', await p.isChecked('#hello-ok'));
  const ws = JSON.stringify({ format: 'cloudwalker-workspace', version: 4, workspace: { hello: { count: 42, updated: Date.now() + 1000 } } });
  await p.goto(U + '#/settings'); await p.waitForTimeout(500);
  await p.evaluate(txt => { const inp = document.querySelector('#fileWorkspace'); const dt = new DataTransfer(); dt.items.add(new File([txt], 'ws.json', { type: 'application/json' })); inp.files = dt.files; inp.dispatchEvent(new Event('change', { bubbles: true })); }, ws);
  await p.waitForTimeout(1200); await p.goto(U + '#/hello'); await p.waitForTimeout(400); console.log('4 import merge (newer wins):', await p.locator('#hello-n').innerText());
  console.log('errors:', errs.length ? errs : 'none'); await ctx.close();
})();
