/* ------------------------------------------------------------------ View: Library */
function libFiltered() {
  const f = S.ui.lib; const needle = f.q.trim().toLowerCase();
  return allQ().filter(q => (!f.exam || q.exam_code === f.exam) && (!f.domain || q.domain === f.domain) && (!f.subdomain || q.subdomain === f.subdomain) && (!f.service || q.services.includes(f.service)) && (!f.difficulty || q.difficulty === f.difficulty) && (!f.type || q.question_type === f.type) && (!f.tag || q.tags.includes(f.tag))
    && (!f.status || (f.status === 'unseen' ? !isSeen(q.id) : f.status === 'missed' ? isMissed(q.id) : f.status === 'flagged' ? S.progress.flags.has(q.id) : f.status === 'correct' ? isSeen(q.id) && !isMissed(q.id) : true))
    && (!needle || (q.id + ' ' + q.source_id + ' ' + q.question + ' ' + q.options.join(' ') + ' ' + q.services.join(' ') + ' ' + q.subdomain).toLowerCase().includes(needle)));
}
function libItem(q) {
  const st = isMissed(q.id) ? '<span class="status no">Missed</span>' : isSeen(q.id) ? '<span class="status ok">Correct</span>' : '';
  return `<button class="lib-item" data-action="open-q" data-id="${esc(q.id)}"><div class="lib-top"><strong>${esc(q.exam_code)}</strong><span>${esc(q.subdomain)}</span>${st}${S.progress.flags.has(q.id) ? '<span class="status flag">Flagged</span>' : ''}<span class="spacer"></span><span class="faint">${esc(q.id)}</span></div><div class="qline">${rich(q.question)}</div><div class="chips">${q.services.slice(0, 4).map(s => `<span class="chip">${esc(s)}</span>`).join('')}<span class="chip">${esc(q.difficulty)}</span></div></button>`;
}
const PAGE = 25;
VIEWS.library = () => {
  const f = S.ui.lib; const list = libFiltered(); const pages = Math.max(1, Math.ceil(list.length / PAGE)); f.page = Math.min(f.page, pages - 1);
  const slice = list.slice(f.page * PAGE, f.page * PAGE + PAGE);
  return `
  <div class="page-head"><div><h1>Question library</h1><p class="muted">Search the full bank by text, service, or ID. Open any question to see its answer and reasoning, or practice it on its own.</p></div>
    <button class="btn" data-action="practice-filtered" ${list.length ? '' : 'disabled'}>Practice these ${list.length ? Math.min(list.length, 200) : ''}</button></div>
  <section class="card" aria-label="Library filters">
    <form data-form="lib" class="stack" onsubmit="return false">
      <div class="field search"><label for="l-q" class="sr-only">Search questions</label><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><circle cx="11" cy="11" r="7"/><path d="M20 20l-3.5-3.5"/></svg><input id="l-q" name="q" type="search" placeholder="Search text, service, or ID (for example ExpressRoute or gcp-pca-017)" value="${esc(f.q)}" autocomplete="off"></div>
      <div class="filters">
        <div class="field"><label for="l-exam">Certification</label><select id="l-exam" name="exam">${examOpts(f.exam)}</select></div>
        <div class="field"><label for="l-dom">Domain</label><select id="l-dom" name="domain" ${f.exam ? '' : 'disabled'}>${opts(f.exam ? domainsOf(f.exam) : [], f.domain, f.exam ? 'All domains' : 'Choose a certification first')}</select></div>
        <div class="field"><label for="l-sub">Sub-domain</label><select id="l-sub" name="subdomain">${opts(subdomainsOf(f.exam, f.domain), f.subdomain, 'All sub-domains')}</select></div>
        <div class="field"><label for="l-svc">Service</label><select id="l-svc" name="service">${opts(servicesOf(f.exam), f.service, 'Any service')}</select></div>
        <div class="field"><label for="l-diff">Difficulty</label><select id="l-diff" name="difficulty">${opts(DIFFS, f.difficulty, 'Any difficulty')}</select></div>
        <div class="field"><label for="l-type">Question type</label><select id="l-type" name="type">${opts(['scenario', 'concept'], f.type, 'Any type')}</select></div>
        <div class="field"><label for="l-tag">Concept tag</label><select id="l-tag" name="tag">${opts(tagsOf(), f.tag, 'Any tag')}</select></div>
        <div class="field"><label for="l-st">Status</label><select id="l-st" name="status">${opts([['unseen', 'Not attempted'], ['correct', 'Last answer correct'], ['missed', 'Last answer wrong'], ['flagged', 'Flagged']], f.status, 'Any status')}</select></div>
      </div>
      <div class="row"><span class="small muted" aria-live="polite"><strong>${list.length}</strong> of ${S.bank.size} questions</span><span class="spacer"></span><button type="button" class="btn sm ghost" data-action="lib-clear">Clear filters</button></div>
    </form>
  </section>
  <div style="margin-top:16px" id="libResults">${slice.length ? `<div class="stack">${slice.map(libItem).join('')}</div>
    <nav class="pager" aria-label="Pagination"><button class="btn sm" data-action="lib-page" data-v="-1" ${f.page ? '' : 'disabled'}>Previous page</button><span class="small muted">Page ${f.page + 1} of ${pages}</span><button class="btn sm" data-action="lib-page" data-v="1" ${f.page < pages - 1 ? '' : 'disabled'}>Next page</button></nav>`
    : emptyState('No questions match', 'Try removing a filter or searching for a broader term such as a service name.', '<button class="btn primary" data-action="lib-clear">Clear filters</button>')}</div>`;
};
function openQuestion(id) {
  const q = Q(id); if (!q) return;
  const at = attempts(id);
  dialog(`${q.exam_code} ${q.source_id || q.id}`, `
    <div class="qmeta"><span class="chip">${esc(q.domain)}</span><span class="chip">${esc(q.subdomain)}</span><span class="chip">${esc(q.question_type)}</span><span class="chip">${esc(q.difficulty)}${q.difficulty_source === 'inferred' ? ' (inferred)' : ''}</span></div>
    <p class="qtext">${rich(q.question)}</p>
    <ol class="options" style="list-style:none;padding:0" id="dlgOpts">${q.options.map((o, i) => `<li class="opt static" data-opt="${i}"><span class="key" aria-hidden="true">${LETTERS[i]}</span><span><span class="sr-only">Option ${LETTERS[i]}: </span>${rich(o)}</span><span class="verdict"></span></li>`).join('')}</ol>
    <div class="row" style="margin-top:16px"><button class="btn" data-action="dlg-reveal" aria-expanded="false" aria-controls="dlgExplain">Show answer and explanation</button><button class="btn primary" data-action="practice-one" data-id="${esc(id)}">Practice this question</button><button class="btn ${S.progress.flags.has(id) ? 'flag-on' : ''}" data-action="dlg-flag" data-id="${esc(id)}" aria-pressed="${S.progress.flags.has(id)}">${S.progress.flags.has(id) ? 'Flagged' : 'Flag'}</button></div>
    <div id="dlgExplain" hidden>${explainPanel(q, null)}</div>
    <div class="qmeta" style="margin-top:16px">${q.services.map(s => `<span class="chip">${esc(s)}</span>`).join('')}${q.tags.map(t => `<span class="chip">#${esc(t)}</span>`).join('')}</div>
    <p class="small muted" style="margin-top:12px">Canonical ID <code>${esc(q.id)}</code>. ${at.length ? `Attempted ${at.length} time(s), last ${at[at.length - 1].correct ? 'correct' : 'incorrect'} ${ago(at[at.length - 1].t)}.` : 'Not attempted yet.'} ${q.source_section ? `Source: ${esc(q.source_section)}.` : ''}</p>`);
}
function dialog(title, html) { S.p3.detail = { title, html }; if (route().name === 'detail') render(); else go('detail'); }

