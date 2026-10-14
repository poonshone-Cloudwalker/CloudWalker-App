/* ================================================================== V09 Phase 6: credible feedback on judgment work
 * - Optional AI feedback for labs, ADRs, STAR stories, executive summaries, whiteboard notes, and
 *   mock interview answers. Works only with an endpoint, model, header name, and key the learner
 *   supplies. The key lives in IndexedDB under 'ai:config' on this device: it is never written to the
 *   workspace, exported files, or daily backups. With no key, every AI control stays hidden.
 * - The AI must return {scores:{dimension:1-4}, strengths:[], gaps:[], nextStep:""}. Anything else is
 *   rejected and nothing is stored. Readiness uses the lower of self-score and AI score unless the
 *   learner marks the AI feedback as wrong, or the work changed after it was reviewed.
 * - Calibration: self-score minus AI score (judgment work) and stated confidence minus the answer key
 *   (questions), shown as an Overconfidence index with a short coaching note.
 * - Outcome log: real exam results next to the readiness recorded before the exam. */

/* ---------- Config: device-only */
const AI_KEY = 'ai:config';
const AI_STYLES = [['openai', 'OpenAI-compatible chat completions'], ['anthropic', 'Anthropic Messages API'], ['plain', 'Plain JSON (your own proxy)']];
const AI_DEFAULT_HEADER = { openai: 'Authorization', anthropic: 'x-api-key', plain: 'Authorization' };
let AIC = null; /* { endpoint, style, model, header, key, savedAt } held in memory only */
S.p6 = { busy: {}, err: {}, loaded: false, memOnly: false, test: '' };
const aiReady = () => !!(AIC && AIC.endpoint && AIC.key && AIC.model);
const aiHost = () => { try { return new URL(AIC.endpoint).host; } catch { return 'the AI service'; } };
async function p6LoadConfig() {
  for (let i = 0; i < 60 && !PERSIST.db; i++) await new Promise(r => setTimeout(r, 100));
  if (PERSIST.db) { try { const v = await idbGet(AI_KEY); if (v && typeof v === 'object' && v.endpoint) AIC = v; } catch { /* storage unreadable: feature stays hidden */ } }
  S.p6.loaded = true;
  if (aiReady() && ['settings', 'lab', 'adr', 'interview', 'calibration'].includes(route().name)) { const a = document.activeElement; if (!a || a === document.body || !a.closest('input,textarea,select')) render(); }
}
async function p6SaveConfig(c) {
  AIC = c; S.p6.memOnly = false;
  if (!PERSIST.db) { S.p6.memOnly = true; return; }
  try { await idbPut(AI_KEY, c); } catch { S.p6.memOnly = true; }
}
async function p6RemoveConfig() { AIC = null; try { if (PERSIST.db) await idbDel(AI_KEY); } catch { /* ignore */ } }

