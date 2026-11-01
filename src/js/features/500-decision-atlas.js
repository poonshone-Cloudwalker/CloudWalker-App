/* ================================================================== V10: Decision Atlas, Conflicts & Correction, Error Log
 * Source: GCP_Field_Reference_Rev2.pdf, Part III (Decision and professional-practice atlas, X01-X12) and
 * Part IV (Assessment, review and maintenance). Content lives as structured data in
 * content/atlas/atlas-matrices.json (the 12 six-column decision matrices) and content/atlas/atlas-reference.json
 * (K01-K05 documented conflicts, the mandatory-review-issues register, the Six-Step Decision Method, the
 * error-log template, readiness rubric and portfolio guidance) so the UI can drive quizzes and lookups from
 * it rather than from hand-written prose. This feature does not copy the source text anywhere except these
 * two JSON files; everything else is rendering and interaction.
 *
 * "Signals" design language (matches the source's own philosophy): a status is always a short text label,
 * never colour alone. atlasSignal() below returns {cls, label} pairs used throughout this feature.
 *
 * Saved data (S.ws.atlas): {
 *   practice: { <entryId>: { seen, correct, lastScore } },
 *   errorlog: { entries: [ { id, date, questionId, wrongModel, correctedRule, evidence, transferTest, retested, updated } ] },
 *   updated
 * }
 * The practice quiz session itself (current question order, position) is screen state, not saved. */

function atlasData() {
  const d = (S.ws.atlas ||= { practice: {}, errorlog: { entries: [] }, updated: 0 });
  if (!d.practice || typeof d.practice !== 'object') d.practice = {};
  if (!d.errorlog || typeof d.errorlog !== 'object' || !Array.isArray(d.errorlog.entries)) d.errorlog = { entries: [] };
  return d;
}
const atlasEntry = id => (typeof ATLAS_MATRICES !== 'undefined' ? ATLAS_MATRICES : []).find(e => e.id === id);
const atlasAll = () => (typeof ATLAS_MATRICES !== 'undefined' ? ATLAS_MATRICES : []);
const atlasRef = () => (typeof ATLAS_REFERENCE !== 'undefined' ? ATLAS_REFERENCE : {});

/* A status is always rendered as an icon-free text chip so meaning never depends on colour alone. */
function atlasSignal(kind) {
  const M = {
    verified: { cls: 'atlas-sig-verified', label: 'Verified — cited to a source' },
    verify: { cls: 'atlas-sig-verify', label: 'VERIFY — change-sensitive or not doc-verified in this pass' },
    gap: { cls: 'atlas-sig-gap', label: 'GAP — not covered in depth here' },
  };
  return M[kind] || M.verified;
}
function atlasChip(kind) { const s = atlasSignal(kind); return `<span class="chip atlas-chip ${s.cls}" title="${esc(s.label)}">${kind === 'verify' ? 'VERIFY' : kind === 'gap' ? 'GAP' : 'Verified'}</span>`; }
const atlasIsVerify = row => /verify current|not doc-verified|change-sensitive/i.test(`${row.candidate} ${row.verify || ''}`);

let AT = { session: null };

/* ---------- Practice (Architect mode) */
function atlasShuffle(arr) { const a = arr.slice(); for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1));[a[i], a[j]] = [a[j], a[i]]; } return a; }
function atlasBuildSession(id) {
  const e = atlasEntry(id); if (!e) return null;
  const order = atlasShuffle(e.matrix.map((_, i) => i));
  AT.session = { id, order, i: 0, picked: null, correct: 0, total: 0 };
  return AT.session;
}
function atlasOptionsFor(e, rowIdx) {
  const correct = e.matrix[rowIdx].candidate;
  const others = [...new Set(e.matrix.map(r => r.candidate).filter(c => c !== correct))];
  const distractors = atlasShuffle(others).slice(0, 3);
  return atlasShuffle([correct, ...distractors]);
}
function atlasAnswer(id, choice) {
  const s = AT.session; if (!s || s.id !== id || s.picked) return;
  const e = atlasEntry(id); const row = e.matrix[s.order[s.i]];
  s.picked = choice; s.total++; if (choice === row.candidate) s.correct++;
  const d = atlasData(); const rec = (d.practice[id] ||= { seen: 0, correct: 0, lastScore: 0 });
  rec.seen++; if (choice === row.candidate) rec.correct++;
  d.updated = Date.now(); markDirty(); persistSoon(SAVE_QUICK);
}
function atlasNext(id) {
  const s = AT.session; if (!s || s.id !== id) return;
  s.i++; s.picked = null;
  if (s.i >= s.order.length) {
    const d = atlasData(); const rec = (d.practice[id] ||= { seen: 0, correct: 0, lastScore: 0 });
    rec.lastScore = s.total ? Math.round(s.correct / s.total * 100) : 0; d.updated = Date.now(); markDirty(); persistSoon(SAVE_QUICK);
  }
}

