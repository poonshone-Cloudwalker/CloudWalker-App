/* Atlas scheduled review: misses in the Decision Recall Drill and error-log entries come back on a spaced
 * schedule. The app's state lives inside one closure, so this test drives the UI only: it reads the saved
 * review cards from the exported workspace file, and it moves time forward by shifting Date.now() with an
 * init script (no state is edited). Correct answers come from the Atlas source JSON in the repo
 * (CW_ROOT, set by tests/run.js). Smoke-registered because question and option order are random; it prints
 * "ERR " for any failed assertion and sets a non-zero exit code. */
const { chromium } = require('playwright'); const fs = require('fs'); const path = require('path');
const U = '__CW_APP__';
const errs = []; let failures = 0;
const ok = (label, cond) => { if (cond) console.log('ok   ' + label); else { console.log('ERR FAILED: ' + label); failures++; } };
const txt = async p => (await p.locator('main').innerText());
const HOUR = 3600e3, DAY = 86400e3;
const MATRIX = JSON.parse(fs.readFileSync(path.join(process.env.CW_ROOT, 'src/content/atlas/atlas-matrices.json'), 'utf8'));
const rowOf = (eid, req) => { const e = MATRIX.find(x => x.id === eid); const i = e.matrix.findIndex(r => r.requirement === req); return { i, row: e.matrix[i], n: e.matrix.length }; };
const rowFromCard = id => { const k = id.lastIndexOf('-'); const e = MATRIX.find(x => x.id === id.slice(2, k)); return e.matrix[Number(id.slice(k + 1))]; };

let snapN = 0;
const fresh = async (b, tag) => {
  const ctx = await b.newContext({ viewport: { width: 1024, height: 1200 }, acceptDownloads: true }); const p = await ctx.newPage();
  p.on('pageerror', e => errs.push(tag + ':' + e.message));
  await p.addInitScript(() => { const real = Date.now.bind(Date); window.__off = 0; Date.now = () => real() + window.__off; });
  await p.goto(U + '#/dashboard'); await p.waitForTimeout(600); await p.click('[data-action="ob-skip"]').catch(() => {}); await p.waitForTimeout(300);
  return { ctx, p };
};
const jump = (p, ms) => p.evaluate(ms => { window.__off += ms; }, ms);
const appNow = p => p.evaluate(() => Date.now());
/* Export the workspace through the real Save workspace button and return its atlas section. */
async function snapshot(p) {
  await p.goto(U + '#/settings'); await p.waitForTimeout(500);
  const [dl] = await Promise.all([p.waitForEvent('download'), p.locator('main [data-action="ws-export"]').first().click()]);
  const f = path.join(__dirname, 'snap-' + (snapN++) + '.json'); await dl.saveAs(f);
  const j = JSON.parse(fs.readFileSync(f, 'utf8')); return { file: f, atlas: (j.workspace && j.workspace.atlas) || {}, review: (j.workspace && j.workspace.atlas && j.workspace.atlas.review) || {} };
}
const importFile = async (p, f) => { await p.goto(U + '#/settings'); await p.waitForTimeout(600); await p.setInputFiles('#fileWorkspace', f); await p.waitForTimeout(800); };
/* One pass through the drill for an entry. policy(k, rowIndex) -> true answers correctly, false answers wrongly. */
async function drillPass(p, eid, policy) {
  await p.goto(U + '#/atlas/' + eid); await p.waitForTimeout(250);
  await p.click('[data-action="atlas-practice-start"]'); await p.waitForTimeout(250);
  const n = MATRIX.find(x => x.id === eid).matrix.length; const seen = [];
  for (let k = 0; k < n; k++) {
    const req = (await p.locator('#atlas-req').innerText()).trim(); const { i, row } = rowOf(eid, req); seen.push(i);
    const good = policy(k, i);
    await p.evaluate(({ v, good }) => { const bs = [...document.querySelectorAll('[data-action="atlas-practice-answer"]')]; (good ? bs.find(b => b.dataset.candidate === v) : bs.find(b => b.dataset.candidate !== v)).click(); }, { v: row.candidate, good });
    await p.waitForTimeout(60); await p.click('#atlas-next'); await p.waitForTimeout(60);
  }
  return seen;
}
/* Answer every card currently shown in the review queue. policy(i, rowCandidate) -> true correct / false wrong. */
async function reviewAll(p, policy) {
  const done = [];
  for (let guard = 0; guard < 30; guard++) {
    const el = p.locator('[data-action="atlas-review-answer"]'); if (await el.count() === 0) break;
    const req = (await p.locator('#atlas-req').innerText()).trim();
    let found = null; for (const e of MATRIX) { const i = e.matrix.findIndex(r => r.requirement === req); if (i >= 0) { found = { id: 'm-' + e.id + '-' + i, row: e.matrix[i] }; break; } }
    const good = policy(found.id, done.length);
    await p.evaluate(({ v, good }) => { const bs = [...document.querySelectorAll('[data-action="atlas-review-answer"]')]; (good ? bs.find(b => b.dataset.candidate === v) : bs.find(b => b.dataset.candidate !== v)).click(); }, { v: found.row.candidate, good });
    await p.waitForTimeout(80); done.push(found.id);
    await p.click('#atlas-rnext'); await p.waitForTimeout(80);
  }
  return done;
}