/* ---------- Provider-agnostic call */
function aiHeaders(c) {
  const h = { 'Content-Type': 'application/json' };
  let v = c.key.trim(); if (c.header.trim().toLowerCase() === 'authorization' && !/^(bearer|basic)\s/i.test(v)) v = 'Bearer ' + v;
  h[c.header.trim()] = v;
  if (c.style === 'anthropic') { h['anthropic-version'] = '2023-06-01'; h['anthropic-dangerous-direct-browser-access'] = 'true'; }
  return h;
}
function aiBody(c, system, user) {
  if (c.style === 'anthropic') return { model: c.model, max_tokens: 1200, system, messages: [{ role: 'user', content: user }] };
  if (c.style === 'openai') return { model: c.model, temperature: 0.2, messages: [{ role: 'system', content: system }, { role: 'user', content: user }] };
  return { model: c.model, system, input: user };
}
function aiExtractText(raw) {
  let j; try { j = JSON.parse(raw); } catch { return raw; }
  if (j && Array.isArray(j.choices) && j.choices[0]) return j.choices[0].message?.content ?? j.choices[0].text ?? '';
  if (j && Array.isArray(j.content)) return j.content.filter(b => b && b.type === 'text').map(b => b.text).join('\n');
  if (j && typeof j.output_text === 'string') return j.output_text;
  if (j && j.scores) return JSON.stringify(j);
  if (j && typeof j.output === 'string') return j.output;
  if (j && typeof j.text === 'string') return j.text;
  return raw;
}
async function aiCall(system, user, c = AIC) {
  if (!c) throw new Error('AI feedback is not set up.');
  if (navigator.onLine === false) throw new Error('You are offline. AI feedback needs a connection; everything else keeps working.');
  const ctl = new AbortController(); const tm = setTimeout(() => ctl.abort(), 60000); let res;
  try { res = await fetch(c.endpoint, { method: 'POST', headers: aiHeaders(c), body: JSON.stringify(aiBody(c, system, user)), signal: ctl.signal, credentials: 'omit', referrerPolicy: 'no-referrer', cache: 'no-store' }); }
  catch (e) { throw new Error(e && e.name === 'AbortError' ? 'The AI service did not answer within 60 seconds.' : 'Could not reach the AI service. Check the address and your connection, and that the service accepts requests from a browser (CORS).'); }
  finally { clearTimeout(tm); }
  const raw = await res.text();
  if (!res.ok) throw new Error(`The AI service answered with status ${res.status}${res.status === 401 || res.status === 403 ? ' (check the key and header name)' : ''}. ${raw.replace(/\s+/g, ' ').slice(0, 160)}`);
  return aiExtractText(raw);
}
function aiParse(text, dims) {
  let s = String(text || '').replace(/```(?:json)?/gi, ''); const a = s.indexOf('{'), b = s.lastIndexOf('}');
  if (a < 0 || b <= a) throw new Error('The AI response did not contain a JSON object.');
  let j; try { j = JSON.parse(s.slice(a, b + 1)); } catch { throw new Error('The AI response was not valid JSON.'); }
  if (!j || typeof j.scores !== 'object' || Array.isArray(j.scores)) throw new Error('The AI response had no "scores" object.');
  const scores = {};
  for (const d of dims) { const v = Number(j.scores[d.id]); if (!Number.isInteger(v) || v < 1 || v > 4) throw new Error(`The AI response is missing a 1–4 score for "${d.id}".`); scores[d.id] = v; }
  const list = x => Array.isArray(x) ? x.filter(y => typeof y === 'string' && y.trim()).slice(0, 6).map(y => y.trim().slice(0, 400)) : [];
  return { scores, strengths: list(j.strengths), gaps: list(j.gaps), nextStep: typeof j.nextStep === 'string' ? j.nextStep.trim().slice(0, 500) : '' };
}

/* ---------- What each kind of work sends: answer, rubric dimensions, reference */
const hashStr = s => { let h = 5381; for (let i = 0; i < s.length; i++) h = ((h << 5) + h + s.charCodeAt(i)) | 0; return (h >>> 0).toString(36); };
const LVL = levels => levels.map((t, i) => `${i + 1} = ${t}`).join('; ');
const STAR_DIMS = [['situation', 'Situation', 'Sets context: who, where, scale, and why it mattered'], ['task', 'Task', 'Makes the speaker\'s own responsibility clear'], ['action', 'Action', 'Specific steps the speaker took, with reasoning, not "we"'], ['result', 'Result', 'Measurable outcome and what was learned'], ['relevance', 'Relevance', 'Shows competencies a cloud architect is hired for']];
const pctOf14 = scores => { const v = Object.values(scores); return v.length ? Math.round((avg(v) - 1) / 3 * 100) : 0; };
function storyStructurePct(s) { const k = ['situation', 'task', 'action', 'result'].filter(x => words(s[x]) >= 12).length + (hasNum(s.result) ? 1 : 0); return k * 20; }
function aiSubject(kind, id) {
  if (kind === 'lab') {
    const a = S.ws.labs.find(x => x.id === id); const sc = a && LAB_SCENARIOS.find(s => s.id === a.sid); if (!sc) return null;
    const dims = sc.rubric.map(([t, w], i) => ({ id: 'r' + (i + 1), label: t, desc: `Weight ${w}. 1 = missing, 2 = mentioned without substance, 3 = present and sound, 4 = excellent with clear reasoning` }));
    const answer = LAB_SECTIONS.map(([k, l]) => `## ${l}\n${a.sections[k] || '(blank)'}`).join('\n\n');
    return { kind, id, title: `${a.id}: ${sc.title}`, href: '#/lab/' + sc.id, selfLabel: 'Self-score', selfPct: a.score, dims, weights: sc.rubric.map(r => r[1]),
      task: `${sc.brief}\nRequirements:\n- ${sc.requirements.join('\n- ')}`, reference: LAB_SECTIONS.map(([k, l]) => `## ${l}\n${sc.model[k] || ''}`).join('\n\n'), answer, hash: hashStr(answer) };
  }
  if (kind === 'adr') {
    const a = S.ws.adrs.find(x => x.id === id); if (!a) return null; const q = adrQuality(a);
    const dims = q.dims.map(d => ({ id: slug(d.name), label: d.name, desc: '1 = missing, 2 = thin, 3 = solid, 4 = excellent and specific' }));
    const answer = adrMarkdown(a);
    return { kind, id, title: `${a.id}: ${a.title || 'Untitled decision'}`, href: '#/adr/' + a.id, selfLabel: 'Structure score (automatic)', selfPct: q.total, dims,
      task: 'Review this architecture decision record. Judge whether the decision is well reasoned, not only whether the sections are filled in.', reference: 'There is no single reference design. A strong ADR states a specific decision with context and constraints, compares real alternatives, explains trade-offs, and names risks, consequences, and what would trigger a review.', answer, hash: hashStr(answer) };
  }
  if (kind === 'story') {
    const s = S.ws.interview.stories.find(x => x.id === id); if (!s) return null;
    const answer = `Title: ${s.title || ''}\nCompetencies: ${(s.competencies || []).map(compLabel).join(', ')}\n\nSituation: ${s.situation || ''}\nTask: ${s.task || ''}\nAction: ${s.action || ''}\nResult: ${s.result || ''}`;
    return { kind, id, title: `${s.id}: ${s.title || 'Untitled story'}`, href: '#/interview/story/' + s.id, selfLabel: 'Structure check (automatic)', selfPct: storyStructurePct(s),
      dims: STAR_DIMS.map(([k, l, d]) => ({ id: k, label: l, desc: d + '. 1 = weak, 4 = strong' })), task: 'Review this STAR interview story for a cloud architect or engineer interview.', reference: 'No reference story. Strong stories are specific, first-person, quantified, and under two minutes when spoken.', answer, hash: hashStr(answer) };
  }
  if (kind === 'exec' || kind === 'iq') {
    const list = kind === 'exec' ? S.ws.interview.exec : S.ws.interview.answers; const r = list.find(x => x.id === id); if (!r) return null;
    const dims = RUBRIC_DIMS.map(([k, l, lv]) => ({ id: k, label: l, desc: LVL(lv) }));
    if (kind === 'exec') { const t = EXEC_TOPICS.find(x => x.id === r.tid), A = AUDIENCES[r.aud]; if (!t) return null;
      return { kind, id, title: `${r.id}: ${t.topic}`, href: `#/interview/ex/${r.tid}/${r.aud}`, selfLabel: 'Self-score', selfPct: Math.round(dimAvg(r.scores)), dims,
        task: `Executive summary for a ${A ? A.label : 'senior leader'}. ${A ? A.format : ''}\nTopic: ${t.topic}`, reference: `Points a good answer covers:\n- ${t.points.join('\n- ')}`, answer: r.text || '', hash: hashStr(r.text || '') }; }
    const q = iqById(r.qid); if (!q) return null;
    const ans = [r.text, r.followText].filter(Boolean).join('\n\nFollow-up answer: ');
    return { kind, id, title: `${r.id}: ${q.prompt}`, href: '#/interview/q/' + q.id, selfLabel: 'Self-score', selfPct: Math.round(dimAvg(r.scores)), dims,
      task: `Interview question: ${q.prompt}`, reference: `Signals interviewers look for:\n- ${(q.signals || []).join('\n- ')}\n\nStrong answer outline: ${q.strong || ''}`, answer: ans, hash: hashStr(ans) };
  }
  if (kind === 'wb') {
    const b = S.ws.interview.boards.find(x => x.id === id); const p = b && WHITEBOARD_PROMPTS.find(x => x.id === b.pid); if (!p) return null;
    return { kind, id, title: `${b.id}: ${p.title}`, href: '#/interview/wb/' + p.id, selfLabel: 'Self-checked coverage', selfPct: pct(p.checklist.filter((_, i) => (b.checks || {})[i]).length, p.checklist.length),
      dims: p.checklist.map((c, i) => ({ id: 'c' + (i + 1), label: c, desc: '1 = not covered, 2 = mentioned, 3 = covered with a reason, 4 = covered well with numbers or trade-offs' })),
      task: `System design whiteboard: ${p.prompt}`, reference: 'No single reference design. Judge the notes against each checklist item.', answer: b.notes || '', hash: hashStr(b.notes || '') };
  }
  return null;
}
function aiPctFor(subj, scores) {
  if (subj.weights) { const tw = subj.weights.reduce((s, w) => s + w, 0) || 1; return Math.round(subj.dims.reduce((s, d, i) => s + subj.weights[i] * (scores[d.id] - 1) / 3, 0) / tw * 100); }
  return pctOf14(scores);
}
function aiPrompt(subj) {
  const system = 'You review practice work for people learning cloud architecture. Be specific, fair, and strict; do not inflate scores. Score each rubric dimension from 1 to 4. Reply with JSON only, no prose, exactly in this shape: {"scores": {"<dimension id>": 1-4, ...}, "strengths": ["..."], "gaps": ["..."], "nextStep": "..."}. Use every dimension id given, give at most 4 strengths and 4 gaps, and make nextStep one concrete action.';
  const user = `TASK\n${subj.task}\n\nRUBRIC DIMENSIONS (id: description)\n${subj.dims.map(d => `- ${d.id}: ${d.label}. ${d.desc}`).join('\n')}\n\nREFERENCE\n${subj.reference}\n\nLEARNER'S ANSWER\n${subj.answer || '(blank)'}`;
  return { system, user };
}

