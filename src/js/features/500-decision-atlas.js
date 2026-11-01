/* ================================================================== V10: Decision Atlas, Conflicts & Correction, Error Log
 * Source: GCP_Field_Reference_Rev2.pdf, Part III (Decision and professional-practice atlas, X01-X12) and
 * Part IV (Assessment, review and maintenance). Content lives as structured data in
 * content/atlas/atlas-matrices.json (the 12 six-column decision matrices, each row carrying an explicit,
 * data-authored `status`), content/atlas/atlas-reference.json (K01-K05 documented conflicts, the
 * mandatory-review-issues register, the Six-Step Decision Method, the error-log template, readiness rubric
 * and portfolio guidance) and content/atlas/atlas-sources.json (the T-IV-6 Source register, transcribed from
 * the PDF so every [S###] reference resolves to a real title and URL, or is honestly reported as missing).
 *
 * Corrective release notes (this pass fixes defects found in the first release):
 * - Row verification status is a static field recorded once when the data was authored (atlasRow.status:
 *   'unverified' | 'source-linked' | 'needs-review' | 'verified'), never a runtime rule that scans prose
 *   for keywords, and never a default of 'verified'. 'verified' is never auto-assigned by this file; it is
 *   reserved for a future pass that records an actual checked-by/checked-on audit entry. See atlasSignal().
 * - [S###] markers are links to a real source-detail view (#/atlas/source/S###) built from the source
 *   register; an ID with no register entry renders "Source details unavailable" rather than a fabricated
 *   link, and atlasMissingSources() reports every such gap so it can be tracked, not hidden.
 * - "Architect mode" is labelled a Decision Recall Drill: a service-selection practice drill, not a
 *   validated architecture-readiness assessment. Its saved score is explicitly "Last completed score" and
 *   is only shown once a full session has actually been completed (completions > 0), never after a single
 *   answered question defaults to a misleading 0%.
 * - Answer options for a question are generated once per question and stored in the session, not
 *   regenerated on every render (which previously reshuffled the choices under the learner mid-question).
 * - Workspace import merges by stable ID and a per-record `updated` timestamp (not one Atlas-wide
 *   timestamp), carries deletion tombstones so an older import can't resurrect a deleted error-log entry,
 *   validates every imported field's type/length/shape, and rejects prototype-pollution keys.
 *
 * Saved data (S.ws.atlas): {
 *   practice: { <entryId>: { seen, correct, completions, lastScore, updated } },
 *   errorlog: { entries: [ { id, date, questionId, wrongModel, correctedRule, evidence, transferTest, retested, updated } ],
 *               deleted: { <id>: deletedAtMillis } },
 *   updated
 * }
 * The practice quiz session itself (current question order, position, generated options) is screen state,
 * not saved. */

const ATLAS_ID_RE = /^[A-Za-z0-9_-]{1,64}$/;
const ATLAS_UNSAFE_KEYS = new Set(['__proto__', 'constructor', 'prototype']);
const atlasSafeId = v => typeof v === 'string' && v.length && !ATLAS_UNSAFE_KEYS.has(v) && ATLAS_ID_RE.test(v);
const atlasSafeStr = (v, max) => typeof v === 'string' ? v.slice(0, max) : '';
const atlasSafeNum = (v, lo, hi) => Number.isFinite(v) && v >= lo && v <= hi ? v : null;

function atlasData() {
  const d = (S.ws.atlas ||= { practice: {}, errorlog: { entries: [], deleted: {} }, updated: 0 });
  if (!d.practice || typeof d.practice !== 'object') d.practice = {};
  if (!d.errorlog || typeof d.errorlog !== 'object' || !Array.isArray(d.errorlog.entries)) d.errorlog = { entries: [], deleted: {} };
  if (!d.errorlog.deleted || typeof d.errorlog.deleted !== 'object') d.errorlog.deleted = {};
  return d;
}
const atlasEntry = id => (typeof ATLAS_MATRICES !== 'undefined' ? ATLAS_MATRICES : []).find(e => e.id === id);
const atlasAll = () => (typeof ATLAS_MATRICES !== 'undefined' ? ATLAS_MATRICES : []);
const atlasRef = () => (typeof ATLAS_REFERENCE !== 'undefined' ? ATLAS_REFERENCE : {});
const atlasSources = () => (typeof ATLAS_SOURCES !== 'undefined' ? ATLAS_SOURCES : { legend: {}, sources: {} });

/* A status is always rendered as a short, explicit text label. None of these is ever inferred at
 * runtime from prose; each row's `status` was recorded once when the matrix was transcribed (see the
 * build note at the top of this file and the data-authoring script used to set it). */