/* ---------- Views */
function atlasListView() {
  const d = atlasData();
  const cards = atlasAll().map(e => {
    const rec = d.practice[e.id];
    return `<a class="card atlas-card" href="#/atlas/${e.id}">
      <div class="row" style="justify-content:space-between;align-items:flex-start">
        <h3 style="margin:0">${esc(e.id)} · ${esc(e.title)}</h3>
        ${rec ? `<span class="chip" title="Best Architect-mode score">${rec.lastScore}%</span>` : ''}
      </div>
      <p class="small muted" style="margin:6px 0 0">${esc(e.relevantTo.join(', '))}</p>
      <p class="small" style="margin:6px 0 0">${esc(e.intro.slice(0, 140))}${e.intro.length > 140 ? '…' : ''}</p>
    </a>`;
  }).join('');
  return `<div class="page-head"><div><h1>Decision Atlas</h1><p class="muted">Twelve cross-certification decision matrices from the Field Reference. Each gives a candidate for a requirement, why it fits, when not to choose it, the nearest alternative, and what to verify before you commit. Use Architect mode to practise picking the right candidate before reading the answer.</p></div></div>
  <section class="card" aria-labelledby="h-atlas-signals"><h2 id="h-atlas-signals">Signals used on this page</h2>
    <p class="small muted">Every status is a text label, never colour alone.</p>
    <div class="row" style="gap:8px;flex-wrap:wrap;margin-top:8px">${atlasChip('verified')}${atlasChip('verify')}${atlasChip('gap')}</div></section>
  <section class="card" style="margin-top:16px" aria-labelledby="h-atlas-tools"><h2 id="h-atlas-tools">Related tools</h2>
    <div class="grid g-2" style="margin-top:8px">
      <a class="card" href="#/atlas/conflicts"><h3 style="margin:0">Conflict &amp; Correction (K01–K05)</h3><p class="small muted" style="margin:6px 0 0">Documented disagreements between official sources, and how this edition handles each one.</p></a>
      <a class="card" href="#/atlas/errorlog"><h3 style="margin:0">Error log</h3><p class="small muted" style="margin:6px 0 0">Log a wrong mental model, its corrected rule, and a transfer test that would expose the same error again.</p></a>
    </div></section>
  <section class="card" style="margin-top:16px" aria-labelledby="h-atlas-grid"><h2 id="h-atlas-grid">The twelve entries</h2>
    <div class="grid g-2" style="margin-top:8px">${cards}</div></section>`;
}
function atlasMatrixTable(e) {
  return `<div class="atlas-table-wrap"><table class="atlas-table"><caption class="sr-only">${esc(e.id)} decision matrix</caption>
    <thead><tr><th scope="col">Requirement</th><th scope="col">Candidate</th><th scope="col">Why it fits</th><th scope="col">When not to choose it</th><th scope="col">Nearest alternative</th><th scope="col">What to verify</th></tr></thead>
    <tbody>${e.matrix.map(r => `<tr>
      <td>${esc(r.requirement)}</td>
      <td><strong>${esc(r.candidate)}</strong>${atlasIsVerify(r) ? ' ' + atlasChip('verify') : ''}</td>
      <td>${esc(r.whyFits)}</td>
      <td>${esc(r.whenNot)}</td>
      <td>${esc(r.nearestAlt)}</td>
      <td>${esc(r.verify)}</td>
    </tr>`).join('')}</tbody></table></div>`;
}
function atlasExtraTables(e) {
  if (!e.tables) return '';
  return e.tables.map(t => `<div class="atlas-table-wrap" style="margin-top:12px"><p class="small" style="font-weight:600;margin-bottom:4px">${esc(t.title)}</p>
    <table class="atlas-table"><thead><tr>${t.columns.map(c => `<th scope="col">${esc(c)}</th>`).join('')}</tr></thead>
    <tbody>${t.rows.map(row => `<tr>${row.map(c => `<td>${esc(c)}</td>`).join('')}</tr>`).join('')}</tbody></table>
    ${t.note ? `<p class="small muted" style="margin-top:6px">${esc(t.note)}</p>` : ''}</div>`).join('');
}
function atlasDetailView(id) {
  const e = atlasEntry(id); const back = '<a class="btn sm ghost" href="#/atlas">← Atlas</a>';
  if (!e) return `<div class="run-head">${back}</div>${emptyState('Atlas entry not found', 'That entry does not exist.', '<a class="btn primary" href="#/atlas">Back to the Atlas</a>')}`;
  const d = atlasData(); const rec = d.practice[id];
  return `<div class="run-head">${back}</div>
  <div class="page-head"><div><h1>${esc(e.id)} · ${esc(e.title)}</h1><p class="muted">Relevant to: ${esc(e.relevantTo.join(', '))}</p></div></div>
  <section class="card" aria-labelledby="h-atlas-intro"><h2 id="h-atlas-intro">How to decide</h2><p>${esc(e.intro)}</p>
    <div class="row" style="margin-top:12px">
      <button class="btn primary" data-action="atlas-practice-start" data-id="${esc(e.id)}">Start Architect mode${rec ? ` (last score ${rec.lastScore}%)` : ''}</button>
    </div></section>
  <section class="card" style="margin-top:16px" aria-labelledby="h-atlas-matrix"><h2 id="h-atlas-matrix">T-${esc(e.id)} Decision matrix</h2>${atlasMatrixTable(e)}${atlasExtraTables(e)}</section>
  <section class="card" style="margin-top:16px" aria-labelledby="h-atlas-fail"><h2 id="h-atlas-fail">Failure modes</h2><ul>${e.failureModes.map(f => `<li>${esc(f)}</li>`).join('')}</ul></section>
  <section class="card" style="margin-top:16px" aria-labelledby="h-atlas-verify"><h2 id="h-atlas-verify">Verification steps</h2><ul>${e.verificationSteps.map(v => `<li>${esc(v)}</li>`).join('')}</ul>
    <p class="small muted" style="margin-top:8px">Sources: ${e.sources.map(s => `<span class="chip sm">[${esc(s)}]</span>`).join(' ')}</p></section>`;
}
function atlasPracticeView(id) {
  const e = atlasEntry(id); const back = `<a class="btn sm ghost" href="#/atlas/${esc(id)}">← ${esc(id)}</a>`;
  if (!e) return `<div class="run-head">${back}</div>${emptyState('Atlas entry not found', 'That entry does not exist.')}`;
  const s = AT.session && AT.session.id === id ? AT.session : atlasBuildSession(id);
  if (s.i >= s.order.length) {
    const pct2 = s.total ? Math.round(s.correct / s.total * 100) : 0;
    return `<div class="run-head">${back}</div><div class="page-head"><div><h1>Architect mode — complete</h1></div></div>
    <section class="card" aria-labelledby="h-atlas-done"><h2 id="h-atlas-done" tabindex="-1">Score: ${s.correct} of ${s.total} (${pct2}%)</h2>
    <p class="small muted">A wrong pick here is worth logging: open the Error log and record what you believed versus the corrected rule, plus a transfer test.</p>
    <div class="row" style="margin-top:12px"><button class="btn primary" data-action="atlas-practice-start" data-id="${esc(id)}">Practise again</button><a class="btn" href="#/atlas/errorlog">Open error log</a><a class="btn ghost" href="#/atlas/${esc(id)}">Back to ${esc(id)}</a></div></section>`;
  }
  const row = e.matrix[s.order[s.i]]; const pos = s.i + 1, total = s.order.length;
  const opts = s.picked ? null : atlasOptionsFor(e, s.order[s.i]);
  return `<div class="run-head">${back}<span class="chip">Question ${pos} of ${total}</span></div>
  <div class="page-head"><div><h1>Architect mode</h1><p class="muted">${esc(e.id)} · ${esc(e.title)}</p></div></div>
  <div class="bar" role="progressbar" aria-label="Session progress" aria-valuemin="0" aria-valuemax="${total}" aria-valuenow="${s.i}"><i style="width:${Math.round(s.i / total * 100)}%"></i></div>
  <section class="card" style="margin-top:16px" aria-labelledby="atlas-req">
    <p class="small muted" style="margin:0">Requirement</p>
    <h2 id="atlas-req" tabindex="-1" style="margin:4px 0 12px">${esc(row.requirement)}</h2>
    ${!s.picked ? `<div class="row" style="flex-direction:column;gap:8px" role="group" aria-label="Candidates">
        ${opts.map(c => `<button class="btn" style="justify-content:flex-start;text-align:left" data-action="atlas-practice-answer" data-id="${esc(id)}" data-candidate="${esc(c)}">${esc(c)}</button>`).join('')}
      </div>`
    : `<p><strong>You picked:</strong> ${esc(s.picked)} — ${s.picked === row.candidate ? 'correct.' : `the matrix's candidate was ${esc(row.candidate)}.`}</p>
      <div class="atlas-feedback" style="margin-top:8px">
        <p><strong>Why it fits:</strong> ${esc(row.whyFits)}</p>
        <p><strong>When not to choose it:</strong> ${esc(row.whenNot)}</p>
        <p><strong>Nearest alternative:</strong> ${esc(row.nearestAlt)}</p>
        <p><strong>What to verify:</strong> ${esc(row.verify)}</p>
      </div>
      <div class="row" style="margin-top:12px"><button class="btn primary" id="atlas-next" data-action="atlas-practice-next" data-id="${esc(id)}">${pos < total ? 'Next requirement' : 'See score'}</button></div>`}
  </section>`;
}

