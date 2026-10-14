/* ================================================================== V09 Phase 1: never lose work
 * Local-first persistence. The full workspace (S.ws), quiz progress, open drafts,
 * an in-progress session, and any user-imported questions are written to
 * IndexedDB on this device:
 *   - about 1.5 s after the last change (debounced), and immediately when the tab
 *     is hidden (visibilitychange) or closed (pagehide);
 *   - the stored record is the same schema-4 workspace object that "Save workspace"
 *     downloads, wrapped as { format: 'cloudwalker-local', version: 4, data, ... };
 *   - one rolling daily backup per calendar day, newest 7 kept;
 *   - restore happens automatically on boot, before the first render.
 * Every IndexedDB call is wrapped in try/catch with a timeout. If storage is
 * blocked or fails, the app keeps working in memory, the save pill says so, and the
 * old "you will lose this" warnings come back, because only then are they true.
 * Workspace files: migrateWorkspace() upgrades version 1–3 files to version 4 before
 * merging; version 4 files from a newer schema are refused with a plain message.
 */
const APP_VERSION = 'V10';
const WS_SCHEMA = 4;
const IDB_NAME = 'cloudwalker', IDB_STORE = 'kv', BACKUP_KEEP = 7, SAVE_DEBOUNCE = 1500, SAVE_QUICK = 250, SAVE_MAX_WAIT = 5000;
const PERSIST = { status: 'init', reason: '', db: null, savedAt: 0, lastJson: null, pristine: null, timer: null, writing: false, again: false, disabled: false, bytes: 0, persisted: null, estimate: null, backups: [], restoredFrom: null, otherTab: 0 };
S.userBank = { exams: {}, questions: {} };
function persistOK() { return PERSIST.status === 'ok' || PERSIST.status === 'saving'; }

/* ---------- IndexedDB, promise-wrapped, every call guarded */
function withTimeout(p, ms, what) { return Promise.race([p, new Promise((_, rej) => setTimeout(() => rej(new Error(`${what} timed out`)), ms))]); }
function idbOpen() {
  return withTimeout(new Promise((res, rej) => {
    let rq; try { if (!('indexedDB' in window) || !indexedDB) throw new Error('IndexedDB is not available in this browser'); rq = indexedDB.open(IDB_NAME, 1); } catch (e) { rej(e); return; }
    rq.onupgradeneeded = () => { try { rq.result.createObjectStore(IDB_STORE); } catch (e) { rej(e); } };
    rq.onsuccess = () => { const db = rq.result; db.onversionchange = () => { try { db.close(); } catch { /* ignore */ } PERSIST.db = null; }; res(db); };
    rq.onerror = () => rej(rq.error || new Error('Storage could not be opened'));
    rq.onblocked = () => rej(new Error('Storage is blocked by another open tab'));
  }), 4000, 'Opening storage');
}
function idbTx(mode, fn) {
  return withTimeout(new Promise((res, rej) => {
    try {
      if (!PERSIST.db) throw new Error('Storage is not open');
      let tx; try { tx = PERSIST.db.transaction(IDB_STORE, mode, mode === 'readwrite' ? { durability: 'strict' } : undefined); } catch { tx = PERSIST.db.transaction(IDB_STORE, mode); }
      const st = tx.objectStore(IDB_STORE); const rq = fn(st);
      tx.oncomplete = () => res(rq ? rq.result : undefined); tx.onerror = () => rej(tx.error || new Error('Storage write failed')); tx.onabort = () => rej(tx.error || new Error('Storage write was aborted'));
    } catch (e) { rej(e); }
  }), 8000, 'Storage');
}
const idbGet = k => idbTx('readonly', st => st.get(k));
const idbPut = (k, v) => idbTx('readwrite', st => st.put(v, k));
const idbDel = k => idbTx('readwrite', st => st.delete(k));
const idbKeys = () => idbTx('readonly', st => st.getAllKeys());