function atlasSignal(status) {
  const M = {
    unverified: { cls: 'atlas-sig-unverified', label: 'Unverified — no documented claim check recorded for this row' },
    'source-linked': { cls: 'atlas-sig-linked', label: 'Source-linked — a source is cited, but the claim has not been independently checked' },
    verified: { cls: 'atlas-sig-verified', label: 'Verified — a recorded check found supporting evidence' },
    'needs-review': { cls: 'atlas-sig-review', label: 'Needs review — conflicting, incomplete, or change-sensitive; not doc-verified in this pass' },
  };
  return M[status] || M.unverified;
}
function atlasStatusChip(status) {
  const s = atlasSignal(status);
  const text = { unverified: 'Unverified', 'source-linked': 'Source-linked', verified: 'Verified', 'needs-review': 'Needs review' }[status] || 'Unverified';
  return `<span class="chip atlas-chip ${s.cls}" title="${esc(s.label)}">${esc(text)}</span>`;
}

/* [S057]-style markers become links to the source-detail view; a marker with no register entry is still
 * rendered as a link (so the gap is visible and trackable), and the detail page says plainly that no
 * record exists rather than showing fabricated title/URL text. */
function atlasLinkSources(text) {
  return esc(text || '').replace(/\[S(\d{3})\]/g, (m, num) => `<a href="#/atlas/source/S${num}" class="atlas-src-link">${m}</a>`);
}
function atlasMissingSources() {
  const reg = atlasSources().sources || {}; const cited = new Set();
  for (const e of atlasAll()) { for (const row of e.matrix) for (const f of [row.whyFits, row.whenNot, row.verify]) (f || '').replace(/\[S(\d{3})\]/g, (_, n) => cited.add('S' + n)); for (const s of e.sources || []) cited.add(s); }
  for (const c of atlasRef().conflicts || []) for (const s of c.sources || []) cited.add(s);
  return [...cited].filter(id => !reg[id]).sort();
}

let AT = { session: null };

/* ---------- Practice (Decision Recall Drill, "Architect mode") */
function atlasShuffle(arr) { const a = arr.slice(); for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1));[a[i], a[j]] = [a[j], a[i]]; } return a; }
function atlasOptionsFor(e, rowIdx) {
  const correct = e.matrix[rowIdx].candidate;
  const others = [...new Set(e.matrix.map(r => r.candidate).filter(c => c !== correct))];
  const distractors = atlasShuffle(others).slice(0, 3);
  return atlasShuffle([correct, ...distractors]);
}
function atlasBuildSession(id) {
  const e = atlasEntry(id); if (!e || !Array.isArray(e.matrix) || !e.matrix.length) { AT.session = null; return null; }
  const order = atlasShuffle(e.matrix.map((_, i) => i));
  AT.session = { id, order, i: 0, picked: null, options: atlasOptionsFor(e, order[0]), correct: 0, total: 0 };
  return AT.session;
}
function atlasAnswer(id, choice) {
  const s = AT.session; if (!s || s.id !== id || s.picked || s.i >= s.order.length) return; // guards repeated clicks and stale/finished sessions
  const e = atlasEntry(id); if (!e) return; const row = e.matrix[s.order[s.i]]; if (!row) return;
  if (!s.options || !s.options.includes(choice)) return; // guards a malformed/foreign choice value
  s.picked = choice; s.total++; if (choice === row.candidate) s.correct++;
}
function atlasNext(id) {
  const s = AT.session; if (!s || s.id !== id || !s.picked) return; // can't advance an unanswered question
  s.i++; s.picked = null;
  if (s.i >= s.order.length) {
    const e = atlasEntry(id); const d = atlasData(); const now = Date.now();
    const rec = (d.practice[id] ||= { seen: 0, correct: 0, completions: 0, lastScore: 0, updated: 0 });
    rec.seen += s.total; rec.correct += s.correct; rec.completions = (rec.completions || 0) + 1;
    rec.lastScore = s.total ? Math.round(s.correct / s.total * 100) : 0; rec.updated = now;
    d.updated = now; markDirty(); persistSoon(SAVE_QUICK);
  } else {
    s.options = atlasOptionsFor(atlasEntry(id), s.order[s.i]); // generated once per question, not on every render
  }
}