/* ---------- Six-Step Decision Method (shown on the Atlas list and inside each practice session's intro) */
function atlasSixStepBox() {
  const steps = atlasRef().sixStepMethod || [];
  return `<section class="card" aria-labelledby="h-atlas-method"><h2 id="h-atlas-method">The Six-Step Decision Method</h2>
    <ol class="atlas-steps">${steps.map(s => `<li><strong>${esc(s.title)}.</strong> ${esc(s.what)}</li>`).join('')}</ol>
    <p class="small muted" style="margin-top:8px">${esc(atlasRef().managedServicesPrinciple || '')}</p></section>`;
}

/* ---------- Conflict & Correction */
function atlasConflictsView() {
  const ref = atlasRef(); const conflicts = ref.conflicts || []; const issues = ref.mandatoryReviewIssues || [];
  return `<div class="run-head"><a class="btn sm ghost" href="#/atlas">← Atlas</a></div>
  <div class="page-head"><div><h1>Conflict &amp; Correction</h1><p class="muted">Certification material is sometimes contradictory. These are the Field Reference's own documented conflicts (K01–K05): what disagrees, and how this edition resolves or flags it, rather than silently picking one side.</p></div></div>
  <section class="card" aria-labelledby="h-atlas-k"><h2 id="h-atlas-k">T-I-7 Documented conflicts K01–K05</h2>
    <div class="atlas-table-wrap"><table class="atlas-table"><thead><tr><th scope="col">ID</th><th scope="col">Topic</th><th scope="col">Conflict</th><th scope="col">How this edition handles it</th><th scope="col">Sources</th></tr></thead>
    <tbody>${conflicts.map(c => `<tr><td><strong>${esc(c.id)}</strong></td><td>${esc(c.topic)}</td><td>${esc(c.conflict)}</td><td>${esc(c.handling)}</td><td>${c.sources.map(s => `<span class="chip sm">[${esc(s)}]</span>`).join(' ')}</td></tr>`).join('')}</tbody></table></div></section>
  <section class="card" style="margin-top:16px" aria-labelledby="h-atlas-mi"><h2 id="h-atlas-mi">Mandatory review issues and where they are resolved</h2>
    <p class="small muted">Twelve issues were flagged for independent verification before this revision. Each maps to audit-register rows and the module or Atlas entry that resolves it.</p>
    <div class="atlas-table-wrap" style="margin-top:8px"><table class="atlas-table"><thead><tr><th scope="col">#</th><th scope="col">Issue</th><th scope="col">Audit rows</th><th scope="col">Resolved in</th></tr></thead>
    <tbody>${issues.map(i => `<tr><td>${i.num}</td><td>${esc(i.issue)}</td><td class="small">${esc(i.auditRows)}</td><td class="small">${esc(i.resolvedIn)}</td></tr>`).join('')}</tbody></table></div></section>`;
}