/* ---------- Stored feedback (in the workspace; it is the learner's own data) */
const AIF = () => (S.ws.aiFeedback ||= {});
const CAL = () => (S.ws.calibLog ||= []);
const aiRec = (kind, id) => AIF()[kind + ':' + id] || null;
function aiState(kind, id) {
  const r = aiRec(kind, id); if (!r) return { r: null, use: false };
  const subj = aiSubject(kind, id); const stale = !!subj && r.hash !== subj.hash;
  return { r, stale, use: !r.disputed && !stale };
}
function effScore(kind, id, self) { const st = aiState(kind, id); return st.use ? Math.min(self, st.r.aiPct) : self; }
async function p6Request(kind, id) {
  const key = kind + ':' + id; const subj = aiSubject(kind, id); if (!subj || !aiReady()) return;
  S.p6.busy[key] = true; delete S.p6.err[key]; render(); announce('Asking for AI feedback.');
  try {
    const { system, user } = aiPrompt(subj); const fb = aiParse(await aiCall(system, user), subj.dims);
    const aiPct = aiPctFor(subj, fb.scores); const now = Date.now();
    AIF()[key] = { kind, id, t: now, updated: now, model: AIC.model, host: aiHost(), ...fb, aiPct, selfPct: subj.selfPct, hash: subj.hash, disputed: false };
    CAL().push({ t: now, key, kind, self: subj.selfPct, ref: aiPct, src: 'ai' }); if (CAL().length > 500) S.ws.calibLog = CAL().slice(-500);
    markDirty(); persistSoon(SAVE_QUICK); announce(`AI feedback received. AI score ${aiPct} percent, self-score ${subj.selfPct} percent.`);
  } catch (e) { S.p6.err[key] = e.message || String(e); announce('AI feedback failed. ' + S.p6.err[key]); }
  finally { delete S.p6.busy[key]; render(); $(`[data-p6k="${key}"]`)?.focus(); }
}

/* ---------- Panel shown under each piece of judgment work (hidden when AI is not set up) */
function aiPanel(kind, id) {
  if (!aiReady() || !id) return '';
  const subj = aiSubject(kind, id); if (!subj) return '';
  const key = kind + ':' + id; const st = aiState(kind, id); const r = st.r; const busy = S.p6.busy[key]; const err = S.p6.err[key];
  const used = r ? (st.use ? Math.min(subj.selfPct, r.aiPct) : subj.selfPct) : subj.selfPct;
  const head = `<div class="card-head"><h2 id="h-ai-${esc(id)}">AI feedback <span class="small muted">· ${esc(subj.title.length > 70 ? subj.title.slice(0, 70) + '…' : subj.title)}</span></h2><span class="chip">optional</span></div>`;
  const scoreRow = `<div class="ai-scores"><div class="kpi"><div class="v">${subj.selfPct}%</div><div class="l">${esc(subj.selfLabel)}</div></div><div class="kpi"><div class="v">${r ? r.aiPct + '%' : '—'}</div><div class="l">AI score</div></div><div class="kpi"><div class="v">${used}%</div><div class="l">Counts toward readiness</div></div></div>`;
  const body = r ? `${st.stale ? '<p class="notice">This work changed after the review, so the AI score is not used. Ask again for current feedback.</p>' : ''}${r.disputed ? '<p class="notice">You marked this feedback as wrong, so readiness uses your own score.</p>' : ''}
    <div class="cmp-wrap"><table class="ai-dims"><thead><tr><th scope="col">Dimension</th><th scope="col" class="num">AI (1–4)</th></tr></thead><tbody>${subj.dims.map(d => `<tr><td>${esc(d.label)}</td><td class="num">${r.scores[d.id] ?? '—'}</td></tr>`).join('')}</tbody></table></div>
    <div class="grid g-2" style="margin-top:12px"><div><h3>Strengths</h3>${r.strengths.length ? `<ul>${r.strengths.map(x => `<li>${esc(x)}</li>`).join('')}</ul>` : '<p class="small muted">None listed.</p>'}</div><div><h3>Gaps</h3>${r.gaps.length ? `<ul>${r.gaps.map(x => `<li>${esc(x)}</li>`).join('')}</ul>` : '<p class="small muted">None listed.</p>'}</div></div>
    ${r.nextStep ? `<p style="margin-top:8px"><strong>Next step:</strong> ${esc(r.nextStep)}</p>` : ''}
    <p class="small muted" style="margin-top:8px">From ${esc(r.model)} at ${esc(r.host)}, ${humanTime(r.t)}. AI feedback can be wrong; it is a second opinion, not a grade.</p>` : `<p class="small muted">Sends your answer, the rubric, and the reference for this item to ${esc(aiHost())}. Nothing else from your workspace is sent.</p>`;
  const actions = `<div class="row" style="margin-top:10px"><button class="btn ${r ? '' : 'primary'}" data-action="p6-ask" data-k="${esc(key)}" data-p6k="${esc(key)}" ${busy ? 'disabled aria-busy="true"' : ''}>${busy ? 'Waiting for feedback…' : r ? 'Ask again' : 'Get AI feedback'}</button>${r ? `<button class="btn ghost" data-action="p6-dispute" data-k="${esc(key)}" aria-pressed="${!!r.disputed}">${r.disputed ? 'Use AI score again' : 'This feedback is wrong'}</button><button class="btn ghost" data-action="p6-del" data-k="${esc(key)}">Remove feedback</button>` : ''}</div>`;
  return `<section class="card ai-panel" style="margin-top:16px" aria-labelledby="h-ai-${esc(id)}">${head}${scoreRow}<div aria-live="polite">${err ? `<p class="notice notice-err" role="alert">${esc(err)}</p>` : ''}${body}</div>${actions}</section>`;
}
const latest = arr => arr.slice().sort((a, b) => b.t - a.t)[0];
const _labP6 = VIEWS.lab;
VIEWS.lab = arg => { const h = _labP6(arg); if (!arg || !aiReady()) return h; const a = latest(S.ws.labs.filter(l => l.sid === arg)); return a ? h + aiPanel('lab', a.id) : h; };
const _adrP6 = VIEWS.adr;
VIEWS.adr = arg => { const h = _adrP6(arg); if (!arg || !aiReady()) return h; const id = String(arg).split('/')[0]; return S.ws.adrs.some(a => a.id === id) ? h + aiPanel('adr', id) : h; };
const _ivP6 = VIEWS.interview;
VIEWS.interview = (arg = '') => {
  const h = _ivP6(arg); if (!aiReady()) return h; const [tab, id, aud] = arg.split('/'); if (!id) return h;
  if (tab === 'story') return h + aiPanel('story', id);
  if (tab === 'q') { const a = latest(S.ws.interview.answers.filter(x => x.qid === id)); return a ? h + aiPanel('iq', a.id) : h; }
  if (tab === 'ex') { const a = latest(S.ws.interview.exec.filter(x => x.tid === id && (!aud || x.aud === aud))); return a ? h + aiPanel('exec', a.id) : h; }
  if (tab === 'wb') { const a = latest(S.ws.interview.boards.filter(x => x.pid === id)); return a ? h + aiPanel('wb', a.id) : h; }
  return h;
};

