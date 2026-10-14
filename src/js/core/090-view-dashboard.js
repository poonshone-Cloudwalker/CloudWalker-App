/* ------------------------------------------------------------------ View: Dashboard */
VIEWS.certify = () => {
  const T = totals(); const s = S.session; const ex = activeExams();
  const recent = [...S.progress.sessions].reverse().slice(0, 5);
  const weak = weakDomains(5);
  const resumeLabel = S.runner && !S.runner.finished ? 'Resume session' : 'Resume review';
  return `
  <section class="hero" aria-labelledby="h-dash">
    <h1 id="h-dash">Certification overview</h1>
    <p>${S.bank.size.toLocaleString()} questions across ${ex.length} certifications, tagged by official domain and sub-domain. Practice with feedback, test under time, then revisit what you missed.</p>
    <div class="row">
      <button class="btn primary" data-action="resume">${resumeLabel}</button>
      <a class="btn" href="#/exam">Start exam</a>
      <a class="btn" href="#/study">Study by domain</a>
      <button class="btn" data-action="quick-missed">Review incorrect</button>
      <a class="btn" href="#/library">Browse question bank</a>
    </div>
  </section>
  <div class="grid g-4" style="margin-bottom:20px">
    <div class="card kpi"><div class="v">${S.bank.size.toLocaleString()}</div><div class="l">Questions available</div><div class="s">${S.bank.size - T.uniqSeen} not yet attempted</div></div>
    <div class="card kpi"><div class="v">${ex.length}</div><div class="l">Certifications</div><div class="s">${uniq(ex.map(e => e.vendor)).join(', ')}</div></div>
    <div class="card kpi"><div class="v">${T.att ? T.acc + '%' : '—'}</div><div class="l">Overall accuracy</div><div class="s">${T.att} answers recorded</div></div>
    <div class="card kpi"><div class="v">${s.streak}</div><div class="l">Current streak</div><div class="s">Best this session: ${s.best}. Answered: ${s.answered}</div></div>
  </div>
  <div class="grid g-2">
    <section class="card" aria-labelledby="h-weak"><div class="card-head"><h2 id="h-weak">Weakest domains</h2><a class="small" href="#/analytics">Full analytics</a></div>
      ${weak.length ? `<div class="metric-list">${weak.map(w => metric(`${w.code}: ${w.domain.replace(/^\d+\.\s*/, '')}`, w.cor, w.att)).join('')}</div><div class="row" style="margin-top:16px"><button class="btn sm" data-action="drill-weak">Drill weakest domain</button></div>`
        : emptyState('No weak spots measured yet', 'Answer at least three questions in a domain and it will show up here, ranked from lowest accuracy.', '<a class="btn primary sm" href="#/study">Start a study session</a>')}
    </section>
    <section class="card" aria-labelledby="h-recent"><div class="card-head"><h2 id="h-recent">Recent sessions</h2></div>
      ${recent.length ? `<div class="list">${recent.map(r => `<div class="list-item"><div><strong>${esc(r.title)}</strong><div class="small muted">${modeName(r.mode)}, ${ago(r.ended)}</div></div><div class="num"><strong>${pct(r.correct, r.total)}%</strong> <span class="small muted">${r.correct}/${r.total}</span></div></div>`).join('')}</div>`
        : emptyState('Nothing recorded yet', persistOK() ? 'Finished sessions appear here with their score.' : 'Finished sessions appear here with their score. Storage is blocked in this browser, so export progress from Settings before closing the tab.')}
    </section>
  </div>
  <section class="card" style="margin-top:20px" aria-labelledby="h-cov"><div class="card-head"><h2 id="h-cov">Blueprint coverage</h2><span class="small muted">Segment width is the official domain weight; fill shows how much of that domain you've practiced.</span></div>
    <div class="grid g-2">${ex.map(e => { const qs = examQs(e.code); const seen = qs.filter(q => isSeen(q.id)).length; return `<div><div class="cov-head"><strong>${esc(e.code)}</strong><span class="small muted nm">${esc(e.name)}</span><span class="small">${pct(seen, qs.length)}% practiced</span></div>${blueprintStrip(e.code)}</div>`; }).join('')}</div>
  </section>`;
};
const modeName = m => ({ learn: 'Learn', exam: 'Simulated exam', review: 'Review', drill: 'Focus drill', mastery: 'Mastery review', single: 'Single question', retention: 'Retention review', recall: 'Recall practice' }[m] || m);

