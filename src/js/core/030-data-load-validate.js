/* ------------------------------------------------------------------ Data: load + validate */
const REQUIRED = ['id', 'exam', 'domain', 'question', 'options', 'correct_index'];
function validateQuestion(q, i) {
  const errs = [];
  if (!q || typeof q !== 'object' || Array.isArray(q)) return [`#${i}: not an object`];
  for (const k of REQUIRED) if (q[k] === undefined || q[k] === null || q[k] === '') errs.push(`missing "${k}"`);
  if (q.id !== undefined && (typeof q.id !== 'string' || !/^[a-z0-9][a-z0-9._-]{2,80}$/i.test(q.id))) errs.push('"id" must be 3–80 chars of letters, digits, . _ -');
  if (q.options !== undefined && (!Array.isArray(q.options) || q.options.length < 2 || q.options.length > 6 || q.options.some(o => typeof o !== 'string' || !o.trim()))) errs.push('"options" must be 2–6 non-empty strings');
  if (q.correct_index !== undefined && (!Number.isInteger(q.correct_index) || !Array.isArray(q.options) || q.correct_index < 0 || q.correct_index >= q.options.length)) errs.push('"correct_index" must point at an option');
  for (const k of ['services', 'tags', 'distractor_rationales', 'prerequisites', 'common_traps']) if (q[k] !== undefined && !(Array.isArray(q[k]) && q[k].every(x => typeof x === 'string'))) errs.push(`"${k}" must be an array of strings`);
  if (q.difficulty !== undefined && !DIFFS.includes(q.difficulty)) errs.push('"difficulty" must be easy, medium, or hard');
  if (q.question_type !== undefined && !['scenario', 'concept'].includes(q.question_type)) errs.push('"question_type" must be scenario or concept');
  return errs.map(e => `${q && q.id ? q.id : '#' + i}: ${e}`);
}
function examMetaFor(code) { return S.exams.find(e => e.code === code); }
function normalizeQuestion(q) {
  const exam = S.exams.find(e => e.name === q.exam || e.code === q.exam_code || e.code === q.exam);
  const code = q.exam_code || (exam ? exam.code : q.exam);
  const dnum = q.domain_number ?? (parseInt(q.domain, 10) || 0);
  const cr = q.correct_rationale || '';
  const ds = q.distractor_summary || '';
  return {
    id: q.id, source_id: q.source_id || '', exam: exam ? exam.name : q.exam, exam_code: code, vendor: q.vendor || (exam ? exam.vendor : 'Other'),
    domain: q.domain, domain_number: dnum, subdomain: q.subdomain || 'General', question_type: q.question_type || 'scenario',
    difficulty: q.difficulty || 'medium', difficulty_source: q.difficulty_source || (q.difficulty ? 'provided' : 'default'),
    services: q.services || [], tags: q.tags || [], question: q.question, options: q.options, correct_index: q.correct_index,
    correct_rationale: cr, distractor_rationales: q.distractor_rationales || [], distractor_summary: ds,
    explanation: q.explanation || [cr, ds].filter(Boolean).join(' '),
    blueprint_version: q.blueprint_version || '', last_reviewed: q.last_reviewed || '', prerequisites: q.prerequisites || [], common_traps: q.common_traps || [],
    source_section: q.source_section || ''
  };
}
function ensureExam(q) {
  if (S.exams.some(e => e.code === q.exam_code)) return;
  S.exams.push({ code: q.exam_code, name: q.exam, vendor: q.vendor, tier: 'custom', id_prefix: '', domain_weights: {} });
}
function bootBankHead() {
  const raw = JSON.parse($('#bank-data').textContent);
  S.meta = raw.meta; S.sections = raw.sections; S.exams = raw.meta.exams.map(e => ({ ...e })); S.bankFields = raw.fields;
}
function bootBankRows(rows) {
  const F = S.bankFields; let dropped = 0;
  for (const row of rows) {
    const o = {}; F.forEach((f, i) => o[f] = row[i]);
    o.source_section = S.sections[o.section] || ''; delete o.section;
    const em = examMetaFor(o.exam_code);
    Object.assign(o, { exam: em.name, vendor: em.vendor, difficulty_source: o.difficulty_source || 'inferred', blueprint_version: '', last_reviewed: '', origin: 'reserve', _fromReserve: true }); /* V09: no review date is invented for the reserve */
    if (validateQuestion(o, 0).length) { dropped++; continue; }
    const q = normalizeQuestion(o);
    S.bank.set(q.id, q); S.order.push(q.id);
  }
  return dropped;
}
/* V09 P9: the bank ships as a small header (#bank-data) plus script.bank-chunk blocks of 100 rows */
function bootBank() { bootBankHead(); let dropped = 0; for (const el of document.querySelectorAll('script.bank-chunk')) dropped += bootBankRows(JSON.parse(el.textContent)); S.bootDropped = dropped; }
const idleTask = cb => ('requestIdleCallback' in window) ? requestIdleCallback(cb, { timeout: 50 }) : setTimeout(() => cb({ timeRemaining: () => 8, didTimeout: true }), 0);
function bootBankAsync(onProgress) {
  return new Promise((resolve, reject) => {
    try { bootBankHead(); } catch (e) { reject(e); return; }
    const chunks = [...document.querySelectorAll('script.bank-chunk')]; let i = 0, dropped = 0;
    const step = deadline => {
      try { do { dropped += bootBankRows(JSON.parse(chunks[i].textContent)); i++; onProgress(i, chunks.length); } while (i < chunks.length && deadline.timeRemaining() > 6); }
      catch (e) { reject(e); return; }
      if (i < chunks.length) idleTask(step); else { S.bootDropped = dropped; resolve(); }
    };
    if (!chunks.length) { S.bootDropped = 0; resolve(); return; }
    idleTask(step);
  });
}
const Q = id => S.bank.get(id);
const allQ = () => S.order.map(Q).filter(q => q.reviewStatus !== 'retired' && (q.reviewStatus !== 'draft' || (q.packId && S.ws && S.ws.includeDrafts === true))); /* retired items leave practice pools; history is kept. V09.1: draft questions from content packs join only when the learner opts in */
const examQs = code => allQ().filter(q => q.exam_code === code);
const activeExams = () => S.exams.filter(e => allQ().some(q => q.exam_code === e.code));
const domainsOf = code => uniq(examQs(code).sort((a, b) => a.domain_number - b.domain_number).map(q => q.domain));
const subdomainsOf = (code, domain) => uniq(allQ().filter(q => (!code || q.exam_code === code) && (!domain || q.domain === domain)).map(q => q.subdomain)).sort((a, b) => a.localeCompare(b, undefined, { numeric: true }));
const servicesOf = code => uniq(allQ().filter(q => !code || q.exam_code === code).flatMap(q => q.services)).sort();
const tagsOf = () => uniq(allQ().flatMap(q => q.tags)).sort();

