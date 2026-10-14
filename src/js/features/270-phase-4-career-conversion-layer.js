/* ================================================================== Phase 4: career-conversion layer
 * State model additions (all inside S.ws, so they travel in the workspace file):
 *   outputs[]     generated career assets (OUT-001…): { kind, variant, src, title, text, created, updated, exportedAt, usedAt }
 *   reflections[] study reflections (REF-001…): { src:{kind,title,exam,score}, text, t }
 *   exportLog[]   export history: { t, kind, file, count }
 *   panels{}      last open tab per editor record ('adr:ADR-001' → 'outputs')
 * Every artifact record (ADR, PF, STAR, OUT, REF) carries `updated` and, once exported, `exportedAt`.
 * Three storage tiers shown in the UI:
 *   1. In this tab only  – updated after the last workspace save/restore (S.meta2.savedAt); lost if the tab closes.
 *   2. Saved in workspace – included in the last downloaded workspace JSON; restorable with Restore.
 *   3. Exported artifact  – written to a Markdown/HTML/text file (or copied) for career use; exportedAt ≥ updated.
 */
S.meta2.savedAt = 0; S.p4 = { genSrc: '', genKind: 'resume', genVar: 'short', genAngle: 'decision', outFilter: '', tab: 'generate', sel: new Set(), scroll: {}, lastHash: '', resetKind: '' };
function ensureWs4() { const w = S.ws; w.glossary ||= { terms: [], cross_cloud: [] }; w.outputs ||= []; w.reflections ||= []; w.exportLog ||= []; w.panels ||= {}; }
ensureWs4();

