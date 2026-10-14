/* ------------------------------------------------------------------ Events */
function formState(form, target) { const o = {}; for (const el of form.elements) if (el.name && el.type !== 'checkbox') o[el.name] = el.value; Object.assign(target, o); }
document.addEventListener('click', e => {
  const b = e.target.closest('[data-action]'); if (!b) return;
  const a = b.dataset.action; const d = b.dataset;
  const fx = {
    'resume': () => { if (S.runner && !S.runner.finished) go('run'); else { const ids = masteryQueue('', 20); startRunner({ title: 'Mastery review', mode: 'mastery', ids }); } },
    'quick-missed': () => { S.ui.review = { ...S.ui.review, source: 'missed', exam: '', domain: '', subdomain: '', service: '' }; go('review'); },
    'drill-weak': () => { const w = weakDomains(1)[0]; if (w) startRunner({ title: `Focus drill: ${w.code} ${w.domain.replace(/^\d+\.\s*/, '')}`, mode: 'drill', ids: shuffle(examQs(w.code).filter(q => q.domain === w.domain).map(q => q.id)).slice(0, 15), examCode: w.code }); },
    'exam-setup': () => { S.ui.exam = { ...(S.ui.exam || { count: 50, minutes: 90, diffs: [...DIFFS], reveal: 'end' }), exam: d.exam }; go('exam'); },
    'learn-exam': () => { S.ui.study = { ...(S.ui.study || {}), mode: 'learn', exam: d.exam, domain: '', subdomain: '', vendor: '', service: '', tag: '', include: 'all', count: S.ui.study?.count || 20, order: 'random' }; go('study'); },
    'exam-detail': () => examDetail(d.exam),
    'drill-domain': () => { $('#dlg').close(); startRunner({ title: `Focus drill: ${d.exam} ${d.domain.replace(/^\d+\.\s*/, '')}`, mode: 'drill', ids: shuffle(examQs(d.exam).filter(q => q.domain === d.domain).map(q => q.id)).slice(0, 20), examCode: d.exam }); },
    'drill-service': () => startRunner({ title: `Focus drill: ${d.v}`, mode: 'drill', ids: shuffle(allQ().filter(q => q.services.includes(d.v) && (!S.ui.analyticsExam || q.exam_code === S.ui.analyticsExam)).map(q => q.id)).slice(0, 20) }),
    'study-mode': () => { S.ui.study.mode = d.v; render(); },
    'exam-reveal': () => { S.ui.exam.reveal = d.v; render(); },
    'answer': () => answer(+d.i),
    'next': () => move(1), 'prev': () => move(-1),
    'jump': () => { p4Leave(); S.runner.idx = +d.i; S.runner.reviewing = false; S.runner.shownAt = Date.now(); render(); $('#qtext')?.focus(); },
    'end-run': () => finishRunner(false),
    'flag': () => p4Flag(),
    'conf': () => { const id = S.runner.ids[S.runner.idx]; S.progress.confidence[id] = d.v; srsOnConfidence(id, d.v); announce(`Confidence set to ${d.v}.`); render(); $(`[data-action="conf"][data-v="${d.v}"]`)?.focus(); },
    'review-last': () => { const r = S.lastResult; S.runner = { id: 'view', title: `Review: ${r.title}`, mode: r.mode, reveal: 'immediate', ids: r.ids, idx: 0, resp: r.responses, perm: r.perm || {}, draft: {}, flags: {}, time: {}, shownAt: Date.now(), endAt: null, readOnly: true, finished: false }; go('run'); },
    'retry-missed': () => { const r = S.lastResult; startRunner({ title: `Retry missed: ${r.title}`, mode: 'review', ids: r.ids.filter(id => !r.responses[id]?.correct), reveal: 'immediate', examCode: r.exam }); },
    'open-q': () => openQuestion(d.id),
    'review-src': () => { S.ui.review.source = d.v; render(); },
    'start-review': () => startRunner({ title: `Review: ${{ missed: 'missed questions', flagged: 'flagged questions', low: 'low-confidence questions' }[S.ui.review.source]}`, mode: 'review', ids: reviewPool(), reveal: 'immediate' }),
    'lib-page': () => { S.ui.lib.page += +d.v; render(); $('#libResults')?.scrollIntoView({ block: 'start' }); },
    'lib-clear': () => { S.ui.lib = { q: '', exam: '', domain: '', subdomain: '', service: '', difficulty: '', type: '', tag: '', status: '', page: 0 }; render(); },
    'practice-filtered': () => startRunner({ title: 'Library selection', mode: 'learn', ids: shuffle(libFiltered().map(q => q.id)).slice(0, 200) }),
    'dlg-reveal': () => { const ex = $('#dlgExplain'); const open = ex.hidden; ex.hidden = !open; b.setAttribute('aria-expanded', String(open)); b.textContent = open ? 'Hide answer' : 'Show answer and explanation'; const q = Q($('[data-action="practice-one"]').dataset.id); $$('#dlgOpts [data-opt]').forEach(li => { const i = +li.dataset.opt; li.classList.toggle('correct', open && i === q.correct_index); li.querySelector('.verdict').textContent = open && i === q.correct_index ? 'Correct answer' : ''; }); },
    'dlg-flag': () => { toggleFlag(d.id); const on = S.progress.flags.has(d.id); b.setAttribute('aria-pressed', on); b.textContent = on ? 'Flagged' : 'Flag'; b.classList.toggle('flag-on', on); },
    'practice-one': () => { $('#dlg').close(); startRunner({ title: `Single question ${d.id}`, mode: 'single', ids: [d.id] }); },
    'export-progress': exportProgress,
    'import-progress': () => $('#fileProgress').click(),
    'import-bank': () => $('#fileBank').click(),
    'export-bank': () => { download(`blueprint-question-bank-${stamp()}.json`, { format: 'blueprint-question-bank', exported_at: new Date().toISOString(), exams: S.exams, questions: allQ() }); toast('Question bank exported.'); },
    'set-theme': () => { S.ui.theme = d.v; applyTheme(); render(); },
    'reset': () => { if (!confirm('Clear all answers, flags, confidence ratings, and sessions? Export first if you want to keep them.')) return; S.progress = { answers: {}, flags: new Set(), confidence: {}, sessions: [] }; S.session = { started: Date.now(), answered: 0, correct: 0, streak: 0, best: 0 }; S.runner = null; S.lastResult = null; S.ui.settingsMsg = { ok: true, title: 'Runtime session reset.' }; renderSessionMini(); render(); }
  };
  if (fx[a]) { e.preventDefault(); fx[a](); }
});
function toggleFlag(id) { const f = S.progress.flags; if (f.has(id)) { f.delete(id); announce('Flag removed.'); } else { f.add(id); announce('Question flagged for review.'); } }
document.addEventListener('submit', e => {
  const f = e.target.dataset.form; if (!f) return; e.preventDefault();
  if (f === 'study') { formState(e.target, S.ui.study); startStudy(); }
  if (f === 'exam') { formState(e.target, S.ui.exam); S.ui.exam.diffs = $$('input[name=diff]:checked', e.target).map(i => i.value); startExam(); }
});
let searchT;
document.addEventListener('input', e => {
  const form = e.target.closest('[data-form]'); if (!form) return;
  if (form.dataset.form === 'lib' && e.target.name === 'q') {
    clearTimeout(searchT); searchT = setTimeout(() => { S.ui.lib.q = e.target.value; S.ui.lib.page = 0; const pos = e.target.selectionStart; render(); const inp = $('#l-q'); inp.focus(); inp.setSelectionRange(pos, pos); }, 180);
  } else if (form.dataset.form === 'study' && e.target.name === 'count') S.ui.study.count = e.target.value;
  else if (form.dataset.form === 'exam' && (e.target.name === 'count' || e.target.name === 'minutes')) S.ui.exam[e.target.name] = e.target.value;
});
document.addEventListener('change', e => {
  const t = e.target;
  if (t.dataset.change === 'analytics-exam') { S.ui.analyticsExam = t.value; render(); $('#a-exam')?.focus(); return; }
  const form = t.closest('[data-form]'); if (!form || t.name === 'q') return;
  const key = form.dataset.form; const target = key === 'lib' ? S.ui.lib : key === 'review' ? S.ui.review : key === 'study' ? S.ui.study : S.ui.exam;
  if (t.type === 'number' || t.type === 'search' || t.type === 'text') { target[t.name] = t.value; return; }
  if (t.type === 'checkbox') { target.diffs = $$('input[name=diff]:checked', form).map(i => i.value); }
  else {
    target[t.name] = t.value;
    if (t.name === 'exam') { target.domain = ''; target.subdomain = ''; if ('service' in target) target.service = ''; }
    if (t.name === 'domain') target.subdomain = '';
    if (key === 'lib') target.page = 0;
  }
  const id = t.id; render(); if (id) $('#' + id)?.focus();
});
document.addEventListener('keydown', e => {
  if (e.key === 'Escape' && $('#shell').classList.contains('nav-open')) { closeNav(); $('#menuBtn').focus(); return; }
  if (route().name !== 'run' || !S.runner || $('#dlg').open) return;
  if (e.target.closest('input,select,textarea') || e.metaKey || e.ctrlKey || e.altKey) return;
  const k = e.key.toLowerCase();
  const idx = '123456'.indexOf(k) >= 0 ? '123456'.indexOf(k) : 'abcde'.indexOf(k);
  if (idx >= 0 && k.length === 1) { e.preventDefault(); answer(idx); }
  else if ((k === 'enter' && !e.target.closest('button,a')) || k === 'arrowright') { e.preventDefault(); if (S.runner.idx < S.runner.ids.length - 1) move(1); }
  else if (k === 'arrowleft') { e.preventDefault(); move(-1); }
  else if (k === 'f') { e.preventDefault(); p4Flag(); }
  else if (k === 'r' && examLike(S.runner) && !S.runner.reviewing) { e.preventDefault(); finishRunner(false); }
});
$('#fileProgress').addEventListener('change', e => readJSON(e.target, importProgress));
$('#fileBank').addEventListener('change', e => readJSON(e.target, importBank));
$('#dlgClose').addEventListener('click', () => $('#dlg').close());
$('#dlg').addEventListener('click', e => { if (e.target === e.currentTarget) e.currentTarget.close(); });
$$('.theme-toggle').forEach(b => b.addEventListener('click', () => { S.ui.theme = S.ui.theme === 'dark' ? 'light' : 'dark'; applyTheme(); if (route().name === 'settings') render(); }));
$('#collapseBtn').addEventListener('click', e => { const c = $('#shell').classList.toggle('collapsed'); e.currentTarget.setAttribute('aria-pressed', c); e.currentTarget.setAttribute('aria-label', c ? 'Expand sidebar' : 'Collapse sidebar'); e.currentTarget.querySelector('svg').style.transform = c ? 'rotate(180deg)' : ''; });
$('#menuBtn').addEventListener('click', () => go('menu'));
$('#scrim').addEventListener('click', closeNav);
window.addEventListener('beforeunload', e => { if (!persistOK() && (S.dirty || Object.keys(S.progress.answers).length)) { e.preventDefault(); e.returnValue = ''; } });