/* ---------- Readiness: lower of self and AI, unless disputed or stale */
judgment = function () {
  const best = {}; let lowered = 0;
  S.ws.labs.forEach(l => { const v = effScore('lab', l.id, l.score); if (v < l.score) lowered++; best[l.sid] = Math.max(best[l.sid] || 0, v); });
  const bv = Object.values(best); const adr = S.ws.adrs.map(a => { const q = adrQuality(a).total; const v = effScore('adr', a.id, q); if (v < q) lowered++; return v; });
  const labPart = avg(bv) * Math.min(1, bv.length / 4); const adrPart = avg(adr) * Math.min(1, adr.length / 3);
  return { score: Math.round(0.65 * labPart + 0.35 * adrPart), detail: `${bv.length} lab scenario(s) (best avg ${Math.round(avg(bv))}%), ${adr.length} ADR(s) (avg quality ${Math.round(avg(adr))}). Full credit needs 4+ scenarios and 3+ ADRs.${lowered ? ` AI review lowered ${lowered} score${lowered === 1 ? '' : 's'}; the lower score counts.` : ''}` };
};
interviewScore = function () {
  let lowered = 0;
  const good = S.ws.interview.stories.filter(s => { if (!(storyStrong(s) && s.status !== 'drafted')) return false; const st = aiState('story', s.id); if (st.use && st.r.aiPct < 50) { lowered++; return false; } return true; });
  const covered = new Set(good.flatMap(s => s.competencies)); const storyPart = Math.min(1, covered.size / 8) * 100;
  const last = {}; S.ws.interview.answers.forEach(a => { if (!last[a.qid] || a.t > last[a.qid].t) last[a.qid] = a; });
  const eff = (kind, r) => { const self = dimAvg(r.scores); const v = effScore(kind, r.id, self); if (v < self) lowered++; return v; };
  const m = Object.values(last).map(a => eff('iq', a)); const cats = new Set(Object.keys(last).map(id => iqById(id)?.cat).filter(Boolean));
  const mockPart = avg(m) * Math.min(1, m.length / 12) * Math.min(1, (cats.size + 1) / 5);
  const ex = S.ws.interview.exec.map(a => eff('exec', a)); const execPart = avg(ex) * Math.min(1, ex.length / 3);
  const boards = S.ws.interview.boards.map(b => { const p = WHITEBOARD_PROMPTS.find(x => x.id === b.pid); if (!p) return 0; const self = Object.values(b.checks).filter(Boolean).length / p.checklist.length * 100; const v = effScore('wb', b.id, self); if (v < self) lowered++; return v; });
  const wbPart = avg(boards) * Math.min(1, boards.length / 3);
  return { score: Math.round(0.3 * storyPart + 0.35 * mockPart + 0.15 * execPart + 0.2 * wbPart), detail: `${covered.size}/8 competencies backed by polished STAR stories, ${m.length} mock questions across ${cats.size} categories, ${ex.length} executive summaries, ${boards.length} whiteboard session(s). Rubric scores are self-assessed${lowered ? `; AI review lowered ${lowered}, and the lower score counts` : ''}.`, parts: { storyPart, mockPart, execPart, wbPart } };
};

/* ---------- Readiness snapshots (one per exam per day) so outcomes can be compared later */
const RLOG = () => (S.ws.readinessLog ||= []);
function p6Snapshot(code) {
  if (!code || !examMetaFor(code) || !examQs(code).length) return;
  let score; try { score = examReadiness(code).score; } catch { return; }
  let verdict = 'none'; try { verdict = goNoGo(code).verdict; } catch { /* no simulations yet */ }
  const d = isoDate(Date.now()); const log = RLOG(); const i = log.findIndex(x => x.d === d && x.code === code);
  const rec = { d, code, score, verdict, t: Date.now() };
  if (i >= 0) { if (log[i].score === score && log[i].verdict === verdict) return; log[i] = rec; } else log.push(rec);
  if (log.length > 800) S.ws.readinessLog = log.slice(-800);
  markDirty();
}
const _dashP6 = VIEWS.dashboard;
VIEWS.dashboard = arg => { try { p6Snapshot(focusExam()); } catch { /* optional */ } return _dashP6(arg); };
const _finishP6 = finishRunner;
finishRunner = function (force) { const r = S.runner; _finishP6(force); if (r && r.finished && r.mode === 'exam' && r.examCode) p6Snapshot(r.examCode); };