/* ---------- Schema 4 workspace object (shared by local saves and the downloaded file) */
function userBankList() { return { exams: Object.values(S.userBank.exams), questions: Object.values(S.userBank.questions) }; }
function workspaceV4(forFile) {
  S.ws.schemaVersion = WS_SCHEMA;
  const o = { format: 'cloudwalker-workspace', version: WS_SCHEMA, app: 'BluePrint CloudWalker Trainer',
    progress: { answers: S.progress.answers, flags: [...S.progress.flags], confidence: S.progress.confidence, sessions: S.progress.sessions },
    workspace: S.ws, drafts: S.drafts, userBank: userBankList() };
  if (forFile) { o.exported_at = new Date().toISOString(); o.queues_snapshot = (() => { const q = queues(); return { generated: Date.now(), missed: q.missed, low: q.low, due: q.due }; })(); }
  return o;
}
function localRecord() {
  const r = S.runner && !S.runner.finished && !S.runner.readOnly ? S.runner : null;
  return { format: 'cloudwalker-local', version: WS_SCHEMA, data: workspaceV4(false), runner: r, lastResult: S.lastResult || null,
    meta: { lastExport: S.meta2.lastExport || null, lastImport: S.meta2.lastImport || null, fileSavedAt: S.meta2.savedAt || null, dirty: S.dirty || 0 } };
}

/* ---------- Migration: workspace / artifacts files, version 1–3 → 4 */
const WS_LISTS = w => [w.adrs, w.portfolio, w.labs, w.outputs, w.reflections, w.stories, w.interview?.stories, w.interview?.answers, w.interview?.boards, w.interview?.exec, w.career?.roles, w.career?.milestones, w.career?.apps];
function migrateWorkspace(data) {
  if (!data || typeof data !== 'object' || !['cloudwalker-workspace', 'cloudwalker-artifacts', 'cloudwalker-local'].includes(data.format)) return { data, notes: [], from: null };
  const from = Number(data.version) || 1;
  if (from > WS_SCHEMA) throw new Error(`This file was made by a newer version of CloudWalker (schema ${from}). This copy reads up to schema ${WS_SCHEMA}.`);
  if (from === WS_SCHEMA) return { data, notes: [], from };
  const out = JSON.parse(JSON.stringify(data)); const notes = []; let filled = 0;
  /* v1–3 → v4: every record gets a numeric `updated` when an older timestamp exists,
     so "newer wins" merges compare like with like. Nothing is renumbered or dropped. */
  const w = out.format === 'cloudwalker-workspace' ? (out.workspace || out) : out;
  for (const list of WS_LISTS(w)) if (Array.isArray(list)) for (const r of list) if (r && typeof r === 'object' && typeof r.updated !== 'number') { const t = typeof r.t === 'number' ? r.t : typeof r.created === 'number' ? r.created : null; if (t !== null) { r.updated = t; filled++; } }
  if (out.format === 'cloudwalker-workspace') {
    if (out.workspace && typeof out.workspace === 'object') out.workspace.schemaVersion = WS_SCHEMA;
    if (out.progress) { if (out.progress.flags && !Array.isArray(out.progress.flags)) out.progress.flags = Object.keys(out.progress.flags); out.progress.flags = [...new Set(out.progress.flags || [])]; }
    out.userBank ||= { exams: [], questions: [] };
  }
  out.version = WS_SCHEMA; out.migratedFrom = from;
  notes.push(`Upgraded this file from version ${from} to version ${WS_SCHEMA}${filled ? ` (${filled} record timestamp${filled === 1 ? '' : 's'} copied into "updated")` : ''}.`);
  return { data: out, notes, from };
}

/* ---------- User-imported questions survive reloads too */
const _importBankP1 = importBank;
importBank = function (data) {
  const r = _importBankP1(data);
  try {
    const items = Array.isArray(data) ? data : data.questions;
    (items || []).forEach((q, i) => { if (q && q.id && S.bank.has(q.id) && !validateQuestion(q, i).length) S.userBank.questions[q.id] = q; });
    if (!Array.isArray(data) && Array.isArray(data.exams)) data.exams.forEach(e => { if (e && e.code && e.name) S.userBank.exams[e.code] = e; });
  } catch { /* the import itself already succeeded or reported its errors */ }
  persistSoon(SAVE_QUICK); return r;
};
function restoreUserBank(ub) {
  if (!ub) return;
  const exams = Array.isArray(ub.exams) ? ub.exams : Object.values(ub.exams || {}); const qs = Array.isArray(ub.questions) ? ub.questions : Object.values(ub.questions || {});
  if (exams.length || qs.length) importBank({ exams, questions: qs });
}