/* ---------- Views */
function atlasListView() {
  const d = atlasData();
  const cards = atlasAll().map(e => {
    const rec = d.practice[e.id]; const showScore = rec && rec.completions > 0;
    return `<a class="card atlas-card" href="#/atlas/${e.id}">
      <div class="row" style="justify-content:space-between;align-items:flex-start">
        <h3 style="margin:0">${esc(e.id)} · ${esc(e.title)}</h3>
        ${showScore ? `<span class="chip" title="Last completed score">Last: ${rec.lastScore}%</span>` : ''}
      </div>
      <p class="small muted" style="margin:6px 0 0">${esc(e.relevantTo.join(', '))}</p>
      <p class="small" style="margin:6px 0 0">${esc(e.intro.slice(0, 140))}${e.intro.length > 140 ? '…' : ''}</p>
    </a>`;
  }).join('');
  const missing = atlasMissingSources();
  return `<div class="page-head"><div><h1>Decision Atlas</h1><p class="muted">Twelve cross-certification decision matrices from the Field Reference. Each gives a candidate for a requirement, why it fits, when not to choose it, the nearest alternative, and what to verify before you commit. The Decision Recall Drill below lets you practise picking the right candidate before reading the answer — it is a service-selection recall drill, not a validated architecture-readiness assessment.</p></div></div>
  <section class="card" aria-labelledby="h-atlas-signals"><h2 id="h-atlas-signals">Row status labels used on this page</h2>
    <p class="small muted">Each row's status is a fact recorded about that row, not a guess from its wording — never color alone.</p>
    <div class="row" style="gap:8px;flex-wrap:wrap;margin-top:8px">${atlasStatusChip('source-linked')}${atlasStatusChip('needs-review')}${atlasStatusChip('unverified')}${atlasStatusChip('verified')}</div></section>
  <section class="card" style="margin-top:16px" aria-labelledby="h-atlas-tools"><h2 id="h-atlas-tools">Related tools</h2>
    <div class="grid g-2" style="margin-top:8px">
      <a class="card" href="#/atlas/conflicts"><h3 style="margin:0">Conflict &amp; Correction (K01–K05)</h3><p class="small muted" style="margin:6px 0 0">Documented disagreements between official sources, and how this edition handles each one — including which ones are still unresolved.</p></a>
      <a class="card" href="#/atlas/errorlog"><h3 style="margin:0">Error log</h3><p class="small muted" style="margin:6px 0 0">Log a wrong mental model, its corrected rule, and a transfer test that would expose the same error again.</p></a>
    </div>
    ${missing.length ? `<p class="small muted" style="margin-top:10px">${missing.length} source ID${missing.length === 1 ? '' : 's'} cited in this Atlas ${missing.length === 1 ? 'has' : 'have'} no register entry yet (see <a href="#/atlas/conflicts">Conflict &amp; Correction</a> for the list): ${missing.map(esc).join(', ')}.</p>` : ''}</section>
  <section class="card" style="margin-top:16px" aria-labelledby="h-atlas-grid"><h2 id="h-atlas-grid">The twelve entries</h2>
    <div class="grid g-2" style="margin-top:8px">${cards}</div></section>`;
}
function atlasMatrixTable(e) {
  return `<div class="atlas-table-wrap"><table class="atlas-table"><caption class="sr-only">${esc(e.id)} decision matrix</caption>
    <thead><tr><th scope="col">Requirement</th><th scope="col">Candidate</th><th scope="col">Status</th><th scope="col">Why it fits</th><th scope="col">When not to choose it</th><th scope="col">Nearest alternative</th><th scope="col">What to verify</th></tr></thead>
    <tbody>${e.matrix.map(r => `<tr>
      <td>${esc(r.requirement)}</td>
      <td><strong>${esc(r.candidate)}</strong></td>
      <td>${atlasStatusChip(r.status)}</td>
      <td>${atlasLinkSources(r.whyFits)}</td>
      <td>${atlasLinkSources(r.whenNot)}</td>
      <td>${esc(r.nearestAlt)}</td>
      <td>${atlasLinkSources(r.verify)}</td>
    </tr>`).join('')}</tbody></table></div>`;
}
function atlasExtraTables(e) {
  if (!e.tables) return '';
  return e.tables.map(t => `<div class="atlas-table-wrap" style="margin-top:12px"><p class="small" style="font-weight:600;margin-bottom:4px">${esc(t.title)}</p>
    <table class="atlas-table"><thead><tr>${t.columns.map(c => `<th scope="col">${esc(c)}</th>`).join('')}</tr></thead>
    <tbody>${t.rows.map(row => `<tr>${row.map(c => `<td>${esc(c)}</td>`).join('')}</tr>`).join('')}</tbody></table>
    ${t.note ? `<p class="small muted" style="margin-top:6px">${atlasLinkSources(t.note)}</p>` : ''}</div>`).join('');
}
function atlasDetailView(id) {
  const e = atlasEntry(id); const back = '<a class="btn sm ghost" href="#/atlas">← Atlas</a>';
  if (!e) return `<div class="run-head">${back}</div>${emptyState('Atlas entry not found', 'That entry does not exist.', '<a class="btn primary" href="#/atlas">Back to the Atlas</a>')}`;
  const d = atlasData(); const rec = d.practice[id]; const showScore = rec && rec.completions > 0;
  return `<div class="run-head">${back}</div>
  <div class="page-head"><div><h1>${esc(e.id)} · ${esc(e.title)}</h1><p class="muted">Relevant to: ${esc(e.relevantTo.join(', '))}</p></div></div>
  <section class="card" aria-labelledby="h-atlas-intro"><h2 id="h-atlas-intro">How to decide</h2><p>${esc(e.intro)}</p>
    <div class="row" style="margin-top:12px">
      <button class="btn primary" data-action="atlas-practice-start" data-id="${esc(e.id)}">Start Decision Recall Drill${showScore ? ` (last completed score ${rec.lastScore}%)` : ''}</button>
    </div>
    <p class="small muted" style="margin-top:8px">This drill tests whether you can pick the right candidate from the matrix below; it is not a validated measure of hands-on readiness. See the readiness rubric on the <a href="#/atlas/errorlog">error log</a> page for that.</p></section>
  <section class="card" style="margin-top:16px" aria-labelledby="h-atlas-matrix"><h2 id="h-atlas-matrix">T-${esc(e.id)} Decision matrix</h2>${atlasMatrixTable(e)}${atlasExtraTables(e)}</section>
  <section class="card" style="margin-top:16px" aria-labelledby="h-atlas-fail"><h2 id="h-atlas-fail">Failure modes</h2><ul>${e.failureModes.map(f => `<li>${esc(f)}</li>`).join('')}</ul></section>
  <section class="card" style="margin-top:16px" aria-labelledby="h-atlas-verify"><h2 id="h-atlas-verify">Verification steps</h2><ul>${e.verificationSteps.map(v => `<li>${atlasLinkSources(v)}</li>`).join('')}</ul>
    <p class="small muted" style="margin-top:8px">Sources: ${e.sources.map(s => `<a class="chip sm atlas-src-link" href="#/atlas/source/${esc(s)}">[${esc(s)}]</a>`).join(' ')}</p></section>`;
}
function atlasPracticeView(id) {
  const e = atlasEntry(id); const back = `<a class="btn sm ghost" href="#/atlas/${esc(id)}">← ${esc(id)}</a>`;
  if (!e) return `<div class="run-head">${back}</div>${emptyState('Atlas entry not found', 'That entry does not exist.')}`;
  let s = AT.session && AT.session.id === id ? AT.session : null;
  if (!s) s = atlasBuildSession(id);
  if (!s) return `<div class="run-head">${back}</div>${emptyState('Nothing to practise', 'This entry has no matrix rows to drill.')}`;
  if (s.i >= s.order.length) {
    const pct2 = s.total ? Math.round(s.correct / s.total * 100) : 0;
    return `<div class="run-head">${back}</div><div class="page-head"><div><h1>Decision Recall Drill — complete</h1></div></div>
    <section class="card" aria-labelledby="h-atlas-done"><h2 id="h-atlas-done" tabindex="-1">Score: ${s.correct} of ${s.total} (${pct2}%)</h2>
    <p class="small muted">This is a recall-drill score, not a readiness assessment — see the readiness rubric for the dimensions a strong quiz score can't substitute for (hands-on execution, troubleshooting, and so on). A wrong pick here is worth logging: open the Error log and record what you believed versus the corrected rule, plus a transfer test.</p>
    <div class="row" style="margin-top:12px"><button class="btn primary" data-action="atlas-practice-start" data-id="${esc(id)}">Practise again</button><a class="btn" href="#/atlas/errorlog">Open error log</a><a class="btn ghost" href="#/atlas/${esc(id)}">Back to ${esc(id)}</a></div></section>`;
  }
  const row = e.matrix[s.order[s.i]]; const pos = s.i + 1, total = s.order.length;
  const opts = s.picked ? null : s.options;
  return `<div class="run-head">${back}<span class="chip">Question ${pos} of ${total}</span></div>
  <div class="page-head"><div><h1>Decision Recall Drill</h1><p class="muted">${esc(e.id)} · ${esc(e.title)}</p></div></div>
  <div class="bar" role="progressbar" aria-label="Session progress" aria-valuemin="0" aria-valuemax="${total}" aria-valuenow="${s.i}"><i style="width:${Math.round(s.i / total * 100)}%"></i></div>
  <section class="card" style="margin-top:16px" aria-labelledby="atlas-req">
    <p class="small muted" style="margin:0">Requirement</p>
    <h2 id="atlas-req" tabindex="-1" style="margin:4px 0 12px">${esc(row.requirement)}</h2>
    ${!s.picked && opts ? `<div class="row" style="flex-direction:column;gap:8px" role="group" aria-label="Candidates">
        ${opts.map(c => `<button class="btn" style="justify-content:flex-start;text-align:left" data-action="atlas-practice-answer" data-id="${esc(id)}" data-candidate="${esc(c)}">${esc(c)}</button>`).join('')}
      </div>`
    : s.picked ? `<p><strong>You picked:</strong> ${esc(s.picked)} — ${s.picked === row.candidate ? 'correct.' : `the matrix's candidate was ${esc(row.candidate)}.`}</p>
      <div class="atlas-feedback" style="margin-top:8px">
        <p><strong>Why it fits:</strong> ${atlasLinkSources(row.whyFits)}</p>
        <p><strong>When not to choose it:</strong> ${atlasLinkSources(row.whenNot)}</p>
        <p><strong>Nearest alternative:</strong> ${esc(row.nearestAlt)}</p>
        <p><strong>What to verify:</strong> ${atlasLinkSources(row.verify)}</p>
        <p style="margin-top:6px">${atlasStatusChip(row.status)}</p>
      </div>
      <div class="row" style="margin-top:12px"><button class="btn primary" id="atlas-next" data-action="atlas-practice-next" data-id="${esc(id)}">${pos < total ? 'Next requirement' : 'See score'}</button></div>`
    : `<p class="small muted">This question could not be set up correctly. <a href="#/atlas/${esc(id)}">Go back</a> and start the drill again.</p>`}
  </section>`;
}

