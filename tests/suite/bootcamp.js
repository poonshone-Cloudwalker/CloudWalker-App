/* Bootcamp (src/js/features/410–490-bootcamp-*.js, src/content/bootcamp/) in the real build:
 *  1 one offline file: content embedded, nothing fetched      6 import into a fresh device; merge by lab id, newer wins
 *  2 content loads; 9 levels × (8 briefs + 1 exemplar)          7 malformed progress files fail clearly and change nothing
 *  3 exemplars are distinguishable from briefs                  8 malformed content: build stops (bad JSON) or the pages
 *  4 the tracker record: status, scores, gate, evidence,          show the problem (bad structure) while the app keeps working
 *    text fields, keyboard focus, saving across a restart      9 recommendations from weak quiz domains and focus topics
 *  5 export JSON and tracker.csv; portfolio flag round trip   10 phone width */
const { chromium } = require('playwright'); const fs = require('fs'); const path = require('path'); const { execFileSync } = require('child_process');
const ROOT = process.env.CW_ROOT; const U = '__CW_APP__'; const APP = U.replace('file://', '');
const dirA = path.join(__dirname, 'pbootcamp-a'), dirB = path.join(__dirname, 'pbootcamp-b'); for (const d of [dirA, dirB]) fs.rmSync(d, { recursive: true, force: true });
const errs = []; const watch = p => { p.on('pageerror', e => errs.push(e.message)); p.on('console', m => { if (m.type() === 'error' && !/Failed to load resource/.test(m.text())) errs.push(m.text()); }); };
const txt = (p, s) => p.locator(s).innerText();
const pressed = (p, sel) => p.locator(sel + '[aria-pressed="true"]').allInnerTexts();
const importFile = (p, sel, text, name = 'in.json') => p.evaluate(([s, t, n]) => { const inp = document.querySelector(s); const dt = new DataTransfer(); dt.items.add(new File([t], n, { type: 'application/json' })); inp.files = dt.files; inp.dispatchEvent(new Event('change', { bubbles: true })); }, [sel, text, name]);
const go = async (p, h) => { await p.goto(U + h); await p.waitForTimeout(350); };