/* ---------- Calibration */
const CONF_EXPECT = { high: 90, medium: 70, low: 40 }; /* how this app reads each confidence label */
function confPairs() {
  const out = [];
  for (const [id, c] of Object.entries(S.progress.confidence)) { const l = lastAttempt(id); if (!l || !(c in CONF_EXPECT)) continue; out.push({ t: l.t, self: CONF_EXPECT[c], ref: l.correct ? 100 : 0, c }); }
  return out;
}
function judgmentPairs() { return CAL().filter(x => { const r = AIF()[x.key]; return !(r && r.disputed && r.t === x.t); }).map(x => ({ t: x.t, self: x.self, ref: x.ref, key: x.key })); }
const idx = pairs => pairs.length ? Math.round(avg(pairs.map(p => p.self - p.ref))) : null;
function overconfidenceIndex() {
  const j = judgmentPairs(), q = confPairs(); const ji = idx(j), qi = idx(q);
  const parts = [ji !== null && j.length >= 3 ? [ji, j.length] : null, qi !== null && q.length >= 10 ? [qi, q.length] : null].filter(Boolean);
  const overall = parts.length ? Math.round(parts.reduce((s, [v, n]) => s + v * n, 0) / parts.reduce((s, [, n]) => s + n, 0)) : null;
  return { overall, ji, jn: j.length, qi, qn: q.length };
}
function coachNote(v) {
  if (v === null) return 'Not enough data yet. Rate your confidence on at least 10 questions, or get AI feedback on 3 pieces of work.';
  if (v > 15) return 'You rate yourself well above what the evidence shows. Before scoring yourself, find one rubric line you did not fully meet, and treat "high" confidence as a promise you would bet on.';
  if (v > 5) return 'Slightly overconfident. Score the answer you wrote, not the one you meant, and check one weak spot before you rate.';
  if (v >= -5) return 'Well calibrated: your own scores track the evidence. Keep rating honestly; it makes your readiness numbers trustworthy.';
  return 'You are harder on yourself than the evidence. When the work meets a rubric line, give yourself the credit, and use "medium" rather than "low" when you can explain your reasoning.';
}
const calLabel = v => v === null ? 'No reading yet' : v > 15 ? 'Overconfident' : v > 5 ? 'Slightly overconfident' : v >= -5 ? 'Well calibrated' : 'Underconfident';
function weeklyTrend(weeks = 8) {
  const all = [...judgmentPairs(), ...confPairs()]; const now = startOfDay(Date.now()); const out = [];
  for (let w = weeks - 1; w >= 0; w--) { const end = now + DAY - w * 7 * DAY, start = end - 7 * DAY; const ps = all.filter(p => p.t >= start && p.t < end); out.push({ start, n: ps.length, v: ps.length ? Math.round(avg(ps.map(p => p.self - p.ref))) : null }); }
  return out;
}
function trendHtml(tr) {
  const max = Math.max(20, ...tr.filter(x => x.v !== null).map(x => Math.abs(x.v)));
  const label = tr.map(x => `week of ${fmtDate(x.start)}: ${x.v === null ? 'no data' : (x.v > 0 ? '+' : '') + x.v + ' points'}`).join('; ');
  return `<div class="cal-trend" role="img" aria-label="Overconfidence by week. ${esc(label)}">${tr.map(x => { const h = x.v === null ? 0 : Math.round(Math.abs(x.v) / max * 50); return `<div class="cal-col" title="${esc(fmtDate(x.start))}: ${x.v === null ? 'no data' : x.v}"><div class="cal-up">${x.v > 0 ? `<i class="pos" style="height:${h}px"></i>` : ''}</div><div class="cal-down">${x.v < 0 ? `<i class="neg" style="height:${h}px"></i>` : ''}</div><span class="small muted">${x.v === null ? '·' : (x.v > 0 ? '+' : '') + x.v}</span></div>`; }).join('')}</div><p class="small muted" style="margin-top:6px">Bars above the line mean you rated yourself higher than the evidence that week; below means lower. Last 8 weeks.</p>`;
}

