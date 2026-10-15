/* ================================================================== V10.1: Bootcamp, saved progress
 * Saved data (S.ws.bootcamp), created the first time it is needed:
 *   { v: 1, labs: { <labId>: LabRecord }, prefs: { focus_topics: [], updated }, log: [{ t, id, what }], updated }
 * LabRecord follows the curriculum's progress/tracker.csv row, plus the extra fields CloudWalker tracks:
 *   status, started, completed, score_correctness … score_communication (null or 0–4), validation_command,
 *   evidence_link, cleanup_verified, reviewer_notes, personal_notes, portfolio ('' | private | needs-sanitization |
 *   public-safe | portfolio-ready), portfolio_ready, confidence ('' | low | medium | high), last_reviewed,
 *   evidence: { code, tests, validation, drill, adr, runbook, incident, report, cleanup, artifact, sanitized }, updated.
 * Dates are local YYYY-MM-DD strings, as in tracker.csv. Imports merge per lab id and the newer record wins
 * whole; fields this version does not know are kept, so a newer app's data survives a round trip. */
const BC_FORMAT = 'cloudwalker-bootcamp-progress', BC_FORMAT_VERSION = 1, BC_LOG_MAX = 40;
const BC_SCORE_FIELDS = ['score_correctness', 'score_security', 'score_resilience', 'score_operations', 'score_cost', 'score_automation', 'score_communication'];
const BC_TEXT_FIELDS = { validation_command: 500, evidence_link: 500, reviewer_notes: 4000, personal_notes: 4000 };
const BC_DATE_FIELDS = ['started', 'completed', 'last_reviewed'];
const bcToday = () => { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`; };
const bcBlank = () => ({ status: 'not-started', started: '', completed: '', ...Object.fromEntries(BC_SCORE_FIELDS.map(f => [f, null])), validation_command: '', evidence_link: '', cleanup_verified: false, reviewer_notes: '', personal_notes: '', portfolio: '', portfolio_ready: false, confidence: '', last_reviewed: '', evidence: {}, updated: 0 });

function bcData() {
  const d = (S.ws.bootcamp ||= { v: BC_FORMAT_VERSION, labs: {}, prefs: { focus_topics: [], updated: 0 }, log: [], updated: 0 });
  if (!d.labs || typeof d.labs !== 'object' || Array.isArray(d.labs)) d.labs = {};
  if (!d.prefs || typeof d.prefs !== 'object') d.prefs = { focus_topics: [], updated: 0 };
  if (!Array.isArray(d.prefs.focus_topics)) d.prefs.focus_topics = [];
  if (!Array.isArray(d.log)) d.log = [];
  return d;
}
/* Read-only view of a lab's record: the saved one, or a blank that is not stored until something changes. */
function bcRec(id) { const r = (S.ws.bootcamp && S.ws.bootcamp.labs || {})[id]; return r ? { ...bcBlank(), ...r, evidence: { ...(r.evidence || {}) } } : bcBlank(); }
function bcLog(id, what) {
  const d = bcData(); const now = Date.now(); const top = d.log[0];
  if (top && top.id === id && top.what === what && now - top.t < 60000) top.t = now; else d.log.unshift({ t: now, id, what });
  if (d.log.length > BC_LOG_MAX) d.log.length = BC_LOG_MAX;
}
function bcEdit(id, fn, what) {
  if (!bcLab(id)) return false;
  const d = bcData(); const r = d.labs[id] ||= bcBlank(); r.evidence ||= {};
  fn(r); r.updated = Date.now(); d.updated = r.updated; if (what) bcLog(id, what);
  markDirty(); persistSoon(SAVE_QUICK); return true;
}
function bcSetStatus(id, status) {
  if (!BC_STATUS_LABEL[status]) return false;
  return bcEdit(id, r => {
    r.status = status;
    if (status !== 'not-started' && !r.started) r.started = bcToday();
    if (status === 'passed') { if (!r.completed) r.completed = bcToday(); } else r.completed = '';
  }, 'Status: ' + BC_STATUS_LABEL[status]);
}
function bcSetPortfolio(id, state) {
  if (state && !BC_PORTFOLIO_LABEL[state]) return false;
  return bcEdit(id, r => { r.portfolio = state; r.portfolio_ready = state === 'portfolio-ready'; }, state ? 'Portfolio: ' + BC_PORTFOLIO_LABEL[state] : 'Portfolio flag cleared');
}

/* ---------- scoring and the suggested gate (≥20/28, no 0 in security or cost, acceptance tests pass) */
function bcGate(r) {
  const G = bcContent().rubric.gate; const vals = BC_SCORE_FIELDS.map(f => r[f]);
  const scored = vals.filter(v => Number.isInteger(v)).length; const total = vals.reduce((s, v) => s + (Number.isInteger(v) ? v : 0), 0);
  const zeroIn = G.no_zero_in.filter(k => { const dim = BC.dims.find(x => x.key === k); return dim && r[dim.tracker_field] === 0; });
  const checks = [
    { ok: scored === 7, text: scored === 7 ? 'All seven dimensions scored' : `${scored} of 7 dimensions scored` },
    { ok: scored === 7 && total >= G.min_total, text: `Total ${total} of 28 (needs ${G.min_total} or more)` },
    { ok: scored === 7 && !zeroIn.length, text: zeroIn.length ? `0 in ${zeroIn.join(' and ')}` : 'No 0 in security or cost' },
    { ok: !!(r.evidence && r.evidence.validation), text: r.evidence && r.evidence.validation ? 'Acceptance tests recorded as passing' : 'Acceptance tests not yet recorded as passing' },
  ];
  return { total, scored, checks, pass: checks.every(c => c.ok) };
}
const bcEvidenceCount = r => BC_EVIDENCE.filter(([k]) => r.evidence && r.evidence[k]).length;

/* ---------- import, merge, export */
/* Checks one incoming lab record. Returns a problem in words, or '' when the record can be merged. */
function bcRecordProblem(id, r) {
  if (!r || typeof r !== 'object' || Array.isArray(r)) return 'is not an object';
  if (!/^[A-Za-z0-9._-]{1,40}$/.test(id) || ['__proto__', 'constructor', 'prototype'].includes(id)) return 'has an id that cannot be a lab id';
  if (!Number.isFinite(r.updated) || r.updated < 0) return 'has no valid "updated" time';
  if (r.status !== undefined && !BC_STATUS_LABEL[r.status]) return `has an unknown status "${String(r.status).slice(0, 30)}"`;
  for (const f of BC_SCORE_FIELDS) if (r[f] !== undefined && r[f] !== null && !(Number.isInteger(r[f]) && r[f] >= 0 && r[f] <= 4)) return `has ${f} outside 0–4`;
  for (const [f, max] of Object.entries(BC_TEXT_FIELDS)) if (r[f] !== undefined && (typeof r[f] !== 'string' || r[f].length > max * 2)) return `has an invalid ${f}`;
  for (const f of BC_DATE_FIELDS) if (r[f] !== undefined && r[f] !== '' && !(typeof r[f] === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(r[f]))) return `has ${f} that is not a YYYY-MM-DD date`;
  if (r.portfolio !== undefined && r.portfolio !== '' && !BC_PORTFOLIO_LABEL[r.portfolio]) return 'has an unknown portfolio flag';
  if (r.evidence !== undefined && (typeof r.evidence !== 'object' || r.evidence === null || Array.isArray(r.evidence))) return 'has evidence that is not an object';
  return '';
}
/* Merges an incoming S.ws.bootcamp-shaped object. Never throws on bad input; reports what it did. */
function bcMerge(x) {
  const rep = { added: 0, updated: 0, kept: 0, skipped: [], unknownIds: 0 };
  if (!x || typeof x !== 'object' || Array.isArray(x)) { rep.skipped.push('The bootcamp section is not an object.'); return rep; }
  if (x.labs !== undefined && (typeof x.labs !== 'object' || x.labs === null || Array.isArray(x.labs))) { rep.skipped.push('"labs" is not an object keyed by lab id.'); return rep; }
  const d = bcData();
  for (const [id, r] of Object.entries(x.labs || {})) {
    const why = bcRecordProblem(id, r); if (why) { rep.skipped.push(`${id} ${why}`); continue; }
    if (!bcLab(id)) rep.unknownIds++;
    const cur = d.labs[id];
    if (!cur) { d.labs[id] = { ...bcBlank(), ...r, evidence: { ...(r.evidence || {}) } }; rep.added++; }
    else if (r.updated > (cur.updated || 0)) { d.labs[id] = { ...bcBlank(), ...r, evidence: { ...(r.evidence || {}) } }; rep.updated++; }
    else rep.kept++;
  }
  const p = x.prefs; if (p && typeof p === 'object' && (p.updated || 0) > (d.prefs.updated || 0)) d.prefs = { ...d.prefs, ...p, focus_topics: Array.isArray(p.focus_topics) ? p.focus_topics.filter(t => typeof t === 'string') : d.prefs.focus_topics };
  if (Array.isArray(x.log)) { const key = e => e.t + '|' + e.id + '|' + e.what; const have = new Set(d.log.map(key)); for (const e of x.log) if (e && Number.isFinite(e.t) && typeof e.id === 'string' && typeof e.what === 'string' && !have.has(key(e))) d.log.push({ t: e.t, id: e.id, what: e.what }); d.log.sort((a, b) => b.t - a.t); d.log.length = Math.min(d.log.length, BC_LOG_MAX); }
  for (const [k, v] of Object.entries(x)) if (!['v', 'labs', 'prefs', 'log', 'updated'].includes(k) && !(k in d)) d[k] = v; /* keep fields from newer versions */
  d.updated = Math.max(d.updated || 0, Number.isFinite(x.updated) ? x.updated : 0);
  if (rep.added || rep.updated) { markDirty(); persistSoon(SAVE_QUICK); }
  return rep;
}
function bcExportObject() { return { format: BC_FORMAT, version: BC_FORMAT_VERSION, exported_at: new Date().toISOString(), app_version: typeof APP_VERSION === 'string' ? APP_VERSION : '', curriculum: { title: bcContent().ok ? BC.framework.title : '', labs: bcContent().ok ? BC.labs.length : 0 }, bootcamp: JSON.parse(JSON.stringify(bcData())) }; }
/* Parses a bootcamp progress file (or a whole workspace file) and merges it. Throws an Error with a
 * plain-language message when the file cannot be used; nothing is changed in that case. */
function bcImportText(text) {
  let data; try { data = JSON.parse(text); } catch (e) { throw new Error('That file is not valid JSON, so nothing was imported.'); }
  if (!data || typeof data !== 'object' || Array.isArray(data)) throw new Error('That file does not contain a JSON object, so nothing was imported.');
  let x;
  if (data.format === BC_FORMAT) { if (!(Number.isInteger(data.version) && data.version >= 1)) throw new Error('The file has no valid version number, so nothing was imported.'); if (data.version > BC_FORMAT_VERSION) throw new Error(`The file was made by a newer version of CloudWalker (format version ${data.version}). Update the app, then import it again.`); x = data.bootcamp; }
  else if (data.format === 'cloudwalker-workspace') x = (data.workspace || data).bootcamp;
  else throw new Error(`Expected a bootcamp progress file (format "${BC_FORMAT}") or a workspace file. This file's format is ${data.format ? '"' + String(data.format).slice(0, 40) + '"' : 'not stated'}, so nothing was imported.`);
  if (x === undefined) throw new Error('The file has no bootcamp progress in it, so nothing was imported.');
  if (!x || typeof x !== 'object' || Array.isArray(x) || (x.labs !== undefined && (typeof x.labs !== 'object' || x.labs === null || Array.isArray(x.labs)))) throw new Error('The bootcamp section of the file is malformed ("labs" must be an object keyed by lab id), so nothing was imported.');
  if (typeof snapshot === 'function') { try { snapshot('Before bootcamp import'); } catch (e) { /* backups are best-effort */ } }
  return bcMerge(x);
}
const bcCsvCell = v => { const s = v === null || v === undefined ? '' : String(v); return /[",\n\r]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s; };
/* progress/tracker.csv exactly as the curriculum defines it (same 16 columns, one row per lab). */
function bcTrackerCsv() {
  const C = bcContent(); const cols = C.rubric.tracker.columns;
  const rows = C.labs.map(lab => { const r = bcRec(lab.id); const lid = lab.dir.split('/').pop();
    const v = { level: lab.level, lab_id: lab.kind === 'exemplar' ? 'exemplar/' + lid : lid, status: r.status, started: r.started, completed: r.completed, validation_command: r.validation_command, evidence_link: r.evidence_link, cleanup_verified: r.status === 'not-started' && !r.cleanup_verified ? '' : String(!!r.cleanup_verified), reviewer_notes: r.reviewer_notes };
    for (const f of BC_SCORE_FIELDS) v[f] = Number.isInteger(r[f]) ? r[f] : '';
    return cols.map(c => bcCsvCell(v[c])).join(','); });
  return cols.join(',') + '\n' + rows.join('\n') + '\n';
}