(async () => {
  /* 1. one offline file */
  const html = fs.readFileSync(APP, 'utf8');
  console.log('1 single file:', fs.readdirSync(path.dirname(APP)).filter(f => f.endsWith('.html')).length, 'html file | external scripts:', (html.match(/<script[^>]+src=/g) || []).length,
    '| bootcamp documents embedded:', (html.match(/const BC_[A-Z0-9_]+_?DOC = |const BC_LABS_0\d = /g) || []).length, '| lab ids embedded:', new Set(html.match(/"id": "(\d\.0[1-8]|E[1-9])"/g)).size);

  let ctx = await chromium.launchPersistentContext(dirA, { viewport: { width: 1280, height: 1000 }, acceptDownloads: true }); let p = ctx.pages()[0]; watch(p);
  const remote = []; p.on('request', r => { const u = r.url(); if (!u.startsWith('file:') && !u.startsWith('data:') && !u.startsWith('blob:') && !/fonts\.(googleapis|gstatic)\.com|api\.fontshare\.com/.test(u)) remote.push(u); }); /* the app's web fonts are optional and fall back offline */
  await p.goto(U); await p.waitForTimeout(1500); await p.click('[data-action="ob-skip"]');
  const nav = await p.evaluate(() => [...document.querySelectorAll('#nav a')].map(a => a.textContent.trim()));
  console.log('  nav: after', JSON.stringify(nav[nav.indexOf('Bootcamp') - 1]), 'comes "Bootcamp"');

  /* 2. content and counts */
  await p.click('#nav a[href="#/bootcamp"]'); await p.waitForTimeout(400);
  console.log('2 dashboard: labs', await txt(p, '#bc-n-total'), '| passed', await txt(p, '#bc-n-passed'), '| exemplars', (await txt(p, '#bc-n-ex')).replace(/\s+/g, ' '), '| next:', await txt(p, '#bc-next'));
  await go(p, '#/bootcamp/library');
  const per = await p.evaluate(() => [...document.querySelectorAll('.bc-level')].map(d => d.querySelectorAll('.bc-labrow').length + '/' + d.querySelectorAll('.bc-labrow.is-ex').length));
  console.log('  library: levels', per.length, '| rows per level (all/exemplar):', per.join(' '), '|', await txt(p, '#bc-shown'));
  console.log('  level 2 card:', (await p.locator('#bc-lv-2 summary').textContent()).replace(/\s+/g, ' ').trim(), '|', (await p.locator('#bc-lv-2 .bc-lvmeta p').allTextContents()).map(t => t.replace(/\s+/g, ' ').trim()).join(' | '), '| tools:', (await p.locator('#bc-lv-2 .bc-lvmeta .chip').allTextContents()).join(', '));
  const filt = async (k, v) => { await p.evaluate(() => { const d = document.querySelector('.bc-filters'); if (d) d.open = true; }); await p.click(`[data-action="bootcamp-filter"][data-k="${k}"][data-v="${v}"]`); await p.waitForTimeout(200); return (await txt(p, '#bc-shown')).replace('Showing ', '').replace(' labs.', ''); };
  const counts = [];
  for (const [k, v] of [['kind', 'exemplar'], ['kind', 'lab'], ['kind', ''], ['cloud', 'local-only'], ['cloud', 'optional-cloud'], ['cloud', ''], ['vendor', 'aws'], ['vendor', 'gcp'], ['vendor', 'azure'], ['vendor', 'multi-cloud'], ['vendor', 'local'], ['vendor', ''], ['domain', 'security'], ['domain', ''], ['portfolio', 'leadership']]) counts.push(`${k}=${v || 'all'}: ${await filt(k, v)}`);
  console.log('  filters:', counts.join(', '), '| focus stays on chip:', await p.evaluate(() => document.activeElement.dataset.v));
  await p.click('[data-action="bootcamp-filter-clear"]'); await p.waitForTimeout(200);

  /* 3. exemplar vs brief */
  await go(p, '#/bootcamp/lab/E1');
  console.log('3 exemplar E1:', await txt(p, '.bc-id'), '|', await txt(p, '#bc-lab-title'), '| chips:', (await p.locator('.page-head .bc-chips .chip').allInnerTexts()).join(', '), '| starter tree shown:', await p.locator('#bc-sec-starter pre').count(), '| deliverables:', await p.locator('#bc-sec-deliverables li').count());
  await go(p, '#/bootcamp/lab/1.04');
  console.log('  brief 1.04:', await txt(p, '.bc-id'), '|', await txt(p, '#bc-lab-title'), '| chips:', (await p.locator('.page-head .bc-chips .chip').allInnerTexts()).join(', '), '| starter tree shown:', await p.locator('#bc-sec-starter pre').count(), '| contract fallback for deliverables:', await p.locator('#bc-sec-deliverables .bc-contract').count());
  console.log('  sections:', (await p.locator('.bc-sec summary h2').allInnerTexts()).join(' / '));
  console.log('  failure drill:', (await txt(p, '#bc-sec-drill .bc-secbody')).split('\n')[0]);

  /* 4. the record, by keyboard and pointer */
  await p.focus('#bc-status-in-progress'); await p.keyboard.press('Enter'); await p.waitForTimeout(200);
  console.log('4 status by keyboard:', (await pressed(p, '.bc-stbtn')).join(), '| focus on', await p.evaluate(() => document.activeElement.id), '| started date set:', /^\d{4}-\d\d-\d\d$/.test(await p.inputValue('#bc-f-started')));
  for (const [d, v] of [['correctness', 4], ['security', 3], ['resilience', 3], ['operational_quality', 3], ['cost', 0], ['automation', 3], ['communication', 3]]) { await p.click(`#bc-sc-${d}-${v}`); await p.waitForTimeout(80); }
  console.log('  gate with cost 0:', (await txt(p, '#bc-gate')).split('\n').slice(0, 5).join(' | '));
  await p.click('#bc-sc-cost-3'); await p.click('#bc-ev-validation'); await p.waitForTimeout(150);
  console.log('  gate after cost 3 and validation ticked:', (await txt(p, '#bc-gate')).split('\n')[0], '| evidence count:', await txt(p, '#bc-ev-count'), '| focus on', await p.evaluate(() => document.activeElement.id));
  for (const k of ['code', 'tests', 'drill', 'adr', 'report', 'cleanup', 'sanitized']) await p.click('#bc-ev-' + k);
  await p.click('#bc-f-validation_command'); await p.keyboard.type('make validate'); await p.click('#bc-f-evidence_link'); await p.keyboard.type('levels/01-operator-foundations/labs/04-dns-investigation');
  await p.click('#bc-f-reviewer_notes'); await p.keyboard.type('Parser covers A, AAAA, CNAME, TXT, <b>NXDOMAIN</b>.');
  console.log('  typing keeps focus:', await p.evaluate(() => document.activeElement.id));
  await p.click('#bc-f-personal_notes'); await p.keyboard.type('Revisit stale-answer fixture.'); await p.click('#bc-f-cleanup'); await p.click('#bc-conf-high');
  await p.click('#bc-status-passed'); await p.waitForTimeout(150); await p.click('#bc-pf-portfolio-ready'); await p.waitForTimeout(150);
  console.log('  after passing:', (await pressed(p, '.bc-stbtn')).join(), '| gate:', (await txt(p, '#bc-gate')).split('\n')[0], '| evidence', await txt(p, '#bc-ev-count'), '| portfolio:', (await pressed(p, '[data-action="bootcamp-portfolio"]')).join(), '| completed date set:', /^\d{4}-\d\d-\d\d$/.test(await p.inputValue('#bc-f-completed')));
  await go(p, '#/bootcamp/lab/2.03'); await p.click('#bc-status-blocked'); await p.waitForTimeout(150);
  await go(p, '#/bootcamp');
  console.log('  dashboard passed/in progress/blocked:', (await Promise.all(['#bc-n-passed', '#bc-n-progress', '#bc-n-blocked'].map(s => txt(p, s)))).join('/'), '| incomplete:', (await txt(p, '#bc-open')).replace(/\n/g, ' '), '| portfolio-ready:', await txt(p, '#bc-ready'));
  console.log('  averages:', (await p.locator('#bc-avgs li').allInnerTexts()).map(t => t.replace(/\n/g, ' ')).join('; '));
  console.log('  activity:', (await p.locator('#bc-log li .small:not(.muted)').allInnerTexts()).slice(0, 4).join(' / '));
  await p.waitForTimeout(1800); await ctx.close();

  ctx = await chromium.launchPersistentContext(dirA, { viewport: { width: 1280, height: 1000 }, acceptDownloads: true }); p = ctx.pages()[0]; watch(p);
  await go(p, '#/bootcamp/lab/1.04'); await p.waitForTimeout(2000);
  console.log('  after restart:', (await pressed(p, '.bc-stbtn')).join(), '|', await p.inputValue('#bc-f-validation_command'), '|', await p.inputValue('#bc-f-reviewer_notes'), '| cleanup', await p.isChecked('#bc-f-cleanup'), '| evidence', await txt(p, '#bc-ev-count'));

  /* 5. export */
  await go(p, '#/bootcamp/tracker');
  const row = await p.locator('.bc-table tr', { has: p.locator('a[href="#/bootcamp/lab/1.04"]') }).innerText(); console.log('5 tracker row 1.04:', row.replace(/\s+/g, ' '));
  let [dl] = await Promise.all([p.waitForEvent('download'), p.click('#bc-export')]); const exportText = fs.readFileSync(await dl.path(), 'utf8'); const ex = JSON.parse(exportText); const r104 = ex.bootcamp.labs['1.04'];
  console.log('  export:', dl.suggestedFilename().replace(/\d{4}-\d\d-\d\d-\d\d-\d\d/, '<stamp>'), '| format', ex.format, 'v' + ex.version, '| labs saved', Object.keys(ex.bootcamp.labs).sort().join(','), '| 1.04:', r104.status, r104.score_correctness + r104.score_security + r104.score_resilience + r104.score_operations + r104.score_cost + r104.score_automation + r104.score_communication + '/28', r104.portfolio, 'portfolio_ready=' + r104.portfolio_ready, 'cleanup=' + r104.cleanup_verified, 'evidence', Object.values(r104.evidence).filter(Boolean).length, '| has timestamps:', r104.updated > 0 && /^\d{4}-/.test(r104.started));
  [dl] = await Promise.all([p.waitForEvent('download'), p.click('#bc-export-csv')]); const csv = fs.readFileSync(await dl.path(), 'utf8').split('\n');
  console.log('  tracker.csv:', dl.suggestedFilename(), '| rows', csv.filter(Boolean).length - 1, '| header', csv[0] === 'level,lab_id,status,started,completed,score_correctness,score_security,score_resilience,score_operations,score_cost,score_automation,score_communication,validation_command,evidence_link,cleanup_verified,reviewer_notes' ? 'matches the curriculum' : csv[0]);
  console.log('  csv 1.04:', csv.find(l => l.startsWith('1,04-')).replace(/\d{4}-\d\d-\d\d/g, '<date>'), '| csv E1:', csv.find(l => l.startsWith('1,exemplar/')));
  await ctx.close();

  /* 6. a second device: fresh profile, import, then merge rules */
  ctx = await chromium.launchPersistentContext(dirB, { viewport: { width: 1280, height: 1000 } }); p = ctx.pages()[0]; watch(p);
  await p.goto(U); await p.waitForTimeout(1500); await p.click('[data-action="ob-skip"]'); await go(p, '#/bootcamp/tracker');
  await importFile(p, '#bc-import-file', exportText); await p.waitForTimeout(600);
  console.log('6 import on a new device:', await txt(p, '#bc-import-result'));
  await go(p, '#/bootcamp/lab/1.04');
  console.log('  1.04 here:', (await pressed(p, '.bc-stbtn')).join(), '|', await p.inputValue('#bc-f-reviewer_notes'), '| portfolio', (await pressed(p, '[data-action="bootcamp-portfolio"]')).join(), '| notes escaped:', await p.locator('#bc-record b').count() === 0);
  const now = Date.now(); const merge = { format: 'cloudwalker-bootcamp-progress', version: 1, bootcamp: { labs: {
    '1.04': { status: 'rework', updated: r104.updated - 60000, reviewer_notes: 'older copy' },
    '2.03': { status: 'passed', updated: r104.updated + 60000, score_security: 4, future_field: { kept: true } },
    '3.01': { status: 'in-progress', updated: now, portfolio: 'public-safe' },
    '10.01': { status: 'in-progress', updated: now },
    '4.01': { status: 'done', updated: now }, '4.02': { status: 'passed', updated: now, score_cost: 7 } }, prefs: { focus_topics: ['networking'], updated: now }, extra_section: { from: 'newer app' } } };
  await go(p, '#/bootcamp/tracker'); await importFile(p, '#bc-import-file', JSON.stringify(merge)); await p.waitForTimeout(600);
  console.log('  merge:', (await txt(p, '#bc-import-result')).replace(/\n/g, ' | '));
  console.log('  1.04 kept (local newer):', (await p.locator('.bc-table tr', { has: p.locator('a[href="#/bootcamp/lab/1.04"]') }).innerText()).replace(/\s+/g, ' '));
  console.log('  2.03 taken (import newer):', (await p.locator('.bc-table tr', { has: p.locator('a[href="#/bootcamp/lab/2.03"]') }).innerText()).replace(/\s+/g, ' '));

  /* 7. malformed progress files */
  for (const [label, body] of [['not JSON', '{oops'], ['wrong format', JSON.stringify({ format: 'blueprint-progress', answers: {} })], ['newer version', JSON.stringify({ format: 'cloudwalker-bootcamp-progress', version: 9, bootcamp: { labs: {} } })], ['labs is a list', JSON.stringify({ format: 'cloudwalker-bootcamp-progress', version: 1, bootcamp: { labs: [] } })]]) {
    await importFile(p, '#bc-import-file', body); await p.waitForTimeout(400); console.log(`7 ${label}:`, await txt(p, '#bc-import-result'));
  }
  console.log('  nothing changed: 1.04', (await p.locator('.bc-table tr', { has: p.locator('a[href="#/bootcamp/lab/1.04"]') }).innerText()).split('\t')[2]);
  await go(p, '#/settings'); await p.waitForTimeout(300);
  [dl] = await Promise.all([p.waitForEvent('download'), p.locator('main [data-action="ws-export"]').first().click()]); const wsText = fs.readFileSync(await dl.path(), 'utf8'); const wsx = JSON.parse(wsText);
  console.log('  workspace export from Settings:', wsx.format, '| bootcamp labs inside:', Object.keys(wsx.workspace.bootcamp.labs).sort().join(','), '| unknown fields kept:', JSON.stringify(wsx.workspace.bootcamp.labs['2.03'].future_field), JSON.stringify(wsx.workspace.bootcamp.extra_section));

  await p.waitForTimeout(1600); await ctx.close();

  /* 9. recommendations from weak quiz domains */
  ctx = await chromium.launchPersistentContext(dirB, { viewport: { width: 1280, height: 1000 } }); p = ctx.pages()[0]; watch(p);
  await go(p, '#/settings'); await p.waitForTimeout(1500);
  const t0 = Date.UTC(2026, 8, 1); const answers = {}; ['aws-saa-c03-001', 'aws-saa-c03-002', 'aws-saa-c03-003', 'aws-saa-c03-004'].forEach((id, i) => { answers[id] = [{ t: t0 + i * 1000, choice: 9, correct: false, mode: 'study', ms: 1000 }]; });
  await importFile(p, '#fileWorkspace', JSON.stringify({ format: 'blueprint-progress', version: 1, answers })); await p.waitForTimeout(1000);
  await go(p, '#/bootcamp/recommend');
  console.log('9 weak areas:', (await p.locator('#bc-weak > li > p:first-child').allInnerTexts()).join(' | '));
  console.log('  topics:', (await p.locator('#bc-weak > li > p.small').first().innerText()), '| first labs:', (await p.locator('#bc-weak > li').first().locator('.bc-list a').allInnerTexts()).join(', '));
  console.log('  focus topics from import:', (await pressed(p, '[data-action="bootcamp-focus"]')).join());
  await p.click('#bc-focus-iam'); await p.waitForTimeout(200); console.log('  after picking Identity and access:', (await pressed(p, '[data-action="bootcamp-focus"]')).join(), '| focus on', await p.evaluate(() => document.activeElement.id), '| groups', await p.locator('#bc-focus-labs h3').allInnerTexts());
  await go(p, '#/bootcamp'); console.log('  dashboard suggestions:', (await p.locator('#bc-dash-recs a').allInnerTexts()).join(', '));
  await go(p, '#/bootcamp/lab/5.07'); console.log('  5.07 related certifications:', (await p.locator('#bc-certs li strong').allTextContents()).join(', '), '| weak areas it practises:', await p.locator('#bc-sec-quiz p.small').count());
  await go(p, '#/bootcamp/lab/2.03'); console.log('  2.03 (AWS-only) related certifications:', (await p.locator('#bc-certs li strong').allTextContents()).join(', '));

  /* 10. phone width */
  await p.setViewportSize({ width: 390, height: 900 });
  const over = []; for (const h of ['#/bootcamp', '#/bootcamp/library', '#/bootcamp/lab/E8', '#/bootcamp/tracker', '#/bootcamp/portfolio', '#/bootcamp/guide']) { await go(p, h); over.push(await p.evaluate(() => document.documentElement.scrollWidth - innerWidth)); }
  console.log('10 phone overflow on six pages:', over.join(','));
  await p.waitForTimeout(500); await ctx.close();

  /* workspace file into the first device: merged by lab id through registerFeature's mergeImport */
  ctx = await chromium.launchPersistentContext(dirA, { viewport: { width: 1280, height: 1000 } }); p = ctx.pages()[0]; watch(p);
  await go(p, '#/settings'); await p.waitForTimeout(1500); await importFile(p, '#fileWorkspace', wsText, 'ws.json'); await p.waitForTimeout(1200);
  await go(p, '#/bootcamp/tracker'); const st = async id => (await p.locator('.bc-table tr', { has: p.locator(`a[href="#/bootcamp/lab/${id}"]`) }).innerText()).split('\t')[2];
  console.log('  workspace import on device A: 2.03', await st('2.03'), '(was Blocked; the import is newer) | 1.04', await st('1.04'), '| 3.01', await st('3.01'));
  await p.waitForTimeout(500); await ctx.close();

  /* 8. malformed content: invalid JSON stops the build; bad structure shows an error page, app keeps working */
  const work = path.join(__dirname, 'bootcamp-bad-src'); fs.rmSync(work, { recursive: true, force: true }); fs.cpSync(path.join(ROOT, 'src'), work, { recursive: true });
  const f3 = path.join(work, 'content/bootcamp/bootcamp-labs-level-03.json'); const good3 = fs.readFileSync(f3, 'utf8');
  fs.writeFileSync(f3, good3.replace('"labs": [', '"labs": [,'));
  try { execFileSync('node', [path.join(ROOT, 'build.js'), '--src', work, '--out', path.join(__dirname, 'bad.html')], { stdio: 'pipe' }); console.log('8 invalid JSON: build did not fail'); }
  catch (e) { console.log('8 invalid JSON: build stopped:', e.stderr.toString().split('\n').filter(l => /bootcamp/.test(l)).map(l => l.trim().replace(/\(.*\)/, '(…)')).join(' ')); }
  const bad = JSON.parse(good3); bad.labs[2].id = '3.01'; delete bad.labs[4].title; fs.writeFileSync(f3, JSON.stringify(bad));
  const out = path.join(__dirname, 'bootcamp-bad.html'); execFileSync('node', [path.join(ROOT, 'build.js'), '--src', work, '--out', out], { stdio: 'ignore' });
  const b = await chromium.launch(); p = await b.newPage({ viewport: { width: 1280, height: 900 } }); const expected = []; p.on('pageerror', e => errs.push(e.message)); p.on('console', m => { if (m.type() === 'error' && !/Failed to load resource/.test(m.text())) (/Bootcamp content failed/.test(m.text()) ? expected : errs).push(m.text()); });
  await p.goto('file://' + out); await p.waitForTimeout(1500); await p.click('[data-action="ob-skip"]');
  await p.goto('file://' + out + '#/bootcamp'); await p.waitForTimeout(400);
  console.log('  bad structure: alert', await p.locator('.bc-error[role="alert"]').count(), '|', (await p.locator('.bc-error li').allInnerTexts()).join(' / '), '| console reported it:', expected.length > 0);
  await p.goto('file://' + out + '#/study'); await p.waitForTimeout(400); console.log('  rest of the app still works:', await txt(p, 'main h1'));
  await b.close();

  console.log('  no network requests while using the Bootcamp:', remote.length ? remote : 'none');
  console.log('errors:', errs.length ? errs : 'none');
})();
