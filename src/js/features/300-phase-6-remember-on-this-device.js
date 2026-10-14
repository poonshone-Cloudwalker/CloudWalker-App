/* ================================================================== Phase 6: remember on this device
 * One localStorage key holds a few
 * per-device preferences: focus certification, theme, and the last study area.
 * Progress, review schedule, and artifacts are not stored here; V09 Phase 1 saves
 * them in IndexedDB. Every access is wrapped in try/catch, so a browser that
 * blocks storage just falls back to the old behavior. Users can turn it off in
 * Settings, which deletes the stored entry and keeps only an "off" flag.
 */
const PREF_KEY = 'cloudwalker.prefs.v1';
let PREFS = { remember: true }; let PREF_OK = null;
function prefStore() {
  if (PREF_OK === false) return null;
  try { const k = '__cw_probe'; localStorage.setItem(k, '1'); localStorage.removeItem(k); PREF_OK = true; return localStorage; }
  catch { PREF_OK = false; return null; }
}
function loadPrefs() { const st = prefStore(); if (!st) return; try { const p = JSON.parse(st.getItem(PREF_KEY) || 'null'); if (p && typeof p === 'object' && !Array.isArray(p)) PREFS = { remember: true, ...p }; } catch { /* corrupt entry: ignore */ } }
const examLabel = code => { const e = examMetaFor(code); return e ? e.name.replace(/^(Google Cloud|Microsoft Azure|AWS Certified|CompTIA)\s+/, '').replace(/\s*\([^)]*\)\s*$/, '') : code; };
const FOCUS_VIEWS = { study: 'Study', exam: 'Exam mode', retention: 'Daily review', review: 'Review', library: 'Question library', analytics: 'Analytics', glossary: 'Glossary', exams: 'Exams', certify: 'Certification overview' };
function lastAreaNow() {
  const r = route(); const fx = focusExam(); const nav = k => (NAV.find(n => n[0] === k) || [])[1] || k;
  if (FOCUS_VIEWS[r.name] && !(r.name === 'glossary' && r.arg.startsWith('term/'))) return { label: `${examLabel(fx)} · ${FOCUS_VIEWS[r.name]}`, href: '#/' + r.name, exam: fx };
  if (r.name === 'lab' && r.arg && LAB_SCENARIOS.some(s => s.id === r.arg)) return { label: 'Lab: ' + LAB_SCENARIOS.find(s => s.id === r.arg).title, href: '#/lab/' + r.arg };
  if (['lab', 'adr', 'portfolio', 'outputs'].includes(r.name)) return { label: nav(r.name), href: '#/' + r.name };
  if (r.name === 'interview') { const t = (r.arg || 'practice').split('/')[0]; const map = { story: 'stories', q: 'practice', ex: 'exec', wb: 'whiteboard' }; const tab = map[t] || t; return { label: 'Interview arena', href: '#/interview/' + tab }; }
  if (r.name === 'career') return { label: 'Career command', href: '#/career/' + (r.arg || 'plan') };
  return null;
}
function savePrefs() {
  if (!PREFS.remember) return; const st = prefStore(); if (!st) return;
  const a = lastAreaNow();
  PREFS = { ...PREFS, remember: true, focusExam: S.ws.career.profile.focusExam || '', theme: S.ui.theme, ...(a ? { last: { ...a, t: Date.now() } } : {}), savedAt: Date.now() };
  try { st.setItem(PREF_KEY, JSON.stringify(PREFS)); } catch { /* quota or blocked: ignore */ }
}
function setRemember(on) {
  const st = prefStore(); if (!st) return;
  if (on) { PREFS = { remember: true }; savePrefs(); }
  else { PREFS = { remember: false }; try { st.setItem(PREF_KEY, JSON.stringify(PREFS)); } catch { } }
}
function forgetPrefs() { const st = prefStore(); if (!st) return; try { st.removeItem(PREF_KEY); } catch { } PREFS = { remember: true }; }
function applyFocusDefaults(code) {
  if (!code) return;
  S.ui.study = { ...(S.ui.study || { mode: 'learn', vendor: '', service: '', tag: '', include: 'all', count: 20, order: 'random' }), exam: code, domain: '', subdomain: '' };
  S.ui.exam = { ...(S.ui.exam || { count: 50, minutes: 90, diffs: ['easy', 'medium', 'hard'], reveal: 'end' }), exam: code };
  S.ui.review = { ...S.ui.review, exam: code, domain: '', subdomain: '' };
  S.p3.rsExam = code;
}
function prefsBoot() {
  loadPrefs();
  if (!PREFS.remember) return;
  if (PREFS.theme === 'light' || PREFS.theme === 'dark') S.ui.theme = PREFS.theme;
  if (PREFS.focusExam && examMetaFor(PREFS.focusExam)) S.ws.career.profile.focusExam = PREFS.focusExam;
  applyFocusDefaults(focusExam());
  if (PREFS.last && PREFS.last.href && !S.ws.trail.study) S.ws.trail.study = { label: PREFS.last.label, href: PREFS.last.href, t: PREFS.last.t || PREFS.savedAt || Date.now() };
}
/* Save after every render, so the focus, theme and last area are always current. */
const _afterRender6 = afterRender;
afterRender = function () { _afterRender6(); savePrefs(); };
/* A workspace restore keeps the focus you chose on this device. */
const _smartImport6 = smartImport;
smartImport = data => { const r = _smartImport6(data); if (PREFS.remember && PREFS.focusExam && examMetaFor(PREFS.focusExam)) S.ws.career.profile.focusExam = PREFS.focusExam; return r; };

