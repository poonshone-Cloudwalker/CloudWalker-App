/* ================================================================== V10.1: Bootcamp, dashboard and library
 * Routes: #/bootcamp (dashboard), #/bootcamp/library, #/bootcamp/lab/<id>, #/bootcamp/tracker,
 * #/bootcamp/portfolio, #/bootcamp/recommend, #/bootcamp/guide. Library filters are screen state (not saved). */
let BCUI = { filters: { vendor: '', domain: '', kind: '', cloud: '', portfolio: '', status: '' }, importMsg: null, scrolled: '' };
const BC_TABS = [['', 'Dashboard'], ['library', 'Library'], ['tracker', 'Tracker'], ['portfolio', 'Portfolio'], ['recommend', 'Recommendations'], ['guide', 'Operating guide']];

function bcTabs(cur) {
  return `<nav class="bc-tabs" aria-label="Bootcamp sections">${BC_TABS.map(([k, l]) => `<a href="#/bootcamp${k ? '/' + k : ''}" class="chip linkchip" ${k === cur ? 'aria-current="page"' : ''}>${l}</a>`).join('')}</nav>`;
}
function bcHead(title, sub, cur) {
  return `<div class="page-head"><div><h1>${esc(title)}</h1>${sub ? `<p class="muted">${sub}</p>` : ''}</div></div>${bcTabs(cur)}`;
}
const bcStatusChip = s => `<span class="chip bc-st bc-st-${esc(s)}">${esc(BC_STATUS_LABEL[s] || s)}</span>`;
function bcLabChips(lab, r) {
  return [lab.kind === 'exemplar' ? '<span class="chip bc-ex">Exemplar · level gate</span>' : '',
    `<span class="chip bc-cloud bc-${lab.cloud_mode}">${BC_CLOUD_LABEL[lab.cloud_mode]}</span>`,
    ...lab.vendors.filter(v => v !== 'local').map(v => `<span class="chip">${esc(BC_VENDOR_LABEL[v] || v)}</span>`),
    r ? bcStatusChip(r.status) : '', r && r.portfolio === 'portfolio-ready' ? '<span class="chip bc-pf">Portfolio-ready</span>' : ''].join('');
}
function bcErrorView(cur) {
  const C = bcContent();
  return bcHead('Bootcamp', '', cur) + `<section class="card bc-error" role="alert"><h2>The bootcamp content did not load</h2><p>Its files failed their check, so the Bootcamp pages are switched off. The rest of CloudWalker works normally, and saved bootcamp progress is kept.</p><ul>${C.errors.slice(0, 20).map(e => `<li>${esc(e)}</li>`).join('')}</ul>${C.errors.length > 20 ? `<p class="small">…and ${C.errors.length - 20} more.</p>` : ''}<p class="small muted">Rebuild after fixing the files in src/content/bootcamp/ (or run tools/bootcamp-extract.js).</p></section>`;
}
const bcLabLink = (lab, extra = '') => `<a href="#/bootcamp/lab/${encodeURIComponent(lab.id)}">${esc(bcLabName(lab))}</a>${extra}`;
const bcScoreBar = (v, label) => `<div class="bar bc-sbar" role="img" aria-label="${esc(label)}"><i style="width:${Math.round(v / 4 * 100)}%"></i></div>`;

