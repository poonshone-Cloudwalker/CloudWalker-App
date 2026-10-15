/* ================================================================== V10.1: Bootcamp, tracker, portfolio, recommendations, guide */
function bcTrackerView() {
  if (!bcContent().ok) return bcErrorView('tracker');
  const msg = BCUI.importMsg;
  const rows = BC.levels.map(lv => `<tr class="bc-lvrow"><th colspan="8" scope="colgroup">Level ${lv.level} · ${esc(lv.title)}</th></tr>` + [...lv.lab_ids, lv.exemplar_id].map(id => { const l = bcLab(id); const r = bcRec(id); const g = bcGate(r);
    return `<tr><th scope="row"><a href="#/bootcamp/lab/${encodeURIComponent(id)}">${esc(l.kind === 'exemplar' ? 'E' + l.level : l.id)}</a></th><td>${esc(l.title)}</td><td>${bcStatusChip(r.status)}</td><td class="num">${g.scored ? g.total + (g.scored < 7 ? ` <span class="small muted">(${g.scored}/7)</span>` : '') : '<span class="muted">–</span>'}</td><td>${g.scored ? (g.pass ? 'Met' : 'Not yet') : '<span class="muted">–</span>'}</td><td class="num">${bcEvidenceCount(r)} / ${BC_EVIDENCE.length}</td><td>${r.cleanup_verified ? 'Verified' : '<span class="muted">No</span>'}</td><td>${r.portfolio ? esc(BC_PORTFOLIO_LABEL[r.portfolio]) : '<span class="muted">–</span>'}</td></tr>`; }).join('')).join('');
  return bcHead('Lab tracker', 'One row per lab, following the curriculum’s <code>progress/tracker.csv</code>. Open a lab to change its record.', 'tracker') + `
  <section class="card" style="margin-top:16px" aria-labelledby="h-bc-move"><h2 id="h-bc-move">Move progress between devices</h2>
    <p class="small">Progress is saved in this browser. To use it on another device, export it here and import the file there. Imports merge lab by lab, and the more recently changed record wins, so nothing is lost by importing twice. Workspace files from Settings &amp; data carry bootcamp progress too.</p>
    <div class="row" style="margin-top:10px"><button class="btn primary" data-action="bootcamp-export" id="bc-export">Export bootcamp progress (JSON)</button><button class="btn" data-action="bootcamp-export-csv" id="bc-export-csv">Export tracker.csv</button>
      <input type="file" id="bc-import-file" class="sr-only" accept=".json,application/json" data-input="bootcamp-import"><label class="btn bc-file" for="bc-import-file">Import progress file…</label></div>
    <div id="bc-import-result" role="status" aria-live="polite">${msg ? `<p class="small ${msg.ok ? 'bc-okmsg' : 'bc-warn'}" style="margin-top:10px">${esc(msg.text)}</p>${msg.details && msg.details.length ? `<ul class="small">${msg.details.slice(0, 8).map(x => `<li>${esc(x)}</li>`).join('')}</ul>` : ''}` : ''}</div>
    <p class="small muted" style="margin-top:8px">${bcInline(BC.rubric.tracker.privacy_note)}</p></section>
  <section class="card" style="margin-top:16px" aria-labelledby="h-bc-table"><h2 id="h-bc-table">All labs</h2>
    <div class="bc-tablewrap" tabindex="0" role="region" aria-labelledby="h-bc-table"><table class="bc-table"><thead><tr><th scope="col">Lab</th><th scope="col">Title</th><th scope="col">Status</th><th scope="col">Score / 28</th><th scope="col">Gate</th><th scope="col">Evidence</th><th scope="col">Cleanup</th><th scope="col">Portfolio</th></tr></thead><tbody>${rows}</tbody></table></div></section>`;
}

