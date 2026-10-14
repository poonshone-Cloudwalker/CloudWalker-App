/* ================================================================== Phase 3: hardening */
S.p3 = { labSaved: null, rsMinutes: 20, rsExam: '', queueTab: 'missed', adrTab: 'write', pfTab: 'write', ivCat: '', outTab: {}, status: null, resetArmed: '', detail: null, wkDomainExam: '' };
S.meta2 = { lastImport: null, lastExport: null, snaps: [], snapSeq: 0, touched: new Set() };
function ensureWs() {
  const w = S.ws;
  w.adrs ||= []; w.portfolio ||= []; w.labs ||= []; w.labDrafts ||= {}; w.srs ||= {}; w.recallLog ||= []; w.trail ||= {};
  w.interview ||= {}; w.interview.answers ||= []; w.interview.stories ||= []; w.interview.boards ||= []; w.interview.exec ||= [];
  w.career ||= {}; w.career.profile ||= { name: '', headline: '', focusExam: '', weeklyHours: 10, links: '' }; w.career.roles ||= []; w.career.weeks ||= {}; w.career.milestones ||= []; w.career.apps ||= [];
  w.adrs = w.adrs.map(normalizeAdr); w.portfolio = w.portfolio.map(normalizePf); w.interview.stories = w.interview.stories.map(normalizeStory);
  w.interview.answers = w.interview.answers.map(normalizeAnswer);
  for (const id of Object.keys(w.srs)) w.srs[id] = normCard(w.srs[id]);
  ensureWs4();
}
const dShort = d => String(d).replace(/^\d+\.\s*/, '');
const firstSentence = s => { s = String(s || '').trim(); const m = s.match(/^[\s\S]*?[.!?](\s|$)/); return (m ? m[0] : s).trim().slice(0, 260); };
const touch = id => S.meta2.touched.add(id);

