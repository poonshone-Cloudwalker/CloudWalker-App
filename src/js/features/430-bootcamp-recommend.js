/* ================================================================== V10.1: Bootcamp, recommendations
 * A practical, manual mapping (src/content/bootcamp/bootcamp-cert-mapping.json) links certification weak
 * areas to labs. A quiz domain is weak when it has at least min_attempts answers and accuracy at or below
 * max_accuracy (weakDomains() from the progress code). Its name is matched against each topic's keywords;
 * the topic's labs come first, then extra labs for the exam's cloud. Related certifications on a lab page are
 * worked out the same way from the exam domains already in the app, so no exam fact is stored here. */
const bcFocusTopics = () => { const p = S.ws.bootcamp && S.ws.bootcamp.prefs; return p && Array.isArray(p.focus_topics) ? p.focus_topics : []; };
const bcTopic = key => bcContent().ok ? BC.mapping.topics.find(t => t.key === key) || null : null;
const bcTopicsForDomain = name => { const n = String(name || '').toLowerCase(); return bcContent().ok ? BC.mapping.topics.filter(t => t.keywords.some(k => n.includes(k.toLowerCase()))) : []; };
function bcExamCloud(code) {
  const p = typeof EXAM_PROFILES === 'object' && EXAM_PROFILES[code]; if (p && p.cloud) return p.cloud;
  const v = String((p && p.vendor) || (examMetaFor(code) || {}).vendor || '').toLowerCase();
  return /azure|microsoft/.test(v) ? 'azure' : /google/.test(v) ? 'gcp' : /aws|amazon/.test(v) ? 'aws' : 'neutral';
}
const bcExamName = code => (examMetaFor(code) || {}).name || (typeof EXAM_PROFILES === 'object' && EXAM_PROFILES[code] || {}).name || code;
function bcWeakAreas() {
  if (!bcContent().ok || typeof weakDomains !== 'function') return [];
  const T = BC.mapping.weak_threshold || { min_attempts: 3, max_accuracy: 70 };
  return weakDomains(12, T.min_attempts).filter(w => w.acc <= T.max_accuracy).map(w => ({ ...w, topics: bcTopicsForDomain(w.domain) }));
}
/* Labs to suggest, weakest area first, then the focus topics the person picked. Passed labs are left out. */
function bcRecommendations(limit = 6) {
  if (!bcContent().ok) return [];
  const out = new Map(); const add = (id, reason) => { const lab = bcLab(id); if (!lab || bcRec(id).status === 'passed') return; const e = out.get(id) || { lab, reasons: [] }; if (!e.reasons.some(r => r.key === reason.key)) e.reasons.push(reason); out.set(id, e); };
  for (const w of bcWeakAreas()) {
    for (const t of w.topics) for (const id of t.labs) add(id, { key: 'w:' + w.code + w.domain + t.key, kind: 'weak', code: w.code, domain: w.domain, acc: w.acc, att: w.att, topic: t });
    for (const id of (BC.mapping.vendor_labs || {})[bcExamCloud(w.code)] || []) add(id, { key: 'v:' + w.code + w.domain, kind: 'cloud', code: w.code, domain: w.domain, acc: w.acc, att: w.att });
  }
  for (const k of bcFocusTopics()) { const t = bcTopic(k); if (t) for (const id of t.labs) add(id, { key: 'f:' + k, kind: 'focus', topic: t }); }
  return [...out.values()].slice(0, limit);
}
/* The single next step: work already started, then rework, then the lowest level not yet gated by its exemplar. */
function bcNextLab() {
  if (!bcContent().ok) return null;
  const st = id => bcRec(id).status;
  const started = BC.labs.filter(l => st(l.id) === 'in-progress').sort((a, b) => bcRec(b.id).updated - bcRec(a.id).updated)[0];
  if (started) return { lab: started, why: 'You started this lab and have not finished it.' };
  const rework = BC.labs.find(l => st(l.id) === 'rework'); if (rework) return { lab: rework, why: 'It is marked for rework.' };
  for (const lv of BC.levels) {
    if (st(lv.exemplar_id) === 'passed') continue;
    const open = lv.lab_ids.filter(id => st(id) === 'not-started');
    const weak = bcRecommendations(20).find(r => open.includes(r.lab.id));
    if (weak) return { lab: weak.lab, why: `Level ${lv.level} is your current level, and this lab practises an area your quiz results show as weak.` };
    if (open.length) return { lab: bcLab(open[0]), why: `Level ${lv.level} is your current level. Its eight labs can be done in any order; this is the first one not started.` };
    const left = lv.lab_ids.filter(id => st(id) !== 'passed');
    if (!left.length) return { lab: bcLab(lv.exemplar_id), why: `All eight Level ${lv.level} labs are passed. The exemplar is the level gate.` };
    return { lab: bcLab(left[0]), why: `Level ${lv.level} still has ${left.length} lab${left.length === 1 ? '' : 's'} that ${left.length === 1 ? 'is' : 'are'} blocked. Clear ${left.length === 1 ? 'it' : 'them'} before the exemplar gate.`, blocked: true };
  }
  return null;
}
/* Exams in this app whose domains match the lab's topics. Cloud-specific labs only match exams for that cloud. */
function bcRelatedCerts(lab) {
  if (!lab || !lab.related_quiz_domains.length || typeof activeExams !== 'function') return [];
  const clouds = lab.vendors.filter(v => ['aws', 'gcp', 'azure'].includes(v)); const anyCloud = !clouds.length || lab.vendors.includes('multi-cloud') || lab.vendors.includes('local');
  const out = [];
  for (const e of activeExams()) {
    const cloud = bcExamCloud(e.code); if (!anyCloud && !clouds.includes(cloud)) continue;
    const prof = typeof EXAM_PROFILES === 'object' && EXAM_PROFILES[e.code];
    const names = uniq([...domainsOf(e.code), ...((prof && prof.domains) || []).map(d => d[0])]);
    const hit = names.filter(n => bcTopicsForDomain(n).some(t => lab.related_quiz_domains.includes(t.key)));
    if (hit.length) out.push({ code: e.code, name: bcExamName(e.code), domains: hit });
  }
  return out;
}