function bcPortfolioView() {
  if (!bcContent().ok) return bcErrorView('portfolio');
  const P = BC.framework.portfolio; const passed = BC.labs.filter(l => bcRec(l.id).status === 'passed');
  const shared = BC.labs.filter(l => ['public-safe', 'portfolio-ready'].includes(bcRec(l.id).portfolio));
  const issues = [];
  for (const l of shared) { const r = bcRec(l.id); if (!r.evidence.sanitized) issues.push(`${bcLabName(l)}: not ticked as sanitized.`); if (!r.evidence_link) issues.push(`${bcLabName(l)}: no evidence link recorded.`); if (r.status !== 'passed') issues.push(`${bcLabName(l)}: marked for sharing but not passed.`); if (l.cloud_mode === 'optional-cloud' && !r.cleanup_verified) issues.push(`${bcLabName(l)}: cleanup not verified.`); }
  const cats = P.artifacts.filter(a => a.key !== 'evidence-index').map(a => { const labs = BC.labs.filter(l => l.portfolio_categories.includes(a.key)); const done = labs.filter(l => bcRec(l.id).status === 'passed'); const ready = labs.filter(l => bcRec(l.id).portfolio === 'portfolio-ready');
    return `<section class="card bc-pfcat" aria-labelledby="h-bc-pf-${a.key}"><h3 id="h-bc-pf-${a.key}">${esc(a.title)}</h3><p class="small">${bcInline(a.guidance)}</p><p class="small muted" id="bc-pfc-${a.key}">${labs.length} related labs · ${done.length} passed · ${ready.length} portfolio-ready</p>
      ${done.length ? `<ul class="bc-list">${done.map(l => `<li>${bcLabLink(l)} ${bcRec(l.id).portfolio ? `<span class="chip ${bcRec(l.id).portfolio === 'portfolio-ready' ? 'bc-pf' : ''}">${esc(BC_PORTFOLIO_LABEL[bcRec(l.id).portfolio])}</span>` : ''}</li>`).join('')}</ul>` : ''}</section>`; }).join('');
  return bcHead('Portfolio readiness', bcInline(P.intro), 'portfolio') + `
  <section class="card" style="margin-top:16px" aria-labelledby="h-bc-pfmark"><h2 id="h-bc-pfmark">Mark completed labs</h2>
    ${passed.length ? `<ul class="bc-pfmark">${passed.map(l => { const r = bcRec(l.id); return `<li><div>${bcLabLink(l)}${!r.evidence.sanitized && ['public-safe', 'portfolio-ready'].includes(r.portfolio) ? ' <span class="chip warn-chip">Not marked sanitized</span>' : ''}</div><div class="row bc-chips" role="group" aria-label="Portfolio flag for ${esc(bcLabName(l))}">${BC_PORTFOLIO_STATES.map(([s, lab]) => `<button type="button" class="chip" id="bc-pfm-${esc(l.id)}-${s}" data-action="bootcamp-portfolio" data-id="${esc(l.id)}" data-s="${s}" aria-pressed="${r.portfolio === s}">${lab}</button>`).join('')}</div></li>`; }).join('')}</ul>` : emptyState('No completed labs yet', 'When a lab is marked passed, it appears here so you can decide whether it stays private, needs sanitizing, is safe to share, or is ready for the portfolio.')}</section>
  <section class="card" style="margin-top:16px" aria-labelledby="h-bc-index"><h2 id="h-bc-index">Evidence index readiness</h2><p class="small">${bcInline(P.artifacts.find(a => a.key === 'evidence-index').guidance)}</p>
    <p id="bc-index-sum" style="margin-top:8px">${shared.length} lab${shared.length === 1 ? '' : 's'} marked public-safe or portfolio-ready. ${issues.length ? `${issues.length} thing${issues.length === 1 ? '' : 's'} to fix before publishing:` : shared.length ? 'No problems found in what CloudWalker can check.' : ''}</p>
    ${issues.length ? `<ul class="small bc-issues" id="bc-index-issues">${issues.map(x => `<li>${esc(x)}</li>`).join('')}</ul>` : ''}
    <div class="row" style="margin-top:10px"><button class="btn" data-action="bootcamp-export-index" ${shared.length ? '' : 'disabled'}>Download evidence-index.md</button></div><p class="small muted" style="margin-top:6px">Lists only labs marked public-safe or portfolio-ready, with the links you typed. Check every line before you publish it.</p></section>
  <h2 class="bc-h2" style="margin-top:20px">Artifact categories</h2><div class="grid g-2 bc-pfgrid">${cats}</div>
  <section class="card" style="margin-top:16px" aria-labelledby="h-bc-story"><h2 id="h-bc-story">A strong portfolio story answers</h2>${bcList(P.story_questions)}</section>`;
}
function bcEvidenceIndexMd() {
  const labs = BC.labs.filter(l => ['public-safe', 'portfolio-ready'].includes(bcRec(l.id).portfolio));
  const lines = ['# Evidence index', '', `Generated by CloudWalker on ${bcToday()}. Each claim should link to a test, command transcript, ADR or report. Sanitize account IDs, internal hostnames, personal data, credentials and non-public incident details before publishing.`, ''];
  for (const l of labs) { const r = bcRec(l.id); const g = bcGate(r);
    lines.push(`## ${l.kind === 'exemplar' ? 'Exemplar ' + l.level : 'Lab ' + l.id} — ${l.title}`, '', `- Level ${l.level}: ${l.level_title}`, `- Status: ${BC_STATUS_LABEL[r.status]}${r.completed ? ' (' + r.completed + ')' : ''}; score ${g.total}/28${g.pass ? ', suggested gate met' : ''}`, `- Evidence: ${r.evidence_link || '(no link recorded)'}`, `- Validation command: ${r.validation_command || '(not recorded)'}`, `- Cleanup verified: ${r.cleanup_verified ? 'yes' : 'no'}; sanitized: ${r.evidence.sanitized ? 'yes' : 'no'}`, `- Flag: ${BC_PORTFOLIO_LABEL[r.portfolio]}`, ''); }
  return lines.join('\n');
}

