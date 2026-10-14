/* ------------------------------------------------------------------ Import / export */
function download(name, obj) {
  const blob = new Blob([JSON.stringify(obj, null, 2)], { type: 'application/json' });
  const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = name; document.body.append(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(a.href), 2000);
}
const stamp = () => new Date().toISOString().slice(0, 16).replace(/[:T]/g, '-');
function exportProgress() {
  const stats = {};
  for (const e of activeExams()) { const t = totals(q => q.exam_code === e.code); stats[e.code] = { answered: t.att, correct: t.cor, unique_seen: t.uniqSeen }; }
  const modes = {}; for (const arr of Object.values(S.progress.answers)) for (const a of arr) { const m = modes[a.mode] ||= { answered: 0, correct: 0 }; m.answered++; if (a.correct) m.correct++; }
  download(`blueprint-progress-${stamp()}.json`, { format: 'blueprint-progress', version: 1, exported_at: new Date().toISOString(), bank_size: S.bank.size, answers: S.progress.answers, flags: [...S.progress.flags], confidence: S.progress.confidence, sessions: S.progress.sessions, srs: S.ws.srs, stats: { by_exam: stats, by_mode: modes, session: S.session } });
  toast('Progress exported.');
}
function importProgress(data) {
  const errs = [];
  if (!data || typeof data !== 'object') throw new Error('The file is not a JSON object.');
  if (data.format && data.format !== 'blueprint-progress') throw new Error(`Expected format "blueprint-progress", found "${data.format}".`);
  if (data.answers && typeof data.answers !== 'object') throw new Error('"answers" must be an object keyed by question id.');
  let added = 0, unknown = 0;
  for (const [id, arr] of Object.entries(data.answers || {})) {
    if (!Array.isArray(arr)) { errs.push(`${id}: answers must be an array`); continue; }
    if (!S.bank.has(id)) unknown++;
    const cur = S.progress.answers[id] ||= []; const seen = new Set(cur.map(a => a.t + ':' + a.choice));
    for (const a of arr) { if (!a || !Number.isInteger(a.choice) || typeof a.correct !== 'boolean' || typeof a.t !== 'number') { errs.push(`${id}: skipped a malformed answer`); continue; } if (!seen.has(a.t + ':' + a.choice)) { cur.push({ t: a.t, choice: a.choice, correct: a.correct, mode: a.mode || 'imported', ms: a.ms || 0 }); added++; } }
    cur.sort((a, b) => a.t - b.t);
  }
  for (const id of data.flags || []) if (typeof id === 'string') S.progress.flags.add(id);
  for (const [id, c] of Object.entries(data.confidence || {})) if (['high', 'medium', 'low'].includes(c)) S.progress.confidence[id] = c; else errs.push(`${id}: ignored confidence "${c}"`);
  const have = new Set(S.progress.sessions.map(s => s.id));
  for (const s of data.sessions || []) if (s && s.id && !have.has(s.id)) S.progress.sessions.push(s);
  S.progress.sessions.sort((a, b) => a.ended - b.ended);
  for (const [id, c] of Object.entries(data.srs || {})) if (c && (!S.ws.srs[id] || (c.last || 0) > (S.ws.srs[id].last || 0))) S.ws.srs[id] = c;
  srsRebuildMissing();
  return { ok: true, title: 'Progress imported.', body: `${added} answers added, ${(data.flags || []).length} flags and ${Object.keys(data.confidence || {}).length} confidence ratings merged.${unknown ? ` ${unknown} question ids aren't in the current bank; their history is kept but not shown.` : ''}`, list: errs };
}
function importBank(data) {
  const items = Array.isArray(data) ? data : data && Array.isArray(data.questions) ? data.questions : null;
  if (!items) throw new Error('Expected an array of questions or an object with a "questions" array.');
  if (data.exams && Array.isArray(data.exams)) for (const e of data.exams) { if (!e || !e.code || !e.name) continue; const cur = examMetaFor(e.code); if (cur) Object.assign(cur, e); else S.exams.push({ vendor: 'Other', tier: 'custom', domain_weights: {}, ...e }); }
  const errs = []; const ids = new Set(); let added = 0, updated = 0;
  items.forEach((q, i) => {
    const e = validateQuestion(q, i);
    if (q && q.id && ids.has(q.id)) e.push(`${q.id}: duplicate id within the file`);
    if (e.length) { errs.push(...e); return; }
    ids.add(q.id); const n = normalizeQuestion(q); ensureExam(n);
    if (S.bank.has(n.id)) updated++; else { added++; S.order.push(n.id); }
    S.bank.set(n.id, n);
  });
  return { ok: added + updated > 0, title: added + updated ? 'Question bank imported.' : 'No questions were imported.', body: `${added} added, ${updated} updated by id, ${items.length - added - updated} rejected.`, list: errs };
}
function readJSON(input, fn) {
  const file = input.files[0]; input.value = ''; if (!file) return;
  const rd = new FileReader();
  rd.onload = () => {
    try { const data = JSON.parse(rd.result); if (data && data.format === 'blueprint-question-bank') snapshot('Before importing ' + file.name); S.ui.settingsMsg = fn(data); S.meta2.lastImport = Date.now(); }
    catch (e) { S.ui.settingsMsg = { ok: false, title: `Couldn't import ${file.name}.`, body: e instanceof SyntaxError ? 'The file is not valid JSON.' : e.message }; }
    go('settings'); toast(S.ui.settingsMsg.title);
  };
  rd.readAsText(file);
}