/* ---------- dashboard */
function bcCounts() {
  const n = { total: BC.labs.length, briefs: 0, exemplars: 0, passed: 0, inProgress: 0, blocked: 0, rework: 0, exPassed: 0, ready: 0 };
  for (const l of BC.labs) { const r = bcRec(l.id); l.kind === 'exemplar' ? n.exemplars++ : n.briefs++;
    if (r.status === 'passed') { n.passed++; if (l.kind === 'exemplar') n.exPassed++; } if (r.status === 'in-progress') n.inProgress++; if (r.status === 'blocked') n.blocked++; if (r.status === 'rework') n.rework++; if (r.portfolio === 'portfolio-ready') n.ready++; }
  return n;
}
function bcDimAverages() {
  return BC.dims.map(d => { const v = BC.labs.map(l => bcRec(l.id)[d.tracker_field]).filter(Number.isInteger); return { ...d, n: v.length, avg: v.length ? v.reduce((a, b) => a + b, 0) / v.length : null }; });
}
function bcRecCard(rec) {
  const why = rec.reasons.map(r => r.kind === 'focus' ? `You chose to focus on ${esc(r.topic.label.toLowerCase())}.` : r.kind === 'cloud' ? `${esc(r.code)} · ${esc(dShort(r.domain))} is at ${r.acc}% over ${r.att} answers; this lab practises the same cloud.` : `${esc(r.code)} · ${esc(dShort(r.domain))} is at ${r.acc}% over ${r.att} answers (${esc(r.topic.label.toLowerCase())}).`);
  return `<li class="bc-rec">${bcLabLink(rec.lab)} ${bcStatusChip(bcRec(rec.lab.id).status)}<p class="small muted">${why.slice(0, 2).join(' ')}</p></li>`;
}
function bcDashboardView() {
  if (!bcContent().ok) return bcErrorView('');
  const n = bcCounts(); const next = bcNextLab(); const avgs = bcDimAverages(); const log = (S.ws.bootcamp && S.ws.bootcamp.log || []).slice(0, 8);
  const open = BC.labs.filter(l => ['in-progress', 'blocked', 'rework'].includes(bcRec(l.id).status)); const ready = BC.labs.filter(l => bcRec(l.id).portfolio === 'portfolio-ready');
  const recs = bcRecommendations(3); const F = BC.framework;
  return bcHead('Bootcamp', `${esc(F.title)} · ${esc(F.tagline)}. The lab work happens in your terminal and repository; this is where you track it.`, '') + `
  <div class="grid bc-kpis" style="margin-top:16px">
    <div class="kpi card"><div class="v" id="bc-n-total">${n.total}</div><div class="l">Labs</div><div class="s">${n.briefs} briefs and ${n.exemplars} exemplars</div></div>
    <div class="kpi card"><div class="v" id="bc-n-passed">${n.passed}</div><div class="l">Passed</div><div class="s">${pct(n.passed, n.total)}% of all labs</div></div>
    <div class="kpi card"><div class="v" id="bc-n-progress">${n.inProgress}</div><div class="l">In progress</div><div class="s">${n.rework} marked for rework</div></div>
    <div class="kpi card"><div class="v" id="bc-n-blocked">${n.blocked}</div><div class="l">Blocked</div><div class="s">Cleanup failures count as blocked</div></div>
    <div class="kpi card"><div class="v" id="bc-n-ex">${n.exPassed}<span class="bc-of"> / ${n.exemplars}</span></div><div class="l">Exemplars passed</div><div class="s">Each one is a level gate</div></div>
  </div>
  <div class="grid g-2 bc-dash" style="margin-top:16px">
    <section class="card bc-next" aria-labelledby="h-bc-next"><h2 id="h-bc-next">Next recommended lab</h2>${next ? `<p class="bc-next-title" id="bc-next">${bcLabLink(next.lab)}</p><div class="row bc-chips">${bcLabChips(next.lab, bcRec(next.lab.id))}</div><p class="small muted" style="margin-top:8px">${esc(next.why)}</p><p class="small" style="margin-top:6px">${bcInline(next.lab.scenario)}</p><div class="row" style="margin-top:12px"><a class="btn primary" href="#/bootcamp/lab/${encodeURIComponent(next.lab.id)}">Open the lab</a></div>` : '<p id="bc-next">Every lab is passed. Keep the evidence current and the portfolio sanitized.</p>'}</section>
    <section class="card" aria-labelledby="h-bc-recs"><h2 id="h-bc-recs">From your certification practice</h2>${recs.length ? `<ul class="bc-list" id="bc-dash-recs">${recs.map(bcRecCard).join('')}</ul><p class="small" style="margin-top:8px"><a href="#/bootcamp/recommend">All recommendations</a></p>` : `<p class="small muted" id="bc-dash-recs">No weak areas yet. When a quiz domain drops to ${BC.mapping.weak_threshold.max_accuracy}% or below over at least ${BC.mapping.weak_threshold.min_attempts} answers, labs that practise it appear here. You can also <a href="#/bootcamp/recommend">pick focus topics</a>.</p>`}</section>
  </div>
  <section class="card" style="margin-top:16px" aria-labelledby="h-bc-levels"><h2 id="h-bc-levels">Completion by level</h2>
    <ul class="bc-levels-prog">${BC.levels.map(lv => { const ids = [...lv.lab_ids, lv.exemplar_id]; const p = ids.filter(id => bcRec(id).status === 'passed').length; const gate = bcRec(lv.exemplar_id).status === 'passed';
      return `<li><a href="#/bootcamp/library/${lv.level}">Level ${lv.level} · ${esc(lv.title)}</a><span class="small muted">${p} of ${ids.length} passed${gate ? ' · gate passed' : ''}</span>${pctBar(p, ids.length, `Level ${lv.level} labs passed`)}</li>`; }).join('')}</ul></section>
  <div class="grid g-2" style="margin-top:16px">
    <section class="card" aria-labelledby="h-bc-avg"><h2 id="h-bc-avg">Average score by dimension</h2>${avgs.some(a => a.n) ? `<ul class="bc-dims" id="bc-avgs">${avgs.map(a => `<li><span>${esc(a.label)}</span><span class="small muted">${a.n ? a.avg.toFixed(1) + ' / 4 · ' + a.n + ' lab' + (a.n === 1 ? '' : 's') : 'not scored'}</span>${bcScoreBar(a.avg || 0, `${a.label}: average ${a.n ? a.avg.toFixed(1) : 'none'} of 4`)}</li>`).join('')}</ul><p class="small muted" style="margin-top:8px">${esc(BC.rubric.gate.note)}</p>` : `<p class="small muted" id="bc-avgs">No scores yet. Score each lab 0–4 on seven dimensions from its lab page.</p>`}</section>
    <section class="card" aria-labelledby="h-bc-act"><h2 id="h-bc-act">Recent activity</h2>${log.length ? `<ul class="bc-log" id="bc-log">${log.map(e => { const l = bcLab(e.id); return `<li><span class="small muted">${esc(fmtDate(e.t))}</span> ${l ? bcLabLink(l) : esc(e.id)} <span class="small">${esc(e.what)}</span></li>`; }).join('')}</ul>` : '<p class="small muted" id="bc-log">Nothing recorded yet.</p>'}</section>
  </div>
  <div class="grid g-2" style="margin-top:16px">
    <section class="card" aria-labelledby="h-bc-open"><h2 id="h-bc-open">Incomplete labs</h2>${open.length ? `<ul class="bc-list" id="bc-open">${open.map(l => `<li>${bcLabLink(l)} ${bcStatusChip(bcRec(l.id).status)}</li>`).join('')}</ul>` : '<p class="small muted" id="bc-open">No labs are in progress, blocked or in rework.</p>'}</section>
    <section class="card" aria-labelledby="h-bc-ready"><h2 id="h-bc-ready">Portfolio-ready</h2>${ready.length ? `<ul class="bc-list" id="bc-ready">${ready.map(l => `<li>${bcLabLink(l)}${bcRec(l.id).evidence.sanitized ? '' : ' <span class="chip warn-chip">Not marked sanitized</span>'}</li>`).join('')}</ul>` : '<p class="small muted" id="bc-ready">No labs are marked portfolio-ready yet. Mark passed labs on the <a href="#/bootcamp/portfolio">Portfolio</a> page.</p>'}</section>
  </div>
  <p class="small muted" style="margin-top:16px">Bootcamp progress is saved on this device and included in workspace exports. To move it to another device, use <a href="#/bootcamp/tracker">Export bootcamp progress</a> on the Tracker page.</p>`;
}