/* ---------- Dashboard: quick focus switcher + restore hint on a fresh open */
const _dash6 = VIEWS.dashboard;
VIEWS.dashboard = arg => {
  let h = _dash6(arg);
  const sel = `<label class="sr-only" for="focusQuick">Focus certification</label><select id="focusQuick" class="focus-quick">${opts(activeExams().map(e => [e.code, `${e.code} · ${examLabel(e.code)}`]), S.ws.career.profile.focusExam || '', 'Most practiced')}</select>`;
  h = h.replace(/Focus certification: <strong>[^<]*<\/strong> <a href="#\/career\/profile">change<\/a>/, `<span class="focus-row">Focus certification: ${sel}</span>`);
  const fresh = !Object.keys(S.progress.answers).length && !S.meta2.lastImport && (PREFS.savedAt || PREFS.last) && !PERSIST.restoredFrom;
  if (fresh) {
    const i = h.indexOf('class="continue-card"'); const j = i < 0 ? -1 : h.indexOf('</section>', i);
    if (j > 0) h = h.slice(0, j + 10) + `<div class="restore-hint" role="note"><span>${persistOK() ? 'Nothing is saved on this device yet. If you have a workspace file from another device or an older version, restore it to bring back your answers, review schedule and artifacts.' : 'Your focus and last study area are remembered on this device. To bring back your answers, review schedule and artifacts, restore your workspace file.'}</span><button class="btn sm" data-action="ws-import">Restore workspace (.json)</button></div>` + h.slice(j + 10);
  }
  return h;
};

/* ---------- Settings: on/off switch and plain explanation */
const _settings6 = VIEWS.settings;
VIEWS.settings = arg => {
  const h = _settings6(arg); prefStore();
  const st = PREF_OK === false ? '<span class="chip warn-chip">Unavailable in this browser</span>' : PREFS.remember ? '<span class="chip ok-chip">On</span>' : '<span class="chip">Off</span>';
  const card = `<section class="card" style="margin-bottom:20px" aria-labelledby="h-rem"><div class="card-head"><h2 id="h-rem">Remember on this device</h2>${st}</div>
    <p class="small muted" style="margin-bottom:12px">Keeps three things in this browser so the app opens where you left off: your focus certification${S.ws.career.profile.focusExam ? ` (now ${esc(S.ws.career.profile.focusExam)})` : ''}, light or dark theme, and the last study area. Your answers, review schedule and artifacts are saved separately; see Saved on this device.</p>
    ${PREF_OK === false ? '<p class="small">This browser is blocking storage for this file, so preferences can\'t be remembered here. Restoring your workspace file still brings your focus back.</p>'
      : `<div class="row"><button class="btn ${PREFS.remember ? '' : 'primary'}" data-action="x6-remember" data-v="${PREFS.remember ? 'off' : 'on'}">${PREFS.remember ? 'Turn off and forget' : 'Turn on'}</button>${PREFS.remember ? '<button class="btn ghost" data-action="x6-forget">Forget saved preferences</button>' : ''}</div>`}</section>`;
  const i = h.indexOf('<section'); return i < 0 ? h + card : h.slice(0, i) + card + h.slice(i);
};

document.addEventListener('change', e => {
  const el = e.target;
  if (el.id === 'focusQuick' || el.id === 'pr-focus') {
    S.ws.career.profile.focusExam = el.value; applyFocusDefaults(el.value || focusExam()); savePrefs();
    if (el.id === 'focusQuick') { markDirty(); render(); $('#focusQuick')?.focus(); showStatus(el.value ? `Focus set to ${examLabel(el.value)}. Study, Exam mode, Review and Daily review now start there.` : 'Focus follows your most practiced certification.'); }
  }
});
document.addEventListener('click', e => {
  const b = e.target.closest('[data-action]'); if (!b) return; const d = b.dataset;
  if (d.action === 'x6-remember') { e.preventDefault(); setRemember(d.v === 'on'); render(); showStatus(d.v === 'on' ? 'The app will remember your focus and last study area on this device.' : 'Stopped remembering. Saved preferences were deleted from this device.'); }
  if (d.action === 'x6-forget') { e.preventDefault(); forgetPrefs(); render(); showStatus('Saved preferences were cleared. Your current choices will be saved again as you study.'); }
});


