/* ------------------------------------------------------------------ View: Exam setup */
VIEWS.exam = () => {
  const f = S.ui.exam ||= { exam: activeExams()[0]?.code || '', count: 50, minutes: 90, diffs: ['easy', 'medium', 'hard'], reveal: 'end' };
  const pool = examQs(f.exam).filter(q => f.diffs.includes(q.difficulty)).length;
  const ex = examMetaFor(f.exam);
  return `
  <div class="page-head"><div><h1>Simulated exam</h1><p class="muted">Questions are sampled in proportion to the official domain weights. Answers lock as soon as you choose, and the score is broken down by domain at the end.</p></div></div>
  <div class="grid g-2">
    <section class="card" aria-labelledby="h-setup"><h2 id="h-setup">Exam setup</h2>
      <form class="stack" data-form="exam">
        <div class="field"><label for="e-exam">Certification</label><select id="e-exam" name="exam">${examOpts(f.exam, null)}</select></div>
        <div class="grid g-2">
          <div class="field"><label for="e-count">Number of questions</label><input id="e-count" name="count" type="number" min="5" max="${pool || 200}" value="${Math.min(f.count, pool || f.count)}" inputmode="numeric"></div>
          <div class="field"><label for="e-min">Time limit (minutes, 0 for untimed)</label><input id="e-min" name="minutes" type="number" min="0" max="300" value="${f.minutes}" inputmode="numeric"></div>
        </div>
        <fieldset><legend class="lbl small muted" style="font-weight:600;margin-bottom:6px">Difficulty mix</legend>
          <div class="checks">${DIFFS.map(d => { const n = examQs(f.exam).filter(q => q.difficulty === d).length; return `<label class="check"><input type="checkbox" name="diff" value="${d}" ${f.diffs.includes(d) ? 'checked' : ''} ${n ? '' : 'disabled'}> ${d[0].toUpperCase() + d.slice(1)} <span class="faint small">(${n})</span></label>`; }).join('')}</div>
        </fieldset>
        <div class="field"><span class="lbl" id="lbl-rev">Explanations</span>
          <div class="seg-control" role="group" aria-labelledby="lbl-rev">${[['end', 'At the end'], ['immediate', 'After each question']].map(([k, l]) => `<button type="button" data-action="exam-reveal" data-v="${k}" aria-pressed="${f.reveal === k}">${l}</button>`).join('')}</div>
        </div>
        <p class="small muted" aria-live="polite">${pool} questions eligible. ${ex ? 'Domain weights: ' + Object.entries(ex.domain_weights || {}).map(([k, v]) => `D${k} ${v}%`).join(', ') + '.' : ''}</p>
        <div class="row"><button class="btn primary" type="submit" ${pool ? '' : 'disabled'}>Start exam</button></div>
      </form>
    </section>
    <section class="card" aria-labelledby="h-bp"><h2 id="h-bp">${esc(ex?.name || '')}</h2>
      ${f.exam ? blueprintStrip(f.exam, true) : ''}
      <div class="legend">${domainsOf(f.exam).map(d => { const n = parseInt(d, 10); const w = (ex.domain_weights || {})[n]; const t = totals(q => q.exam_code === f.exam && q.domain === d); return `<div><span>${esc(d)}</span><span class="muted">${w ? w + '%' : ''}${t.att ? `, ${t.acc}% correct` : ''}</span></div>`; }).join('')}</div>
      <p class="small muted" style="margin-top:14px">Real exams vary in length and time. As a guide, Google Cloud professional exams allow about 2 hours, AZ-305 about 100 minutes, SAA-C03 130 minutes for 65 questions, and the AIB-C01 beta 170 minutes for 85 questions (130 minutes is quoted for the standard exam).</p>
    </section>
  </div>`;
};
function startExam() {
  const f = S.ui.exam; if (!f.diffs.length) { toast('Choose at least one difficulty level.'); return; }
  const n = Math.max(1, parseInt(f.count, 10) || 50);
  const ids = blueprintSample(f.exam, n, f.diffs);
  startRunner({ title: `${f.exam} practice exam`, mode: 'exam', ids, reveal: f.reveal, minutes: Math.max(0, parseInt(f.minutes, 10) || 0), examCode: f.exam });
}