/* ---------- Six-Step Decision Method (shown on each Atlas entry's page) */
function atlasSixStepBox() {
  const steps = atlasRef().sixStepMethod || [];
  return `<section class="card" aria-labelledby="h-atlas-method"><h2 id="h-atlas-method">The Six-Step Decision Method</h2>
    <ol class="atlas-steps">${steps.map(s => `<li><strong>${esc(s.title)}.</strong> ${esc(s.what)}</li>`).join('')}</ol>
    <p class="small muted" style="margin-top:8px">${esc(atlasRef().managedServicesPrinciple || '')}</p></section>`;
}

/* ---------- Conflict & Correction */
function atlasConflictsView() {
  const ref = atlasRef(); const conflicts = ref.conflicts || []; const issues = ref.mandatoryReviewIssues || []; const missing = atlasMissingSources();
  return `<div class="run-head"><a class="btn sm ghost" href="#/atlas">← Atlas</a></div>
  <div class="page-head"><div><h1>Conflict &amp; Correction</h1><p class="muted">Certification material is sometimes contradictory, and sometimes this edition's own transcription is incomplete. These are the Field Reference's documented conflicts (K01–K05) plus this release's own open items, so disagreements are tracked rather than silently resolved.</p></div></div>
  <section class="card" aria-labelledby="h-atlas-k"><h2 id="h-atlas-k">T-I-7 Documented conflicts K01–K05</h2>
    <div class="atlas-table-wrap"><table class="atlas-table"><thead><tr><th scope="col">ID</th><th scope="col">Topic</th><th scope="col">Conflict</th><th scope="col">How this edition handles it</th><th scope="col">Sources</th></tr></thead>
    <tbody>${conflicts.map(c => `<tr><td><strong>${esc(c.id)}</strong></td><td>${esc(c.topic)}</td><td>${esc(c.conflict)}</td><td>${esc(c.handling)}</td><td>${c.sources.map(s => `<a class="chip sm atlas-src-link" href="#/atlas/source/${esc(s)}">[${esc(s)}]</a>`).join(' ')}</td></tr>`).join('')}</tbody></table></div></section>
  <section class="card" style="margin-top:16px" aria-labelledby="h-atlas-mi"><h2 id="h-atlas-mi">Mandatory review issues and where they are resolved</h2>
    <p class="small muted">Twelve issues were flagged for independent verification before this revision. Each maps to audit-register rows and the module or Atlas entry that resolves it.</p>
    <div class="atlas-table-wrap" style="margin-top:8px"><table class="atlas-table"><thead><tr><th scope="col">#</th><th scope="col">Issue</th><th scope="col">Audit rows</th><th scope="col">Resolved in</th></tr></thead>
    <tbody>${issues.map(i => `<tr><td>${i.num}</td><td>${esc(i.issue)}</td><td class="small">${esc(i.auditRows)}</td><td class="small">${esc(i.resolvedIn)}</td></tr>`).join('')}</tbody></table></div></section>
  <section class="card" style="margin-top:16px" aria-labelledby="h-atlas-missing"><h2 id="h-atlas-missing">Source register gaps (this release)</h2>
    ${missing.length ? `<p class="small">${missing.length} source ID${missing.length === 1 ? ' is' : 's are'} cited in the Atlas but have no entry in the transcribed register, so their detail pages read "Source details unavailable" rather than showing invented information: ${missing.map(esc).join(', ')}.</p>`
    : `<p class="small muted">Every source ID cited in the Atlas currently resolves to a register entry.</p>`}</section>`;
}