/* ---------- Workspace import: migrate first, then the existing merge-by-id */
const _smartImportP1 = smartImport;
smartImport = data => {
  const m = migrateWorkspace(data); const d = m.data;
  const r = _smartImportP1(d);
  if (d && d.format === 'cloudwalker-workspace' && d.userBank) { try { restoreUserBank(d.userBank); } catch (e) { (r.list ||= []).push('Imported questions in this file could not be loaded: ' + e.message); } }
  if (m.notes.length) r.body = `${m.notes.join(' ')} ${r.body || ''}`.trim();
  persistSoon(SAVE_QUICK); return r;
};

/* ---------- Apply a saved record (boot restore and daily-backup restore) */
function applyLocal(rec) {
  const d = migrateWorkspace(rec.format === 'cloudwalker-local' ? rec.data : rec).data;
  if (!d || !d.workspace || typeof d.workspace !== 'object') throw new Error('The saved data is not a CloudWalker workspace.');
  S.ws = d.workspace; ensureWs(); ensureWs4(); S.ws.glossary._v = (S.ws.glossary._v || 0) + 1;
  const p = d.progress || {};
  S.progress.answers = p.answers && typeof p.answers === 'object' ? p.answers : {};
  S.progress.flags = new Set(Array.isArray(p.flags) ? p.flags : []);
  S.progress.confidence = p.confidence && typeof p.confidence === 'object' ? p.confidence : {};
  S.progress.sessions = Array.isArray(p.sessions) ? p.sessions : [];
  S.drafts = { iq: {}, wb: {}, ...(d.drafts || {}) };
  if (d.userBank) restoreUserBank(d.userBank);
  if (rec.format === 'cloudwalker-local') {
    S.runner = rec.runner && Array.isArray(rec.runner.ids) && rec.runner.ids.every(id => S.bank.has(id)) ? { ...rec.runner, shownAt: Date.now() } : null;
    S.lastResult = rec.lastResult || null;
    const mt = rec.meta || {}; S.meta2.lastExport = mt.lastExport || null; S.meta2.lastImport = mt.lastImport || null; S.meta2.savedAt = mt.fileSavedAt || null; S.dirty = mt.dirty || 0; S.lastSaved = S.meta2.lastExport;
  }
  if (typeof srsRebuildMissing === 'function') srsRebuildMissing();
}

