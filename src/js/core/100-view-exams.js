/* ------------------------------------------------------------------ View: Exams */
VIEWS.exams = () => `
  <div class="page-head"><div><h1>Certifications</h1><p class="muted">Each track follows the vendor's published domains. Pick one to learn, drill, or sit a timed practice exam.</p></div></div>
  <div class="grid g-3">${activeExams().map(e => {
    const qs = examQs(e.code); const ds = domainsOf(e.code); const t = totals(q => q.exam_code === e.code); const last = lastSessionFor(e.code);
    return `<article class="card exam-card" aria-labelledby="ex-${esc(e.code)}">
      <span class="vendor">${esc(e.vendor)}</span>
      <h3 id="ex-${esc(e.code)}">${esc(e.name)}</h3>
      <div class="facts"><div><strong>${qs.length}</strong>questions</div><div><strong>${ds.length}</strong>domains</div><div><strong>${t.att ? t.acc + '%' : '—'}</strong>accuracy</div></div>
      <div><div class="small muted">Blueprint coverage</div>${blueprintStrip(e.code)}</div>
      <div><div class="small muted" style="margin-bottom:4px">Difficulty <span class="faint">(${qs.every(q => q.difficulty_source === 'inferred') ? 'inferred from exam tier' : 'as provided'})</span></div>${diffBar(qs)}</div>
      <p class="small muted">${last ? `Last session: ${esc(modeName(last.mode))}, ${pct(last.correct, last.total)}% (${last.correct}/${last.total}), ${ago(last.ended)}.` : 'No session yet in this runtime.'}</p>
      <div class="actions"><button class="btn primary sm" data-action="exam-setup" data-exam="${esc(e.code)}">Practice exam</button><button class="btn sm" data-action="learn-exam" data-exam="${esc(e.code)}">Learn</button><button class="btn sm" data-action="exam-detail" data-exam="${esc(e.code)}">Domains</button></div>
    </article>`;
  }).join('')}</div>
  <p class="small muted" style="margin-top:18px">Tracks without questions in the bank (such as AWS Security Specialty or Azure security) appear here automatically once you import a question bank that includes them.</p>`;

function examDetail(code) {
  const e = examMetaFor(code); const ds = domainsOf(code);
  dialog(e.name, `${blueprintStrip(code, true)}
    <div class="stack" style="margin-top:16px">${ds.map(d => {
      const qs = examQs(code).filter(q => q.domain === d); const n = qs[0].domain_number; const t = totals(q => q.exam_code === code && q.domain === d);
      const subs = uniq(qs.map(q => q.subdomain)).sort((a, b) => a.localeCompare(b, undefined, { numeric: true }));
      return `<section class="card" style="padding:16px"><div class="row"><h3 style="margin:0">${esc(d)}</h3><span class="spacer"></span><span class="chip strong">${(e.domain_weights || {})[n] ? e.domain_weights[n] + '% of exam' : qs.length + ' questions'}</span></div>
        <p class="small muted" style="margin:6px 0 10px">${qs.length} questions, ${qs.filter(q => isSeen(q.id)).length} practiced${t.att ? `, ${t.acc}% accuracy` : ''}.</p>
        <div class="chips" style="margin-bottom:12px">${subs.map(s => `<span class="chip">${esc(s)}</span>`).join('')}</div>
        <button class="btn sm" data-action="drill-domain" data-exam="${esc(code)}" data-domain="${esc(d)}">Drill this domain</button></section>`;
    }).join('')}</div>`);
}

