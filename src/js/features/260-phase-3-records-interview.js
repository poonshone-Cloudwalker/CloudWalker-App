/* ---------- Records: interview */
function normalizeStory(s) {
  return { id: s.id, title: s.title || '', source: s.source || STORY_SOURCES[0], seed: s.seed || '', competencies: s.competencies || [], situation: s.situation || '', task: s.task || '', action: s.action || '', result: s.result || '', translation: s.translation || '',
    status: ['drafted', 'polished', 'ready'].includes(s.status) ? s.status : 'drafted', adrIds: s.adrIds || [], pfIds: s.pfIds || [], labIds: s.labIds || [], updated: s.updated || Date.now() };
}
function newStory(seed = {}) { const s = normalizeStory({ id: nextId('STAR', S.ws.interview.stories), ...seed }); S.ws.interview.stories.push(s); touch(s.id); markDirty(); return s; }
function normalizeAnswer(a) { if (a.scores) return a; const r = a.rating || 2; return { ...a, scores: Object.fromEntries(RUBRIC_DIMS.map(([k]) => [k, r])) }; }
const iqAll = () => [...INTERVIEW_QUESTIONS.filter(q => IQ_EXTRA[q.id]), ...IQ_NEW].map(q => ({ ...q, prompt: fillTpl(q.prompt), signals: (q.signals || []).map(fillTpl), followups: (q.followups || []).map(fillTpl), cat: IQ_EXTRA[q.id][0], strong: fillTpl(IQ_EXTRA[q.id][1]), weak: fillTpl(IQ_EXTRA[q.id][2]) }));
const iqById = id => iqAll().find(q => q.id === id);
const compLabel = k => COMPETENCIES.find(c => c[0] === k)?.[1] || k;
function storyShort(s) { return ['situation', 'task', 'action', 'result'].map(k => firstSentence(s[k])).filter(Boolean).join(' '); }
function storySummary(s) {
  const proofs = [...adrsOf(s.adrIds).map(a => `${a.id} ${a.title}`), ...s.pfIds.map(id => S.ws.portfolio.find(p => p.id === id)).filter(Boolean).map(p => `${p.id} ${p.title}`), ...s.labIds.map(id => LAB_SCENARIOS.find(l => l.id === id)?.title).filter(Boolean)];
  return `## ${s.title || 'Untitled story'} (${STORY_STATUS.find(x => x[0] === s.status)[1]})\n\n- **Source:** ${s.source}\n- **Competencies:** ${s.competencies.map(compLabel).join(', ') || 'n/a'}\n\n**30-second version:** ${storyShort(s) || 'n/a'}\n\n**Situation:** ${s.situation}\n\n**Task:** ${s.task}\n\n**Action:** ${s.action}\n\n**Result:** ${s.result}\n${s.translation ? `\n**Why it matters for an architect role:** ${s.translation}\n` : ''}${proofs.length ? `\n**Proof to mention:** ${proofs.join('; ')}\n` : ''}`;
}

/* ---------- Outputs component (copy and download) */
function outputsPanel(kind, rec, opts) {
  const key = kind + ':' + rec.id; const cur = S.p3.outTab[key] || opts[0][0]; const o = opts.find(x => x[0] === cur) || opts[0];
  const text = o[2](rec);
  return `<section class="card" aria-labelledby="h-out-${rec.id}"><h2 id="h-out-${rec.id}">Outputs</h2>
    <div class="seg-control wrap" role="group" aria-label="Output type" style="margin-bottom:12px">${opts.map(([k, l]) => `<button type="button" data-action="x-out-tab" data-k="${key}" data-v="${k}" aria-pressed="${k === cur}">${l}</button>`).join('')}</div>
    <label class="sr-only" for="outText">${esc(o[1])}</label><textarea id="outText" class="out-text" rows="12" readonly>${esc(text)}</textarea>
    <div class="row" style="margin-top:10px"><button class="btn primary" data-action="x-copy">Copy</button><button class="btn" data-action="x-dl-out" data-name="${esc(rec.id + '-' + slug(rec.title || o[1]) + '-' + o[0])}" data-ext="${o[3] || 'md'}">Download</button>${o[4] ? o[4](rec) : ''}</div></section>`;
}
async function copyOut() {
  const ta = $('#outText'); if (!ta) return;
  try { await navigator.clipboard.writeText(ta.value); showStatus('Copied to the clipboard.'); }
  catch { ta.removeAttribute('readonly'); ta.select(); const ok = document.execCommand && document.execCommand('copy'); ta.setAttribute('readonly', ''); showStatus(ok ? 'Copied to the clipboard.' : 'Select the text and copy it manually.'); }
}
const ADR_OUTS = [['md', 'Markdown', adrMarkdown], ['txt', 'Plain text', a => plainText(adrMarkdown(a)), 'txt'], ['snippet', 'Portfolio snippet', adrSnippet, 'txt'], ['talk', 'Interview talking points', adrTalkingPoints, 'txt']];
const PF_OUTS = [['case', 'One-page case study', pfCaseStudy, 'md', p => `<button class="btn" data-action="x-pf-html" data-id="${p.id}">Printable page (.html)</button>`], ['resume', 'Résumé bullets', pfResume, 'txt'], ['linkedin', 'LinkedIn summary', pfLinkedIn, 'txt'], ['iv', 'Interview discussion', pfInterview, 'txt']];
const STORY_OUTS = [['sum', 'Story summary', storySummary], ['short', '30-second version', s => storyShort(s), 'txt']];

function reviewCount() { const q = queues(); return q.missed.length + q.low.length + q.due.length; }
/* ---------- Tablet shell: Today strip, status line, breadcrumbs */
function nextLab() { const best = labBest(); const draft = LAB_SCENARIOS.find(s => !(s.id in best) && Object.values(S.ws.labDrafts[s.id]?.sections || {}).some(v => (v || '').trim())); return draft || LAB_SCENARIOS.find(s => !(s.id in best)) || null; }
function nextStory() { return S.ws.interview.stories.filter(s => s.status !== 'ready').sort((a, b) => b.updated - a.updated)[0] || null; }
function nextMilestone() { return S.ws.career.milestones.filter(m => m.status !== 'done' && m.date).sort((a, b) => parseISO(a.date) - parseISO(b.date))[0] || null; }
function chrome(name) {
  if (['run', 'rs', 'menu'].includes(name)) return `<div id="statusSlot" aria-live="polite">${statusHtml()}</div>`;
  const due = reviewCount(); const lab = nextLab(), st = nextStory(), ms = nextMilestone();
  const chip = (href, label, val, cls = '') => `<a class="today-chip ${cls}" href="${href}"><span class="tl">${label}</span><span class="tv">${esc(val)}</span></a>`;
  return `<nav class="today" aria-label="Today">
    ${chip('#/retention', 'Review queue', due ? `${due} waiting` : 'All clear', due ? 'hot' : '')}
    ${lab ? chip('#/lab/' + lab.id, 'Next lab', lab.title) : ''}
    ${chip(st ? '#/interview/story/' + st.id : '#/interview/stories', 'Next story', st ? (st.title || st.id) + ' · ' + STORY_STATUS.find(x => x[0] === st.status)[1] : 'Start one')}
    ${ms ? chip('#/career/milestones', 'Next milestone', `${ms.title} · ${fmtDate(parseISO(ms.date))}`) : chip('#/career/milestones', 'Next milestone', 'Set exam dates')}
  </nav><div id="statusSlot" aria-live="polite">${statusHtml()}</div>`;
}
function updateTrail(r) {
  const t = Date.now(), T = S.ws.trail; const set = (k, label, href) => { T[k] = { label, href, t }; };
  if (r.name === 'run' && S.runner) set('study', S.runner.title, '#/run');
  else if (r.name === 'rs' && S.rs) set('study', S.rs.title, '#/rs');
  else if (r.name === 'lab' && r.arg) set('artifact', 'Lab: ' + (LAB_SCENARIOS.find(s => s.id === r.arg)?.title || r.arg), '#/lab/' + r.arg);
  else if (r.name === 'adr' && r.arg) { const a = S.ws.adrs.find(x => x.id === r.arg); a && set('artifact', `${a.id}: ${a.title || 'Untitled'}`, '#/adr/' + a.id); }
  else if (r.name === 'portfolio' && r.arg) { const p = S.ws.portfolio.find(x => x.id === r.arg); p && set('artifact', `${p.id}: ${p.title || 'Untitled'}`, '#/portfolio/' + p.id); }
  else if (r.name === 'interview' && r.arg.startsWith('story/')) { const s = S.ws.interview.stories.find(x => x.id === r.arg.slice(6)); s && set('story', s.title || s.id, '#/interview/story/' + s.id); }
}
function continueTarget() {
  if (S.rs && S.rs.idx < S.rs.items.length) return { label: `Resume ${S.rs.title}`, href: '#/rs' };
  if (S.runner && !S.runner.finished && !S.runner.readOnly) return { label: `Resume ${S.runner.title}`, href: '#/run' };
  const T = S.ws.trail; const last = ['study', 'artifact', 'story'].map(k => T[k] && { ...T[k], k }).filter(Boolean).sort((a, b) => b.t - a.t)[0];
  if (!last) return null;
  if (last.k === 'study' && ['#/run', '#/rs'].includes(last.href)) return { label: 'Start today\'s review', href: '#/retention' };
  return { label: `Continue: ${last.label}`, href: last.href };
}
VIEWS.menu = () => {
  let grp = '';
  return `<div class="page-head"><div><h1>Menu</h1></div></div><div class="menu-grid">${NAV.map(([k, l, g]) => { const head = g !== grp ? `<h2 class="menu-h">${esc(g)}</h2>` : ''; grp = g; return head + `<a class="menu-item" href="#/${k}">${svg(k)}<span>${esc(l)}</span></a>`; }).join('')}</div>`;
};
VIEWS.detail = () => { const d = S.p3.detail; if (!d) return emptyState('Nothing to show', 'Open a question or certification first.', '<a class="btn" href="#/library">Question library</a>');
  return `<div class="run-head"><button class="btn sm ghost" data-action="x-back">← Back</button><span class="title">${esc(d.title)}</span></div><section class="card">${d.html}</section>`; };