/* ---------- Save loop */
const dayKey = (t = Date.now()) => { const d = new Date(t); return `backup:${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`; };
function persistSoon(delay) {
  if (PERSIST.disabled || !persistOK() && PERSIST.status !== 'error') return;
  /* Debounced, but never postponed past SAVE_MAX_WAIT by a stream of renders or keystrokes. */
  const now = Date.now(); PERSIST.pendingSince ||= now;
  const wait = Math.max(0, Math.min(typeof delay === 'number' ? delay : SAVE_DEBOUNCE, SAVE_MAX_WAIT - (now - PERSIST.pendingSince)));
  clearTimeout(PERSIST.timer); PERSIST.timer = setTimeout(() => persistNow('auto'), wait);
}
async function persistNow(why) {
  clearTimeout(PERSIST.timer); PERSIST.timer = null; PERSIST.pendingSince = 0;
  if (PERSIST.disabled || !PERSIST.db || !['ok', 'saving', 'error'].includes(PERSIST.status)) return false;
  if (PERSIST.writing) { PERSIST.again = true; return false; }
  let json; try { json = JSON.stringify(localRecord()); } catch (e) { PERSIST.status = 'error'; PERSIST.reason = 'Your data could not be prepared for saving: ' + e.message; renderSavePill(); return false; }
  if (json === PERSIST.lastJson) { if (PERSIST.status === 'error') { PERSIST.status = 'ok'; renderSavePill(); } return true; }
  if (PERSIST.lastJson === null && json === PERSIST.pristine) return true; /* nothing to keep yet */
  PERSIST.writing = true; PERSIST.status = 'saving'; renderSavePill();
  try {
    await idbPut('state', { t: Date.now(), json });
    PERSIST.lastJson = json; PERSIST.savedAt = Date.now(); PERSIST.bytes = json.length; PERSIST.status = 'ok'; PERSIST.reason = '';
    const k = dayKey(); if (!PERSIST.backups.some(b => b.key === k) && json !== PERSIST.pristine) await writeBackup(k, json);
    try { PERSIST.chan?.postMessage({ type: 'saved', tab: PERSIST.tab, t: PERSIST.savedAt }); } catch { /* ignore */ }
    if (PERSIST.persisted === false && !PERSIST.askedPersist) requestPersist(false);
  } catch (e) {
    PERSIST.status = 'error'; PERSIST.reason = /quota/i.test(String(e && (e.name + e.message))) ? 'This device is out of storage space for the app.' : String(e && e.message || e);
  } finally { PERSIST.writing = false; renderSavePill(); const card = $('#p1card'); if (card && !card.contains(document.activeElement)) renderP1Card(); }
  if (PERSIST.again) { PERSIST.again = false; persistSoon(); }
  return PERSIST.status === 'ok';
}
async function writeBackup(key, json) {
  await idbPut(key, { t: Date.now(), json });
  PERSIST.backups = PERSIST.backups.filter(b => b.key !== key).concat([{ key, t: Date.now(), size: json.length }]).sort((a, b) => b.key.localeCompare(a.key));
  for (const old of PERSIST.backups.slice(BACKUP_KEEP)) { try { await idbDel(old.key); } catch { /* left for next time */ } }
  PERSIST.backups = PERSIST.backups.slice(0, BACKUP_KEEP);
}
async function loadBackupIndex() {
  const keys = (await idbKeys()).filter(k => typeof k === 'string' && k.startsWith('backup:')).sort().reverse();
  const list = [];
  for (const key of keys) { try { const v = await idbGet(key); if (v && typeof v.json === 'string') list.push({ key, t: v.t, size: v.json.length }); } catch { /* skip unreadable */ } }
  PERSIST.backups = list;
  for (const old of list.slice(BACKUP_KEEP)) { try { await idbDel(old.key); } catch { /* ignore */ } }
  PERSIST.backups = list.slice(0, BACKUP_KEEP);
}
async function requestPersist(fromUser) {
  PERSIST.askedPersist = true;
  try { if (navigator.storage?.persist) { PERSIST.persisted = await navigator.storage.persist(); try { await idbPut('meta:persistAsked', Date.now()); } catch { /* ignore */ } } else PERSIST.persisted = null; }
  catch { PERSIST.persisted = null; }
  if (fromUser) { await refreshEstimate(); showStatus(PERSIST.persisted ? 'The browser will keep this app\'s data unless you delete it.' : PERSIST.persisted === false ? 'The browser declined for now. Your work still saves; it may be cleared only if the device runs very low on space. Keep a workspace file as a backup.' : 'This browser does not offer protected storage. Your work still saves on this device.'); render(); }
}
async function refreshEstimate() {
  try { if (navigator.storage?.estimate) PERSIST.estimate = await navigator.storage.estimate(); } catch { PERSIST.estimate = null; }
  try { if (navigator.storage?.persisted) PERSIST.persisted = await navigator.storage.persisted(); } catch { /* keep last value */ }
}

/* ---------- Boot: open, restore, then let the normal boot render */
async function persistBoot() {
  PERSIST.tab = Math.random().toString(36).slice(2);
  try { PERSIST.pristine = JSON.stringify(localRecord()); } catch { PERSIST.pristine = null; }
  try { PERSIST.db = await idbOpen(); }
  catch (e) { PERSIST.status = 'blocked'; PERSIST.reason = e && e.message || 'Storage is blocked'; return; }
  PERSIST.status = 'restoring';
  try {
    const rec = await idbGet('state');
    try { PERSIST.askedPersist = !!(await idbGet('meta:persistAsked')); } catch { /* ignore */ }
    await loadBackupIndex();
    if (rec && typeof rec.json === 'string') {
      try { applyLocal(JSON.parse(rec.json)); PERSIST.lastJson = JSON.stringify(localRecord()); PERSIST.savedAt = rec.t || Date.now(); PERSIST.bytes = rec.json.length; PERSIST.restoredFrom = rec.t || null; }
      catch (e) {
        /* Corrupt current record: keep it aside, try the newest daily backup. */
        try { await idbPut('state:unreadable:' + Date.now(), rec); } catch { /* ignore */ }
        const b = PERSIST.backups[0]; let ok = false;
        if (b) { try { const v = await idbGet(b.key); applyLocal(JSON.parse(v.json)); ok = true; PERSIST.restoredFrom = v.t; S.p1notice = `Your last save could not be read, so the daily backup from ${humanTime(v.t)} was restored instead.`; } catch { /* fall through */ } }
        if (!ok) S.p1notice = 'Your last save on this device could not be read. If you have a workspace file, restore it from Settings.';
      }
      if (!PERSIST.backups.some(b => b.key === dayKey()) && PERSIST.lastJson && PERSIST.lastJson !== PERSIST.pristine) { try { await writeBackup(dayKey(), PERSIST.lastJson); } catch { /* not fatal */ } }
    }
    PERSIST.status = 'ok';
  } catch (e) { PERSIST.status = 'error'; PERSIST.reason = e && e.message || 'Saved data could not be read'; }
  refreshEstimate().then(() => { if (route().name === 'settings') renderP1Card(); });
  try { PERSIST.chan = new BroadcastChannel('cloudwalker'); PERSIST.chan.onmessage = ev => { if (ev.data?.type === 'saved' && ev.data.tab !== PERSIST.tab && Date.now() - PERSIST.otherTab > 600000) { PERSIST.otherTab = Date.now(); showStatus('CloudWalker is also open in another tab. Use one tab at a time, or the last tab to save wins.'); } }; } catch { /* optional */ }
}
function persistAfterBoot() {
  if (S.p1notice) { showStatus(S.p1notice); S.p1notice = null; }
  setInterval(renderSavePill, 30000);
  document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'hidden') persistNow('hidden'); });
  window.addEventListener('pagehide', () => { persistNow('pagehide'); });
  document.addEventListener('input', persistSoon, true);
  document.addEventListener('change', persistSoon, true);
  persistSoon();
}

