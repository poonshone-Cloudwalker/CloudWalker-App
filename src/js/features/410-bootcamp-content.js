/* ================================================================== V10.1: Bootcamp, content
 * The Cloud Architect Operator Bootcamp as structured data. The JSON files in src/content/bootcamp/ are
 * generated from the curriculum by tools/bootcamp-extract.js and arrive here as BC_*_DOC constants (see the
 * manifest). This file checks them once and builds the lookup the pages use. If the check fails, the
 * Bootcamp pages show what is wrong and the rest of the app carries on. Lab ids are permanent:
 * "1.01"–"9.08" for the 72 briefs, "E1"–"E9" for the nine exemplars. Never renumber them. */
const BC_DOCS = { levels: BC_LEVELS_DOC, labs: [BC_LABS_01, BC_LABS_02, BC_LABS_03, BC_LABS_04, BC_LABS_05, BC_LABS_06, BC_LABS_07, BC_LABS_08, BC_LABS_09], exemplars: BC_EXEMPLARS_DOC, rubric: BC_RUBRIC_DOC, framework: BC_FRAMEWORK_DOC, mapping: BC_MAPPING_DOC };
const BC_STATUSES = [['not-started', 'Not started'], ['in-progress', 'In progress'], ['blocked', 'Blocked'], ['passed', 'Passed'], ['rework', 'Rework']];
const BC_STATUS_LABEL = Object.fromEntries(BC_STATUSES);
const BC_EVIDENCE = [['code', 'Code or config completed'], ['tests', 'Tests completed'], ['validation', 'Validation run and passing (make validate)'], ['drill', 'Failure drill completed'], ['adr', 'ADR added'], ['runbook', 'Runbook added'], ['incident', 'Incident report added'], ['report', 'REPORT.md added'], ['cleanup', 'Cleanup proof added'], ['artifact', 'Portfolio artifact ready'], ['sanitized', 'Sanitized for public sharing']];
const BC_PORTFOLIO_STATES = [['private', 'Private only'], ['needs-sanitization', 'Needs sanitization'], ['public-safe', 'Public-safe'], ['portfolio-ready', 'Portfolio-ready']];
const BC_PORTFOLIO_LABEL = Object.fromEntries(BC_PORTFOLIO_STATES);
const BC_VENDORS = [['local', 'Local / offline'], ['aws', 'AWS'], ['gcp', 'Google Cloud'], ['azure', 'Azure'], ['multi-cloud', 'Multi-cloud']];
const BC_VENDOR_LABEL = Object.fromEntries(BC_VENDORS);
const BC_DOMAIN_LABEL = { linux: 'Linux', diagnostics: 'Diagnostics', networking: 'Networking', security: 'Security', iam: 'Identity and access', data: 'Data', automation: 'Automation', iac: 'Infrastructure as code', containers: 'Containers', 'ci-cd': 'CI/CD', reliability: 'Reliability', observability: 'Observability', incident: 'Incidents', finops: 'FinOps', architecture: 'Architecture', migration: 'Migration', platform: 'Platform', governance: 'Governance', 'multi-cloud': 'Multi-cloud', leadership: 'Leadership', communication: 'Communication' };
const BC_CLOUD_LABEL = { 'local-only': 'Local only', 'optional-cloud': 'Optional sandbox' };
const BC_ID_RX = /^(\d\.0[1-8]|E[1-9])$/;
let BC = null;

