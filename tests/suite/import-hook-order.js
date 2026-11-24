const { chromium } = require('playwright'); const fs = require('fs');
const U9 = '__CW_APP__';
const errs = [];
(async () => {
  const b = await chromium.launch();
  const p = await (await b.newContext({ acceptDownloads: true, viewport: { width: 900, height: 1100 } })).newPage();
  p.on('pageerror', e => errs.push(e.message));
  const ws = { format: 'cloudwalker-workspace', version: 4, workspace: { schemaVersion: 4,
    career: { profile: { focusExam: 'PCA' }, weeks: {}, roles: [], milestones: [], apps: [] }, adrs: [], portfolio: [], labs: [], outputs: [], reflections: [],
    plan: { weeks: [{ n: 1 }], created: 5 }, reports: [{ id: 'RPT-001', updated: 3 }], contentEdits: {},
    lessons: { L1: { updated: 9, done: true } }, lessonReview: {},
    aiFeedback: { k1: { scores: [1], updated: 4 } }, calibLog: [{ key: 'a', t: 1 }], outcomes: [{ id: 'OUT-001', updated: 2 }],
    habit: { goal: { type: 'cards', updated: 7 }, days: { '2026-01-01': { min: 5 } }, startedAt: 100 },
    interview: { stories: [], answers: [], boards: [], exec: [] }, glossary: { terms: [], cross_cloud: [] } },
    progress: { answers: {}, flags: [], confidence: {} } };
  const f = __dirname + '/hook-order-ws.json'; fs.writeFileSync(f, JSON.stringify(ws));
  const old = __dirname + '/hook-order-old.json'; fs.writeFileSync(old, JSON.stringify({ format: 'cloudwalker-workspace', version: 2, workspace: { adrs: [], portfolio: [] } }));
  await p.goto(U9 + '#/settings'); await p.waitForTimeout(1200);
  await p.setInputFiles('#fileWorkspace', f); await p.waitForTimeout(1200);
  console.log('1 import notice:', (await p.locator('main .notice').first().innerText()).replace(/\s+/g, ' ').slice(0, 60));
  await p.goto(U9 + '#/settings'); await p.waitForTimeout(400);
  await p.setInputFiles('#fileWorkspace', old); await p.waitForTimeout(1200);
  console.log('2 older file migrated by the first hook:', (await p.locator('main .notice').first().innerText()).includes('Upgraded this file from version 2 to version 4'));
  await p.goto(U9 + '#/settings'); await p.waitForTimeout(400);
  const [dl] = await Promise.all([p.waitForEvent('download'), p.evaluate(() => { const bt = document.createElement('button'); bt.dataset.action = 'ws-export'; document.body.append(bt); bt.click(); bt.remove(); })]);
  const j = JSON.parse(fs.readFileSync(await dl.path(), 'utf8')); const w = j.workspace;
  console.log('3 plan merged:', !!(w.plan && w.plan.created === 5));
  console.log('4 report merged:', (w.reports || []).some(r => r.id === 'RPT-001'));
  console.log('5 lesson progress merged:', !!(w.lessons && w.lessons.L1));
  console.log('6 AI feedback + outcome merged:', !!(w.aiFeedback && w.aiFeedback.k1) && (w.outcomes || []).some(o => o.id === 'OUT-001'));
  console.log('7 habit merged:', !!(w.habit && w.habit.days && w.habit.days['2026-01-01']));
  console.log('errors:', errs.length ? errs : 'none');
  fs.unlinkSync(f); fs.unlinkSync(old);
  await b.close();
})();