/* ---------- Outcome log */
const OUT = () => (S.ws.outcomes ||= []);
function snapshotBefore(code, date) { const c = RLOG().filter(x => x.code === code && x.d <= date).sort((a, b) => a.d < b.d ? 1 : -1); return c[0] || null; }
function outcomeRows() { return OUT().slice().sort((a, b) => a.date < b.date ? 1 : -1).map(o => ({ o, snap: snapshotBefore(o.exam, o.date) })); }
function evidence(rows) {
  const w = rows.filter(r => r.snap); const pass = w.filter(r => r.o.result === 'pass'), fail = w.filter(r => r.o.result === 'fail');
  const decided = w.filter(r => r.snap.verdict === 'go' || r.snap.verdict === 'nogo'); const agree = decided.filter(r => (r.snap.verdict === 'go') === (r.o.result === 'pass'));
  return { n: rows.length, withSnap: w.length, passAvg: pass.length ? Math.round(avg(pass.map(r => r.snap.score))) : null, failAvg: fail.length ? Math.round(avg(fail.map(r => r.snap.score))) : null, decided: decided.length, agree: agree.length, pass: pass.length, fail: fail.length };
}
const VERDICT_LABEL = { go: 'Go', nogo: 'No-Go', notyet: 'Not yet', none: 'No verdict' };
function outcomeForm() {
  const f = S.p6.form ||= { date: isoDate(Date.now()), exam: focusExam() || '', result: '', score: '', notes: '' };
  const codes = uniq([...Object.keys(EXAM_PROFILES), ...activeExams().map(e => e.code)]);
  return `<form class="card" id="p6-out-form" aria-labelledby="h-out-new" novalidate><h3 id="h-out-new">Record a real exam result</h3>
    <div class="filters"><div class="field"><label for="out-date">Exam date</label><input id="out-date" type="date" data-p6f="date" value="${esc(f.date)}" max="${isoDate(Date.now())}" required></div>
      <div class="field"><label for="out-exam">Exam</label><select id="out-exam" data-p6f="exam" required>${opts(codes.map(c => [c, `${c}${EXAM_PROFILES[c]?.name ? ' · ' + EXAM_PROFILES[c].name : ''}`]), f.exam, 'Choose an exam')}</select></div>
      <fieldset class="field ob-fs"><legend class="small">Result</legend><div class="row"><label class="row small" style="gap:6px"><input type="radio" name="out-res" value="pass" data-p6f="result" ${f.result === 'pass' ? 'checked' : ''}> Passed</label><label class="row small" style="gap:6px"><input type="radio" name="out-res" value="fail" data-p6f="result" ${f.result === 'fail' ? 'checked' : ''}> Did not pass</label></div></fieldset>
      <div class="field"><label for="out-score">Score (if you know it)</label><input id="out-score" type="text" inputmode="numeric" data-p6f="score" value="${esc(f.score)}" placeholder="optional" autocomplete="off"></div>
      <div class="field" style="grid-column:1/-1"><label for="out-notes">Notes</label><input id="out-notes" type="text" data-p6f="notes" value="${esc(f.notes)}" placeholder="optional: what surprised you"></div></div>
    <div class="row" style="margin-top:10px"><button class="btn primary" type="submit">Save result</button></div>
    <p class="small muted" style="margin-top:8px">Kept in your workspace on this device. Used only to check how well readiness predicted your result.</p></form>`;
}
VIEWS.calibration = () => {
  const oi = overconfidenceIndex(); const tr = weeklyTrend(); const rows = outcomeRows(); const ev = evidence(rows);
  const reviews = Object.values(AIF()).sort((a, b) => b.t - a.t);
  const sign = v => v === null ? '—' : (v > 0 ? '+' : '') + v;
  return `<div class="page-head"><div><h1>Calibration and outcomes</h1><p class="muted">How well your own ratings match the evidence, and whether readiness predicted your real exam results.</p></div></div>
  <section class="card cal-head" aria-labelledby="h-oci"><div class="cal-main"><div class="cal-v ${oi.overall === null ? '' : oi.overall > 5 ? 'over' : oi.overall < -5 ? 'under' : 'ok'}">${sign(oi.overall)}</div><div><h2 id="h-oci">Overconfidence index</h2><p><strong>${esc(calLabel(oi.overall))}.</strong> ${esc(coachNote(oi.overall))}</p></div></div>
    <div class="cmp-wrap" style="margin-top:12px"><table><thead><tr><th scope="col">Source</th><th scope="col" class="num">Readings</th><th scope="col" class="num">Self minus evidence</th></tr></thead><tbody>
      <tr><th scope="row">Judgment work: your score vs AI review</th><td class="num">${oi.jn}</td><td class="num">${oi.jn ? sign(oi.ji) + ' points' : '—'}</td></tr>
      <tr><th scope="row">Questions: your confidence vs the answer key</th><td class="num">${oi.qn}</td><td class="num">${oi.qn ? sign(oi.qi) + ' points' : '—'}</td></tr></tbody></table></div>
    <p class="small muted" style="margin-top:8px">Positive means you rated yourself higher than the evidence. For questions, this app reads High as about ${CONF_EXPECT.high}% sure, Medium as ${CONF_EXPECT.medium}%, and Low as ${CONF_EXPECT.low}%, and compares that with whether your last answer was right. A source needs ${3} AI reviews or ${10} rated questions before it counts.</p>
    ${trendHtml(tr)}</section>
  <section class="card" style="margin-top:16px" aria-labelledby="h-air"><h2 id="h-air">AI reviews (${reviews.length})</h2>${reviews.length ? `<div class="cmp-wrap"><table><thead><tr><th scope="col">Work</th><th scope="col" class="num">Self</th><th scope="col" class="num">AI</th><th scope="col">Counts</th><th scope="col">When</th></tr></thead><tbody>${reviews.map(r => { const s = aiSubject(r.kind, r.id); const st = aiState(r.kind, r.id); return `<tr><td>${s ? `<a href="${esc(s.href)}">${esc(s.title.length > 60 ? s.title.slice(0, 60) + '…' : s.title)}</a>` : esc(r.kind + ' ' + r.id + ' (deleted)')}</td><td class="num">${s ? s.selfPct : r.selfPct}%</td><td class="num">${r.aiPct}%</td><td>${r.disputed ? 'Self (AI marked wrong)' : st.stale ? 'Self (work changed)' : 'Lower of the two'}</td><td>${humanTime(r.t)}</td></tr>`; }).join('')}</tbody></table></div>`
      : `<p class="small muted">${aiReady() ? 'No AI reviews yet. Open a saved lab, ADR, story, executive summary, whiteboard, or mock answer and choose Get AI feedback.' : 'AI feedback is optional and not set up. You can add your own endpoint and key in <a href="#/settings">Settings</a>; everything else works without it.'}</p>`}</section>
  <section class="card" style="margin-top:16px" aria-labelledby="h-outc"><h2 id="h-outc">Real exam outcomes</h2>
    ${rows.length ? `<div class="cmp-wrap"><table><thead><tr><th scope="col">Date</th><th scope="col">Exam</th><th scope="col">Result</th><th scope="col">Score</th><th scope="col">Readiness before</th><th scope="col">Verdict before</th><th scope="col"><span class="sr-only">Actions</span></th></tr></thead><tbody>${rows.map(({ o, snap }) => `<tr><td>${esc(o.date)}</td><td>${esc(o.exam)}</td><td><span class="chip ${o.result === 'pass' ? 'ok-chip' : 'warn-chip'}">${o.result === 'pass' ? 'Passed' : 'Did not pass'}</span></td><td>${o.score ? esc(o.score) : '—'}</td><td>${snap ? `${snap.score}% <span class="small muted">(${esc(snap.d)})</span>` : '<span class="small muted">None recorded before this date</span>'}</td><td>${snap ? esc(VERDICT_LABEL[snap.verdict] || snap.verdict) : '—'}</td><td><button class="btn sm ghost" data-action="p6-out-del" data-id="${esc(o.id)}" aria-label="Delete result ${esc(o.id)}">Delete</button></td></tr>`).join('')}</tbody></table></div>
      <div class="cal-ev"><p><strong>What the evidence says so far.</strong> ${ev.withSnap < 5 ? `With ${ev.withSnap} result${ev.withSnap === 1 ? '' : 's'} that have a readiness reading, this is an anecdote, not evidence. It takes at least 5 to start seeing a pattern.` : ''}</p>
        <ul class="small">${ev.passAvg !== null ? `<li>Average readiness before a pass: <strong>${ev.passAvg}%</strong> (${ev.pass})</li>` : ''}${ev.failAvg !== null ? `<li>Average readiness before a fail: <strong>${ev.failAvg}%</strong> (${ev.fail})</li>` : ''}${ev.decided ? `<li>Go / No-Go matched the result ${ev.agree} of ${ev.decided} time${ev.decided === 1 ? '' : 's'}</li>` : '<li>No Go or No-Go verdict was recorded before any exam yet. Take full simulations before your exam to get one.</li>'}</ul></div>`
      : '<p class="small muted" style="margin-bottom:12px">No results recorded yet. After you sit an exam, log it here. Readiness is recorded each day you open the app, so your result can be compared with how ready the app thought you were.</p>'}
    ${outcomeForm()}</section>`;
};

