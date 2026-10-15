#!/usr/bin/env node
/* Converts the bootcamp curriculum (content-src/bootcamp/Cloud_Architect_Operator_Bootcamp.md) into the
 * JSON content files in src/content/bootcamp/. Run it again after editing the markdown, the editorial
 * classification (content-src/bootcamp/classification.json) or the mapping (content-src/bootcamp/cert-mapping.json):
 *   node tools/bootcamp-extract.js
 * Text is copied from the document word for word. Fields the document does not give stay null or [];
 * nothing is filled in. The script stops with an error if the document's shape is not what it expects. */
const fs = require('fs'), path = require('path');
const ROOT = path.resolve(__dirname, '..'), IN = path.join(ROOT, 'content-src/bootcamp'), OUT = path.join(ROOT, 'src/content/bootcamp');
const md = fs.readFileSync(path.join(IN, 'Cloud_Architect_Operator_Bootcamp.md'), 'utf8').replace(/\r\n/g, '\n');
const CLASS = JSON.parse(fs.readFileSync(path.join(IN, 'classification.json'), 'utf8')).labs;
const MAP = JSON.parse(fs.readFileSync(path.join(IN, 'cert-mapping.json'), 'utf8'));
const lines = md.split('\n');
const die = msg => { console.error('bootcamp-extract: ' + msg); process.exit(1); };
const SCORING = ['correctness', 'security', 'resilience', 'operational_quality', 'cost', 'automation', 'communication'];

