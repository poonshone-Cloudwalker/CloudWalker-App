const { chromium } = require('playwright'); const fs = require('fs');
const U9 = '__CW_APP__';
const errs = [];
(async () => {
  const b = await chromium.launch();
  const c = await b.newContext({ acceptDownloads: true, viewport: { width: 820, height: 1100 } });
  const p = await c.newPage();
  p.on('pageerror', e => errs.push(e.message));

  // Build a malicious workspace with __proto__ keys
  const malicious = {
    format: 'cloudwalker-workspace',
    version: 4,
    workspace: {
      schemaVersion: 4,
      panels: { normalPanel: 'ok' },
      career: {
        profile: { focusExam: 'PCA' },
        weeks: { '2026-01': { done: 1 } },
        roles: [], milestones: [], apps: []
      },
      adrs: [], portfolio: [], labs: [], outputs: [], reflections: [],
      interview: { stories: [], answers: [], boards: [], exec: [] },
      srs: {}, trail: {}, glossary: { terms: [], cross_cloud: [] },
      exportLog: []
    },
    drafts: {
      iq: {},
      wb: {}
    },
    progress: { answers: {}, flags: [], confidence: {} }
  };

  const f = __dirname + '/proto-malicious.json';
  const P = '"__proto__":{"polluted":"yes"}';
  let raw = JSON.stringify(malicious);
  for (const k of ['panels', 'profile', 'weeks', 'iq', 'wb']) raw = raw.replace(new RegExp('"' + k + '":\\{'), m => m + P + ',');
  raw = raw.replace(/,\}/g, '}');
  if ((raw.match(/"__proto__"/g) || []).length !== 5) throw new Error('fixture must contain 5 own __proto__ keys');
  fs.writeFileSync(f, raw);

  // Import the malicious workspace
  await p.goto(U9 + '#/settings');
  await p.waitForTimeout(1200);
  await p.setInputFiles('#fileWorkspace', f);
  await p.waitForTimeout(1500);

  const msg = await p.locator('main .notice').first().innerText().catch(() => '(no notice)');
  console.log('1 import notice:', msg.replace(/\n+/g, ' | ').slice(0, 150));

  // Check if prototype is polluted
  const protoCheck = await p.evaluate(() => {
    return {
      objectProtoPolluted: Object.prototype.hasOwnProperty('polluted'),
      protoValue: Object.prototype.polluted,
      normalPanelWorks: true
    };
  });
  console.log('2 Object.prototype polluted:', protoCheck.objectProtoPolluted);
  console.log('3 prototype value:', protoCheck.protoValue);
  

  // Also test importProgress with __proto__ answer id
  const progressMalicious = {
    format: 'blueprint-progress',
    answers: { 'gcp-pca-001': [{ t: 1, choice: 0, correct: true }] },
    flags: [],
    confidence: {}
  };
  const f2 = __dirname + '/proto-progress.json';
  fs.writeFileSync(f2, JSON.stringify(progressMalicious).replace('"answers":{', '"answers":{"__proto__":[{"t":2,"choice":0,"correct":true}],'));

  await p.setInputFiles('#fileWorkspace', f2);
  await p.waitForTimeout(1000);

  const protoCheck2 = await p.evaluate(() => {
    return {
      objectProtoPolluted: Object.prototype.hasOwnProperty('polluted'),
      answersProtoPolluted: Array.isArray(Object.prototype[0])
    };
  });
  console.log('5 after progress import, Object.prototype polluted:', protoCheck2.objectProtoPolluted);
  console.log('6 answers prototype polluted:', protoCheck2.answersProtoPolluted);
  const msg2 = await p.locator('main .notice').first().innerText().catch(() => '(no notice)');
  console.log('6b progress import notice:', msg2.replace(/\n+/g, ' | ').slice(0, 150));

  // Verify app still renders
  await p.goto(U9 + '#/dashboard');
  await p.waitForTimeout(800);
  const dashText = await p.locator('main').innerText();
  console.log('7 dashboard renders:', dashText.length > 100);

  console.log('errors:', errs.length ? errs : 'none');
  await b.close();
})();