/* ---------- Hooks: anything that changes data schedules a save */
const _markDirtyP1 = markDirty; markDirty = function () { _markDirtyP1(); persistSoon(); };
const _recordP1 = record; record = function (...a) { const r = _recordP1(...a); persistSoon(SAVE_QUICK); return r; };
const _afterRenderP1 = afterRender; afterRender = function () { _afterRenderP1(); persistSoon(); };
const _exportP1 = workspaceExport; workspaceExport = function () { _exportP1(); persistSoon(); };

/* ---------- An unfinished session (restored or left mid-way) is one tap away */
const _chromeP1 = chrome;
chrome = name => {
  const r = S.runner; const h = _chromeP1(name);
  if (!r || r.finished || r.readOnly || ['run', 'rs', 'menu', 'results'].includes(name)) return h;
  const done = Object.keys(r.resp || {}).length;
  return h + `<div class="save-banner resume-banner" role="status"><span><strong>Session in progress:</strong> ${esc(r.title || 'Practice session')}, ${done} of ${r.ids.length} answered${r.endAt ? `, ${fmtTime(Math.max(0, (r.endAt - Date.now()) / 1000))} left on the clock` : ''}.</span><a class="btn sm primary" href="#/run">Resume</a><button class="btn sm ghost" data-action="p1-run-discard">Discard</button></div>`;
};

/* ---------- Save pill: "Saved on this device · 2 min ago" or "Not saved — storage blocked" */
renderSavePill = function () {
  const st = PERSIST.status;
  $$('.save-pill').forEach(el => {
    el.hidden = st === 'init';
    el.classList.toggle('ok', st === 'ok' || st === 'saving' || st === 'restoring'); el.classList.toggle('saving', st === 'saving' || st === 'restoring'); el.classList.toggle('warn', st === 'blocked' || st === 'error');
    if (st === 'blocked' || st === 'error') {
      const msg = st === 'blocked' ? 'Not saved — storage blocked' : 'Not saved — ' + (/space/.test(PERSIST.reason) ? 'storage full' : 'save failed');
      el.innerHTML = `<span role="status" class="sp-long">${msg}</span><b class="sp-short" aria-hidden="true">Not saved</b><button class="btn sm primary" data-action="ws-export" aria-label="${msg}. Save workspace file">Save workspace</button>`;
    } else {
      const label = st === 'restoring' ? 'Restoring your work…' : st === 'saving' ? 'Saving on this device…' : PERSIST.savedAt ? `Saved on this device · ${ago(PERSIST.savedAt)}` : 'Saves automatically on this device';
      el.innerHTML = `<a class="sp-link" href="#/settings" aria-label="${label}. Open storage settings."><i class="sp-dot" aria-hidden="true"></i><span>${label}</span></a>`;
    }
  });
};