(async () => {
  const b = await chromium.launch();

  // ---------- 1. Drill answers create cards; early answers do not extend or fake progress ----------
  let { ctx, p } = await fresh(b, 'drill');
  await p.goto(U + '#/atlas/review'); await p.waitForTimeout(400);
  let t = await txt(p);
  ok('Review page with nothing scheduled says nothing is due', /Nothing due/i.test(t));
  await p.goto(U + '#/atlas'); await p.waitForTimeout(400); t = await txt(p);
  ok('Atlas list has a Scheduled review tile', t.includes('Scheduled review') && await p.locator('a[href="#/atlas/review"]').count() > 0);

  const seen1 = await drillPass(p, 'X01', k => k !== 0); // miss the first question, answer the rest correctly
  const missId = 'm-X01-' + seen1[0];
  let s1 = await snapshot(p); let now1 = await appNow(p);
  ok('One card per drilled row', Object.keys(s1.review).filter(k => k.startsWith('m-X01-')).length === 6);
  const miss = s1.review[missId];
  ok('The missed row starts at stage 0 with one lapse', miss && miss.stage === 0 && miss.lapses === 1 && miss.reviews === 1);
  ok('The missed card is due about 4 hours out (the "Same day" step)', miss.due - now1 > 3.5 * HOUR && miss.due - now1 < 4.5 * HOUR);
  const others = Object.entries(s1.review).filter(([k]) => k !== missId && k.startsWith('m-X01-'));
  ok('Rows answered correctly the first time sit one step up (stage 1, no lapses)', others.length === 5 && others.every(([, c]) => c.stage === 1 && c.lapses === 0 && c.reviews === 1));
  ok('A fresh card stores a hist entry with the grade', miss.hist.length === 1 && miss.hist[0].g === 1 && others[0][1].hist[0].g === 3);
  ok('The requirement text is snapshotted on each card', miss.req === rowFromCard(missId).requirement);

  await drillPass(p, 'X01', () => true); // everything correct, but none is due yet
  let s2 = await snapshot(p);
  ok('Correct answers before a card is due do not push it further out', JSON.stringify(s2.review) === JSON.stringify(s1.review));
  const seen3 = await drillPass(p, 'X01', k => k !== 0); // first question wrong while not yet due
  let s3 = await snapshot(p); const wrongId = 'm-X01-' + seen3[0];
  ok('A wrong answer before the card is due still counts as a lapse and resets it', s3.review[wrongId].stage === 0 && s3.review[wrongId].lapses === s2.review[wrongId].lapses + 1);
  ok('Every other card is untouched by that miss', Object.keys(s3.review).filter(k => k !== wrongId).every(k => JSON.stringify(s3.review[k]) === JSON.stringify(s2.review[k])));

  // ---------- 2. Nothing is offered until due; then review moves cards on the ladder ----------
  await p.goto(U + '#/atlas'); await p.waitForTimeout(250); await p.goto(U + '#/atlas/review'); await p.waitForTimeout(350); t = await txt(p);
  ok('Cards that are not yet due are not offered', /Nothing due/i.test(t));
  await jump(p, 5 * HOUR);
  await p.goto(U + '#/atlas'); await p.waitForTimeout(300); t = await txt(p);
  const dueIds = Object.keys(s3.review).filter(k => s3.review[k].due <= 0 || true).filter(k => s3.review[k].stage === 0);
  ok('After 5 hours the stage-0 cards are due and the tile says so', new RegExp('Scheduled review · ' + dueIds.length + ' due').test(t));
  await p.goto(U + '#/atlas/review'); await p.waitForTimeout(350); t = await txt(p);
  ok('A due card shows its requirement and answer choices', await p.locator('[data-action="atlas-review-answer"]').count() >= 2 && /Card 1 of/.test(t));
  const optsA = await p.evaluate(() => [...document.querySelectorAll('[data-action="atlas-review-answer"]')].map(x => x.dataset.candidate).join('|'));
  await p.click('#atlas-req').catch(() => {}); await p.evaluate(() => window.dispatchEvent(new HashChangeEvent('hashchange', { oldURL: location.href, newURL: location.href }))); await p.waitForTimeout(150);
  const optsB = await p.evaluate(() => [...document.querySelectorAll('[data-action="atlas-review-answer"]')].map(x => x.dataset.candidate).join('|'));
  ok('Review answer options do not reshuffle when the screen re-renders', optsA === optsB);

  // double-answer guard: re-attach the answer buttons after the first click re-renders, then click a second one
  const firstReq = (await p.locator('#atlas-req').innerText()).trim(); const firstFound = (() => { for (const e of MATRIX) { const i = e.matrix.findIndex(r => r.requirement === firstReq); if (i >= 0) return { id: 'm-' + e.id + '-' + i, row: e.matrix[i] }; } })();
  await p.evaluate(v => { const bs = [...document.querySelectorAll('[data-action="atlas-review-answer"]')]; const good = bs.find(x => x.dataset.candidate === v), other = bs.find(x => x.dataset.candidate !== v); good.click(); document.body.appendChild(other); other.click(); other.remove(); }, firstFound.row.candidate);
  await p.waitForTimeout(250); t = await txt(p);
  ok('The answer shows why it fits and what to verify', /Why it fits/.test(t) && /What to verify/.test(t));
  await p.click('#atlas-rnext'); await p.waitForTimeout(100);
  const rest = await reviewAll(p, () => true); const reviewedIds = [firstFound.id, ...rest];
  t = await txt(p);
  ok('Finishing shows "recalled N of N" and says it is not a readiness score', new RegExp('Recalled ' + reviewedIds.length + ' of ' + reviewedIds.length).test(t) && /not a readiness score/i.test(t));
  const s4 = await snapshot(p); const now4 = await appNow(p);
  ok('The cards due after 5 hours were all reviewed', reviewedIds.length === dueIds.length && dueIds.every(k => reviewedIds.includes(k)));
  ok('Correct review answers moved each reviewed card up exactly one stage, out to about a day', reviewedIds.every(k => s4.review[k].stage === s3.review[k].stage + 1 && s4.review[k].reviews === s3.review[k].reviews + 1 && s4.review[k].due - now4 > 20 * HOUR && s4.review[k].due - now4 < 28 * HOUR));
  ok('Answering the same card twice only scheduled it once (the double click was ignored)', s4.review[firstFound.id].reviews === s3.review[firstFound.id].reviews + 1);

  // ---------- 3. Wrong review answers, session cap, stale cards ----------
  await drillPass(p, 'X02', () => true); // 7 more cards; with X01's 6 that is 13
  await jump(p, 3 * DAY);
  await p.goto(U + '#/atlas'); await p.waitForTimeout(250); await p.goto(U + '#/atlas/review'); await p.waitForTimeout(350); t = await txt(p);
  const s5pre = await snapshot(p);
  const totalCards = Object.keys(s5pre.review).filter(k => k.startsWith('m-')).length;
  await p.goto(U + '#/atlas'); await p.waitForTimeout(250); await p.goto(U + '#/atlas/review'); await p.waitForTimeout(350); t = await txt(p);
  ok('A review session is capped at 10 cards and says how many are due in all', /Card 1 of 10/.test(t) && new RegExp('\\(' + totalCards + ' due in all\\)').test(t));
  const wrongFirst = await reviewAll(p, (id, n) => n !== 0); // first card wrong
  const s5 = await snapshot(p);
  ok('A wrong review answer sends that card back to stage 0 with another lapse', s5.review[wrongFirst[0]].stage === 0 && s5.review[wrongFirst[0]].lapses === s5pre.review[wrongFirst[0]].lapses + 1);
  ok('The cards past the 10-card cap are left for the next session, unchanged', Object.keys(s5.review).filter(k => !wrongFirst.includes(k)).every(k => JSON.stringify(s5.review[k]) === JSON.stringify(s5pre.review[k])));
  await ctx.close();

  // ---------- 4. Error-log entries: escaped, answer hidden until revealed, self-graded ----------
  ({ ctx, p } = await fresh(b, 'errorlog'));
  let dialogs = 0; p.on('dialog', d => { dialogs++; d.dismiss(); });
  await p.goto(U + '#/atlas/errorlog'); await p.waitForTimeout(400);
  await p.fill('#el-q', 'Q-REV-01');
  await p.fill('#el-wm', '<img src=x onerror=alert(1)> logs are always on');
  await p.fill('#el-cr', 'Admin Activity is always on; Data Access is off by default.');
  await p.fill('#el-tt', 'Is a Data Access read of a bucket logged by default?');
  await p.click('[data-action="atlas-errorlog-add"]'); await p.waitForTimeout(250);
  let e1 = await snapshot(p); const eKey = Object.keys(e1.review).find(k => k.startsWith('e-')); let nowE = await appNow(p);
  ok('Logging a miss creates a card due later today, not immediately', !!eKey && e1.review[eKey].stage === 0 && e1.review[eKey].due - nowE > 3.5 * HOUR && e1.review[eKey].due - nowE < 4.5 * HOUR);
  await p.goto(U + '#/atlas/review'); await p.waitForTimeout(300); t = await txt(p);
  ok('That card is not offered until it is due', /Nothing due/i.test(t));
  await jump(p, 5 * HOUR);
  await p.goto(U + '#/atlas'); await p.waitForTimeout(250); await p.goto(U + '#/atlas/review'); await p.waitForTimeout(350); t = await txt(p);
  ok('A due error-log card asks for the corrected rule and applies the transfer test', /corrected rule/i.test(t) && t.includes('Is a Data Access read of a bucket logged by default?'));
  ok('The corrected rule is hidden until it is revealed', !t.includes('Admin Activity is always on'));
  ok('Logged HTML is shown as text and nothing executes', t.includes('<img src=x onerror=alert(1)>') && await p.locator('main img[src="x"]').count() === 0 && dialogs === 0);
  ok('Grade buttons are not offered before the rule is revealed', await p.locator('[data-action="atlas-review-grade"]').count() === 0);
  await p.click('[data-action="atlas-review-reveal"]'); await p.waitForTimeout(200); t = await txt(p);
  ok('Revealing shows the corrected rule and four grade buttons', t.includes('Admin Activity is always on') && await p.locator('[data-action="atlas-review-grade"]').count() === 4);
  await p.evaluate(() => { const bs = [...document.querySelectorAll('[data-action="atlas-review-grade"]')]; const good = bs[2], again = bs[0]; good.click(); document.body.appendChild(again); again.click(); again.remove(); });
  await p.waitForTimeout(250);
  let e2 = await snapshot(p);
  ok('Grading Good moved the card up one stage; a second grade click was ignored', e2.review[eKey].stage === 1 && e2.review[eKey].reviews === 1 && e2.review[eKey].lapses === 0);
  ok('The grade is recorded in the card history', e2.review[eKey].hist.length === 1 && e2.review[eKey].hist[0].g === 3);

  // ---------- 5. Export/import: deleting removes the card; an older file cannot bring it back ----------
  const wOlder = e2.file;
  ok('Export carries the review cards', !!JSON.parse(fs.readFileSync(wOlder, 'utf8')).workspace.atlas.review[eKey]);
  await p.goto(U + '#/atlas/errorlog'); await p.waitForTimeout(300);
  await p.click('[data-action="atlas-errorlog-delete"]'); await p.waitForTimeout(250);
  const e3 = await snapshot(p); const wNewer = e3.file;
  ok('Deleting an error-log entry removes its card', !e3.review[eKey]);
  await ctx.close();

  ({ ctx, p } = await fresh(b, 'import'));
  await importFile(p, wOlder); let i1 = await snapshot(p);
  ok('Importing the older export brings back the card with its progress', !!i1.review[eKey] && i1.review[eKey].stage === 1 && i1.review[eKey].reviews === 1);
  await importFile(p, wOlder); let i2 = await snapshot(p);
  ok('Re-importing the same file does not change the card', JSON.stringify(i2.review[eKey]) === JSON.stringify(i1.review[eKey]));
  await importFile(p, wNewer); let i3 = await snapshot(p);
  ok('Importing the post-delete export removes the entry\'s card', !i3.review[eKey]);
  await importFile(p, wOlder); let i4 = await snapshot(p);
  ok('Re-importing the older export cannot resurrect the deleted entry\'s card', !i4.review[eKey]);

  // a newer local review is not overwritten by an older file: import the older file, review the card here, import it again
  await ctx.close(); ({ ctx, p } = await fresh(b, 'newer-local'));
  await importFile(p, wOlder);
  await jump(p, 3 * DAY); await p.goto(U + '#/atlas'); await p.waitForTimeout(300); await p.goto(U + '#/atlas/review'); await p.waitForTimeout(350);
  await p.click('[data-action="atlas-review-reveal"]'); await p.waitForTimeout(150);
  await p.click('[data-action="atlas-review-grade"][data-g="4"]'); await p.waitForTimeout(250);
  const n1 = await snapshot(p);
  await importFile(p, wOlder); const n2 = await snapshot(p);
  ok('An older export does not overwrite a card reviewed more recently here', n1.review[eKey].reviews === 2 && JSON.stringify(n2.review[eKey]) === JSON.stringify(n1.review[eKey]));
  await ctx.close();

  // ---------- 6. Old data and stale cards ----------
  ({ ctx, p } = await fresh(b, 'legacy'));
  const nowL = Date.now();
  const legacy = { format: 'cloudwalker-workspace', version: 1, app: 'BluePrint CloudWalker Trainer', workspace: { atlas: { practice: {}, updated: nowL,
    errorlog: { entries: [{ id: 'el-legacy1', date: '2026-10-01', questionId: 'Q-LEGACY', wrongModel: 'old belief', correctedRule: 'old rule', evidence: '', transferTest: '', retested: '', updated: nowL - DAY }], deleted: {} },
    review: { 'm-X02-0': { stage: 0, due: 1, last: 1, lapses: 0, reviews: 0, hist: [], req: 'a requirement that no longer exists' }, 'm-X99-0': { stage: 0, due: 1, last: 1, lapses: 0, reviews: 0, hist: [], req: '' } } } } };
  const legacyFile = path.join(__dirname, 'atlas-review-legacy.json'); fs.writeFileSync(legacyFile, JSON.stringify(legacy));
  await importFile(p, legacyFile);
  await p.goto(U + '#/atlas'); await p.waitForTimeout(400); t = await txt(p);
  console.log('   (tile text seen: ' + JSON.stringify(t.slice(Math.max(0, t.indexOf('Scheduled review')), t.indexOf('Scheduled review') + 60)) + ')');
  ok('An error-log entry from before scheduled review gets a card and shows as due, while stale cards are ignored', /Scheduled review · 1 due/.test(t));
  const l1 = await snapshot(p);
  ok('The backfilled card exists after the next save', !!l1.review['e-el-legacy1']);
  await ctx.close();

  // ---------- 7. Malformed review data is rejected without polluting prototypes ----------
  ({ ctx, p } = await fresh(b, 'malformed'));
  const now = Date.now(); const good = { stage: 2, due: now + DAY, last: now, lapses: 0, reviews: 3, hist: [{ t: now, g: 3 }], req: '' };
  const bad = { format: 'cloudwalker-workspace', version: 1, app: 'BluePrint CloudWalker Trainer',
    workspace: { atlas: { practice: {}, errorlog: { entries: [], deleted: {} }, updated: now, review: {
      '__proto__': good, 'constructor': good, 'm-X01-1': Object.assign({}, good, { stage: 99 }), 'm-X01-2': Object.assign({}, good, { stage: 1.5 }), 'm-X01-3': Object.assign({}, good, { due: 'soon' }),
      'm-X01-4': Object.assign({}, good, { reviews: -1 }), 'x-X01-5': good, 'm-X01-6': 'not an object',
      'm-X01-7': Object.assign({}, good, { hist: Array.from({ length: 50 }, (_, i) => ({ t: now - i, g: i % 2 ? 9 : 3 })), req: 'r'.repeat(1000) }),
      'm-X01-0': good } } } };
  const badFile = path.join(__dirname, 'atlas-review-malformed.json'); fs.writeFileSync(badFile, JSON.stringify(bad));
  await importFile(p, badFile);
  const polluted = await p.evaluate(() => ({ proto: ({}).stage, ctor: typeof ({}).constructor === 'function' }));
  ok('A "__proto__" or "constructor" card key does not pollute Object.prototype', polluted.proto === undefined && polluted.ctor === true);
  const m1 = await snapshot(p); const c = m1.review;
  ok('A well-formed card in the same bad import still comes through', !!c['m-X01-0'] && c['m-X01-0'].stage === 2);
  ok('Out-of-range, non-integer, wrong-type, negative and unknown-prefix cards are rejected', ['m-X01-1', 'm-X01-2', 'm-X01-3', 'm-X01-4', 'x-X01-5', 'm-X01-6'].every(k => !c[k]));
  ok('An oversized history and req are trimmed and invalid grades dropped', !!c['m-X01-7'] && c['m-X01-7'].hist.length <= 12 && c['m-X01-7'].hist.every(h => h.g >= 1 && h.g <= 4) && c['m-X01-7'].req.length <= 200);
  await p.goto(U + '#/atlas'); await p.waitForTimeout(300);
  ok('The Atlas page still renders after a bad import', (await txt(p)).includes('Decision Atlas'));
  await ctx.close();

  console.log('errors:', errs.length ? errs : 'none');
  console.log(failures ? `ERR ${failures} assertion(s) failed` : 'all assertions passed');
  await b.close();
  if (failures || errs.length) process.exitCode = 1;
})();