function bcRecommendView() {
  if (!bcContent().ok) return bcErrorView('recommend');
  const M = BC.mapping; const weak = bcWeakAreas(); const focus = bcFocusTopics();
  const labRow = id => { const l = bcLab(id); return l ? `<li>${bcLabLink(l)} ${bcStatusChip(bcRec(id).status)}</li>` : ''; };
  return bcHead('Recommendations', `Labs suggested from your certification practice. A domain counts as weak at ${M.weak_threshold.max_accuracy}% or below over at least ${M.weak_threshold.min_attempts} answers.`, 'recommend') + `
  <section class="card" style="margin-top:16px" aria-labelledby="h-bc-weak"><h2 id="h-bc-weak">Weak areas from your quiz results</h2>
    ${weak.length ? `<ul class="bc-weak" id="bc-weak">${weak.map(w => { const ids = uniq([...w.topics.flatMap(t => t.labs), ...((M.vendor_labs || {})[bcExamCloud(w.code)] || [])]).filter(id => bcRec(id).status !== 'passed').slice(0, 4);
      return `<li><p><strong>${esc(w.code)} · ${esc(dShort(w.domain))}</strong> <span class="small muted">${w.acc}% over ${w.att} answers</span></p><p class="small">${w.topics.length ? 'Topics: ' + w.topics.map(t => esc(t.label)).join(', ') : 'No topic in the mapping matches this domain name.'}</p>${ids.length ? `<ul class="bc-list">${ids.map(labRow).join('')}</ul>` : w.topics.length ? '<p class="small muted">Every mapped lab is already passed.</p>' : ''}</li>`; }).join('')}</ul>`
      : emptyState('No weak areas yet', `Answer at least ${M.weak_threshold.min_attempts} questions in a domain. Domains at ${M.weak_threshold.max_accuracy}% or below then show the labs that practise them.`, '<a class="btn" href="#/study">Practise questions</a>')}</section>
  <section class="card" style="margin-top:16px" aria-labelledby="h-bc-focus"><h2 id="h-bc-focus">Focus topics</h2><p class="small">Pick topics you want to strengthen regardless of quiz results. Your choice is saved and exported with your bootcamp progress.</p>
    <div class="row bc-chips" role="group" aria-labelledby="h-bc-focus">${M.topics.map(t => `<button type="button" class="chip" id="bc-focus-${t.key}" data-action="bootcamp-focus" data-k="${t.key}" aria-pressed="${focus.includes(t.key)}">${esc(t.label)}</button>`).join('')}</div>
    ${focus.length ? `<div class="grid g-2" style="margin-top:12px" id="bc-focus-labs">${focus.map(k => bcTopic(k)).filter(Boolean).map(t => `<div><h3 class="bc-h3">${esc(t.label)}</h3><ul class="bc-list">${t.labs.map(labRow).join('')}</ul></div>`).join('')}</div>` : ''}</section>
  <section class="card" style="margin-top:16px" aria-labelledby="h-bc-map"><details><summary><h2 id="h-bc-map">How the mapping works</h2></summary><p class="small">${esc(M._about)}</p>
    <div class="bc-tablewrap" tabindex="0" role="region" aria-label="Topic mapping"><table class="bc-table"><thead><tr><th scope="col">Topic</th><th scope="col">Quiz domain names containing</th><th scope="col">Labs, in order</th></tr></thead><tbody>${M.topics.map(t => `<tr><th scope="row">${esc(t.label)}</th><td>${t.keywords.map(esc).join(', ')}</td><td>${t.labs.map(esc).join(', ')}</td></tr>`).join('')}</tbody></table></div>
    <p class="small muted" style="margin-top:8px">Weak domains in Google Cloud exams also suggest ${M.vendor_labs.gcp.join(', ')}; Azure exams suggest ${M.vendor_labs.azure.join(', ')}.</p></details></section>`;
}