/* Structural check of the content documents. Returns a list of plain-language problems; empty means usable. */
function bcCheckContent(D) {
  const errs = []; const need = (ok, msg) => { if (!ok) errs.push(msg); return ok; };
  const isStr = v => typeof v === 'string' && v.trim().length > 0, isArr = Array.isArray;
  if (!need(D && typeof D === 'object', 'The bootcamp content is missing.')) return errs;
  const levels = D.levels && D.levels.levels;
  if (need(isArr(levels) && levels.length === 9, 'bootcamp-levels.json: expected 9 levels.')) levels.forEach((l, i) => {
    need(l && l.level === i + 1, `bootcamp-levels.json: level ${i + 1} is out of order or missing its number.`);
    need(l && isStr(l.title) && isStr(l.outcome), `bootcamp-levels.json: level ${i + 1} needs a title and an outcome.`);
    need(l && isArr(l.lab_ids) && l.lab_ids.length === 8 && isStr(l.exemplar_id), `bootcamp-levels.json: level ${i + 1} needs 8 lab ids and an exemplar id.`);
  });
  const seen = new Set(); const all = [];
  const checkLab = (r, file, kind, level) => {
    const at = `${file}: ${r && r.id ? 'lab ' + r.id : 'a lab'}`;
    if (!need(r && typeof r === 'object', `${file}: a lab entry is not an object.`)) return;
    need(isStr(r.id) && BC_ID_RX.test(r.id), `${at} has an id that is not a permanent lab id (1.01–9.08 or E1–E9).`);
    need(!seen.has(r.id), `${at} appears twice.`); seen.add(r.id);
    need(r.kind === kind, `${at} should have kind "${kind}".`);
    need(r.level === level, `${at} should be in level ${level}.`);
    need(isStr(r.title), `${at} has no title.`);
    for (const k of ['tasks', 'starter_files', 'validation_and_acceptance', 'scoring_dimensions', 'vendors', 'domains', 'related_quiz_domains']) need(isArr(r[k]), `${at}: "${k}" must be a list.`);
    need(r.failure_drill && typeof r.failure_drill === 'object', `${at} has no failure_drill object.`);
    need(['local-only', 'optional-cloud'].includes(r.cloud_mode), `${at} has an unknown cloud_mode.`);
    all.push(r);
  };
  if (need(isArr(D.labs) && D.labs.length === 9, 'Expected 9 lab files, one per level.')) D.labs.forEach((doc, i) => {
    const file = `bootcamp-labs-level-0${i + 1}.json`;
    if (need(doc && isArr(doc.labs) && doc.labs.length === 8, `${file}: expected 8 lab briefs.`)) doc.labs.forEach(r => checkLab(r, file, 'lab', i + 1));
  });
  const ex = D.exemplars && D.exemplars.exemplars;
  if (need(isArr(ex) && ex.length === 9, 'bootcamp-exemplars.json: expected 9 exemplars.')) ex.forEach((r, i) => checkLab(r, 'bootcamp-exemplars.json', 'exemplar', i + 1));
  if (isArr(levels)) for (const l of levels) for (const id of [...(l.lab_ids || []), l.exemplar_id]) need(seen.has(id), `bootcamp-levels.json: level ${l.level} lists ${id}, which is not in the lab files.`);
  const R = D.rubric || {};
  need(isArr(R.dimensions) && R.dimensions.length === 7 && R.dimensions.every(d => isStr(d.key) && isStr(d.tracker_field) && isStr(d.label)), 'bootcamp-rubric.json: expected 7 scoring dimensions with key, tracker_field and label.');
  need(R.gate && Number.isFinite(R.gate.min_total) && isArr(R.gate.no_zero_in), 'bootcamp-rubric.json: the gate needs min_total and no_zero_in.');
  need(R.tracker && isArr(R.tracker.columns) && JSON.stringify(R.tracker.statuses) === JSON.stringify(BC_STATUSES.map(s => s[0])), 'bootcamp-rubric.json: the tracker needs its columns and the five statuses.');
  const F = D.framework || {};
  need(F.operating_contract && isArr(F.operating_contract.items) && F.operating_contract.items.length === 6, 'bootcamp-framework.json: the operating contract needs its six items.');
  need(F.portfolio && isArr(F.portfolio.artifacts) && F.cost_and_teardown && isArr(F.cost_and_teardown.before_write), 'bootcamp-framework.json: portfolio guidance or the cost framework is missing.');
  const M = D.mapping || {};
  if (need(isArr(M.topics), 'bootcamp-cert-mapping.json: "topics" must be a list.')) for (const t of M.topics) {
    need(t && isStr(t.key) && isStr(t.label) && isArr(t.keywords) && isArr(t.labs), `bootcamp-cert-mapping.json: topic ${t && t.key || '?'} needs key, label, keywords and labs.`);
    for (const id of (t && t.labs) || []) need(seen.has(id), `bootcamp-cert-mapping.json: topic ${t.key} lists ${id}, which is not a lab.`);
  }
  return errs;
}
function bcContent() {
  if (BC) return BC;
  let errors; try { errors = bcCheckContent(BC_DOCS); } catch (e) { errors = ['The bootcamp content could not be read: ' + e.message]; }
  if (errors.length) { console.error('Bootcamp content failed its check:\n  ' + errors.join('\n  ')); return (BC = { ok: false, errors }); }
  const D = BC_DOCS; const ex = D.exemplars.exemplars; const labs = [];
  for (const l of D.levels.levels) { for (const id of l.lab_ids) labs.push(D.labs[l.level - 1].labs.find(r => r.id === id)); labs.push(ex.find(r => r.id === l.exemplar_id)); }
  const byId = new Map(labs.map(r => [r.id, r]));
  return (BC = { ok: true, errors: [], levels: D.levels.levels, labs, byId, rubric: D.rubric, framework: D.framework, mapping: D.mapping,
    dims: D.rubric.dimensions, domains: uniq(labs.flatMap(r => r.domains)).sort((a, b) => (BC_DOMAIN_LABEL[a] || a).localeCompare(BC_DOMAIN_LABEL[b] || b)) });
}
const bcLab = id => bcContent().ok ? BC.byId.get(id) || null : null;
const bcLevel = n => bcContent().ok ? BC.levels.find(l => l.level === n) || null : null;
/* Curriculum text keeps its inline `code` and **bold**: escape first, then add only those two tags. */
const bcInline = s => esc(s).replace(/`([^`]+)`/g, '<code>$1</code>').replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
const bcLabName = r => `${r.kind === 'exemplar' ? 'Exemplar ' + r.level : r.id} · ${r.title}`;