/* ---------- Source register */
function atlasSourceView(id) {
  const reg = atlasSources(); const src = reg.sources && reg.sources[id];
  const back = '<a class="btn sm ghost" href="#/atlas">← Atlas</a>';
  if (!src) return `<div class="run-head">${back}</div><div class="page-head"><div><h1>${esc(id)}</h1></div></div>
    <section class="card"><p><strong>Source details unavailable.</strong> This ID is cited somewhere in the Atlas, but this release's transcription of the Field Reference's Source register does not include an entry for it. Nothing is substituted or invented here; treat this citation as unresolved until the register is extended to cover it.</p></section>`;
  const tierLabel = (reg.legend && reg.legend[String(src.tier)]) || `Tier ${src.tier}`;
  const safeUrl = /^https?:\/\//i.test(src.url || '') ? src.url : null;
  return `<div class="run-head">${back}</div><div class="page-head"><div><h1>${esc(id)}</h1></div></div>
  <section class="card"><dl class="atlas-dl">
    <dt>Title</dt><dd>${esc(src.title)}</dd>
    <dt>Tier</dt><dd>${esc(String(src.tier))} — ${esc(tierLabel)}</dd>
    <dt>URL</dt><dd>${safeUrl ? `<a href="${esc(safeUrl)}" target="_blank" rel="noopener noreferrer nofollow">${esc(safeUrl)}</a>` : '<span class="muted">No safe http(s) URL on record.</span>'}</dd>
    <dt>Retrieved</dt><dd>${esc(src.retrieved || '—')}</dd>
    ${src.note ? `<dt>Note</dt><dd>${esc(src.note)}</dd>` : ''}
  </dl>
  <p class="small muted" style="margin-top:10px">This is a citation record, not a verification record: it says where the claim comes from, not that the claim has been independently checked. See each matrix row's status chip for that.</p></section>`;
}

