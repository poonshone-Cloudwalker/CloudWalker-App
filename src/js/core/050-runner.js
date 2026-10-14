/* ------------------------------------------------------------------ Runner */
function startRunner(cfg) {
  if (!cfg.ids.length) { toast('No questions match those settings.'); return; }
  S.runner = {
    id: 'r' + Date.now(), title: cfg.title, mode: cfg.mode, reveal: cfg.reveal || 'immediate', examCode: cfg.examCode || null,
    ids: cfg.ids.slice(), idx: 0, resp: {}, shownAt: Date.now(), startedAt: Date.now(),
    endAt: cfg.minutes ? Date.now() + cfg.minutes * 60000 : null, minutes: cfg.minutes || 0, readOnly: !!cfg.readOnly, finished: false
  };
  go('run');
}
let timerHandle = null;
function tickTimer() {
  clearInterval(timerHandle);
  const r = S.runner; if (!r || !r.endAt || r.finished) return;
  timerHandle = setInterval(() => {
    const el = $('#timer'); const left = (r.endAt - Date.now()) / 1000;
    if (el) { el.textContent = fmtTime(left); el.classList.toggle('low', left < 120); }
    if (left <= 0) { clearInterval(timerHandle); announce('Time is up. Your exam has been submitted.'); finishRunner(true); }
  }, 1000);
}
function answer(choice) {
  const r = S.runner; if (!r || r.readOnly || r.finished) return;
  const id = r.ids[r.idx]; if (r.resp[id]) return;
  const q = Q(id); if (choice < 0 || choice >= q.options.length) return;
  const correct = record(id, choice, r.mode, Date.now() - r.shownAt);
  r.resp[id] = { choice, correct };
  if (r.reveal === 'immediate') announce(correct ? 'Correct.' : `Incorrect. The correct answer is ${LETTERS[q.correct_index]}.`);
  else announce(`Answer ${LETTERS[choice]} locked.`);
  render();
  const next = $('[data-action="next"]'); if (next) next.focus();
}
function move(d) { const r = S.runner; if (!r) return; const n = r.idx + d; if (n < 0 || n >= r.ids.length) return; r.idx = n; r.shownAt = Date.now(); render(); $('#qtext')?.focus(); }
function finishRunner(force) {
  const r = S.runner; if (!r || r.finished) return;
  const unanswered = r.ids.filter(id => !r.resp[id]).length;
  if (!force && !r.readOnly && unanswered && r.mode === 'exam' && !confirm(`${unanswered} question(s) are unanswered and will be scored as incorrect. Submit now?`)) return;
  r.finished = true; clearInterval(timerHandle);
  if (r.readOnly) { S.runner = null; go('results'); return; }
  const answered = r.ids.filter(id => r.resp[id]);
  const cor = answered.filter(id => r.resp[id].correct).length;
  // Exams score every question (blanks count as wrong); practice modes score only what was answered.
  const scored = r.mode === 'exam' ? r.ids : answered;
  const byDomain = {};
  for (const id of scored) { const q = Q(id); const d = byDomain[q.exam_code + ': ' + q.domain] ||= { total: 0, correct: 0 }; d.total++; if (r.resp[id]?.correct) d.correct++; }
  const summary = { id: r.id, mode: r.mode, title: r.title, exam: r.examCode, started: r.startedAt, ended: Date.now(), total: scored.length, answered: answered.length, correct: cor, byDomain, ids: scored, responses: r.resp, timed: !!r.endAt };
  if (answered.length) S.progress.sessions.push(summary);
  S.lastResult = summary; S.runner = null; go('results');
}