/* ---------- Settings: device-only AI configuration */
function aiSettingsCard() {
  const c = AIC || {}; const st = c.style || 'openai';
  return `<section class="card" style="margin-bottom:20px" aria-labelledby="h-ai-set"><div class="card-head"><h2 id="h-ai-set">AI feedback (optional)</h2>${aiReady() ? '<span class="chip ok-chip">Set up on this device</span>' : '<span class="chip">Off</span>'}</div>
    <p class="small muted">Get a second opinion on labs, ADRs, STAR stories, executive summaries, whiteboards, and mock answers from an AI service you choose. Your key is stored only in this browser's storage on this device. It is never put in workspace files, daily backups, or exports. Without it, AI controls stay hidden and everything else works the same.</p>
    ${S.p6.memOnly ? '<p class="notice">Storage is blocked, so the key is kept only until you close this tab.</p>' : ''}
    <form id="p6-ai-form" novalidate><div class="filters" style="margin-top:10px">
      <div class="field"><label for="ai-style">Request format</label><select id="ai-style">${opts(AI_STYLES, st)}</select></div>
      <div class="field" style="grid-column:1/-1"><label for="ai-endpoint">Endpoint URL</label><input id="ai-endpoint" type="url" inputmode="url" value="${esc(c.endpoint || '')}" placeholder="https://… (full URL of the chat or messages endpoint)" autocomplete="off" autocapitalize="none" spellcheck="false"></div>
      <div class="field"><label for="ai-model">Model name</label><input id="ai-model" type="text" value="${esc(c.model || '')}" placeholder="as your provider names it" autocomplete="off" autocapitalize="none" spellcheck="false"></div>
      <div class="field"><label for="ai-header">Key header name</label><input id="ai-header" type="text" value="${esc(c.header || AI_DEFAULT_HEADER[st])}" autocomplete="off" autocapitalize="none" spellcheck="false"></div>
      <div class="field"><label for="ai-key">API key</label><input id="ai-key" type="password" value="" placeholder="${c.key ? 'Saved (ends ' + esc(c.key.slice(-4)) + '). Leave blank to keep.' : 'Paste your key'}" autocomplete="off" autocapitalize="none" spellcheck="false"></div></div>
      <div class="row" style="margin-top:12px"><button class="btn primary" type="submit">Save on this device</button><button class="btn" type="button" data-action="p6-ai-test" ${aiReady() ? '' : 'disabled'}>Test connection</button>${c.endpoint ? '<button class="btn ghost" type="button" data-action="p6-ai-remove">Remove key and settings</button>' : ''}</div></form>
    <div id="p6-ai-msg" aria-live="polite">${S.p6.test ? `<p class="small" style="margin-top:8px">${esc(S.p6.test)}</p>` : ''}</div>
    <p class="small muted" style="margin-top:8px">With "Authorization" as the header, the key is sent as "Bearer …". The Anthropic format also sends the headers that API needs for browser requests. A key used from a browser can be read by anything running on this device; a small proxy you control is safer. See <a href="#/privacy">Privacy</a>.</p></section>`;
}
const _settingsP6 = VIEWS.settings;
VIEWS.settings = arg => { const h = _settingsP6(arg); const i = h.indexOf('<section', h.indexOf('<section') + 1); return i < 0 ? h + aiSettingsCard() : h.slice(0, i) + aiSettingsCard() + h.slice(i); };
const _privacyP6 = VIEWS.privacy;
VIEWS.privacy = arg => _privacyP6(arg) + `<section class="card" style="margin-top:16px"><h2>Optional AI feedback</h2><p>Off unless you add your own endpoint and key in Settings. When it is on and you ask for feedback, the app sends that one piece of work (your answer, its rubric, and its reference) to the address you entered, directly from your browser. Nothing is sent automatically, and nothing else from your workspace is included. The key is stored in this browser's storage on this device only and is never included in workspace files or backups. Removing it in Settings, or using "Delete all my data", erases it. The AI provider's own terms apply to what you send.</p></section>`;

/* ---------- Workspace import: merge by permanent id / key, newer wins */
const _smartImportP6 = smartImport;
smartImport = data => {
  const r = _smartImportP6(data); const w = data && (data.workspace || data); if (!w || data.format !== 'cloudwalker-workspace') return r;
  if (w.aiFeedback && typeof w.aiFeedback === 'object') for (const [k, v] of Object.entries(w.aiFeedback)) { if (v && v.scores && (!AIF()[k] || (v.updated || 0) > (AIF()[k].updated || 0))) AIF()[k] = v; }
  if (Array.isArray(w.calibLog)) { const seen = new Set(CAL().map(x => x.key + '@' + x.t)); for (const x of w.calibLog) if (x && x.key && !seen.has(x.key + '@' + x.t)) CAL().push(x); CAL().sort((a, b) => a.t - b.t); }
  if (Array.isArray(w.outcomes)) { const m = new Map(OUT().map(o => [o.id, o])); for (const o of w.outcomes) if (o && /^OUT-\d{3,}$/.test(o.id || '') && (!m.has(o.id) || (o.updated || 0) > (m.get(o.id).updated || 0))) m.set(o.id, o); S.ws.outcomes = [...m.values()]; }
  if (Array.isArray(w.readinessLog)) { const m = new Map(RLOG().map(x => [x.d + '|' + x.code, x])); for (const x of w.readinessLog) if (x && x.d && x.code && (!m.has(x.d + '|' + x.code) || (x.t || 0) > (m.get(x.d + '|' + x.code).t || 0))) m.set(x.d + '|' + x.code, x); S.ws.readinessLog = [...m.values()].sort((a, b) => a.d < b.d ? -1 : 1); }
  return r;
};