/* ---------- Error log */
function atlasErrorLogAdd() {
  const q = $('#el-q'), wm = $('#el-wm'), cr = $('#el-cr'), ev = $('#el-ev'), tt = $('#el-tt');
  if (!q || !wm || !cr) return;
  const wrongModel = wm.value.trim(), correctedRule = cr.value.trim();
  if (!wrongModel || !correctedRule) { showStatus('Enter at least the wrong mental model and the corrected rule.'); return; }
  const d = atlasData(); const now = Date.now();
  const id = 'el-' + now.toString(36) + Math.random().toString(36).slice(2, 6);
  d.errorlog.entries.unshift({
    id, date: new Date(now).toISOString().slice(0, 10),
    questionId: atlasSafeStr(q.value.trim(), 60), wrongModel: atlasSafeStr(wrongModel, 2000), correctedRule: atlasSafeStr(correctedRule, 2000),
    evidence: atlasSafeStr(ev ? ev.value.trim() : '', 300), transferTest: atlasSafeStr(tt ? tt.value.trim() : '', 2000), retested: '', updated: now,
  });
  delete d.errorlog.deleted[id]; // a freshly created entry can't be shadowed by a stale tombstone of the same id
  d.updated = now; markDirty(); persistSoon(SAVE_QUICK);
  [q, wm, cr, ev, tt].forEach(el => { if (el) el.value = ''; });
  render(); showStatus('Logged.');
}
function atlasErrorLogDelete(id) {
  if (!atlasSafeId(id)) return;
  const d = atlasData(); const now = Date.now();
  d.errorlog.entries = d.errorlog.entries.filter(e => e.id !== id);
  d.errorlog.deleted[id] = now; // tombstone: an older import of this entry must not resurrect it
  d.updated = now; markDirty(); persistSoon(SAVE_QUICK); render();
}
function atlasErrorLogView() {
  const d = atlasData(); const entries = d.errorlog.entries; const tmpl = atlasRef().errorLogTemplate || {};
  return `<div class="run-head"><a class="btn sm ghost" href="#/atlas">← Atlas</a></div>
  <div class="page-head"><div><h1>Error log</h1><p class="muted">${esc(tmpl.note || 'Record every miss. The transfer test is the important column: a new situation that would expose the same wrong model.')}</p></div></div>
  <section class="card" aria-labelledby="h-el-worked"><h2 id="h-el-worked">Worked example from the Field Reference</h2>
    ${tmpl.workedExample ? `<dl class="atlas-dl">
      <dt>Question</dt><dd>${esc(tmpl.workedExample.question)}</dd>
      <dt>Wrong mental model</dt><dd>${esc(tmpl.workedExample.wrongMentalModel)}</dd>
      <dt>Corrected rule</dt><dd>${esc(tmpl.workedExample.correctedRule)}</dd>
      <dt>Evidence</dt><dd>${atlasLinkSources(tmpl.workedExample.evidence)}</dd>
      <dt>Transfer test</dt><dd>${esc(tmpl.workedExample.transferTest)}</dd>
    </dl>` : ''}</section>
  <section class="card" style="margin-top:16px" aria-labelledby="h-el-rubric"><h2 id="h-el-rubric">Readiness rubric</h2>
    ${atlasRef().readinessRubric ? `<p class="small muted">${esc(atlasRef().readinessRubric.caution || '')}</p>
    <div class="atlas-table-wrap" style="margin-top:8px"><table class="atlas-table"><thead><tr><th scope="col">Dimension</th><th scope="col">What demonstrating it means</th><th scope="col">Acceptable evidence</th></tr></thead>
    <tbody>${(atlasRef().readinessRubric.dimensions || []).map(dm => `<tr><td><strong>${esc(dm.dimension)}</strong></td><td>${esc(dm.meaning)}</td><td>${esc(dm.evidence)}</td></tr>`).join('')}</tbody></table></div>` : ''}</section>
  <section class="card" style="margin-top:16px" aria-labelledby="h-el-add"><h2 id="h-el-add">Log a miss</h2>
    <div class="grid g-2" style="margin-top:8px">
      <label class="field"><span>Question / situation ID</span><input id="el-q" type="text" maxlength="60" placeholder="e.g. Q-ACE-04"></label>
      <label class="field"><span>Evidence (source ID or test)</span><input id="el-ev" type="text" maxlength="300" placeholder="e.g. [S099] [S100]"></label>
      <label class="field" style="grid-column:1/-1"><span>Wrong mental model (what I believed)</span><textarea id="el-wm" rows="2" maxlength="2000"></textarea></label>
      <label class="field" style="grid-column:1/-1"><span>Corrected rule</span><textarea id="el-cr" rows="2" maxlength="2000"></textarea></label>
      <label class="field" style="grid-column:1/-1"><span>Transfer test (a new case that would expose the same error)</span><textarea id="el-tt" rows="2" maxlength="2000"></textarea></label>
    </div>
    <div class="row" style="margin-top:12px"><button class="btn primary" data-action="atlas-errorlog-add">Add to log</button></div></section>
  <section class="card" style="margin-top:16px" aria-labelledby="h-el-list"><h2 id="h-el-list">Your log (${entries.length})</h2>
    ${entries.length ? entries.map(e => `<div class="atlas-el-row">
        <div class="row" style="justify-content:space-between;align-items:flex-start"><strong>${esc(e.questionId || 'Untitled')}</strong><span class="small muted">${esc(e.date)}</span></div>
        <p class="small"><strong>Wrong model:</strong> ${esc(e.wrongModel)}</p>
        <p class="small"><strong>Corrected rule:</strong> ${esc(e.correctedRule)}</p>
        ${e.evidence ? `<p class="small muted">Evidence: ${atlasLinkSources(e.evidence)}</p>` : ''}
        ${e.transferTest ? `<p class="small"><strong>Transfer test:</strong> ${esc(e.transferTest)}</p>` : ''}
        <div class="row" style="margin-top:6px"><button class="btn sm ghost" data-action="atlas-errorlog-delete" data-id="${esc(e.id)}">Remove</button></div>
      </div>`).join('') : emptyState('No misses logged yet', 'When you get a Decision Recall Drill or exam question wrong, log it here with the corrected rule and a transfer test.')}
  </section>`;
}

