/* ------------------------------------------------------------------ View: Runner */
VIEWS.run = () => {
  const r = S.runner;
  if (!r) return emptyState('No active session', 'Start a study set, a focus drill, or a practice exam to begin.', '<a class="btn primary" href="#/study">Study</a><a class="btn" href="#/exam">Start exam</a>');
  const id = r.ids[r.idx]; const q = Q(id); const resp = r.resp[id];
  const reveal = r.readOnly || (resp && r.reveal === 'immediate');
  const answeredCount = r.ids.filter(x => r.resp[x]).length;
  const flagged = S.progress.flags.has(id); const conf = S.progress.confidence[id] || '';
  const optionHtml = q.options.map((o, i) => {
    let cls = '', verdict = '';
    const chosen = resp ? resp.choice === i : r.readOnly && lastAttempt(id)?.choice === i;
    if (reveal) { if (i === q.correct_index) { cls = 'correct'; verdict = 'Correct answer'; } else if (chosen) { cls = 'wrong'; verdict = 'Your answer'; } }
    else if (chosen) cls = 'chosen';
    return `<button class="opt ${cls}" data-action="answer" data-i="${i}" ${resp || r.readOnly ? 'disabled' : ''} aria-describedby="qtext"><span class="key" aria-hidden="true">${LETTERS[i]}</span><span><span class="sr-only">Option ${LETTERS[i]}: </span>${rich(o)}</span><span class="verdict">${verdict}</span></button>`;
  }).join('');
  return `
  <div class="run-head">
    <span class="title">${esc(r.title)}</span>
    <span class="spacer"></span>
    ${r.endAt ? `<span class="timer" id="timer" role="timer" aria-label="Time remaining">${fmtTime((r.endAt - Date.now()) / 1000)}</span>` : ''}
    <button class="btn sm" data-action="end-run">${r.readOnly ? 'Close review' : r.mode === 'exam' ? 'Submit exam' : 'End session'}</button>
  </div>
  <div class="bar" style="margin-bottom:18px" role="progressbar" aria-label="Session progress" aria-valuemin="0" aria-valuemax="${r.ids.length}" aria-valuenow="${answeredCount}"><i style="width:${pct(answeredCount, r.ids.length)}%"></i></div>
  <div class="runner">
    <article class="card qcard" aria-labelledby="qhead">
      <h2 class="sr-only" id="qhead">Question ${r.idx + 1} of ${r.ids.length}</h2>
      <div class="qmeta"><span class="chip strong">Question ${r.idx + 1} of ${r.ids.length}</span><span class="chip">${esc(q.exam_code)}</span><span class="chip">${esc(q.domain)}</span><span class="chip">${esc(q.subdomain)}</span></div>
      <p class="qtext" id="qtext" tabindex="-1">${rich(q.question)}</p>
      <div class="options" role="group" aria-label="Answer options">${optionHtml}</div>
      ${reveal ? explainPanel(q, resp ? resp.correct : (lastAttempt(id) ? lastAttempt(id).correct : null)) : resp ? `<p class="notice" style="margin-top:18px">Answer ${LETTERS[resp.choice]} locked. Explanations appear when you submit the exam.</p>` : ''}
      <div class="qmeta" style="margin-top:18px">${reveal ? q.services.map(s => `<span class="chip">${esc(s)}</span>`).join('') + q.tags.map(t => `<span class="chip">#${esc(t)}</span>`).join('') : '<span class="chip faint">Related services and tags appear after the answer is revealed</span>'}<span class="chip">${esc(q.question_type)}</span><span class="chip">${esc(q.difficulty)}${q.difficulty_source === 'inferred' ? ' (inferred)' : ''}</span><span class="chip faint">${esc(q.id)}</span></div>
      <div class="run-foot">
        <button class="btn ${flagged ? 'flag-on' : ''}" data-action="flag" aria-pressed="${flagged}">${flagged ? 'Flagged' : 'Flag for later'}</button>
        <div class="seg-control" role="group" aria-label="Confidence">${['high', 'medium', 'low'].map(c => `<button type="button" data-action="conf" data-v="${c}" aria-pressed="${conf === c}">${c[0].toUpperCase() + c.slice(1)}</button>`).join('')}</div>
        <span class="spacer"></span>
        <button class="btn" data-action="prev" ${r.idx === 0 ? 'disabled' : ''}>Previous</button>
        ${r.idx < r.ids.length - 1 ? `<button class="btn primary" data-action="next">Next question</button>` : `<button class="btn primary" data-action="end-run">${r.readOnly ? 'Close review' : r.mode === 'exam' ? 'Submit exam' : 'Finish session'}</button>`}
      </div>
    </article>
    <aside class="side-panel" aria-label="Session details">
      <section class="card"><h3>${r.mode === 'exam' ? 'Question map' : 'Progress'}</h3>
        <p class="small muted" style="margin-bottom:10px">${answeredCount} of ${r.ids.length} answered${r.reveal === 'immediate' || r.readOnly ? `, ${r.ids.filter(x => r.resp[x]?.correct).length} correct` : ''}.</p>
        <div class="palette">${r.ids.map((x, i) => { const rs = r.resp[x]; const st = rs ? (r.reveal === 'immediate' || r.readOnly ? (rs.correct ? 'ok' : 'no') : 'done') : ''; return `<button class="${st} ${i === r.idx ? 'cur' : ''} ${S.progress.flags.has(x) ? 'flag' : ''}" data-action="jump" data-i="${i}" aria-label="Question ${i + 1}${rs ? ', answered' : ''}${S.progress.flags.has(x) ? ', flagged' : ''}" ${i === r.idx ? 'aria-current="true"' : ''}>${i + 1}</button>`; }).join('')}</div>
      </section>
      <section class="card small"><h3>Shortcuts</h3><p class="muted"><span class="kbd">1</span>–<span class="kbd">4</span> answer, <span class="kbd">Enter</span> next, <span class="kbd">←</span> back, <span class="kbd">F</span> flag.</p></section>
    </aside>
  </div>`;
};
function explainPanel(q, correct) {
  const state = correct === true ? 'ok' : correct === false ? 'no' : '';
  const line = correct === true ? 'Correct.' : correct === false ? `Not quite. The answer is ${LETTERS[q.correct_index]}.` : `The answer is ${LETTERS[q.correct_index]}.`;
  return `<section class="explain ${state}" aria-label="Explanation">
    <p class="result-line">${line}</p>
    <div class="blk"><h3>Why ${LETTERS[q.correct_index]} is correct</h3><p>${rich(q.correct_rationale || q.explanation)}</p></div>
    ${q.distractor_rationales.length ? `<div class="blk"><h3>Why not the others</h3><ul>${q.distractor_rationales.map((d, i) => i === q.correct_index || !d ? '' : `<li><strong>${LETTERS[i]}.</strong> ${rich(d)}</li>`).join('')}</ul></div>` : q.distractor_summary ? `<div class="blk"><h3>Why not the others</h3><p>${rich(q.distractor_summary)}</p></div>` : ''}
    ${q.common_traps.length ? `<div class="blk"><h3>Common traps</h3><p>${q.common_traps.map(rich).join('; ')}</p></div>` : ''}
    ${q.prerequisites.length ? `<div class="blk"><h3>Prerequisites</h3><p>${q.prerequisites.map(rich).join(', ')}</p></div>` : ''}
    ${correct === false ? relatedLinks(q) : ''}
  </section>`;
}

