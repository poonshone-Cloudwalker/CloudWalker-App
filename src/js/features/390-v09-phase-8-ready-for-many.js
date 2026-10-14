/* ================================================================== V09 Phase 8: ready for many users
 * Sync: every view keeps reading and writing S.ws. Moving data to and from a server goes through one
 * SyncAdapter. This build ships LocalOnlyAdapter (active: data stays on this device) and a stubbed
 * RemoteAdapter (documented request shapes, every call reports "not configured"). The sync layer turns
 * S.ws into table-per-entity change records {table, id, updatedAt, deletedAt, data} and merges incoming
 * records last-write-wins by permanent id, the same rule smartImport uses for files.
 *
 * Content pipeline: versioned content packs (questions, lessons, labs, exam profiles) with a SHA-256
 * checksum over the canonical JSON of "content". "Check for content update" loads a pack from a URL or
 * a file, previews the diff by id (added / changed / retired / rejected), and merges only on request.
 * Contributors get CSV and JSON templates, a validation report, and a pack builder.
 * Rules carried through: exam facts must cite sourceUrl and lastVerified, and unverified values must be
 * null; new practice content is generated-practice and arrives as draft unless a reviewed date is given;
 * ids are never renumbered; owner edits on this device still apply on top of pack content. */

/* ---------- Canonical JSON and SHA-256 (pure JS, so it also works from file://) */
function canon(v) { if (Array.isArray(v)) return v.map(canon); if (v && typeof v === 'object') { const o = {}; for (const k of Object.keys(v).sort()) if (v[k] !== undefined) o[k] = canon(v[k]); return o; } return v; }
const canonStr = v => JSON.stringify(canon(v));
function sha256(str) {
  const K = [0x428a2f98, 0x71374491, 0xb5c0fbcf, 0xe9b5dba5, 0x3956c25b, 0x59f111f1, 0x923f82a4, 0xab1c5ed5, 0xd807aa98, 0x12835b01, 0x243185be, 0x550c7dc3, 0x72be5d74, 0x80deb1fe, 0x9bdc06a7, 0xc19bf174, 0xe49b69c1, 0xefbe4786, 0x0fc19dc6, 0x240ca1cc, 0x2de92c6f, 0x4a7484aa, 0x5cb0a9dc, 0x76f988da, 0x983e5152, 0xa831c66d, 0xb00327c8, 0xbf597fc7, 0xc6e00bf3, 0xd5a79147, 0x06ca6351, 0x14292967, 0x27b70a85, 0x2e1b2138, 0x4d2c6dfc, 0x53380d13, 0x650a7354, 0x766a0abb, 0x81c2c92e, 0x92722c85, 0xa2bfe8a1, 0xa81a664b, 0xc24b8b70, 0xc76c51a3, 0xd192e819, 0xd6990624, 0xf40e3585, 0x106aa070, 0x19a4c116, 0x1e376c08, 0x2748774c, 0x34b0bcb5, 0x391c0cb3, 0x4ed8aa4a, 0x5b9cca4f, 0x682e6ff3, 0x748f82ee, 0x78a5636f, 0x84c87814, 0x8cc70208, 0x90befffa, 0xa4506ceb, 0xbef9a3f7, 0xc67178f2];
  const bytes = new TextEncoder().encode(str); const l = bytes.length; const nBlocks = ((l + 9 + 63) >> 6); const m = new Uint8Array(nBlocks * 64); m.set(bytes); m[l] = 0x80;
  const bits = l * 8; const dv = new DataView(m.buffer); dv.setUint32(m.length - 4, bits >>> 0); dv.setUint32(m.length - 8, Math.floor(bits / 4294967296));
  let h = [0x6a09e667, 0xbb67ae85, 0x3c6ef372, 0xa54ff53a, 0x510e527f, 0x9b05688c, 0x1f83d9ab, 0x5be0cd19]; const w = new Uint32Array(64); const r = (x, n) => (x >>> n) | (x << (32 - n));
  for (let b = 0; b < nBlocks; b++) {
    for (let i = 0; i < 16; i++) w[i] = dv.getUint32(b * 64 + i * 4);
    for (let i = 16; i < 64; i++) { const s0 = r(w[i - 15], 7) ^ r(w[i - 15], 18) ^ (w[i - 15] >>> 3); const s1 = r(w[i - 2], 17) ^ r(w[i - 2], 19) ^ (w[i - 2] >>> 10); w[i] = (w[i - 16] + s0 + w[i - 7] + s1) | 0; }
    let [a, bb, c, d, e, f, g, hh] = h;
    for (let i = 0; i < 64; i++) { const S1 = r(e, 6) ^ r(e, 11) ^ r(e, 25); const ch = (e & f) ^ (~e & g); const t1 = (hh + S1 + ch + K[i] + w[i]) | 0; const S0 = r(a, 2) ^ r(a, 13) ^ r(a, 22); const mj = (a & bb) ^ (a & c) ^ (bb & c); const t2 = (S0 + mj) | 0; hh = g; g = f; f = e; e = (d + t1) | 0; d = c; c = bb; bb = a; a = (t1 + t2) | 0; }
    h = [h[0] + a, h[1] + bb, h[2] + c, h[3] + d, h[4] + e, h[5] + f, h[6] + g, h[7] + hh].map(x => x | 0);
  }
  return h.map(x => (x >>> 0).toString(16).padStart(8, '0')).join('');
}
const packChecksum = content => sha256(canonStr(content));

/* ---------- Sync: entity registry (table per entity, mirroring S.ws) */
const ts = x => (x && (x.updated || x.updatedAt || x.t || x.created || x.last)) || 0;
const SYNC_ENTITIES = [
  ['adrs', 'list', () => S.ws.adrs], ['portfolio_entries', 'list', () => S.ws.portfolio], ['lab_attempts', 'list', () => S.ws.labs],
  ['lab_drafts', 'map', () => S.ws.labDrafts], ['interview_answers', 'list', () => S.ws.interview.answers], ['star_stories', 'list', () => S.ws.interview.stories],
  ['whiteboard_sessions', 'list', () => S.ws.interview.boards], ['exec_summaries', 'list', () => S.ws.interview.exec], ['target_roles', 'list', () => S.ws.career.roles],
  ['milestones', 'list', () => S.ws.career.milestones], ['job_applications', 'list', () => S.ws.career.apps], ['career_weeks', 'map', () => S.ws.career.weeks],
  ['profile', 'single', () => S.ws.career.profile, v => { S.ws.career.profile = v; }], ['srs_cards', 'map', () => S.ws.srs], ['recall_log', 'log', () => S.ws.recallLog, x => `${x.id}@${x.t}`],
  ['career_outputs', 'list', () => S.ws.outputs], ['reflections', 'list', () => S.ws.reflections], ['glossary_terms', 'list', () => S.ws.glossary.terms],
  ['cross_cloud_rows', 'list', () => S.ws.glossary.cross_cloud, x => x.function], ['content_reports', 'list', () => S.ws.reports], ['content_edits', 'map', () => S.ws.contentEdits],
  ['study_plan', 'single', () => S.ws.plan || null, v => { S.ws.plan = v; }], ['lesson_progress', 'map', () => (S.ws.lessons ||= {})], ['lesson_reviews', 'map', () => (S.ws.lessonReview ||= {})],
  ['ai_feedback', 'map', () => (S.ws.aiFeedback ||= {})], ['calibration_log', 'log', () => (S.ws.calibLog ||= []), x => `${x.key}@${x.t}`], ['exam_outcomes', 'list', () => (S.ws.outcomes ||= [])],
  ['readiness_snapshots', 'log', () => (S.ws.readinessLog ||= []), x => `${x.d}|${x.code}`], ['habit_settings', 'single', () => { const h = HB(); return { goal: h.goal, remind: { ...h.remind, on: false }, startedAt: h.startedAt, updated: Math.max(h.goal.updated || 0, h.remind.updated || 0) }; }, v => { const h = HB(); if (v.goal) h.goal = v.goal; if (v.remind) h.remind = { ...v.remind, on: h.remind.on }; if (v.startedAt) h.startedAt = Math.min(h.startedAt, v.startedAt); }],
  ['habit_days', 'map', () => HB().days], ['week_notes', 'map', () => HB().weekNotes], ['installed_packs', 'list', () => (S.ws.packs ||= []), x => x.packId],
  ['answer_events', 'answers'], ['question_flags', 'flags'], ['confidence_ratings', 'conf'], ['study_sessions', 'list', () => S.progress.sessions]
].map(([table, kind, get, a, b]) => ({ table, kind, get, set: kind === 'single' ? a : null, key: kind === 'single' ? null : (a || (x => x.id)), }));
function collectChanges(since = 0) {
  const out = []; const add = (table, id, updatedAt, data) => { if (updatedAt > since || !since) out.push({ table, id: String(id), updatedAt: updatedAt || 0, deletedAt: null, data }); };
  for (const e of SYNC_ENTITIES) {
    if (e.kind === 'answers') { for (const [qid, arr] of Object.entries(S.progress.answers)) for (const a of arr) add(e.table, `${qid}@${a.t}`, a.t, { qid, ...a }); continue; }
    if (e.kind === 'flags') { for (const id of S.progress.flags) add(e.table, id, 0, { qid: id }); continue; }
    if (e.kind === 'conf') { for (const [id, c] of Object.entries(S.progress.confidence)) add(e.table, id, lastAttempt(id)?.t || 0, { qid: id, level: c }); continue; }
    const c = e.get(); if (!c) continue;
    if (e.kind === 'single') add(e.table, 'me', ts(c), c);
    else if (e.kind === 'map') for (const [k, v] of Object.entries(c)) add(e.table, k, ts(v), v);
    else for (const x of c) if (x) add(e.table, e.key(x), ts(x), x);
  }
  return out;
}
/* Last write wins by permanent id. A record changed on both sides since the last sync is a conflict:
 * the newer copy is applied and the other copy is kept in S.ws.syncConflicts for the person to review. */