/* ---------- Artifact state helpers */
const allArtifacts = () => [...S.ws.adrs.map(r => ['adr', r]), ...S.ws.portfolio.map(r => ['pf', r]), ...S.ws.interview.stories.map(r => ['story', r]), ...S.ws.outputs.map(r => ['out', r]), ...S.ws.reflections.map(r => ['ref', r])];
const recUpdated = r => r.updated || r.t || 0;
const exportState = r => !r.exportedAt ? 'draft' : r.exportedAt >= recUpdated(r) ? 'exported' : 'changed';
const isUnsaved = r => !persistOK() && recUpdated(r) > (S.meta2.savedAt || 0);
const KIND_LABEL = { adr: 'ADR', pf: 'Portfolio project', story: 'Interview story', out: 'Career output', ref: 'Reflection' };
const recTitle = (k, r) => k === 'ref' ? `Reflection: ${r.src?.title || 'study session'}` : (r.title || 'Untitled');
const recHref = (k, r) => ({ adr: '#/adr/' + r.id, pf: '#/portfolio/' + r.id, story: '#/interview/story/' + r.id, out: '#/outputs/item/' + r.id, ref: '#/outputs/generate' }[k]);
function humanTime(t) { if (!t) return 'never'; const d = new Date(t), now = new Date(); const sameDay = d.toDateString() === now.toDateString(); const y = new Date(now); y.setDate(now.getDate() - 1);
  if (Date.now() - t < 60000) return 'just now'; if (sameDay) return `today at ${d.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' })}`; if (d.toDateString() === y.toDateString()) return 'yesterday'; return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' }); }
function stateChip(r) {
  const st = exportState(r); const parts = [];
  parts.push(st === 'exported' ? `<span class="chip ok-chip">Exported ${humanTime(r.exportedAt)}</span>` : st === 'changed' ? '<span class="chip warn-chip">Changed since export</span>' : '<span class="chip draft-chip">Draft not yet exported</span>');
  if (isUnsaved(r)) parts.push('<span class="chip warn-chip">In this tab only</span>');
  return parts.join('');
}
function markExported(recs, kind, file) {
  const t = Date.now(); recs.forEach(r => { r.exportedAt = t; }); S.ws.exportLog.push({ t, kind, file, count: recs.length }); if (S.ws.exportLog.length > 60) S.ws.exportLog.shift(); markDirty();
}
function pendingExports() { return allArtifacts().filter(([, r]) => exportState(r) !== 'exported'); }
function unsavedSummary() {
  if (persistOK()) return { arts: 0, ans: 0 };
  const arts = allArtifacts().filter(([, r]) => isUnsaved(r)).length;
  let ans = 0; for (const arr of Object.values(S.progress.answers)) ans += arr.filter(a => a.t > (S.meta2.savedAt || 0)).length;
  return { arts, ans };
}

/* ---------- Source facts: normalize any study or career item for the generators */
let SVC_SET = null;
const svcIn = txt => { SVC_SET ||= [...new Set(allQ().flatMap(q => q.services))].filter(s => s.length > 2).sort((a, b) => b.length - a.length); const out = []; for (const s of SVC_SET) if (out.length < 6 && !out.some(o => o.includes(s)) && new RegExp('(?<![\\w-])' + s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '(?![\\w-])').test(txt)) out.push(s); return out; };
function sourceList() {
  const L = [];
  const best = {}; S.ws.labs.forEach(a => { if (!best[a.sid] || a.score > best[a.sid].score) best[a.sid] = a; });
  Object.values(best).forEach(a => L.push(['lab:' + a.id, 'Lab', LAB_SCENARIOS.find(s => s.id === a.sid)?.title + ` (${a.score}%)`]));
  S.ws.adrs.forEach(a => L.push(['adr:' + a.id, 'ADR', `${a.id}: ${a.title || 'Untitled'}`]));
  S.ws.portfolio.forEach(p => L.push(['pf:' + p.id, 'Portfolio', `${p.id}: ${p.title || 'Untitled'}`]));
  S.ws.interview.stories.forEach(s => L.push(['story:' + s.id, 'Story', `${s.id}: ${s.title || 'Untitled'}`]));
  S.ws.reflections.forEach(r => L.push(['ref:' + r.id, 'Reflection', `${r.id}: ${r.src?.title || 'study'}`]));
  activeExams().forEach(e => { if (totals(q => q.exam_code === e.code).att >= 10) L.push(['study:' + e.code, 'Study record', `${e.code} practice record`]); });
  return L;
}
function facts(key) {
  const [k, id] = key.split(':');
  if (k === 'lab') { const a = S.ws.labs.find(x => x.id === id); const s = LAB_SCENARIOS.find(x => x.id === a.sid); const sec = a.sections || {};
    return { k, lab: true, title: s.title, provider: s.cloud, problem: s.brief, approach: sec.architecture, decision: firstSentence(sec.architecture), alternatives: [], tradeoff: sec.tradeoffs, security: sec.security, ops: [sec.reliability, sec.cost].filter(Boolean).join(' '), outcome: `Scored ${a.score}% against a ${s.rubric.length}-point design-review rubric in a ${s.minutes}-minute timed exercise.`, lesson: '', services: svcIn(Object.values(sec).join(' ')), skills: s.tags, labIds: [s.id] }; }
  if (k === 'adr') { const a = S.ws.adrs.find(x => x.id === id); const ch = chosenOpt(a);
    return { k, lab: /lab/i.test(a.source), title: a.title, provider: a.providers.join(' / '), problem: a.context, approach: a.decision, decision: ch ? `${ch.name}: ${firstSentence(a.rationale || a.decision)}` : firstSentence(a.decision), alternatives: named(a).filter(o => o !== ch).map(o => o.name), tradeoff: a.tradeoffs, security: a.lenses.includes('security') ? a.risks.join('; ') : '', ops: a.followUps.join('; '), outcome: a.consequencesPos, lesson: a.reviewTrigger, services: a.services.length ? a.services : svcIn(a.context + ' ' + a.options.map(o => o.name).join(' ')), skills: a.lenses.map(lensLabel), adrIds: [a.id], risks: a.risks }; }
  if (k === 'pf') { const p = S.ws.portfolio.find(x => x.id === id);
    return { k, lab: isLab(p), title: p.title, provider: p.provider, problem: p.problem, approach: p.architecture, decision: adrsOf(p.adrIds)[0] ? `${chosenOpt(adrsOf(p.adrIds)[0])?.name || adrsOf(p.adrIds)[0].title}` : firstSentence(p.tradeoffs), alternatives: [], tradeoff: p.tradeoffs, security: p.security, ops: [p.resilience, p.migration, p.cost].filter(Boolean).join(' '), outcome: p.outcome, lesson: p.lessons, services: p.services, skills: [], adrIds: p.adrIds, pfIds: [p.id] }; }
  if (k === 'story') { const s = S.ws.interview.stories.find(x => x.id === id);
    return { k, lab: s.source === 'Architecture lab', title: s.title, provider: '', problem: s.situation + ' ' + s.task, approach: s.action, decision: firstSentence(s.action), alternatives: [], tradeoff: '', security: '', ops: '', outcome: s.result, lesson: s.translation, services: svcIn(s.action), skills: s.competencies.map(compLabel), storyIds: [s.id] }; }
  if (k === 'ref') { const r = S.ws.reflections.find(x => x.id === id);
    const ex = r.src?.exam ? examMetaFor(r.src.exam)?.name || r.src.exam : ''; const generic = !r.src?.title || /^(learn|focus drill|mastery review|review|practice)/i.test(r.src.title);
    const title = generic ? `${ex || 'Cloud certification'} practice session` : r.src.title;
    return { k, lab: true, study: true, title, provider: '', problem: `Scenario-based practice session${ex ? ` for ${ex}` : ''}.`, approach: `Completed a ${r.src?.total || ''}-question scenario-based practice session${ex ? ` for ${ex}` : ''} and documented what I learned.`.replace('a -question', 'a'), decision: '', alternatives: [], tradeoff: '', security: '', ops: '', outcome: r.src?.score != null ? `${r.src.score}% correct on first attempt; missed items scheduled for spaced review` : '', lesson: r.text, services: svcIn(r.text), skills: [] }; }
  if (k === 'study') { const t = totals(q => q.exam_code === id); const e = examMetaFor(id); const ds = domainsOf(id).map(d => [d, totals(q => q.exam_code === id && q.domain === d)]).filter(x => x[1].att >= 3).sort((a, b) => b[1].acc - a[1].acc);
    return { k, lab: true, study: true, title: `${e.name} preparation`, provider: e.vendor, problem: `Preparing for ${e.name}.`, approach: `Completed ${t.att} scenario-based practice questions across ${domainsOf(id).length} blueprint domains with spaced-repetition review.`, decision: '', alternatives: [], tradeoff: '', security: '', ops: '', outcome: `${t.acc}% practice accuracy${ds[0] ? `; strongest domain: ${dShort(ds[0][0])} (${ds[0][1].acc}%)` : ''}.`, lesson: ds.length > 1 ? `Focus area: ${dShort(ds[ds.length - 1][0])}.` : '', services: [], skills: domainsOf(id).map(dShort).slice(0, 5) }; }
  return null;
}

/* ---------- Generators (template-based, built only from the user's own entries) */
const ADD = what => `[Add: ${what}]`;
const lc = s => String(s || '').trim().replace(/^[A-Z](?=[a-z])/, c => c.toLowerCase()).replace(/\.$/, '');
const firstPerson = (txt, lead) => { const t = firstSentence(txt).trim(); if (!t) return ''; return /^(I|We)\b/.test(t) ? (lead ? lead + t[0].toLowerCase() + t.slice(1) : t) : `${lead || ''}I proposed ${lc(t)}${/[.!?]$/.test(t) ? '' : '.'}`; };
function genResume(f, variant) {
  const pre = f.study ? '' : f.lab ? 'In a self-directed lab, ' : '';
  const verb = { lab: 'designed', adr: 'evaluated and documented', pf: 'architected', story: 'led', ref: 'completed', study: 'completed' }[f.k];
  const V = pre ? verb : verb[0].toUpperCase() + verb.slice(1);
  const svc = f.services.slice(0, 3).join(', ');
  const what = f.study ? f.approach.replace(/^Completed /, '').replace(/\.$/, '') : `${f.provider ? f.provider + ' ' : ''}${f.k === 'adr' ? 'architecture decision' : 'architecture'} for ${lc(f.title)}`;
  const outc = f.outcome ? `; ${lc(firstSentence(f.outcome))}` : '';
  if (variant === 'short') return `- ${pre}${V} ${what}${svc ? ` using ${svc}` : ''}${outc}.`;
  if (variant === 'detailed') return [`- ${pre}${V} ${what}${svc ? ` using ${svc}` : ''}. ${f.decision ? `Selected ${lc(f.decision)}${f.alternatives.length ? ` over ${f.alternatives.join(' and ')}` : ''}${f.tradeoff ? `, accepting ${lc(firstSentence(f.tradeoff))}` : ''}.` : ''}`, f.security ? `- Built in security: ${lc(firstSentence(f.security))}.` : '', `- ${f.outcome ? `Result: ${firstSentence(f.outcome)}` : ADD('a measurable result, even an estimate')}`, f.study && f.lesson ? `- Key lesson: ${firstSentence(f.lesson)}` : ''].filter(Boolean).join('\n');
  const skills = uniq([...f.services, ...f.skills, f.provider].filter(Boolean)).slice(0, 10);
  return [`${pre ? 'Self-directed lab project. ' : ''}${V[0].toUpperCase() + V.slice(1)} ${what}${svc ? ` using ${svc}` : ''}.`, f.decision ? `Evaluated design options and selected ${lc(f.decision)} based on ${f.skills.length ? f.skills.slice(0, 2).join(' and ') + ' requirements' : 'reliability, security, and cost requirements'}.` : '', f.security ? `Applied security controls including ${lc(firstSentence(f.security))}.` : '', f.outcome ? `Outcome: ${firstSentence(f.outcome)}` : '', skills.length ? `Skills: ${skills.join(', ')}` : ''].filter(Boolean).join('\n').replace(/[•→—]/g, '-');
}
function genLinkedIn(f) {
  return [`${f.title}`, '', firstSentence(f.problem) || ADD('the problem in one sentence'), '', `${f.lab ? 'As a hands-on lab, I' : 'I'} ${f.k === 'adr' ? 'worked through and documented a design decision' : 'designed the solution'}${f.provider ? ` on ${f.provider}` : ''}.`, f.services.length ? `Stack: ${f.services.join(', ')}` : '', f.decision ? `Key decision: ${f.decision}${f.alternatives.length ? ` (considered ${f.alternatives.join(', ')})` : ''}` : '', f.tradeoff ? `Trade-off accepted: ${firstSentence(f.tradeoff)}` : '', f.outcome ? `Outcome: ${firstSentence(f.outcome)}` : ADD('outcome'), f.lesson ? `What I learned: ${firstSentence(f.lesson)}` : ''].filter((x, i, a) => x !== '' || a[i - 1] !== '').join('\n');
}
function genPortfolio(f) {
  return [`## ${f.title}`, '', `**Problem.** ${firstSentence(f.problem) || ADD('business problem')}`, '', `**Architecture summary.** ${f.approach ? f.approach.slice(0, 600) : ADD('architecture overview')}`, '', `**Services used.** ${f.services.join(', ') || ADD('services')}`, '', `**Trade-offs.** ${f.tradeoff || (f.alternatives.length ? `Chose ${f.decision} over ${f.alternatives.join(', ')}.` : ADD('key trade-offs'))}`, '', `**Security considerations.** ${f.security || ADD('identity, network boundaries, encryption')}`, '', `**Operational considerations.** ${f.ops || ADD('monitoring, recovery, cost controls')}`, '', `**Result and what I learned.** ${[f.outcome, f.lesson].filter(Boolean).join(' ') || ADD('result and lesson')}`, f.lab ? '\n_Self-directed lab work._' : ''].join('\n');
}
const ANGLES = [['decision', 'Architecture decision', 'Why you chose this design over the alternatives.'], ['troubleshooting', 'Troubleshooting', 'How you isolated the cause, step by step.'], ['risk', 'Risk reduction', 'Which risk you reduced and how you measured it.'], ['security', 'Security improvement', 'The control you added and the threat it addresses.'], ['stakeholder', 'Stakeholder communication', 'How you explained trade-offs and reached agreement.'], ['planning', 'Planning and prioritization', 'What you sequenced first, what you deferred, and why.']];
function genStory(f, variant, angle) {
  const A = ANGLES.find(x => x[0] === angle) || ANGLES[0]; const lab = f.lab && !f.study ? 'In a timed design exercise, ' : '';
  const task = { decision: `I had to choose ${f.alternatives.length ? `between ${[f.decision.split(':')[0], ...f.alternatives].join(', ')}` : 'the right architecture'} for ${lc(f.title)}.`, troubleshooting: `I needed to find out why ${ADD('the symptom')} was happening and restore service.`, risk: `I needed to reduce the risk of ${ADD('the specific risk')} without stalling delivery.`, security: `I needed to close ${ADD('the security gap')} while keeping the system usable.`, stakeholder: `I needed ${ADD('who')} to agree on ${lc(f.decision) || ADD('the decision')}.`, planning: `I had to decide what to do first with ${ADD('constraints: time, budget, people')}.` }[angle];
  const action = [f.approach ? firstPerson(f.approach, lab) : ADD('what you did, in first person'), f.decision && angle === 'decision' && !f.approach.includes(f.decision.split(':')[0]) ? `I chose ${lc(f.decision)}.` : '', f.tradeoff ? `I accepted ${lc(firstSentence(f.tradeoff))}.` : '', angle === 'security' && f.security ? `Controls: ${firstSentence(f.security)}` : '', angle === 'risk' && f.risks?.length ? `Risks handled: ${f.risks.slice(0, 2).join('; ')}.` : ''].filter(Boolean).join(' ');
  const result = [f.outcome ? firstSentence(f.outcome) : ADD('result with a number'), f.lesson ? `What I'd carry forward: ${firstSentence(f.lesson)}` : ''].filter(Boolean).join(' ');
  const head = `${A[1]} story: ${f.title}\nEmphasis: ${A[2]}\n`;
  const body = variant === 'car' ? `\nChallenge: ${firstSentence(f.problem) || ADD('situation')} ${task}\n\nAction: ${action}\n\nResult: ${result}` : `\nSituation: ${firstSentence(f.problem) || ADD('context and stakes')}\n\nTask: ${task}\n\nAction: ${action}\n\nResult: ${result}`;
  return head + body + `\n\nLikely follow-ups: "What would you do differently?" "What did the alternative do better?" "How did you know it worked?"`;
}
function genAdrExport(a, variant) {
  const ch = chosenOpt(a);
  if (variant === 'interview') return [`${a.title} (spoken summary, about 90 seconds)`, '', `Context: ${firstSentence(a.context)}`, `Options I weighed: ${named(a).map(o => o.name).join(', ')}.`, `Decision: ${ch ? ch.name : 'not chosen yet'}. ${firstSentence(a.rationale || a.decision)}`, `Trade-off: ${firstSentence(a.tradeoffs) || 'n/a'}`, `Consequences: ${firstSentence(a.consequencesPos)} ${firstSentence(a.consequencesNeg)}`.trim(), `Recommendation: ${firstSentence(a.decision)} Revisit if ${lc(a.reviewTrigger) || 'the drivers change'}.`].join('\n');
  return [`# ${a.title}`, '', `**Status:** ${a.status} · **Providers:** ${a.providers.join(', ') || 'n/a'} · **Lenses:** ${a.lenses.map(lensLabel).join(', ') || 'n/a'}`, '', '## Context', a.context || 'n/a', '', '## Options considered', ...named(a).map(o => `- **${o.name}${o === ch ? ' (chosen)' : ''}:** ${o.summary || ''}`), '', '## Decision', `${ch ? `**${ch.name}.** ` : ''}${a.decision}`, '', '## Trade-offs', a.tradeoffs || 'n/a', '', '## Consequences', `- Positive: ${a.consequencesPos || 'n/a'}`, `- Negative: ${a.consequencesNeg || 'n/a'}`, '', '## Recommendation', `${firstSentence(a.rationale || a.decision)}${a.reviewTrigger ? ` Revisit if: ${a.reviewTrigger}` : ''}`].join('\n');
}
ADR_OUTS.push(['pfready', 'ADR: portfolio-ready', a => genAdrExport(a, 'portfolio')], ['ivready', 'ADR: interview-ready', a => genAdrExport(a, 'interview'), 'txt']);
const OUT_KINDS = [['resume', 'Résumé bullets', [['short', 'Résumé (short)'], ['detailed', 'Résumé (detailed)'], ['ats', 'ATS-friendly']]], ['linkedin', 'LinkedIn draft', [['post', 'Project summary']]], ['portfolio', 'Portfolio entry', [['card', 'Project card (Markdown)']]], ['story', 'Interview story', [['star', 'STAR'], ['car', 'CAR']]], ['adr', 'ADR export', [['portfolio', 'Portfolio-ready'], ['interview', 'Interview-ready']]]];
function generate(srcKey, kind, variant, angle) {
  if (kind === 'adr') { const [k, id] = srcKey.split(':'); if (k !== 'adr') throw new Error('ADR exports need an ADR as the source.'); const a = S.ws.adrs.find(x => x.id === id); return { title: `${a.title} (${variant}-ready)`, text: genAdrExport(a, variant) }; }
  const f = facts(srcKey); if (!f) throw new Error('Pick a source first.');
  const text = kind === 'resume' ? genResume(f, variant) : kind === 'linkedin' ? genLinkedIn(f) : kind === 'portfolio' ? genPortfolio(f) : genStory(f, variant, angle);
  const label = OUT_KINDS.find(x => x[0] === kind)[2].find(v => v[0] === variant)?.[1] || kind;
  return { title: `${kind === 'story' ? ANGLES.find(a => a[0] === angle)[1] + ' story' : label}: ${f.title}`, text };
}
function createOutput(srcKey, kind, variant, angle) {
  const g = generate(srcKey, kind, variant, angle); const t = Date.now();
  const o = { id: nextId('OUT', S.ws.outputs), kind, variant, angle: kind === 'story' ? angle : '', src: srcKey, title: g.title, text: g.text, created: t, updated: t, exportedAt: 0, usedAt: 0 };
  S.ws.outputs.push(o); touch(o.id); markDirty(); return o;
}

/* ---------- Pipeline: Study → Reflection → Draft → Export → Career use */
function pipelineCounts() {
  const arts = [...S.ws.adrs, ...S.ws.portfolio, ...S.ws.interview.stories, ...S.ws.outputs];
  return [['Study', S.progress.sessions.length + S.ws.labs.length, 'sessions and labs'], ['Reflection', S.ws.reflections.length, 'reflections'], ['Draft', arts.filter(r => exportState(r) !== 'exported').length, 'drafts'], ['Export', arts.filter(r => exportState(r) === 'exported').length, 'exported'], ['Career use', S.ws.outputs.filter(o => o.usedAt).length, 'marked used']];
}
const pipelineStrip = () => `<ol class="pipe" aria-label="Study to career pipeline">${pipelineCounts().map(([l, n, s]) => `<li><strong>${n}</strong><span>${l}</span><span class="small muted">${s}</span></li>`).join('')}</ol>`;
function pipelineBar(srcKey, label) {
  return `<section class="turn-bar" aria-label="Turn this into career proof"><div><strong>${esc(label || 'Turn this into career proof')}</strong><span class="small muted"> Each draft is built from your own entries and stays editable.</span></div>
    <div class="row">${[['portfolio', 'Add to portfolio'], ['adr', 'Turn into ADR'], ['story', 'Generate interview story'], ['resume', 'Résumé bullet'], ['linkedin', 'LinkedIn draft']].map(([k, l]) => (k === 'adr' && srcKey.startsWith('adr:')) || (k === 'portfolio' && srcKey.startsWith('pf:')) ? '' : `<button class="btn sm" data-action="x4-turn" data-src="${esc(srcKey)}" data-v="${k}">${l}</button>`).join('')}</div></section>`;
}
function turnInto(srcKey, what) {
  const f = facts(srcKey);
  if (what === 'portfolio') { const p = newPf({ title: f.title, provider: PROVIDERS.includes(f.provider) ? f.provider : '', type: f.lab ? 'Lab case study' : 'Work project', problem: f.problem, architecture: f.approach || '', security: f.security || '', resilience: f.ops || '', tradeoffs: f.tradeoff || '', outcome: f.outcome || '', lessons: f.lesson || '', services: f.services, adrIds: f.adrIds || [], labIds: f.labIds || [], source: srcKey }); S.p3.pfTab = 'write'; go('portfolio', p.id); return; }
  if (what === 'adr') { const a = newAdr({ title: f.title, context: f.problem, decision: f.approach || '', tradeoffs: f.tradeoff || '', services: f.services, source: srcKey, related: f.title }); S.p3.adrTab = 'write'; go('adr', a.id); return; }
  if (what === 'story') { const s = newStory({ title: f.title, source: f.k === 'pf' ? 'Portfolio project' : f.lab ? 'Architecture lab' : 'Other work experience', situation: f.problem, action: f.approach || '', result: f.outcome || '', adrIds: f.adrIds || [], pfIds: f.pfIds || [], labIds: f.labIds || [], competencies: ['technical'] }); S.p3.storyTab = 'write'; go('interview', 'story/' + s.id); return; }
  const o = createOutput(srcKey, what, what === 'resume' ? 'detailed' : 'post'); go('outputs', 'item/' + o.id); showStatus(`${o.id} drafted. Edit it, then copy or export.`);
}
function reflectionCard(src, key) {
  const done = S.ws.reflections.find(r => r.key === key);
  if (done) return `<section class="card"><h2>Reflection saved</h2><p class="small muted">${esc(done.text)}</p>${pipelineBar('ref:' + done.id, 'Turn this session into career proof')}</section>`;
  return `<section class="card" aria-labelledby="h-refl"><h2 id="h-refl">Reflect before you move on</h2><p class="small muted">Two or three sentences. What did this session teach you, and what would you design or decide differently now? Reflections become the raw material for stories and portfolio entries.</p>
    <label class="sr-only" for="reflText">Reflection</label><textarea id="reflText" rows="3" autocapitalize="sentences" spellcheck="true" placeholder="I kept confusing… The deciding requirement is usually…"></textarea>
    <div class="row" style="margin-top:10px"><button class="btn primary" data-action="x4-reflect" data-key="${esc(key)}" data-src="${esc(JSON.stringify(src))}">Save reflection</button></div></section>`;
}

/* ---------- Views: Career outputs and Export Center */
VIEWS.outputs = (arg = '') => {
  const [tab = 'generate', id] = arg.split('/');
  if (tab === 'item' && id) return outputEditor(id);
  const pend = pendingExports().length;
  return `<div class="page-head"><div><h1>Career outputs</h1><p class="muted">Turn study and design work into résumé bullets, LinkedIn drafts, portfolio entries, interview stories, and ADR exports, then export them for real use.</p></div><a class="btn primary" href="#/outputs/export">Export Center${pend ? ` (${pend} pending)` : ''}</a></div>
  ${pipelineStrip()}
  <nav class="tabs" aria-label="Career outputs sections" style="margin-top:16px">${[['generate', 'Generate'], ['library', `Saved outputs (${S.ws.outputs.length})`], ['export', 'Export Center']].map(([k, l]) => `<a href="#/outputs/${k}" ${tab === k ? 'aria-current="page"' : ''}>${l}</a>`).join('')}</nav>
  <div style="margin-top:16px">${tab === 'export' ? exportCenter() : tab === 'library' ? outputLibrary() : generatorView()}</div>`;
};
function generatorView() {
  const src = sourceList(); const P = S.p4; const kind = OUT_KINDS.find(k => k[0] === P.genKind) || OUT_KINDS[0];
  if (!kind[2].some(v => v[0] === P.genVar)) P.genVar = kind[2][0][0];
  if (!src.some(s => s[0] === P.genSrc)) P.genSrc = src[0]?.[0] || '';
  if (!src.length) return emptyState('Nothing to convert yet', 'Finish a lab attempt, write an ADR or story, save a reflection after a study session, or answer at least 10 questions in a certification. Those become sources here.', '<a class="btn primary" href="#/lab">Architecture lab</a><a class="btn" href="#/study">Study</a>');
  const groups = uniq(src.map(s => s[1]));
  return `<section class="card form-card"><h2>Generate a draft</h2>
    <div class="field fgap"><label for="g4-src">Source</label><select id="g4-src" data-p4="genSrc">${groups.map(g => `<optgroup label="${esc(g)}">${src.filter(s => s[1] === g).map(([k, , l]) => `<option value="${esc(k)}" ${k === P.genSrc ? 'selected' : ''}>${esc(l)}</option>`).join('')}</optgroup>`).join('')}</select></div>
    <div class="field fgap"><span class="lbl" id="g4-kl">Output</span><div class="seg-control wrap tabbar" role="group" aria-labelledby="g4-kl">${OUT_KINDS.map(([k, l]) => `<button type="button" data-action="x4-gkind" data-v="${k}" aria-pressed="${P.genKind === k}">${l}</button>`).join('')}</div></div>
    <div class="grid g-2"><div class="field fgap"><label for="g4-var">Variant</label><select id="g4-var" data-p4="genVar">${opts(kind[2], P.genVar)}</select></div>
    ${P.genKind === 'story' ? `<div class="field fgap"><label for="g4-ang">Interview angle</label><select id="g4-ang" data-p4="genAngle">${opts(ANGLES.map(a => [a[0], a[1]]), P.genAngle)}</select></div>` : ''}</div>
    ${P.genKind === 'adr' && !P.genSrc.startsWith('adr:') ? '<p class="small late fgap">Pick an ADR as the source for ADR exports.</p>' : ''}
    <div class="row" style="margin-top:16px"><button class="btn primary" data-action="x4-generate" ${P.genKind === 'adr' && !P.genSrc.startsWith('adr:') ? 'disabled' : ''}>Generate draft</button><span class="small muted">Drafts use only what you wrote. Anything missing appears as [Add: …] so nothing is invented.</span></div></section>`;
}
function outputLibrary() {
  const f = S.p4.outFilter; const list = S.ws.outputs.filter(o => !f || o.kind === f).sort((a, b) => b.updated - a.updated);
  if (!S.ws.outputs.length) return emptyState('No saved outputs yet', 'Generate a draft from a lab, ADR, project, story, or reflection.', '<a class="btn primary" href="#/outputs/generate">Generate</a>');
  return `<div class="row" style="margin-bottom:12px" role="group" aria-label="Filter">${[['', 'All'], ...OUT_KINDS.map(k => [k[0], k[1]])].map(([k, l]) => `<button class="chip" data-action="x4-ofilter" data-v="${k}" aria-pressed="${f === k}">${l}</button>`).join('')}</div>
  <div class="stack">${list.map(o => `<a class="lib-item" href="#/outputs/item/${o.id}"><div class="lib-top"><strong>${esc(o.id)}</strong>${stateChip(o)}${o.usedAt ? '<span class="chip ok-chip">Used</span>' : ''}<span class="spacer"></span><span class="small muted">Last updated ${humanTime(o.updated)}</span></div><div class="qline">${esc(o.title)}</div></a>`).join('')}</div>`;
}
function outputEditor(id) {
  const o = S.ws.outputs.find(x => x.id === id); if (!o) return emptyState('Output not found', 'It may have been deleted, or its workspace has not been restored.', '<a class="btn" href="#/outputs/library">Saved outputs</a>');
  const [sk, sid] = o.src.split(':');
  return `<div class="run-head"><a class="btn sm ghost" href="#/outputs/library">← Saved outputs</a><span class="title">${esc(o.id)}</span><span class="spacer"></span>${stateChip(o)}</div>
  <section class="card form-card" data-rec="out:${o.id}">${fieldText('o-title', 'Title', 'title', o.title)}
    <div class="field fgap"><label for="o-text">Draft (edit freely; your edits are kept)</label><textarea id="o-text" class="out-text" rows="16" data-bind="text" ${TA}>${esc(o.text)}</textarea></div>
    <p class="small muted fgap">Source: ${esc(o.src)} · created ${humanTime(o.created)} · last updated ${humanTime(o.updated)}${o.usedAt ? ` · marked used ${humanTime(o.usedAt)}` : ''}</p>
    <div class="row" style="margin-top:12px"><button class="btn primary" data-action="x4-o-copy" data-id="${o.id}">Copy</button><button class="btn" data-action="x4-o-dl" data-id="${o.id}">Download (.${o.kind === 'adr' && o.variant === 'portfolio' || o.kind === 'portfolio' ? 'md' : 'txt'})</button><button class="btn" data-action="x4-o-regen" data-id="${o.id}">Regenerate from source</button><button class="btn ${o.usedAt ? 'ghost' : ''}" data-action="x4-o-used" data-id="${o.id}">${o.usedAt ? 'Unmark used' : 'Mark as used'}</button><span class="spacer"></span><button class="btn danger" data-action="x4-o-del" data-id="${o.id}">Delete</button></div></section>
  ${['adr', 'pf', 'story'].includes(sk) ? `<p class="small" style="margin-top:12px"><a href="${recHref(sk, { id: sid })}">Open the source ${KIND_LABEL[sk].toLowerCase()}</a></p>` : ''}`;
}
function exportCenter() {
  const pend = pendingExports(); const u = unsavedSummary(); const log = [...S.ws.exportLog].reverse();
  const lastArt = log.find(l => l.kind !== 'workspace'); const kinds = uniq(log.map(l => l.kind));
  return `<div class="grid g-3">
    ${persistOK() ? `<div class="card kpi"><div class="l">Saved on this device</div><div class="v small-v">${PERSIST.savedAt ? humanTime(PERSIST.savedAt) : 'Automatic'}</div><div class="s">Everything saves as you work. Files below are backups and copies for other devices.</div></div>` : `<div class="card kpi"><div class="l">In this tab only</div><div class="v">${u.arts + (u.ans ? 1 : 0) ? u.arts : 0}<small class="small muted"> artifacts</small></div><div class="s">${u.ans} answers since last save. Storage is blocked, so these are lost if the tab closes.</div></div>`}
    <div class="card kpi"><div class="l">Saved in workspace file</div><div class="v small-v">${S.meta2.savedAt ? humanTime(S.meta2.savedAt) : 'Not yet'}</div><div class="s">Restore it any time from Settings or here.</div></div>
    <div class="card kpi"><div class="l">Exported artifacts</div><div class="v small-v">${lastArt ? humanTime(lastArt.t) : 'None yet'}</div><div class="s">${kinds.filter(k => k !== 'workspace').join(', ') || 'Nothing exported yet'}</div></div></div>
  <section class="card" style="margin-top:16px"><div class="card-head"><h2>Save everything (JSON)</h2></div><p class="small muted" style="margin-bottom:12px">One file holds study state, answers, flags, confidence, retention queues, ADRs, stories, projects, lab notes, reflections, generated outputs, and open drafts. Re-import it with Restore.</p>
    <div class="row"><button class="btn primary" data-action="ws-export">Save workspace (.json)</button><button class="btn" data-action="ws-import">Restore or import</button><button class="btn" data-action="x-exp-artifacts">Artifacts only (.json)</button></div></section>
  <section class="card" style="margin-top:16px"><div class="card-head"><h2>Pending export (${pend.length})</h2>${pend.length ? `<div class="row"><button class="btn sm" data-action="x4-sel-all">Select all</button><button class="btn sm primary" data-action="x4-exp-sel" ${S.p4.sel.size ? '' : 'disabled'}>Export selected (.md)</button></div>` : ''}</div>
    ${pend.length ? `<div class="stack" style="gap:6px">${pend.map(([k, r]) => `<label class="pend-row"><input type="checkbox" data-sel4="${esc(r.id)}" ${S.p4.sel.has(r.id) ? 'checked' : ''}><span class="pend-main"><strong>${esc(r.id)}</strong> ${esc(recTitle(k, r))}<span class="small muted"> · ${KIND_LABEL[k]} · last updated ${humanTime(recUpdated(r))}</span></span>${stateChip(r)}</label>`).join('')}</div>` : '<p class="muted">Everything you have written has been exported. New edits will appear here.</p>'}</section>
  <section class="card" style="margin-top:16px"><h2>Quick exports</h2><div class="out-grid">${[['x4-exp-all', 'Everything (.md bundle)', 'ADRs, projects, stories, outputs, reflections, lab notes'], ['x-exp-adrs', 'ADRs (.md)', `${S.ws.adrs.length}`], ['x-exp-cases', 'Portfolio case studies (.md)', `${S.ws.portfolio.length}`], ['x-exp-site', 'Portfolio site (.html)', 'Portfolio-ready projects'], ['x4-exp-kind', 'Résumé bullets (.md)', 'Saved résumé outputs + project bullets', 'resume'], ['x4-exp-kind', 'LinkedIn drafts (.md)', 'Saved LinkedIn outputs', 'linkedin'], ['x-exp-stories', 'STAR stories (.md)', `${S.ws.interview.stories.length}`], ['x4-exp-kind', 'Interview stories, generated (.md)', 'STAR/CAR outputs', 'story'], ['x-exp-report', 'Study summary (.md)', 'Scores and certification detail'], ['x-exp-queue', 'Review queue (.md)', 'With why each item is due'], ['x-exp-weak', 'Domain weakness (.md)', 'By certification'], ['x-exp-labs', 'Lab notes (.md)', 'Drafts and attempts']].map(([a, l, s, v]) => `<button class="out-btn" data-action="${a}" ${v ? `data-v="${v}"` : ''}><strong>${l}</strong><span class="small muted">${esc(s)}</span></button>`).join('')}</div></section>
  <section class="card" style="margin-top:16px"><h2>Section resets</h2><p class="small muted" style="margin-bottom:12px">Clear one area without touching the rest. A backup is taken first and Undo appears afterward.</p><div class="row">${SECTION_RESETS.map(([k, l]) => `<button class="btn sm danger" data-action="x4-reset" data-v="${k}">Clear ${l}</button>`).join('')}</div></section>
  <section class="card" style="margin-top:16px"><h2>Export history</h2>${log.length ? `<div class="list">${log.slice(0, 15).map(l => `<div class="list-item"><span><strong>${esc(l.kind)}</strong> <span class="small muted">${esc(l.file)}</span></span><span class="small muted">${l.count} item${l.count === 1 ? '' : 's'} · ${humanTime(l.t)}</span></div>`).join('')}</div>` : '<p class="muted small">No exports yet in this workspace.</p>'}</section>`;
}
const SECTION_RESETS = [['retention', 'retention schedule'], ['adrs', 'ADRs'], ['portfolio', 'portfolio'], ['stories', 'STAR stories'], ['interview', 'interview attempts'], ['labs', 'lab work'], ['outputs', 'career outputs'], ['career', 'career plans']];
function sectionReset(kind) {
  const w = S.ws; const sid = snapshot(`Before clearing ${kind}`);
  ({ retention: () => { w.srs = {}; w.recallLog = []; }, adrs: () => { w.adrs = []; w.portfolio.forEach(p => p.adrIds = []); }, portfolio: () => { w.portfolio = []; }, stories: () => { w.interview.stories = []; }, interview: () => { w.interview.answers = []; w.interview.exec = []; w.interview.boards = []; }, labs: () => { w.labs = []; w.labDrafts = {}; }, outputs: () => { w.outputs = []; w.reflections = []; }, career: () => { w.career.weeks = {}; w.career.milestones = []; w.career.apps = []; w.career.roles = []; } })[kind]();
  markDirty(); render(); showStatus(`Cleared ${SECTION_RESETS.find(x => x[0] === kind)[1]}.`, sid);
}
/* Confirmation modal (opened only on explicit destructive actions; never used for navigation). */
const dlg4 = document.createElement('dialog'); dlg4.id = 'dlg4'; dlg4.className = 'confirm-dlg'; dlg4.setAttribute('aria-labelledby', 'dlg4-t'); document.body.append(dlg4);
function confirmModal(title, body, okLabel, onOk) {
  dlg4.innerHTML = `<h2 id="dlg4-t">${esc(title)}</h2><p>${esc(body)}</p><div class="row" style="margin-top:16px"><button class="btn danger" id="dlg4-ok">${esc(okLabel)}</button><button class="btn" id="dlg4-cancel">Cancel</button></div>`;
  dlg4.showModal(); $('#dlg4-cancel').focus();
  $('#dlg4-ok').onclick = () => { dlg4.close(); onOk(); }; $('#dlg4-cancel').onclick = () => dlg4.close();
}

/* ---------- Dashboard: continuity first, then today, outputs, recent work */
function careerUsefulThisWeek() {
  const wk = Date.now() - 7 * DAY; const items = [];
  S.ws.portfolio.forEach(p => recUpdated(p) > wk && items.push([{ interview: 5, portfolio: 4, draft: 2 }[p.status], 'Portfolio', p.title || p.id, '#/portfolio/' + p.id, PF_STATUS3.find(x => x[0] === p.status)[1]]));
  S.ws.adrs.forEach(a => recUpdated(a) > wk && items.push([adrQuality(a).total >= 75 ? 4 : 2, 'ADR', a.title || a.id, '#/adr/' + a.id, `Quality ${adrQuality(a).total}`]));
  S.ws.interview.stories.forEach(s => recUpdated(s) > wk && items.push([{ ready: 4, polished: 3, drafted: 1 }[s.status], 'Story', s.title || s.id, '#/interview/story/' + s.id, STORY_STATUS.find(x => x[0] === s.status)[1]]));
  S.ws.outputs.forEach(o => o.updated > wk && items.push([o.usedAt ? 5 : 3, 'Output', o.title, '#/outputs/item/' + o.id, o.usedAt ? 'Used' : exportState(o) === 'exported' ? 'Exported' : 'Draft']));
  S.ws.labs.forEach(l => l.t > wk && l.score >= 70 && items.push([3, 'Lab', LAB_SCENARIOS.find(s => s.id === l.sid)?.title, '#/lab/' + l.sid, `${l.score}%`]));
  return items.sort((a, b) => b[0] - a[0]).slice(0, 5);
}
const recentList = (recs, href, sub) => recs.length ? `<div class="list">${recs.slice(0, 3).map(r => `<a class="list-item linkrow" href="${href(r)}"><span>${esc(r.title || r.id)}</span><span class="small muted">${sub(r)}</span></a>`).join('')}</div>` : '<p class="small muted">None yet.</p>';
VIEWS.dashboard = () => {
  const scores = allScores(); const cont = continueTarget(); const T = S.ws.trail; const prof = S.ws.career.profile;
  const q = queues(); const plan = dailyPlan(20, ''); const rs = retentionStats(); const pend = pendingExports(); const u = unsavedSummary();
  const lastArea = ['study', 'artifact', 'story'].map(k => T[k] && { ...T[k], k }).filter(Boolean).sort((a, b) => b.t - a.t)[0];
  const drafts = [...S.ws.adrs, ...S.ws.portfolio, ...S.ws.interview.stories, ...S.ws.outputs].filter(r => exportState(r) !== 'exported').length;
  const useful = careerUsefulThisWeek(); const byU = a => [...a].sort((x, y) => recUpdated(y) - recUpdated(x));
  return `
  <div class="page-head"><div><h1>${prof.name ? `${esc(prof.name.split(' ')[0])}'s command center` : 'Command center'}</h1><p class="muted">Study, convert, export. Focus certification: <strong>${esc(focusExam() || 'none')}</strong> <a href="#/career/profile">change</a></p></div>${S.dirty && !persistOK() ? '<button class="btn" data-action="ws-export">Save workspace</button>' : ''}</div>
  <section class="continue-card" aria-labelledby="h-cont"><div><span class="tl">Continue where you left off</span><h2 id="h-cont">${cont ? esc(cont.label.replace(/^Continue: /, '')) : 'Start with today’s review'}</h2>
    <p class="small muted">${lastArea ? `Last active area: ${esc(lastArea.label)} · ${humanTime(lastArea.t)}` : 'No activity yet in this workspace.'}</p></div>
    <a class="btn primary" href="${cont ? cont.href : '#/retention'}">${cont ? 'Continue' : 'Open daily review'}</a></section>
  <div class="grid g-3" style="margin-top:16px">
    <section class="card"><div class="card-head"><h2>Today’s daily review</h2></div><p class="big-num">${plan.length}<span class="small muted"> items · about 20 min</span></p><div class="row" style="margin-top:10px"><button class="btn primary" data-action="x4-daily">Start review</button><a class="btn ghost" href="#/retention">Options</a></div></section>
    <section class="card"><div class="card-head"><h2>Review queue</h2><a class="small" href="#/retention">Open</a></div><dl class="dstat"><div><dt>Missed</dt><dd>${q.missed.length}</dd></div><div><dt>Low confidence</dt><dd>${q.low.length}</dd></div><div><dt>Due</dt><dd>${q.due.length}</dd></div></dl></section>
    <section class="card"><div class="card-head"><h2>Retention health</h2></div><p class="big-num">${rs.health}<span class="small muted">/100</span></p><p class="small muted">${rs.cards ? `${rs.cards} cards · ${rs.recall}% recent recall · ${rs.overdue} overdue` : 'Starts after your first answers.'}</p></section>
  </div>
  <section class="card outputs-card" style="margin-top:16px"><div class="card-head"><h2>Career outputs</h2><div class="row"><a class="btn sm" href="#/outputs/generate">Generate</a><a class="btn sm primary" href="#/outputs/export">Export Center</a></div></div>
    <div class="row" style="gap:20px;margin-bottom:12px"><span><strong>${drafts}</strong> <span class="small muted">drafts not yet exported</span></span><span><strong>${pend.length}</strong> <span class="small muted">items pending export</span></span>${persistOK() ? '<span><strong>Auto</strong> <span class="small muted">saved on this device</span></span>' : `<span><strong>${u.arts}</strong> <span class="small muted">in this tab only</span></span>`}</div>${pipelineStrip()}</section>
  <div class="grid g-2" style="margin-top:16px">
    <section class="card"><h2>Most career-useful work this week</h2>${useful.length ? `<div class="list">${useful.map(([, k, t, h, s]) => `<a class="list-item linkrow" href="${h}"><span><span class="chip">${k}</span> ${esc(t)}</span><span class="small muted">${esc(s)}</span></a>`).join('')}</div>` : '<p class="small muted">Nothing yet this week. A lab attempt turned into an ADR is the fastest proof you can create.</p>'}</section>
    <section class="card"><h2>Next best moves</h2><ol class="moves">${nextMoves(scores).map(([t, why, href]) => `<li><a href="${href}"><strong>${esc(t)}</strong><span class="small muted">${esc(why)}</span></a></li>`).join('')}</ol></section>
  </div>
  <div class="grid g-3" style="margin-top:16px">
    <section class="card"><div class="card-head"><h3>Recent ADRs</h3><a class="small" href="#/adr">All</a></div>${recentList(byU(S.ws.adrs), r => '#/adr/' + r.id, r => `Last updated ${humanTime(recUpdated(r))}`)}</section>
    <section class="card"><div class="card-head"><h3>Recent interview stories</h3><a class="small" href="#/interview/stories">All</a></div>${recentList(byU(S.ws.interview.stories), r => '#/interview/story/' + r.id, r => STORY_STATUS.find(x => x[0] === r.status)[1])}</section>
    <section class="card"><div class="card-head"><h3>Recent résumé and LinkedIn outputs</h3><a class="small" href="#/outputs/library">All</a></div>${recentList(byU(S.ws.outputs.filter(o => ['resume', 'linkedin'].includes(o.kind))), r => '#/outputs/item/' + r.id, r => exportState(r) === 'exported' ? 'Exported' : 'Draft not yet exported')}</section>
  </div>
  <section class="score-grid" style="margin-top:16px" aria-label="Readiness scores">${scores.map(tile).join('')}</section>`;
};

/* ---------- Continuity chrome: breadcrumbs + save reminder (wraps chrome from Phase 3) */
const _chrome3 = chrome;
function crumbTrail(r) {
  const navL = k => NAV.find(n => n[0] === k)?.[1] || k; const parts = [['#/dashboard', 'Command center']];
  if (r.name !== 'dashboard') parts.push(['#/' + r.name, navL(r.name)]);
  const a = r.arg || '';
  if (r.name === 'adr' && a) parts.push(['', a]); else if (r.name === 'portfolio' && a) parts.push(['', a]); else if (r.name === 'lab' && a) parts.push(['', LAB_SCENARIOS.find(s => s.id === a)?.title || a]);
  else if (r.name === 'interview' && a) { const [t, id] = a.split('/'); parts.push(['#/interview/' + (t === 'story' ? 'stories' : t === 'q' ? 'practice' : t === 'ex' ? 'exec' : t === 'wb' ? 'whiteboard' : t), { story: 'STAR stories', q: 'Mock questions', ex: 'Executive summaries', wb: 'Whiteboard', practice: 'Mock questions', stories: 'STAR stories', exec: 'Executive summaries', whiteboard: 'Whiteboard' }[t] || t]); if (id) parts.push(['', id]); }
  else if (r.name === 'outputs' && a) { const [t, id] = a.split('/'); parts.push(['#/outputs/' + (t === 'item' ? 'library' : t), { item: 'Saved outputs', library: 'Saved outputs', generate: 'Generate', export: 'Export Center' }[t] || t]); if (id) parts.push(['', id]); }
  else if (r.name === 'career' && a) parts.push(['', a[0].toUpperCase() + a.slice(1)]);
  return `<nav class="crumbbar" aria-label="Breadcrumb"><ol>${parts.map(([h, l], i) => `<li>${h && i < parts.length - 1 ? `<a href="${h}">${esc(l)}</a>` : `<span aria-current="${i === parts.length - 1 ? 'page' : 'false'}">${esc(l)}</span>`}</li>`).join('')}</ol></nav>`;
}
function saveReminder() {
  const u = unsavedSummary(); if (persistOK() || !S.dirty || (u.arts < 1 && u.ans < 10)) return '';
  const bits = [u.arts && `${u.arts} artifact${u.arts === 1 ? '' : 's'}`, u.ans && `${u.ans} answer${u.ans === 1 ? '' : 's'}`].filter(Boolean).join(' and ');
  return `<div class="save-banner" role="status"><span><strong>Not saved yet:</strong> ${bits} exist only in this tab. Closing the tab loses them.</span><button class="btn sm primary" data-action="ws-export">Save workspace</button><a class="btn sm ghost" href="#/outputs/export">Export Center</a></div>`;
}
chrome = name => { const r = route(); if (['run', 'rs', 'menu'].includes(name)) return _chrome3(name); return crumbTrail(r) + _chrome3(name) + saveReminder(); };

/* ---------- Session restore: per-record tabs, scroll position, leaving-editor notices */
const EDIT_ROUTES = { adr: 'adr', portfolio: 'pf', interview: 'story', outputs: 'out' };
window.addEventListener('scroll', () => { S.p4.scroll[location.hash] = window.scrollY; }, { passive: true });
window.addEventListener('hashchange', e => {
  const from = new URL(e.oldURL).hash.replace(/^#\/?/, '').split('/'); const r = route();
  if (r.name === 'adr' && r.arg) S.p3.adrTab = S.ws.panels['adr:' + r.arg] || 'write';
  if (r.name === 'portfolio' && r.arg) S.p3.pfTab = S.ws.panels['pf:' + r.arg] || 'write';
  if (r.name === 'interview' && r.arg.startsWith('story/')) S.p3.storyTab = S.ws.panels['story:' + r.arg.slice(6)] || 'write';
  const id = from[0] === 'interview' ? (from[1] === 'story' ? from[2] : '') : from[0] === 'outputs' ? (from[1] === 'item' ? from[2] : '') : from[1];
  const leftEditor = EDIT_ROUTES[from[0]] && id && ('#/' + from.join('/')) !== location.hash;
  if (leftEditor) { const rec = allArtifacts().find(([, x]) => x.id === id)?.[1]; if (rec && exportState(rec) !== 'exported' && S.meta2.touched.has(id)) setTimeout(() => showStatus(`${id} ${persistOK() ? 'is saved on this device but not exported yet. Export it from the Export Center when it is ready to share.' : 'is kept in this tab but not exported yet. Save the workspace or export it from the Export Center.'}`), 0); }
  const y = S.p4.scroll[location.hash]; if (y) setTimeout(() => window.scrollTo(0, y), 0);
});
function afterRender4() {
  const r = route();
  if (r.name === 'adr' && r.arg) S.ws.panels['adr:' + r.arg] = S.p3.adrTab;
  if (r.name === 'portfolio' && r.arg) S.ws.panels['pf:' + r.arg] = S.p3.pfTab;
  if (r.name === 'interview' && r.arg.startsWith('story/')) S.ws.panels['story:' + r.arg.slice(6)] = S.p3.storyTab || 'write';
  if (r.name === 'outputs' && r.arg.startsWith('item/')) { S.ws.trail.artifact = { label: 'Output ' + r.arg.slice(5), href: '#/' + r.name + '/' + r.arg, t: Date.now() }; }
}

/* ---------- Results and review completion get a reflection + pipeline */
const _results = VIEWS.results;
VIEWS.results = arg => { const r = S.lastResult; const base = _results(arg); if (!r || !r.answered) return base; return base + reflectionCard({ kind: 'session', title: r.title, exam: r.exam, score: Math.round(r.correct / Math.max(1, r.total) * 100), total: r.total }, 'session:' + r.id); };
const _rs = VIEWS.rs;
VIEWS.rs = arg => { const r = S.rs; const base = _rs(arg); if (!r || r.idx < r.items.length || !r.results.length) return base; const ok = r.results.filter(x => x.g >= 3).length; return base + reflectionCard({ kind: 'review', title: r.title, exam: '', score: Math.round(ok / r.results.length * 100), total: r.results.length }, 'review:' + r.started); };
const _labV = VIEWS.lab;
VIEWS.lab = arg => { const html = _labV(arg); if (!arg) return html; const best = S.ws.labs.filter(l => l.sid === arg).sort((a, b) => b.score - a.score)[0]; return best ? html + pipelineBar('lab:' + best.id, 'Turn your best attempt into career proof') : html; };
const _adrV = VIEWS.adr; VIEWS.adr = arg => { const html = _adrV(arg); return arg && S.ws.adrs.some(a => a.id === arg) ? html + pipelineBar('adr:' + arg) : html; };
const _pfV = VIEWS.portfolio; VIEWS.portfolio = arg => { const html = _pfV(arg); return arg && S.ws.portfolio.some(p => p.id === arg) ? html + pipelineBar('pf:' + arg) : html; };
const _ivV = VIEWS.interview; VIEWS.interview = (arg = '') => { const html = _ivV(arg); const m = arg.match(/^story\/(STAR-\d+)/); return m && S.ws.interview.stories.some(s => s.id === m[1]) ? html + pipelineBar('story:' + m[1], 'Use this story elsewhere') : html; };

/* ---------- Events */
document.addEventListener('change', e => {
  const el = e.target;
  if (el.dataset.p4) { S.p4[el.dataset.p4] = el.value; render(); $('#' + el.id)?.focus(); }
  if (el.dataset.sel4) { el.checked ? S.p4.sel.add(el.dataset.sel4) : S.p4.sel.delete(el.dataset.sel4); const b = $('[data-action="x4-exp-sel"]'); if (b) b.disabled = !S.p4.sel.size; }
});
const recMd = (k, r) => ({ adr: adrMarkdown, pf: pfCaseStudy, story: storySummary, out: o => `## ${o.title}\n\n${o.text}`, ref: x => `## ${recTitle('ref', x)}\n\n${x.text}` }[k](r));
document.addEventListener('click', e => {
  const b = e.target.closest('[data-action]'); if (!b) return; const d = b.dataset; const a = d.action;
  const dl = (name, text, type) => { downloadText(name, text, type); showStatus(`Exported ${name}. Check your downloads.`); return name; };
  const fx = {
    'x4-gkind': () => { S.p4.genKind = d.v; render(); },
    'x4-generate': () => { try { const o = createOutput(S.p4.genSrc, S.p4.genKind, S.p4.genVar, S.p4.genAngle); go('outputs', 'item/' + o.id); showStatus(`${o.id} drafted. Review the wording, fill any [Add: …] gaps, then copy or export.`); } catch (err) { showStatus(err.message); } },
    'x4-ofilter': () => { S.p4.outFilter = d.v; render(); },
    'x4-o-copy': async () => { const o = S.ws.outputs.find(x => x.id === d.id); try { await navigator.clipboard.writeText(o.text); } catch { const ta = $('#o-text'); ta.select(); document.execCommand && document.execCommand('copy'); } markExported([o], 'copy', o.id); render(); showStatus('Copied. Marked as exported.'); },
    'x4-o-dl': () => { const o = S.ws.outputs.find(x => x.id === d.id); const md = (o.kind === 'adr' && o.variant === 'portfolio') || o.kind === 'portfolio'; const f = dl(`cloudwalker-${o.kind}-${o.id}-${stamp()}.${md ? 'md' : 'txt'}`, o.text, md ? 'text/markdown' : 'text/plain'); markExported([o], o.kind, f); render(); },
    'x4-o-regen': () => { const o = S.ws.outputs.find(x => x.id === d.id); confirmModal('Regenerate this draft?', 'Your edits to the text will be replaced with a fresh draft from the source. A backup is taken first.', 'Regenerate', () => { const sid = snapshot('Before regenerating ' + o.id); try { const g = generate(o.src, o.kind, o.variant, o.angle || 'decision'); o.text = g.text; o.updated = Date.now(); markDirty(); render(); showStatus('Draft regenerated.', sid); } catch (err) { showStatus(err.message); } }); },
    'x4-o-used': () => { const o = S.ws.outputs.find(x => x.id === d.id); o.usedAt = o.usedAt ? 0 : Date.now(); markDirty(); render(); },
    'x4-o-del': () => { confirmModal(`Delete ${d.id}?`, 'This removes the saved output. You can undo for a short time afterward.', 'Delete', () => { deleteWithUndo(d.id, () => { S.ws.outputs = S.ws.outputs.filter(x => x.id !== d.id); }); go('outputs', 'library'); }); },
    'x4-turn': () => turnInto(d.src, d.v),
    'x4-reflect': () => { const t = $('#reflText').value.trim(); if (words(t) < 3) { showStatus('Write at least a sentence first.'); $('#reflText').focus(); return; } const r = { id: nextId('REF', S.ws.reflections), key: d.key, src: JSON.parse(d.src), text: t, t: Date.now(), updated: Date.now() }; S.ws.reflections.push(r); touch(r.id); markDirty(); render(); showStatus('Reflection saved. Turn it into a story or bullet below.'); },
    'x4-daily': () => startRs(dailyPlan(20, ''), '20-minute daily review'),
    'x4-sel-all': () => { pendingExports().forEach(([, r]) => S.p4.sel.add(r.id)); render(); },
    'x4-exp-sel': () => { const recs = pendingExports().filter(([, r]) => S.p4.sel.has(r.id)); const f = dl(`cloudwalker-selected-${stamp()}.md`, `# CloudWalker export\n\nExported ${fmtDate(Date.now())}.\n\n` + recs.map(([k, r]) => recMd(k, r)).join('\n\n---\n\n')); markExported(recs.map(x => x[1]), 'selected', f); S.p4.sel.clear(); render(); },
    'x4-exp-all': () => { const recs = allArtifacts(); const f = dl(`cloudwalker-all-artifacts-${stamp()}.md`, bundleMd() + '\n\n# Career outputs\n\n' + S.ws.outputs.map(o => recMd('out', o)).join('\n\n') + '\n\n# Reflections\n\n' + S.ws.reflections.map(r => recMd('ref', r)).join('\n\n')); markExported(recs.map(x => x[1]), 'bundle', f); render(); },
    'x4-exp-kind': () => { const outs = S.ws.outputs.filter(o => o.kind === d.v); const extra = d.v === 'resume' ? S.ws.portfolio.map(p => `## ${p.title || p.id} (from portfolio)\n\n${pfResume(p)}`) : []; if (!outs.length && !extra.length) { showStatus('Nothing of that type yet. Generate one first.'); return; } const f = dl(`cloudwalker-${d.v}-${stamp()}.md`, `# ${OUT_KINDS.find(k => k[0] === d.v)[1]}\n\n` + [...outs.map(o => recMd('out', o)), ...extra].join('\n\n---\n\n')); markExported(outs, d.v, f); render(); },
    'x4-reset': () => { const l = SECTION_RESETS.find(x => x[0] === d.v)[1]; confirmModal(`Clear ${l}?`, `This clears ${l}. Everything else stays. An undo point is taken first so you can undo until you close the tab.`, `Clear ${l}`, () => sectionReset(d.v)); },
    /* mark exports done by Phase 3 buttons */
    'x-exp-adrs': () => markExported(S.ws.adrs, 'adrs', 'adrs.md'), 'x-exp-cases': () => markExported(S.ws.portfolio, 'case studies', 'case-studies.md'),
    'x-exp-site': () => markExported(S.ws.portfolio.filter(p => p.status !== 'draft'), 'portfolio site', 'portfolio.html'), 'x-exp-stories': () => markExported(S.ws.interview.stories, 'stories', 'interview-stories.md'),
    'x-exp-bundle': () => markExported(allArtifacts().map(x => x[1]), 'bundle', 'bundle.md'), 'x-exp-resume': () => markExported(S.ws.portfolio, 'résumé', 'resume-bullets.md'),
    'x-exp-artifacts': () => markExported(allArtifacts().map(x => x[1]), 'artifacts json', 'artifacts.json'),
    'x-exp-queue': () => markExported([], 'review queue', 'review-queue.md'), 'x-exp-weak': () => markExported([], 'domain weakness', 'domain-weakness.md'), 'x-exp-report': () => markExported([], 'study summary', 'study-progress.md'), 'x-exp-labs': () => markExported([], 'lab notes', 'lab-notes.md'),
    'x-dl-out': () => { const id = (d.name || '').match(/^((?:ADR|PF|STAR)-\d+)/)?.[1]; const rec = allArtifacts().find(([, r]) => r.id === id)?.[1]; if (rec) markExported([rec], 'single', d.name); },
    'x-copy': () => { const id = route().arg.match(/(ADR|PF|STAR)-\d+/)?.[0]; const rec = allArtifacts().find(([, r]) => r.id === id)?.[1]; if (rec) markExported([rec], 'copy', id); },
    'ws-export': () => { S.meta2.savedAt = Date.now(); S.ws.exportLog.push({ t: Date.now(), kind: 'workspace', file: 'cloudwalker-workspace.json', count: allArtifacts().length }); setTimeout(render, 0); },
    'export-progress': () => markExported([], 'quiz progress', 'progress.json')
  };
  if (fx[a]) { e.preventDefault(); fx[a](); }
});

