/* ------------------------------------------------------------------ View: Analytics */
VIEWS.analytics = () => {
  const T = totals();
  if (!T.att) return `<div class="page-head"><div><h1>Analytics</h1></div></div>` + emptyState('No answers recorded yet', 'Analytics update live as you answer. Start a session, or import progress you exported earlier from Settings.', '<a class="btn primary" href="#/study">Start studying</a><a class="btn" href="#/settings">Import progress</a>');
  const code = S.ui.analyticsExam || '';
  const f = q => !code || q.exam_code === code;
  const byExam = agg(() => true, q => q.exam_code);
  const byDom = agg(f, q => (code ? '' : q.exam_code + ': ') + q.domain);
  const bySub = agg(f, q => (code ? '' : q.exam_code + ' ') + q.subdomain);
  const byDiff = agg(f, q => q.difficulty);
  const bySvc = agg(f, q => q.services);
  const byTag = agg(f, q => q.tags);
  const mostMissed = m => [...m.entries()].filter(([, r]) => r.miss).sort((a, b) => b[1].miss - a[1].miss || (b[1].miss / b[1].att) - (a[1].miss / a[1].att)).slice(0, 10);
  const sortAcc = m => [...m.entries()].sort((a, b) => pct(a[1].cor, a[1].att) - pct(b[1].cor, b[1].att));
  const exams = activeExams();
  const typeAgg = agg(f, q => q.question_type);
  return `
  <div class="page-head"><div><h1>Analytics</h1><p class="muted">Updated live from every answer in this runtime. Accuracy counts every attempt, so repeated misses weigh more.</p></div>
    <div class="field" style="min-width:240px"><label for="a-exam">Scope</label><select id="a-exam" data-change="analytics-exam">${examOpts(code)}</select></div></div>
  <div class="grid g-4" style="margin-bottom:20px">
    <div class="card kpi"><div class="v">${totals(f).att}</div><div class="l">Answers recorded</div><div class="s">${totals(f).uniqSeen} unique questions</div></div>
    <div class="card kpi"><div class="v">${totals(f).acc}%</div><div class="l">Accuracy</div><div class="s">${totals(f).cor} correct</div></div>
    <div class="card kpi"><div class="v">${allQ().filter(q => f(q) && isMissed(q.id)).length}</div><div class="l">Currently missed</div><div class="s">Last attempt was wrong</div></div>
    <div class="card kpi"><div class="v">${pct(allQ().filter(q => f(q) && isSeen(q.id)).length, allQ().filter(f).length)}%</div><div class="l">Bank coverage</div><div class="s">of ${allQ().filter(f).length} questions</div></div>
  </div>
  <div class="grid g-2">
    <section class="card" aria-labelledby="h-ae"><h2 id="h-ae">By certification</h2><div class="metric-list">${exams.map(e => { const r = byExam.get(e.code); return metric(`${e.code}, ${e.vendor}`, r?.cor || 0, r?.att || 0); }).join('')}</div></section>
    <section class="card" aria-labelledby="h-ad"><h2 id="h-ad">By domain <span class="small muted">(weakest first)</span></h2><div class="metric-list">${sortAcc(byDom).slice(0, 12).map(([k, r]) => metric(k, r.cor, r.att)).join('') || '<p class="muted">No data in this scope.</p>'}</div></section>
    <section class="card" aria-labelledby="h-as"><h2 id="h-as">By sub-domain <span class="small muted">(weakest first)</span></h2><div class="metric-list">${sortAcc(bySub).slice(0, 12).map(([k, r]) => metric(k, r.cor, r.att)).join('') || '<p class="muted">No data in this scope.</p>'}</div></section>
    <section class="card" aria-labelledby="h-adf"><h2 id="h-adf">By difficulty and type</h2><div class="metric-list">${DIFFS.map(d => { const r = byDiff.get(d); return metric(d[0].toUpperCase() + d.slice(1) + (allQ().some(q => q.difficulty === d && q.difficulty_source === 'inferred') ? ' (inferred)' : ''), r?.cor || 0, r?.att || 0); }).join('')}${['scenario', 'concept'].map(t => { const r = typeAgg.get(t); return metric(t[0].toUpperCase() + t.slice(1) + ' questions', r?.cor || 0, r?.att || 0); }).join('')}</div></section>
    <section class="card" aria-labelledby="h-am"><h2 id="h-am">Most-missed services</h2>${mostMissed(bySvc).length ? `<table><thead><tr><th scope="col">Service</th><th scope="col" class="num">Misses</th><th scope="col" class="num">Miss rate</th><th scope="col"><span class="sr-only">Action</span></th></tr></thead><tbody>${mostMissed(bySvc).map(([k, r]) => `<tr><td>${esc(k)}</td><td class="num">${r.miss}</td><td class="num">${pct(r.miss, r.att)}%</td><td class="num"><button class="btn sm ghost" data-action="drill-service" data-v="${esc(k)}">Drill</button></td></tr>`).join('')}</tbody></table>` : '<p class="muted">No misses yet in this scope.</p>'}</section>
    <section class="card" aria-labelledby="h-at"><h2 id="h-at">Most-missed concepts</h2>${mostMissed(byTag).length ? `<table><thead><tr><th scope="col">Tag</th><th scope="col" class="num">Misses</th><th scope="col" class="num">Miss rate</th></tr></thead><tbody>${mostMissed(byTag).map(([k, r]) => `<tr><td>#${esc(k)}</td><td class="num">${r.miss}</td><td class="num">${pct(r.miss, r.att)}%</td></tr>`).join('')}</tbody></table>` : '<p class="muted">No misses yet in this scope.</p>'}</section>
  </div>
  <section class="card" style="margin-top:20px" aria-labelledby="h-heat"><div class="card-head"><h2 id="h-heat">Coverage map</h2><span class="small muted">Share of each domain's questions you've attempted. Darker is more coverage.</span></div>${coverageHeat(code ? [examMetaFor(code)] : exams)}</section>`;
};
function coverageHeat(exams) {
  const maxD = Math.max(...exams.map(e => domainsOf(e.code).length));
  return `<div style="overflow-x:auto"><div class="heat" style="--cols:${maxD};min-width:${160 + maxD * 48}px" role="table" aria-label="Coverage by exam and domain">
    <div class="heat-row" role="row"><span role="columnheader" class="small muted">Certification</span>${Array.from({ length: maxD }, (_, i) => `<span role="columnheader" class="small muted" style="text-align:center">D${i + 1}</span>`).join('')}</div>
    ${exams.map(e => { const ds = domainsOf(e.code); return `<div class="heat-row" role="row"><span role="rowheader"><strong>${esc(e.code)}</strong></span>${Array.from({ length: maxD }, (_, i) => { const d = ds[i]; if (!d) return '<span role="cell"></span>'; const qs = examQs(e.code).filter(q => q.domain === d); const c = pct(qs.filter(q => isSeen(q.id)).length, qs.length); const a = 0.08 + c / 100 * 0.92; return `<span role="cell" class="heat-cell" title="${esc(d)}" aria-label="${esc(d)}: ${c}% attempted" style="background:rgba(75,156,211,${a.toFixed(2)});color:${c > 55 ? '#07192a' : 'var(--color-text)'}">${c}%</span>`; }).join('')}</div>`; }).join('')}
  </div></div>`;
}

