/* ---------- Views */
const LUI = () => (S.ui.lessons ||= { exam: '' });
function lessonsExam() {
  const u = LUI(); if (u.exam && (LESSON_EXAMS.includes(u.exam) || u.exam === 'FOUND')) return u.exam;
  const want = [cwProfile().targetExam, (() => { try { return focusExam(); } catch { return ''; } })()].find(x => x && LESSON_EXAMS.includes(x));
  return want || LESSON_EXAMS[0];
}
function lessonRow(l) {
  const w = (examMetaFor(l.exam)?.domain_weights || {})[parseInt(l.domain, 10)];
  const T = l.exam === 'FOUND' ? null : totals(q => q.exam_code === l.exam && q.domain === l.domain);
  return `<li class="les-row"><a class="les-main" href="#/lessons/${esc(l.id)}"><span class="les-dom">${esc(l.domain)}</span><span class="les-title">${esc(l.title)}</span>
    <span class="small muted">${Math.ceil(lessonWords(l) / 200)} min read${w ? ` · ${w}% of exam` : ''}${T && T.att ? ` · ${T.acc}% correct in practice (${T.att} answers)` : ''}</span></a>${statusChip(l.id)}</li>`;
}
function foundationsCard(open) {
  const f = lessonsOf('FOUND'); const done = foundationsDone(); const rec = isNonTechnical();
  const inner = `<p class="small muted" style="margin:6px 0 10px">Eight short lessons for people new to cloud: networking, IP addresses and CIDR, DNS, identity, storage, compute, shared responsibility, and pricing. Each ends with a ${CHECK_SIZE}-question check.</p><ol class="les-list">${f.map(lessonRow).join('')}</ol>`;
  const head = `<strong>Cloud foundations</strong> <span class="small muted">· beginner track · ${done} of ${f.length} checks passed</span>${rec ? ' <span class="chip strong">Recommended for you</span>' : ''}`;
  return `<section class="card les-found" aria-label="Cloud foundations track">${open || rec ? `<h2 style="font-size:1.05rem">${head}</h2>${inner}` : `<details><summary>${head}</summary>${inner}</details>`}</section>`;
}
VIEWS.lessons = (arg = '') => {
  if (arg) return lessonView(decodeURIComponent(arg));
  const code = lessonsExam(); const list = lessonsOf(code); const ex = examMetaFor(code);
  const passed = list.filter(l => lessonStatus(l.id) === 'passed').length;
  const next = list.find(l => lessonStatus(l.id) !== 'passed');
  const noLessons = activeExams().filter(e => !LESSON_EXAMS.includes(e.code)).map(e => e.code);
  return `<div class="page-head"><div><h1>Lessons</h1><p class="muted">Learn, check, review. Read a short lesson, take a ${CHECK_SIZE}-question check from the same domain, and anything you miss goes straight into your review queue.</p></div></div>
  <p class="notice" style="margin-bottom:16px">Practice material written for this app in our own words. It is not exam content and has not been reviewed by a person yet, so every lesson carries a draft label.</p>
  ${isNonTechnical() ? foundationsCard(true) : ''}
  <section class="card" style="margin-top:16px" aria-labelledby="h-les-ex"><div class="card-head"><h2 id="h-les-ex">Lessons by exam domain</h2><span class="small muted">${passed} of ${list.length} checks passed</span></div>
    <div class="filters"><div class="field"><label for="les-exam">Certification</label><select id="les-exam" data-l5="exam">${opts(LESSON_EXAMS.map(c => [c, `${c} · ${examMetaFor(c)?.name || c}`]), code)}</select></div></div>
    ${next ? `<div class="row les-start" style="margin:12px 0"><a class="btn primary" href="#/lessons/${esc(next.id)}">${passed ? 'Continue' : 'Start'}: ${esc(next.title)}</a></div>` : `<p class="small" style="margin:12px 0">Every check for ${esc(code)} is passed. Keep them fresh in <a href="#/retention">Daily review</a>.</p>`}
    <ol class="les-list">${list.map(lessonRow).join('')}</ol>
    ${ex && !Object.keys(ex.domain_weights || {}).length ? '<p class="small muted" style="margin-top:8px">Domain weights are not shown because the official exam page does not state them.</p>' : ''}
    ${noLessons.length ? `<p class="small muted" style="margin-top:8px">No lessons yet for ${esc(noLessons.join(', '))}.</p>` : ''}</section>
  ${isNonTechnical() ? '' : `<div style="margin-top:16px">${foundationsCard(false)}</div>`}`;
};
function lessonView(id) {
  const l = LESSON_BY_ID.get(id);
  if (!l) return emptyState('Lesson not found', 'The link may be out of date.', '<a class="btn" href="#/lessons">All lessons</a>');
  const st = LS()[id] || {}; const rv = lessonReview(l); const isF = l.exam === 'FOUND';
  const subs = isF ? [] : subdomainsOf(l.exam, l.domain);
  const terms = termsForLesson(id).slice(0, 16);
  const links = (l.links || []).map(k => typeof k === 'string' ? DOCS[k] : (k && safeUrl(k.url) ? [k.title, k.url] : null)).filter(Boolean);
  const checks = (st.checks || []).slice(-5).reverse();
  const nx = nextLessonAfter(id); const pool = lessonCheckIds(l).length;
  return `<div class="run-head"><a class="btn sm ghost" href="#/lessons">← Lessons</a><span class="title">${esc(l.title)}</span></div>
  <article class="card les-article" aria-labelledby="h-les">
    <div class="qmeta"><span class="chip">${esc(isF ? 'Cloud foundations' : l.exam)}</span><span class="chip">${esc(l.domain)}</span>${rv === 'approved' ? '<span class="chip ok-chip">Reviewed</span>' : rv === 'needs-review' ? '<span class="chip warn-chip">Needs review</span>' : '<span class="chip warn-chip">Draft · generated practice</span>'}<span class="chip">${Math.ceil(lessonWords(l) / 200)} min read</span>${statusChip(id)}</div>
    <h1 id="h-les" style="margin-top:10px">${esc(l.title)}</h1>
    ${l.body.map(p => `<p>${esc(p)}</p>`).join('')}
    <h2>Key decisions</h2>
    <div class="cmp-wrap"><table class="les-dec"><thead><tr><th scope="col">Situation</th><th scope="col">Choose</th><th scope="col">Rather than</th></tr></thead><tbody>${l.decisions.map(([a, b, c]) => `<tr><td>${esc(a)}</td><td><strong>${esc(b)}</strong></td><td>${esc(c)}</td></tr>`).join('')}</tbody></table></div>
    <h2>Common traps</h2><ul>${l.traps.map(t => `<li>${esc(t)}</li>`).join('')}</ul>
    ${subs.length ? `<h2>Sub-domains this lesson covers</h2><p class="small muted">From the question bank for this domain.</p><ul class="les-subs">${subs.map(s => `<li>${esc(s)}</li>`).join('')}</ul>` : ''}
    ${terms.length ? `<h2>Key terms</h2><div class="row" style="gap:6px">${terms.map(t => `<a class="chip" href="#/glossary/term/${esc(t.id)}">${esc(t.term)}</a>`).join('')}</div>` : ''}
    <h2>Official documentation</h2>${links.length ? `<ul>${links.map(([t, u]) => `<li><a href="${esc(u)}" target="_blank" rel="noopener">${esc(t)}</a></li>`).join('')}</ul><p class="small muted">Top-level vendor pages, checked on ${esc(VERIFIED_ON)}.</p>` : '<p class="small muted">No documentation link has been checked for this lesson yet, so none is shown. It is listed in Content review.</p>'}
    <p class="small muted" style="margin-top:12px">Practice material, written for this app. Not exam content. Origin: generated-practice · review status: ${esc(rv)}.</p>
  </article>
  <section class="card les-cta" style="margin-top:16px" aria-labelledby="h-les-chk"><h2 id="h-les-chk">Check your understanding</h2>
    <p class="small muted">${pool ? `${Math.min(pool, CHECK_SIZE)} questions from ${isF ? 'the foundations track (this lesson first, then a short review of others)' : 'this domain, starting with ones you missed or have not seen'}. Pass mark ${Math.round(CHECK_PASS * 100)}%. Missed questions go to your review queue.` : 'No practice questions are available for this lesson yet.'}${isF ? ' These foundations questions are drafts too.' : ''}</p>
    <div class="row" style="margin-top:10px">${pool ? `<button class="btn primary" data-action="l5-check" data-id="${esc(id)}">${st.readAt ? 'Take the check' : 'Mark read and take the check'}</button>` : ''}${st.readAt ? '' : `<button class="btn" data-action="l5-read" data-id="${esc(id)}">Mark as read</button>`}${nx ? `<a class="btn ghost" href="#/lessons/${esc(nx.id)}">Next: ${esc(nx.title)}</a>` : ''}</div>
    ${checks.length ? `<h3 style="margin-top:14px">Your checks</h3><ul class="small">${checks.map(c => `<li>${humanTime(c.t)}: ${c.score} of ${c.total} correct${c.asked && c.asked > c.total ? ` (${c.asked - c.total} skipped)` : ''}</li>`).join('')}</ul>` : ''}
  </section>
  ${S.p3c?.owner ? `<section class="card" style="margin-top:16px"><h2>Owner review</h2><p class="small muted">Approving records your review date; it does not change the text.</p><div class="row"><button class="btn" data-action="l5-review" data-id="${esc(id)}" data-v="approved">Approve lesson</button><button class="btn" data-action="l5-review" data-id="${esc(id)}" data-v="needs-review">Needs review</button><button class="btn ghost" data-action="l5-review" data-id="${esc(id)}" data-v="draft">Back to draft</button></div></section>` : ''}`;
}
function lessonResultCard(r) {
  const l = LESSON_BY_ID.get(r.lessonId); if (!l) return '';
  const miss = (r.lessonMissed || []).length; const nx = nextLessonAfter(l.id); const ok = r.answered && r.correct / Math.max(r.answered, r.asked || r.answered) >= CHECK_PASS;
  return `<section class="card les-result ${ok ? 'gng-go' : 'gng-notyet'}" style="margin-bottom:16px" aria-labelledby="h-lr"><h2 id="h-lr">Lesson check: ${esc(l.title)}</h2>
    <p><strong>${r.correct} of ${r.asked || r.total}</strong> correct${r.asked > r.answered ? ` (${r.asked - r.answered} not answered)` : ''}. ${ok ? 'Check passed.' : `Pass mark is ${Math.round(CHECK_PASS * 100)}%. Re-read the traps and try again later.`}</p>
    <p class="small">${miss ? `${miss} missed question${miss === 1 ? ' is' : 's are'} now in your review queue.` : 'Nothing missed, so nothing new in your review queue.'}</p>
    <div class="row" style="margin-top:10px"><a class="btn" href="#/lessons/${esc(l.id)}">Back to the lesson</a>${miss ? '<a class="btn" href="#/retention">Open review queue</a>' : ''}${nx ? `<a class="btn primary" href="#/lessons/${esc(nx.id)}">Next lesson</a>` : ''}</div></section>`;
}
const _resultsP5 = VIEWS.results;
VIEWS.results = arg => { const h = _resultsP5(arg); const r = S.lastResult; if (!r || !r.lessonId) return h; const i = h.indexOf('<div class="grid'); return i >= 0 ? h.slice(0, i) + lessonResultCard(r) + h.slice(i) : lessonResultCard(r) + h; };