function applyChanges(changes, lastSyncAt = 0) {
  const res = { applied: 0, skipped: 0, conflicts: 0, unknown: 0 }; const conf = (S.ws.syncConflicts ||= []);
  for (const ch of changes || []) {
    const e = SYNC_ENTITIES.find(x => x.table === ch.table); if (!e || !ch.id) { res.unknown++; continue; }
    if (['answers', 'flags', 'conf'].includes(e.kind)) {
      if (e.kind === 'answers' && ch.data && !ch.deletedAt) { const arr = (S.progress.answers[ch.data.qid] ||= []); if (!arr.some(a => a.t === ch.data.t)) { const { qid, ...a } = ch.data; arr.push(a); arr.sort((x, y) => x.t - y.t); res.applied++; } else res.skipped++; }
      else if (e.kind === 'flags') { ch.deletedAt ? S.progress.flags.delete(ch.id) : S.progress.flags.add(ch.id); res.applied++; }
      else if (e.kind === 'conf' && ch.data) { S.progress.confidence[ch.id] = ch.data.level; res.applied++; }
      continue;
    }
    let local = null, idx = -1; const c = e.get();
    if (e.kind === 'single') local = c; else if (e.kind === 'map') local = c[ch.id]; else { idx = c.findIndex(x => x && String(e.key(x)) === ch.id); local = idx >= 0 ? c[idx] : null; }
    const lt = ts(local); const rt = ch.deletedAt || ch.updatedAt || 0;
    if (local && lt > lastSyncAt && rt > lastSyncAt && lt !== rt && canonStr(local) !== canonStr(ch.data)) { conf.push({ table: ch.table, id: ch.id, at: Date.now(), mine: local, theirs: ch.data, theirsDeleted: !!ch.deletedAt, kept: rt > lt ? 'theirs' : 'mine' }); res.conflicts++; }
    if (local && rt <= lt) { res.skipped++; continue; }
    if (e.kind === 'log') { if (!local && !ch.deletedAt) { c.push(ch.data); res.applied++; } continue; }
    if (ch.deletedAt) { if (e.kind === 'map') delete c[ch.id]; else if (idx >= 0) c.splice(idx, 1); res.applied++; continue; }
    if (e.kind === 'single') e.set(ch.data); else if (e.kind === 'map') c[ch.id] = ch.data; else if (idx >= 0) c[idx] = ch.data; else c.push(ch.data);
    res.applied++;
  }
  if (res.applied) markDirty();
  return res;
}

/* ---------- SyncAdapter interface
 * interface SyncAdapter {
 *   id: string; label: string;
 *   status(): { state: 'local'|'not-configured'|'signed-out'|'idle'|'syncing'|'error', detail: string }
 *   signIn(email): Promise<{ ok, detail }>          // email magic link
 *   signOut(): Promise<void>
 *   push(changes: ChangeRecord[]): Promise<{ accepted: number, conflicts: ChangeRecord[] }>
 *   pull(since: number): Promise<{ changes: ChangeRecord[], serverTime: number }>
 *   exportAll(): Promise<object>                    // full copy of the person's data
 *   deleteAll(): Promise<{ ok, detail }>            // erase the person's data on the server
 * }
 * ChangeRecord = { table, id, updatedAt, deletedAt|null, data } */