/* ---------- helpers */
const section = (start, end) => { const a = lines.findIndex(l => l.startsWith(start)); if (a < 0) die(`missing heading "${start}"`); let b = end ? lines.findIndex((l, i) => i > a && l.startsWith(end)) : lines.length; if (b < 0) b = lines.length; return lines.slice(a + 1, b); };
const cells = row => row.trim().replace(/^\|/, '').replace(/\|$/, '').split(/\s\|\s/).map(s => s.trim());
const tableRows = block => block.filter(l => l.startsWith('|')).slice(2).map(cells);
const cap = s => s ? s[0].toUpperCase() + s.slice(1) : s;
const stripDot = s => s.replace(/\.\s*$/, '').trim();
/* split on "; " outside backticks */
function splitTop(s, sep) { const out = []; let cur = '', tick = false; for (let i = 0; i < s.length; i++) { if (s[i] === '`') tick = !tick; if (!tick && s.startsWith(sep, i)) { out.push(cur); cur = ''; i += sep.length - 1; continue; } cur += s[i]; } out.push(cur); return out.map(x => x.trim()).filter(Boolean); }
/* sentences: split after . ! ? followed by space and a capital, backtick or quote, outside backticks */
function sentences(s) { const out = []; let cur = '', tick = false; for (let i = 0; i < s.length; i++) { const c = s[i]; cur += c; if (c === '`') tick = !tick; if (!tick && /[.!?]/.test(c) && s[i + 1] === ' ' && /[A-Z`“"(]/.test(s[i + 2] || '')) { out.push(cur.trim()); cur = ''; i++; } } if (cur.trim()) out.push(cur.trim()); return out; }
const slugify = s => s.toLowerCase().replace(/&/g, ' and ').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
const para = (block, label) => { const l = block.find(x => x.startsWith(`**${label}**`)); return l ? l.slice(label.length + 4).trim() : null; };

/* ---------- 1. roadmap → levels */
const roadmap = tableRows(section('## 1. Curriculum roadmap', '**Suggested pacing'));
if (roadmap.length !== 9) die(`expected 9 roadmap rows, found ${roadmap.length}`);
const structure = section('## 2. Directory structure', '## 3.').join('\n');
const levelDirs = {}; for (const m of structure.matchAll(/(0\d)-([a-z0-9-]+)\/[^\n]*?exemplar\/(\d\d-[a-z0-9-]+)/g)) levelDirs[+m[1]] = { dir: `${m[1]}-${m[2]}`, exemplar_dir: m[3] };
for (const m of structure.matchAll(/(0\d)-([a-z0-9-]+)\/ \(labs\/01\.\.08, exemplar\/(\d\d-[a-z0-9-]+)\)/g)) levelDirs[+m[1]] = { dir: `${m[1]}-${m[2]}`, exemplar_dir: m[3] };
const l1 = structure.match(/(01-[a-z-]+)\/\n[\s\S]*?labs\/(01-[a-z-]+)\/ \.\.\. labs\/(08-[a-z-]+)\/\n[\s\S]*?exemplar\/(01-[a-z0-9-]+)\//);
if (l1) levelDirs[1] = { dir: l1[1], exemplar_dir: l1[4], known_lab_dirs: { '1.01': l1[2], '1.08': l1[3] } };
for (let n = 1; n <= 9; n++) if (!levelDirs[n]) die(`no directory found for level ${n}`);

/* ---------- 5. catalog → lab briefs */
const catalogIntro = section('## 5. Lab catalog', '### Level 1').filter(Boolean).join(' ');
const labsByLevel = {}; const levelCatalogTitle = {};
for (let n = 1; n <= 9; n++) {
  const head = lines.find(l => l.startsWith(`### Level ${n} — `)); if (!head) die(`missing catalog heading for level ${n}`);
  levelCatalogTitle[n] = head.replace(`### Level ${n} — `, '').trim();
  const rows = tableRows(section(head, n < 9 ? `### Level ${n + 1} — ` : '## 6.'));
  if (rows.length !== 8) die(`level ${n}: expected 8 lab rows, found ${rows.length}`);
  labsByLevel[n] = rows.map(([c1, c2, c3, c4], i) => {
    if (c4 === undefined) die(`level ${n} row ${i + 1}: expected 4 columns`);
    const m = c1.match(/^(\d\.\d\d) ([^:]+): (.+)$/); if (!m) die(`cannot read lab id/title from "${c1.slice(0, 60)}"`);
    const [, id, title, rest] = m; if (id !== `${n}.0${i + 1}`) die(`unexpected id ${id} in level ${n}`);
    const sc = splitTop(rest, '; ');
    const clauses = splitTop(c2, '; '); const hasInject = clauses.some(c => /^(inject|induce)\b/i.test(c)); const isDrill = c => (hasInject ? /^(inject|induce)\b/i : /^simulate\b/i).test(c); /* "simulate" is the fault only when no clause injects one */
    const drill = clauses.filter(isDrill), tasks = clauses.filter(c => !isDrill(c));
    const known = levelDirs[n].known_lab_dirs?.[id]; const dirSlug = known || `0${i + 1}-${slugify(title)}`;
    return {
      id, slug: slugify(title), level: n, title, kind: 'lab', source_type: 'lab-brief',
      dir: `levels/${levelDirs[n].dir}/labs/${dirSlug}`, dir_source: known ? 'document' : 'derived-from-title',
      scenario: cap(stripDot(sc[0])) + '.', constraints: sc.length > 1 ? cap(stripDot(sc.slice(1).join('; '))) + '.' : null,
      learning_objectives: [], prerequisites_and_safety: [],
      starter_files: splitTop(c3, ', ').map(s => s.replace(/`/g, '')),
      tasks: tasks.map(t => cap(stripDot(t)) + '.'),
      failure_drill: { fault: drill.length ? drill.map(d => cap(stripDot(d))).join('; ') + '.' : null, safe_injection: null, expected_symptom: null, diagnosis_evidence: null, recovery: null, restore_baseline: null, steps: [] },
      deliverables: [], validation_and_acceptance: splitTop(c4, '; ').map(t => cap(stripDot(t)) + '.'), acceptance: null,
      cost_controls_and_cleanup: [],
      source_row: { scenario_and_constraints: c1, terminal_work_and_failure_drill: c2, starter_files: c3, validator_and_acceptance: c4 },
    };
  });
}

/* ---------- 6. exemplars */
const exIntro = section('## 6. Nine complete example labs', '### Exemplar 1').filter(Boolean).join(' ');
const exemplars = [];
for (let n = 1; n <= 9; n++) {
  const head = lines.find(l => l.startsWith(`### Exemplar ${n} — `)); if (!head) die(`missing exemplar ${n}`);
  const block = section(head, n < 9 ? `### Exemplar ${n + 1} — ` : '## 7.');
  const title = head.replace(`### Exemplar ${n} — `, '').trim();
  const t0 = block.indexOf('**Starter tree**'); const c0 = block.indexOf('```text', t0); const c1 = block.indexOf('```', c0 + 1);
  if (t0 < 0 || c0 < 0 || c1 < 0) die(`exemplar ${n}: starter tree not found`);
  const tree = block.slice(c0 + 1, c1); const rootDir = tree[0].trim().replace(/\/$/, '');
  if (!rootDir.endsWith('/exemplar/' + levelDirs[n].exemplar_dir)) die(`exemplar ${n}: tree root ${rootDir} does not match the directory structure`);
  const get = label => { const v = para(block, label); if (v === null) die(`exemplar ${n}: missing "${label}"`); return v; };
  const deliv = get('Deliverables.'); const [dPart, aPart] = deliv.split('**Acceptance:**').map(s => s && s.trim());
  const drill = sentences(get('Failure drill.'));
  exemplars.push({
    id: `E${n}`, slug: levelDirs[n].exemplar_dir.replace(/^\d\d-/, ''), level: n, title, kind: 'exemplar', source_type: 'exemplar',
    dir: rootDir, dir_source: 'document',
    scenario: get('Scenario and constraints.'), constraints: null,
    learning_objectives: [], prerequisites_and_safety: [],
    starter_tree: tree.join('\n'), starter_files: tree.slice(1).map(l => l.replace(/^[│├└─\s]+/, '').trim()).filter(Boolean),
    tasks: sentences(get('Build tasks.')),
    failure_drill: { fault: null, safe_injection: null, expected_symptom: null, diagnosis_evidence: null, recovery: null, restore_baseline: drill.filter(s => /^Restore\b/.test(s)).join(' ') || null, steps: drill },
    deliverables: stripDot(dPart).split(/, (?![^(]*\))/).map(s => cap(s.trim())),
    validation_and_acceptance: sentences(get('Validation and acceptance.')), acceptance: aPart ? cap(aPart) : null,
    cost_controls_and_cleanup: sentences(get('Cleanup/cost.')),
  });
}

/* ---------- classification + mapping → shared fields */
const topicsOf = id => MAP.topics.filter(t => t.labs.includes(id)).map(t => t.key);
const finish = r => { const c = CLASS[r.id]; if (!c) die(`no classification for ${r.id}`);
  const lv = roadmap[r.level - 1][0].replace(/^\d\.\s*/, '');
  return { id: r.id, slug: r.slug, level: r.level, level_title: lv, title: r.title, kind: r.kind, source_type: r.source_type, dir: r.dir, dir_source: r.dir_source,
    scenario: r.scenario, constraints: r.constraints, learning_objectives: r.learning_objectives, prerequisites_and_safety: r.prerequisites_and_safety,
    starter_files: r.starter_files, ...(r.starter_tree ? { starter_tree: r.starter_tree } : {}), tasks: r.tasks, failure_drill: r.failure_drill,
    deliverables: r.deliverables, validation_and_acceptance: r.validation_and_acceptance, acceptance: r.acceptance, cost_controls_and_cleanup: r.cost_controls_and_cleanup,
    scoring_dimensions: SCORING, cloud_required: false, cloud_mode: c.cloud_mode, vendors: c.vendors, domains: c.domains,
    portfolio_value: r.kind === 'exemplar' ? 'high' : 'standard', portfolio_categories: c.portfolio_categories,
    related_certs: null, related_quiz_domains: topicsOf(r.id), ...(r.source_row ? { source_row: r.source_row } : {}) }; };
for (const id of Object.keys(CLASS)) if (!/^E\d$/.test(id) && !labsByLevel[+id[0]].some(l => l.id === id) || /^E\d$/.test(id) && !exemplars.some(e => e.id === id)) die(`classification lists unknown lab ${id}`);
const allIds = new Set([...Object.values(labsByLevel).flat().map(l => l.id), ...exemplars.map(e => e.id)]);
for (const t of MAP.topics) for (const id of t.labs) if (!allIds.has(id)) die(`mapping topic ${t.key} lists unknown lab ${id}`);
for (const [k, ids] of Object.entries(MAP.vendor_labs)) if (k !== '_about') for (const id of ids) if (!allIds.has(id)) die(`mapping vendor ${k} lists unknown lab ${id}`);

/* ---------- levels */
const levels = roadmap.map(([lv, outcome, tools, evidence], i) => { const n = i + 1; const ex = exemplars[i];
  return { level: n, title: lv.replace(/^\d\.\s*/, ''), catalog_title: levelCatalogTitle[n], outcome, main_tools: splitTop(tools, ', ').map(s => s.replace(/`/g, '')),
    promotion_evidence: (p => p.length > 1 ? p : splitTop(evidence, ', '))(splitTop(evidence, '; ')), dir: `levels/${levelDirs[n].dir}`, lab_ids: labsByLevel[n].map(l => l.id), exemplar_id: ex.id, exemplar_title: ex.title, lab_brief_count: labsByLevel[n].length }; });

/* ---------- rubric (section 4) */
const s4 = section('## 4. Scoring rubric', '## 5.'); const s4t = s4.join('\n');
const scale = s4.find(l => l.startsWith('Score each dimension'));
const levelsText = [...scale.matchAll(/\*\*(\d)\*\* ([^;.]+)/g)].map(m => ({ score: +m[1], meaning: m[2].trim() }));
if (levelsText.length !== 5) die('rubric: expected 5 score meanings');
const dimRows = tableRows(s4.slice(s4.findIndex(l => l.startsWith('| Dimension'))));
const KEY = { Correctness: ['correctness', 'score_correctness'], Security: ['security', 'score_security'], Resilience: ['resilience', 'score_resilience'], 'Operational quality': ['operational_quality', 'score_operations'], Cost: ['cost', 'score_cost'], Automation: ['automation', 'score_automation'], Communication: ['communication', 'score_communication'] };
const dims = dimRows.filter(r => KEY[r[0]]).map(([label, ev]) => ({ key: KEY[label][0], tracker_field: KEY[label][1], label, evidence_to_inspect: ev }));
if (dims.length !== 7) die('rubric: expected 7 dimensions');
const csvHeader = s4t.match(/```csv\n([^\n]+)\n([^\n]+)\n```/); if (!csvHeader) die('rubric: tracker csv not found');
const statusLine = s4.find(l => l.startsWith('Statuses:'));
const rubric = {
  scale: { min: 0, max: 4, meanings: levelsText }, dimensions: dims, max_total: 28,
  gate: { min_total: 20, no_zero_in: ['security', 'cost'], all_acceptance_tests_pass: true, text: scale.slice(scale.indexOf('Suggested gate')).replace(/\s*A numerical score.*$/, ''), note: 'A numerical score never overrides an unsafe deployment.' },
  tracker: { file: 'progress/tracker.csv', columns: csvHeader[1].split(','), example_row: csvHeader[2], statuses: [...statusLine.matchAll(/`([a-z-]+)`/g)].map(m => m[1]), privacy_note: statusLine.replace(/^Statuses:[^.]+\.\s*/, '') },
};
if (rubric.tracker.statuses.join() !== 'not-started,in-progress,blocked,passed,rework') die('rubric: unexpected statuses ' + rubric.tracker.statuses);

/* ---------- framework: contract, safety, template, validation, cost, portfolio */
const s0 = section('## Operating contract', '## 1.');
const contract = s0.filter(l => /^\d\. /.test(l)).map(l => l.replace(/^\d\. /, ''));
if (contract.length !== 6) die('operating contract: expected 6 items');
const s7 = section('## 7. Automated validation', '## 8.'); const s8 = section('## 8. Cloud cost-control', '## 9.'); const s9 = section('## 9. Hiring-manager', null);
const codeBlock = block => { const a = block.findIndex(l => l.startsWith('```')); const b = block.findIndex((l, i) => i > a && l.startsWith('```')); return block.slice(a + 1, b).join('\n'); };
const after = (block, prefix) => cap((block.find(l => l.startsWith(prefix)) || '').slice(prefix.length).trim());
const PF = { 'Architecture case study': 'case-study', 'Working repository': 'repository', 'Security evidence': 'security', 'Operations evidence': 'operations', 'Platform artifact': 'platform', 'Multi-cloud judgment': 'multicloud', 'Leadership samples': 'leadership', 'Evidence index': 'evidence-index' };
const portfolio = s9.filter(l => l.startsWith('- **')).map(l => { const m = l.match(/^- \*\*([^:]+):\*\* (.+)$/); if (!m || !PF[m[1]]) die('portfolio: cannot read ' + l.slice(0, 40)); return { key: PF[m[1]], title: m[1], guidance: m[2] }; });
const story = (s9.find(l => l.startsWith('A strong portfolio story')) || '').match(/\*\*(.+)\*\*/);
const framework = {
  title: lines[0].replace(/^# /, ''), tagline: lines[2].replace(/\*\*/g, ''), purpose: lines[4], scope_note: lines[6].replace(/^> \*\*Scope note:\*\* /, ''),
  operating_contract: { intro: s0.find(l => l.startsWith('Each lab begins')), items: contract, acceptance_gate: after(s0, '**Standard acceptance gate:**'), safety: after(s0, '**Safety:**') },
  pacing: after(section('## 1. Curriculum roadmap', '## 2.'), '**Suggested pacing:**'),
  directory_structure: codeBlock(section('## 2. Directory structure', '## 3.')), directory_note: section('## 2. Directory structure', '## 3.').find(l => l.startsWith('Each `labs/')),
  lab_readme_template: codeBlock(section('## 3. Lab README template', '## 4.')),
  catalog_note: catalogIntro, exemplar_note: exIntro,
  validation: { intro: s7.find(l => l.startsWith('The catalog')), makefile: codeBlock(s7), layers_and_rules: s7.find(l => l.startsWith('Validation layers')) },
  cost_and_teardown: { before_write: s8.filter(l => l.startsWith('- ')).map(l => l.slice(2)), apply_operate: after(s8, '**Apply/operate:**'), teardown: after(s8, '**Teardown:**'), guard_scripts: after(s8, '**Optional shared guard script contract:**') },
  portfolio: { intro: s9.find(l => l.startsWith('Publish')), artifacts: portfolio, story_questions: story ? sentences(story[1]) : [] },
};
for (const [k, v] of Object.entries({ gate: framework.operating_contract.acceptance_gate, safety: framework.operating_contract.safety, pacing: framework.pacing, apply: framework.cost_and_teardown.apply_operate, teardown: framework.cost_and_teardown.teardown })) if (!v) die(`framework: ${k} not found`);
if (portfolio.length !== 8) die('portfolio: expected 8 artifact kinds');

/* ---------- write */
fs.mkdirSync(OUT, { recursive: true });
const SOURCE = { document: 'content-src/bootcamp/Cloud_Architect_Operator_Bootcamp.md', generated_by: 'tools/bootcamp-extract.js' };
const write = (name, obj) => { const s = JSON.stringify(obj, null, 1) + '\n'; if (/\\u[0-9a-fA-F]{4}/.test(s)) die(`${name} would contain a \\u escape`); fs.writeFileSync(path.join(OUT, name), s); return s.length; };
let bytes = 0;
bytes += write('bootcamp-levels.json', { ...SOURCE, levels });
for (let n = 1; n <= 9; n++) bytes += write(`bootcamp-labs-level-0${n}.json`, { ...SOURCE, level: n, labs: labsByLevel[n].map(finish) });
bytes += write('bootcamp-exemplars.json', { ...SOURCE, exemplars: exemplars.map(finish) });
bytes += write('bootcamp-rubric.json', { ...SOURCE, ...rubric });
bytes += write('bootcamp-framework.json', { ...SOURCE, ...framework });
bytes += write('bootcamp-cert-mapping.json', { source: 'content-src/bootcamp/cert-mapping.json', ...MAP });
console.log(`Wrote 14 files to src/content/bootcamp (${Math.round(bytes / 1024)} KB): 9 levels, ${Object.values(labsByLevel).flat().length} lab briefs, ${exemplars.length} exemplars.`);