/* Dashboard and path: point beginners at the foundations track, everyone else at their next lesson */
const _dashP5 = VIEWS.dashboard;
VIEWS.dashboard = arg => {
  const h = _dashP5(arg); if (!onboarded()) return h;
  let card = '';
  const fDone = foundationsDone(), fAll = lessonsOf('FOUND').length;
  if (isNonTechnical() && fDone < fAll) { const n = lessonsOf('FOUND').find(l => lessonStatus(l.id) !== 'passed'); card = `<section class="card p2-cta" aria-labelledby="h-p5f"><div><h2 id="h-p5f">Start with Cloud foundations</h2><p class="small muted">Recommended for your background: eight short lessons before exam practice. ${fDone} of ${fAll} done.</p></div><div class="row"><a class="btn primary" href="#/lessons/${esc(n.id)}">${fDone ? 'Continue' : 'Start'}: ${esc(n.title)}</a><a class="btn ghost" href="#/lessons">All lessons</a></div></section>`; }
  else { const code = lessonsExam(); const n = lessonsOf(code).find(l => lessonStatus(l.id) !== 'passed'); if (n) card = `<section class="card p2-cta" aria-labelledby="h-p5n"><div><h2 id="h-p5n">Next lesson</h2><p class="small muted">${esc(code)} · ${esc(n.domain)}. Read it, then take a ${CHECK_SIZE}-question check.</p></div><div class="row"><a class="btn primary" href="#/lessons/${esc(n.id)}">${esc(n.title)}</a><a class="btn ghost" href="#/lessons">All lessons</a></div></section>`; }
  if (!card) return h;
  const i = h.indexOf('class="continue-card"'); const j = i < 0 ? -1 : h.indexOf('</section>', i);
  return j > 0 ? h.slice(0, j + 10) + card + h.slice(j + 10) : h + card;
};
const _pathP5 = VIEWS.path;
VIEWS.path = arg => {
  const h = _pathP5(arg); if (!isNonTechnical() || !cwProfile().targetRole) return h;
  const card = `<section class="card p2-cta" style="margin-bottom:16px"><div><h2>Step 0: Cloud foundations</h2><p class="small muted">Before the first exam on any cloud, spend a few hours on the basics: networking, IP addresses, DNS, identity, storage, compute, shared responsibility, and pricing. ${foundationsDone()} of ${lessonsOf('FOUND').length} checks passed.</p></div><div class="row"><a class="btn primary" href="#/lessons">Open the foundations track</a></div></section>`;
  const i = h.indexOf('<div class="grid'); return i >= 0 ? h.slice(0, i) + card + h.slice(i) : h + card;
};