registerFeature({
  id: 'atlas',
  css: `.atlas-table-wrap{overflow-x:auto;margin-top:8px}.atlas-table{width:100%;border-collapse:collapse;min-width:820px}
.atlas-table th,.atlas-table td{text-align:left;padding:8px 10px;border-bottom:1px solid var(--color-divider);vertical-align:top;font-size:.92rem}
.atlas-table thead th{background:var(--color-surface-2,var(--color-surface));position:sticky;top:0}
.atlas-chip{font-weight:600;letter-spacing:.02em;white-space:nowrap}
.atlas-sig-verified{background:var(--color-success-bg);color:var(--color-text)}
.atlas-sig-linked{background:var(--color-surface-2);color:var(--color-text);border:1px solid var(--color-border)}
.atlas-sig-review{background:var(--color-warning-bg);color:var(--color-text);border:1px solid var(--color-warning,#9a6b00)}
.atlas-sig-unverified{background:transparent;color:var(--color-text-muted);border:1px dashed var(--color-border)}
.atlas-card{display:block;text-decoration:none;color:inherit}
.atlas-steps{margin:8px 0 0;padding-left:20px;display:grid;gap:6px}
.atlas-feedback p{margin:4px 0}
.atlas-dl{display:grid;grid-template-columns:max-content 1fr;gap:4px 12px;margin:8px 0 0}
.atlas-dl dt{font-weight:600;color:var(--color-text-muted)}.atlas-dl dd{margin:0;word-break:break-word}
.atlas-el-row{padding:10px 0;border-bottom:1px solid var(--color-divider)}
.atlas-src-link{text-decoration:underline}
.field{display:flex;flex-direction:column;gap:4px;font-size:.9rem}.field input,.field textarea{font:inherit;padding:8px;border:1px solid var(--color-border);border-radius:8px;background:var(--color-surface);color:inherit}`,
  views: {
    atlas: arg => {
      if (!arg) return atlasListView();
      if (arg === 'conflicts') return atlasConflictsView();
      if (arg === 'errorlog') return atlasErrorLogView();
      if (arg.startsWith('source/')) return atlasSourceView(arg.slice(7));
      const [id, mode] = arg.split('/');
      if (mode === 'practice') return atlasPracticeView(id);
      return atlasDetailView(id) + (atlasEntry(id) ? atlasSixStepBox() : '');
    },
  },
  nav: [{ route: 'atlas', label: 'Decision Atlas', group: 'Certify', after: 'flashcards', icon: '<path d="M4 5h16v4H4zM4 11h7v8H4zM13 11h7v8h-7z"/>' }],
  actions: {
    'atlas-practice-start': (data) => { atlasBuildSession(data.id); go('atlas', data.id + '/practice'); },
    'atlas-practice-answer': (data) => { atlasAnswer(data.id, data.candidate); render(); $('#atlas-next')?.focus(); },
    'atlas-practice-next': (data) => { atlasNext(data.id); render(); ($('#atlas-req') || $('#h-atlas-done') || $('main h1'))?.focus(); },
    'atlas-errorlog-add': () => atlasErrorLogAdd(),
    'atlas-errorlog-delete': (data) => atlasErrorLogDelete(data.id),
  },
  mergeImport(w) {
    const x = w && w.atlas; if (!x || typeof x !== 'object') return;
    const d = atlasData(); const now = Date.now();

    /* Practice records: merge by entry id with a per-record timestamp. Newer `updated` wins; counters
     * are replaced, never summed, so re-importing the same file twice can't inflate them. */
    if (x.practice && typeof x.practice === 'object') {
      for (const [id, rec] of Object.entries(x.practice)) {
        if (!atlasSafeId(id) || !rec || typeof rec !== 'object') continue;
        const seen = atlasSafeNum(rec.seen, 0, 1e6), correct = atlasSafeNum(rec.correct, 0, 1e6);
        const completions = atlasSafeNum(rec.completions, 0, 1e6), lastScore = atlasSafeNum(rec.lastScore, 0, 100);
        const updated = atlasSafeNum(rec.updated, 0, now + 86400000); // legacy records with no/garbled timestamp are not trusted to overwrite anything
        if (seen == null || correct == null || correct > seen || completions == null || lastScore == null || updated == null) continue;
        const cur = d.practice[id];
        if (!cur || updated > (cur.updated || 0)) d.practice[id] = { seen, correct, completions, lastScore, updated };
      }
    }

    /* Error log: merge entries by id and per-entry `updated` (newer wins; an exact tie keeps the local
     * copy, so importing the same export repeatedly is a no-op). Tombstones (deletions) are merged by
     * the latest deletedAt, and suppress any incoming entry whose own `updated` is not newer than the
     * tombstone, so an older import can't resurrect something deleted locally after that export was made. */
    if (x.errorlog && typeof x.errorlog === 'object') {
      const incomingDeleted = x.errorlog.deleted && typeof x.errorlog.deleted === 'object' ? x.errorlog.deleted : {};
      for (const [id, at] of Object.entries(incomingDeleted)) {
        if (!atlasSafeId(id)) continue; const atNum = atlasSafeNum(at, 0, now + 86400000); if (atNum == null) continue;
        d.errorlog.deleted[id] = Math.max(d.errorlog.deleted[id] || 0, atNum);
      }
      const byId = new Map(d.errorlog.entries.map(e => [e.id, e]));
      for (const e of Array.isArray(x.errorlog.entries) ? x.errorlog.entries : []) {
        if (!e || typeof e !== 'object' || !atlasSafeId(e.id)) continue;
        const updated = atlasSafeNum(e.updated, 0, now + 86400000); if (updated == null) continue;
        const tomb = d.errorlog.deleted[e.id];
        if (tomb != null && tomb >= updated) continue; // deleted locally at or after this import's version: stays deleted
        const cur = byId.get(e.id);
        if (cur && (cur.updated || 0) >= updated) continue; // local copy is same age or newer
        byId.set(e.id, {
          id: e.id, date: atlasSafeStr(e.date, 10) || new Date(updated).toISOString().slice(0, 10),
          questionId: atlasSafeStr(e.questionId, 60), wrongModel: atlasSafeStr(e.wrongModel, 2000), correctedRule: atlasSafeStr(e.correctedRule, 2000),
          evidence: atlasSafeStr(e.evidence, 300), transferTest: atlasSafeStr(e.transferTest, 2000), retested: atlasSafeStr(e.retested, 300), updated,
        });
      }
      d.errorlog.entries = [...byId.values()].filter(e => { const t = d.errorlog.deleted[e.id]; return t == null || t < e.updated; }).sort((a, b) => (b.updated || 0) - (a.updated || 0));
    }
    d.updated = Math.max(d.updated || 0, atlasSafeNum(x.updated, 0, now + 86400000) || 0); AT.session = null;
  },
});