/* ---------- Chrome and events */
ICON.calibration = '<circle cx="12" cy="12" r="8"/><circle cx="12" cy="12" r="4"/><path d="M12 2v3M12 19v3M2 12h3M19 12h3"/>';
(() => { const i = NAV.findIndex(n => n[0] === 'interview'); NAV.splice(i >= 0 ? i + 1 : NAV.length, 0, ['calibration', 'Calibration & outcomes', 'Prove']); })();
function readAiForm() {
  const v = id => ($('#' + id)?.value || '').trim(); const prev = AIC || {};
  return { style: v('ai-style') || 'openai', endpoint: v('ai-endpoint'), model: v('ai-model'), header: v('ai-header') || 'Authorization', key: v('ai-key') || prev.key || '', savedAt: Date.now() };
}
function validAi(c) {
  let u; try { u = new URL(c.endpoint); } catch { return 'Enter the full endpoint URL, starting with https://'; }
  if (u.protocol !== 'https:' && !['localhost', '127.0.0.1'].includes(u.hostname)) return 'The endpoint must use https:// (http is allowed only for localhost).';
  if (!c.model) return 'Enter the model name your provider uses.';
  if (!/^[A-Za-z0-9-]+$/.test(c.header)) return 'The header name can use letters, digits, and hyphens only.';
  if (!c.key) return 'Paste your API key.';
  return '';
}
document.addEventListener('submit', e => {
  if (e.target.id === 'p6-ai-form') { e.preventDefault(); const c = readAiForm(); const bad = validAi(c); if (bad) { const m = $('#p6-ai-msg'); if (m) m.innerHTML = `<p class="small notice notice-err" role="alert" style="margin-top:8px">${esc(bad)}</p>`; $(/model/.test(bad) ? '#ai-model' : /header/.test(bad) ? '#ai-header' : /key/.test(bad) ? '#ai-key' : '#ai-endpoint')?.focus(); return; } p6SaveConfig(c).then(() => { S.p6.test = S.p6.memOnly ? 'Saved for this tab only (storage is blocked).' : 'Saved on this device. AI feedback buttons now appear on saved work.'; render(); $('#h-ai-set')?.scrollIntoView({ block: 'nearest' }); }); }
  else if (e.target.id === 'p6-out-form') {
    e.preventDefault(); const f = S.p6.form;
    if (!f.date || !/^\d{4}-\d{2}-\d{2}$/.test(f.date)) { showStatus('Enter the exam date.'); $('#out-date')?.focus(); return; }
    if (f.date > isoDate(Date.now())) { showStatus('The exam date cannot be in the future.'); $('#out-date')?.focus(); return; }
    if (!f.exam) { showStatus('Choose the exam.'); $('#out-exam')?.focus(); return; }
    if (!f.result) { showStatus('Choose passed or did not pass.'); $('input[name="out-res"]')?.focus(); return; }
    const now = Date.now(); OUT().push({ id: nextId('OUT', OUT()), date: f.date, exam: f.exam, result: f.result, score: f.score.trim().slice(0, 20), notes: f.notes.trim().slice(0, 300), t: now, updated: now });
    S.p6.form = null; markDirty(); persistSoon(SAVE_QUICK); render(); showStatus('Result saved.'); $('#h-outc')?.focus();
  }
});
document.addEventListener('input', e => { const el = e.target; if (el.dataset && el.dataset.p6f && S.p6.form && el.type !== 'radio') S.p6.form[el.dataset.p6f] = el.value; });
document.addEventListener('change', e => {
  const el = e.target; if (el.dataset && el.dataset.p6f && S.p6.form) S.p6.form[el.dataset.p6f] = el.value;
  if (el.id === 'ai-style') { const h = $('#ai-header'); if (h && Object.values(AI_DEFAULT_HEADER).includes(h.value.trim())) h.value = AI_DEFAULT_HEADER[el.value] || 'Authorization'; }
});
document.addEventListener('click', e => {
  const b = e.target.closest('[data-action^="p6-"]'); if (!b) return; const d = b.dataset;
  e.preventDefault();
  if (d.action === 'p6-ask') p6Request(...d.k.split(/:(.+)/).slice(0, 2));
  else if (d.action === 'p6-dispute') { const r = AIF()[d.k]; if (!r) return; r.disputed = !r.disputed; r.updated = Date.now(); markDirty(); persistSoon(SAVE_QUICK); render(); showStatus(r.disputed ? 'Marked as wrong. Readiness uses your own score for this item.' : 'AI score counts again.'); $(`[data-action="p6-dispute"][data-k="${d.k}"]`)?.focus(); }
  else if (d.action === 'p6-del') { if (!confirm('Remove this AI feedback? Your own score is kept.')) return; delete AIF()[d.k]; markDirty(); persistSoon(SAVE_QUICK); render(); showStatus('AI feedback removed.'); }
  else if (d.action === 'p6-out-del') { if (!confirm(`Delete result ${d.id}?`)) return; S.ws.outcomes = OUT().filter(o => o.id !== d.id); markDirty(); persistSoon(SAVE_QUICK); render(); showStatus('Result deleted.'); }
  else if (d.action === 'p6-ai-remove') { if (!confirm('Remove the AI endpoint, model, and key from this device?')) return; p6RemoveConfig().then(() => { S.p6.test = 'Removed. AI feedback is off.'; render(); }); }
  else if (d.action === 'p6-ai-test') {
    S.p6.test = 'Testing…'; render();
    aiCall('Reply with JSON only.', 'Return exactly {"scores":{"test":4},"strengths":["ok"],"gaps":[],"nextStep":"none"}')
      .then(t => { aiParse(t, [{ id: 'test' }]); S.p6.test = `Connected to ${aiHost()} and got a valid JSON reply.`; })
      .catch(err => { S.p6.test = 'Test failed: ' + (err.message || err); })
      .finally(() => { render(); $('[data-action="p6-ai-test"]')?.focus(); });
  }
});
setTimeout(() => { p6LoadConfig(); }, 0);