/* Content review: lessons appear with their status; missing doc links are listed, never invented */
const _contentP5 = VIEWS.content;
VIEWS.content = (arg = '') => {
  const h = _contentP5(arg); if (arg) return h;
  const rows = ALL_LESSONS.map(l => { const rv = lessonReview(l); const issues = [rv !== 'approved' ? rv : '', (l.links || []).length ? '' : 'no doc link'].filter(Boolean); return { l, rv, issues }; });
  const open = rows.filter(r => r.issues.length);
  return h + `<section class="card" style="margin-top:16px" aria-labelledby="h-cr-les"><div class="card-head"><h2 id="h-cr-les">Lessons (${ALL_LESSONS.length})</h2><span class="small muted">${open.length} need attention</span></div>
    <p class="small muted">All lessons are generated practice and start as drafts. Turn on owner mode above, open a lesson, and approve it once a person has checked it.</p>
    <div class="cmp-wrap"><table><thead><tr><th scope="col">Lesson</th><th scope="col">Exam</th><th scope="col">Status</th><th scope="col">Issues</th></tr></thead><tbody>${rows.map(r => `<tr><td><a href="#/lessons/${esc(r.l.id)}">${esc(r.l.title)}</a><div class="small muted">${esc(r.l.id)}</div></td><td>${esc(r.l.exam)}</td><td>${esc(r.rv)}</td><td>${r.issues.length ? esc(r.issues.join(', ')) : '—'}</td></tr>`).join('')}</tbody></table></div></section>`;
};

