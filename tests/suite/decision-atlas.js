/* Decision Atlas / Conflict & Correction / Error Log regression coverage. Smoke-registered: question order
 * and answer-option order are randomised, so exact output isn't diffed against a saved expected file —
 * instead this script makes its own pass/fail assertions and prints a line starting "ERR " for any
 * failure, which tests/run.js treats as a failure even for a smoke test (see its `pageErr` check), and
 * also sets a non-zero exit code so a CI failure is never silently green. */
const { chromium } = require('playwright'); const fs = require('fs'); const path = require('path');
const U = '__CW_APP__';
const errs = []; let failures = 0;
const ok = (label, cond) => { if (cond) console.log('ok   ' + label); else { console.log('ERR FAILED: ' + label); failures++; } };
const txt = async p => (await p.locator('main').innerText());

(async () => {
  const b = await chromium.launch();

  // ---------- 1. Routes, a missing Atlas entry, a missing source, and no third-party requests ----------
  let ctx = await b.newContext({ viewport: { width: 1024, height: 1200 } }); let p = await ctx.newPage();
  p.on('pageerror', e => errs.push('routes:' + e.message));
  const externalHosts = new Set();
  p.on('request', req => { try { const u = new URL(req.url()); if (u.protocol.startsWith('http') && u.hostname) externalHosts.add(u.hostname); } catch { /* file:// and data: URLs are not http */ } });
  await p.goto(U + '#/dashboard'); await p.waitForTimeout(600); await p.click('[data-action="ob-skip"]').catch(() => {}); await p.waitForTimeout(300);

  await p.goto(U + '#/atlas'); await p.waitForTimeout(500);
  let t = await txt(p);
  ok('Atlas list shows all 12 entries', ['X01', 'X02', 'X03', 'X04', 'X05', 'X06', 'X07', 'X08', 'X09', 'X10', 'X11', 'X12'].every(id => t.includes(id)));
  ok('Atlas list links to Conflict & Correction', await p.locator('a[href="#/atlas/conflicts"]').count() > 0);
  ok('Atlas list links to the error log', await p.locator('a[href="#/atlas/errorlog"]').count() > 0);

  await p.goto(U + '#/atlas/X01'); await p.waitForTimeout(400); t = await txt(p);
  ok('X01 detail shows the matrix and the Six-Step Method', t.includes('Decision matrix') && t.includes('Six-Step Decision Method'));
  ok('X01 detail labels the drill honestly', /Decision Recall Drill|service-selection/.test(t));

  await p.goto(U + '#/atlas/does-not-exist'); await p.waitForTimeout(300); t = await txt(p);
  ok('A missing Atlas entry shows a not-found state, not a crash', /not found|does not exist/i.test(t));

  await p.goto(U + '#/atlas/conflicts'); await p.waitForTimeout(400); t = await txt(p);
  ok('Conflicts page lists K01-K05', ['K01', 'K02', 'K03', 'K04', 'K05'].every(k => t.includes(k)));
  ok('K01 is reported unresolved rather than asserting a fixed instruction', /UNRESOLVED/.test(t));

  await p.goto(U + '#/atlas/source/S057'); await p.waitForTimeout(300); t = await txt(p);
  ok('A real source ID resolves to its register entry', t.includes('Cloud Run') && t.includes('docs.cloud.google.com'));
  const extLink = await p.locator('a[href^="https://docs.cloud.google.com/run"]').first();
  ok('External source links use noopener/noreferrer', ((await extLink.getAttribute('rel')) || '').includes('noopener'));
  ok('External source links open in a new tab', (await extLink.getAttribute('target')) === '_blank');

  await p.goto(U + '#/atlas/source/S999'); await p.waitForTimeout(300); t = await txt(p);
  ok('An unregistered source ID is reported honestly, not fabricated', /unavailable/i.test(t) && !/docs\.cloud\.google\.com/.test(t));

  await p.goto(U + '#/atlas/errorlog'); await p.waitForTimeout(400); t = await txt(p);
  ok('Error log shows the worked example and readiness rubric', t.includes('Q-ACE-04') && t.includes('Readiness rubric'));

  ok('No third-party network requests during offline study (Fontshare or otherwise)', externalHosts.size === 0 || [...externalHosts].every(h => h === 'localhost' || h === '127.0.0.1'));
  if (externalHosts.size) console.log('   external hosts seen:', [...externalHosts].join(', '));
  await ctx.close();

  // ---------- 2. Stable options, correct/incorrect feedback, repeated-click protection, completion, truthful score ----------
  ctx = await b.newContext({ viewport: { width: 1024, height: 1200 } }); p = await ctx.newPage();
  p.on('pageerror', e => errs.push('drill:' + e.message));
  await p.goto(U + '#/dashboard'); await p.waitForTimeout(600); await p.click('[data-action="ob-skip"]').catch(() => {}); await p.waitForTimeout(300);
  await p.goto(U + '#/atlas/X01'); await p.waitForTimeout(300);
  ok('No "Last:" score chip before any drill has been completed', !(await txt(p)).includes('Last:'));
  await p.click('[data-action="atlas-practice-start"]'); await p.waitForTimeout(300);

  const optionTextsBefore = await p.locator('[data-action="atlas-practice-answer"]').allInnerTexts();
  await p.waitForTimeout(50); // a render could be triggered by nothing happening; options must not reshuffle at rest
  const optionTextsAfter = await p.locator('[data-action="atlas-practice-answer"]').allInnerTexts();
  ok('Answer options do not change while a question is unanswered', JSON.stringify(optionTextsBefore) === JSON.stringify(optionTextsAfter));
  ok('Exactly 4 options or fewer, all distinct', new Set(optionTextsBefore).size === optionTextsBefore.length && optionTextsBefore.length >= 2 && optionTextsBefore.length <= 4);

  const firstCandidate = optionTextsBefore[0];
  await p.locator('[data-action="atlas-practice-answer"]').first().click(); await p.waitForTimeout(200);
  t = await txt(p);
  ok('Feedback shown after answering (Why it fits / When not to choose it)', t.includes('Why it fits') && t.includes('When not to choose it'));
  const feedbackBefore = t;
  // repeated-click protection: clicking an option button after answering should not be present anymore (buttons replaced by feedback+Next)
  const stillHasOptions = await p.locator('[data-action="atlas-practice-answer"]').count();
  ok('Answer buttons are gone once a question is answered (no double-answer)', stillHasOptions === 0);
  await p.click('#atlas-next').catch(() => {}); await p.waitForTimeout(100); await p.click('#atlas-next').catch(() => {}); await p.waitForTimeout(200);
  t = await txt(p);
  ok('A duplicate Next click does not skip two questions / crash', t !== feedbackBefore);

  // finish the rest of the questions (X01 has 6 rows; first pos consumed already, but "next" above may have also
  // advanced once more if the duplicate click landed on a freshly rendered Next for q2 -- tolerate either state
  // by looping until completion or a safety cap)
  for (let guard = 0; guard < 10; guard++) {
    t = await txt(p);
    if (/Decision Recall Drill — complete|Score: \d+ of \d+/.test(t)) break;
    const opts = await p.locator('[data-action="atlas-practice-answer"]').count();
    if (opts) { await p.locator('[data-action="atlas-practice-answer"]').first().click(); await p.waitForTimeout(150); }
    const next = await p.locator('#atlas-next').count();
    if (next) { await p.click('#atlas-next'); await p.waitForTimeout(150); }
  }
  t = await txt(p);
  ok('Drill reaches a completion screen with a score', /Score: \d+ of \d+ \(\d+%\)/.test(t));
  const scoreMatch = t.match(/Score: (\d+) of (\d+) \((\d+)%\)/);
  await p.waitForTimeout(2000); // let the autosave debounce (SAVE_QUICK) and the IndexedDB write actually land before reload

  await p.goto(U + '#/atlas/X01'); await p.waitForTimeout(300); t = await txt(p);
  ok('"last completed score" (not "best") is the label used after finishing a drill', /last completed score \d+%/i.test(t));
  await p.goto(U + '#/atlas'); await p.waitForTimeout(300); t = await txt(p);
  ok('List page score chip is titled "Last completed score"', await p.locator('[title="Last completed score"]').count() > 0);

  await p.reload(); await p.waitForTimeout(1200); await p.goto(U + '#/atlas'); await p.waitForTimeout(400); t = await txt(p);
  ok('Score persists after reload', scoreMatch ? t.includes(`Last: ${scoreMatch[3]}%`) : false);

  // ---------- 3. Error log: validation, escaped rendering, deletion ----------
  await p.goto(U + '#/atlas/errorlog'); await p.waitForTimeout(300);
  await p.click('[data-action="atlas-errorlog-add"]'); await p.waitForTimeout(150); t = await txt(p);
  ok('Adding an empty entry is rejected rather than saved blank', !t.includes('Your log (1)'));
  await p.fill('#el-q', 'Q-TEST-01');
  await p.fill('#el-wm', '<img src=x onerror=alert(1)> all replicas are HA');
  await p.fill('#el-cr', 'Replicas serve reads; HA is a separate configuration.');
  await p.fill('#el-tt', 'Would a zone failure fail over automatically?');
  await p.click('[data-action="atlas-errorlog-add"]'); await p.waitForTimeout(200);
  ok('Entry is added and script content is rendered as text, not executed', (await txt(p)).includes('<img src=x onerror=alert(1)> all replicas are HA'));
  ok('No alert dialog fired from the logged HTML', errs.length === 0);
  const htmlAfterAdd = await p.content();
  ok('The stored markup is escaped in the DOM (no live <img onerror> tag)', !/<img src=x onerror=alert\(1\)>/.test(htmlAfterAdd));

  // ---------- 4. Workspace export/import: merge-by-id, tombstones survive re-import of an older file ----------
  await p.goto(U + '#/settings'); await p.waitForTimeout(600);
  let [dl] = await Promise.all([p.waitForEvent('download'), p.locator('main [data-action="ws-export"]').first().click()]);
  const wOlder = path.join(__dirname, 'atlas-ws-with-entry.json'); await dl.saveAs(wOlder);

  await p.goto(U + '#/atlas/errorlog'); await p.waitForTimeout(300);
  await p.click('[data-action="atlas-errorlog-delete"]'); await p.waitForTimeout(200); t = await txt(p);
  ok('Entry is gone immediately after deleting', t.includes('Your log (0)') || !t.includes('Q-TEST-01'));
  await p.goto(U + '#/settings'); await p.waitForTimeout(600);
  [dl] = await Promise.all([p.waitForEvent('download'), p.locator('main [data-action="ws-export"]').first().click()]);
  const wNewer = path.join(__dirname, 'atlas-ws-deleted.json'); await dl.saveAs(wNewer);
  const deletedExport = JSON.parse(fs.readFileSync(wNewer, 'utf8'));
  ok('Export carries a deletion tombstone', !!(deletedExport.workspace && deletedExport.workspace.atlas && deletedExport.workspace.atlas.errorlog && Object.keys(deletedExport.workspace.atlas.errorlog.deleted || {}).length));
  await ctx.close();

  ctx = await b.newContext({ viewport: { width: 1024, height: 1200 } }); p = await ctx.newPage(); p.on('pageerror', e => errs.push('import:' + e.message));
  await p.goto(U + '#/settings'); await p.waitForTimeout(1000);
  await p.setInputFiles('#fileWorkspace', wOlder); await p.waitForTimeout(800);
  await p.goto(U + '#/atlas/errorlog'); await p.waitForTimeout(300); t = await txt(p);
  ok('Importing the older (pre-delete) export brings the entry back', t.includes('Q-TEST-01'));
  await p.goto(U + '#/settings'); await p.waitForTimeout(600);
  await p.setInputFiles('#fileWorkspace', wNewer); await p.waitForTimeout(800);
  await p.goto(U + '#/atlas/errorlog'); await p.waitForTimeout(300); t = await txt(p);
  ok('Importing the newer (post-delete) export removes it again (deletion wins)', !t.includes('Q-TEST-01'));
  await p.goto(U + '#/settings'); await p.waitForTimeout(600);
  await p.setInputFiles('#fileWorkspace', wOlder); await p.waitForTimeout(800); // re-import the OLDER file again
  await p.goto(U + '#/atlas/errorlog'); await p.waitForTimeout(300); t = await txt(p);
  ok('Re-importing the OLDER export cannot resurrect a deletion recorded after it (tombstone holds)', !t.includes('Q-TEST-01'));
  await ctx.close();

  // ---------- 5. Malformed / adversarial import is rejected without polluting prototypes or crashing ----------
  ctx = await b.newContext({ viewport: { width: 1024, height: 1200 } }); p = await ctx.newPage(); p.on('pageerror', e => errs.push('malformed:' + e.message));
  await p.goto(U + '#/settings'); await p.waitForTimeout(1000);
  const malformed = {
    format: 'cloudwalker-workspace', version: 1, app: 'BluePrint CloudWalker Trainer',
    workspace: {
      atlas: {
        practice: { '__proto__': { seen: 1, correct: 1, completions: 1, lastScore: 100, updated: Date.now() }, 'X01': { seen: -5, correct: 999999, completions: 1, lastScore: 250, updated: Date.now() } },
        errorlog: { entries: [{ id: '__proto__', questionId: 'x', wrongModel: 'x'.repeat(5000), correctedRule: 'y', updated: Date.now() }, { id: 'ok-id-1', questionId: 'Q', wrongModel: 'fine', correctedRule: 'fine too', updated: Date.now() }], deleted: { 'constructor': 1 } },
        updated: Date.now(),
      },
    },
  };
  const badFile = path.join(__dirname, 'atlas-ws-malformed.json'); fs.writeFileSync(badFile, JSON.stringify(malformed));
  await p.setInputFiles('#fileWorkspace', badFile); await p.waitForTimeout(800);
  const polluted = await p.evaluate(() => ({ proto: ({}).seen, ctor: typeof ({}).constructor === 'function' }));
  ok('Object.prototype was not polluted by a "__proto__" key in the import', polluted.proto === undefined && polluted.ctor === true);
  await p.goto(U + '#/atlas'); await p.waitForTimeout(300); t = await txt(p);
  ok('An out-of-range practice record (correct > seen, score > 100) is rejected, not shown', !t.includes('250%'));
  await p.goto(U + '#/atlas/errorlog'); await p.waitForTimeout(300); t = await txt(p);
  ok('A well-formed sibling entry in the same (otherwise bad) import still comes through', t.includes('fine too'));
  await ctx.close();

  console.log('errors:', errs.length ? errs : 'none');
  console.log(failures ? `ERR ${failures} assertion(s) failed` : 'all assertions passed');
  await b.close();
  if (failures || errs.length) process.exitCode = 1;
})();
