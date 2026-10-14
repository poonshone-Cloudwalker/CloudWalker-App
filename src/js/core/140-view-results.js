/* ------------------------------------------------------------------ View: Results */
VIEWS.results = () => {
  const r = S.lastResult;
  if (!r) return emptyState('No results yet', 'Finish a session to see your score and domain breakdown here.', '<a class="btn primary" href="#/exam">Start exam</a>');
  const score = pct(r.correct, r.total);
  const doms = Object.entries(r.byDomain).sort((a, b) => a[0].localeCompare(b[0], undefined, { numeric: true }));
  const missed = r.ids.filter(id => !r.responses[id]?.correct);
  return `
  <div class="page-head"><div><h1>${esc(r.title)}</h1><p class="muted">${modeName(r.mode)}, finished ${ago(r.ended)} in ${fmtTime((r.ended - r.started) / 1000)}.</p></div>
    <div class="row"><button class="btn primary" data-action="review-last">Review answers</button>${missed.length ? `<button class="btn" data-action="retry-missed">Retry ${missed.length} missed</button>` : ''}</div></div>
  <div class="grid g-4" style="margin-bottom:20px">
    <div class="card kpi"><div class="v">${score}%</div><div class="l">Score</div><div class="s">${r.correct} of ${r.total} correct</div></div>
    <div class="card kpi"><div class="v">${r.answered}</div><div class="l">Answered</div><div class="s">${r.total - r.answered} left blank</div></div>
    <div class="card kpi"><div class="v">${missed.length}</div><div class="l">To review</div><div class="s">Missed or unanswered</div></div>
    <div class="card kpi"><div class="v">${doms.length}</div><div class="l">Domains covered</div><div class="s">${r.timed ? 'Timed' : 'Untimed'} session</div></div>
  </div>
  <section class="card" aria-labelledby="h-rd"><h2 id="h-rd">Score by domain</h2><div class="metric-list">${doms.map(([d, v]) => metric(d, v.correct, v.total)).join('')}</div></section>
  <section class="card" style="margin-top:20px" aria-labelledby="h-rq"><h2 id="h-rq">Questions</h2>
    <div class="stack">${r.ids.map((id, i) => { const q = Q(id); const rs = r.responses[id]; return `<button class="lib-item" data-action="open-q" data-id="${esc(id)}"><div class="lib-top"><strong>${i + 1}.</strong><span class="status ${rs ? (rs.correct ? 'ok' : 'no') : 'no'}">${rs ? (rs.correct ? 'Correct' : 'Incorrect') : 'Unanswered'}</span><span>${esc(q.subdomain)}</span></div><div class="qline">${rich(q.question)}</div></button>`; }).join('')}</div>
  </section>`;
};

