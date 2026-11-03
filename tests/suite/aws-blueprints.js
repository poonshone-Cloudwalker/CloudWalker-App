/* AWS exam blueprints: the #/blueprint pages, the added exam profiles, and the honesty rules
 * (no invented per-task counts, no Practice button without questions, unmapped questions reported). */
const { chromium } = require('playwright'); const fs = require('fs'); const path = require('path');
const ROOT = process.env.CW_ROOT; const APP = '__CW_APP__'; const dir = path.join(__dirname, 'pawsbp'); fs.rmSync(dir, { recursive: true, force: true });
let bad = 0; const ok = (name, cond, extra) => { if (cond) console.log('ok  ' + name); else { bad++; console.log('ERR ' + name + (extra ? ' :: ' + extra : '')); } };
const bankDir = path.join(ROOT, 'src/content/bank'); const F = JSON.parse(fs.readFileSync(path.join(bankDir, 'bank-head.json'))).fields; const rows = [];
for (const f of fs.readdirSync(bankDir).filter(x => /^chunk/.test(x)).sort()) { const j = JSON.parse(fs.readFileSync(path.join(bankDir, f))); for (const r of (Array.isArray(j) ? j : j.rows)) rows.push(Object.fromEntries(F.map((k, i) => [k, r[i]]))); }
const OBJ = JSON.parse(fs.readFileSync(path.join(ROOT, 'src/content/aws/aws-objectives.json')));
const saaQs = rows.filter(r => r.exam_code === 'SAA-C03'); const map = OBJ.bankMap['SAA-C03'];
const want = {}; let outside = 0; for (const q of saaQs) { const t = map[q.subdomain]; if (t) want[t] = (want[t] || 0) + 1; else outside++; }
(async () => {
  const ctx = await chromium.launchPersistentContext(dir, { viewport: { width: 1200, height: 900 } }); const p = ctx.pages()[0]; p.on('pageerror', e => console.log('ERR pageerror ' + e.message));
  await p.goto(APP); await p.waitForTimeout(1500); await p.locator('input[name="background"][value="pm"]').check(); await p.fill('#ob-ind', 'retail'); await p.click('[data-action="ob-next"]');
  await p.locator('input[name="years"][value="10+"]').check(); await p.click('[data-action="ob-next"]');
  await p.locator('input[name="targetRole"][value="architect"]').check(); await p.click('[data-action="ob-next"]');
  await p.locator('input[data-ob="clouds"][value="aws"]').check(); await p.click('[data-action="ob-next"]');
  await p.fill('#ob-hours', '8'); await p.click('[data-action="ob-finish"]'); await p.waitForTimeout(800);
  const nav = (await p.locator('#nav').innerText()).split('\n').filter(Boolean); ok('nav entry follows Decision Atlas', nav[nav.indexOf('Decision Atlas') + 1] === 'AWS blueprints', JSON.stringify(nav));
  await p.goto(APP + '#/blueprint'); await p.waitForTimeout(300); let t = await p.locator('main').innerText();
  ok('index lists nine exams', (await p.locator('main article.card').count()) === 9);
  ok('index: CLF says no practice questions yet', /CLF-C02 · 4 domains · 19 tasks · no practice questions in the bank yet/.test(t), t.slice(0, 400));
  ok('index: SAA shows its 200 questions', /SAA-C03 · 4 domains · 14 tasks · 200 practice questions/.test(t));
  ok('index: DEA, DVA, SCS, SAP have blueprints', ['DEA-C01 · 4 domains · 17 tasks', 'DVA-C03 · 4 domains · 12 tasks', 'SCS-C03 · 6 domains · 16 tasks', 'SAP-C03 · 5 domains · 21 tasks', 'SOA-C03 · 5 domains · 13 tasks', 'AIF-C01 · 5 domains · 14 tasks'].every(x => t.includes(x)), t.slice(0, 300));
  ok('index: AIB shows 13 tasks', /AIB-C01 · 4 domains · 13 tasks · 200 practice questions/.test(t));
  await p.goto(APP + '#/blueprint/CLF-C02'); await p.waitForTimeout(300); t = await p.locator('main').innerText();
  ok('CLF: four domains with official weights', ['24% of exam', '30% of exam', '34% of exam', '12% of exam'].every(x => t.includes(x)));
  ok('CLF: 19 task statements', (await p.locator('.bp-task').count()) === 19);
  ok('CLF: no Practice button and no per-task counts', (await p.locator('[data-action="exam-setup"]').count()) === 0 && (await p.locator('.bp-task .chip').count()) === 0);
  ok('CLF: says nothing is covered', /nothing to drill/.test(t));
  ok('CLF: pass mark and status from the profile', /pass mark 700/.test(t) && /status: active/.test(t));
  await p.locator('.bp-task summary').first().click(); ok('CLF: task opens to knowledge and skills', /Knowledge of/.test(await p.locator('.bp-task').first().innerText()));
  await p.goto(APP + '#/blueprint/SAA-C03'); await p.waitForTimeout(300); t = await p.locator('main').innerText();
  ok('SAA: 14 tasks', (await p.locator('.bp-task').count()) === 14);
  const got = await p.locator('.bp-task').evaluateAll(els => Object.fromEntries(els.map(e => [e.querySelector('summary strong').textContent, +e.querySelector('.chip').textContent.match(/\d+/)[0]])));
  ok('SAA: per-task counts match the bank mapping', JSON.stringify(got) === JSON.stringify(Object.fromEntries(Object.keys(got).map(k => [k, want[k] || 0]))), JSON.stringify(got) + ' vs ' + JSON.stringify(want));
  ok('SAA: swapped 3.1/3.2 labels are mapped by name', got['3.1'] === saaQs.filter(q => q.subdomain === '3.2 Storage').length && got['3.2'] === saaQs.filter(q => q.subdomain === '3.1 Compute').length);
  ok('SAA: questions outside official tasks reported (1.4 and 2.3)', outside === 27 && /1\.4 Security detection and incident response: 15 questions/.test(t) && /2\.3 Disaster recovery strategies: 12 questions/.test(t), t.slice(-500));
  ok('SAA: counted + outside = bank total', Object.values(got).reduce((a, b) => a + b, 0) + outside === saaQs.length);
  ok('SAA: has Practice button', (await p.locator('[data-action="exam-setup"]').count()) === 1);
  await p.goto(APP + '#/blueprint/AIB-C01'); await p.waitForTimeout(300); t = await p.locator('main').innerText();
  ok('AIB: 13 tasks, no per-task counts', (await p.locator('.bp-task').count()) === 13 && (await p.locator('.bp-task .chip').count()) === 0);
  ok('AIB: explains why counts are not shown', /do not line up one-to-one/.test(t));
  ok('AIB: pass mark not published, beta shown', /pass mark not published/.test(t) && /status: beta/.test(t));
  ok('AIB: tasks without detail say so', /title only/.test(await p.locator('.bp-task').first().evaluate(e => e.textContent)));
  await p.goto(APP + '#/blueprint/%3Cimg%20src%3Dx%20onerror%3Dwindow.__x%3D1%3E'); await p.waitForTimeout(300);
  ok('unknown code: safe message, nothing injected', /Blueprint not available/.test(await p.locator('main').innerText()) && (await p.locator('main img').count()) === 0 && !(await p.evaluate(() => window.__x)));

  // Draft pack questions: installed packs stay switched off until the learner turns drafts on; coverage then matches by exact label.
  const packs = ['clf-c02', 'aif-c01', 'soa-c03']; const packQs = {};
  for (const c of packs) packQs[c] = JSON.parse(fs.readFileSync(path.join(ROOT, 'tests/fixtures/aws-gate2/pack-' + c + '.json'))).content.questions;
  for (const c of packs) { await p.goto(APP + '#/packs'); await p.waitForTimeout(400); const [fc] = await Promise.all([p.waitForEvent('filechooser'), p.click('[data-action="p8-file"]')]); await fc.setFiles(path.join(ROOT, 'tests/fixtures/aws-gate2/pack-' + c + '.json')); await p.waitForTimeout(600); await p.click('[data-action="p8-merge"]'); await p.waitForTimeout(700); }
  await p.goto(APP + '#/blueprint/CLF-C02'); await p.waitForTimeout(300); t = await p.locator('main').innerText();
  ok('drafts off: CLF says 25 drafts are switched off, not "no questions"', /25 draft questions are installed but switched off/.test(t) && !/no questions in the practice bank/.test(t), t.slice(0, 300));
  await p.goto(APP + '#/blueprint'); await p.waitForTimeout(300); t = await p.locator('main').innerText();
  ok('drafts off: index shows the draft count', /CLF-C02 · 4 domains · 19 tasks · 25 draft questions installed \(switched off\)/.test(t));
  await p.goto(APP + '#/packs'); await p.waitForTimeout(300); await p.locator('#pk-drafts').check(); await p.waitForTimeout(500);
  for (const [c, n] of [['CLF-C02', 19], ['AIF-C01', 14], ['SOA-C03', 13]]) {
    const qs = packQs[c.toLowerCase()]; const lab = s => s.trim().replace(/\.$/, '');
    await p.goto(APP + '#/blueprint/' + c); await p.waitForTimeout(300); t = await p.locator('main').innerText();
    const got = await p.locator('.bp-task').evaluateAll(els => Object.fromEntries(els.map(e => [e.querySelector('summary strong').textContent, +(e.querySelector('.chip') ? e.querySelector('.chip').textContent.match(/\d+/)[0] : -1)])));
    const want = {}; for (const q of qs) { const id = q.subdomain.split(' ')[0]; want[id] = (want[id] || 0) + 1; }
    ok(c + ': ' + n + ' tasks, every task has a count chip', Object.keys(got).length === n && Object.values(got).every(v => v >= 0), JSON.stringify(got));
    ok(c + ': per-task counts equal the pack by exact label', Object.keys(got).every(k => got[k] === (want[k] || 0)), JSON.stringify(got) + ' vs ' + JSON.stringify(want));
    ok(c + ': all 25 questions matched, none outside', Object.values(got).reduce((a, b) => a + b, 0) === 25 && !/outside the official task list/.test(t));
    ok(c + ': Practice button offered', (await p.locator('[data-action="exam-setup"]').count()) === 1);
  }
  await p.goto(APP + '#/blueprint/SAA-C03'); await p.waitForTimeout(300);
  ok('SAA still uses its explicit map after packs are installed', /Questions outside the official task list/.test(await p.locator('main').innerText()));
  await p.goto(APP + '#/blueprint/AIB-C01'); await p.waitForTimeout(300);
  ok('AIB still shows no per-task counts', (await p.locator('.bp-task .chip').count()) === 0 && /do not line up one-to-one/.test(await p.locator('main').innerText()));
  await p.goto(APP + '#/blueprint/SAP-C03'); await p.waitForTimeout(300); t = await p.locator('main').innerText();
  ok('SAP-C03: weights from the guide, no practice button, drafts note absent', /25% of exam/.test(t) && (await p.locator('[data-action="exam-setup"]').count()) === 0 && /no questions in the practice bank yet/.test(t));
  await p.goto(APP + '#/path'); await p.waitForTimeout(400); await p.locator('details summary').filter({ hasText: 'Exam facts' }).click();
  const facts = await p.locator('details table tbody tr').evaluateAll(trs => trs.map(tr => tr.innerText.replace(/\s+/g, ' ').trim()));
  const row = c => facts.find(r => r.startsWith(c + ' ')) || '';
  for (const c of ['AIF-C01', 'SOA-C03', 'DVA-C03', 'SAP-C03', 'MLE-C01', 'ME1-C02', 'MLS-C01']) ok('facts table has ' + c, !!row(c), c);
  ok('facts: MLS-C01 retired, MLE-C01 retiring, ME1-C02 beta', /retired/.test(row('MLS-C01')) && /retiring/.test(row('MLE-C01')) && /beta/.test(row('ME1-C02')));
  ok('facts: pass marks filled from catalog', /720/.test(row('DEA-C01')) && /750/.test(row('SCS-C03')) && /750/.test(row('ANS-C01')) && /720/.test(row('SAP-C03')));
  ok('facts: AIB pass mark no longer asserted', !/ 700 /.test(row('AIB-C01').replace('Business', '')) && /—/.test(row('AIB-C01')), row('AIB-C01'));
  ok('facts: blueprint links only where a blueprint exists', ['CLF-C02', 'AIF-C01', 'SAA-C03', 'SOA-C03', 'DVA-C03', 'DEA-C01', 'SCS-C03', 'SAP-C03', 'AIB-C01'].every(c => /Blueprint/.test(row(c))) && !/Blueprint/.test(row('MLE-C01')) && !/Blueprint/.test(row('MLS-C01')));
  ok('facts: catalog-sourced rows are labelled', /from catalog snapshot/.test(row('SOA-C03')) && !/from catalog snapshot/.test(row('CLF-C02')));
  await ctx.close(); console.log(bad ? `FAILED ${bad}` : 'all ok'); process.exit(bad ? 1 : 0);
})();