/* Workspace import: lesson progress merges by lesson id, newer wins */
const _smartImportP5 = smartImport;
smartImport = data => {
  const r = _smartImportP5(data); const w = data && (data.workspace || data); if (!w || data.format !== 'cloudwalker-workspace') return r;
  for (const [key, getter] of [['lessons', LS], ['lessonReview', LREV]]) {
    const src = w[key]; if (!src || typeof src !== 'object') continue; const dst = getter();
    for (const [id, v] of Object.entries(src)) {
      if (!v || typeof v !== 'object') continue;
      const cur = dst[id]; const t = x => x?.updated || x?.reviewedAt || x?.readAt || 0;
      if (!cur || t(v) > t(cur)) dst[id] = v;
    }
  }
  return r;
};

/* ---------- Chrome and events */
ICON.lessons = '<path d="M9 18h6M10 21h4"/><path d="M12 3a6 6 0 0 0-4 10.5c.8.8 1 1.5 1 2.5h6c0-1 .2-1.7 1-2.5A6 6 0 0 0 12 3z"/>';
(() => { const i = NAV.findIndex(n => n[0] === 'exams'); NAV.splice(i >= 0 ? i + 1 : NAV.length, 0, ['lessons', 'Lessons', 'Certify']); })();
document.addEventListener('click', e => {
  const b = e.target.closest('[data-action^="l5-"]'); if (!b) return; e.preventDefault(); const d = b.dataset;
  if (d.action === 'l5-check') p5StartCheck(d.id);
  else if (d.action === 'l5-read') { markRead(d.id); render(); showStatus('Marked as read.'); $('[data-action="l5-check"]')?.focus(); }
  else if (d.action === 'l5-review') { LREV()[d.id] = { status: d.v, reviewedAt: Date.now(), updated: Date.now() }; markDirty(); persistSoon(SAVE_QUICK); render(); showStatus(`Lesson marked ${d.v}.`); }
});
document.addEventListener('change', e => { const el = e.target; if (el.dataset && el.dataset.l5 === 'exam') { LUI().exam = el.value; render(); $('#les-exam')?.focus(); } });