/* ---------- Command center */
const tile = s => `<a class="score-tile ${band(s.value)}" href="${s.href}"><span class="st-label">${esc(s.label)}</span><span class="st-val">${s.value}<small>/100</small></span><span class="bar ${band(s.value)}"><i style="width:${s.value}%"></i></span><span class="st-detail">${esc(s.detail)}</span><span class="st-cta">${esc(s.cta)} →</span></a>`;
function nextMoves(scores) {
  const moves = []; const q = queues(); const sorted = [...scores].sort((a, b) => a.value - b.value);
  const qn = q.missed.length + q.low.length + q.due.length;
  if (qn) moves.push([`Do a 20-minute daily review (${qn} waiting)`, 'Missed and low-confidence items first; each one says why it is due.', '#/retention']);
  for (const s of sorted) {
    if (moves.length >= 4) break;
    if (s.key === 'exam') { const w = weakDomains(1)[0]; moves.push([w ? `Targeted review: ${w.code} ${dShort(w.domain)}` : `Take a practice exam for ${focusExam()}`, w ? 'Your lowest-accuracy domain.' : 'A baseline shows where to drill first.', w ? '#/retention' : '#/exam']); }
    if (s.key === 'judgment') { const nx = nextLab(); moves.push([nx ? `Run lab: ${nx.title}` : 'Write an ADR from a template', 'Judgment grows by making and defending design calls.', nx ? `#/lab/${nx.id}` : '#/adr']); }
    if (s.key === 'portfolio') moves.push([S.ws.portfolio.length ? 'Fill the gaps in your strongest project' : 'Start a portfolio project from a template', 'Employers look for decisions, trade-offs, and outcomes.', '#/portfolio']);
    if (s.key === 'interview') { const covered = new Set(S.ws.interview.stories.filter(x => storyStrong(x) && x.status !== 'drafted').flatMap(x => x.competencies)); const seed = seedsFor(cwProfile().background).find(p => p.comps.some(c => !covered.has(c))); moves.push([seed ? `Turn your past experience into a story: ${fillTpl(seed.title)}` : 'Practice an executive summary', `Your ${tplVars().background} work is evidence; translate it.`, seed ? '#/interview/stories' : '#/interview/exec']); }
  }
  return moves.slice(0, 4);
}
VIEWS.dashboard = () => {
  const scores = allScores(); const cont = continueTarget(); const T = S.ws.trail; const prof = S.ws.career.profile;
  const weak = weakDomainList(3);
  return `
  <div class="page-head"><div><h1>${prof.name ? `${esc(prof.name.split(' ')[0])}'s command center` : 'Command center'}</h1><p class="muted">Five measures of readiness for a cloud architecture role. Focus certification: <strong>${esc(focusExam() || 'none')}</strong> <a href="#/career/profile">change</a></p></div>
    <div class="row">${cont ? `<a class="btn primary" href="${cont.href}">${esc(cont.label)}</a>` : `<a class="btn primary" href="#/retention">Start a daily review</a>`}</div></div>
  ${Object.keys(T).length ? `<div class="crumbs" aria-label="Where you left off">${[['study', 'Last studied'], ['artifact', 'Last edited'], ['story', 'Last story']].filter(([k]) => T[k]).map(([k, l]) => `<a href="${T[k].href === '#/run' || T[k].href === '#/rs' ? '#/retention' : T[k].href}"><span class="tl">${l}</span> ${esc(T[k].label)} <span class="faint">${ago(T[k].t)}</span></a>`).join('')}</div>` : ''}
  <section class="score-grid" aria-label="Readiness scores">${scores.map(tile).join('')}</section>
  <div class="grid g-2" style="margin-top:20px">
    <section class="card" aria-labelledby="h-moves"><h2 id="h-moves">Next best moves</h2><ol class="moves">${nextMoves(scores).map(([t, why, href]) => `<li><a href="${href}"><strong>${esc(t)}</strong><span class="small muted">${esc(why)}</span></a></li>`).join('')}</ol></section>
    <section class="card" aria-labelledby="h-weak2"><h2 id="h-weak2">Weak domains</h2>${weak.length ? `<div class="stack">${weak.map(w => `<div class="weak-row"><div class="row"><strong>${esc(w.code)}: ${esc(dShort(w.domain))}</strong><span class="spacer"></span><span class="status no">${w.acc}%</span></div><div class="row" style="margin-top:8px"><button class="btn sm" data-action="x-rs-domain" data-exam="${esc(w.code)}" data-domain="${esc(w.domain)}">Targeted review</button>${w.lab ? `<a class="btn sm" href="#/lab/${w.lab.id}">Lab: ${esc(w.lab.title)}</a>` : ''}${w.lab && pfTemplateForLab(w.lab.id) ? `<button class="btn sm ghost" data-action="x-pf-tpl" data-v="${pfTemplateForLab(w.lab.id).key}">Project: ${esc(pfTemplateForLab(w.lab.id).title)}</button>` : ''}</div></div>`).join('')}</div>` : emptyState('Not enough data yet', 'Answer at least three questions in a domain to see weaknesses with targeted actions.', '<a class="btn sm" href="#/study">Study</a>')}</section>
  </div>
  <section class="card" style="margin-top:20px" aria-labelledby="h-cert"><div class="card-head"><h2 id="h-cert">Certification core</h2><a class="small" href="#/certify">Overview</a></div>
    <div class="grid g-3">${activeExams().map(e => `<div><div class="cov-head"><strong>${esc(e.code)}</strong><span class="small muted nm">${esc(e.vendor)}</span><span class="small">${examReadiness(e.code).score}/100</span></div>${blueprintStrip(e.code)}</div>`).join('')}</div></section>`;
};

/* ---------- Retention engine */
const QUEUE_TABS = [['missed', 'Missed'], ['low', 'Low confidence'], ['due', 'Due for review'], ['unseen', 'Unseen']];
VIEWS.retention = () => {
  const f = { exam: S.p3.rsExam }; const qs = queues(f); const plan = dailyPlan(S.p3.rsMinutes, f.exam);
  const byMode = m => plan.filter(x => x.mode === m).length; const rs = retentionStats(f.exam); const fc = forecast(f.exam); const mx = Math.max(1, ...fc);
  const tab = S.p3.queueTab; const list = qs[tab];
  return `
  <div class="page-head"><div><h1>Retention engine</h1><p class="muted">Every answer moves a question along fixed review steps: same day, 1, 3, 7, 14, then 30 days. A miss sends it back to same day. Low confidence holds it in place. Weak domains get one step shorter. Each item tells you why it is in your queue.</p></div></div>
  <section class="card daily" aria-labelledby="h-daily"><div class="card-head"><h2 id="h-daily">Daily review</h2><span class="small muted">Health ${rs.health}/100</span></div>
    <div class="row" style="gap:16px;align-items:flex-end">
      <div class="field"><span class="lbl" id="lbl-min">Time available</span><div class="seg-control" role="group" aria-labelledby="lbl-min">${[10, 20, 30].map(m => `<button type="button" data-action="x-rs-min" data-v="${m}" aria-pressed="${S.p3.rsMinutes === m}">${m} min</button>`).join('')}</div></div>
      <div class="field" style="min-width:220px"><label for="rs-exam">Certification</label><select id="rs-exam" data-p3="rsExam">${examOpts(f.exam)}</select></div>
    </div>
    ${plan.length ? `<p style="margin:14px 0 6px"><strong>${plan.length} items, about ${Math.round(plan.reduce((s, x) => s + MODE_COST[x.mode], 0))} minutes:</strong> ${Object.keys(MODE_LABEL).filter(byMode).map(m => `${byMode(m)} ${MODE_LABEL[m].toLowerCase()}`).join(', ')}.</p>
      <p class="small muted">Order: missed first (with a teach-back), then low confidence (compare-and-contrast), then due items (recall and multiple choice), then a few new questions from your highest-weight domains.</p>
      <div class="row" style="margin-top:12px"><button class="btn primary" data-action="x-rs-daily">Start ${S.p3.rsMinutes}-minute review</button></div>`
      : `<p class="muted" style="margin-top:12px">Nothing to review in this scope. Study a few questions first; they enter the schedule automatically.</p>`}
  </section>
  <section class="card" style="margin-top:20px" aria-labelledby="h-q"><div class="card-head"><h2 id="h-q">Queues</h2><div class="row"><button class="btn sm" data-action="x-exp-queue">Export queue</button></div></div>
    <nav class="tabs" aria-label="Queues">${QUEUE_TABS.map(([k, l]) => `<a href="#/retention" data-action="x-qtab" data-v="${k}" ${tab === k ? 'aria-current="page"' : ''}>${l} <span class="faint">${qs[k].length}</span></a>`).join('')}</nav>
    <div class="row" style="margin:12px 0"><span class="small muted">${{ missed: 'Last attempt wrong, or last recall graded Again.', low: 'Answered, but you rated confidence Low.', due: 'Scheduled review date has arrived.', unseen: 'Never answered. Highest-weight and weakest domains first.' }[tab]}</span><span class="spacer"></span>${list.length ? `<button class="btn sm primary" data-action="x-rs-queue" data-v="${tab}">Review ${Math.min(list.length, 20)} now</button>` : ''}</div>
    ${list.length ? `<div class="stack">${list.slice(0, 20).map(id => { const q = Q(id); const why = whyDue(id); return `<div class="qitem"><div class="lib-top"><strong>${esc(q.exam_code)}</strong><span>${esc(q.subdomain)}</span><span class="spacer"></span>${tab !== 'unseen' ? `<span class="chip">Priority ${priority(id)}</span>` : ''}</div><p class="qline">${rich(q.question)}</p><details class="why"><summary>Why is this due?</summary><ul class="plain-list small">${why.map(w => `<li>${esc(w)}</li>`).join('')}</ul></details><div class="row"><button class="btn sm" data-action="x-rs-one" data-id="${id}" data-mode="mcq">Answer</button><button class="btn sm ghost" data-action="x-rs-one" data-id="${id}" data-mode="teach">Teach-back</button><button class="btn sm ghost" data-action="x-rs-one" data-id="${id}" data-mode="compare">Compare</button></div></div>`; }).join('')}</div>${list.length > 20 ? `<p class="small muted" style="margin-top:8px">Showing 20 of ${list.length}, highest priority first.</p>` : ''}` : emptyState('Queue is empty', tab === 'missed' ? 'No misses waiting. Good.' : tab === 'low' ? 'Rate confidence after answering; Low ratings land here.' : tab === 'due' ? 'Nothing due right now.' : 'You have seen every question in this scope.')}
  </section>
  <div class="grid g-2" style="margin-top:20px">
    <section class="card" aria-labelledby="h-fc"><h2 id="h-fc">Next 14 days</h2><div class="forecast" role="img" aria-label="Reviews due per day: ${fc.join(', ')}">${fc.map((n, i) => `<div class="fc-col"><span class="fc-bar" style="height:${n / mx * 100}%"></span><span class="fc-n">${n || ''}</span><span class="fc-d">${i === 0 ? 'Today' : new Date(today0() + i * DAY).toLocaleDateString(undefined, { weekday: 'narrow' })}</span></div>`).join('')}</div>
      <p class="small muted" style="margin-top:10px">${persistOK() ? 'Your due list saves automatically on this device.' : 'Storage is blocked in this browser, so save your workspace after each session to keep tomorrow\'s due list.'}</p></section>
    <section class="card" aria-labelledby="h-wd"><div class="card-head"><h2 id="h-wd">Weak domains</h2><button class="btn sm" data-action="x-exp-weak">Export summary</button></div>${weakDomainList(4).map(w => `<div class="weak-row"><div class="row"><strong>${esc(w.code)}: ${esc(dShort(w.domain))}</strong><span class="spacer"></span><span class="status no">${w.acc}%</span></div><div class="row" style="margin-top:6px"><button class="btn sm" data-action="x-rs-domain" data-exam="${esc(w.code)}" data-domain="${esc(w.domain)}">Targeted review</button>${w.lab ? `<a class="btn sm ghost" href="#/lab/${w.lab.id}">Lab: ${esc(w.lab.title)}</a>` : ''}</div></div>`).join('') || '<p class="muted small">Answer three or more questions in a domain to rank weaknesses.</p>'}</section>
  </div>
  <section class="card" style="margin-top:20px" aria-labelledby="h-rh"><h2 id="h-rh">Retention health by certification and domain</h2>
    <p class="small muted" style="margin-bottom:10px">Health = 45% reviews done on time + 40% recall over your last 40 reviews + 15% cards at 14-day intervals or longer.</p>
    ${activeExams().map(e => { const h = retentionStats(e.code); if (!h.cards) return `<div class="list-item"><strong>${esc(e.code)}</strong><span class="small muted">No cards yet</span></div>`; return `<details class="hrow"><summary><strong>${esc(e.code)}</strong><span class="spacer"></span><span class="small muted">${h.cards} cards · ${h.due} due · recall ${h.recall}%</span><span class="hbadge ${band(h.health)}">${h.health}</span></summary><table><thead><tr><th scope="col">Domain</th><th class="num" scope="col">Cards</th><th class="num" scope="col">Due</th><th class="num" scope="col">On time</th><th class="num" scope="col">Recall</th><th class="num" scope="col">Health</th></tr></thead><tbody>${domainsOf(e.code).map(d => { const dh = healthOf(examQs(e.code).filter(q => q.domain === d).map(q => q.id)); return `<tr><td>${esc(dShort(d))}</td><td class="num">${dh.cards}</td><td class="num">${dh.due}</td><td class="num">${dh.cards ? dh.onTime + '%' : '—'}</td><td class="num">${dh.cards ? dh.recall + '%' : '—'}</td><td class="num">${dh.cards ? dh.health : '—'}</td></tr>`; }).join('')}</tbody></table></details>`; }).join('')}
  </section>`;
};
function startRs(items, title) { if (!items.length) { showStatus('Nothing to review with those settings.'); return; } S.rs = { items, idx: 0, phase: 'q', choice: null, text: '', results: [], started: Date.now(), minutes: Math.round(items.reduce((s, x) => s + MODE_COST[x.mode], 0)), title }; go('rs'); }
function compareIdx(q) { let h = 0; for (const ch of q.id) h = (h * 31 + ch.charCodeAt(0)) >>> 0; const others = q.options.map((_, i) => i).filter(i => i !== q.correct_index); return others[h % others.length]; }
VIEWS.rs = () => {
  const r = S.rs; if (!r) return emptyState('No review in progress', 'Start a daily review from the Retention engine.', '<a class="btn primary" href="#/retention">Retention engine</a>');
  if (r.idx >= r.items.length) {
    const g = r.results; const missed = g.filter(x => x.g === 1).map(x => Q(x.id));
    const labs = uniq(missed.map(bestLab).filter(Boolean).map(l => l.id)).map(id => LAB_SCENARIOS.find(l => l.id === id));
    return `<div class="page-head"><div><h1>Review complete</h1><p class="muted">${g.length} items in ${Math.max(1, Math.round((Date.now() - r.started) / 60000))} minutes. ${g.filter(x => x.g >= 3).length} solid, ${g.filter(x => x.g === 2).length} shaky, ${missed.length} missed.</p></div></div>
      ${missed.length ? `<section class="card"><h2>Close the gaps</h2><p class="small muted" style="margin-bottom:10px">Missed items come back later today. To understand them, not just memorize them:</p><div class="row">${labs.map(l => `<a class="btn" href="#/lab/${l.id}">Lab: ${esc(l.title)}</a>`).join('')}${uniq(missed.map(bestAdrTemplate).filter(Boolean)).map(t => `<button class="btn ghost" data-action="x-adr-tpl" data-v="${t.key}">ADR template: ${esc(t.title.split(':')[0])}</button>`).join('')}</div></section>` : ''}
      <div class="row" style="margin-top:16px"><a class="btn primary" href="#/retention">Back to retention</a><button class="btn" data-action="ws-export">Save workspace</button></div>`;
  }
  const it = r.items[r.idx]; const q = Q(it.id); const why = whyDue(it.id); const ci = compareIdx(q);
  const head = `<div class="run-head"><span class="title">${esc(r.title)}</span><span class="spacer"></span><span class="chip strong">${r.idx + 1} of ${r.items.length}</span><span class="timer" id="p2timer" data-start="${r.started}" data-limit="${r.minutes}"></span><button class="btn sm" data-action="x-rs-end">End</button></div>
    <div class="bar" style="margin-bottom:16px" role="progressbar" aria-label="Review progress" aria-valuemin="0" aria-valuemax="${r.items.length}" aria-valuenow="${r.idx}"><i style="width:${pct(r.idx, r.items.length)}%"></i></div>`;
  const whyBox = `<details class="why" open><summary>Why is this in your review?</summary><ul class="plain-list small">${why.map(w => `<li>${esc(w)}</li>`).join('')}</ul></details>`;
  const meta = `<div class="qmeta"><span class="chip strong">${MODE_LABEL[it.mode]}</span><span class="chip">${esc(q.exam_code)}</span><span class="chip">${esc(q.subdomain)}</span></div>`;
  if (it.mode === 'mcq') {
    const done = r.phase === 'a'; const resp = r.choice;
    return head + `<article class="card qcard">${meta}${whyBox}<p class="qtext" id="qtext" tabindex="-1">${rich(q.question)}</p>
      <div class="options" role="group" aria-label="Answer options">${q.options.map((o, i) => { let cls = '', v = ''; if (done) { if (i === q.correct_index) { cls = 'correct'; v = 'Correct answer'; } else if (i === resp) { cls = 'wrong'; v = 'Your answer'; } } return `<button class="opt ${cls}" data-action="x-rs-mcq" data-i="${i}" ${done ? 'disabled' : ''}><span class="key" aria-hidden="true">${LETTERS[i]}</span><span><span class="sr-only">Option ${LETTERS[i]}: </span>${rich(o)}</span><span class="verdict">${v}</span></button>`; }).join('')}</div>
      ${done ? explainPanel(q, resp === q.correct_index) + `<div class="run-foot"><div class="seg-control" role="group" aria-label="How confident were you?">${['high', 'medium', 'low'].map(c => `<button type="button" data-action="x-rs-conf" data-v="${c}" aria-pressed="${S.progress.confidence[q.id] === c}">${c[0].toUpperCase() + c.slice(1)} confidence</button>`).join('')}</div><span class="spacer"></span><button class="btn primary" data-action="x-rs-next">Next</button></div>` : ''}</article>`;
  }
  const prompt = it.mode === 'teach' ? `<p class="prompt-lead">Teach it back. In three to five sentences, explain to a teammate what this scenario really requires and which approach fits. Name the requirement that decides it.</p>`
    : it.mode === 'compare' ? `<p class="prompt-lead">Compare and contrast. When would you choose each of these, and which one fits this scenario?</p><div class="cmp2"><div><span class="tl">Option 1</span>${rich(q.options[q.correct_index < ci ? q.correct_index : ci])}</div><div><span class="tl">Option 2</span>${rich(q.options[q.correct_index < ci ? ci : q.correct_index])}</div></div>`
    : `<p class="prompt-lead">Answer from memory. The options are hidden on purpose.</p>`;
  return head + `<article class="card qcard">${meta}${whyBox}<p class="qtext" id="qtext" tabindex="-1">${rich(q.question)}</p>${prompt}
    <div class="field" style="margin-top:12px"><label for="rsText">Your answer</label><textarea id="rsText" rows="${it.mode === 'recall' ? 3 : 6}" data-rs-text="1" autocapitalize="sentences" spellcheck="true" enterkeyhint="done">${esc(r.text)}</textarea></div>
    ${r.phase === 'a' ? `<section class="explain"><p class="result-line">Answer: ${rich(q.options[q.correct_index])}</p><p>${rich(q.correct_rationale)}</p>${q.distractor_summary ? `<p class="small" style="margin-top:8px">${rich(q.distractor_summary)}</p>` : ''}${it.mode === 'compare' ? `<p class="small muted" style="margin-top:8px">Check yourself: did you name a situation where the other option would be the right call?</p>` : ''}</section>
      <fieldset style="margin-top:16px"><legend class="lbl small muted" style="font-weight:600;margin-bottom:8px">Grade your answer honestly</legend><div class="grade-row">${[[1, 'Again', 'Missed it'], [2, 'Hard', 'Partly, with effort'], [3, 'Good', 'Right, some thought'], [4, 'Easy', 'Instant and complete']].map(([g, l, s]) => `<button class="btn grade g${g}" data-action="x-rs-grade" data-v="${g}"><strong>${l}</strong><span class="small">${s}</span></button>`).join('')}</div></fieldset>${relatedLinks(q) ? `<section class="explain" style="margin-top:14px">${relatedLinks(q)}</section>` : ''}`
      : `<div class="row" style="margin-top:14px"><button class="btn primary" data-action="x-rs-reveal">Reveal and compare</button></div>`}
  </article>`;
};

/* ---------- shared form helpers (tablet-friendly entry) */
const TA = 'autocapitalize="sentences" spellcheck="true"';
function fieldArea(id, label, bind, val, rows, ph = '', type = '') { return `<div class="field fgap"><label for="${id}">${esc(label)}</label><textarea id="${id}" rows="${rows}" data-bind="${bind}" ${type ? `data-type="${type}"` : ''} ${TA} placeholder="${esc(ph)}">${esc(val)}</textarea></div>`; }
const fieldText = (id, label, bind, val, ph = '', type = '') => `<div class="field fgap"><label for="${id}">${esc(label)}</label><input id="${id}" type="text" data-bind="${bind}" ${type ? `data-type="${type}"` : ''} value="${esc(val)}" placeholder="${esc(ph)}" ${TA}></div>`;
const checkGroup = (legend, bind, items, sel) => `<fieldset class="fgap"><legend class="lbl small muted" style="font-weight:600;margin-bottom:6px">${esc(legend)}</legend><div class="checks">${items.map(([v, l]) => `<label class="check"><input type="checkbox" data-bind="${bind}" data-type="multi" value="${esc(v)}" ${sel.includes(v) ? 'checked' : ''}> ${esc(l)}</label>`).join('')}</div></fieldset>`;
const tabsBar = (action, cur, list) => `<div class="seg-control wrap tabbar" role="group" aria-label="Sections">${list.map(([k, l]) => `<button type="button" data-action="${action}" data-v="${k}" aria-pressed="${cur === k}">${l}</button>`).join('')}</div>`;

/* ---------- ADR studio */
VIEWS.adr = (arg) => {
  if (arg) return adrEditor(arg);
  const f = S.p2.adrStatus || ''; const list = S.ws.adrs.filter(a => !f || a.status === f).sort((a, b) => b.id.localeCompare(a.id));
  return `
  <div class="page-head"><div><h1>ADR studio</h1><p class="muted">Architecture decision records capture the context, the options you weighed, what you chose, and what it costs you. Reviewers and interviewers care about this reasoning more than the diagram.</p></div><button class="btn primary" data-action="x-adr-new">Blank ADR</button></div>
  <section class="card" aria-labelledby="h-tpl"><h2 id="h-tpl">Start from a template</h2><p class="small muted" style="margin-bottom:12px">Templates pre-load typical options, drivers, and lenses. Rewrite them for your scenario; generic text will not hold up in an interview.</p>
    <div class="grid g-2">${ADR_TEMPLATES.map(t => `<button class="tpl-card" data-action="x-adr-tpl" data-v="${t.key}"><strong>${esc(t.title)}</strong><span class="small muted">${t.options.map(o => o.name).join(' · ')}</span></button>`).join('')}</div></section>
  ${S.ws.adrs.length ? `<div class="row" style="margin:20px 0 12px" role="group" aria-label="Filter by status">${['', ...ADR_STATUS].map(st => `<button class="chip" data-action="adr-filter" data-v="${st}" aria-pressed="${f === st}">${st || 'All'} (${S.ws.adrs.filter(a => !st || a.status === st).length})</button>`).join('')}</div>
    <div class="stack">${list.map(a => { const qy = adrQuality(a); return `<a class="lib-item" href="#/adr/${a.id}"><div class="lib-top"><strong>${esc(a.id)}</strong><span class="chip">${esc(a.status)}</span>${a.providers.map(p => `<span class="chip">${esc(p)}</span>`).join('')}<span class="spacer"></span><span class="status ${qy.total >= 75 ? 'ok' : qy.total >= 50 ? 'flag' : 'no'}">Quality ${qy.total}</span></div><div class="qline"><strong>${esc(a.title || 'Untitled decision')}</strong>${chosenOpt(a) ? ` — chose ${esc(chosenOpt(a).name)}` : ''}</div></a>`; }).join('')}</div>` : ''}`;
};
function adrEditor(id) {
  const a = S.ws.adrs.find(x => x.id === id); if (!a) return emptyState('ADR not found', 'It may have been deleted, or the workspace containing it has not been restored.', '<a class="btn" href="#/adr">ADR studio</a>');
  const qy = adrQuality(a); const tab = S.p3.adrTab; const done = qy.total >= 75 || a.status === 'Accepted';
  const body = tab === 'compare' ? adrCompare(a) : tab === 'quality' ? adrQualityView(a, qy) : tab === 'outputs' ? outputsPanel('adr', a, ADR_OUTS) : adrWrite(a);
  return `
  <div class="run-head"><a class="btn sm ghost" href="#/adr">← ADRs</a><span class="title">${esc(a.id)}</span><span class="spacer"></span><span class="chip strong" id="liveScore">Quality ${qy.total}/100</span><button class="btn sm danger" data-action="x-adr-del" data-id="${a.id}">Delete</button></div>
  ${done ? `<div class="next-card"><strong>Ready to reuse.</strong> <span class="small">Turn this decision into proof you can talk about.</span><div class="row"><button class="btn sm" data-action="x-adr-tab" data-v="outputs" data-out="talk" data-id="${a.id}">Interview talking points</button><button class="btn sm" data-action="x-story-from-adr" data-id="${a.id}">Start a STAR story</button><button class="btn sm ghost" data-action="x-pf-from-adr" data-id="${a.id}">Link to a project</button></div></div>` : ''}
  ${tabsBar('x-adr-tab', tab, [['write', 'Write'], ['compare', 'Compare options'], ['quality', 'Quality'], ['outputs', 'Outputs']])}
  <div style="margin-top:14px">${body}</div>`;
}
function adrWrite(a) {
  const tpl = ADR_TEMPLATES.find(t => t.key === a.template);
  return `<div class="card form-card" data-rec="adr:${a.id}">
    <h3 class="sec-h">Decision</h3>
    ${fieldText('a-title', 'Title', 'title', a.title, 'Use Cloud Run for the checkout API')}
    <div class="grid g-3"><div class="field fgap"><label for="a-status">Status</label><select id="a-status" data-bind="status">${opts(ADR_STATUS, a.status)}</select></div><div class="field fgap"><label for="a-date">Date</label><input id="a-date" type="date" data-bind="date" value="${esc(a.date)}"></div>${fieldText('a-dec', 'Deciders', 'deciders', a.deciders)}</div>
    ${fieldArea('a-ctx', 'Context', 'context', a.context, 5, tpl ? tpl.contextHint : 'What forces are at play? Scale, constraints, deadlines, regulations, team skills.')}
    <div class="grid g-2">${fieldArea('a-bd', 'Business drivers (one per line)', 'businessDrivers', a.businessDrivers.join('\n'), 4, 'Launch before Q3 peak', 'lines')}${fieldArea('a-tc', 'Technical constraints (one per line)', 'constraints', a.constraints.join('\n'), 4, 'Must run in EU regions', 'lines')}</div>
    <h3 class="sec-h">Options considered</h3>
    ${a.options.map((o, i) => `<div class="opt-block"><div class="row"><strong>Option ${i + 1}</strong><span class="spacer"></span>${a.options.length > 2 ? `<button class="btn sm ghost" data-action="x-adr-optdel" data-id="${a.id}" data-i="${i}" aria-label="Remove option ${i + 1}">Remove</button>` : ''}</div>
      ${fieldText(`a-on${i}`, 'Name', `options.${i}.name`, o.name)}${fieldArea(`a-os${i}`, 'Summary', `options.${i}.summary`, o.summary, 2)}
      <div class="grid g-2">${fieldArea(`a-op${i}`, 'Pros', `options.${i}.pros`, o.pros, 3)}${fieldArea(`a-oc${i}`, 'Cons', `options.${i}.cons`, o.cons, 3)}</div>
      ${i !== a.chosen ? fieldArea(`a-or${i}`, 'If rejected, why', `options.${i}.rejectedWhy`, o.rejectedWhy, 2) : ''}</div>`).join('')}
    ${a.options.length < 5 ? `<button class="btn sm" data-action="x-adr-opt" data-id="${a.id}">Add option</button>` : ''}
    <h3 class="sec-h">Choice and reasoning</h3>
    <div class="field fgap"><label for="a-ch">Chosen option</label><select id="a-ch" data-bind="chosen" data-type="num">${opts([[-1, 'Not chosen yet'], ...a.options.map((o, i) => [i, o.name || `Option ${i + 1}`])], a.chosen)}</select></div>
    ${fieldArea('a-dcs', 'Decision statement', 'decision', a.decision, 3, 'We will…')}
    ${fieldArea('a-rat', 'Why this option wins', 'rationale', a.rationale, 3, 'Tie it to the drivers and constraints above.')}
    ${fieldArea('a-to', 'Trade-offs accepted', 'tradeoffs', a.tradeoffs, 3, 'What you are giving up, and why that is acceptable.')}
    ${fieldArea('a-risk', 'Risks (one per line, with mitigation)', 'risks', a.risks.join('\n'), 3, 'Cold starts add latency → set minimum instances', 'lines')}
    <div class="grid g-2">${fieldArea('a-cp', 'Positive consequences', 'consequencesPos', a.consequencesPos, 3)}${fieldArea('a-cn', 'Negative consequences', 'consequencesNeg', a.consequencesNeg, 3)}</div>
    ${fieldArea('a-fu', 'Follow-up actions (one per line)', 'followUps', a.followUps.join('\n'), 3, 'Load test at 2x peak', 'lines')}
    ${fieldArea('a-rev', 'Review trigger', 'reviewTrigger', a.reviewTrigger, 2, 'What would make you revisit this decision?')}
    <h3 class="sec-h">Tags and links</h3>
    ${checkGroup('Cloud providers', 'providers', PROVIDERS.map(p => [p, p]), a.providers)}
    ${checkGroup('Well-architected lenses', 'lenses', LENSES, a.lenses)}
    ${fieldText('a-rel', 'Related project or certification domain', 'related', a.related, 'PF-002, or PCA 1.3 High availability and DR')}
    ${fieldText('a-svc', 'Services (comma separated)', 'services', a.services.join(', '), '', 'csv')}
    ${fieldArea('a-lnk', 'Links (diagrams, requirements, related ADRs)', 'links', a.links, 2)}
  </div>`;
}
function adrCompare(a) {
  const n = a.options; const rows = [['Summary', 'summary'], ['Pros', 'pros'], ['Cons', 'cons'], ['Why rejected', 'rejectedWhy']];
  return `<section class="card"><h2>Options side by side</h2><p class="small muted" style="margin-bottom:12px">Read across each row. If one option has no cons, or a rejected option has no reason, the comparison is not finished. Edit in the Write tab.</p>
    <div class="cmp-wrap"><table class="cmp"><thead><tr><th scope="col"></th>${n.map((o, i) => `<th scope="col" class="${i === a.chosen ? 'chosen' : ''}">${esc(o.name || `Option ${i + 1}`)}${i === a.chosen ? '<span class="chip ok-chip">Chosen</span>' : ''}</th>`).join('')}</tr></thead>
    <tbody>${rows.map(([l, k]) => `<tr><th scope="row">${l}</th>${n.map((o, i) => `<td class="${i === a.chosen ? 'chosen' : ''}">${k === 'rejectedWhy' && i === a.chosen ? '<span class="faint">—</span>' : o[k] ? esc(o[k]) : '<span class="missing">Missing</span>'}</td>`).join('')}</tr>`).join('')}</tbody></table></div>
    <h3 style="margin-top:16px">Lenses applied</h3><div class="chips">${LENSES.map(([k, l]) => `<span class="chip ${a.lenses.includes(k) ? 'strong' : ''}">${l}${a.lenses.includes(k) ? '' : ' (not considered)'}</span>`).join('')}</div></section>`;
}
function adrQualityView(a, qy) {
  return `<section class="card"><h2>Quality rubric</h2><p class="small muted" style="margin-bottom:12px">Checks the structure good ADRs share. It cannot judge whether the decision is right; a peer review can.</p>
    <div class="stack">${qy.dims.map(d => `<div><div class="row"><strong>${d.name}</strong><span class="spacer"></span><span>${d.score}/25</span></div><div class="bar ${band(d.score * 4)}" style="margin:6px 0"><i style="width:${d.score * 4}%"></i></div>${d.tips.length ? `<ul class="plain-list small">${d.tips.map(t => `<li>${esc(t)}</li>`).join('')}</ul>` : '<p class="small muted">Nothing missing.</p>'}</div>`).join('')}</div></section>`;
}

/* ---------- Portfolio builder */
VIEWS.portfolio = (arg) => {
  if (arg) return pfEditor(arg);
  const ps = portfolioScore();
  return `
  <div class="page-head"><div><h1>Portfolio builder</h1><p class="muted">Projects that prove capability: the business problem, the architecture, the decisions and trade-offs, and a measurable outcome. Each project produces a case study, résumé bullets, a LinkedIn summary, and interview notes.</p></div><button class="btn primary" data-action="x-pf-new">Blank project</button></div>
  <div class="card" style="margin-bottom:16px"><div class="row"><strong>Portfolio depth ${ps.score}/100</strong><span class="small muted">${esc(ps.detail)}</span></div></div>
  <section class="card" aria-labelledby="h-pft"><h2 id="h-pft">Start from a template</h2><div class="grid g-3">${PF_TEMPLATES.map(t => `<button class="tpl-card" data-action="x-pf-tpl" data-v="${t.key}"><strong>${esc(t.title)}</strong><span class="small muted">${esc(t.provider)} · ${t.services.slice(0, 3).join(', ')}</span></button>`).join('')}</div></section>
  ${S.ws.portfolio.length ? `<div class="grid g-2" style="margin-top:20px">${S.ws.portfolio.map(p => { const dp = pfDepth(p); return `<a class="card lab-card" href="#/portfolio/${p.id}"><div class="row"><span class="small muted">${esc(p.id)} · ${esc(p.provider || p.type)}</span><span class="spacer"></span><span class="chip ${p.status !== 'draft' ? 'strong' : ''}">${esc(PF_STATUS3.find(x => x[0] === p.status)[1])}</span></div><h3>${esc(p.title || 'Untitled project')}</h3><div class="bar ${band(dp.score)}"><i style="width:${dp.score}%"></i></div><p class="small muted" style="margin-top:6px">Depth ${dp.score}%${dp.missing.length ? `. Next: ${esc(dp.missing[0].toLowerCase())}` : ''}</p></a>`; }).join('')}</div>` : ''}`;
};
function pfEditor(id) {
  const p = S.ws.portfolio.find(x => x.id === id); if (!p) return emptyState('Project not found', 'Restore the workspace that contains it.', '<a class="btn" href="#/portfolio">Portfolio</a>');
  const dp = pfDepth(p); const tab = S.p3.pfTab;
  return `
  <div class="run-head"><a class="btn sm ghost" href="#/portfolio">← Portfolio</a><span class="title">${esc(p.id)}</span><span class="spacer"></span><span class="chip strong" id="liveScore">Depth ${dp.score}%</span><button class="btn sm danger" data-action="x-pf-del" data-id="${p.id}">Delete</button></div>
  ${p.status !== 'draft' ? `<div class="next-card"><strong>${p.status === 'interview' ? 'Interview-ready.' : 'Portfolio-ready.'}</strong> <span class="small">Use it on your résumé and LinkedIn, and link it to a story.</span><div class="row"><button class="btn sm" data-action="x-pf-tab" data-v="outputs" data-out="resume" data-id="${p.id}">Résumé bullets</button><button class="btn sm" data-action="x-pf-tab" data-v="outputs" data-out="linkedin" data-id="${p.id}">LinkedIn summary</button><button class="btn sm ghost" data-action="x-story-from-pf" data-id="${p.id}">Start a STAR story</button></div></div>` : ''}
  ${tabsBar('x-pf-tab', tab, [['write', 'Write'], ['outputs', 'Outputs']])}
  <div style="margin-top:14px">${tab === 'outputs' ? outputsPanel('pf', p, PF_OUTS) : pfWrite(p, dp)}</div>`;
}
function pfWrite(p, dp) {
  const t = PF_TEMPLATES.find(x => x.key === p.template); const h = t ? t.hints : {};
  const attempted = LAB_SCENARIOS.filter(s => S.ws.labs.some(l => l.sid === s.id) || p.labIds.includes(s.id));
  return `<div class="two-pane"><div class="card form-card" data-rec="pf:${p.id}">
    <h3 class="sec-h">Overview</h3>
    ${fieldText('p-title', 'Project title', 'title', p.title)}
    ${fieldText('p-sum', 'One-line summary', 'summary', p.summary, 'A checkout platform that survives a regional outage without overselling')}
    <div class="grid g-3"><div class="field fgap"><label for="p-type">Type</label><select id="p-type" data-bind="type">${opts(['Lab case study', 'Hands-on build', 'Work project', 'Certification capstone', 'Open-source contribution'], p.type)}</select></div><div class="field fgap"><label for="p-prov">Platform</label><select id="p-prov" data-bind="provider">${opts(['', ...PROVIDERS, 'Multi-cloud'], p.provider)}</select></div><div class="field fgap"><label for="p-status">Status</label><select id="p-status" data-bind="status">${opts(PF_STATUS3, p.status)}</select></div></div>
    ${fieldText('p-role', 'My role', 'role', p.role, 'Designed and built solo; reviewed by a peer')}
    ${fieldArea('p-prob', 'Business problem', 'problem', p.problem, 4, h.problem || 'Who had the problem, why it mattered, and what success looks like.')}
    ${fieldArea('p-con', 'Constraints', 'constraints', p.constraints, 2, 'Budget, deadline, compliance, team skills.')}
    <h3 class="sec-h">Architecture</h3>
    ${fieldArea('p-arch', 'Architecture overview', 'architecture', p.architecture, 6, h.architecture || 'Walk through the request or data flow and why each component is there.')}
    <div class="field fgap"><span class="lbl">Diagram</span>${p.diagram ? `<img class="diagram" src="${p.diagram}" alt="${esc(p.diagramNote || 'Architecture diagram')}"><div class="row" style="margin-top:8px"><button class="btn sm" data-action="x-pf-diag" data-id="${p.id}">Replace image</button><button class="btn sm ghost" data-action="x-pf-diag-del" data-id="${p.id}">Remove image</button></div>` : `<div class="diagram-slot"><p class="small muted">Upload a PNG or JPG of your diagram (under 2 MB), or describe it and link to it below.</p><button class="btn sm" data-action="x-pf-diag" data-id="${p.id}">Upload diagram</button></div>`}</div>
    ${fieldText('p-dn', 'Diagram caption or link', 'diagramNote', p.diagramNote, 'Request flow across three regions (draw.io link)')}
    ${fieldText('p-svc', 'Cloud services used (comma separated)', 'services', p.services.join(', '), '', 'csv')}
    <h3 class="sec-h">Considerations</h3>
    ${fieldArea('p-sec', 'Security', 'security', p.security, 3, h.security || 'Identity, network boundaries, encryption, compliance scope.')}
    ${fieldArea('p-res', 'Resilience', 'resilience', p.resilience, 3, h.resilience || 'Failure domains, recovery targets, and how you would test them.')}
    ${fieldArea('p-cost', 'Cost', 'cost', p.cost, 3, h.cost || 'Main cost drivers and how you would control them.')}
    ${fieldArea('p-mig', 'Migration and operations', 'migration', p.migration, 3, h.migration || 'How it gets deployed, monitored, and changed.')}
    ${fieldArea('p-to', 'Key trade-offs', 'tradeoffs', p.tradeoffs, 3, 'What you chose not to do, and why.')}
    <h3 class="sec-h">Results</h3>
    ${fieldArea('p-out', 'Outcome (use real numbers)', 'outcome', p.outcome, 3, 'Load test sustained 1,200 RPS at p95 180 ms; estimated $310/month.')}
    ${fieldArea('p-les', 'Lessons learned', 'lessons', p.lessons, 3)}
    ${fieldArea('p-art', 'Artifacts (repository, diagram, demo links)', 'artifacts', p.artifacts, 2, 'https://github.com/…')}
    <h3 class="sec-h">Proof links</h3>
    ${S.ws.adrs.length ? checkGroup('Related ADRs', 'adrIds', S.ws.adrs.map(a => [a.id, `${a.id}: ${a.title || 'Untitled'}`]), p.adrIds) : `<p class="small muted fgap">No ADRs yet. <button class="btn sm" data-action="x-adr-tpl" data-v="${t ? t.adr : 'compute'}">Start a related ADR</button></p>`}
    ${checkGroup('Related labs', 'labIds', (attempted.length ? attempted : LAB_SCENARIOS).map(s => [s.id, s.title]), p.labIds)}
  </div>
  <aside class="pane-side"><section class="card"><h3>To strengthen this project</h3><ul class="plain-list small" id="liveMissing">${dp.missing.map(m => `<li>${esc(m)}</li>`).join('') || '<li>Complete. Mark it portfolio-ready and use the Outputs tab.</li>'}</ul></section>
    <section class="card"><h3>What employers look for</h3><ul class="plain-list small"><li>The business problem in plain words.</li><li>Decisions with alternatives you rejected, and why.</li><li>Security, resilience, and cost thought through, not bolted on.</li><li>An honest outcome with a number, even an estimate.</li><li>For lab work, say it was a lab. It is still strong evidence.</li></ul></section></aside></div>`;
}

/* ---------- Interview arena */
const IV_TABS3 = [['practice', 'Mock questions'], ['exec', 'Executive summaries'], ['stories', 'STAR stories'], ['whiteboard', 'Whiteboard']];
VIEWS.interview = (arg = '') => {
  const [tab = 'practice', id, aud] = arg.split('/');
  if (tab === 'q' && id) return iqView3(id);
  if (tab === 'ex' && id) return execView(id, aud || 'cto');
  if (tab === 'story' && id) return storyEditor3(id);
  if (tab === 'wb' && id) return wbView3(id);
  const is = interviewScore();
  return `
  <div class="page-head"><div><h1>Interview arena</h1><p class="muted">Architect interviews test how you reason through trade-offs, whether real stories back your claims, and whether you can adjust your explanation to the listener. Answer out loud first, then write the outline.</p></div><div class="row"><span class="small muted">Readiness</span><strong style="font-size:1.4rem">${is.score}</strong></div></div>
  <div class="grid g-4" style="margin-bottom:16px">${[['Stories', is.parts.storyPart], ['Mock answers', is.parts.mockPart], ['Executive summaries', is.parts.execPart], ['Whiteboard', is.parts.wbPart]].map(([l, v]) => `<div class="card kpi"><div class="l">${l}</div><div class="bar ${band(v)}" style="margin-top:10px"><i style="width:${Math.round(v)}%"></i></div><div class="s">${Math.round(v)}/100</div></div>`).join('')}</div>
  <nav class="tabs" aria-label="Interview sections">${IV_TABS3.map(([k, l]) => `<a href="#/interview/${k}" ${tab === k ? 'aria-current="page"' : ''}>${l}</a>`).join('')}</nav>
  ${tab === 'stories' ? storiesTab3() : tab === 'whiteboard' ? wbTab3() : tab === 'exec' ? execTab() : practiceTab3()}`;
};
function lastAns(qid) { return S.ws.interview.answers.filter(a => a.qid === qid).sort((a, b) => b.t - a.t)[0]; }
function practiceTab3() {
  const f = S.p3.ivCat; const list = iqAll().filter(q => !f || q.cat === f);
  return `<div class="row" style="margin:16px 0" role="group" aria-label="Category">${['', ...IV_CATS].map(c => `<button class="chip" data-action="x-iv-cat" data-v="${esc(c)}" aria-pressed="${f === c}">${c || 'All'} (${iqAll().filter(q => !c || q.cat === c).length})</button>`).join('')}<span class="spacer"></span><button class="btn primary sm" data-action="x-iq-random">Random question</button></div>
  <div class="stack">${list.map(q => { const l = lastAns(q.id); const sc = l ? Math.round(dimAvg(l.scores)) : null; return `<a class="lib-item" href="#/interview/q/${q.id}"><div class="lib-top"><strong>${esc(q.cat)}</strong><span>${esc(compLabel(q.comp))}</span><span class="spacer"></span>${sc !== null ? `<span class="status ${sc >= 67 ? 'ok' : 'no'}">Last ${sc}/100</span>` : ''}</div><div class="qline">${esc(q.prompt)}</div></a>`; }).join('')}</div>`;
}
const rubricBlock = (kind, id, scores) => `<div class="rubric5">${RUBRIC_DIMS.map(([k, l, levels]) => `<div class="rub-item"><p class="small"><strong>${l}</strong></p><div class="seg-control lvl" role="group" aria-label="${l}">${levels.map((txt, i) => `<button type="button" data-action="x-rub" data-kind="${kind}" data-id="${id}" data-k="${k}" data-v="${i + 1}" aria-pressed="${scores[k] === i + 1}"><strong>${i + 1}</strong><span>${esc(txt)}</span></button>`).join('')}</div></div>`).join('')}</div>`;
function iqView3(id) {
  const q = iqById(id); if (!q) return emptyState('Question not found', '', '<a class="btn" href="#/interview">Interview arena</a>');
  const d = S.drafts.iq[id] ||= { text: '', followText: '', phase: 'answer', scores: {}, started: Date.now(), fu: q.followups[Math.floor(Math.random() * q.followups.length)] };
  const hist = S.ws.interview.answers.filter(a => a.qid === id).sort((a, b) => b.t - a.t);
  const stories = S.ws.interview.stories.filter(s => s.competencies.includes(q.comp));
  const scored = RUBRIC_DIMS.every(([k]) => d.scores[k]);
  return `
  <div class="run-head"><a class="btn sm ghost" href="#/interview/practice">← Questions</a><span class="title">${esc(q.cat)}</span><span class="spacer"></span><span class="timer" id="p2timer" data-start="${d.started}" data-limit="3"></span></div>
  <div class="two-pane"><div class="pane-main" data-rec="iq:${id}">
    <section class="card"><p class="qtext" style="font-size:1.2rem">${esc(q.prompt)}</p><p class="small muted" style="margin-top:8px">Say your answer out loud first, aiming for two to three minutes. Then capture the outline you used.</p>
      ${fieldArea('iq-text', 'Your outline', 'text', d.text, 6)}
      ${d.phase === 'answer' ? `<div class="row" style="margin-top:12px"><button class="btn primary" data-action="x-iq-phase" data-id="${id}" data-v="followup">I've answered</button></div>` : ''}</section>
    ${d.phase !== 'answer' ? `<section class="card followup"><h3>Follow-up from the interviewer</h3><p class="qtext">${esc(d.fu)}</p>${fieldArea('iq-fu', 'Your follow-up answer', 'followText', d.followText, 3)}${d.phase === 'followup' ? `<div class="row" style="margin-top:12px"><button class="btn primary" data-action="x-iq-phase" data-id="${id}" data-v="review">Compare with strong and weak answers</button></div>` : ''}</section>` : ''}
    ${d.phase === 'review' ? `<section class="card"><h3>What a strong answer shows</h3><ul class="plain-list">${q.signals.map(s => `<li>${esc(s)}</li>`).join('')}</ul>
      <div class="sw"><div class="sw-strong"><span class="tl">Strong answer</span><p>${esc(q.strong)}</p></div><div class="sw-weak"><span class="tl">Weak answer</span><p>${esc(q.weak)}</p></div></div></section>
      <section class="card"><h3>Score yourself</h3><p class="small muted" style="margin-bottom:10px">Score what you actually said, not what you meant.</p>${rubricBlock('iq', id, d.scores)}
      <div class="row" style="margin-top:14px"><button class="btn primary" data-action="x-iq-save" data-id="${id}" ${scored ? '' : 'disabled'}>Save attempt</button><button class="btn" data-action="x-iq-random">Next question</button></div></section>` : ''}
  </div>
  <aside class="pane-side"><section class="card"><h3>Your proof for ${esc(compLabel(q.comp))}</h3>${stories.length ? `<ul class="plain-list small">${stories.map(s => `<li><a href="#/interview/story/${s.id}">${esc(s.title || s.id)}</a> · ${STORY_STATUS.find(x => x[0] === s.status)[1]}</li>`).join('')}</ul>` : `<p class="small muted">No story yet for this competency.</p><button class="btn sm" data-action="x-story-new" data-comp="${q.comp}" style="margin-top:8px">Write one</button>`}</section>
    ${hist.length ? `<section class="card"><h3>Past attempts</h3><div class="list">${hist.map(a => `<div class="list-item"><span class="small">${esc(fmtDate(a.t))}</span><strong>${Math.round(dimAvg(a.scores))}/100</strong></div>`).join('')}</div></section>` : ''}</aside></div>`;
}
function execTab() {
  return `<p class="small muted" style="margin:16px 0">Same topic, three listeners. Architects are judged on whether a CTO, an engineer, and a business owner each leave with what they need.</p>
  <div class="stack">${EXEC_TOPICS.map(t => `<div class="card"><strong>${esc(t.topic)}</strong><div class="row" style="margin-top:10px">${Object.entries(AUDIENCES).map(([k, a]) => { const done = S.ws.interview.exec.filter(x => x.tid === t.id && x.aud === k); return `<a class="btn sm ${done.length ? '' : 'ghost'}" href="#/interview/ex/${t.id}/${k}">${a.label}${done.length ? ` · ${Math.round(dimAvg(done[done.length - 1].scores))}` : ''}</a>`; }).join('')}</div></div>`).join('')}</div>`;
}
function execView(tid, aud) {
  const t = EXEC_TOPICS.find(x => x.id === tid), A = AUDIENCES[aud]; if (!t || !A) return emptyState('Prompt not found', '', '<a class="btn" href="#/interview/exec">Executive summaries</a>');
  const key = tid + ':' + aud; const d = S.drafts.iq[key] ||= { text: '', phase: 'answer', scores: {}, started: Date.now() };
  return `<div class="run-head"><a class="btn sm ghost" href="#/interview/exec">← Topics</a><span class="title">Explain to a ${esc(A.label)}</span><span class="spacer"></span><span class="timer" id="p2timer" data-start="${d.started}" data-limit="2"></span></div>
  <div class="two-pane"><div class="pane-main" data-rec="iq:${key}"><section class="card"><p class="qtext" style="font-size:1.2rem">${esc(t.topic)}</p><p class="small muted" style="margin-top:6px">Your listener: <strong>${esc(A.label)}</strong>. ${esc(A.format)}</p>
    ${fieldArea('ex-text', 'Your explanation (outline or script)', 'text', d.text, 7)}
    ${d.phase === 'answer' ? `<div class="row" style="margin-top:12px"><button class="btn primary" data-action="x-ex-review" data-k="${key}">Check against the audience</button></div>` : ''}</section>
    ${d.phase === 'review' ? `<section class="card"><h3>What a ${esc(A.label)} needs</h3><ul class="plain-list">${A.cares.map(c => `<li>${esc(c)}</li>`).join('')}</ul><h3 style="margin-top:12px">Points worth covering</h3><ul class="plain-list">${t.points.map(c => `<li>${esc(c)}</li>`).join('')}</ul></section>
      <section class="card"><h3>Score yourself</h3>${rubricBlock('ex', key, d.scores)}<div class="row" style="margin-top:14px"><button class="btn primary" data-action="x-ex-save" data-k="${key}" ${RUBRIC_DIMS.every(([k]) => d.scores[k]) ? '' : 'disabled'}>Save</button>${Object.keys(AUDIENCES).filter(k => k !== aud).map(k => `<a class="btn" href="#/interview/ex/${tid}/${k}">Now explain it to a ${AUDIENCES[k].label}</a>`).join('')}</div></section>` : ''}</div>
    <aside class="pane-side"><section class="card"><h3>Audience switch</h3><ul class="plain-list small"><li><strong>CTO:</strong> recommendation, options, risk, cost, the ask.</li><li><strong>Engineer:</strong> mechanics, failure modes, operational impact.</li><li><strong>Owner:</strong> monthly cost, plain risk, next step.</li></ul></section></aside></div>`;
}
function storiesTab3() {
  const cov = {}; S.ws.interview.stories.forEach(s => s.competencies.forEach(c => { cov[c] ||= { any: 0, good: 0 }; cov[c].any++; if (storyStrong(s) && s.status !== 'drafted') cov[c].good++; }));
  return `<div class="row" style="margin:16px 0"><strong>Competency coverage</strong><span class="spacer"></span><button class="btn primary sm" data-action="x-story-new">Blank story</button>${S.ws.interview.stories.length ? '<button class="btn sm" data-action="x-exp-stories">Export summaries</button>' : ''}</div>
  <div class="comp-grid">${COMPETENCIES.map(([k, l]) => { const c = cov[k]; return `<div class="comp ${c?.good ? 'ok' : c?.any ? 'part' : ''}"><span>${esc(l)}</span><span class="small">${c ? `${c.good} polished / ${c.any}` : 'No story'}</span></div>`; }).join('')}</div>
  <section class="card" style="margin-top:20px"><h2>${bgLabel() ? `From your ${esc(bgLabel().toLowerCase())} experience` : 'From your previous experience'}</h2><p class="small muted" style="margin-bottom:12px">${esc(bgInfo()?.seedIntro || 'Tell CloudWalker your background in Career → Profile to get seeds that match it.')} Each seed shows how it translates and gives you prompts for each STAR part. Practice material, not exam content.${bgLabel() ? '' : ' <a href="#/career/profile">Set your background</a>'}</p>
    <div class="grid g-2">${seedsFor(cwProfile().background).map(fillSeed).map(s => { const used = S.ws.interview.stories.some(x => x.seed === s.id); return `<div class="seed"><strong>${esc(s.title)}</strong><p class="small muted">${esc(s.translate)}</p><div class="chips">${s.comps.map(c => `<span class="chip">${esc(compLabel(c))}</span>`).join('')}</div><button class="btn sm ${used ? 'ghost' : ''}" data-action="x-story-seed" data-v="${s.id}">${used ? 'Write another' : 'Start this story'}</button></div>`; }).join('')}</div></section>
  ${S.ws.interview.stories.length ? `<h2 style="margin:20px 0 12px">Your stories</h2><div class="stack">${S.ws.interview.stories.map(s => `<a class="lib-item" href="#/interview/story/${s.id}"><div class="lib-top"><strong>${esc(s.id)}</strong><span class="chip ${s.status === 'ready' ? 'strong' : ''}">${STORY_STATUS.find(x => x[0] === s.status)[1]}</span>${storyStrong(s) ? '' : '<span class="status flag">Needs detail</span>'}<span>${s.competencies.map(compLabel).join(', ')}</span></div><div class="qline">${esc(s.title || 'Untitled story')}</div></a>`).join('')}</div>` : ''}`;
}
function storyEditor3(id) {
  const s = S.ws.interview.stories.find(x => x.id === id); if (!s) return emptyState('Story not found', '', '<a class="btn" href="#/interview/stories">Stories</a>');
  const seed = allSeeds().find(x => x.id === s.seed); const P = seed ? fillSeed(seed).prompts : ['Where and when; the context needed to understand the stakes.', 'What you specifically were responsible for.', 'What you did, in first person: decisions, trade-offs, who you persuaded and how.', 'What changed, with numbers. What you learned.'];
  const part = (k, label, i) => `<div class="field fgap"><label for="st-${k}">${label} <span class="faint small" id="wc-${k}">${words(s[k])} words</span></label><textarea id="st-${k}" rows="${k === 'action' ? 6 : 3}" data-bind="${k}" ${TA} placeholder="${esc(P[i])}">${esc(s[k])}</textarea></div>`;
  const tab = S.p3.storyTab || 'write';
  return `
  <div class="run-head"><a class="btn sm ghost" href="#/interview/stories">← Stories</a><span class="title">${esc(s.id)}</span><span class="spacer"></span><span class="chip strong" id="liveScore">${storyStrong(s) ? 'Detailed enough' : 'Needs detail'}</span><button class="btn sm danger" data-action="x-story-del" data-id="${s.id}">Delete</button></div>
  ${tabsBar('x-story-tab', tab, [['write', 'Write'], ['outputs', 'Outputs']])}
  <div style="margin-top:14px">${tab === 'outputs' ? outputsPanel('story', s, STORY_OUTS) : `<div class="two-pane"><div class="card form-card" data-rec="story:${s.id}">
    ${fieldText('st-title', 'Title (how you would refer to it)', 'title', s.title, 'Recovered a failed rollout before a client deadline')}
    <div class="grid g-2"><div class="field fgap"><label for="st-src">Source</label><select id="st-src" data-bind="source">${opts(uniq([storySourceLabel(), ...STORY_SOURCES, s.source].filter(Boolean)), s.source)}</select></div><div class="field fgap"><label for="st-status">Status</label><select id="st-status" data-bind="status">${opts(STORY_STATUS, s.status)}</select></div></div>
    ${checkGroup('Competencies it demonstrates', 'competencies', COMPETENCIES, s.competencies)}
    ${part('situation', 'Situation', 0)}${part('task', 'Task', 1)}${part('action', 'Action', 2)}${part('result', 'Result', 3)}
    ${fieldArea('st-tr', 'Why it matters for an architect role', 'translation', s.translation, 2, seed ? seed.translate : 'Connect the skill to architecture work.')}
    <h3 class="sec-h">Proof to mention</h3>
    ${S.ws.adrs.length ? checkGroup('ADRs', 'adrIds', S.ws.adrs.map(a => [a.id, `${a.id}: ${a.title || 'Untitled'}`]), s.adrIds) : ''}
    ${S.ws.portfolio.length ? checkGroup('Portfolio projects', 'pfIds', S.ws.portfolio.map(p => [p.id, `${p.id}: ${p.title || 'Untitled'}`]), s.pfIds) : ''}
    ${checkGroup('Labs', 'labIds', LAB_SCENARIOS.filter(l => S.ws.labs.some(x => x.sid === l.id) || s.labIds.includes(l.id)).map(l => [l.id, l.title]), s.labIds)}
  </div><aside class="pane-side"><section class="card"><h3>30-second version</h3><p class="small" id="livePreview">${esc(storyShort(s)) || '<span class="muted">Appears as you write.</span>'}</p></section>
    <section class="card"><h3>Before marking it interview-ready</h3><ul class="plain-list small"><li>Each STAR part has 12+ words; the result has a number.</li><li>Say "I", not "we", for your actions.</li><li>Name one trade-off you made and why.</li><li>Have an answer to "What would you do differently?"</li><li>Practice it aloud twice under two minutes.</li></ul></section></aside></div>`}</div>`;
}
function wbTab3() {
  return `<p class="small muted" style="margin:16px 0">Set the timer, sketch on paper or a second screen, and type your notes. Afterward, tick each item you actually covered.</p>
  <div class="grid g-2">${WHITEBOARD_PROMPTS.map(p => { const done = S.ws.interview.boards.filter(b => b.pid === p.id); const best = done.length ? Math.max(...done.map(b => pct(Object.values(b.checks).filter(Boolean).length, p.checklist.length))) : 0; return `<a class="card lab-card" href="#/interview/wb/${p.id}"><div class="row"><span class="small muted">${p.minutes} min</span><span class="spacer"></span>${done.length ? `<span class="status ${best >= 80 ? 'ok' : 'flag'}">Best ${best}%</span>` : ''}</div><h3>${esc(p.title)}</h3><p class="small muted lab-brief">${esc(p.prompt)}</p></a>`; }).join('')}</div>`;
}
function wbView3(id) {
  const p = WHITEBOARD_PROMPTS.find(x => x.id === id); if (!p) return emptyState('Prompt not found', '', '<a class="btn" href="#/interview/whiteboard">Whiteboard</a>');
  const d = S.drafts.wb[id] ||= { notes: '', checks: {}, started: 0 };
  return `<div class="run-head"><a class="btn sm ghost" href="#/interview/whiteboard">← Prompts</a><span class="title">${esc(p.title)}</span><span class="spacer"></span><span class="timer" id="p2timer" data-start="${d.started || ''}" data-limit="${p.minutes}">${d.started ? '' : `${p.minutes}:00`}</span>${d.started ? '' : `<button class="btn sm" data-action="x-wb-start" data-id="${id}">Start timer</button>`}</div>
  <div class="two-pane"><div class="pane-main" data-rec="wb:${id}"><section class="card"><p class="qtext">${esc(p.prompt)}</p>${fieldArea('wb-notes', 'Design notes', 'notes', d.notes, 14, 'Requirements → estimates → API → components → data → scaling → failure modes → security → cost → trade-offs')}</section></div>
  <aside class="pane-side"><section class="card"><h2>Coverage checklist</h2><div class="stack" style="gap:6px">${p.checklist.map((c, i) => `<label class="check" style="width:100%"><input type="checkbox" data-wbcheck="${id}" value="${i}" ${d.checks[i] ? 'checked' : ''}> ${esc(c)}</label>`).join('')}</div>
    <p style="margin-top:12px"><strong id="liveScore">${pct(Object.values(d.checks).filter(Boolean).length, p.checklist.length)}%</strong> <span class="small muted">covered</span></p><div class="row" style="margin-top:10px"><button class="btn primary" data-action="x-wb-save" data-id="${id}">Save session</button></div></section></aside></div>`;
}

/* ---------- Binding targets and live refresh */
function getRec(type, id) {
  const W = S.ws;
  return ({ adr: () => W.adrs.find(x => x.id === id), pf: () => W.portfolio.find(x => x.id === id), story: () => W.interview.stories.find(x => x.id === id), app: () => W.career.apps.find(x => x.id === id), role: () => W.career.roles.find(x => x.id === id), ms: () => W.career.milestones.find(x => x.id === id), week: () => weekObj(+id), profile: () => W.career.profile, labdraft: () => labDraft(id), out: () => W.outputs.find(x => x.id === id), ref: () => W.reflections.find(x => x.id === id), iq: () => S.drafts.iq[id], wb: () => S.drafts.wb[id] }[type] || (() => null))();
}
function liveRefresh(type, rec) {
  const sc = $('#liveScore'), mi = $('#liveMissing'), pv = $('#livePreview');
  if (['adr', 'pf', 'story', 'out', 'ref'].includes(type)) { rec.updated = Date.now(); touch(rec.id); }
  if (type === 'adr' && sc) sc.textContent = `Quality ${adrQuality(rec).total}/100`;
  if (type === 'pf') { const q = pfDepth(rec); sc && (sc.textContent = 'Depth ' + q.score + '%'); mi && (mi.innerHTML = q.missing.map(m => `<li>${esc(m)}</li>`).join('') || '<li>Complete. Mark it portfolio-ready and use the Outputs tab.</li>'); }
  if (type === 'story') { sc && (sc.textContent = storyStrong(rec) ? 'Detailed enough' : 'Needs detail'); pv && (pv.textContent = storyShort(rec)); ['situation', 'task', 'action', 'result'].forEach(k => { const w = $('#wc-' + k); w && (w.textContent = words(rec[k]) + ' words'); }); }
}
/* Selects that change the layout re-render the view (chosen option, status, type). */
document.addEventListener('change', e => {
  const el = e.target;
  if (el.matches('#a-ch, #p-status, #st-status')) { const id = el.id; render(); $('#' + id)?.focus(); }
  if (el.dataset.p3) { S.p3[el.dataset.p3] = el.value; render(); $('#' + el.id)?.focus(); }
});
document.addEventListener('input', e => {
  const el = e.target;
  if (el.dataset.rsText && S.rs) S.rs.text = el.value;
  if (el.dataset.resetInput) { const b = $('[data-action="x-reset-do"]'); if (b) b.disabled = el.value.trim() !== 'RESET'; }
});

/* ---------- Lab hand-off after a saved attempt */
const _labView = VIEWS.lab;
VIEWS.lab = arg => {
  const html = _labView(arg).replaceAll('data-action="lab-adr"', 'data-action="x-lab-adr"').replaceAll('data-action="lab-pf"', 'data-action="x-lab-pf"');
  if (!arg || S.p3.labSaved !== arg) return html;
  const s = LAB_SCENARIOS.find(x => x.id === arg); const best = labBest()[arg];
  const t = PF_TEMPLATES.find(x => x.lab === arg);
  return `<div class="next-card"><strong>Attempt saved: ${best}% best.</strong> <span class="small">Turn the work into proof while it is fresh.</span><div class="row"><button class="btn sm primary" data-action="x-lab-adr" data-id="${arg}">Create ADR</button><button class="btn sm" data-action="x-lab-pf" data-id="${arg}">Create portfolio entry${t ? ` (${esc(t.title)})` : ''}</button><button class="btn sm ghost" data-action="x-story-from-lab" data-id="${arg}">Start a STAR story</button></div></div>` + html;
};

/* ---------- Reports */
function progressReport() {
  const sc = allScores(); const rs = retentionStats();
  const lines = [`# Study progress report`, ``, `Generated ${fmtDate(Date.now())}. Judgment, portfolio, and interview scores include self-assessed rubric ratings.`, ``, `## Readiness`, ...sc.map(s => `- **${s.label}:** ${s.value}/100. ${s.detail}`), ``, `## Certifications`];
  for (const e of activeExams()) { const t = totals(q => q.exam_code === e.code); if (!t.att) continue; lines.push(`### ${e.code}`, `- Readiness ${examReadiness(e.code).score}/100; accuracy ${t.acc}% over ${t.att} answers; ${t.uniqSeen}/${examQs(e.code).length} questions seen; retention health ${retentionStats(e.code).health}`); domainsOf(e.code).forEach(d => { const dt = totals(q => q.exam_code === e.code && q.domain === d); if (dt.att) lines.push(`- ${dShort(d)}: ${dt.acc}% (${dt.cor}/${dt.att})`); }); }
  lines.push('', '## Retention', `- ${rs.cards} cards, ${rs.due} due, ${rs.overdue} overdue, ${rs.mature} at 14+ day intervals, recall ${rs.recall}%`, '', '## Architecture lab');
  Object.entries(labBest()).forEach(([sid, v]) => lines.push(`- ${LAB_SCENARIOS.find(s => s.id === sid)?.title}: best ${v}%`));
  lines.push('', '## Proof', `- ${S.ws.adrs.length} ADRs (avg quality ${Math.round(avg(S.ws.adrs.map(a => adrQuality(a).total)))}), ${S.ws.portfolio.length} portfolio projects, ${S.ws.interview.stories.length} STAR stories (${S.ws.interview.stories.filter(s => s.status === 'ready').length} interview-ready)`);
  return lines.join('\n');
}
const bundleMd = () => [`# CloudWalker artifact bundle`, `Exported ${fmtDate(Date.now())}.`, '', '# Architecture decision records', ...S.ws.adrs.map(adrMarkdown), '', '# Portfolio case studies', ...S.ws.portfolio.map(pfCaseStudy), '', '# Interview stories', ...S.ws.interview.stories.map(storySummary), '', labNotesMarkdown()].join('\n\n');
const resumeMd = () => `# Résumé bullet drafts\n\n` + S.ws.portfolio.map(p => `## ${p.title || p.id}\n\n${pfResume(p)}`).join('\n\n');
function weekObj(key) { return S.ws.career.weeks[key] ||= { goals: [], planned: { cert: 0, lab: 0, portfolio: 0, interview: 0, career: 0 }, actual: { cert: 0, lab: 0, portfolio: 0, interview: 0, career: 0 }, reflection: '' }; }
const WEEK_CATS = [['cert', 'Certification'], ['lab', 'Architecture lab'], ['portfolio', 'Portfolio'], ['interview', 'Interview'], ['career', 'Applications']];
const STAGES = ['Researching', 'Applied', 'Recruiter screen', 'Technical', 'Architecture / onsite', 'Offer', 'Closed'];

