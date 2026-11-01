/* ================================================================== V09 Phase 3: content you can trust
 * Question schema additions (migrated with honest defaults, never invented):
 *   optionRationales  string[] | null   per-option "why", aligned to options; null when none exists
 *   docLinks          {title,url}[]     official docs; empty until a reviewer adds them
 *   examGuideVersion  string | null     exam guide the item was checked against; null when unknown
 *   lastReviewed      ISO date | null   set only when a person approves or edits the item
 *   reviewStatus      approved | needs-review | draft | retired
 *   origin            reserve | generated-practice | user-imported
 *   qtype             single | multi | case | ordering | pbq-sim
 *   selectCount       number | null     for multi-select
 *   caseStudyId       string | null
 * Reserve items with missing wrong-option explanations or inferred difficulty start as
 * "needs-review" and appear in Content review. Owner edits live in S.ws.contentEdits
 * (by permanent id) and are layered over the bank, so the reserve itself never changes.
 */
const REVIEW_STATUS = ['approved', 'needs-review', 'draft', 'retired'];
const ORIGINS = ['reserve', 'generated-practice', 'user-imported'];
const QTYPES = ['single', 'multi', 'case', 'ordering', 'pbq-sim'];
const REPORT_TYPES = [['wrong-answer', 'Wrong answer'], ['outdated', 'Outdated'], ['unclear', 'Unclear'], ['typo', 'Typo'], ['other', 'Other']];
const ISSUE_LABEL = { 'no-distractor': 'No wrong-option explanation', 'no-rationale': 'No explanation of the answer', 'inferred-difficulty': 'Difficulty inferred', 'reported': 'Reported by a learner', 'needs-review': 'Needs review', 'draft': 'Draft', 'retired': 'Retired' };
const safeUrl = u => typeof u === 'string' && /^https:\/\/[^\s"'<>]+$/i.test(u.trim());
const cleanLinks = arr => (Array.isArray(arr) ? arr : []).filter(l => l && typeof l.title === 'string' && l.title.trim() && safeUrl(l.url)).map(l => ({ title: l.title.trim(), url: l.url.trim() }));

/* Validation of the new fields (existing checks still run first). */
const _validateP3 = validateQuestion;
validateQuestion = function (q, i) {
  const errs = _validateP3(q, i); if (!q || typeof q !== 'object') return errs; const id = q.id || '#' + i;
  if (q.optionRationales != null && (!Array.isArray(q.optionRationales) || !Array.isArray(q.options) || q.optionRationales.length !== q.options.length || q.optionRationales.some(x => typeof x !== 'string'))) errs.push(`${id}: "optionRationales" must be null or one string per option`);
  if (q.docLinks != null && (!Array.isArray(q.docLinks) || q.docLinks.some(l => !l || typeof l.title !== 'string' || !safeUrl(l.url)))) errs.push(`${id}: "docLinks" must be a list of {title, url} with https links`);
  if (q.reviewStatus != null && !REVIEW_STATUS.includes(q.reviewStatus)) errs.push(`${id}: "reviewStatus" must be one of ${REVIEW_STATUS.join(', ')}`);
  if (q.origin != null && !ORIGINS.includes(q.origin)) errs.push(`${id}: "origin" must be one of ${ORIGINS.join(', ')}`);
  if (q.qtype != null && !QTYPES.includes(q.qtype)) errs.push(`${id}: "qtype" must be one of ${QTYPES.join(', ')}`);
  if (q.selectCount != null && (!Number.isInteger(q.selectCount) || q.selectCount < 2)) errs.push(`${id}: "selectCount" must be a whole number of at least 2`);
  if (q.lastReviewed != null && !/^\d{4}-\d{2}-\d{2}/.test(q.lastReviewed)) errs.push(`${id}: "lastReviewed" must be an ISO date`);
  return errs;
};
const needsReviewByDefault = q => q.difficulty_source === 'inferred' || (!q.optionRationales && !String(q.distractor_summary || '').trim()) || !String(q.correct_rationale || '').trim();
const _normalizeP3 = normalizeQuestion;
normalizeQuestion = function (q) {
  const n = _normalizeP3(q);
  const dr = Array.isArray(q.distractor_rationales) && q.distractor_rationales.length === n.options.length && q.distractor_rationales.some(x => String(x || '').trim()) ? q.distractor_rationales.map(x => String(x || '')) : null;
  n.optionRationales = Array.isArray(q.optionRationales) && q.optionRationales.length === n.options.length ? q.optionRationales.map(String) : dr;
  n.docLinks = cleanLinks(q.docLinks);
  n.examGuideVersion = typeof q.examGuideVersion === 'string' && q.examGuideVersion.trim() ? q.examGuideVersion.trim() : null;
  n.lastReviewed = typeof q.lastReviewed === 'string' && q.lastReviewed ? q.lastReviewed.slice(0, 10) : null;
  n.origin = q.origin === 'reserve' && (q._fromReserve || Q(q.id)?.origin === 'reserve') ? 'reserve' : ORIGINS.includes(q.origin) && q.origin !== 'reserve' ? q.origin : 'user-imported';
  n.qtype = QTYPES.includes(q.qtype) ? q.qtype : 'single';
  n.selectCount = Number.isInteger(q.selectCount) ? q.selectCount : null;
  n.caseStudyId = typeof q.caseStudyId === 'string' && q.caseStudyId ? q.caseStudyId : null;
  n.reviewStatus = REVIEW_STATUS.includes(q.reviewStatus) ? q.reviewStatus : n.origin === 'generated-practice' ? 'draft' : needsReviewByDefault(n) ? 'needs-review' : 'approved';
  return n;
};

/* ---------- Owner edits over the bank (by permanent id; the reserve stays untouched) */
const EDITABLE = ['question', 'options', 'correct_index', 'correct_rationale', 'distractor_summary', 'optionRationales', 'docLinks', 'examGuideVersion', 'difficulty', 'difficulty_source', 'reviewStatus', 'lastReviewed'];
const BANK_BASE = new Map(); let editsRef = null, editsV = -1;
function ensureP3Ws() { S.ws.contentEdits ||= {}; S.ws.reports ||= []; S.ws.contentEditsV ||= 0; return S.ws; }
function applyContentEdits(force) {
  ensureP3Ws(); if (!force && editsRef === S.ws && editsV === S.ws.contentEditsV) return; editsRef = S.ws; editsV = S.ws.contentEditsV;
  for (const [id, base] of BANK_BASE) { const q = Q(id); if (q) Object.assign(q, JSON.parse(base)); }
  for (const [id, e] of Object.entries(S.ws.contentEdits)) {
    const q = Q(id); if (!q || !e || typeof e.fields !== 'object') continue;
    if (!BANK_BASE.has(id)) BANK_BASE.set(id, JSON.stringify(Object.fromEntries(EDITABLE.map(k => [k, q[k]]))));
    for (const k of EDITABLE) if (k in e.fields) q[k] = k === 'docLinks' ? cleanLinks(e.fields[k]) : e.fields[k];
    q.explanation = [q.correct_rationale, q.distractor_summary].filter(Boolean).join(' ');
  }
}
function saveEdit(id, fields) {
  ensureP3Ws(); const cur = S.ws.contentEdits[id] || { fields: {} };
  S.ws.contentEdits[id] = { fields: { ...cur.fields, ...fields }, updated: Date.now(), by: 'owner' }; S.ws.contentEditsV++; applyContentEdits(true); markDirty();
}

/* ---------- Issues, reports, measured difficulty */
const openReports = id => (S.ws.reports || []).filter(r => r.qid === id && r.status === 'open');
function issuesOf(q) {
  const out = [];
  if (!String(q.correct_rationale || '').trim()) out.push('no-rationale');
  if (!(q.optionRationales && q.optionRationales.some((x, i) => i !== q.correct_index && String(x).trim())) && !String(q.distractor_summary || '').trim()) out.push('no-distractor');
  if (q.difficulty_source === 'inferred') out.push('inferred-difficulty');
  if (openReports(q.id).length) out.push('reported');
  if (['needs-review', 'draft', 'retired'].includes(q.reviewStatus)) out.push(q.reviewStatus);
  return out;
}
function measured(id) { const a = S.progress.answers[id] || []; return a.length >= 20 ? { n: a.length, pct: Math.round(a.filter(x => x.correct).length / a.length * 100) } : null; }
const diffLine = q => { const m = measured(q.id); return `${esc(q.difficulty)}${q.difficulty_source === 'inferred' ? ' (inferred)' : q.difficulty_source === 'owner' ? ' (set by reviewer)' : ''}${m ? ` · measured on this device: ${m.pct}% correct over ${m.n} answers` : ''}`; };
const statusLabel = s => ({ approved: 'Approved', 'needs-review': 'Needs review', draft: 'Draft', retired: 'Retired' }[s] || s);
const originLabel = o => ({ reserve: 'Built-in practice question', 'generated-practice': 'Generated practice (draft)', 'user-imported': 'Imported by you' }[o] || o);

/* ---------- Explanation panel: honest about what is missing */
explainPanel = function (q, correct) {
  const state = correct === true ? 'ok' : correct === false ? 'no' : '';
  const L = i => LETTERS[i]; const line = correct === true ? 'Correct.' : correct === false ? `Not quite. The answer is ${L(q.correct_index)}.` : `The answer is ${L(q.correct_index)}.`;
  const per = q.optionRationales && q.optionRationales.some((x, i) => i !== q.correct_index && String(x).trim());
  const missing = msg => `<p class="small muted gap-note">${msg} This question is in the review queue.</p>`;
  const rep = openReports(q.id).length;
  return `<section class="explain ${state}" aria-label="Explanation">
    <p class="result-line">${line}</p>
    <div class="blk"><h3>Why ${L(q.correct_index)} is correct</h3>${String(q.correct_rationale || '').trim() ? `<p>${rich(q.correct_rationale)}</p>` : missing('No explanation of the correct answer has been written yet.')}</div>
    <div class="blk"><h3>Why the others are wrong</h3>${per ? `<ul>${q.options.map((o, i) => i === q.correct_index ? '' : `<li><strong>${L(i)}.</strong> ${String(q.optionRationales[i] || '').trim() ? rich(q.optionRationales[i]) : '<span class="muted">No explanation for this option yet.</span>'}</li>`).join('')}</ul>`
      : String(q.distractor_summary || '').trim() ? `<p>${rich(q.distractor_summary)}</p><p class="small muted">A summary for all wrong options; per-option explanations have not been written yet.</p>` : missing('No explanation of the wrong options has been written yet.')}</div>
    ${q.common_traps.length ? `<div class="blk"><h3>Common traps</h3><p>${q.common_traps.map(rich).join('; ')}</p></div>` : ''}
    ${q.prerequisites.length ? `<div class="blk"><h3>Prerequisites</h3><p>${q.prerequisites.map(rich).join(', ')}</p></div>` : ''}
    <div class="blk"><h3>Official documentation</h3>${q.docLinks.length ? `<ul>${q.docLinks.map(l => `<li><a href="${esc(l.url)}" target="_blank" rel="noopener">${esc(l.title)}</a></li>`).join('')}</ul>` : '<p class="small muted">No documentation links have been added for this question yet.</p>'}</div>
    <p class="small muted q-prov">Difficulty: ${diffLine(q)} · Exam guide version: ${esc(q.examGuideVersion || 'not recorded')} · Last reviewed: ${esc(q.lastReviewed || 'not yet')} · ${esc(statusLabel(q.reviewStatus))} · ${esc(originLabel(q.origin))}</p>
    <div class="row" style="margin-top:8px">${rep ? `<span class="chip warn-chip">Reported (${rep} open)</span>` : ''}<button class="btn sm ghost" data-action="p3-report" data-id="${esc(q.id)}">Report a problem</button></div>
    ${correct === false ? relatedLinks(q) : ''}
  </section>`;
};
const _libItemP3 = libItem;
libItem = q => { let h = _libItemP3(q); const rep = openReports(q.id).length; const badges = (rep ? '<span class="status flag">Reported</span>' : '') + (q.reviewStatus === 'retired' ? '<span class="status no">Retired</span>' : ''); return badges ? h.replace('<span class="spacer"></span>', badges + '<span class="spacer"></span>') : h; };

/* ---------- Report a problem */
function reportDialog(id) {
  const q = Q(id); if (!q) return;
  dlg4.innerHTML = `<h2 id="dlg4-t">Report a problem with ${esc(q.source_id || q.id)}</h2>
    <fieldset class="ob-fs" style="margin-top:8px"><legend class="small">What is wrong?</legend><div class="ob-grid">${REPORT_TYPES.map(([v, l], i) => `<label class="ob-card"><input type="radio" name="rp-type" value="${v}" ${i === 0 ? 'checked' : ''}><span><strong>${l}</strong></span></label>`).join('')}</div></fieldset>
    <div class="field" style="margin-top:12px"><label for="rp-note">Details <span class="muted">(optional)</span></label><textarea id="rp-note" rows="3" placeholder="What did you expect, and why? A link to official documentation helps."></textarea></div>
    <p class="small muted" style="margin-top:8px">Saved in your workspace on this device. Export it from Content review to send it to whoever maintains the questions.</p>
    <div class="row" style="margin-top:14px"><button class="btn primary" id="rp-save">Save report</button><button class="btn" id="dlg4-cancel">Cancel</button></div>`;
  dlg4.showModal(); $('#rp-note').focus();
  $('#rp-save').onclick = () => {
    ensureP3Ws(); const type = dlg4.querySelector('input[name="rp-type"]:checked')?.value || 'other';
    S.ws.reports.push({ id: nextId('RPT', S.ws.reports), qid: id, type, note: $('#rp-note').value.trim(), t: Date.now(), updated: Date.now(), status: 'open' });
    dlg4.close(); markDirty(); render(); showStatus(`Thanks. ${id} is flagged for review.`);
  };
  $('#dlg4-cancel').onclick = () => dlg4.close();
}

/* ---------- Content review screen */
S.p3c = { exam: '', domain: '', issue: 'needs-review', q: '', page: 0, owner: false };
const reviewAll = () => S.order.map(Q).filter(Boolean);
function reviewFiltered() {
  const f = S.p3c; const s = f.q.trim().toLowerCase();
  return reviewAll().filter(q => (!f.exam || q.exam_code === f.exam) && (!f.domain || q.domain === f.domain) && (!s || q.id.toLowerCase().includes(s) || q.question.toLowerCase().includes(s))).map(q => [q, issuesOf(q)]).filter(([, is]) => f.issue === 'any' ? is.length : is.includes(f.issue));
}
function reviewCounts() { const c = {}; for (const q of reviewAll()) for (const i of issuesOf(q)) c[i] = (c[i] || 0) + 1; return c; }
VIEWS.content = (arg = '') => {
  ensureP3Ws(); applyContentEdits();
  if (arg.startsWith('edit/')) return contentEditor(arg.slice(5));
  const f = S.p3c; const list = reviewFiltered(); const c = reviewCounts(); const PER = 25; const pages = Math.max(1, Math.ceil(list.length / PER)); f.page = Math.min(f.page, pages - 1);
  const openR = S.ws.reports.filter(r => r.status === 'open');
  return `<div class="page-head"><div><h1>Content review</h1><p class="muted">Questions with missing explanations, inferred difficulty, or learner reports. Nothing here is filled in automatically: gaps stay visible until a person fixes them.</p></div>
    <div class="row"><button class="btn" data-action="p3-export" data-v="json">Export review file (.json)</button><button class="btn" data-action="p3-export" data-v="csv">Export (.csv)</button></div></div>
  <section class="card" style="margin-bottom:16px"><div class="row" style="gap:8px">${['needs-review', 'no-distractor', 'no-rationale', 'inferred-difficulty', 'reported', 'draft', 'retired'].map(k => `<button class="chip ${f.issue === k ? 'strong' : ''}" data-action="p3-issue" data-v="${k}" aria-pressed="${f.issue === k}">${esc(ISSUE_LABEL[k])} · ${c[k] || 0}</button>`).join('')}<button class="chip ${f.issue === 'any' ? 'strong' : ''}" data-action="p3-issue" data-v="any" aria-pressed="${f.issue === 'any'}">Any issue</button></div>
    <div class="filters" style="margin-top:12px"><div class="field"><label for="cr-exam">Certification</label><select id="cr-exam" data-p3c="exam">${examOpts(f.exam)}</select></div>
      <div class="field"><label for="cr-dom">Domain</label><select id="cr-dom" data-p3c="domain" ${f.exam ? '' : 'disabled'}>${opts(f.exam ? domainsOf(f.exam) : [], f.domain, f.exam ? 'All domains' : 'Choose a certification first')}</select></div>
      <div class="field"><label for="cr-q">Search</label><input id="cr-q" type="search" data-p3c="q" value="${esc(f.q)}" placeholder="ID or text"></div></div>
    <label class="row small" style="margin-top:12px;gap:8px"><input type="checkbox" data-action="p3-owner" ${f.owner ? 'checked' : ''}> I maintain this content (owner mode: approve, edit, retire, set difficulty)</label></section>
  ${openR.length ? `<section class="card" style="margin-bottom:16px"><h2>Open reports (${openR.length})</h2><div class="list">${openR.slice(-20).reverse().map(r => `<div class="list-item"><div><strong>${esc(r.id)}</strong> · ${esc(REPORT_TYPES.find(x => x[0] === r.type)?.[1] || r.type)} · <a href="#/content/edit/${esc(r.qid)}">${esc(r.qid)}</a><div class="small muted">${esc(r.note || 'No details')} · ${esc(humanTime(r.t))}</div></div>${f.owner ? `<button class="btn sm" data-action="p3-resolve" data-v="${esc(r.id)}">Mark resolved</button>` : ''}</div>`).join('')}</div></section>` : ''}
  <p class="small muted" aria-live="polite" style="margin-bottom:8px"><strong>${list.length}</strong> question${list.length === 1 ? '' : 's'} match.</p>
  <div class="stack">${list.slice(f.page * PER, f.page * PER + PER).map(([q, is]) => `<div class="card cr-item"><div class="lib-top"><strong>${esc(q.exam_code)}</strong><span>${esc(q.subdomain)}</span><span class="chip">${esc(statusLabel(q.reviewStatus))}</span><span class="spacer"></span><span class="faint">${esc(q.id)}</span></div>
      <div class="qline">${rich(q.question)}</div><div class="chips">${is.map(i => `<span class="chip warn-chip">${esc(ISSUE_LABEL[i])}</span>`).join('')}</div>
      <p class="small muted">Difficulty: ${diffLine(q)}</p>
      <div class="row" style="margin-top:6px"><button class="btn sm" data-action="open-q" data-id="${esc(q.id)}">View</button>${f.owner ? `<a class="btn sm" href="#/content/edit/${esc(q.id)}">Edit</a>${q.reviewStatus !== 'approved' && q.reviewStatus !== 'retired' ? `<button class="btn sm primary" data-action="p3-approve" data-v="${esc(q.id)}">Approve</button>` : ''}<button class="btn sm ghost" data-action="p3-retire" data-v="${esc(q.id)}">${q.reviewStatus === 'retired' ? 'Restore' : 'Retire'}</button>
        <label class="sr-only" for="cd-${esc(q.id)}">Set difficulty</label><select id="cd-${esc(q.id)}" class="cr-diff" data-p3diff="${esc(q.id)}">${opts(DIFFS.map(d => [d, 'Difficulty: ' + d]), q.difficulty_source === 'inferred' ? '' : q.difficulty, 'Set difficulty…')}</select>` : ''}</div></div>`).join('') || emptyState('Nothing to review here', 'Try another issue type or clear the filters.', '')}</div>
  ${pages > 1 ? `<nav class="pager" aria-label="Pagination"><button class="btn sm" data-action="p3-page" data-v="-1" ${f.page ? '' : 'disabled'}>Previous page</button><span class="small muted">Page ${f.page + 1} of ${pages}</span><button class="btn sm" data-action="p3-page" data-v="1" ${f.page < pages - 1 ? '' : 'disabled'}>Next page</button></nav>` : ''}`;
};
function contentEditor(id) {
  const q = Q(id); if (!q) return emptyState('Question not found', 'It may come from an import that is not loaded.', '<a class="btn" href="#/content">Content review</a>');
  if (!S.p3c.owner) return emptyState('Owner mode is off', 'Turn on owner mode in Content review to edit questions.', '<a class="btn primary" href="#/content">Content review</a>');
  const or = q.optionRationales || q.options.map(() => '');
  return `<div class="page-head"><div><h1>Edit ${esc(q.source_id || q.id)}</h1><p class="muted">Permanent ID <code>${esc(q.id)}</code> never changes. Your edits are layered over the built-in question and saved in your workspace. Write explanations in your own words and link only official documentation.</p></div></div>
  <section class="card" id="ce-form"><div class="field fgap"><label for="ce-q">Question</label><textarea id="ce-q" rows="4">${esc(q.question)}</textarea></div>
    ${q.options.map((o, i) => `<div class="grid g-2"><div class="field fgap"><label for="ce-o${i}">Option ${LETTERS[i]}${i === q.correct_index ? ' (correct)' : ''}</label><textarea id="ce-o${i}" rows="2">${esc(o)}</textarea></div><div class="field fgap"><label for="ce-r${i}">Why ${LETTERS[i]} is ${i === q.correct_index ? 'right' : 'wrong'} <span class="muted">(optional)</span></label><textarea id="ce-r${i}" rows="2">${esc(or[i] || '')}</textarea></div></div>`).join('')}
    <div class="filters"><div class="field"><label for="ce-ci">Correct option</label><select id="ce-ci">${q.options.map((o, i) => `<option value="${i}" ${i === q.correct_index ? 'selected' : ''}>${LETTERS[i]}</option>`).join('')}</select></div>
      <div class="field"><label for="ce-diff">Difficulty</label><select id="ce-diff">${opts(DIFFS, q.difficulty)}</select></div>
      <div class="field"><label for="ce-egv">Exam guide version</label><input id="ce-egv" type="text" value="${esc(q.examGuideVersion || '')}" placeholder="as printed on the official guide"></div></div>
    <p class="small muted">Changing the correct option does not rewrite past answers; they keep the result they had at the time.</p>
    <div class="field fgap"><label for="ce-cr">Why the correct answer is correct</label><textarea id="ce-cr" rows="3">${esc(q.correct_rationale)}</textarea></div>
    <div class="field fgap"><label for="ce-ds">Summary of why the others are wrong</label><textarea id="ce-ds" rows="3">${esc(q.distractor_summary)}</textarea></div>
    <div class="field fgap"><label for="ce-links">Official documentation links <span class="muted">(one per line: Title | https://…)</span></label><textarea id="ce-links" rows="3">${esc(q.docLinks.map(l => `${l.title} | ${l.url}`).join('\n'))}</textarea></div>
    <div class="row" style="margin-top:12px"><button class="btn primary" data-action="p3-save" data-v="${esc(id)}" data-approve="1">Save and approve</button><button class="btn" data-action="p3-save" data-v="${esc(id)}">Save as needs review</button><a class="btn ghost" href="#/content">Cancel</a>${S.ws.contentEdits[id] ? `<button class="btn ghost" data-action="p3-revert" data-v="${esc(id)}">Undo all my edits to this question</button>` : ''}</div></section>`;
}
function reviewFile() {
  const items = reviewAll().map(q => [q, issuesOf(q)]).filter(([, is]) => is.length).map(([q, is]) => ({ id: q.id, exam: q.exam_code, domain: q.domain, issues: is, reviewStatus: q.reviewStatus, difficulty: q.difficulty, difficulty_source: q.difficulty_source, measured: measured(q.id) }));
  return { format: 'cloudwalker-content-review', version: 1, exported_at: new Date().toISOString(), reports: S.ws.reports, edits: S.ws.contentEdits, items };
}
const csvCell = v => { const s = v == null ? '' : String(v); return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s; };
function reviewCsv() {
  const rows = [['kind', 'id', 'question_id', 'exam', 'domain', 'issues_or_type', 'review_status', 'difficulty', 'measured_pct_correct', 'answers_on_device', 'note', 'date']];
  for (const r of S.ws.reports) { const q = Q(r.qid); rows.push(['report', r.id, r.qid, q?.exam_code, q?.domain, r.type, r.status, q?.difficulty, '', '', r.note, new Date(r.t).toISOString()]); }
  for (const it of reviewFile().items) rows.push(['item', '', it.id, it.exam, it.domain, it.issues.join(' '), it.reviewStatus, it.difficulty + (it.difficulty_source === 'inferred' ? ' (inferred)' : ''), it.measured?.pct ?? '', it.measured?.n ?? '', '', '']);
  return rows.map(r => r.map(csvCell).join(',')).join('\n');
}

/* ---------- About and privacy, plus a footer on every page */
const NOTICE = 'Not affiliated with or endorsed by AWS, Microsoft, Google, CompTIA, or HashiCorp. All trademarks belong to their owners. Practice questions are original study material, not actual exam questions.';
const appFooter = () => `<footer class="app-foot" role="contentinfo"><p>${NOTICE}</p><p><a href="#/about">About</a> · <a href="#/privacy">Privacy</a> · <a href="#/content">Content review</a></p></footer>`;
VIEWS.about = () => {
  const c = reviewCounts(); const all = reviewAll(); const by = k => all.filter(q => q.reviewStatus === k).length; const orig = k => all.filter(q => q.origin === k).length;
  return `<div class="page-head"><div><h1>About CloudWalker</h1><p class="muted">${esc(APP_VERSION)} · workspace schema ${WS_SCHEMA}</p></div></div>
  <section class="card" style="margin-bottom:16px"><h2>Not affiliated</h2><p>${NOTICE}</p></section>
  <section class="card" style="margin-bottom:16px"><h2>Where the content comes from</h2>
    <p class="small">Built-in practice questions: ${orig('reserve')}. Imported by you: ${orig('user-imported')}. Generated practice (drafts): ${orig('generated-practice')}.</p>
    <p class="small">Review status: ${by('approved')} approved, ${by('needs-review')} need review, ${by('draft')} drafts, ${by('retired')} retired. ${c['no-distractor'] || 0} have no explanation of the wrong options and ${c['inferred-difficulty'] || 0} have an inferred difficulty. "Approved" means no open content gaps; it does not mean an exam provider checked it.</p>
    <p class="small">Exam facts (codes, durations, pass marks, prices, domain weights) come only from official pages, each with a source link and the date it was checked. See <a href="#/path">Certification path</a> → Exam facts and sources.</p>
    <p class="small">Career content (labs, ADR templates, interview questions, story seeds) is practice material, not exam content.</p>
    <div class="row" style="margin-top:10px"><a class="btn" href="#/content">Content review</a><a class="btn ghost" href="#/privacy">Privacy</a></div></section>`;
};
VIEWS.privacy = () => `<div class="page-head"><div><h1>Privacy</h1><p class="muted">Short version: your data stays on this device unless you move it.</p></div></div>
  <section class="card" style="margin-bottom:16px"><h2>What is stored, and where</h2><ul class="small">
    <li>Your answers, review schedule, artifacts, profile, study plan, reports, and content edits are saved in this browser's storage (IndexedDB) on this device. Nothing is sent to a server; there is no account and no sync.</li>
    <li>One small preference entry (focus certification, theme, last study area) is kept in this browser's local storage. You can turn it off in Settings.</li>
    <li>Workspace and export files are created only when you choose to download them, and stay wherever you save them.</li></ul></section>
  <section class="card" style="margin-bottom:16px"><h2>Network requests</h2><ul class="small">
    <li>Studying — answering questions, reviewing, flashcards, the Decision Atlas, the error log — works fully offline once the page is loaded. The app makes no request of its own to study with you; it asks nothing of any third party and loads no remote fonts, scripts, or trackers while you work.</li>
    <li>Loading the page the first time, or from a hosted link (such as a GitHub Pages URL), is itself a network request to whoever is hosting it, the same as any web page. Once loaded, the offline service worker (see Install) can check for a newer version in the background.</li>
    <li>Links to official exam pages, documentation, and external sources (including the Atlas's source register) open only when you tap them, and then in a new tab under your browser's own controls.</li>
    <li>Optional features such as AI feedback or sync are not enabled in this version. If they are added, they will stay off until you configure them, and this page will say what they send.</li></ul></section>
  <section class="card"><h2>Your controls</h2><p class="small">Download everything as a workspace file, or delete everything this app stored on this device, from <a href="#/settings">Settings</a> → Saved on this device.</p></section>`;
NAV.push(['about', 'About & privacy', 'Data']);
ICON.about = '<circle cx="12" cy="12" r="9"/><path d="M12 11v6M12 7.5v.5"/>';
ICON.content = '<path d="M4 5h16M4 12h10M4 19h7"/><path d="M15 16l2 2 4-4"/>';
NAV.splice(NAV.findIndex(n => n[0] === 'library') + 1, 0, ['content', 'Content review', 'Certify']);

/* Owner edits are applied before every render (cheap: skipped unless edits or the workspace changed). */
const _renderP3 = render; render = function () { try { applyContentEdits(); } catch (e) { console.error(e); } _renderP3(); };

/* ---------- Events */
document.addEventListener('change', e => {
  const el = e.target;
  if (el.dataset?.p3c) { S.p3c[el.dataset.p3c] = el.value; if (el.dataset.p3c === 'exam') S.p3c.domain = ''; S.p3c.page = 0; if (el.tagName === 'SELECT') { render(); $('#' + el.id)?.focus(); } }
  if (el.dataset?.p3diff && el.value) { saveEdit(el.dataset.p3diff, { difficulty: el.value, difficulty_source: 'owner', lastReviewed: isoDate(Date.now()) }); render(); showStatus(`Difficulty set to ${el.value}. The measured value is shown separately and never overwrites it.`); }
});
document.addEventListener('input', e => { const el = e.target; if (el.dataset?.p3c === 'q') { S.p3c.q = el.value; S.p3c.page = 0; clearTimeout(S.p3cT); S.p3cT = setTimeout(() => { render(); const i = $('#cr-q'); if (i) { i.focus(); i.setSelectionRange(i.value.length, i.value.length); } }, 250); } });
document.addEventListener('click', e => {
  const b = e.target.closest('[data-action^="p3-"]'); if (!b) return; const d = b.dataset; if (d.action !== 'p3-owner') e.preventDefault();
  const fx = {
    'p3-report': () => reportDialog(d.id),
    'p3-issue': () => { S.p3c.issue = d.v; S.p3c.page = 0; render(); },
    'p3-page': () => { S.p3c.page += +d.v; render(); window.scrollTo(0, 0); },
    'p3-owner': () => { S.p3c.owner = b.checked; render(); },
    'p3-approve': () => { const q = Q(d.v); saveEdit(d.v, { reviewStatus: 'approved', lastReviewed: isoDate(Date.now()), ...(q.difficulty_source === 'inferred' ? { difficulty_source: 'owner' } : {}) }); render(); showStatus(`${d.v} approved. Any remaining gaps (such as a missing explanation) stay listed.`); },
    'p3-retire': () => { const q = Q(d.v); saveEdit(d.v, { reviewStatus: q.reviewStatus === 'retired' ? 'needs-review' : 'retired', lastReviewed: isoDate(Date.now()) }); render(); showStatus(q.reviewStatus === 'retired' ? `${d.v} is retired and leaves practice pools. Its history is kept.` : `${d.v} is back in practice pools as needs review.`); },
    'p3-resolve': () => { const r = S.ws.reports.find(x => x.id === d.v); if (r) { r.status = 'resolved'; r.updated = Date.now(); } markDirty(); render(); },
    'p3-revert': () => confirmModal('Undo your edits?', 'The question goes back to its built-in version and status.', 'Undo edits', () => { delete S.ws.contentEdits[d.v]; S.ws.contentEditsV++; applyContentEdits(true); BANK_BASE.delete(d.v); markDirty(); go('content'); }),
    'p3-export': () => { if (d.v === 'csv') downloadText(`cloudwalker-content-review-${stamp()}.csv`, reviewCsv(), 'text/csv'); else download(`cloudwalker-content-review-${stamp()}.json`, reviewFile()); showStatus('Content review file exported.'); },
    'p3-save': () => {
      const q = Q(d.v); const opt = q.options.map((o, i) => $('#ce-o' + i).value.trim());
      if (opt.some(o => !o) || !$('#ce-q').value.trim()) { showStatus('The question and every option need text.'); return; }
      const rat = q.options.map((o, i) => $('#ce-r' + i).value.trim()); const links = $('#ce-links').value.split('\n').map(l => l.split('|').map(s => s.trim())).filter(p => p[0] && p[1]).map(([title, url]) => ({ title, url }));
      const bad = links.filter(l => !safeUrl(l.url)); if (bad.length) { showStatus('Links must start with https:// — check: ' + bad.map(l => l.title).join(', ')); return; }
      const diff = $('#ce-diff').value;
      saveEdit(d.v, { question: $('#ce-q').value.trim(), options: opt, correct_index: +$('#ce-ci').value, correct_rationale: $('#ce-cr').value.trim(), distractor_summary: $('#ce-ds').value.trim(), optionRationales: rat.some(Boolean) ? rat : null, docLinks: links, examGuideVersion: $('#ce-egv').value.trim() || null, difficulty: diff, ...(diff !== q.difficulty || q.difficulty_source === 'inferred' && d.approve ? { difficulty_source: 'owner' } : {}), reviewStatus: d.approve ? 'approved' : 'needs-review', lastReviewed: isoDate(Date.now()) });
      go('content'); showStatus(`${d.v} saved${d.approve ? ' and approved' : ''}.`);
    }
  };
  if (fx[d.action]) fx[d.action]();
});

/* ---------- Workspace import also merges Phase 2–3 records (study plan, reports, content edits) */
const _smartImportP3 = smartImport;
smartImport = data => {
  const r = _smartImportP3(data); const w = data && (data.workspace || data); if (!w || data.format !== 'cloudwalker-workspace') return r;
  ensureP3Ws();
  if (w.plan && w.plan.weeks && (!S.ws.plan || (w.plan.created || 0) > (S.ws.plan.created || 0))) S.ws.plan = w.plan;
  if (Array.isArray(w.reports)) { const m = new Map(S.ws.reports.map(x => [x.id, x])); for (const x of w.reports) if (x && /^RPT-\d{3,}$/.test(x.id || '') && (!m.has(x.id) || (x.updated || 0) > (m.get(x.id).updated || 0))) m.set(x.id, x); S.ws.reports = [...m.values()]; }
  if (w.contentEdits && typeof w.contentEdits === 'object') { for (const [id, e] of Object.entries(w.contentEdits)) if (e && e.fields && (!S.ws.contentEdits[id] || (e.updated || 0) > (S.ws.contentEdits[id].updated || 0))) S.ws.contentEdits[id] = e; S.ws.contentEditsV++; applyContentEdits(true); }
  return r;
};


