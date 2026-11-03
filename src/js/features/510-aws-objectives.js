/* ================================================================== V11: AWS exam blueprints
 * Official task statements (with knowledge and skills lists) for CLF-C02 and SAA-C03, and task titles for
 * AIB-C01, from content/aws/aws-objectives.json. Read-only reference data; nothing here is saved to the
 * workspace. Status, price, duration and pass mark come from EXAM_PROFILES (320), the single home for
 * certification facts, so the two never disagree.
 *
 * Honesty rules:
 * - Question counts per task are shown only where a data-authored bank-subdomain -> task mapping exists
 *   (aws-objectives.json bankMap). Where it does not, the page says so and shows no per-task numbers.
 * - Bank questions whose subdomain has no official task are counted separately, never hidden or folded in.
 * - An exam with no questions in the bank (CLF-C02) says so; no Practice button is offered for it.
 */
const awsObjFor = code => (AWS_OBJECTIVES.exams || {})[code] || null;
const awsNormLabel = x => String(x || '').trim().replace(/\s+/g, ' ').replace(/\.$/, '');
/* Draft questions from content packs are hidden from practice until the learner turns them on (allQ in 030), so a
 * blueprint must not claim "no questions" when drafts are installed but switched off. */
const awsHiddenDrafts = code => (S.ws && S.ws.includeDrafts === true) ? 0 : S.order.map(Q).filter(q => q && q.exam_code === code && q.packId && q.reviewStatus === 'draft').length;
function awsObjCoverage(code) {
  const qs = examQs(code); const o = awsObjFor(code); const explicit = (AWS_OBJECTIVES.bankMap || {})[code];
  const byLabel = {}; if (o) for (const d of o.domains) for (const t of d.tasks) byLabel[awsNormLabel(t.id + ' ' + t.text)] = t.id;
  /* Match by explicit data-authored map when one exists, otherwise by the exact official label "<task id> <task text>".
   * Counts are shown only when at least 80% of the questions match a task; below that the bank uses its own
   * subdomains and per-task numbers would be a wall of zeros that says nothing true about coverage. */
  const lookup = sub => explicit ? explicit[sub] : byLabel[awsNormLabel(sub)];
  const byTask = {}, outside = {}; let matched = 0;
  for (const q of qs) { const t = lookup(q.subdomain); if (t) { byTask[t] = (byTask[t] || 0) + 1; matched++; } else outside[q.subdomain] = (outside[q.subdomain] || 0) + 1; }
  const mapped = qs.length > 0 && matched / qs.length >= 0.8;
  return { mapped, total: qs.length, matched, byTask: mapped ? byTask : {}, outside: mapped ? Object.entries(outside).sort((a, b) => a[0].localeCompare(b[0], undefined, { numeric: true })) : [], hidden: awsHiddenDrafts(code) };
}
const awsList = a => a && a.length ? `<ul class="small" style="margin:4px 0 8px 18px">${a.map(x => `<li>${esc(x)}</li>`).join('')}</ul>` : '';
function awsBlueprintIndex() {
  const rows = Object.keys(AWS_OBJECTIVES.exams).map(code => ({ code, p: examProfile(code), o: awsObjFor(code), n: examQs(code).length }));
  return `<div class="page-head"><div><h1>AWS exam blueprints</h1><p class="muted">The official domains and task statements each exam is built from, with how much of each this app's practice bank covers.</p></div></div>
  <div class="grid g-3">${rows.map(r => `<article class="card exam-card"><span class="vendor">AWS · ${esc(LEVEL_LABEL[r.p.level] || r.p.level)}${r.p.status !== 'active' ? ' · ' + esc(r.p.status) : ''}</span><h3>${esc(r.p.name)}</h3>
    <p class="small muted">${esc(r.code)} · ${r.o.domains.length} domains · ${r.o.domains.reduce((n, d) => n + d.tasks.length, 0)} tasks · ${r.n ? r.n + ' practice questions' : awsHiddenDrafts(r.code) ? awsHiddenDrafts(r.code) + ' draft questions installed (switched off)' : 'no practice questions in the bank yet'}</p>
    <div class="actions"><a class="btn primary sm" href="#/blueprint/${esc(r.code)}">Open blueprint</a></div></article>`).join('')}</div>
  <p class="small muted" style="margin-top:18px">Task statements were transcribed from the official AWS exam guides (retrieved 2026-11-02 and 2026-11-03). Exams change; confirm on the official page before you book.</p>`;
}
function awsBlueprintView(code) {
  const o = awsObjFor(code), p = examProfile(code);
  if (!o || !p) return `<div class="page-head"><div><h1>Blueprint not available</h1></div></div><p class="muted">There is no stored blueprint for that exam. <a href="#/blueprint">See the exams that have one.</a></p>`;
  const cov = awsObjCoverage(code);
  const wsum = o.domains.reduce((n, d) => n + (d.weight || 0), 0);
  const coverNote = cov.total === 0 ? (cov.hidden ? `${cov.hidden} draft questions are installed but switched off. Turn on "Include draft questions" on the Content updates page to practice them and see coverage here.` : 'This exam has no questions in the practice bank yet, so there is nothing to drill. Nothing is shown as covered.')
    : cov.mapped ? `${cov.total} practice questions. Counts below match each question's subdomain label to the official task.${cov.hidden ? ` ${cov.hidden} more draft questions are switched off.` : ''}`
    : `${cov.total} practice questions. This bank groups them into subdomains that do not line up one-to-one with the official tasks, so per-task counts are not shown rather than guessed.`;
  return `<div class="page-head"><div><h1>${esc(p.name)}</h1><p class="muted">${esc(code)} · ${esc(LEVEL_LABEL[p.level] || p.level)} · status: <strong>${esc(p.status)}</strong>${p.durationMin ? ' · ' + p.durationMin + ' min' : ''}${p.questions ? ' · ' + p.questions + ' questions' : ''}${p.passScore ? ' · pass mark ' + esc(p.passScore) : ' · pass mark not published'}${p.priceUSD != null ? ' · ' + p.priceUSD + ' USD' : ''}</p></div></div>
  ${p.statusNote ? `<p class="notice" style="margin-bottom:14px">${esc(p.statusNote)}</p>` : ''}
  <section class="card" style="margin-bottom:14px"><p class="small" style="margin:0">${esc(coverNote)}</p>
    <div class="row" style="margin-top:10px;gap:8px">${cov.total ? `<button class="btn primary sm" data-action="exam-setup" data-exam="${esc(code)}">Practice exam</button>` : ''}<a class="btn sm" href="${esc(o.guideUrl)}" target="_blank" rel="noopener">Official exam guide</a><a class="btn sm" href="#/blueprint">All blueprints</a></div>
    ${wsum && wsum !== 100 ? `<p class="small muted" style="margin-top:8px">Stated domain weights add up to ${wsum}%.</p>` : ''}</section>
  <div class="stack">${o.domains.map(d => `<section class="card" aria-labelledby="bp-${esc(code)}-${d.n}"><div class="row"><h2 id="bp-${esc(code)}-${d.n}" style="margin:0;font-size:1.05rem">Domain ${d.n}: ${esc(d.name)}</h2><span class="spacer"></span><span class="chip strong">${d.weight != null ? d.weight + '% of exam' : 'weight not published'}</span></div>
    <div class="stack" style="margin-top:10px">${d.tasks.map(t => `<details class="bp-task"><summary><strong>${esc(t.id)}</strong> ${esc(t.text)}${cov.mapped ? ` <span class="chip">${cov.byTask[t.id] || 0} questions</span>` : ''}</summary>
      ${t.knowledge.length ? `<div class="small"><strong>Knowledge of</strong>${awsList(t.knowledge)}</div>` : ''}${t.skills.length ? `<div class="small"><strong>Skills in</strong>${awsList(t.skills)}</div>` : ''}
      ${!t.knowledge.length && !t.skills.length ? '<p class="small muted">The supplied data has the task title only; the knowledge and skills lists are not captured yet.</p>' : ''}</details>`).join('')}</div></section>`).join('')}</div>
  ${cov.outside.length ? `<section class="card" style="margin-top:14px"><h2 style="font-size:1.05rem">Questions outside the official task list</h2><p class="small muted">These bank subdomains have no matching task in the current exam guide, so they are not counted above. They may be older exam content or extra topics.</p><ul class="small">${cov.outside.map(([s, n]) => `<li>${esc(s)}: ${n} questions</li>`).join('')}</ul></section>` : ''}
  <p class="small muted" style="margin-top:14px">${p.viaCatalog ? `Exam facts for this entry come from a catalog snapshot dated ${esc(CATALOG_ON)}, not a direct read of the AWS page. ` : ''}Blueprint text retrieved ${esc(o.retrieved)}. Not affiliated with or endorsed by AWS.</p>`;
}
registerFeature({
  id: 'awsobj',
  css: `.bp-task{border-top:1px solid var(--color-divider);padding:8px 0}.bp-task summary{cursor:pointer}`,
  views: { blueprint: arg => arg ? awsBlueprintView(decodeURIComponent(String(arg)).trim()) : awsBlueprintIndex() },
  nav: [{ route: 'blueprint', label: 'AWS blueprints', group: 'Certify', after: 'atlas', icon: '<path d="M5 4h14v16H5zM9 8h6M9 12h6M9 16h4"/>' }]
});