/* ---------- library */
const BC_FILTERS = () => [
  ['vendor', 'Vendor', BC_VENDORS], ['domain', 'Domain', BC.domains.map(d => [d, BC_DOMAIN_LABEL[d] || d])], ['kind', 'Type', [['lab', 'Lab briefs'], ['exemplar', 'Exemplars']]],
  ['cloud', 'Cloud', [['local-only', 'Local only'], ['optional-cloud', 'Optional sandbox']]], ['portfolio', 'Portfolio relevance', BC.framework.portfolio.artifacts.filter(a => a.key !== 'evidence-index').map(a => [a.key, a.title])], ['status', 'Status', BC_STATUSES]];
function bcMatches(lab, f = BCUI.filters) {
  const r = bcRec(lab.id);
  return (!f.vendor || lab.vendors.includes(f.vendor)) && (!f.domain || lab.domains.includes(f.domain)) && (!f.kind || lab.kind === f.kind) && (!f.cloud || lab.cloud_mode === f.cloud) && (!f.portfolio || lab.portfolio_categories.includes(f.portfolio)) && (!f.status || r.status === f.status);
}
function bcLibraryView(focusLevel) {
  if (!bcContent().ok) return bcErrorView('library');
  if (focusLevel && BCUI.scrolled !== location.hash) BCUI.scrolled = location.hash, queueMicrotask(() => document.getElementById('bc-lv-' + focusLevel)?.scrollIntoView({ block: 'start' }));
  const f = BCUI.filters; const active = Object.values(f).some(Boolean); const shown = BC.labs.filter(l => bcMatches(l));
  const cur = (bcNextLab() || {}).lab;
  const filters = BC_FILTERS().map(([k, label, opts]) => `<div class="bc-fgroup" role="group" aria-labelledby="bc-fl-${k}"><p class="small bc-flabel" id="bc-fl-${k}">${label}</p><div class="row bc-chips">${[['', 'All'], ...opts].map(([v, l]) => `<button type="button" class="chip" data-action="bootcamp-filter" data-k="${k}" data-v="${esc(v)}" aria-pressed="${f[k] === v}">${esc(l)}</button>`).join('')}</div></div>`).join('');
  const levels = BC.levels.map(lv => {
    const labs = [...lv.lab_ids, lv.exemplar_id].map(bcLab).filter(l => shown.includes(l)); if (active && !labs.length) return '';
    const passed = [...lv.lab_ids, lv.exemplar_id].filter(id => bcRec(id).status === 'passed').length; const open = active || (focusLevel ? focusLevel === lv.level : cur ? cur.level === lv.level : lv.level === 1);
    return `<details class="card bc-level" id="bc-lv-${lv.level}" ${open ? 'open' : ''}><summary><span class="bc-lvnum">Level ${lv.level}</span><span class="bc-lvtitle">${esc(lv.title)}</span><span class="small muted">${passed} of 9 passed${active ? ` · ${labs.length} shown` : ''}</span></summary>
      <div class="bc-lvmeta"><p><strong>Outcome:</strong> ${bcInline(lv.outcome)}.</p>
        <p class="small"><strong>Main tools:</strong></p><div class="row bc-chips">${lv.main_tools.map(t => `<span class="chip">${esc(t)}</span>`).join('')}</div>
        <p class="small" style="margin-top:8px"><strong>Promotion evidence:</strong> ${lv.promotion_evidence.map(bcInline).join('; ')}.</p>
        <p class="small muted">${lv.lab_brief_count} lab briefs · Exemplar: ${esc(lv.exemplar_title)} · <code>${esc(lv.dir)}/</code></p></div>
      <ul class="bc-labs">${labs.map(l => { const r = bcRec(l.id); return `<li class="bc-labrow ${l.kind === 'exemplar' ? 'is-ex' : ''}"><div class="bc-labmain">${bcLabLink(l)}<p class="small muted">${bcInline(l.scenario)}</p></div><div class="row bc-chips">${bcLabChips(l, r)}</div></li>`; }).join('')}</ul></details>`;
  }).join('');
  return bcHead('Bootcamp library', `Nine levels, each with eight lab briefs and an exemplar that serves as the level gate. ${bcInline(BC.framework.pacing)}`, 'library') + `
  <details class="card bc-filters" style="margin-top:16px" ${active || BCUI.filtersOpen ? 'open' : ''}><summary><h2 id="h-bc-filter">Filter labs</h2><span class="small muted">${active ? Object.values(f).filter(Boolean).length + ' active' : 'vendor, domain, type, cloud, portfolio, status'}</span></summary>${active ? '<div class="row" style="margin-top:8px"><button class="btn sm" data-action="bootcamp-filter-clear">Clear filters</button></div>' : ''}<div class="bc-fgrid">${filters}</div>
    <p class="small muted">Vendor, domain, cloud and portfolio tags are CloudWalker's reading of each brief, not part of the curriculum. No lab needs a cloud account for its offline <code>make validate</code>; "Optional sandbox" means the brief names an opt-in cloud step.</p></details>
  <p class="small" role="status" id="bc-shown" style="margin-top:12px">Showing ${shown.length} of ${BC.labs.length} labs.</p>
  <div class="bc-levelstack" style="margin-top:16px">${levels || emptyState('No labs match these filters', 'Clear a filter or two to see more labs.', '<button class="btn" data-action="bootcamp-filter-clear">Clear filters</button>')}</div>`;
}
