/* ================================================================== Phase 2: career command center
 * Six systems layered on the certification core. All records live in S.ws (in memory),
 * use permanent ids (ADR-001, PF-001, STAR-001, ...), and travel in the workspace export.
 */
const DAY = 86400000;
S.ws = {
  adrs: [], portfolio: [], labs: [], labDrafts: {},
  interview: { answers: [], stories: [], boards: [] },
  career: { profile: { name: '', headline: '', focusExam: '', weeklyHours: 10, links: '' }, roles: [], weeks: {}, milestones: [], apps: [] },
  srs: {}, recallLog: []
};
S.dirty = 0; S.lastSaved = null; S.srsPrev = {}; S.drafts = { iq: {}, wb: {} }; S.recall = null; S.p2 = { labCloud: '', iqCat: '', adrStatus: '', week: null, career: 'plan' };
let p2Timer = null;

/* ---------- small helpers */
const nextId = (prefix, list) => { const n = list.reduce((m, x) => Math.max(m, parseInt(String(x.id).split('-').pop(), 10) || 0), 0) + 1; return `${prefix}-${String(n).padStart(3, '0')}`; };
const today0 = () => { const d = new Date(); d.setHours(0, 0, 0, 0); return d.getTime(); };
const fmtDate = t => t ? new Date(t).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' }) : '';
const isoDate = t => { const d = new Date(t); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`; };
const parseISO = s => { if (!s) return 0; const [y, m, d] = s.split('-').map(Number); return new Date(y, m - 1, d).getTime(); };
const mondayOf = t => { const d = new Date(t); d.setHours(0, 0, 0, 0); const wd = (d.getDay() + 6) % 7; d.setDate(d.getDate() - wd); return d.getTime(); };
const hasNum = s => /\d/.test(s || '');
const words = s => (String(s || '').trim().match(/\S+/g) || []).length;
const avg = a => a.length ? a.reduce((s, x) => s + x, 0) / a.length : 0;
const clamp = (x, a = 0, b = 100) => Math.max(a, Math.min(b, x));
function renderSavePill() {
  $$('.save-pill').forEach(el => {
    el.hidden = !S.dirty;
    el.innerHTML = `<span>${S.dirty} unsaved change${S.dirty === 1 ? '' : 's'}</span><button class="btn sm primary" data-action="ws-export">Save workspace</button>`;
  });
}

/* ---------- Markdown (own output only) */
function mdToHtml(md) {
  const lines = esc(md).split('\n'); let html = '', list = false;
  for (const l of lines) {
    const inline = s => s.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>').replace(/`([^`]+)`/g, '<code>$1</code>');
    if (/^- /.test(l)) { if (!list) { html += '<ul>'; list = true; } html += `<li>${inline(l.slice(2))}</li>`; continue; }
    if (list) { html += '</ul>'; list = false; }
    const h = l.match(/^(#{1,3}) (.*)/);
    if (h) html += `<h${h[1].length + 2}>${inline(h[2])}</h${h[1].length + 2}>`; else if (l.trim()) html += `<p>${inline(l)}</p>`;
  }
  return html + (list ? '</ul>' : '');
}
function downloadText(name, text, type = 'text/markdown') { const blob = new Blob([text], { type }); const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = name; document.body.append(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(a.href), 2000); }
const slug = s => String(s || 'untitled').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 50) || 'untitled';

/* ---------- Architecture Lab */
VIEWS.lab = (arg) => {
  if (arg) return labWorkspace(arg);
  const best = labBest(); const f = S.p2.labCloud; const list = LAB_SCENARIOS.filter(s => !f || s.cloud === f);
  return `
  <div class="page-head"><div><h1>Architecture lab</h1><p class="muted">Timed design drills built like real design reviews. Write your design section by section, then compare it with a reference design and score yourself against the judgment calls a reviewer looks for.</p></div>
    <div class="row"><span class="small muted">Judgment score</span><strong style="font-size:1.4rem">${judgment().score}</strong></div></div>
  <div class="row" style="margin-bottom:16px" role="group" aria-label="Filter by platform">${['', 'Google Cloud', 'AWS', 'Azure', 'Multi-cloud'].map(c => `<button class="chip" data-action="lab-filter" data-v="${esc(c)}" aria-pressed="${f === c}">${c || 'All platforms'}</button>`).join('')}</div>
  <div class="grid g-2">${list.map(s => { const n = S.ws.labs.filter(l => l.sid === s.id).length; const d = S.ws.labDrafts[s.id]; return `<a class="card lab-card" href="#/lab/${s.id}">
    <div class="row"><span class="vendor small muted">${esc(s.cloud)} · ${esc(s.level)} · ${s.minutes} min</span><span class="spacer"></span>${s.id in best ? `<span class="status ${best[s.id] >= 70 ? 'ok' : 'no'}">Best ${best[s.id]}%</span>` : d && Object.values(d.sections).some(Boolean) ? '<span class="status flag">In progress</span>' : ''}</div>
    <h3>${esc(s.title)}</h3><p class="small muted lab-brief">${esc(s.brief)}</p>
    <div class="chips">${s.tags.map(t => `<span class="chip">${esc(t)}</span>`).join('')}</div>${n ? `<p class="small muted" style="margin-top:8px">${n} attempt${n === 1 ? '' : 's'}</p>` : ''}</a>`; }).join('')}</div>`;
};
function labWorkspace(sid) {
  const s = LAB_SCENARIOS.find(x => x.id === sid); if (!s) return emptyState('Scenario not found', 'Pick a scenario from the lab.', '<a class="btn" href="#/lab">Back to lab</a>');
  const d = labDraft(sid); const review = d.phase === 'review';
  const attempts = S.ws.labs.filter(l => l.sid === sid).sort((a, b) => b.t - a.t);
  return `
  <div class="run-head"><a class="btn sm ghost" href="#/lab">← Lab</a><span class="title">${esc(s.title)}</span><span class="spacer"></span>
    <span class="timer" id="p2timer" data-start="${d.started || ''}" data-limit="${s.minutes}">${d.started ? '' : `${s.minutes}:00`}</span>${!d.started && !review ? '<button class="btn sm" data-action="lab-start">Start timer</button>' : ''}</div>
  <div class="two-pane">
    <div class="pane-main" data-rec="labdraft:${sid}">
      <section class="card"><h2>Brief</h2><p>${esc(s.brief)}</p><h3 style="margin-top:14px">Requirements</h3><ul class="plain-list">${s.requirements.map(r => `<li>${esc(r)}</li>`).join('')}</ul></section>
      ${LAB_SECTIONS.map(([k, label, hint]) => `<section class="card lab-sec"><label for="ls-${k}"><h3>${esc(label)}</h3></label><p class="small muted">${esc(hint)}</p>
        <textarea id="ls-${k}" rows="${k === 'architecture' ? 7 : 5}" data-bind="sections.${k}" ${review ? 'readonly' : ''}>${esc(d.sections[k] || '')}</textarea>
        ${review ? `<details class="model" open><summary>Reference design</summary><p>${esc(s.model[k])}</p></details>` : ''}</section>`).join('')}
      ${!review ? `<div class="row"><button class="btn primary" data-action="lab-review">Submit and compare</button><span class="small muted">You can still read your answer after submitting, but it locks so the comparison stays honest.</span></div>` : ''}
    </div>
    <aside class="pane-side">
      ${review ? `<section class="card"><h2>Score your judgment</h2><p class="small muted" style="margin-bottom:12px">Rate each call against your written design, not what you meant to write.</p>
        <div class="rubric">${s.rubric.map(([txt, w], i) => `<div class="rub-item"><p class="small">${esc(txt)} <span class="faint">(${w})</span></p><div class="seg-control" role="group" aria-label="Rubric item ${i + 1}">${[[1, 'Met'], [0.5, 'Partly'], [0, 'Missed']].map(([v, l]) => `<button type="button" data-action="lab-rub" data-i="${i}" data-v="${v}" aria-pressed="${d.rubric[i] === v}">${l}</button>`).join('')}</div></div>`).join('')}</div>
        <p style="margin-top:14px"><strong id="liveScore">${labScore(sid, d.rubric)}%</strong> <span class="small muted" id="rubCount">${Object.keys(d.rubric).length}/${s.rubric.length} rated</span></p>
        <div class="row" style="margin-top:10px"><button class="btn primary" data-action="lab-save" ${Object.keys(d.rubric).length === s.rubric.length ? '' : 'disabled'}>Save attempt</button><button class="btn ghost" data-action="lab-reset">Start over</button></div></section>
        <section class="card"><h3>Common pitfalls</h3><ul class="plain-list small">${s.pitfalls.map(p => `<li>${esc(p)}</li>`).join('')}</ul></section>` : `<section class="card"><h3>How this works</h3><p class="small muted">Aim for the time box. Numbers beat adjectives: write "RPO 0, RTO 5 min" rather than "highly available". When you submit, the reference design appears under each section and a rubric of ${s.rubric.length} judgment calls opens here.</p></section>`}
      <section class="card"><h3>Turn it into evidence</h3><p class="small muted" style="margin-bottom:10px">Record your main decision as an ADR, or start a portfolio case study from this drill.</p><div class="row"><button class="btn sm" data-action="lab-adr" data-id="${sid}">Draft ADR</button><button class="btn sm" data-action="lab-pf" data-id="${sid}">Start case study</button></div></section>
      ${attempts.length ? `<section class="card"><h3>Attempts</h3><div class="list">${attempts.map(a => `<div class="list-item"><span class="small">${esc(fmtDate(a.t))}${a.minutes ? `, ${a.minutes} min` : ''}</span><strong>${a.score}%</strong></div>`).join('')}</div></section>` : ''}
    </aside>
  </div>`;
}

/* ---------- Career Command */
const CAREER_TABS = [['plan', 'Weekly plan'], ['milestones', 'Milestones'], ['roles', 'Target roles'], ['apps', 'Applications'], ['profile', 'Profile']];
VIEWS.career = (arg = '') => {
  const tab = arg || 'plan';
  return `
  <div class="page-head"><div><h1>Career command</h1><p class="muted">Plan the week, keep milestones honest, define the roles you're aiming at, and run your applications like a pipeline.</p></div></div>
  <nav class="tabs" aria-label="Career sections">${CAREER_TABS.map(([k, l]) => `<a href="#/career/${k}" ${tab === k ? 'aria-current="page"' : ''}>${l}</a>`).join('')}</nav>
  <div style="margin-top:16px">${({ plan: planTab, milestones: msTab, roles: rolesTab, apps: appsTab, profile: profileTab }[tab] || planTab)()}</div>`;
};
function planTab() {
  const key = S.p2.week ||= mondayOf(Date.now()); const wk = weekObj(key);
  const sum = o => Object.values(o).reduce((s, x) => s + (+x || 0), 0);
  const history = Array.from({ length: 6 }, (_, i) => key - (5 - i) * 7 * DAY).map(k => { const w = S.ws.career.weeks[k]; return { k, p: w ? sum(w.planned) : 0, a: w ? sum(w.actual) : 0, g: w ? pct(w.goals.filter(x => x.done).length, w.goals.length) : 0 }; });
  const mx = Math.max(1, ...history.flatMap(h => [h.p, h.a]));
  return `
  <div class="row" style="margin-bottom:14px"><button class="btn sm" data-action="wk-move" data-v="-1" aria-label="Previous week">←</button><strong>Week of ${esc(fmtDate(key))}</strong><button class="btn sm" data-action="wk-move" data-v="1" aria-label="Next week">→</button>${key !== mondayOf(Date.now()) ? '<button class="btn sm ghost" data-action="wk-today">This week</button>' : ''}<span class="spacer"></span><button class="btn sm" data-action="wk-suggest">Suggest goals from my scores</button></div>
  <div class="two-pane">
    <div class="pane-main" data-rec="week:${key}">
      <section class="card"><h2>Goals</h2>
        ${wk.goals.length ? `<div class="stack" style="gap:8px">${wk.goals.map((g, i) => `<div class="goal"><label class="check" style="flex:1"><input type="checkbox" data-goal="${i}" ${g.done ? 'checked' : ''}> <span class="${g.done ? 'done' : ''}">${esc(g.text)}</span></label><span class="chip">${esc(WEEK_CATS.find(c => c[0] === g.cat)?.[1] || g.cat)}</span><button class="btn ghost icon-btn" data-action="goal-del" data-i="${i}" aria-label="Remove goal">×</button></div>`).join('')}</div>` : '<p class="small muted">No goals yet. Three to five concrete goals beat ten vague ones.</p>'}
        <div class="row goal-add" style="margin-top:12px"><label for="g-text" class="sr-only">New goal</label><input id="g-text" type="text" placeholder="e.g. Finish lab-02 and write its ADR" style="flex:1 1 240px"><label for="g-cat" class="sr-only">Category</label><select id="g-cat" style="width:auto">${opts(WEEK_CATS, 'cert')}</select><button class="btn primary" data-action="goal-add">Add goal</button></div>
      </section>
      <section class="card"><h2>Hours</h2><div style="overflow-x:auto"><table><thead><tr><th scope="col">Area</th><th scope="col">Planned</th><th scope="col">Actual</th></tr></thead><tbody>${WEEK_CATS.map(([k, l]) => `<tr><td>${l}</td><td><label class="sr-only" for="hp-${k}">${l} planned</label><input id="hp-${k}" type="number" min="0" max="80" step="0.5" inputmode="decimal" data-bind="planned.${k}" data-type="num" value="${wk.planned[k] || 0}" style="max-width:110px"></td><td><label class="sr-only" for="ha-${k}">${l} actual</label><input id="ha-${k}" type="number" min="0" max="80" step="0.5" inputmode="decimal" data-bind="actual.${k}" data-type="num" value="${wk.actual[k] || 0}" style="max-width:110px"></td></tr>`).join('')}</tbody></table></div>
        <p class="small muted" style="margin-top:8px">Target from your profile: ${S.ws.career.profile.weeklyHours || 0}h per week.</p></section>
      <section class="card">${fieldArea('wk-ref', 'Reflection: what worked, what to change next week', 'reflection', wk.reflection, 3)}</section>
    </div>
    <aside class="pane-side"><section class="card"><h2>Last six weeks</h2><div class="forecast" role="img" aria-label="Planned and actual hours for the last six weeks">${history.map(h => `<div class="fc-col"><span class="fc-pair"><span class="fc-bar plan" style="height:${h.p / mx * 100}%"></span><span class="fc-bar" style="height:${h.a / mx * 100}%"></span></span><span class="fc-n">${h.a || ''}</span><span class="fc-d">${new Date(h.k).toLocaleDateString(undefined, { month: 'numeric', day: 'numeric' })}</span></div>`).join('')}</div>
      <p class="small muted" style="margin-top:8px"><span class="key-sw plan"></span> planned <span class="key-sw"></span> actual hours</p>
      <div class="metric-list" style="margin-top:12px">${history.slice(-3).map(h => metric(`Goals, week of ${new Date(h.k).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}`, h.g, 100, h.g ? '' : '')).join('')}</div></section></aside>
  </div>`;
}
function msTab() {
  const list = [...S.ws.career.milestones].sort((a, b) => (parseISO(a.date) || 9e15) - (parseISO(b.date) || 9e15));
  return `
  <section class="card" style="margin-bottom:16px"><h2>Add a milestone</h2><div class="filters">
    <div class="field"><label for="m-title">Milestone</label><input id="m-title" type="text" placeholder="Pass Associate Cloud Engineer"></div>
    <div class="field"><label for="m-date">Target date</label><input id="m-date" type="date"></div>
    <div class="field"><label for="m-cat">Category</label><select id="m-cat">${opts(['cert', 'lab', 'portfolio', 'interview', 'career'], 'cert')}</select></div></div>
    <div class="row" style="margin-top:12px"><button class="btn primary" data-action="ms-add">Add</button><span class="spacer"></span><label for="m-start" class="small muted">Starter plan from</label><input id="m-start" type="date" value="${isoDate(mondayOf(Date.now()))}" style="width:auto"><button class="btn" data-action="ms-starter">Load 16-week plan</button></div></section>
  ${list.length ? `<div class="stack">${list.map(m => { const late = m.status !== 'done' && parseISO(m.date) && parseISO(m.date) < today0(); return `<div class="card ms ${m.status}" data-rec="ms:${m.id}"><div class="row"><div style="flex:1 1 240px"><strong class="${m.status === 'done' ? 'done' : ''}">${esc(m.title)}</strong><div class="small muted">${esc(m.cat)}${late ? ' · <span class="late">overdue</span>' : ''}</div></div><label class="sr-only" for="md-${m.id}">Date</label><input id="md-${m.id}" type="date" data-bind="date" value="${esc(m.date)}" style="width:auto"><label class="sr-only" for="ms-${m.id}">Status</label><select id="ms-${m.id}" data-bind="status" style="width:auto">${opts([['planned', 'Planned'], ['done', 'Done'], ['missed', 'Missed']], m.status)}</select><button class="btn ghost icon-btn" data-action="ms-del" data-id="${m.id}" aria-label="Delete milestone">×</button></div></div>`; }).join('')}</div>`
    : emptyState('No milestones', 'Load the 16-week starter plan (certifications, labs, portfolio, interview prep, applications) and adjust dates, or add your own.')}`;
}
function rolesTab() {
  const ST = [['gap', 'Gap'], ['learning', 'Learning'], ['evidence', 'Evidence']];
  return `
  <div class="row" style="margin-bottom:16px">${ROLE_TEMPLATES.map((t, i) => `<button class="btn sm" data-action="role-add" data-i="${i}">Add ${esc(t.title)}</button>`).join('')}<button class="btn sm ghost" data-action="role-add" data-i="-1">Custom role</button></div>
  ${S.ws.career.roles.length ? `<div class="stack">${S.ws.career.roles.map(r => { const ev = r.skills.filter(s => s.status === 'evidence').length; return `<section class="card" data-rec="role:${r.id}"><div class="row"><div class="field" style="flex:1 1 260px"><label for="rt-${r.id}">Role</label><input id="rt-${r.id}" type="text" data-bind="title" value="${esc(r.title)}"></div><div class="field" style="width:180px"><label for="rl-${r.id}">Level</label><input id="rl-${r.id}" type="text" data-bind="level" value="${esc(r.level)}"></div><button class="btn ghost icon-btn" data-action="role-del" data-id="${r.id}" aria-label="Delete role" style="align-self:flex-end">×</button></div>
      <div class="row" style="margin:12px 0 6px"><strong>Skills</strong><span class="small muted">${ev}/${r.skills.length} backed by evidence. Tap to cycle gap → learning → evidence.</span></div>
      <div class="bar good"><i style="width:${pct(ev, r.skills.length)}%"></i></div>
      <div class="chips" style="margin-top:10px">${r.skills.map((s, i) => `<button class="chip skill ${s.status}" data-action="skill-cycle" data-id="${r.id}" data-i="${i}" aria-label="${esc(s.name)}: ${s.status}">${esc(s.name)} <span class="small">· ${ST.find(x => x[0] === s.status)[1]}</span></button>`).join('')}</div>
      <div class="row" style="margin-top:10px"><label class="sr-only" for="sk-${r.id}">New skill</label><input id="sk-${r.id}" type="text" placeholder="Add a skill" style="flex:1 1 200px"><button class="btn sm" data-action="skill-add" data-id="${r.id}">Add skill</button></div>
      ${fieldArea('rw-' + r.id, 'Why this role, and what evidence you will show', 'why', r.why || '', 2)}</section>`; }).join('')}</div>`
    : emptyState('No target roles', 'Pick one or two roles to aim at. Their skill lists turn into a gap analysis you can close with labs, ADRs, and case studies.')}`;
}
function appsTab() {
  const apps = S.ws.career.apps;
  return `
  <section class="card" style="margin-bottom:16px"><h2>Add an application</h2><div class="filters">
    <div class="field"><label for="ap-co">Company</label><input id="ap-co" type="text"></div>
    <div class="field"><label for="ap-role">Role</label><input id="ap-role" type="text" placeholder="Cloud Solutions Architect"></div>
    <div class="field"><label for="ap-stage">Stage</label><select id="ap-stage">${opts(STAGES, 'Researching')}</select></div>
    <div class="field"><label for="ap-link">Posting link</label><input id="ap-link" type="text" inputmode="url"></div></div>
    <div class="row" style="margin-top:12px"><button class="btn primary" data-action="app-add">Add</button></div></section>
  <div class="row" style="margin-bottom:10px">${STAGES.map(s => `<span class="chip">${esc(s)} ${apps.filter(a => a.stage === s).length}</span>`).join('')}</div>
  ${apps.length ? `<div class="pipeline">${STAGES.map(st => { const col = apps.filter(a => a.stage === st); return `<section class="pipe-col" aria-label="${esc(st)}"><h3>${esc(st)} <span class="faint">${col.length}</span></h3>${col.map(a => `<div class="card app" data-rec="app:${a.id}"><strong>${esc(a.company)}</strong><div class="small muted">${esc(a.role)}</div>
      <div class="field" style="margin-top:8px"><label for="as-${a.id}" class="small">Stage</label><select id="as-${a.id}" data-bind="stage">${opts(STAGES, a.stage)}</select></div>
      <div class="field" style="margin-top:6px"><label for="an-${a.id}" class="small">Next action</label><input id="an-${a.id}" type="text" data-bind="nextAction" value="${esc(a.nextAction)}"></div>
      <div class="field" style="margin-top:6px"><label for="ad-${a.id}" class="small">By</label><input id="ad-${a.id}" type="date" data-bind="nextDate" value="${esc(a.nextDate)}"></div>
      <details style="margin-top:4px"><summary class="small">Notes and link</summary><textarea rows="3" data-bind="notes" aria-label="Notes">${esc(a.notes)}</textarea>${a.link ? `<p class="small" style="margin-top:6px"><a href="${esc(a.link)}" target="_blank" rel="noopener">Posting</a></p>` : ''}<button class="btn sm danger" data-action="app-del" data-id="${a.id}" style="margin-top:6px">Remove</button></details></div>`).join('') || '<p class="small faint">Empty</p>'}</section>`; }).join('')}</div>`
    : emptyState('No applications tracked', 'Start with ten target companies in Researching. Note who you know there and what evidence from your portfolio matches the role.')}`;
}
function profileTab() {
  const p = S.ws.career.profile;
  return `<section class="card" data-rec="profile:me"><h2>Profile</h2><p class="small muted" style="margin-bottom:12px">Used on your portfolio site and to choose which certification drives exam readiness. Your focus is remembered on this device.</p>
    <div class="filters"><div class="field"><label for="pr-name">Name</label><input id="pr-name" type="text" data-bind="name" value="${esc(p.name)}"></div>
    <div class="field"><label for="pr-head">Headline</label><input id="pr-head" type="text" data-bind="headline" value="${esc(p.headline)}" placeholder="Cloud architect in training · Google Cloud and AWS"></div>
    <div class="field"><label for="pr-focus">Focus certification</label><select id="pr-focus" data-bind="focusExam">${opts(activeExams().map(e => [e.code, e.code]), p.focusExam, 'Most practiced')}</select></div>
    <div class="field"><label for="pr-hours">Weekly hours target</label><input id="pr-hours" type="number" min="1" max="80" data-bind="weeklyHours" data-type="num" value="${p.weeklyHours}" inputmode="numeric"></div></div>
    ${fieldArea('pr-links', 'Public links (LinkedIn, GitHub)', 'links', p.links, 2)}</section>`;
}