class LocalOnlyAdapter {
  constructor() { this.id = 'local'; this.label = 'This device only'; }
  status() { return { state: 'local', detail: 'Your data is saved in this browser on this device. Nothing is uploaded. Use Save workspace to move it.' }; }
  async signIn() { return { ok: false, detail: 'Accounts are not part of this version.' }; }
  async signOut() { }
  async push(changes) { return { accepted: 0, conflicts: [], kept: changes.length }; }
  async pull() { return { changes: [], serverTime: Date.now() }; }
  async exportAll() { return workspaceV4(true); }
  async deleteAll() { return { ok: true, detail: 'There is no server copy. Use "Delete all my data" in Settings to erase this device.' }; }
}
class RemoteAdapter {
  /* Stub. A backend implements these HTTPS endpoints (see the sync spec):
   *   POST {base}/auth/magic-link {email}            → 204, emails a one-time link
   *   POST {base}/auth/session {token}               → {accessToken, userId, expiresAt}
   *   GET  {base}/sync/changes?since=<ms>            → {changes: ChangeRecord[], serverTime}
   *   POST {base}/sync/changes {changes}             → {accepted, conflicts: ChangeRecord[]}
   *   GET  {base}/me/export                          → full JSON export
   *   DELETE {base}/me                               → erases the account and all rows
   * Every call sends Authorization: Bearer <accessToken>. Nothing here makes a network call yet. */
  constructor(cfg = {}) { this.id = 'remote'; this.label = 'Cloud sync'; this.cfg = cfg; }
  status() { return { state: 'not-configured', detail: 'Cloud sync is not available in this version. The adapter is a placeholder so a backend can be added without changing any screen.' }; }
  #no() { return Promise.reject(new Error('Cloud sync is not configured in this version.')); }
  signIn() { return this.#no(); } signOut() { return Promise.resolve(); } push() { return this.#no(); } pull() { return this.#no(); } exportAll() { return this.#no(); } deleteAll() { return this.#no(); }
}
const SYNC = { adapters: { local: new LocalOnlyAdapter(), remote: new RemoteAdapter() }, active: null, lastSyncAt: 0 };
SYNC.active = SYNC.adapters.local;
async function syncNow() {
  const a = SYNC.active; const since = S.ws.syncState?.lastSyncAt || 0;
  const pushed = await a.push(collectChanges(since)); const pulled = await a.pull(since); const res = applyChanges(pulled.changes, since);
  S.ws.syncState = { adapter: a.id, lastSyncAt: pulled.serverTime }; return { pushed, res };
}
/* Read-only hook for integrators and tests. Views never call adapters directly. */
window.CloudWalker = Object.freeze({ sync: Object.freeze({ collectChanges, applyChanges, syncNow, adapters: SYNC.adapters, get active() { return SYNC.active; }, tables: SYNC_ENTITIES.map(e => e.table) }), packChecksum, canonStr, sha256 });

function syncCard() {
  const st = SYNC.active.status(); const counts = {}; for (const c of collectChanges(0)) counts[c.table] = (counts[c.table] || 0) + 1;
  const rows = Object.entries(counts).sort((a, b) => b[1] - a[1]); const conf = (S.ws.syncConflicts || []);
  return `<section class="card" style="margin-bottom:20px" aria-labelledby="h-sync"><div class="card-head"><h2 id="h-sync">Sync</h2><span class="chip">${esc(SYNC.active.label)}</span></div>
    <p class="small">${esc(st.detail)}</p>
    <details style="margin-top:8px"><summary class="small">What would sync if accounts are added (${rows.reduce((s, [, n]) => s + n, 0)} records in ${rows.length} tables)</summary>
      <div class="cmp-wrap" style="margin-top:8px"><table><thead><tr><th scope="col">Table</th><th scope="col" class="num">Records</th></tr></thead><tbody>${rows.map(([t, n]) => `<tr><td><code>${esc(t)}</code></td><td class="num">${n}</td></tr>`).join('')}</tbody></table></div>
      <p class="small muted" style="margin-top:6px">Your AI key, reminders permission, and this device's settings are never part of sync.</p></details>
    ${conf.length ? `<h3 style="margin-top:12px">Conflicts to review (${conf.length})</h3><div class="list">${conf.map((c, i) => `<div class="list-item"><div><strong>${esc(c.table)}</strong> · ${esc(c.id)} <span class="small muted">changed on two devices; the newer copy (${c.kept === 'theirs' ? 'other device' : 'this device'}) is in use</span></div><div class="row"><button class="btn sm" data-action="p8-conf" data-i="${i}" data-v="mine">Use this device's copy</button><button class="btn sm" data-action="p8-conf" data-i="${i}" data-v="theirs">Use the other copy</button></div></div>`).join('')}</div>` : ''}</section>`;
}
const _settingsP8 = VIEWS.settings;
VIEWS.settings = arg => { const h = _settingsP8(arg); const i = h.indexOf('<section', h.indexOf('<section') + 1); return i < 0 ? h + syncCard() : h.slice(0, i) + syncCard() + h.slice(i); };

/* ---------- Content packs: validation */
const PACK_FORMAT = 'cloudwalker-content-pack';
const isoD = s => typeof s === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(s);
const vcmp = (a, b) => { const x = String(a).split(/[.-]/).map(n => parseInt(n, 10) || 0), y = String(b).split(/[.-]/).map(n => parseInt(n, 10) || 0); for (let i = 0; i < Math.max(x.length, y.length); i++) { const d = (x[i] || 0) - (y[i] || 0); if (d) return d; } return 0; };
const PROFILE_FACTS = ['questions', 'durationMin', 'passScore', 'priceUSD'];
function validateProfile(code, p) {
  const e = [], w = [];
  if (!/^[A-Za-z0-9][A-Za-z0-9-]{1,20}$/.test(code)) e.push('exam code must be letters, digits, and hyphens');
  if (!p || typeof p !== 'object') return { e: ['not an object'], w };
  if (typeof p.name !== 'string' || !p.name.trim()) e.push('missing "name"');
  if (!safeUrl(p.sourceUrl)) e.push('"sourceUrl" must be an https link to the official exam page');
  if (!isoD(p.lastVerified)) e.push('"lastVerified" must be an ISO date (YYYY-MM-DD)');
  if (typeof p.verified !== 'boolean') e.push('"verified" must be true or false');
  for (const k of PROFILE_FACTS) if (p[k] != null && (typeof p[k] !== 'number' || p[k] < 0)) e.push(`"${k}" must be a number or null`);
  if (p.verified === false) { for (const k of PROFILE_FACTS) if (p[k] != null) e.push(`"${k}" must be null when verified is false (do not guess)`); if (Array.isArray(p.domains) && p.domains.some(d => d[1] != null)) e.push('domain weights must be null when verified is false'); }
  if (p.domains !== undefined && !(Array.isArray(p.domains) && p.domains.every(d => Array.isArray(d) && typeof d[0] === 'string' && (d[1] == null || typeof d[1] === 'number')))) e.push('"domains" must be [[name, weight or null], …]');
  if (isoD(p.lastVerified) && Date.now() - parseISO(p.lastVerified) > 180 * DAY) w.push('lastVerified is more than 6 months old');
  return { e, w };
}
function validatePackQuestion(q, i, ctx) {
  const e = validateQuestion(q, i).map(x => x.replace(/^[^:]+: /, '')); const w = [];
  if (q && typeof q === 'object') {
    const known = ctx.examCodes.has(q.exam_code);
    if (!known) e.push(`exam_code "${q.exam_code}" is not in the app or in this pack's exams`);
    if (!['generated-practice', 'user-imported', 'reserve'].includes(q.origin)) e.push('"origin" must be generated-practice or user-imported');
    if (q.origin === 'reserve' && !(Q(q.id)?.origin === 'reserve')) e.push('only existing built-in questions can keep origin "reserve"');
    if (!REVIEW_STATUS.includes(q.reviewStatus)) e.push('"reviewStatus" must be draft, needs-review, approved, or retired');
    if (q.reviewStatus === 'approved' && !isoD(q.lastReviewed)) e.push('approved items need "lastReviewed" (YYYY-MM-DD), the day a person reviewed them');
    if (q.origin === 'generated-practice' && q.reviewStatus === 'approved' && !q.reviewedBy) w.push('approved generated-practice item has no "reviewedBy"');
    if (!String(q.correct_rationale || '').trim()) w.push('no correct-answer rationale; it will show as missing and go to Needs review');
    if (q.docLinks !== undefined && !(Array.isArray(q.docLinks) && q.docLinks.every(l => l && safeUrl(l.url) && String(l.title || '').trim()))) e.push('"docLinks" must be [{title, url (https)}]');
    if (q.optionRationales != null && !(Array.isArray(q.optionRationales) && Array.isArray(q.options) && q.optionRationales.length === q.options.length)) e.push('"optionRationales" must have one entry per option');
  }
  return { e: uniq(e), w };
}
function validateLesson(l) {
  const e = [], w = [];
  if (!l || typeof l !== 'object') return { e: ['not an object'], w };
  if (!/^[a-z0-9][a-z0-9-]{2,60}$/.test(l.id || '')) e.push('"id" must be lowercase letters, digits, and hyphens');
  for (const k of ['exam', 'domain', 'title']) if (typeof l[k] !== 'string' || !l[k].trim()) e.push(`missing "${k}"`);
  if (!Array.isArray(l.body) || !l.body.length || l.body.some(p => typeof p !== 'string' || !p.trim())) e.push('"body" must be a list of paragraphs');
  else { const n = l.body.join(' ').split(/\s+/).length; if (n < 150 || n > 300) w.push(`explainer is ${n} words; the guideline is 150–300`); }
  if (!Array.isArray(l.decisions) || l.decisions.some(d => !Array.isArray(d) || d.length !== 3 || d.some(x => typeof x !== 'string'))) e.push('"decisions" must be [[situation, choose, rather than], …]');
  if (!Array.isArray(l.traps) || l.traps.some(t => typeof t !== 'string')) e.push('"traps" must be a list of text');
  if (l.links !== undefined && !(Array.isArray(l.links) && l.links.every(x => (typeof x === 'string' && DOCS[x]) || (x && safeUrl(x.url) && String(x.title || '').trim())))) e.push('"links" must be [{title, url (https)}]');
  if (l.origin !== 'generated-practice') e.push('"origin" must be generated-practice');
  if (!REVIEW_STATUS.includes(l.reviewStatus)) e.push('"reviewStatus" must be draft, needs-review, approved, or retired');
  return { e, w };
}
function validateLab(s) {
  const e = [], w = [];
  if (!s || typeof s !== 'object') return { e: ['not an object'], w };
  if (!/^lab-\d{2,}$/.test(s.id || '')) e.push('"id" must look like lab-12');
  for (const k of ['title', 'cloud', 'level', 'brief']) if (typeof s[k] !== 'string' || !s[k].trim()) e.push(`missing "${k}"`);
  if (!Number.isInteger(s.minutes) || s.minutes < 5) e.push('"minutes" must be a whole number of at least 5');
  for (const k of ['tags', 'exams', 'requirements', 'pitfalls']) if (!Array.isArray(s[k]) || s[k].some(x => typeof x !== 'string')) e.push(`"${k}" must be a list of text`);
  if (!Array.isArray(s.rubric) || !s.rubric.length || s.rubric.some(r => !Array.isArray(r) || typeof r[0] !== 'string' || typeof r[1] !== 'number')) e.push('"rubric" must be [[criterion, weight], …]');
  else { const t = s.rubric.reduce((a, r) => a + r[1], 0); if (t !== 100) e.push(`rubric weights add up to ${t}; they must add up to 100`); }
  if (!s.model || LAB_SECTIONS.some(([k]) => typeof s.model[k] !== 'string' || !s.model[k].trim())) e.push(`"model" needs text for ${LAB_SECTIONS.map(x => x[0]).join(', ')}`);
  if (s.origin !== 'generated-practice') e.push('"origin" must be generated-practice');
  if (!REVIEW_STATUS.includes(s.reviewStatus)) e.push('"reviewStatus" must be draft, needs-review, approved, or retired');
  return { e, w };
}
const Q_CMP = ['question', 'options', 'correct_index', 'correct_rationale', 'distractor_summary', 'domain', 'subdomain', 'difficulty', 'reviewStatus', 'optionRationales', 'docLinks', 'qtype', 'answerKey'];
const pick = (o, ks) => Object.fromEntries(ks.map(k => [k, o?.[k] ?? null]));
function analyzePack(pack, srcLabel) {
  const rep = { ok: false, src: srcLabel, errors: [], warnings: [], meta: {}, types: {} };
  if (!pack || typeof pack !== 'object' || pack.format !== PACK_FORMAT) { rep.errors.push(`Not a content pack (expected "format": "${PACK_FORMAT}").`); return rep; }
  const { packId, packVersion, title, publishedAt, minAppSchema, checksum, content } = pack;
  rep.meta = { packId, packVersion, title, publishedAt };
  if (!/^[a-z0-9][a-z0-9-]{2,40}$/.test(packId || '')) rep.errors.push('"packId" must be lowercase letters, digits, and hyphens.');
  if (!/^\d+(\.\d+){1,3}$/.test(String(packVersion || ''))) rep.errors.push('"packVersion" must look like 2026.10.1 or 1.2.0.');
  if (minAppSchema && minAppSchema > WS_SCHEMA) rep.errors.push(`This pack needs a newer CloudWalker (schema ${minAppSchema}).`);
  if (!content || typeof content !== 'object') { rep.errors.push('Missing "content".'); return rep; }
  const sum = packChecksum(content); rep.checksum = sum;
  if (!checksum || checksum.alg !== 'SHA-256' || typeof checksum.value !== 'string') rep.errors.push('Missing "checksum": {"alg": "SHA-256", "value": "…"}.');
  else if (checksum.value.toLowerCase() !== sum) rep.errors.push('Checksum does not match the content. The file may be damaged or edited after it was built, so nothing will be merged.');
  const inst = (S.ws.packs || []).find(p => p.packId === packId);
  if (inst && vcmp(packVersion, inst.packVersion) < 0) rep.errors.push(`Version ${packVersion} is older than the installed ${inst.packVersion}.`);
  if (inst && vcmp(packVersion, inst.packVersion) === 0) rep.warnings.push(`Version ${packVersion} is already installed; merging again only re-applies it.`);
  const ret = content.retired || {}; const examCodes = new Set([...S.exams.map(e => e.code), ...(content.exams || []).map(e => e && e.code).filter(Boolean)]);
  const T = (name) => (rep.types[name] = { added: [], changed: [], unchanged: [], retired: [], rejected: [] });
  const seen = new Set();
  const qt = T('questions');
  (content.questions || []).map(x => x && typeof x === 'object' && !x.exam ? { ...x, exam: examMetaFor(x.exam_code)?.name || (content.exams || []).find(e => e && e.code === x.exam_code)?.name || x.exam_code } : x).forEach((q, i) => {
    const v = validatePackQuestion(q, i, { examCodes }); const id = q?.id || `#${i + 1}`;
    if (q?.id && seen.has('q:' + q.id)) v.e.push('duplicate id in this pack'); seen.add('q:' + id);
    if (v.e.length) { qt.rejected.push({ id, why: v.e }); return; } v.w.forEach(x => rep.warnings.push(`question ${id}: ${x}`));
    const cur = Q(q.id); if (!cur) qt.added.push({ id, item: q }); else if (canonStr(pick(cur, Q_CMP)) !== canonStr(pick(normalizeQuestion(q), Q_CMP))) qt.changed.push({ id, item: q }); else qt.unchanged.push({ id, item: q });
  });
  (ret.questions || []).forEach(id => { if (Q(id)) qt.retired.push({ id }); else qt.rejected.push({ id, why: ['retired id is not in the app'] }); });
  const lt = T('lessons');
  (content.lessons || []).forEach((l, i) => { const v = validateLesson(l); const id = l?.id || `#${i + 1}`; if (v.e.length) { lt.rejected.push({ id, why: v.e }); return; } v.w.forEach(x => rep.warnings.push(`lesson ${id}: ${x}`)); const cur = LESSON_BY_ID.get(l.id); (cur ? (canonStr(pick(cur, ['title', 'domain', 'body', 'decisions', 'traps', 'links', 'reviewStatus'])) === canonStr(pick(l, ['title', 'domain', 'body', 'decisions', 'traps', 'links', 'reviewStatus'])) ? lt.unchanged : lt.changed) : lt.added).push({ id, item: l }); });
  (ret.lessons || []).forEach(id => { if (LESSON_BY_ID.has(id)) lt.retired.push({ id }); else lt.rejected.push({ id, why: ['retired id is not in the app'] }); });
  const bt = T('labs');
  (content.labs || []).forEach((s, i) => { const v = validateLab(s); const id = s?.id || `#${i + 1}`; if (v.e.length) { bt.rejected.push({ id, why: v.e }); return; } const cur = LAB_SCENARIOS.find(x => x.id === s.id); (cur ? (canonStr(pick(cur, ['title', 'brief', 'requirements', 'rubric', 'model', 'pitfalls'])) === canonStr(pick(s, ['title', 'brief', 'requirements', 'rubric', 'model', 'pitfalls'])) ? bt.unchanged : bt.changed) : bt.added).push({ id, item: s }); });
  if ((ret.labs || []).length) rep.warnings.push('Retiring labs is not supported in this version; saved attempts depend on them. Those ids were ignored.');
  const pt = T('examProfiles');
  for (const [code, p] of Object.entries(content.examProfiles || {})) { const v = validateProfile(code, p); if (v.e.length) { pt.rejected.push({ id: code, why: v.e }); continue; } v.w.forEach(x => rep.warnings.push(`exam ${code}: ${x}`)); const cur = EXAM_PROFILES[code]; (cur ? (canonStr(cur) === canonStr({ ...cur, ...p }) ? pt.unchanged : pt.changed) : pt.added).push({ id: code, item: p }); }
  rep.pack = pack; rep.ok = !rep.errors.length; return rep;
}

/* ---------- Content packs: storage and apply */
const PKC = () => { const c = (S.ws.packContent ||= {}); c.questions ||= {}; c.lessons ||= {}; c.labs ||= {}; c.examProfiles ||= {}; c.exams ||= {}; c.retired ||= { questions: [], lessons: [] }; return c; };
const LESSON_BASE = new Map(), LAB_BASE = new Map(), PROFILE_BASE = new Map();
function normPackLesson(l) { return { ...l, links: (l.links || []).map(x => typeof x === 'string' ? x : { title: x.title.trim(), url: x.url.trim() }), lastReviewed: l.lastReviewed || null }; }
/* V09.1: only finite, positive weights keyed by domain number are kept; anything else stays empty so the UI says the official page does not state them */
function packWeights(w) { const o = {}; if (w && typeof w === 'object') for (const [k, v] of Object.entries(w)) if (/^\d{1,2}$/.test(k) && typeof v === 'number' && isFinite(v) && v > 0 && v <= 100) o[k] = v; return o; }
function p8Apply() {
  if (!S.ws) return; const c = PKC();
  for (const e of Object.values(c.exams)) if (e && e.code && !examMetaFor(e.code)) S.exams.push({ code: e.code, name: e.name || e.code, vendor: e.vendor || 'Other', tier: typeof e.tier === 'string' && e.tier ? e.tier : 'custom', id_prefix: typeof e.id_prefix === 'string' ? e.id_prefix : '', domain_weights: packWeights(e.domain_weights) });
  for (const q of Object.values(c.questions)) { if (validateQuestion(q, 0).length || !examMetaFor(q.exam_code)) continue; const n = normalizeQuestion(q); n.packId = q.packId || null; if (!S.bank.has(q.id)) S.order.push(q.id); S.bank.set(q.id, n); }
  for (const id of c.retired.questions) { const q = Q(id); if (q) q.reviewStatus = 'retired'; }
  for (const l of Object.values(c.lessons)) { const n = normPackLesson(l); const i = ALL_LESSONS.findIndex(x => x.id === n.id); if (i >= 0) { if (!LESSON_BASE.has(n.id)) LESSON_BASE.set(n.id, ALL_LESSONS[i]); ALL_LESSONS[i] = n; } else ALL_LESSONS.push(n); LESSON_BY_ID.set(n.id, n); if (n.exam !== 'FOUND' && !LESSON_EXAMS.includes(n.exam)) LESSON_EXAMS.push(n.exam); }
  for (const id of c.retired.lessons) { const l = LESSON_BY_ID.get(id); if (l) l.reviewStatus = 'retired'; }
  for (const s of Object.values(c.labs)) { const i = LAB_SCENARIOS.findIndex(x => x.id === s.id); if (i >= 0) { if (!LAB_BASE.has(s.id)) LAB_BASE.set(s.id, LAB_SCENARIOS[i]); LAB_SCENARIOS[i] = s; } else LAB_SCENARIOS.push(s); }
  for (const [code, p] of Object.entries(c.examProfiles)) { if (!PROFILE_BASE.has(code)) PROFILE_BASE.set(code, EXAM_PROFILES[code] || null); EXAM_PROFILES[code] = { ...(EXAM_PROFILES[code] || {}), ...p }; }
  if (typeof LT_CACHE !== 'undefined') LT_CACHE = null;
  try { applyContentEdits(true); } catch { /* edits apply on next render */ }
}
function mergePack(rep) {
  const c = PKC(); const p = rep.pack; const t = rep.types; const now = Date.now();
  for (const e of (p.content.exams || [])) if (e && e.code) c.exams[e.code] = e;
  for (const x of [...t.questions.added, ...t.questions.changed]) c.questions[x.id] = { ...x.item, packId: p.packId };
  for (const x of t.questions.retired) if (!c.retired.questions.includes(x.id)) c.retired.questions.push(x.id);
  for (const x of [...t.lessons.added, ...t.lessons.changed]) c.lessons[x.id] = { ...x.item, packId: p.packId };
  for (const x of t.lessons.retired) if (!c.retired.lessons.includes(x.id)) c.retired.lessons.push(x.id);
  for (const x of [...t.labs.added, ...t.labs.changed]) c.labs[x.id] = { ...x.item, packId: p.packId };
  for (const x of [...t.examProfiles.added, ...t.examProfiles.changed]) c.examProfiles[x.id] = x.item;
  const packs = (S.ws.packs ||= []); const rec = { packId: p.packId, packVersion: p.packVersion, title: p.title || p.packId, checksum: rep.checksum, installedAt: now, updated: now, source: rep.src, counts: Object.fromEntries(Object.entries(t).map(([k, v]) => [k, { added: v.added.length, changed: v.changed.length, retired: v.retired.length, rejected: v.rejected.length }])) };
  const i = packs.findIndex(x => x.packId === p.packId); if (i >= 0) packs[i] = rec; else packs.push(rec);
  p8Apply(); markDirty(); persistSoon(SAVE_QUICK); return rec;
}
const _applyLocalP8 = applyLocal;
applyLocal = function (rec) { const r = _applyLocalP8(rec); try { p8Apply(); } catch (e) { console.warn('Content pack could not be applied', e); } return r; };
const _smartImportP8 = smartImport;
smartImport = data => {
  if (data && data.format === PACK_FORMAT) { const rep = analyzePack(data, 'file'); S.p8.preview = rep; setTimeout(() => go('packs'), 0); return { ok: rep.ok, title: rep.ok ? 'Content pack ready to review.' : 'This content pack has problems.', body: rep.ok ? 'Nothing is merged until you choose Merge on the Content updates page.' : rep.errors.join(' ') }; }
  const r = _smartImportP8(data); const w = data && (data.workspace || data); if (!w || data.format !== 'cloudwalker-workspace') return r;
  if (w.packContent && typeof w.packContent === 'object') { const c = PKC(); for (const k of ['questions', 'lessons', 'labs', 'examProfiles', 'exams']) for (const [id, v] of Object.entries(w.packContent[k] || {})) if (!c[k][id]) c[k][id] = v; for (const k of ['questions', 'lessons']) for (const id of (w.packContent.retired?.[k] || [])) if (!c.retired[k].includes(id)) c.retired[k].push(id); }
  if (Array.isArray(w.packs)) { const m = new Map((S.ws.packs ||= []).map(p => [p.packId, p])); for (const p of w.packs) if (p && p.packId && (!m.has(p.packId) || vcmp(p.packVersion, m.get(p.packId).packVersion) > 0)) m.set(p.packId, p); S.ws.packs = [...m.values()]; }
  p8Apply(); return r;
};

/* ---------- Contributor tools: CSV template, validation report, pack builder */
const CSV_COLS = ['id', 'exam_code', 'domain', 'subdomain', 'question', 'option_a', 'option_b', 'option_c', 'option_d', 'option_e', 'option_f', 'correct', 'correct_rationale', 'why_a', 'why_b', 'why_c', 'why_d', 'why_e', 'why_f', 'difficulty', 'question_type', 'services', 'tags', 'doc_links', 'origin', 'reviewStatus', 'lastReviewed', 'reviewedBy', 'examGuideVersion'];
function csvParse(text) {
  const rows = []; let row = [], f = '', q = false; if (text.charCodeAt(0) === 65279) text = text.slice(1);
  for (let i = 0; i < text.length; i++) { const ch = text[i];
    if (q) { if (ch === '"') { if (text[i + 1] === '"') { f += '"'; i++; } else q = false; } else f += ch; }
    else if (ch === '"') q = true; else if (ch === ',') { row.push(f); f = ''; } else if (ch === '\n' || ch === '\r') { if (ch === '\r' && text[i + 1] === '\n') i++; row.push(f); rows.push(row); row = []; f = ''; } else f += ch; }
  if (f !== '' || row.length) { row.push(f); rows.push(row); }
  return rows.filter(r => r.some(c => c.trim() !== ''));
}
const p8CsvCell = v => /[",\n\r]/.test(v) ? `"${String(v).replace(/"/g, '""')}"` : String(v);
function csvToQuestions(text) {
  const rows = csvParse(text); if (!rows.length) return { items: [], errors: ['The file is empty.'] };
  const head = rows[0].map(h => h.trim()); const miss = ['id', 'exam_code', 'domain', 'question', 'option_a', 'option_b', 'correct', 'origin', 'reviewStatus'].filter(c => !head.includes(c));
  if (miss.length) return { items: [], errors: [`Missing columns: ${miss.join(', ')}. Download the template to see every column.`] };
  const items = rows.slice(1).map((r, i) => {
    const o = Object.fromEntries(head.map((h, j) => [h, (r[j] ?? '').trim()]));
    const letters = 'abcdef'.split(''); const opts2 = letters.map(l => o['option_' + l]).filter(Boolean);
    const ci = 'ABCDEF'.indexOf((o.correct || '').toUpperCase()); const why = letters.slice(0, opts2.length).map(l => o['why_' + l] || '');
    const em = examMetaFor(o.exam_code);
    const q = { id: o.id, exam: em ? em.name : o.exam_code, exam_code: o.exam_code, domain: o.domain, subdomain: o.subdomain || 'General', question: o.question, options: opts2, correct_index: ci, correct_rationale: o.correct_rationale || '',
      difficulty: o.difficulty || undefined, question_type: o.question_type || undefined, services: o.services ? o.services.split(';').map(s => s.trim()).filter(Boolean) : [], tags: o.tags ? o.tags.split(';').map(s => s.trim()).filter(Boolean) : [],
      docLinks: o.doc_links ? o.doc_links.split(';').map(s => { const [title, url] = s.split('|'); return { title: (title || '').trim(), url: (url || '').trim() }; }) : [], origin: o.origin, reviewStatus: o.reviewStatus,
      lastReviewed: o.lastReviewed || undefined, reviewedBy: o.reviewedBy || undefined, examGuideVersion: o.examGuideVersion || undefined, _row: i + 2 };
    if (why.some(Boolean)) q.optionRationales = why;
    return q;
  });
  return { items, errors: [] };
}
function contributorReport(items, kind) {
  const examCodes = new Set(S.exams.map(e => e.code)); const ok = [], bad = [], warn = []; const seen = new Set();
  items.forEach((it, i) => {
    const v = kind === 'lessons' ? validateLesson(it) : kind === 'labs' ? validateLab(it) : validatePackQuestion(it, i, { examCodes });
    const id = it?.id || `#${i + 1}`; if (seen.has(id)) v.e.push('duplicate id'); seen.add(id);
    const where = it?._row ? `row ${it._row} (${id})` : id;
    if (v.e.length) bad.push({ where, why: v.e }); else ok.push(it); v.w.forEach(x => warn.push(`${where}: ${x}`));
  });
  return { kind, ok, bad, warn, total: items.length };
}
function reportMarkdown(r) {
  return [`# CloudWalker content validation report`, '', `Checked ${fmtDate(Date.now())}: ${r.total} ${r.kind}, ${r.ok.length} valid, ${r.bad.length} with errors, ${r.warn.length} warnings.`, '',
    '## Errors (must fix)', '', ...(r.bad.length ? r.bad.map(b => `- **${b.where}**: ${b.why.join('; ')}`) : ['- None']), '', '## Warnings (review)', '', ...(r.warn.length ? r.warn.map(w => `- ${w}`) : ['- None']), '',
    '## Rules', '', '- Write every item in your own words. Never copy real exam questions or braindumps.', '- New items use origin "generated-practice" and reviewStatus "draft" until a person reviews them; approved items need lastReviewed.', '- Never renumber ids. Change an item by keeping its id; retire it by listing its id under content.retired.', '- Exam facts need sourceUrl and lastVerified; unverified values stay null.', ''].join('\n');
}
function buildPack(meta, content) { const clean = JSON.parse(JSON.stringify(content, (k, v) => k === '_row' ? undefined : v)); return { format: PACK_FORMAT, packId: meta.packId, packVersion: meta.packVersion, title: meta.title, publishedAt: isoDate(Date.now()), minAppSchema: WS_SCHEMA, checksum: { alg: 'SHA-256', value: packChecksum(clean) }, content: clean }; }
function templateCsv() {
  const ex = ['cw-sample-q-0001', 'SAA-C03', '1. Design Secure Architectures', 'Least privilege', 'An application on EC2 must read one S3 bucket. What is the most secure way to grant access?', 'Attach an IAM role to the instance with read access to that bucket', 'Store an access key in the application config', 'Make the bucket public', 'Use the root user credentials', '', '', 'A', 'Instance roles give short-lived credentials scoped to what the app needs.', 'Temporary, scoped credentials.', 'Long-lived keys leak.', 'Anyone could read it.', 'Never use root for apps.', '', '', 'easy', 'scenario', 'IAM;S3', 'least-privilege', 'IAM roles|https://docs.aws.amazon.com/IAM/latest/UserGuide/id_roles.html', 'generated-practice', 'draft', '', '', ''];
  return [CSV_COLS.join(','), ex.map(p8CsvCell).join(',')].join('\r\n') + '\r\n';
}
function templatePack() {
  return buildPack({ packId: 'my-team-pack', packVersion: '1.0.0', title: 'Example pack (replace me)' }, {
    exams: [], questions: [], lessons: [], labs: [], examProfiles: {}, retired: { questions: [], lessons: [] }
  });
}

/* ---------- Content updates page */
S.p8 = { preview: null, url: '', busy: false, contrib: null, meta: { packId: 'my-team-pack', packVersion: '1.0.0', title: '' } };
async function fetchPack(url) {
  if (!safeUrl(url)) throw new Error('Enter an https address for the pack.');
  if (navigator.onLine === false) throw new Error('You are offline. Load a pack file instead, or try again when connected.');
  let res; try { res = await fetch(url, { cache: 'no-store', credentials: 'omit', referrerPolicy: 'no-referrer' }); } catch { throw new Error('Could not download the pack. Check the address and that the host allows downloads from a browser (CORS).'); }
  if (!res.ok) throw new Error(`The host answered with status ${res.status}.`);
  const txt = await res.text(); if (txt.length > 25e6) throw new Error('The pack is larger than 25 MB.');
  try { return JSON.parse(txt); } catch { throw new Error('The file at that address is not valid JSON.'); }
}
const TYPE_LABEL = { questions: 'Questions', lessons: 'Lessons', labs: 'Labs', examProfiles: 'Exam profiles' };
function previewHtml(rep) {
  const lists = (arr, cap = 40) => arr.length ? `<ul class="small pk-ids">${arr.slice(0, cap).map(x => `<li><code>${esc(x.id)}</code>${x.why ? `: ${esc(x.why.join('; '))}` : ''}</li>`).join('')}${arr.length > cap ? `<li>…and ${arr.length - cap} more</li>` : ''}</ul>` : '';
  const anything = Object.values(rep.types).some(t => t.added.length + t.changed.length + t.retired.length);
  return `<section class="card pk-preview" style="margin-top:16px" aria-labelledby="h-pk-prev"><div class="card-head"><h2 id="h-pk-prev" tabindex="-1">Preview: ${esc(rep.meta.title || rep.meta.packId || 'content pack')}</h2><span class="chip ${rep.ok ? 'ok-chip' : 'warn-chip'}">${rep.ok ? 'Checksum verified' : 'Cannot merge'}</span></div>
    <p class="small muted">Pack <code>${esc(rep.meta.packId || '?')}</code> · version ${esc(rep.meta.packVersion || '?')}${rep.meta.publishedAt ? ` · published ${esc(rep.meta.publishedAt)}` : ''} · from ${esc(rep.src)}</p>
    ${rep.errors.length ? `<div class="notice notice-err" role="alert" style="margin-top:10px"><strong>Problems:</strong><ul>${rep.errors.map(e => `<li>${esc(e)}</li>`).join('')}</ul></div>` : ''}
    ${Object.keys(rep.types).length ? `<div class="cmp-wrap" style="margin-top:12px"><table><thead><tr><th scope="col">Type</th><th scope="col" class="num">Added</th><th scope="col" class="num">Changed</th><th scope="col" class="num">Retired</th><th scope="col" class="num">Unchanged</th><th scope="col" class="num">Rejected</th></tr></thead><tbody>${Object.entries(rep.types).map(([k, t]) => `<tr><th scope="row">${TYPE_LABEL[k]}</th><td class="num">${t.added.length}</td><td class="num">${t.changed.length}</td><td class="num">${t.retired.length}</td><td class="num">${t.unchanged.length}</td><td class="num ${t.rejected.length ? 'bad-cell' : ''}">${t.rejected.length}</td></tr>`).join('')}</tbody></table></div>
    ${Object.entries(rep.types).map(([k, t]) => (t.added.length + t.changed.length + t.retired.length + t.rejected.length) ? `<details style="margin-top:8px"><summary class="small"><strong>${TYPE_LABEL[k]}</strong> details</summary>${t.added.length ? `<p class="small" style="margin-top:6px">Added</p>${lists(t.added)}` : ''}${t.changed.length ? `<p class="small">Changed</p>${lists(t.changed)}` : ''}${t.retired.length ? `<p class="small">Retired (hidden from practice; history kept)</p>${lists(t.retired)}` : ''}${t.rejected.length ? `<p class="small">Rejected (not merged)</p>${lists(t.rejected)}` : ''}</details>` : '').join('')}` : ''}
    ${rep.warnings.length ? `<details style="margin-top:8px"><summary class="small">${rep.warnings.length} warning${rep.warnings.length === 1 ? '' : 's'}</summary><ul class="small">${rep.warnings.slice(0, 60).map(w => `<li>${esc(w)}</li>`).join('')}</ul></details>` : ''}
    <div class="row" style="margin-top:12px">${rep.ok && anything ? '<button class="btn primary" data-action="p8-merge">Merge into this app</button>' : ''}<button class="btn ghost" data-action="p8-cancel">${rep.ok && anything ? 'Cancel' : 'Close'}</button></div>
    ${rep.ok && !anything ? '<p class="small" style="margin-top:8px">Nothing new: every item already matches.</p>' : ''}
    <p class="small muted" style="margin-top:8px">Rejected items are skipped; everything else merges by id. Your own edits from Content review still apply on top. Practice material, not exam content.</p></section>`;
}
function packDraftCounts() { const by = new Map(); let n = 0; for (const id of S.order) { const q = Q(id); if (q && q.packId && q.reviewStatus === 'draft') { n++; by.set(q.exam_code, (by.get(q.exam_code) || 0) + 1); } } return { n, by }; }
function draftsHtml() {
  const { n, by } = packDraftCounts(); if (!n) return '';
  const on = S.ws.includeDrafts === true;
  return `<section class="card" style="margin-top:16px" aria-labelledby="h-pk-d"><h2 id="h-pk-d">Draft practice questions</h2>
    <p class="small">Your packs hold ${n} draft question${n === 1 ? '' : 's'} across ${by.size} exam${by.size === 1 ? '' : 's'}. Drafts are practice material written for this app. No person has reviewed them yet, so they stay out of study and exams unless you turn them on.</p>
    <label class="check" style="margin-top:10px"><input type="checkbox" id="pk-drafts" ${on ? 'checked' : ''} aria-describedby="pk-drafts-help"> Include draft pack questions in practice and exams</label>
    <p class="small muted" id="pk-drafts-help" style="margin-top:6px">Each draft shows a Draft label while you answer. Use Report on a question if something looks wrong. You can turn this off at any time, and your answers are kept either way.</p>
    <details style="margin-top:8px"><summary class="small">Drafts by exam</summary><ul class="small">${[...by.entries()].sort((a, b) => a[0].localeCompare(b[0])).map(([code, k]) => `<li>${esc(examMetaFor(code)?.name || code)} (${esc(code)}): ${k}</li>`).join('')}</ul></details></section>`;
}
document.addEventListener('change', e => { const el = e.target; if (!el || el.id !== 'pk-drafts') return; S.ws.includeDrafts = !!el.checked; if (typeof LT_CACHE !== 'undefined') LT_CACHE = null; markDirty(); persistSoon(SAVE_QUICK); render(); $('#pk-drafts')?.focus(); showStatus(el.checked ? 'Draft pack questions are now included in practice and exams.' : 'Draft pack questions are hidden from practice and exams.'); });
function contribHtml() {
  const r = S.p8.contrib; const m = S.p8.meta;
  return `<section class="card" style="margin-top:16px" aria-labelledby="h-pk-c"><h2 id="h-pk-c">For contributors</h2>
    <p class="small">Write questions in a spreadsheet or JSON, check them here, and build a pack with its checksum. Every item must be in your own words, never copied from a real exam. New items stay drafts until a person reviews them.</p>
    <div class="row" style="margin-top:10px"><button class="btn" data-action="p8-tpl" data-v="csv">Questions template (.csv)</button><button class="btn" data-action="p8-tpl" data-v="json">Pack template (.json)</button><button class="btn primary" data-action="p8-validate">Validate a file…</button></div>
    ${r ? `<div class="pk-report" style="margin-top:12px" aria-live="polite"><p><strong>${r.total} ${esc(r.kind)} checked:</strong> ${r.ok.length} valid, ${r.bad.length} with errors, ${r.warn.length} warnings.</p>
      ${r.bad.length ? `<ul class="small">${r.bad.slice(0, 30).map(b => `<li><strong>${esc(b.where)}</strong>: ${esc(b.why.join('; '))}</li>`).join('')}${r.bad.length > 30 ? `<li>…and ${r.bad.length - 30} more in the report</li>` : ''}</ul>` : ''}
      <div class="row" style="margin-top:8px"><button class="btn sm" data-action="p8-report">Download report (.md)</button></div>
      ${r.ok.length ? `<div class="filters" style="margin-top:12px"><div class="field"><label for="pk-id">Pack id</label><input id="pk-id" data-p8m="packId" value="${esc(m.packId)}" autocapitalize="none" spellcheck="false"></div><div class="field"><label for="pk-ver">Version</label><input id="pk-ver" data-p8m="packVersion" value="${esc(m.packVersion)}" spellcheck="false"></div><div class="field"><label for="pk-title">Title</label><input id="pk-title" data-p8m="title" value="${esc(m.title)}" placeholder="optional"></div></div>
        <div class="row" style="margin-top:8px"><button class="btn" data-action="p8-build">Build pack from the ${r.ok.length} valid item${r.ok.length === 1 ? '' : 's'} (.json)</button></div>` : ''}</div>` : ''}</section>`;
}
VIEWS.packs = () => {
  const packs = S.ws.packs || []; const c = PKC();
  return `<div class="page-head"><div><h1>Content updates</h1><p class="muted">Add or update questions, lessons, labs, and exam facts from a content pack. You see every change before anything is merged.</p></div></div>
  <section class="card" aria-labelledby="h-pk-i"><h2 id="h-pk-i">Installed packs</h2>${packs.length ? `<div class="cmp-wrap"><table><thead><tr><th scope="col">Pack</th><th scope="col">Version</th><th scope="col">Installed</th><th scope="col">Items</th></tr></thead><tbody>${packs.map(p => `<tr><td>${esc(p.title)}<div class="small muted"><code>${esc(p.packId)}</code></div></td><td>${esc(p.packVersion)}</td><td>${humanTime(p.installedAt)}</td><td class="small">${Object.entries(p.counts || {}).filter(([, v]) => v.added + v.changed + v.retired).map(([k, v]) => `${TYPE_LABEL[k]}: +${v.added} ~${v.changed}${v.retired ? ` −${v.retired}` : ''}`).join('<br>') || '—'}</td></tr>`).join('')}</tbody></table></div>`
    : '<p class="small muted">None yet. The built-in content is the base; packs add to it.</p>'}
    <p class="small muted" style="margin-top:6px">${[[c.questions, 'question'], [c.lessons, 'lesson'], [c.labs, 'lab'], [c.examProfiles, 'exam profile']].map(([o, w]) => { const n = Object.keys(o).length; return `${n} ${w}${n === 1 ? '' : 's'}`; }).join(', ')} come from packs.</p></section>
  <section class="card" style="margin-top:16px" aria-labelledby="h-pk-u"><h2 id="h-pk-u">Check for content update</h2>
    <div class="field"><label for="pk-url">Pack address (https)</label><input id="pk-url" type="url" inputmode="url" value="${esc(S.p8.url || S.ws.packSource || '')}" placeholder="https://example.org/cloudwalker/pack.json" autocomplete="off" autocapitalize="none" spellcheck="false"></div>
    <div class="row" style="margin-top:10px"><button class="btn primary" data-action="p8-check" ${S.p8.busy ? 'disabled aria-busy="true"' : ''}>${S.p8.busy ? 'Checking…' : 'Check for update'}</button><button class="btn" data-action="p8-file">Load a pack file…</button></div>
    <p class="small muted" style="margin-top:8px">Optional and only when you ask: core study never needs a connection. A pack file can also be opened with Import in Settings.</p></section>
  ${draftsHtml()}
  ${S.p8.preview ? previewHtml(S.p8.preview) : ''}
  ${contribHtml()}`;
};

/* ---------- Events */
const p8Picker = (accept, cb) => { const i = document.createElement('input'); i.type = 'file'; i.accept = accept; i.className = 'sr-only'; i.addEventListener('change', async () => { const f = i.files && i.files[0]; i.remove(); if (!f) return; if (f.size > 25e6) { showStatus('That file is larger than 25 MB.'); return; } cb(f.name, await f.text()); }); document.body.append(i); i.click(); };
document.addEventListener('click', e => {
  const b = e.target.closest('[data-action^="p8-"]'); if (!b) return; e.preventDefault(); const d = b.dataset;
  const showPreview = rep => { S.p8.preview = rep; render(); $('#h-pk-prev')?.focus(); };
  if (d.action === 'p8-check') {
    const url = ($('#pk-url')?.value || '').trim(); S.p8.url = url; S.p8.busy = true; render();
    fetchPack(url).then(p => { S.ws.packSource = url; const rep = analyzePack(p, url); const inst = (S.ws.packs || []).find(x => x.packId === rep.meta.packId); if (inst && rep.ok && vcmp(rep.meta.packVersion, inst.packVersion) === 0) showStatus(`You already have the latest version (${inst.packVersion}).`); S.p8.busy = false; showPreview(rep); })
      .catch(err => { S.p8.busy = false; render(); showStatus(err.message); $('#pk-url')?.focus(); });
  } else if (d.action === 'p8-file') p8Picker('.json,application/json', (name, txt) => { let j; try { j = JSON.parse(txt); } catch { showStatus(`${name} is not valid JSON.`); return; } showPreview(analyzePack(j, name)); });
  else if (d.action === 'p8-merge') { const rep = S.p8.preview; if (!rep || !rep.ok) return; snapshot('Before content pack ' + rep.meta.packId); const rec = mergePack(rep); S.p8.preview = null; render(); showStatus(`Merged ${rec.title} ${rec.packVersion}.`); $('#h-pk-i')?.focus(); }
  else if (d.action === 'p8-cancel') { S.p8.preview = null; render(); $('#h-pk-u')?.focus(); }
  else if (d.action === 'p8-tpl') { if (d.v === 'csv') downloadText('cloudwalker-questions-template.csv', templateCsv(), 'text/csv'); else downloadText('cloudwalker-pack-template.json', JSON.stringify(templatePack(), null, 2), 'application/json'); }
  else if (d.action === 'p8-validate') p8Picker('.csv,.json,text/csv,application/json', (name, txt) => {
    let items = [], kind = 'questions', pre = [];
    if (/\.csv$/i.test(name) || !/^\s*[[{]/.test(txt)) { const r = csvToQuestions(txt); items = r.items; pre = r.errors; }
    else { let j; try { j = JSON.parse(txt); } catch { showStatus(`${name} is not valid JSON.`); return; } const c = j.format === PACK_FORMAT ? j.content : j; if (Array.isArray(c)) items = c; else if (Array.isArray(c.questions) && c.questions.length) items = c.questions; else if (Array.isArray(c.lessons) && c.lessons.length) { items = c.lessons; kind = 'lessons'; } else if (Array.isArray(c.labs) && c.labs.length) { items = c.labs; kind = 'labs'; } }
    if (pre.length) { showStatus(pre.join(' ')); return; }
    S.p8.contrib = contributorReport(items, kind); render(); $('#h-pk-c')?.scrollIntoView({ block: 'start' });
  });
  else if (d.action === 'p8-report' && S.p8.contrib) downloadText('cloudwalker-validation-report.md', reportMarkdown(S.p8.contrib));
  else if (d.action === 'p8-build' && S.p8.contrib) { const m = S.p8.meta; if (!/^[a-z0-9][a-z0-9-]{2,40}$/.test(m.packId) || !/^\d+(\.\d+){1,3}$/.test(m.packVersion)) { showStatus('Use a pack id of lowercase letters, digits, and hyphens, and a version like 1.0.0.'); return; } const k = S.p8.contrib.kind; const pack = buildPack({ ...m, title: m.title || m.packId }, { [k]: S.p8.contrib.ok }); downloadText(`${m.packId}-${m.packVersion}.json`, JSON.stringify(pack, null, 2), 'application/json'); showStatus('Pack built with its checksum.'); }
  else if (d.action === 'p8-conf') { const c = (S.ws.syncConflicts || [])[+d.i]; if (!c) return; if (d.v !== c.kept) applyChanges([{ table: c.table, id: c.id, updatedAt: Date.now(), deletedAt: d.v === 'theirs' && c.theirsDeleted ? Date.now() : null, data: d.v === 'mine' ? { ...c.mine, updated: Date.now() } : { ...c.theirs, updated: Date.now() } }]); S.ws.syncConflicts.splice(+d.i, 1); markDirty(); render(); showStatus('Conflict resolved.'); }
});
document.addEventListener('input', e => { const el = e.target; if (el.dataset && el.dataset.p8m) S.p8.meta[el.dataset.p8m] = el.value.trim(); });
ICON.packs = '<path d="M4 7l8-4 8 4-8 4z"/><path d="M4 7v10l8 4 8-4V7"/><path d="M12 11v10"/>';
(() => { const i = NAV.findIndex(n => n[0] === 'install'); NAV.splice(i >= 0 ? i : NAV.length, 0, ['packs', 'Content updates', 'Data']); })();

/* V09 P9: one h1 per page for screen readers on detail views that show a compact title bar */
const _labP9 = VIEWS.lab; VIEWS.lab = arg => { const h = _labP9(arg); if (!arg || /<h1[\s>]/.test(h)) return h; const s = LAB_SCENARIOS.find(x => x.id === arg); return `<h1 class="sr-only">${esc(s ? s.title : 'Architecture lab')}</h1>` + h; };
const _adrP9 = VIEWS.adr; VIEWS.adr = arg => { const h = _adrP9(arg); if (!arg || /<h1[\s>]/.test(h)) return h; const a = S.ws.adrs.find(x => x.id === String(arg).split('/')[0]); return `<h1 class="sr-only">${esc(a ? `${a.id}: ${a.title || 'Untitled decision'}` : 'Architecture decision record')}</h1>` + h; };