/* ---------- Retention: interval ladder scheduler */
const LADDER = [[4 * 3600e3, 'Same day'], [DAY, '1 day'], [3 * DAY, '3 days'], [7 * DAY, '7 days'], [14 * DAY, '14 days'], [30 * DAY, '30 days']];
const MODE_COST = { mcq: 1, recall: 1.5, teach: 3, compare: 3 };
const MODE_LABEL = { mcq: 'Multiple choice', recall: 'Short free recall', teach: 'Teach-back', compare: 'Compare and contrast' };
function normCard(c) {
  if (!c) return null;
  if (c.stage === undefined) { const iv = (c.interval || 0) * DAY; let st = 0; LADDER.forEach(([ms], i) => { if (iv >= ms) st = i; }); c = { stage: st, due: c.due || 0, last: c.last || 0, lapses: c.lapses || 0, reviews: (c.reps || 0) + (c.lapses || 0), hist: [] }; }
  c.hist ||= []; c.stage = Math.max(0, Math.min(5, c.stage | 0)); return c;
}
function domainAcc(q) { const t = totals(x => x.exam_code === q.exam_code && x.domain === q.domain); return t.att >= 5 ? t.cor / t.att : null; }
/* grade: 1 Again (or wrong), 2 Hard (or right with low confidence), 3 Good, 4 Easy (or right with high confidence) */
function schedule(id, o) {
  const q = Q(id); if (!q) return;
  const now = o.t || Date.now();
  const prev = normCard(S.ws.srs[id] && JSON.parse(JSON.stringify(S.ws.srs[id]))) || { stage: 0, due: 0, last: 0, lapses: 0, reviews: 0, hist: [] };
  const c = prev;
  const g = o.g ?? (o.ok ? ({ high: 4, medium: 3, low: 2 }[o.conf] || 3) : 1);
  if (g === 1) { c.stage = 0; c.lapses++; } else if (g === 2) c.stage = Math.max(1, c.stage); else if (g === 3) c.stage = Math.min(5, c.stage + 1); else c.stage = Math.min(5, c.stage + 2);
  const acc = domainAcc(q); const weak = acc !== null && acc < 0.6;
  const eff = weak && c.stage > 1 ? c.stage - 1 : c.stage;
  c.due = now + LADDER[eff][0]; c.last = now; c.reviews++; c.weakAdj = weak && c.stage > 1;
  c.hist.push({ t: now, g, mode: o.mode || 'mcq' }); if (c.hist.length > 12) c.hist.shift();
  S.ws.srs[id] = c; return c;
}
function srsOnAnswer(id, correct) { S.srsPrev[id] = S.ws.srs[id] ? JSON.parse(JSON.stringify(S.ws.srs[id])) : null; schedule(id, { ok: correct, mode: S.runner?.mode === 'exam' ? 'exam' : 'mcq' }); markDirty(); }
function srsOnConfidence(id, level) {
  const last = lastAttempt(id); if (!last || !(id in S.srsPrev)) return;
  if (S.srsPrev[id]) S.ws.srs[id] = JSON.parse(JSON.stringify(S.srsPrev[id])); else delete S.ws.srs[id];
  schedule(id, { ok: last.correct, conf: level, mode: 'mcq' }); markDirty();
}
function srsRebuildMissing() {
  for (const [id, arr] of Object.entries(S.progress.answers)) {
    if (S.ws.srs[id] || !S.bank.has(id)) continue;
    for (const a of [...arr].sort((x, y) => x.t - y.t)) schedule(id, { ok: a.correct, t: a.t, mode: a.mode === 'exam' ? 'exam' : 'mcq' });
  }
}
const lastGrade = id => { const c = S.ws.srs[id]; return c && c.hist.length ? c.hist[c.hist.length - 1].g : null; };
const isMissedR = id => isMissed(id) || lastGrade(id) === 1;
function priority(id) {
  const q = Q(id), c = S.ws.srs[id], at = attempts(id), now = Date.now();
  const missRate = at.length ? at.filter(a => !a.correct).length / at.length : 0;
  const conf = S.progress.confidence[id]; const confW = conf === 'low' ? 1 : conf === 'medium' ? 0.4 : 0;
  const acc = domainAcc(q); const weak = acc === null ? 0.3 : 1 - acc;
  let over = 0; if (c) { over = Math.min(2, Math.max(0, (now - c.due) / LADDER[c.stage][0] + (c.due <= now ? 0.5 : 0))); }
  return Math.round(40 * over / 2 + 25 * missRate + 20 * confW + 15 * weak + (isMissedR(id) ? 10 : 0));
}
const fmtDue = t => { const d = new Date(t); return t - Date.now() < DAY && d.getDate() === new Date().getDate() ? `today at ${d.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' })}` : d.toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' }); };
function whyDue(id) {
  const q = Q(id), c = S.ws.srs[id], at = attempts(id), r = [], now = Date.now();
  if (!c && !at.length) r.push('New: you have not answered this yet.');
  const wrong = at.filter(a => !a.correct).length;
  if (isMissed(id)) r.push(`Missed on the last attempt (${wrong} of ${at.length} attempts wrong).`);
  else if (lastGrade(id) === 1) r.push('Last recall was graded Again.');
  else if (wrong) r.push(`${wrong} of ${at.length} attempts were wrong.`);
  const conf = S.progress.confidence[id]; if (conf === 'low') r.push('You rated your confidence Low.'); else if (conf === 'medium') r.push('You rated your confidence Medium.');
  if (c) {
    r.push(`Last reviewed ${ago(c.last)}. Interval: ${LADDER[c.stage][1]} (step ${c.stage + 1} of 6).`);
    r.push(c.due <= now ? (c.due < now - DAY ? `Overdue by ${Math.round((now - c.due) / DAY)} day(s).` : 'Due now.') : `Next due ${fmtDue(c.due)}.`);
    if (c.weakAdj) r.push('Interval shortened one step because this domain is weak.');
  }
  const acc = domainAcc(q); if (acc !== null && acc < 0.6) r.push(`Your accuracy in ${q.exam_code} ${dShort(q.domain)} is ${Math.round(acc * 100)}%.`);
  return r;
}
function queues(f = {}) {
  const now = Date.now(); const all = p5ReviewPool().filter(q => (!f.exam || q.exam_code === f.exam) && (!f.domain || q.domain === f.domain));
  const missed = all.filter(q => isMissedR(q.id)).map(q => q.id); const ms = new Set(missed);
  const low = all.filter(q => !ms.has(q.id) && S.progress.confidence[q.id] === 'low').map(q => q.id); const ls = new Set(low);
  const due = all.filter(q => !ms.has(q.id) && !ls.has(q.id) && S.ws.srs[q.id] && S.ws.srs[q.id].due <= now).map(q => q.id);
  const unseenQs = shuffle(all.filter(q => !S.ws.srs[q.id] && !isSeen(q.id)));
  const w = q => ((examMetaFor(q.exam_code)?.domain_weights || {})[q.domain_number] || 10) * (1.5 - (domainAcc(q) ?? 0.5));
  const by = a => a.sort((x, y) => priority(y) - priority(x));
  return { missed: by(missed), low: by(low), due: by(due), unseen: unseenQs.sort((a, b) => w(b) - w(a)).map(q => q.id) };
}
function dailyPlan(minutes, exam, domain) {
  const qs = queues({ exam, domain }); let budget = minutes; const items = []; const have = new Set();
  const add = (id, mode) => { if (have.has(id) || budget - MODE_COST[mode] < -0.25) return false; items.push({ id, mode }); have.add(id); budget -= MODE_COST[mode]; return true; };
  const teachN = minutes >= 30 ? 2 : 1, cmpN = minutes >= 30 ? 2 : 1;
  qs.missed.forEach((id, i) => budget > 0 && add(id, i < teachN ? 'teach' : 'mcq'));
  qs.low.forEach((id, i) => budget > 0 && add(id, i < cmpN ? 'compare' : 'recall'));
  qs.due.forEach((id, i) => budget > 0 && add(id, i % 2 ? 'mcq' : 'recall'));
  let fresh = 0; const freshCap = Math.max(2, Math.round(minutes * 0.25));
  for (const id of qs.unseen) { if (budget < 1 || fresh >= freshCap) break; if (add(id, 'mcq')) fresh++; }
  for (const id of qs.unseen) { if (budget < 1) break; add(id, 'mcq'); }
  return items;
}
function healthOf(ids) {
  const now = Date.now(); const cards = ids.filter(id => S.ws.srs[id]); if (!cards.length) return { cards: 0, due: 0, overdue: 0, mature: 0, recall: 0, onTime: 0, health: 0 };
  const overdue = cards.filter(id => S.ws.srs[id].due < now - DAY).length; const mature = cards.filter(id => S.ws.srs[id].stage >= 4).length;
  const ev = []; cards.forEach(id => { (S.progress.answers[id] || []).forEach(a => ev.push({ t: a.t, ok: a.correct })); S.ws.srs[id].hist.filter(h => !['mcq', 'exam'].includes(h.mode)).forEach(h => ev.push({ t: h.t, ok: h.g >= 3 })); });
  const recent = ev.sort((a, b) => b.t - a.t).slice(0, 40); const recall = recent.length ? recent.filter(e => e.ok).length / recent.length : 0;
  const onTime = 1 - overdue / cards.length;
  return { cards: cards.length, due: cards.filter(id => S.ws.srs[id].due <= now).length, overdue, mature, recall: Math.round(recall * 100), onTime: Math.round(onTime * 100), health: Math.round(100 * (0.45 * onTime + 0.4 * recall + 0.15 * mature / cards.length)) };
}
const retentionStats = code => healthOf(allQ().filter(q => !code || q.exam_code === code).map(q => q.id));
const dueIds = (code, now = Date.now()) => Object.keys(S.ws.srs).filter(id => S.bank.has(id) && (!code || Q(id).exam_code === code) && S.ws.srs[id].due <= now);
function forecast(code, days = 14) {
  const b = Array(days).fill(0); const t0 = today0();
  Object.entries(S.ws.srs).forEach(([id, c]) => { if (!S.bank.has(id) || (code && Q(id).exam_code !== code)) return; const i = Math.max(0, Math.floor((c.due - t0) / DAY)); if (i < days) b[i]++; });
  return b;
}
function weakDomainList(n = 5) {
  return weakDomains(n, 3).map(w => { const q = examQs(w.code).find(x => x.domain === w.domain); return { ...w, lab: bestLab({ tags: uniq(examQs(w.code).filter(x => x.domain === w.domain).flatMap(x => x.tags)), exam_code: w.code }), q }; });
}
function bestLab(q) {
  let best = null, bs = 0;
  for (const s of LAB_SCENARIOS) { const kw = LAB_KW[s.id] || []; const ov = (q.tags || []).filter(t => kw.includes(t)).length; const sc = ov * 2 + (s.exams.includes(q.exam_code) ? 1 : 0) + ov / kw.length; if (sc > bs) { bs = sc; best = s; } }
  return bs >= 2 ? best : null;
}
function bestAdrTemplate(q) {
  let best = null, bs = 0;
  for (const t of ADR_TEMPLATES) { const sc = (q.tags || []).filter(x => t.kw.includes(x)).length; if (sc > bs) { bs = sc; best = t; } }
  return best;
}
const pfTemplateForLab = sid => PF_TEMPLATES.find(t => t.lab === sid);
function relatedLinks(q) {
  const lab = bestLab(q), tpl = bestAdrTemplate(q);
  if (!lab && !tpl) return '';
  return `<div class="blk related"><h3>Go deeper on this gap</h3><div class="row">${lab ? `<a class="btn sm" href="#/lab/${lab.id}">Lab: ${esc(lab.title)}</a>` : ''}${tpl ? `<button class="btn sm" data-action="x-adr-tpl" data-v="${tpl.key}">ADR template: ${esc(tpl.title.split(':')[0])}</button>` : ''}</div></div>`;
}
function queueMarkdown(f = {}) {
  const qs = queues(f); const sec = (name, ids) => `## ${name} (${ids.length})\n\n` + (ids.slice(0, 60).map(id => { const q = Q(id); return `- **${q.id}** (${q.exam_code}, ${dShort(q.domain)}) — ${q.question.slice(0, 110).replace(/\s+/g, ' ')}…\n  - Why: ${whyDue(id).join(' ')}\n  - Priority ${priority(id)}`; }).join('\n') || '_Empty._');
  return [`# Review queue`, ``, `Generated ${fmtDate(Date.now())}${f.exam ? ` for ${f.exam}` : ''}. Intervals step through same day, 1, 3, 7, 14, and 30 days.`, ``, sec('Missed', qs.missed), ``, sec('Low confidence', qs.low), ``, sec('Due for review', qs.due), ``, `## Unseen (${qs.unseen.length})`, ``, `Highest-weight unseen domains are introduced first.`].join('\n');
}
function weaknessMarkdown() {
  const lines = [`# Domain weakness summary`, ``, `Generated ${fmtDate(Date.now())}. Accuracy counts every attempt; retention health blends on-time reviews, recent recall, and long-interval cards.`, ``];
  for (const e of activeExams()) {
    const rows = domainsOf(e.code).map(d => { const t = totals(q => q.exam_code === e.code && q.domain === d); const h = healthOf(examQs(e.code).filter(q => q.domain === d).map(q => q.id)); return { d, t, h }; }).filter(r => r.t.att);
    if (!rows.length) continue;
    lines.push(`## ${e.code}`, ``, `| Domain | Accuracy | Attempts | Retention health | Suggested action |`, `|---|---|---|---|---|`);
    rows.sort((a, b) => a.t.acc - b.t.acc).forEach(r => { const lab = bestLab({ tags: uniq(examQs(e.code).filter(q => q.domain === r.d).flatMap(q => q.tags)), exam_code: e.code }); lines.push(`| ${dShort(r.d)} | ${r.t.acc}% | ${r.t.att} | ${r.h.cards ? r.h.health : '—'} | ${r.t.acc < 60 ? `Targeted review${lab ? `; lab: ${lab.title}` : ''}` : r.t.acc < 80 ? 'Keep in daily review' : 'Maintain'} |`); });
    lines.push('');
  }
  return lines.join('\n');
}

/* ---------- Scores */
function focusExam() {
  const f = S.ws.career.profile.focusExam; if (f && examMetaFor(f)) return f;
  const m = agg(() => true, q => q.exam_code); const best = [...m.entries()].sort((a, b) => b[1].att - a[1].att)[0];
  return best ? best[0] : (activeExams()[0]?.code || '');
}
function examReadiness(code) {
  if (!code) return { score: 0, detail: 'No certification selected.' };
  const ex = examMetaFor(code); let sum = 0, wsum = 0, seenAll = 0;
  for (const d of domainsOf(code)) {
    const qs = examQs(code).filter(q => q.domain === d); const w = (ex.domain_weights || {})[qs[0].domain_number] || 1;
    const seen = qs.filter(q => isSeen(q.id)); seenAll += seen.length;
    const acc = seen.length ? seen.filter(q => !isMissed(q.id)).length / seen.length : 0;
    sum += w * acc * Math.min(1, seen.length / Math.max(6, Math.round(qs.length * 0.6))); wsum += w;
  }
  return { score: Math.round(100 * sum / (wsum || 1)), detail: `${code}: current accuracy per domain, weighted by the blueprint, discounted until 60% of each domain is covered (${seenAll} attempted).` };
}
function labDraft(sid) { return S.ws.labDrafts[sid] ||= { sections: {}, rubric: {}, phase: 'write', started: 0 }; }
function labScore(sid, rubric) { const sc = LAB_SCENARIOS.find(s => s.id === sid); return Math.round(sc.rubric.reduce((s, [, w], i) => s + w * (rubric[i] ?? 0), 0)); }
function labBest() { const best = {}; S.ws.labs.forEach(l => best[l.sid] = Math.max(best[l.sid] || 0, l.score)); return best; }
function judgment() {
  const best = Object.values(labBest()); const adr = S.ws.adrs.map(a => adrQuality(a).total);
  const labPart = avg(best) * Math.min(1, best.length / 4); const adrPart = avg(adr) * Math.min(1, adr.length / 3);
  return { score: Math.round(0.65 * labPart + 0.35 * adrPart), detail: `${best.length} lab scenario(s) (best avg ${Math.round(avg(best))}%), ${adr.length} ADR(s) (avg quality ${Math.round(avg(adr))}). Full credit needs 4+ scenarios and 3+ ADRs.` };
}
function portfolioScore() {
  const weight = { draft: 0.6, portfolio: 0.9, interview: 1 };
  const d = S.ws.portfolio.map(p => pfDepth(p).score * weight[p.status]).sort((a, b) => b - a);
  return { score: Math.round(avg(d.slice(0, 3)) * Math.min(1, d.length / 3)), detail: `${d.length} project(s); your best three, weighted by status, discounted until you have three.` };
}
const storyStrong = s => ['situation', 'task', 'action', 'result'].every(k => words(s[k]) >= 12) && hasNum(s.result);
const dimAvg = sc => { const v = RUBRIC_DIMS.map(([k]) => sc?.[k]).filter(Boolean); return v.length ? (avg(v) - 1) / 3 * 100 : 0; };
function interviewScore() {
  const good = S.ws.interview.stories.filter(s => storyStrong(s) && s.status !== 'drafted');
  const covered = new Set(good.flatMap(s => s.competencies)); const storyPart = Math.min(1, covered.size / 8) * 100;
  const last = {}; S.ws.interview.answers.forEach(a => { if (!last[a.qid] || a.t > last[a.qid].t) last[a.qid] = a; });
  const m = Object.values(last).map(a => dimAvg(a.scores)); const cats = new Set(Object.keys(last).map(id => iqById(id)?.cat).filter(Boolean));
  const mockPart = avg(m) * Math.min(1, m.length / 12) * Math.min(1, (cats.size + 1) / 5);
  const ex = S.ws.interview.exec.map(a => dimAvg(a.scores)); const execPart = avg(ex) * Math.min(1, ex.length / 3);
  const boards = S.ws.interview.boards.map(b => { const p = WHITEBOARD_PROMPTS.find(x => x.id === b.pid); return p ? Object.values(b.checks).filter(Boolean).length / p.checklist.length * 100 : 0; });
  const wbPart = avg(boards) * Math.min(1, boards.length / 3);
  return { score: Math.round(0.3 * storyPart + 0.35 * mockPart + 0.15 * execPart + 0.2 * wbPart), detail: `${covered.size}/8 competencies backed by polished STAR stories, ${m.length} mock questions across ${cats.size} categories, ${ex.length} executive summaries, ${boards.length} whiteboard session(s). Rubric scores are self-assessed.`, parts: { storyPart, mockPart, execPart, wbPart } };
}
function allScores() {
  const fx = focusExam(); const er = examReadiness(fx); const rs = retentionStats(); const j = judgment(), p = portfolioScore(), iv = interviewScore();
  return [
    { key: 'exam', label: 'Exam readiness', value: er.score, detail: er.detail, href: '#/exam', cta: 'Practice exam' },
    { key: 'retention', label: 'Retention health', value: rs.health, detail: rs.cards ? `${rs.cards} cards, ${rs.onTime}% on time, ${rs.recall}% recent recall, ${rs.mature} at 14+ day intervals.` : 'Answer questions to start the review schedule.', href: '#/retention', cta: 'Daily review' },
    { key: 'judgment', label: 'Architecture judgment', value: j.score, detail: j.detail, href: '#/lab', cta: 'Open a lab' },
    { key: 'portfolio', label: 'Portfolio depth', value: p.score, detail: p.detail, href: '#/portfolio', cta: 'Build proof' },
    { key: 'interview', label: 'Interview readiness', value: iv.score, detail: iv.detail, href: '#/interview', cta: 'Practice' }
  ];
}
const band = v => v >= 80 ? 'good' : v >= 55 ? 'warn' : 'bad';

/* ---------- Data integrity: snapshots, status, validation, import/export */
let autoSnapT = null;
function markDirty() { S.dirty++; renderSavePill(); if (!autoSnapT) autoSnapT = setTimeout(() => { autoSnapT = null; snapshot('Auto-backup'); }, 45000); }
function snapshot(label) {
  const data = JSON.stringify({ ws: S.ws, progress: { answers: S.progress.answers, flags: [...S.progress.flags], confidence: S.progress.confidence, sessions: S.progress.sessions } });
  const last = S.meta2.snaps[S.meta2.snaps.length - 1]; if (last && last.data === data) return last.id;
  const id = ++S.meta2.snapSeq; S.meta2.snaps.push({ id, t: Date.now(), label, data, kb: Math.round(data.length / 1024) });
  if (S.meta2.snaps.length > 15) S.meta2.snaps.shift(); return id;
}
function restoreSnap(id) {
  const s = S.meta2.snaps.find(x => x.id === +id); if (!s) { showStatus('That snapshot is no longer in memory.'); return; }
  snapshot('Before restoring a snapshot'); const d = JSON.parse(s.data);
  S.ws = d.ws; ensureWs(); Object.assign(S.progress, { answers: d.progress.answers, flags: new Set(d.progress.flags), confidence: d.progress.confidence, sessions: d.progress.sessions });
  S.dirty++; render(); showStatus(`Restored "${s.label}" from ${ago(s.t)}.`);
}
let statusT;
function showStatus(msg, undoSnap) {
  S.p3.status = { msg, undo: undoSnap || null }; const el = $('#statusSlot'); if (el) el.innerHTML = statusHtml();
  announce(msg); clearTimeout(statusT); statusT = setTimeout(() => { S.p3.status = null; const e2 = $('#statusSlot'); if (e2) e2.innerHTML = ''; }, undoSnap ? 15000 : 7000);
}
const statusHtml = () => S.p3.status ? `<div class="status-line"><span>${esc(S.p3.status.msg)}</span>${S.p3.status.undo ? `<button class="btn sm" data-action="x-snap-restore" data-v="${S.p3.status.undo}">Undo</button>` : ''}<button class="btn sm ghost" data-action="x-status-close" aria-label="Dismiss">Dismiss</button></div>` : '';
function deleteWithUndo(label, fn) { const sid = snapshot(`Before deleting ${label}`); fn(); markDirty(); showStatus(`Deleted ${label}.`, sid); }

const req = (r, k, type) => r[k] === undefined ? `missing required field "${k}"` : (type === 'array' ? !Array.isArray(r[k]) : typeof r[k] !== type) ? `"${k}" should be ${type === 'array' ? 'a list' : type === 'string' ? 'text' : 'a ' + type}` : null;
const VAL = {
  adr: r => [!/^ADR-\d{3,}$/.test(r.id || '') && 'id must look like ADR-001', req(r, 'title', 'string'), r.status && !ADR_STATUS.includes(r.status) && `unknown status "${r.status}"`, r.options !== undefined && !Array.isArray(r.options) && '"options" should be a list'],
  portfolio: r => [!/^PF-\d{3,}$/.test(r.id || '') && 'id must look like PF-001', req(r, 'title', 'string'), r.services !== undefined && !Array.isArray(r.services) && '"services" should be a list'],
  stories: r => [!/^STAR-\d{3,}$/.test(r.id || '') && 'id must look like STAR-001', req(r, 'title', 'string'), r.competencies !== undefined && !Array.isArray(r.competencies) && '"competencies" should be a list'],
  labs: r => [!/^LAB-\d{3,}$/.test(r.id || '') && 'id must look like LAB-001', !LAB_SCENARIOS.some(s => s.id === r.sid) && `unknown scenario "${r.sid}"`, (typeof r.score !== 'number' || r.score < 0 || r.score > 100) && '"score" must be 0–100'],
  generic: r => [(typeof r.id !== 'string' || !r.id) && 'missing required field "id"']
};
function mergeValidated(kind, cur, inc, norm, rep) {
  if (inc === undefined) return cur;
  if (!Array.isArray(inc)) { rep.errors.push(`${kind}: expected a list`); return cur; }
  const map = new Map(cur.map(x => [x.id, x])); const seen = new Set();
  inc.forEach((r, i) => {
    if (!r || typeof r !== 'object' || Array.isArray(r)) { rep.errors.push(`${kind} #${i + 1}: not a record`); rep.rejected++; return; }
    const errs = (VAL[kind] || VAL.generic)(r).filter(Boolean); if (seen.has(r.id)) errs.push('duplicate id in this file');
    if (errs.length) { rep.errors.push(`${kind} ${r.id || '#' + (i + 1)}: ${errs.join('; ')}`); rep.rejected++; return; }
    seen.add(r.id); const n = norm ? norm(r) : r; const ex = map.get(r.id);
    if (!ex) { map.set(r.id, n); rep.added++; }
    else if (JSON.stringify(ex) === JSON.stringify(n)) rep.unchanged++;
    else if ((n.updated || n.t || 0) >= (ex.updated || ex.t || 0)) { map.set(r.id, n); rep.updated++; }
    else rep.kept++;
  });
  return [...map.values()];
}
function smartImport(data) {
  if (!data || typeof data !== 'object' || Array.isArray(data)) throw new Error('The file is not a JSON object.');
  if (data.format === 'blueprint-progress') { snapshot('Before progress import'); const r = importProgress(data); S.meta2.lastImport = Date.now(); return r; }
  if (!['cloudwalker-workspace', 'cloudwalker-artifacts'].includes(data.format)) throw new Error(`Unrecognised file format "${data.format || 'none'}". Expected a CloudWalker workspace, artifacts, or progress file.`);
  snapshot(`Before ${data.format === 'cloudwalker-workspace' ? 'workspace' : 'artifacts'} import`);
  const rep = { added: 0, updated: 0, unchanged: 0, kept: 0, rejected: 0, errors: [] };
  const w = data.workspace || data; let progMsg = '';
  if (data.progress) { const r = importProgress({ format: 'blueprint-progress', ...data.progress }); progMsg = r.body; rep.errors.push(...(r.list || [])); }
  S.ws.adrs = mergeValidated('adr', S.ws.adrs, w.adrs, normalizeAdr, rep);
  S.ws.portfolio = mergeValidated('portfolio', S.ws.portfolio, w.portfolio, normalizePf, rep);
  S.ws.labs = mergeValidated('labs', S.ws.labs, w.labs, null, rep);
  ensureWs4(); S.ws.outputs = mergeValidated('generic', S.ws.outputs, w.outputs, null, rep); S.ws.reflections = mergeValidated('generic', S.ws.reflections, w.reflections, null, rep);
  if (Array.isArray(w.exportLog)) { const seen = new Set(S.ws.exportLog.map(x => x.t + x.file)); w.exportLog.forEach(x => x && !seen.has(x.t + x.file) && S.ws.exportLog.push(x)); }
  if (w.panels && typeof w.panels === 'object') Object.assign(S.ws.panels, w.panels);
  if (data.drafts && typeof data.drafts === 'object') { Object.assign(S.drafts.iq, data.drafts.iq || {}); Object.assign(S.drafts.wb, data.drafts.wb || {}); }
  if (w.labDrafts && typeof w.labDrafts === 'object') for (const [k, v] of Object.entries(w.labDrafts)) if (LAB_SCENARIOS.some(s => s.id === k) && v && typeof v.sections === 'object') S.ws.labDrafts[k] = v; else rep.errors.push(`lab note for "${k}" ignored (unknown scenario or malformed)`);
  const iv = w.interview || {}; const stories = iv.stories ?? w.stories;
  S.ws.interview.stories = mergeValidated('stories', S.ws.interview.stories, stories, normalizeStory, rep);
  S.ws.interview.answers = mergeValidated('generic', S.ws.interview.answers, iv.answers, normalizeAnswer, rep);
  S.ws.interview.boards = mergeValidated('generic', S.ws.interview.boards, iv.boards, null, rep);
  S.ws.interview.exec = mergeValidated('generic', S.ws.interview.exec, iv.exec, null, rep);
  const c = w.career;
  if (c) { if (c.profile && typeof c.profile === 'object') Object.assign(S.ws.career.profile, c.profile); for (const k of ['roles', 'milestones', 'apps']) S.ws.career[k] = mergeValidated('generic', S.ws.career[k], c[k], null, rep); if (c.weeks && typeof c.weeks === 'object') Object.assign(S.ws.career.weeks, c.weeks); }
  if (w.srs && typeof w.srs === 'object') for (const [id, card] of Object.entries(w.srs)) { if (!card || typeof card.due !== 'number') { rep.errors.push(`retention card ${id}: malformed`); continue; } const n = normCard(card); if (!S.ws.srs[id] || (n.last || 0) > (S.ws.srs[id].last || 0)) S.ws.srs[id] = n; }
  if (w.trail && typeof w.trail === 'object') S.ws.trail = { ...w.trail, ...S.ws.trail };
  if (w.glossary && typeof w.glossary === 'object') {
    ensureWs4(); const gm = new Map(S.ws.glossary.terms.map(t => [t.id, t]));
    (Array.isArray(w.glossary.terms) ? w.glossary.terms : []).forEach(t => { const e = glValidateTerm(t); if (e.length) { rep.rejected++; rep.errors.push(`glossary ${t?.id || '?'}: ${e.join('; ')}`); } else gm.set(t.id, glNorm(t)); });
    const cm = new Map(S.ws.glossary.cross_cloud.map(r => [r.function, r])); (Array.isArray(w.glossary.cross_cloud) ? w.glossary.cross_cloud : []).forEach(r => { if (r && typeof r.function === 'string' && r.function.trim()) cm.set(r.function, r); });
    S.ws.glossary.terms = [...gm.values()]; S.ws.glossary.cross_cloud = [...cm.values()]; S.ws.glossary._v = (S.ws.glossary._v || 0) + 1;
  }
  srsRebuildMissing(); S.meta2.lastImport = Date.now(); if (data.format === 'cloudwalker-workspace') { S.dirty = 0; S.meta2.savedAt = Date.now(); } renderSavePill();
  return { ok: rep.rejected === 0, title: rep.rejected ? `Imported with ${rep.rejected} rejected record(s).` : 'Import complete.', body: `${rep.added} added, ${rep.updated} updated (newer copy), ${rep.unchanged} unchanged, ${rep.kept} kept (your copy was newer), ${rep.rejected} rejected. ${progMsg}`, list: rep.errors };
}
const workspaceImport = d => smartImport(d);
function workspaceExport() {
  download(`cloudwalker-workspace-${stamp()}.json`, workspaceV4(true));
  S.dirty = 0; S.lastSaved = S.meta2.lastExport = Date.now(); renderSavePill(); showStatus('Workspace saved to your downloads.');
}
function artifactsExport() {
  download(`cloudwalker-artifacts-${stamp()}.json`, { format: 'cloudwalker-artifacts', version: WS_SCHEMA, exported_at: new Date().toISOString(), adrs: S.ws.adrs, portfolio: S.ws.portfolio, stories: S.ws.interview.stories, labs: S.ws.labs, labDrafts: S.ws.labDrafts, outputs: S.ws.outputs, reflections: S.ws.reflections });
  showStatus('Artifacts exported.');
}
function labNotesMarkdown() {
  const out = ['# Architecture lab notes', ''];
  for (const s of LAB_SCENARIOS) {
    const d = S.ws.labDrafts[s.id]; const at = S.ws.labs.filter(l => l.sid === s.id).sort((a, b) => b.t - a.t);
    const src = at[0]?.sections || d?.sections; if (!src || !Object.values(src).some(v => (v || '').trim())) continue;
    out.push(`## ${s.title}`, at.length ? `Best score ${Math.max(...at.map(a => a.score))}% over ${at.length} attempt(s).` : 'Draft, not yet scored.', '');
    LAB_SECTIONS.forEach(([k, label]) => src[k] && out.push(`### ${label}`, src[k], ''));
  }
  return out.join('\n');
}
function dataStatusPanel() {
  const arts = S.ws.adrs.length + S.ws.portfolio.length + S.ws.interview.stories.length + S.ws.labs.length;
  return `<section class="card" style="margin-bottom:20px" aria-labelledby="h-ds"><div class="card-head"><h2 id="h-ds">Data status</h2>${persistOK() ? '<span class="chip ok-chip">Saved on this device</span>' : S.dirty ? `<span class="chip warn-chip">${S.dirty} unsaved change${S.dirty === 1 ? '' : 's'}</span>` : '<span class="chip ok-chip">Everything saved</span>'}</div>
    <dl class="dstat"><div><dt>Questions loaded</dt><dd>${S.bank.size.toLocaleString()}</dd></div><div><dt>Artifacts in workspace</dt><dd>${arts}</dd></div><div><dt>Touched this session</dt><dd>${S.meta2.touched.size}</dd></div><div><dt>Last import</dt><dd>${S.meta2.lastImport ? ago(S.meta2.lastImport) : 'None this session'}</dd></div><div><dt>Last workspace file</dt><dd>${S.meta2.lastExport ? ago(S.meta2.lastExport) : 'None yet'}</dd></div><div><dt>Changes since that file</dt><dd>${S.dirty}</dd></div><div><dt>Undo points this session</dt><dd>${S.meta2.snaps.length}</dd></div></dl>
    <p class="small muted" style="margin:12px 0">${persistOK() ? 'Autosave keeps this device up to date. Save a workspace file now and then as an off-device backup; restoring it merges by permanent ID and never renumbers anything.' : 'Storage is blocked, so save the workspace file to keep your work between sessions; restoring it merges by permanent ID and never renumbers anything.'}</p>
    <div class="row"><button class="btn primary" data-action="ws-export">Save workspace</button><button class="btn" data-action="ws-import">Restore or import a file</button><button class="btn" data-action="x-snap-now">Take a backup now</button></div>
    ${S.meta2.snaps.length ? `<details style="margin-top:12px"><summary>In-memory backups (${S.meta2.snaps.length})</summary><p class="small muted">Taken automatically every 45 seconds of edits and before every import, delete, reset, or restore. They disappear when you close the tab; the daily backups under Saved on this device do not.</p><div class="list">${[...S.meta2.snaps].reverse().map(s => `<div class="list-item"><div><strong>${esc(s.label)}</strong><div class="small muted">${ago(s.t)}, ${s.kb} KB</div></div><button class="btn sm" data-action="x-snap-restore" data-v="${s.id}">Restore</button></div>`).join('')}</div></details>` : ''}
  </section>
  <section class="card" style="margin-bottom:20px" aria-labelledby="h-out"><h2 id="h-out">Exports you can use outside the app</h2>
    <div class="out-grid">
      ${[['x-exp-artifacts', 'Artifacts (.json)', 'ADRs, portfolio, stories, lab notes'], ['x-exp-bundle', 'Artifact bundle (.md)', 'Everything as readable Markdown'], ['x-exp-adrs', 'ADRs (.md)', `${S.ws.adrs.length} records`], ['x-exp-cases', 'Case studies (.md)', `${S.ws.portfolio.length} projects`], ['x-exp-resume', 'Résumé bullets (.md)', 'From portfolio projects'], ['x-exp-site', 'Portfolio site (.html)', 'Portfolio-ready projects'], ['x-exp-stories', 'Interview stories (.md)', `${S.ws.interview.stories.length} stories`], ['x-exp-labs', 'Lab notes (.md)', 'Drafts and scored attempts'], ['x-exp-queue', 'Review queue (.md)', 'With why each item is due'], ['x-exp-weak', 'Domain weakness (.md)', 'Accuracy and health by domain'], ['x-exp-report', 'Study progress (.md)', 'Scores and certification detail'], ['export-progress', 'Quiz progress (.json)', 'Answers, flags, confidence']].map(([a, l, s]) => `<button class="out-btn" data-action="${a}"><strong>${l}</strong><span class="small muted">${s}</span></button>`).join('')}
    </div></section>`;
}
const workspacePanel = dataStatusPanel;
function resetBlock(kind) {
  const what = kind === 'all' ? 'quiz history, retention schedule, ADRs, portfolio projects, stories, lab work, and career plans' : 'quiz answers, flags, confidence ratings, sessions, and the retention schedule (artifacts stay)';
  if (S.p3.resetArmed !== kind) return `<button class="btn danger" data-action="x-reset-arm" data-v="${kind}">${kind === 'all' ? 'Reset everything' : 'Reset quiz progress'}</button>`;
  return `<div class="danger-zone" role="group" aria-label="Confirm reset"><p><strong>This clears ${what}.</strong> An undo point is taken first, so you can undo from Data status until you close the tab. Daily backups on this device are kept.</p>
    <label for="resetType" class="small">Type RESET to confirm</label><input id="resetType" type="text" autocomplete="off" autocapitalize="characters" data-reset-input="${kind}">
    <div class="row" style="margin-top:10px"><button class="btn danger" data-action="x-reset-do" data-v="${kind}" disabled>Clear ${kind === 'all' ? 'everything' : 'quiz progress'}</button><button class="btn" data-action="x-reset-cancel">Cancel</button></div></div>`;
}
function doReset(kind) {
  const sid = snapshot(`Before ${kind === 'all' ? 'full' : 'quiz'} reset`);
  S.progress = { answers: {}, flags: new Set(), confidence: {}, sessions: [] }; S.ws.srs = {}; S.ws.recallLog = [];
  S.session = { started: Date.now(), answered: 0, correct: 0, streak: 0, best: 0 }; S.runner = null; S.lastResult = null; S.rs = null;
  if (kind === 'all') { const prof = S.ws.career.profile; S.ws = { adrs: [], portfolio: [], labs: [], labDrafts: {}, interview: {}, career: { profile: prof }, srs: {}, recallLog: [], trail: {} }; ensureWs(); }
  S.p3.resetArmed = ''; S.dirty++; renderSessionMini(); render(); showStatus(kind === 'all' ? 'Everything was cleared.' : 'Quiz progress was cleared.', sid);
}

/* ---------- Records: ADR */
const ADR_STATUS = ['Proposed', 'Accepted', 'Superseded', 'Deprecated', 'Rejected'];
const blankOpt = () => ({ name: '', summary: '', pros: '', cons: '', rejectedWhy: '' });
function normalizeAdr(a) {
  const x = { id: a.id, title: a.title || '', status: ADR_STATUS.includes(a.status) ? a.status : 'Proposed', date: a.date || isoDate(Date.now()), deciders: a.deciders || '', context: a.context || '', decision: a.decision || '', rationale: a.rationale || '',
    businessDrivers: a.businessDrivers || a.drivers || [], constraints: a.constraints || [], options: (a.options || []).map(o => ({ ...blankOpt(), ...o })), chosen: Number.isInteger(a.chosen) ? a.chosen : -1,
    tradeoffs: a.tradeoffs || '', risks: a.risks || [], consequencesPos: a.consequencesPos || '', consequencesNeg: a.consequencesNeg || '', followUps: a.followUps || [], reviewTrigger: a.reviewTrigger || '',
    related: a.related || '', providers: a.providers || [], lenses: a.lenses || [], services: a.services || [], links: a.links || '', source: a.source || '', template: a.template || '', updated: a.updated || Date.now() };
  while (x.options.length < 2) x.options.push(blankOpt()); return x;
}
function newAdr(seed = {}) { const a = normalizeAdr({ id: nextId('ADR', S.ws.adrs), deciders: S.ws.career.profile.name || '', ...seed }); S.ws.adrs.push(a); touch(a.id); markDirty(); return a; }
function adrFromTemplate(key, seed = {}) {
  const t = ADR_TEMPLATES.find(x => x.key === key);
  return newAdr({ title: t.title.replace(/^Choose (an? )?/, '').replace(/^./, c => c.toUpperCase()), template: key, providers: t.providers.slice(), lenses: t.lenses.slice(), businessDrivers: t.drivers.slice(), constraints: t.constraints.slice(), options: t.options.map(o => ({ ...blankOpt(), ...o })), followUps: t.followUps.slice(), ...seed });
}
const named = a => a.options.filter(o => o.name.trim());
const chosenOpt = a => a.options[a.chosen] && a.options[a.chosen].name ? a.options[a.chosen] : null;
function adrQuality(a) {
  const n = named(a), rej = n.filter((o, i) => a.options.indexOf(o) !== a.chosen);
  const dims = [
    ['Clarity', [[words(a.title) >= 5, 6, 'Make the title a specific decision (5+ words).'], [words(a.context) >= 40, 7, 'Write 40+ words of context: scale, constraints, deadline.'], [words(a.decision) >= 12, 6, 'State the decision in a full sentence ("We will…").'], [!!chosenOpt(a), 6, 'Mark which option was chosen.']]],
    ['Alternatives', [[n.length >= 2, 8, 'Name at least two options.'], [n.length >= 3, 4, 'A third option shows you looked widely.'], [n.length && n.every(o => words(o.summary) >= 5), 6, 'Summarize each option in a sentence.'], [rej.length && rej.every(o => words(o.rejectedWhy) >= 5), 7, 'Say why each rejected option lost.']]],
    ['Trade-off reasoning', [[words(a.tradeoffs) >= 20, 10, 'Describe the trade-offs you are accepting (20+ words).'], [n.length && n.every(o => o.pros.trim() && o.cons.trim()), 8, 'Give every option both pros and cons.'], [words(a.rationale) >= 15, 7, 'Explain why the chosen option wins against the drivers.']]],
    ['Risk awareness', [[a.risks.filter(Boolean).length >= 2, 8, 'List at least two risks.'], [words(a.consequencesNeg) >= 8, 7, 'Write the negative consequences honestly.'], [a.followUps.filter(Boolean).length >= 1, 5, 'Add at least one follow-up action.'], [!!a.reviewTrigger.trim(), 5, 'Say what would make you revisit this.']]]
  ].map(([name, items]) => ({ name, score: items.reduce((s, [ok, w]) => s + (ok ? w : 0), 0), tips: items.filter(i => !i[0]).map(i => i[2]) }));
  return { dims, total: dims.reduce((s, d) => s + d.score, 0) };
}
const lensLabel = k => LENSES.find(l => l[0] === k)?.[1] || k;
function adrMarkdown(a) {
  const ch = chosenOpt(a); const rej = named(a).filter(o => o !== ch);
  const list = arr => arr.filter(Boolean).map(x => `- ${x}`).join('\n') || '- n/a';
  return `# ${a.id}: ${a.title || 'Untitled decision'}

- **Status:** ${a.status}
- **Date:** ${a.date}
- **Deciders:** ${a.deciders || 'n/a'}
- **Cloud providers:** ${a.providers.join(', ') || 'n/a'}
- **Well-architected lenses:** ${a.lenses.map(lensLabel).join(', ') || 'n/a'}
- **Related project or domain:** ${a.related || 'n/a'}${a.services.length ? `\n- **Services:** ${a.services.join(', ')}` : ''}${a.source ? `\n- **Source:** ${a.source}` : ''}

## Context
${a.context || 'n/a'}

## Business drivers
${list(a.businessDrivers)}

## Technical constraints
${list(a.constraints)}

## Options considered
${named(a).map((o, i) => `### ${i + 1}. ${o.name}${o === ch ? ' (chosen)' : ''}\n${o.summary}\n\n- **Pros:** ${o.pros || 'n/a'}\n- **Cons:** ${o.cons || 'n/a'}`).join('\n\n') || 'n/a'}

## Decision
**Chosen option:** ${ch ? ch.name : 'not yet chosen'}

${a.decision || 'n/a'}

${a.rationale ? `**Rationale:** ${a.rationale}\n` : ''}
## Rejected alternatives
${rej.map(o => `- **${o.name}:** ${o.rejectedWhy || 'reason not recorded'}`).join('\n') || '- n/a'}

## Trade-offs
${a.tradeoffs || 'n/a'}

## Risks
${list(a.risks)}

## Consequences
- **Positive:** ${a.consequencesPos || 'n/a'}
- **Negative:** ${a.consequencesNeg || 'n/a'}

## Follow-up actions
${list(a.followUps)}

## Review trigger
${a.reviewTrigger || 'n/a'}
${a.links ? `\n## Links\n${a.links}\n` : ''}`;
}
const plainText = md => md.replace(/^#{1,6} /gm, '').replace(/\*\*(.+?)\*\*/g, '$1').replace(/`([^`]+)`/g, '$1');
function adrSnippet(a) {
  const ch = chosenOpt(a); const rej = named(a).filter(o => o !== ch).map(o => o.name);
  if (!ch) return 'Choose an option in the ADR first; the snippet summarizes the decision you made.';
  return `${a.title}. I chose ${ch.name}${rej.length ? ` over ${rej.join(' and ')}` : ''} because ${firstSentence(a.rationale || a.decision).replace(/^[A-Z]/, c => c.toLowerCase())}${a.tradeoffs ? ` The trade-off I accepted: ${firstSentence(a.tradeoffs)}` : ''}${a.risks[0] ? ` Main risk and mitigation: ${a.risks[0]}` : ''}`;
}
function adrTalkingPoints(a) {
  const ch = chosenOpt(a);
  return [`Talking points: ${a.title}`, '', `- The situation: ${firstSentence(a.context) || 'describe the context first'}`, `- What mattered most: ${a.businessDrivers.slice(0, 3).join('; ') || 'list the drivers'}`, `- Options I weighed: ${named(a).map(o => o.name).join(', ') || 'n/a'}`, `- What I chose and why: ${ch ? ch.name : 'not chosen yet'} — ${firstSentence(a.rationale || a.decision)}`, `- The trade-off I accepted: ${firstSentence(a.tradeoffs) || 'n/a'}`, `- Risks and how I'd handle them: ${a.risks.slice(0, 2).join('; ') || 'n/a'}`, `- What would change my mind: ${a.reviewTrigger || 'n/a'}`, '', 'Likely follow-ups: "What would you do with half the budget?" "How would you test that this works?" "What did the rejected option do better?"'].join('\n');
}

/* ---------- Records: portfolio */
function normalizePf(p) {
  const st = { ready: 'portfolio', published: 'interview' }[p.status] || p.status;
  return { id: p.id, title: p.title || '', summary: p.summary || '', type: p.type || 'Lab case study', role: p.role || '', provider: p.provider || p.cloud || '', status: ['draft', 'portfolio', 'interview'].includes(st) ? st : 'draft',
    problem: p.problem || '', constraints: p.constraints || '', architecture: p.architecture || '', diagram: p.diagram || '', diagramNote: p.diagramNote || '', services: p.services || [],
    security: p.security || '', resilience: p.resilience || '', cost: p.cost || '', migration: p.migration || '', tradeoffs: p.tradeoffs || '', outcome: p.outcome || '', lessons: p.lessons || '', artifacts: p.artifacts || '',
    adrIds: p.adrIds || [], labIds: p.labIds || [], template: p.template || '', source: p.source || '', updated: p.updated || Date.now() };
}
function newPf(seed = {}) { const p = normalizePf({ id: nextId('PF', S.ws.portfolio), ...seed }); S.ws.portfolio.push(p); touch(p.id); markDirty(); return p; }
function pfFromTemplate(key, seed = {}) { const t = PF_TEMPLATES.find(x => x.key === key); return newPf({ title: t.title, provider: t.provider, services: t.services.slice(), template: key, type: 'Lab case study', labIds: t.lab ? [t.lab] : [], ...seed }); }
function pfDepth(p) {
  const items = [[words(p.problem) >= 30, 12, 'Business problem (30+ words)'], [words(p.summary) >= 6, 4, 'One-line summary'], [words(p.architecture) >= 40, 10, 'Architecture overview (40+ words)'], [!!(p.diagram || p.diagramNote.trim()), 6, 'Diagram or diagram link'],
    [p.services.length >= 3, 6, 'Three or more services'], [words(p.security) >= 15, 10, 'Security considerations'], [words(p.resilience) >= 15, 10, 'Resilience considerations'], [words(p.cost) >= 10, 8, 'Cost considerations'],
    [words(p.migration) >= 10, 6, 'Migration and operations'], [words(p.tradeoffs) >= 15, 10, 'Key trade-offs'], [hasNum(p.outcome), 8, 'Outcome with a number'], [words(p.lessons) >= 15, 5, 'Lessons learned'], [p.adrIds.length > 0, 5, 'A linked ADR']];
  return { score: items.reduce((s, [ok, w]) => s + (ok ? w : 0), 0), missing: items.filter(i => !i[0]).map(i => i[2]) };
}
const adrsOf = ids => ids.map(id => S.ws.adrs.find(a => a.id === id)).filter(Boolean);
const isLab = p => /lab|capstone/i.test(p.type);
function pfCaseStudy(p) {
  const adrs = adrsOf(p.adrIds);
  const sec = (h, t) => t && t.trim() ? `## ${h}\n${t}\n\n` : '';
  return `# ${p.title || 'Untitled project'}\n\n${p.summary ? `*${p.summary}*\n\n` : ''}${[p.provider && `**Platform:** ${p.provider}`, p.type && `**Type:** ${p.type}`, p.role && `**My role:** ${p.role}`].filter(Boolean).join(' · ')}\n\n` +
    sec('Business problem', p.problem) + sec('Constraints', p.constraints) + sec('Architecture overview', p.architecture + (p.services.length ? `\n\n**Services:** ${p.services.join(', ')}` : '') + (p.diagramNote ? `\n\n**Diagram:** ${p.diagramNote}` : '')) +
    sec('Security', p.security) + sec('Resilience', p.resilience) + sec('Cost', p.cost) + sec('Migration and operations', p.migration) + sec('Key trade-offs', p.tradeoffs) +
    (adrs.length ? `## Decisions\n${adrs.map(a => `- **${a.id}: ${a.title}** — ${chosenOpt(a) ? `chose ${chosenOpt(a).name}. ` : ''}${firstSentence(a.rationale || a.decision)}`).join('\n')}\n\n` : '') +
    sec('Outcome', p.outcome) + sec('What I learned', p.lessons) + sec('Artifacts', p.artifacts);
}
function pfResume(p) {
  const pre = isLab(p) ? 'In a self-directed lab project, ' : '';
  const svc = p.services.slice(0, 4).join(', '); const adrs = adrsOf(p.adrIds);
  const b = [];
  b.push(`${pre}${pre ? 'designed' : 'Designed'} a ${p.provider || 'cloud'} architecture for ${p.summary ? p.summary.replace(/\.$/, '') : (p.title || 'this project').toLowerCase()}${svc ? ` using ${svc}` : ''}.`);
  if (adrs.length) b.push(`Documented ${adrs.length} architecture decision record${adrs.length > 1 ? 's' : ''}, including "${adrs[0].title}"${chosenOpt(adrs[0]) ? ` (selected ${chosenOpt(adrs[0]).name})` : ''}, with explicit trade-offs and risks.`);
  if (p.security.trim()) b.push(`Built security into the design: ${firstSentence(p.security).replace(/^[A-Z]/, c => c.toLowerCase())}`);
  if (p.resilience.trim()) b.push(`Designed for failure: ${firstSentence(p.resilience).replace(/^[A-Z]/, c => c.toLowerCase())}`);
  if (p.cost.trim()) b.push(`Managed cost: ${firstSentence(p.cost).replace(/^[A-Z]/, c => c.toLowerCase())}`);
  if (hasNum(p.outcome)) b.push(`Result: ${firstSentence(p.outcome)}`);
  return b.map(x => `- ${x}`).join('\n') + `\n\nEdit before using: lead with a strong verb, keep each bullet to one line, and only claim numbers you measured.${isLab(p) ? ' Keep the lab framing so the work is represented accurately.' : ''}`;
}
function pfLinkedIn(p) {
  const adrs = adrsOf(p.adrIds);
  return `${p.title}\n\n${p.summary || firstSentence(p.problem)}\n\n${isLab(p) ? 'As a hands-on lab project, I' : 'I'} designed the solution on ${p.provider || 'the cloud'}${p.services.length ? ` with ${p.services.slice(0, 5).join(', ')}` : ''}. ${adrs[0] && chosenOpt(adrs[0]) ? `The key decision was choosing ${chosenOpt(adrs[0]).name}: ${firstSentence(adrs[0].rationale || adrs[0].decision)} ` : ''}${p.tradeoffs ? `The trade-off I accepted: ${firstSentence(p.tradeoffs)} ` : ''}${p.outcome ? `\n\nResult: ${firstSentence(p.outcome)}` : ''}${p.lessons ? `\n\nWhat I learned: ${firstSentence(p.lessons)}` : ''}${p.artifacts ? `\n\n${p.artifacts}` : ''}`;
}
function pfInterview(p) {
  const adrs = adrsOf(p.adrIds);
  return [`Interview discussion: ${p.title}`, '', `1. Problem (20 seconds): ${firstSentence(p.problem) || '—'}`, `2. Approach (40 seconds): ${firstSentence(p.architecture) || '—'}`, `3. Key decision and trade-off: ${adrs[0] ? `${adrs[0].title}. ${firstSentence(adrs[0].tradeoffs || adrs[0].rationale)}` : firstSentence(p.tradeoffs) || '—'}`, `4. Security and resilience: ${firstSentence(p.security) || '—'} ${firstSentence(p.resilience)}`, `5. Result: ${firstSentence(p.outcome) || '—'}`, `6. What I'd change: ${firstSentence(p.lessons) || '—'}`, '', 'Expect: "Why not the alternative?", "How would this scale 10x?", "What did it cost?", "What would you monitor?"'].join('\n');
}
function caseStudyHtml(p) {
  const blocks = [['Business problem', p.problem], ['Constraints', p.constraints], ['Architecture overview', p.architecture], ['Security', p.security], ['Resilience', p.resilience], ['Cost', p.cost], ['Migration and operations', p.migration], ['Key trade-offs', p.tradeoffs], ['Outcome', p.outcome], ['What I learned', p.lessons]];
  const adrs = adrsOf(p.adrIds);
  return `<article><p class="kicker">${esc([p.provider, p.type].filter(Boolean).join(' · '))}</p><h2>${esc(p.title)}</h2>${p.summary ? `<p class="sum">${esc(p.summary)}</p>` : ''}
${p.diagram ? `<figure><img src="${p.diagram}" alt="${esc(p.diagramNote || 'Architecture diagram')}"><figcaption>${esc(p.diagramNote)}</figcaption></figure>` : ''}
${blocks.filter(b => b[1] && b[1].trim()).map(([h, t]) => `<h3>${esc(h)}</h3><p>${esc(t)}</p>`).join('')}
${p.services.length ? `<ul class="chips">${p.services.map(s => `<li>${esc(s)}</li>`).join('')}</ul>` : ''}
${adrs.length ? `<h3>Decisions</h3><ul>${adrs.map(a => `<li><strong>${esc(a.title)}</strong>${chosenOpt(a) ? `: chose ${esc(chosenOpt(a).name)}` : ''}. ${esc(firstSentence(a.rationale || a.decision))}</li>`).join('')}</ul>` : ''}
${p.artifacts ? `<p class="links">${esc(p.artifacts).replace(/(https?:\/\/[^\s<]+)/g, '<a href="$1">$1</a>')}</p>` : ''}</article>`;
}
function siteHtml(items, title) {
  const prof = S.ws.career.profile;
  return `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${esc(title || prof.name || 'Cloud architecture portfolio')}</title>
<style>:root{--ink:#123047;--muted:#5e7488;--bg:#f4f8fc;--line:rgba(18,48,71,.1)}*{box-sizing:border-box}body{margin:0;background:var(--bg);color:var(--ink);font:17px/1.6 ui-sans-serif,system-ui,-apple-system,"Segoe UI",Roboto,sans-serif}
header{background:#fff;border-bottom:1px solid var(--line);padding:48px 24px 32px}header div,main{max-width:820px;margin:0 auto}h1{font-size:2.1rem;line-height:1.15;margin:0 0 8px}header p{color:var(--muted);margin:0}
main{padding:28px 24px 56px}article{background:#fff;border:1px solid var(--line);border-radius:14px;padding:28px;margin-bottom:24px;break-inside:avoid}h2{margin:4px 0 8px;font-size:1.45rem}.sum{color:var(--muted);margin-top:0}h3{font-size:.85rem;text-transform:uppercase;letter-spacing:.05em;color:var(--muted);margin:20px 0 4px}
figure{margin:16px 0}img{max-width:100%;border:1px solid var(--line);border-radius:8px}figcaption{font-size:.85rem;color:var(--muted)}.kicker{color:#1f6a9e;font-weight:600;font-size:.85rem;margin:0}.chips{list-style:none;padding:0;display:flex;flex-wrap:wrap;gap:6px}.chips li{background:#e3eef8;border-radius:99px;padding:3px 10px;font-size:.85rem}a{color:#1f6a9e}footer{text-align:center;color:var(--muted);font-size:.85rem;padding:0 24px 40px}@media print{body{background:#fff}article{border:0;padding:0}}</style></head>
<body><header><div><h1>${esc(prof.name || 'Cloud architecture portfolio')}</h1><p>${esc(prof.headline || 'Cloud architecture case studies')}</p>${prof.links ? `<p>${esc(prof.links).replace(/(https?:\/\/[^\s<]+)/g, '<a href="$1">$1</a>')}</p>` : ''}</div></header>
<main>${items.length ? items.map(caseStudyHtml).join('') : '<p>No projects are marked portfolio-ready yet.</p>'}</main><footer>Generated ${esc(fmtDate(Date.now()))}</footer></body></html>`;
}