function bcGuideView() {
  if (!bcContent().ok) return bcErrorView('guide');
  const F = BC.framework; const R = BC.rubric; const C = F.operating_contract;
  return bcHead('Operating guide', `${bcInline(F.purpose)}`, 'guide') + `
  <section class="card bc-scope" style="margin-top:16px" role="note"><p class="small"><strong>Scope note:</strong> ${bcInline(F.scope_note)}</p></section>
  ${bcSec('contract', 'Operating contract for every lab', `<p>${bcInline(C.intro)}</p><ol class="bc-ul bc-ol">${C.items.map(t => `<li>${bcInline(t)}</li>`).join('')}</ol><p><strong>Standard acceptance gate:</strong> ${bcInline(C.acceptance_gate)}</p>`)}
  ${bcSec('gsafety', 'Safety', `<p>${bcInline(C.safety)}</p>`)}
  ${bcSec('rubric', 'Scoring rubric', `<p>${R.scale.meanings.map(m => `<strong>${m.score}</strong> ${esc(m.meaning)}`).join('; ')}.</p><p><strong>Suggested gate:</strong> ${bcInline(R.gate.text)} ${esc(R.gate.note)}</p>
    <div class="bc-tablewrap" tabindex="0" role="region" aria-label="Scoring dimensions"><table class="bc-table"><thead><tr><th scope="col">Dimension</th><th scope="col">Evidence to inspect</th><th scope="col">Tracker column</th></tr></thead><tbody>${R.dimensions.map(d => `<tr><th scope="row">${esc(d.label)}</th><td>${esc(d.evidence_to_inspect)}</td><td><code>${esc(d.tracker_field)}</code></td></tr>`).join('')}</tbody></table></div>`, false)}
  ${bcSec('gvalidation', 'Automated validation', `<p>${bcInline(F.validation.intro)}</p><pre class="bc-pre" tabindex="0" aria-label="Makefile pattern">${esc(F.validation.makefile)}</pre><p>${bcInline(F.validation.layers_and_rules)}</p>`, false)}
  ${bcSec('gcost', 'Cloud cost control and teardown', `<h3 class="bc-h3">Before any cloud command that could write</h3>${bcList(F.cost_and_teardown.before_write)}<p><strong>Apply/operate:</strong> ${bcInline(F.cost_and_teardown.apply_operate)}</p><p><strong>Teardown:</strong> ${bcInline(F.cost_and_teardown.teardown)}</p><p><strong>Optional shared guard script contract:</strong> ${bcInline(F.cost_and_teardown.guard_scripts)}</p>`, false)}
  ${bcSec('gdirs', 'Directory structure', `<pre class="bc-pre" tabindex="0" aria-label="Directory structure">${esc(F.directory_structure)}</pre><p class="small">${bcInline(F.directory_note)}</p>`, false)}
  ${bcSec('gtemplate', 'Lab README template', `<pre class="bc-pre" tabindex="0" aria-label="Lab README template">${esc(F.lab_readme_template)}</pre>`, false)}
  ${bcSec('gtracker', 'Progress tracker', `<p class="small">File: <code>${esc(R.tracker.file)}</code>. Statuses: ${R.tracker.statuses.map(s => `<code>${esc(s)}</code>`).join(', ')}.</p><pre class="bc-pre" tabindex="0" aria-label="Tracker columns">${esc(R.tracker.columns.join(',') + '\n' + R.tracker.example_row)}</pre><p class="small">${bcInline(R.tracker.privacy_note)}</p>`, false)}
  ${bcSec('gnotes', 'About the catalog and exemplars', `<p>${bcInline(F.catalog_note)}</p><p>${bcInline(F.exemplar_note)}</p>`, false)}`;
}
