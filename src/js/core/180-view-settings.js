/* ------------------------------------------------------------------ View: Settings */
const FORMAT_DOC = `Question bank file (import)
{
  "format": "blueprint-question-bank",      // optional
  "questions": [                              // or a bare array of questions
    {
      "id": "gcp-pca-001",                    // required, permanent, unique
      "exam": "Google Cloud Professional Cloud Architect",   // required
      "exam_code": "PCA",                     // recommended (groups the track)
      "vendor": "Google Cloud",
      "domain": "1. Designing and Planning a Cloud Solution Architecture",  // required
      "domain_number": 1,                     // used for blueprint weighting
      "subdomain": "1.3 Designing for high availability and disaster recovery",
      "question_type": "scenario",            // scenario | concept
      "difficulty": "hard",                   // easy | medium | hard
      "services": ["Spanner", "Cloud Load Balancing"],
      "tags": ["high-availability"],
      "question": "Full question text",       // required
      "options": ["A...", "B...", "C...", "D..."],  // required, 2–6 strings
      "correct_index": 1,                     // required, 0-based
      "correct_rationale": "Why the correct answer is correct",
      "distractor_rationales": ["Why A is wrong", "", "Why C is wrong", "Why D is wrong"],
      "explanation": "Expanded teaching explanation",
      "blueprint_version": "2026-09", "last_reviewed": "2026-09-30",
      "prerequisites": [], "common_traps": [], "source_section": "Heading",
      "optionRationales": null, "docLinks": [{"title": "Official doc page", "url": "https://..."}],
      "examGuideVersion": null, "lastReviewed": null, "reviewStatus": "needs-review",
      "origin": "user-imported", "qtype": "single", "selectCount": null, "caseStudyId": null
    }
  ],
  "exams": [ { "code": "PCA", "name": "...", "vendor": "...",
               "domain_weights": { "1": 24, "2": 15 } } ]   // optional
}
Rules: items with missing required fields, bad options, or an out-of-range
correct_index are rejected and listed. Items whose id already exists replace
the existing question (merge by id); ids are never renumbered.

Progress file (export/import)
{
  "format": "blueprint-progress", "version": 1, "exported_at": "ISO date",
  "answers":    { "<question id>": [ { "t": epoch_ms, "choice": 0, "correct": true,
                                        "mode": "learn|exam|review|drill|mastery|single", "ms": 5400 } ] },
  "flags":      ["<question id>", ...],
  "confidence": { "<question id>": "high|medium|low" },
  "sessions":   [ { "mode", "title", "exam", "started", "ended", "total",
                    "answered", "correct", "byDomain", "ids", "responses" } ],
  "stats":      { per-exam and per-mode summaries, informational only }
}
Import merges answers by question id and timestamp, so importing the same
file twice does not double-count. Ids not in the current bank are kept in the
file but reported as unknown.`;
VIEWS.settings = () => {
  const m = S.ui.settingsMsg;
  return `
  <div class="page-head"><div><h1>Settings and data</h1><p class="muted">${persistOK() ? 'Your work saves automatically on this device. A workspace file is your backup and the way to move to another device; restoring it brings back quiz history, your review schedule, and every artifact.' : 'This browser is blocking storage, so your work lives only in this tab. Save your workspace before you close or reload; restoring it brings back quiz history, your review schedule, and every artifact.'}</p></div></div>
  ${m ? `<div class="notice ${m.ok ? 'ok' : 'err'}" role="status" style="margin-bottom:16px"><strong>${esc(m.title)}</strong>${m.body ? `<p>${esc(m.body)}</p>` : ''}${m.list?.length ? `<ul>${m.list.slice(0, 100).map(x => `<li>${esc(x)}</li>`).join('')}</ul>${m.list.length > 100 ? `<p class="small">…and ${m.list.length - 100} more.</p>` : ''}` : ''}</div>` : ''}
  ${workspacePanel()}
  <div class="grid g-2">
    <section class="card" aria-labelledby="h-prog"><h2 id="h-prog">Quiz progress only</h2>
      <p class="muted small" style="margin-bottom:14px">${totals().att} answers, ${S.progress.flags.size} flags, ${Object.keys(S.progress.confidence).length} confidence ratings, and ${S.progress.sessions.length} sessions.</p>
      <div class="row"><button class="btn primary" data-action="export-progress">Export progress</button><button class="btn" data-action="import-progress">Import progress</button></div>
    </section>
    <section class="card" aria-labelledby="h-bank"><h2 id="h-bank">Question bank</h2>
      <p class="muted small" style="margin-bottom:14px">${S.bank.size} questions loaded across ${activeExams().length} certifications. Import a JSON bank to add or update questions by ID.</p>
      <div class="row"><button class="btn" data-action="import-bank">Import question bank</button><button class="btn" data-action="export-bank">Export question bank</button></div>
    </section>
    <section class="card" aria-labelledby="h-app"><h2 id="h-app">Appearance</h2>
      <div class="row"><span class="muted small">Theme</span><div class="seg-control" role="group" aria-label="Theme">${['light', 'dark'].map(t => `<button type="button" data-action="set-theme" data-v="${t}" aria-pressed="${S.ui.theme === t}">${t[0].toUpperCase() + t.slice(1)}</button>`).join('')}</div></div>
    </section>
    <section class="card" aria-labelledby="h-reset"><h2 id="h-reset">Reset</h2>
      <p class="muted small" style="margin-bottom:14px">Each reset takes an in-memory backup first. The question bank stays loaded.</p>
      <div class="stack">${resetBlock('quiz')}${resetBlock('all')}</div>
    </section>
  </div>
  <section class="card" style="margin-top:20px" aria-labelledby="h-validate"><h2 id="h-validate">Bank validation</h2>
    <p class="small muted" style="margin-bottom:12px">Counts after parsing the embedded reserve${S.bootDropped ? `; ${S.bootDropped} malformed items were dropped` : '; no items were dropped'}. ${(() => { const prov = activeExams().filter(e => examQs(e.code).every(q => q.difficulty_source === 'provided')).map(e => e.code); const inf = activeExams().filter(e => !prov.includes(e.code)).map(e => e.code); return (prov.length ? `${prov.join(', ')} difficulty is author-assigned. ` : '') + (inf.length ? `${inf.join(', ')} difficulty is inferred from exam tier and question type.` : ''); })()}</p>
    <div style="overflow-x:auto"><table><thead><tr><th scope="col">Certification</th><th scope="col">Domain</th><th scope="col" class="num">Questions</th><th scope="col" class="num">Easy</th><th scope="col" class="num">Medium</th><th scope="col" class="num">Hard</th></tr></thead><tbody>
    ${activeExams().flatMap(e => domainsOf(e.code).map((d, i) => { const qs = examQs(e.code).filter(q => q.domain === d); return `<tr><td>${i ? '' : `<strong>${esc(e.code)}</strong>`}</td><td>${esc(d)}</td><td class="num">${qs.length}</td>${DIFFS.map(x => `<td class="num">${qs.filter(q => q.difficulty === x).length}</td>`).join('')}</tr>`; })).join('')}
    <tr><td><strong>Total</strong></td><td></td><td class="num"><strong>${S.bank.size}</strong></td>${DIFFS.map(x => `<td class="num"><strong>${allQ().filter(q => q.difficulty === x).length}</strong></td>`).join('')}</tr></tbody></table></div>
  </section>
  <section class="card" style="margin-top:20px" aria-labelledby="h-doc"><h2 id="h-doc">Data format</h2><details><summary>Show file formats for import and export</summary><pre class="doc">${esc(FORMAT_DOC)}</pre></details></section>`;
};