/* ---------- Error log */
function atlasErrorLogAdd() {
  const q = $('#el-q'), wm = $('#el-wm'), cr = $('#el-cr'), ev = $('#el-ev'), tt = $('#el-tt');
  if (!q || !wm || !cr) return;
  if (!wm.value.trim() || !cr.value.trim()) { showStatus('Enter at least the wrong mental model and the corrected rule.'); return; }
  const d = atlasData(); const now = Date.now();
  d.errorlog.entries.unshift({
    id: 'el-' + now.toString(36) + Math.random().toString(36).slice(2, 6),
    date: new Date(now).toISOString().slice(0, 10),
    questionId: q.value.trim(), wrongModel: wm.value.trim(), correctedRule: cr.value.trim(),
    evidence: ev ? ev.value.trim() : '', transferTest: tt ? tt.value.trim() : '', retested: '', updated: now,
  });
  d.updated = now; markDirty(); persistSoon(SAVE_QUICK);
  [q, wm, cr, ev, tt].forEach(el => { if (el) el.value = ''; });
  render(); showStatus('Logged.');
}
function atlasErrorLogDelete(id) {
  const d = atlasData(); d.errorlog.entries = d.errorlog.entries.filter(e => e.id !== id); d.updated = Date.now();
  markDirty(); persistSoon(SAVE_QUICK); render();
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
      <dt>Evidence</dt><dd>${esc(tmpl.workedExample.evidence)}</dd>
      <dt>Transfer test</dt><dd>${esc(tmpl.workedExample.transferTest)}</dd>
    </dl>` : ''}</section>
  <section class="card" style="margin-top:16px" aria-labelledby="h-el-add"><h2 id="h-el-add">Log a miss</h2>
    <div class="grid g-2" style="margin-top:8px">
      <label class="field"><span>Question / situation ID</span><input id="el-q" type="text" placeholder="e.g. Q-ACE-04"></label>
      <label class="field"><span>Evidence (source ID or test)</span><input id="el-ev" type="text" placeholder="e.g. [S099] [S100]"></label>
      <label class="field" style="grid-column:1/-1"><span>Wrong mental model (what I believed)</span><textarea id="el-wm" rows="2"></textarea></label>
      <label class="field" style="grid-column:1/-1"><span>Corrected rule</span><textarea id="el-cr" rows="2"></textarea></label>
      <label class="field" style="grid-column:1/-1"><span>Transfer test (a new case that would expose the same error)</span><textarea id="el-tt" rows="2"></textarea></label>
    </div>
    <div class="row" style="margin-top:12px"><button class="btn primary" data-action="atlas-errorlog-add">Add to log</button></div></section>
  <section class="card" style="margin-top:16px" aria-labelledby="h-el-list"><h2 id="h-el-list">Your log (${entries.length})</h2>
    ${entries.length ? entries.map(e => `<div class="atlas-el-row">
        <div class="row" style="justify-content:space-between;align-items:flex-start"><strong>${esc(e.questionId || 'Untitled')}</strong><span class="small muted">${esc(e.date)}</span></div>
        <p class="small"><strong>Wrong model:</strong> ${esc(e.wrongModel)}</p>
        <p class="small"><strong>Corrected rule:</strong> ${esc(e.correctedRule)}</p>
        ${e.evidence ? `<p class="small muted">Evidence: ${esc(e.evidence)}</p>` : ''}
        ${e.transferTest ? `<p class="small"><strong>Transfer test:</strong> ${esc(e.transferTest)}</p>` : ''}
        <div class="row" style="margin-top:6px"><button class="btn sm ghost" data-action="atlas-errorlog-delete" data-id="${esc(e.id)}">Remove</button></div>
      </div>`).join('') : emptyState('No misses logged yet', 'When you get an Architect-mode or exam question wrong, log it here with the corrected rule and a transfer test.')}
  </section>`;
}