/* ---------- Settings: "Saved on this device" card */
const fmtBytes = n => n == null ? '—' : n < 1024 ? n + ' B' : n < 1048576 ? (n / 1024).toFixed(0) + ' KB' : n < 1073741824 ? (n / 1048576).toFixed(1) + ' MB' : (n / 1073741824).toFixed(1) + ' GB';
function p1CardHtml() {
  const st = PERSIST.status; const est = PERSIST.estimate;
  const chip = persistOK() ? '<span class="chip ok-chip">Autosave on</span>' : st === 'restoring' ? '<span class="chip">Restoring</span>' : '<span class="chip warn-chip">Not saving</span>';
  const prot = PERSIST.persisted === true ? 'Yes. The browser will not clear it on its own.' : PERSIST.persisted === false ? 'Not yet. The browser may clear it if the device runs very low on space.' : 'Not offered by this browser.';
  const backups = PERSIST.backups.length ? `<div class="list">${PERSIST.backups.map(b => `<div class="list-item"><div><strong>${esc(new Date(b.key.slice(7) + 'T12:00:00').toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' }))}</strong><div class="small muted">Taken ${humanTime(b.t)} · ${fmtBytes(b.size)}</div></div><div class="row"><button class="btn sm" data-action="p1-backup-restore" data-v="${esc(b.key)}">Restore</button><button class="btn sm ghost" data-action="p1-backup-download" data-v="${esc(b.key)}">Download</button></div></div>`).join('')}</div>` : '<p class="small muted">No daily backups yet. The first one is made the first time you save something today.</p>';
  const del = S.p1delArmed ? `<div class="danger-zone" role="group" aria-label="Confirm delete"><p><strong>This permanently deletes everything this app stored on this device:</strong> quiz history, review schedule, artifacts, imported questions, daily backups, and remembered preferences. Workspace files you downloaded are not touched.</p>
      <label for="p1DelType" class="small">Type DELETE to confirm</label><input id="p1DelType" type="text" autocomplete="off" autocapitalize="characters">
      <div class="row" style="margin-top:10px"><button class="btn danger" id="p1DelGo" data-action="p1-delete-do" disabled>Delete all my data on this device</button><button class="btn" data-action="p1-delete-cancel">Cancel</button></div></div>`
    : `<button class="btn danger" data-action="p1-delete-arm">Delete all my data on this device</button>`;
  return `<section class="card" id="p1card" style="margin-bottom:20px" aria-labelledby="h-p1"><div class="card-head"><h2 id="h-p1">Saved on this device</h2>${chip}</div>
    ${persistOK() ? `<p class="small muted" style="margin-bottom:12px">Everything you do is saved automatically in this browser on this device, about a second and a half after each change and whenever you switch away. Reopening the app brings it all back. Use <strong>Save workspace</strong> for a file backup or to move to another device.</p>`
      : `<div class="notice err" role="status" style="margin-bottom:12px"><strong>${st === 'blocked' ? 'This browser is blocking storage for the app.' : 'The last save on this device failed.'}</strong><p>${esc(String(PERSIST.reason || '').replace(/\.+$/, ''))}. Your work is only in this tab until you save a workspace file. ${st === 'blocked' ? 'Private browsing, strict privacy settings, or opening the file from some locations can cause this. Try a normal window, or host the file on any static web server.' : ''}</p><div class="row" style="margin-top:8px"><button class="btn primary" data-action="ws-export">Save workspace now</button>${st === 'error' ? '<button class="btn" data-action="p1-save-now">Try saving again</button>' : ''}</div></div>`}
    <dl class="dstat"><div><dt>Last saved here</dt><dd>${PERSIST.savedAt ? humanTime(PERSIST.savedAt) : 'Nothing saved yet'}</dd></div><div><dt>Saved data</dt><dd>${fmtBytes(PERSIST.bytes || null)}</dd></div><div><dt>Storage used by this site</dt><dd>${est && est.usage != null ? fmtBytes(est.usage) : '—'}</dd></div><div><dt>Available to this site</dt><dd>${est && est.quota ? 'about ' + fmtBytes(est.quota) : '—'}</dd></div></dl>
    <p class="small" style="margin:10px 0 6px"><strong>Protected from automatic cleanup:</strong> ${prot}</p>
    ${persistOK() && PERSIST.persisted !== true && navigator.storage?.persist ? '<div class="row" style="margin-bottom:12px"><button class="btn sm" data-action="p1-persist">Ask the browser to keep my data</button></div>' : ''}
    <h3 style="margin:14px 0 6px;font-size:1rem">Daily backups (last ${BACKUP_KEEP} days)</h3>
    <p class="small muted" style="margin-bottom:8px">One copy per day, taken the first time the app saves that day, so it holds your work as it was before that day's changes. Restoring takes an undo point first.</p>
    ${persistOK() ? backups : '<p class="small muted">Daily backups need on-device storage.</p>'}
    <div style="margin-top:16px">${del}</div>
    <p class="small muted" style="margin-top:12px">${APP_VERSION} · workspace schema ${WS_SCHEMA}</p>
  </section>`;
}
function renderP1Card() { const el = $('#p1card'); if (el) el.outerHTML = p1CardHtml(); }
const _settingsP1 = VIEWS.settings;
VIEWS.settings = arg => { const h = _settingsP1(arg); const i = h.indexOf('<section'); refreshEstimate().then(renderP1Card); return i < 0 ? h + p1CardHtml() : h.slice(0, i) + p1CardHtml() + h.slice(i); };

async function deleteAllLocal() {
  PERSIST.disabled = true; clearTimeout(PERSIST.timer);
  try { await idbTx('readwrite', st => st.clear()); } catch { /* deleteDatabase below still runs */ }
  try { PERSIST.db?.close(); } catch { /* ignore */ } PERSIST.db = null;
  try { forgetPrefs(); localStorage.removeItem(PREF_KEY); } catch { /* ignore */ }
  const done = await new Promise(res => { try { const rq = indexedDB.deleteDatabase(IDB_NAME); rq.onsuccess = () => res('ok'); rq.onerror = () => res('error'); rq.onblocked = () => res('blocked'); setTimeout(() => res('timeout'), 4000); } catch { res('error'); } });
  if (done === 'blocked') { showStatus('Your data was cleared, but the storage area is still open in another tab. Close other CloudWalker tabs to finish.'); }
  location.hash = '#/dashboard'; location.reload();
}
document.addEventListener('input', e => { if (e.target.id === 'p1DelType') { const b = $('#p1DelGo'); if (b) b.disabled = e.target.value.trim() !== 'DELETE'; } });
document.addEventListener('click', async e => {
  const b = e.target.closest('[data-action^="p1-"]'); if (!b) return; e.preventDefault(); const d = b.dataset;
  if (d.action === 'p1-delete-arm') { S.p1delArmed = true; renderP1Card(); $('#p1DelType')?.focus(); }
  if (d.action === 'p1-delete-cancel') { S.p1delArmed = false; renderP1Card(); }
  if (d.action === 'p1-delete-do') { if ($('#p1DelType')?.value.trim() === 'DELETE') { b.disabled = true; b.textContent = 'Deleting…'; await deleteAllLocal(); } }
  if (d.action === 'p1-persist') requestPersist(true);
  if (d.action === 'p1-run-discard') confirmModal('Discard this session?', 'Answers you already gave stay in your history. Only the unfinished session is closed.', 'Discard session', () => { S.runner = null; render(); persistSoon(); showStatus('Session discarded.'); });
  if (d.action === 'p1-save-now') { PERSIST.status = 'error'; const ok = await persistNow('manual'); showStatus(ok ? 'Saved on this device.' : 'Saving still fails: ' + PERSIST.reason); render(); }
  if (d.action === 'p1-backup-download' || d.action === 'p1-backup-restore') {
    let v; try { v = await idbGet(d.v); } catch (err) { showStatus('That backup could not be read: ' + err.message); return; }
    if (!v || typeof v.json !== 'string') { showStatus('That backup is no longer on this device.'); return; }
    const rec = JSON.parse(v.json);
    if (d.action === 'p1-backup-download') { download(`cloudwalker-workspace-${d.v.slice(7)}.json`, { ...migrateWorkspace(rec.data).data, exported_at: new Date(v.t).toISOString() }); showStatus('Backup downloaded as a workspace file.'); return; }
    confirmModal(`Restore the backup from ${d.v.slice(7)}?`, 'Your current work is replaced by this backup. An undo point is taken first, so you can go back from Data status until you close the tab.', 'Restore backup', () => {
      const sid = snapshot('Before restoring a daily backup');
      try { applyLocal(rec); render(); persistNow('restore'); showStatus(`Restored the daily backup from ${humanTime(v.t)}.`, sid); }
      catch (err) { showStatus('That backup could not be restored: ' + err.message); }
    });
  }
});