/* ---------- Diagram upload (in memory, travels in the workspace file) */
const diagInput = document.createElement('input'); diagInput.type = 'file'; diagInput.accept = 'image/png,image/jpeg,image/webp,image/svg+xml'; diagInput.className = 'sr-only'; diagInput.tabIndex = -1; diagInput.setAttribute('aria-hidden', 'true'); document.body.append(diagInput);
diagInput.addEventListener('change', () => {
  const f = diagInput.files[0]; const id = diagInput.dataset.id; diagInput.value = ''; if (!f) return;
  if (f.size > 2 * 1024 * 1024) { showStatus(`That image is ${(f.size / 1048576).toFixed(1)} MB. Use one under 2 MB so the workspace file stays small.`); return; }
  const rd = new FileReader(); rd.onload = () => { const p = S.ws.portfolio.find(x => x.id === id); if (!p) return; p.diagram = rd.result; p.updated = Date.now(); touch(id); markDirty(); render(); showStatus('Diagram added.'); }; rd.readAsDataURL(f);
});

/* ---------- Actions */
document.addEventListener('click', e => {
  const b = e.target.closest('[data-action]'); if (!b) return; const d = b.dataset; const a = d.action;
  const exp = (name, text, type) => { downloadText(name, text, type); showStatus(`Downloaded ${name}.`); };
  const fx = {
    'x-back': () => history.length > 1 ? history.back() : go('dashboard'),
    'x-status-close': () => { S.p3.status = null; $('#statusSlot').innerHTML = ''; },
    'x-snap-now': () => { snapshot('Manual backup'); render(); showStatus('Backup taken. It stays in memory until you close the tab.'); },
    'x-snap-restore': () => restoreSnap(d.v),
    'x-reset-arm': () => { S.p3.resetArmed = d.v; render(); $('#resetType')?.focus(); },
    'x-reset-cancel': () => { S.p3.resetArmed = ''; render(); },
    'x-reset-do': () => { if ($('#resetType')?.value.trim() === 'RESET') doReset(d.v); },
    'x-exp-artifacts': artifactsExport,
    'x-exp-bundle': () => exp(`cloudwalker-artifacts-${stamp()}.md`, bundleMd()),
    'x-exp-adrs': () => exp(`adrs-${stamp()}.md`, S.ws.adrs.map(adrMarkdown).join('\n\n---\n\n') || '# No ADRs yet'),
    'x-exp-cases': () => exp(`case-studies-${stamp()}.md`, S.ws.portfolio.map(pfCaseStudy).join('\n\n---\n\n') || '# No projects yet'),
    'x-exp-resume': () => exp(`resume-bullets-${stamp()}.md`, resumeMd()),
    'x-exp-site': () => exp(`portfolio-${slug(S.ws.career.profile.name || 'site')}.html`, siteHtml(S.ws.portfolio.filter(p => p.status !== 'draft')), 'text/html'),
    'x-exp-stories': () => exp(`interview-stories-${stamp()}.md`, `# Interview stories\n\n` + S.ws.interview.stories.map(storySummary).join('\n\n')),
    'x-exp-labs': () => exp(`lab-notes-${stamp()}.md`, labNotesMarkdown()),
    'x-exp-queue': () => exp(`review-queue-${stamp()}.md`, queueMarkdown({ exam: S.p3.rsExam })),
    'x-exp-weak': () => exp(`domain-weakness-${stamp()}.md`, weaknessMarkdown()),
    'x-exp-report': () => exp(`study-progress-${stamp()}.md`, progressReport()),
    'x-out-tab': () => { S.p3.outTab[d.k] = d.v; render(); },
    'x-copy': copyOut,
    'x-dl-out': () => exp(`${d.name}.${d.ext}`, $('#outText').value, d.ext === 'md' ? 'text/markdown' : 'text/plain'),
    /* retention */
    'x-rs-min': () => { S.p3.rsMinutes = +d.v; render(); },
    'x-qtab': () => { S.p3.queueTab = d.v; render(); },
    'x-rs-daily': () => startRs(dailyPlan(S.p3.rsMinutes, S.p3.rsExam), `${S.p3.rsMinutes}-minute daily review`),
    'x-rs-queue': () => { const ids = queues({ exam: S.p3.rsExam })[d.v].slice(0, 20); const mode = { missed: 'mcq', low: 'compare', due: 'recall', unseen: 'mcq' }[d.v]; startRs(ids.map((id, i) => ({ id, mode: d.v === 'low' && i % 2 ? 'recall' : mode })), `${QUEUE_TABS.find(x => x[0] === d.v)[1]} queue`); },
    'x-rs-one': () => startRs([{ id: d.id, mode: d.mode }], `${MODE_LABEL[d.mode]} review`),
    'x-rs-domain': () => startRs(dailyPlan(20, d.exam, d.domain), `Targeted: ${d.exam} ${dShort(d.domain)}`),
    'x-rs-mcq': () => { const r = S.rs; if (r.phase !== 'q') return; const it = r.items[r.idx]; const q = Q(it.id); r.choice = +d.i; record(it.id, r.choice, 'retention', Date.now() - (r.shown || r.started)); r.phase = 'a'; r.results.push({ id: it.id, g: r.choice === q.correct_index ? 3 : 1 }); render(); $('.explain')?.setAttribute('tabindex', '-1'); $('.explain')?.focus(); },
    'x-rs-conf': () => { const it = S.rs.items[S.rs.idx]; S.progress.confidence[it.id] = d.v; srsOnConfidence(it.id, d.v); const last = S.rs.results[S.rs.results.length - 1]; if (last && last.g !== 1) last.g = { high: 4, medium: 3, low: 2 }[d.v]; $$('[data-action="x-rs-conf"]').forEach(x => x.setAttribute('aria-pressed', String(x.dataset.v === d.v))); },
    'x-rs-next': () => { const r = S.rs; r.idx++; r.phase = 'q'; r.choice = null; r.text = ''; r.shown = Date.now(); render(); $('#qtext')?.focus(); },
    'x-rs-reveal': () => { S.rs.phase = 'a'; render(); $('.grade')?.focus(); },
    'x-rs-grade': () => { const r = S.rs; const it = r.items[r.idx]; const g = +d.v; schedule(it.id, { g, mode: it.mode }); S.ws.recallLog.push({ id: it.id, t: Date.now(), grade: g, mode: it.mode }); r.results.push({ id: it.id, g }); markDirty(); fx['x-rs-next'](); },
    'x-rs-end': () => { S.rs.items = S.rs.items.slice(0, S.rs.idx + (S.rs.phase === 'a' ? 1 : 0)); S.rs.idx = S.rs.items.length; render(); },
    /* ADR */
    'x-adr-new': () => { const n = newAdr(); S.p3.adrTab = 'write'; go('adr', n.id); },
    'x-adr-tpl': () => { const n = adrFromTemplate(d.v); S.p3.adrTab = 'write'; go('adr', n.id); showStatus('Template loaded. Rewrite the context, drivers, and options for your scenario.'); },
    'x-adr-tab': () => { S.p3.adrTab = d.v; if (d.out) S.p3.outTab['adr:' + d.id] = d.out; render(); },
    'x-adr-opt': () => { S.ws.adrs.find(x => x.id === d.id).options.push(blankOpt()); markDirty(); render(); },
    'x-adr-optdel': () => { const r = S.ws.adrs.find(x => x.id === d.id); const i = +d.i; r.options.splice(i, 1); if (r.chosen === i) r.chosen = -1; else if (r.chosen > i) r.chosen--; markDirty(); render(); },
    'x-adr-del': () => { if (!confirm(`Delete ${d.id}? You can undo for a short time.`)) return; deleteWithUndo(d.id, () => { S.ws.adrs = S.ws.adrs.filter(x => x.id !== d.id); S.ws.portfolio.forEach(p => p.adrIds = p.adrIds.filter(x => x !== d.id)); S.ws.interview.stories.forEach(s => s.adrIds = s.adrIds.filter(x => x !== d.id)); }); go('adr'); },
    'x-story-from-adr': () => { const ad = S.ws.adrs.find(x => x.id === d.id); const s = newStory({ title: ad.title, source: 'Architecture lab', competencies: ['technical'], adrIds: [ad.id], situation: ad.context, action: [chosenOpt(ad) ? `I compared ${named(ad).map(o => o.name).join(', ')} and chose ${chosenOpt(ad).name}.` : '', ad.rationale].filter(Boolean).join(' ') }); S.p3.storyTab = 'write'; go('interview', 'story/' + s.id); },
    'x-pf-from-adr': () => { const ad = S.ws.adrs.find(x => x.id === d.id); const p = newPf({ title: ad.title, provider: ad.providers[0] || '', adrIds: [ad.id], services: ad.services.slice(), tradeoffs: ad.tradeoffs }); S.p3.pfTab = 'write'; go('portfolio', p.id); },
    /* Portfolio */
    'x-pf-new': () => { const p = newPf(); S.p3.pfTab = 'write'; go('portfolio', p.id); },
    'x-pf-tpl': () => { const p = pfFromTemplate(d.v); S.p3.pfTab = 'write'; go('portfolio', p.id); },
    'x-pf-tab': () => { S.p3.pfTab = d.v; if (d.out) S.p3.outTab['pf:' + d.id] = d.out; render(); },
    'x-pf-del': () => { if (!confirm(`Delete ${d.id}? You can undo for a short time.`)) return; deleteWithUndo(d.id, () => { S.ws.portfolio = S.ws.portfolio.filter(x => x.id !== d.id); S.ws.interview.stories.forEach(s => s.pfIds = s.pfIds.filter(x => x !== d.id)); }); go('portfolio'); },
    'x-pf-diag': () => { diagInput.dataset.id = d.id; diagInput.click(); },
    'x-pf-diag-del': () => { const p = S.ws.portfolio.find(x => x.id === d.id); p.diagram = ''; markDirty(); render(); },
    'x-pf-html': () => { const p = S.ws.portfolio.find(x => x.id === d.id); exp(`${p.id}-${slug(p.title)}.html`, siteHtml([p], p.title), 'text/html'); },
    'x-story-from-pf': () => { const p = S.ws.portfolio.find(x => x.id === d.id); const s = newStory({ title: p.title, source: 'Portfolio project', competencies: ['technical'], pfIds: [p.id], adrIds: p.adrIds.slice(), labIds: p.labIds.slice(), situation: p.problem, result: p.outcome }); S.p3.storyTab = 'write'; go('interview', 'story/' + s.id); },
    /* Lab hand-off */
    'lab-save': () => { S.p3.labSaved = route().arg; setTimeout(render, 0); },
    'x-lab-adr': () => { const s = LAB_SCENARIOS.find(x => x.id === d.id); const dr = labDraft(s.id); const t = PF_TEMPLATES.find(x => x.lab === s.id); const seed = { context: `${s.brief}\n\nRequirements: ${s.requirements.join('; ')}.`, source: `Architecture Lab ${s.id}: ${s.title}`, related: s.title, decision: dr.sections.architecture || '' }; const n = t ? adrFromTemplate(t.adr, seed) : newAdr({ ...seed, businessDrivers: s.requirements.slice(0, 4) }); S.p3.adrTab = 'write'; go('adr', n.id); },
    'x-lab-pf': () => { const s = LAB_SCENARIOS.find(x => x.id === d.id); const dr = labDraft(s.id); const t = PF_TEMPLATES.find(x => x.lab === s.id); const seed = { title: s.title, provider: s.cloud, type: 'Lab case study', role: 'Designed the solution as a timed architecture exercise', problem: s.brief, constraints: s.requirements.join('; '), architecture: dr.sections.architecture || '', security: dr.sections.security || '', resilience: dr.sections.reliability || '', cost: dr.sections.cost || '', tradeoffs: dr.sections.tradeoffs || '', labIds: [s.id], source: s.id }; const p = t ? pfFromTemplate(t.key, seed) : newPf(seed); S.p3.pfTab = 'write'; go('portfolio', p.id); },
    'x-story-from-lab': () => { const s = LAB_SCENARIOS.find(x => x.id === d.id); const st = newStory({ title: s.title, source: 'Architecture lab', competencies: ['technical', 'ambiguity'], labIds: [s.id], situation: s.brief }); S.p3.storyTab = 'write'; go('interview', 'story/' + st.id); },
    /* Interview */
    'x-iv-cat': () => { S.p3.ivCat = d.v; render(); },
    'x-iq-random': () => { const pool = iqAll().filter(q => !S.p3.ivCat || q.cat === S.p3.ivCat); const q = pool[Math.floor(Math.random() * pool.length)]; delete S.drafts.iq[q.id]; go('interview', 'q/' + q.id); },
    'x-iq-phase': () => { S.drafts.iq[d.id].phase = d.v; render(); },
    'x-rub': () => { const dr = S.drafts.iq[d.id]; dr.scores[d.k] = +d.v; $$(`[data-action="x-rub"][data-k="${d.k}"]`).forEach(x => x.setAttribute('aria-pressed', String(x.dataset.v === d.v))); const btn = $(d.kind === 'iq' ? '[data-action="x-iq-save"]' : '[data-action="x-ex-save"]'); if (btn) btn.disabled = !RUBRIC_DIMS.every(([k]) => dr.scores[k]); },
    'x-iq-save': () => { const dr = S.drafts.iq[d.id]; S.ws.interview.answers.push({ id: nextId('IA', S.ws.interview.answers), qid: d.id, t: Date.now(), text: dr.text, followup: dr.fu, followText: dr.followText, scores: { ...dr.scores }, seconds: Math.round((Date.now() - dr.started) / 1000) }); delete S.drafts.iq[d.id]; markDirty(); showStatus(`Saved. Score ${Math.round(dimAvg(S.ws.interview.answers[S.ws.interview.answers.length - 1].scores))}/100.`); go('interview', 'practice'); },
    'x-ex-review': () => { S.drafts.iq[d.k].phase = 'review'; render(); },
    'x-ex-save': () => { const dr = S.drafts.iq[d.k]; const [tid, aud] = d.k.split(':'); S.ws.interview.exec.push({ id: nextId('EX', S.ws.interview.exec), tid, aud, t: Date.now(), text: dr.text, scores: { ...dr.scores } }); delete S.drafts.iq[d.k]; markDirty(); showStatus('Executive summary saved.'); go('interview', 'exec'); },
    'x-story-new': () => { const s = newStory(d.comp ? { competencies: [d.comp] } : {}); S.p3.storyTab = 'write'; go('interview', 'story/' + s.id); },
    'x-story-seed': () => { const raw = allSeeds().find(x => x.id === d.v); if (!raw) return; const sd = fillSeed(raw); const s = newStory({ title: sd.title, seed: sd.id, source: storySourceLabel(), competencies: sd.comps.slice(), translation: sd.translate }); S.p3.storyTab = 'write'; go('interview', 'story/' + s.id); },
    'x-story-tab': () => { S.p3.storyTab = d.v; render(); },
    'x-story-del': () => { if (!confirm(`Delete ${d.id}? You can undo for a short time.`)) return; deleteWithUndo(d.id, () => { S.ws.interview.stories = S.ws.interview.stories.filter(x => x.id !== d.id); }); go('interview', 'stories'); },
    'x-wb-start': () => { S.drafts.wb[d.id].started = Date.now(); render(); },
    'x-wb-save': () => { const dr = S.drafts.wb[d.id]; S.ws.interview.boards.push({ id: nextId('WB', S.ws.interview.boards), pid: d.id, t: Date.now(), notes: dr.notes, checks: { ...dr.checks }, seconds: dr.started ? Math.round((Date.now() - dr.started) / 1000) : 0 }); delete S.drafts.wb[d.id]; markDirty(); showStatus('Whiteboard session saved.'); go('interview', 'whiteboard'); }
  };
  if (fx[a]) { e.preventDefault(); fx[a](); }
});

/* ---------- After every render: timers, trail, save pill */
function afterRender() {
  clearInterval(p2Timer); renderSavePill(); updateTrail(route()); afterRender4();
  const tab = $('.tabs [aria-current="page"]'); if (tab) tab.parentElement.scrollLeft = tab.offsetLeft - 16;
  const el = $('#p2timer'); if (!el || !el.dataset.start) return;
  const start = +el.dataset.start, limit = (+el.dataset.limit || 0) * 60;
  const tick = () => { const s = (Date.now() - start) / 1000; const left = limit - s; el.textContent = limit ? (left >= 0 ? fmtTime(left) : '+' + fmtTime(-left)) : fmtTime(s); el.classList.toggle('low', !!limit && left < 0); };
  tick(); p2Timer = setInterval(tick, 1000);
}
ensureWs();