registerFeature({
  id: 'atlas',
  css: `.atlas-table-wrap{overflow-x:auto;margin-top:8px}.atlas-table{width:100%;border-collapse:collapse;min-width:720px}
.atlas-table th,.atlas-table td{text-align:left;padding:8px 10px;border-bottom:1px solid var(--color-divider);vertical-align:top;font-size:.92rem}
.atlas-table thead th{background:var(--color-surface-2,var(--color-surface));position:sticky;top:0}
.atlas-chip{font-weight:600;letter-spacing:.02em}
.atlas-sig-verified{background:var(--color-success-bg);color:var(--color-text)}
.atlas-sig-verify{background:var(--color-warning-bg);color:var(--color-text);border:1px solid var(--color-warning,#9a6b00)}
.atlas-sig-gap{background:var(--color-danger-bg,var(--color-warning-bg));color:var(--color-text);border:1px dashed var(--color-danger,#9a3030)}
.atlas-card{display:block;text-decoration:none;color:inherit}
.atlas-steps{margin:8px 0 0;padding-left:20px;display:grid;gap:6px}
.atlas-feedback p{margin:4px 0}
.atlas-dl{display:grid;grid-template-columns:max-content 1fr;gap:4px 12px;margin:8px 0 0}
.atlas-dl dt{font-weight:600;color:var(--color-text-muted)}.atlas-dl dd{margin:0}
.atlas-el-row{padding:10px 0;border-bottom:1px solid var(--color-divider)}
.field{display:flex;flex-direction:column;gap:4px;font-size:.9rem}.field input,.field textarea{font:inherit;padding:8px;border:1px solid var(--color-border);border-radius:8px;background:var(--color-surface);color:inherit}`,
  views: {
    atlas: arg => {
      if (!arg) return atlasListView();
      if (arg === 'conflicts') return atlasConflictsView();
      if (arg === 'errorlog') return atlasErrorLogView();
      const [id, mode] = arg.split('/');
      if (mode === 'practice') return atlasPracticeView(id);
      return atlasDetailView(id) + atlasSixStepBox();
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
    const x = w && w.atlas; if (!x || typeof x !== 'object') return; const d = atlasData();
    for (const [id, rec] of Object.entries(x.practice || {})) if (rec && typeof rec === 'object') {
      const cur = d.practice[id];
      if (!cur || (x.updated || 0) > (d.updated || 0)) d.practice[id] = rec;
    }
    if (x.errorlog && Array.isArray(x.errorlog.entries)) {
      const seen = new Set(d.errorlog.entries.map(e => e.id));
      for (const e of x.errorlog.entries) if (e && e.id && !seen.has(e.id)) d.errorlog.entries.push(e);
      d.errorlog.entries.sort((a, b) => (b.updated || 0) - (a.updated || 0));
    }
    d.updated = Math.max(d.updated || 0, x.updated || 0);
  },
});
