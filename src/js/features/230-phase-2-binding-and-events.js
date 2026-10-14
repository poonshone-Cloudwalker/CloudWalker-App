/* ================================================================== Binding and events */
function setPath(obj, path, val) { const ks = path.split('.'); let o = obj; ks.slice(0, -1).forEach(k => o = o[k] ??= {}); o[ks[ks.length - 1]] = val; }
let liveT;
function onBind(el) {
  const host = el.closest('[data-rec]'); if (!host) return;
  const [type, id] = host.dataset.rec.split(':'); const rec = getRec(type, id); if (!rec) return;
  const t = el.dataset.type; const path = el.dataset.bind; let v = el.value;
  if (t === 'lines') v = v.split('\n').map(s => s.trim()).filter(Boolean);
  else if (t === 'csv') v = v.split(',').map(s => s.trim()).filter(Boolean);
  else if (t === 'num') v = parseFloat(v) || 0;
  else if (t === 'multi') { const arr = rec[path] ||= []; v = el.checked ? uniq([...arr, el.value]) : arr.filter(x => x !== el.value); }
  setPath(rec, path, v);
  if (!['labdraft', 'iq', 'wb'].includes(type) || type === 'labdraft') markDirty();
  clearTimeout(liveT); liveT = setTimeout(() => liveRefresh(type, rec), 150);
  if (el.tagName === 'SELECT' && ['ms', 'app'].includes(type)) { const id2 = el.id; render(); $('#' + id2)?.focus(); }
}
document.addEventListener('input', e => {
  const el = e.target;
  if (el.dataset.bind && el.type !== 'checkbox' && el.tagName !== 'SELECT') onBind(el);
  if (el.dataset.recall && S.recall) S.recall.text = el.value;
});
document.addEventListener('change', e => {
  const el = e.target;
  if (el.dataset.bind && (el.type === 'checkbox' || el.tagName === 'SELECT' || el.type === 'date')) onBind(el);
  if (el.dataset.p2field) { S.p2.ret[el.dataset.p2field] = el.value; if (el.tagName === 'SELECT') { render(); $('#' + el.id)?.focus(); } }
  if (el.dataset.goal !== undefined) { const wk = weekObj(S.p2.week); wk.goals[+el.dataset.goal].done = el.checked; markDirty(); el.nextElementSibling?.classList.toggle('done', el.checked); }
  if (el.dataset.wbcheck) { const d = S.drafts.wb[el.dataset.wbcheck]; d.checks[el.value] = el.checked; const p = WHITEBOARD_PROMPTS.find(x => x.id === el.dataset.wbcheck); $('#liveScore').textContent = pct(Object.values(d.checks).filter(Boolean).length, p.checklist.length) + '%'; }
});
document.addEventListener('click', e => {
  const b = e.target.closest('[data-action]'); if (!b) return; const d = b.dataset; const a = d.action;
  const fx = {
    'ws-export': workspaceExport,
    'ws-import': () => $('#fileWorkspace').click(),
    'report-md': () => downloadText(`study-progress-${stamp()}.md`, progressReport()),
    'adr-all-md': () => downloadText(`adrs-${stamp()}.md`, S.ws.adrs.map(adrMarkdown).join('\n\n---\n\n')),
    'pf-all-md': () => downloadText(`portfolio-${stamp()}.md`, S.ws.portfolio.map(pfMarkdown).join('\n\n---\n\n')),
    'pf-site': () => { downloadText(`portfolio-${slug(S.ws.career.profile.name || 'site')}.html`, portfolioSiteHtml(), 'text/html'); toast(`Exported ${S.ws.portfolio.filter(p => p.status !== 'draft').length} ready or published case studies.`); },
    'stories-md': () => downloadText(`star-stories-${stamp()}.md`, storiesMarkdown()),
    'ret-mcq': () => { const ids = retentionQueue(true); startRunner({ title: 'Retention review', mode: 'retention', ids, reveal: 'immediate' }); },
    'ret-recall': () => { const ids = retentionQueue(true); if (!ids.length) { toast('Nothing due and no new cards selected.'); return; } S.recall = { ids, idx: 0, revealed: false, text: '', results: [], shown: Date.now() }; go('recall'); },
    'recall-reveal': () => { S.recall.revealed = true; render(); $('.grade')?.focus(); },
    'recall-grade': () => { const r = S.recall; const id = r.ids[r.idx]; const g = +d.v; S.ws.srs[id] = srsApply(S.ws.srs[id], g); S.ws.recallLog.push({ id, t: Date.now(), grade: g }); r.results.push(g); r.idx++; r.revealed = false; r.text = ''; markDirty(); render(); $('#qtext')?.focus(); },
    'recall-end': () => { S.recall.idx = S.recall.ids.length; render(); },
    'lab-filter': () => { S.p2.labCloud = d.v; render(); },
    'lab-start': () => { const sid = route().arg; labDraft(sid).started = Date.now(); render(); },
    'lab-review': () => { const sid = route().arg; const dr = labDraft(sid); if (!Object.values(dr.sections).some(v => (v || '').trim())) { toast('Write at least one section before comparing.'); return; } dr.phase = 'review'; dr.submittedAt = Date.now(); markDirty(); render(); },
    'lab-rub': () => { const sid = route().arg; const dr = labDraft(sid); dr.rubric[+d.i] = +d.v; $$(`[data-action="lab-rub"][data-i="${d.i}"]`).forEach(x => x.setAttribute('aria-pressed', String(+x.dataset.v === +d.v))); const sc = LAB_SCENARIOS.find(x => x.id === sid); const n = Object.keys(dr.rubric).length; $('#liveScore').textContent = labScore(sid, dr.rubric) + '%'; $('#rubCount').textContent = `${n}/${sc.rubric.length} rated`; $('[data-action="lab-save"]').disabled = n < sc.rubric.length; markDirty(); },
    'lab-save': () => { const sid = route().arg; const dr = labDraft(sid); const score = labScore(sid, dr.rubric); const minutes = dr.started ? Math.round(((dr.submittedAt || Date.now()) - dr.started) / 60000) : 0; S.ws.labs.push({ id: nextId('LAB', S.ws.labs), sid, t: Date.now(), sections: { ...dr.sections }, rubric: { ...dr.rubric }, score, minutes }); S.ws.labDrafts[sid] = { sections: { ...dr.sections }, rubric: {}, phase: 'saved', started: 0 }; S.ws.labDrafts[sid].phase = 'write'; markDirty(); toast(`Saved. Judgment score for this drill: ${score}%.`); render(); },
    'lab-reset': () => { if (!confirm('Clear your answer and ratings for this scenario?')) return; delete S.ws.labDrafts[route().arg]; markDirty(); render(); },
    'lab-adr': () => { const s = LAB_SCENARIOS.find(x => x.id === d.id); const dr = labDraft(s.id); const a = newAdr({ title: '', context: `${s.brief}\n\nRequirements: ${s.requirements.join('; ')}.`, drivers: s.requirements.slice(0, 4), source: `Architecture Lab ${s.id}: ${s.title}`, decision: dr.sections.architecture || '' }); go('adr', a.id); },
    'lab-pf': () => { const s = LAB_SCENARIOS.find(x => x.id === d.id); const dr = labDraft(s.id); const p = newPf({ title: s.title, cloud: s.cloud, type: 'Lab case study', role: 'Designed the solution as a timed architecture exercise', problem: s.brief, constraints: s.requirements.join('; '), architecture: dr.sections.architecture || '', source: s.id }); go('portfolio', p.id); },
    'adr-new': () => { const a = newAdr(); go('adr', a.id); },
    'adr-filter': () => { S.p2.adrStatus = d.v; render(); },
    'adr-opt': () => { const r = S.ws.adrs.find(x => x.id === d.id); r.options.push({ name: '', pros: '', cons: '' }); markDirty(); render(); },
    'adr-md': () => { const r = S.ws.adrs.find(x => x.id === d.id); downloadText(`${r.id}-${slug(r.title)}.md`, adrMarkdown(r)); },
    'adr-del': () => { if (!confirm(`Delete ${d.id}? Portfolio links to it will be removed.`)) return; S.ws.adrs = S.ws.adrs.filter(x => x.id !== d.id); S.ws.portfolio.forEach(p => p.adrIds = p.adrIds.filter(x => x !== d.id)); markDirty(); go('adr'); },
    'pf-new': () => { const p = newPf(); go('portfolio', p.id); },
    'pf-md': () => { const r = S.ws.portfolio.find(x => x.id === d.id); downloadText(`${r.id}-${slug(r.title)}.md`, pfMarkdown(r)); },
    'pf-del': () => { if (!confirm(`Delete ${d.id}?`)) return; S.ws.portfolio = S.ws.portfolio.filter(x => x.id !== d.id); markDirty(); go('portfolio'); },
    'iq-filter': () => { S.p2.iqCat = d.v; render(); },
    'iq-random': () => { const pool = INTERVIEW_QUESTIONS.filter(q => !S.p2.iqCat || q.cat === S.p2.iqCat); const q = pool[Math.floor(Math.random() * pool.length)]; delete S.drafts.iq[q.id]; go('interview', 'q/' + q.id); },
    'iq-reveal': () => { S.drafts.iq[d.id].revealed = true; render(); },
    'iq-rate': () => { S.drafts.iq[d.id].rating = +d.v; $$('[data-action="iq-rate"]').forEach(x => x.setAttribute('aria-pressed', String(+x.dataset.v === +d.v))); $('[data-action="iq-save"]').disabled = false; },
    'iq-save': () => { const dr = S.drafts.iq[d.id]; S.ws.interview.answers.push({ id: nextId('IA', S.ws.interview.answers), qid: d.id, t: Date.now(), text: dr.text, rating: dr.rating, seconds: Math.round((Date.now() - dr.started) / 1000) }); delete S.drafts.iq[d.id]; markDirty(); toast('Attempt saved.'); go('interview', 'practice'); },
    'story-new': () => { const s = newStory(d.comp ? { competencies: [d.comp] } : {}); go('interview', 'story/' + s.id); },
    'story-del': () => { if (!confirm(`Delete ${d.id}?`)) return; S.ws.interview.stories = S.ws.interview.stories.filter(x => x.id !== d.id); markDirty(); go('interview', 'stories'); },
    'wb-start': () => { S.drafts.wb[d.id].started = Date.now(); render(); },
    'wb-save': () => { const dr = S.drafts.wb[d.id]; S.ws.interview.boards.push({ id: nextId('WB', S.ws.interview.boards), pid: d.id, t: Date.now(), notes: dr.notes, checks: { ...dr.checks }, seconds: dr.started ? Math.round((Date.now() - dr.started) / 1000) : 0 }); delete S.drafts.wb[d.id]; markDirty(); toast('Whiteboard session saved.'); go('interview', 'whiteboard'); },
    'wk-move': () => { S.p2.week = mondayOf(S.p2.week + (+d.v) * 7 * DAY + DAY); render(); },
    'wk-today': () => { S.p2.week = mondayOf(Date.now()); render(); },
    'goal-add': () => { const t = $('#g-text').value.trim(); if (!t) { $('#g-text').focus(); return; } weekObj(S.p2.week).goals.push({ text: t, cat: $('#g-cat').value, done: false }); markDirty(); render(); $('#g-text')?.focus(); },
    'goal-del': () => { weekObj(S.p2.week).goals.splice(+d.i, 1); markDirty(); render(); },
    'wk-suggest': () => { const wk = weekObj(S.p2.week); const add = nextMoves(allScores()).map(([t, , href]) => ({ text: t, cat: href.includes('lab') || href.includes('adr') ? 'lab' : href.includes('portfolio') ? 'portfolio' : href.includes('interview') ? 'interview' : 'cert', done: false })).filter(g => !wk.goals.some(x => x.text === g.text)); wk.goals.push(...add); markDirty(); render(); toast(add.length ? `Added ${add.length} goals.` : 'Those goals are already on your list.'); },
    'ms-add': () => { const t = $('#m-title').value.trim(); if (!t) { $('#m-title').focus(); return; } S.ws.career.milestones.push({ id: nextId('MS', S.ws.career.milestones), title: t, date: $('#m-date').value, cat: $('#m-cat').value, status: 'planned' }); markDirty(); render(); },
    'ms-starter': () => { const start = parseISO($('#m-start').value) || mondayOf(Date.now()); STARTER_MILESTONES.forEach(([w, t, c]) => { if (!S.ws.career.milestones.some(m => m.title === t)) S.ws.career.milestones.push({ id: nextId('MS', S.ws.career.milestones), title: t, date: isoDate(start + w * 7 * DAY), cat: c, status: 'planned' }); }); markDirty(); render(); toast('Starter plan loaded. Adjust the dates to fit your life.'); },
    'ms-del': () => { S.ws.career.milestones = S.ws.career.milestones.filter(x => x.id !== d.id); markDirty(); render(); },
    'role-add': () => { const t = ROLE_TEMPLATES[+d.i]; S.ws.career.roles.push({ id: nextId('ROLE', S.ws.career.roles), title: t ? t.title : 'New role', level: t ? t.level : '', why: '', skills: (t ? t.skills : []).map(n => ({ name: n, status: 'gap' })) }); markDirty(); render(); },
    'role-del': () => { if (!confirm('Delete this role?')) return; S.ws.career.roles = S.ws.career.roles.filter(x => x.id !== d.id); markDirty(); render(); },
    'skill-cycle': () => { const r = S.ws.career.roles.find(x => x.id === d.id); const s = r.skills[+d.i]; s.status = { gap: 'learning', learning: 'evidence', evidence: 'gap' }[s.status]; markDirty(); render(); $(`[data-action="skill-cycle"][data-id="${d.id}"][data-i="${d.i}"]`)?.focus(); },
    'skill-add': () => { const inp = $('#sk-' + d.id); const v = inp.value.trim(); if (!v) return; S.ws.career.roles.find(x => x.id === d.id).skills.push({ name: v, status: 'gap' }); markDirty(); render(); },
    'app-add': () => { const co = $('#ap-co').value.trim(); if (!co) { $('#ap-co').focus(); return; } S.ws.career.apps.push({ id: nextId('APP', S.ws.career.apps), company: co, role: $('#ap-role').value.trim(), stage: $('#ap-stage').value, link: $('#ap-link').value.trim(), applied: isoDate(Date.now()), nextAction: '', nextDate: '', notes: '' }); markDirty(); render(); },
    'app-del': () => { S.ws.career.apps = S.ws.career.apps.filter(x => x.id !== d.id); markDirty(); render(); }
  };
  if (fx[a]) { e.preventDefault(); fx[a](); }
});
$('#fileWorkspace').addEventListener('change', e => readJSON(e.target, workspaceImport));

