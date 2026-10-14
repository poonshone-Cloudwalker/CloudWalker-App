const CLOUD_LABEL = { gcp: 'Google Cloud', azure: 'Azure', aws: 'AWS', neutral: 'Vendor-neutral' };
S.p5 = { q: '', cloud: '', exam: '', domain: '', limit: 60, xq: '' };
function ensureGlossary() { S.ws.glossary ||= { terms: [], cross_cloud: [] }; S.ws.glossary.terms ||= []; S.ws.glossary.cross_cloud ||= []; }
ensureGlossary();
let GL_CACHE = null, GL_KEY = '', GL_REF = null;
function glTerms() {
  const key = S.ws.glossary.terms.length + ':' + (S.ws.glossary._v || 0);
  if (GL_CACHE && GL_KEY === key && GL_REF === S.ws.glossary) return GL_CACHE; GL_REF = S.ws.glossary;
  const m = new Map((GLOSSARY_SEED?.terms || []).map(t => [t.id, t])); S.ws.glossary.terms.forEach(t => m.set(t.id, t));
  GL_CACHE = [...m.values()].sort((a, b) => a.term.localeCompare(b.term, undefined, { sensitivity: 'base' })); GL_KEY = key; return GL_CACHE;
}
function glCross() { const m = new Map((GLOSSARY_SEED?.cross_cloud || []).map(r => [r.function, r])); S.ws.glossary.cross_cloud.forEach(r => m.set(r.function, r)); return [...m.values()]; }
const glById = id => glTerms().find(t => t.id === id);
const glByName = name => glTerms().find(t => t.term.toLowerCase() === String(name).toLowerCase() || (t.aliases || []).some(a => a.toLowerCase() === String(name).toLowerCase()));
function glMatch(t, q) {
  if (!q) return 1; const s = q.toLowerCase();
  if (t.term.toLowerCase() === s || (t.acronym || '').toLowerCase() === s) return 100;
  if (t.term.toLowerCase().startsWith(s)) return 60;
  if ((t.aliases || []).some(a => a.toLowerCase().includes(s))) return 50;
  if (t.term.toLowerCase().includes(s)) return 40;
  if (t.definition.toLowerCase().includes(s)) return 10;
  return 0;
}
function glFiltered() {
  const P = S.p5; const q = P.q.trim();
  return glTerms().map(t => [t, glMatch(t, q)]).filter(([t, sc]) => sc > 0 && (!P.cloud || t.clouds.includes(P.cloud)) && (!P.exam || t.exams.includes(P.exam)) && (!P.domain || t.domains.includes(P.domain)))
    .sort((a, b) => b[1] - a[1] || a[0].term.localeCompare(b[0].term)).map(x => x[0]);
}
const glDomains = () => uniq(glTerms().flatMap(t => t.domains)).sort();
function glCard(t, compact) {
  const rel = (t.related || []).map(n => glByName(n)).filter(Boolean);
  return `<article class="gl-card">
    <div class="gl-head"><a class="gl-term" href="#/glossary/term/${esc(t.id)}">${esc(t.term)}</a>${t.acronym && t.acronym !== t.term ? `<span class="chip strong">${esc(t.acronym)}</span>` : ''}<span class="spacer"></span>${t.clouds.map(c => `<span class="chip cl-${c}">${CLOUD_LABEL[c] || esc(c)}</span>`).join('')}</div>
    <p class="gl-def">${esc(t.definition)}</p>
    <div class="gl-meta small"><span>${t.exams.map(esc).join(' · ')}</span>${t.domains.length ? `<span class="faint"> · ${t.domains.map(esc).join(', ')}</span>` : ''}</div>
    ${!compact && t.aliases?.length ? `<p class="small muted gl-alias">Also called: ${t.aliases.map(esc).join(', ')}</p>` : ''}
    ${!compact && rel.length ? `<div class="gl-rel"><span class="small muted">Related:</span> ${rel.map(r => `<a class="chip linkchip" href="#/glossary/term/${esc(r.id)}">${esc(r.term)}</a>`).join(' ')}</div>` : ''}
  </article>`;
}
function glResultsHtml() {
  const list = glFiltered(); const shown = list.slice(0, S.p5.limit);
  return `<p class="small muted" style="margin:0 0 10px">${list.length} term${list.length === 1 ? '' : 's'}${S.p5.q ? ` matching “${esc(S.p5.q)}”` : ''}</p>
    ${shown.length ? `<div class="gl-list">${shown.map(t => glCard(t)).join('')}</div>` : emptyState('No matching terms', 'Try a shorter search, an acronym, or clear a filter.', '<button class="btn" data-action="x5-clear">Clear filters</button>')}
    ${list.length > shown.length ? `<div class="row" style="margin-top:14px"><button class="btn" data-action="x5-more">Show ${Math.min(60, list.length - shown.length)} more</button></div>` : ''}`;
}
function glQuestions(t) {
  const names = [t.term, t.acronym, ...(t.aliases || [])].filter(n => n && n.length >= 3 && !/\s(vs\.|and|or)\s/.test(n));
  if (!names.length) return [];
  const rx = new RegExp('(?<![\\w-])(' + names.map(n => n.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|') + ')(?![\\w-])');
  const fam = new Set(t.clouds.includes('neutral') ? (t.exams.length ? t.exams.filter(x => examMetaFor(x)) : ['SY0-701']) : t.exams.length ? activeExams().filter(e => t.exams.includes(e.code) || (t.clouds.includes('gcp') && e.vendor === 'Google Cloud') || (t.clouds.includes('azure') && e.vendor === 'Microsoft Azure') || (t.clouds.includes('aws') && e.vendor === 'AWS')).map(e => e.code) : []);
  return allQ().filter(q => fam.has(q.exam_code) && (rx.test(q.question) || rx.test(q.options[q.correct_index]))).map(q => q.id);
}
VIEWS.glossary = (arg = '') => {
  const [tab = 'terms', id] = arg.split('/');
  if (tab === 'term' && id) return glTermView(id);
  const P = S.p5; const ex = activeExams();
  return `<div class="page-head"><div><h1>Glossary</h1><p class="muted">${glTerms().length} key terms across your ${ex.length} certifications, with cross-cloud equivalents. Search by name, acronym, or old product name.</p></div><div class="row"><button class="btn" data-action="x5-export">Export glossary (.json)</button><button class="btn" data-action="ws-import">Import glossary (.json)</button></div></div>
  <nav class="tabs" aria-label="Glossary sections">${[['terms', 'Terms'], ['cross', 'Cross-cloud equivalents']].map(([k, l]) => `<a href="#/glossary/${k}" ${tab === k ? 'aria-current="page"' : ''}>${l}</a>`).join('')}</nav>
  <div style="margin-top:16px">${tab === 'cross' ? glCrossView() : `
    <section class="card gl-filters">
      <div class="field"><label for="gl-q">Search terms</label><input id="gl-q" type="search" value="${esc(P.q)}" placeholder="e.g. Spanner, PIM, VPC-SC, Vertex AI" autocomplete="off" autocapitalize="none" spellcheck="false" enterkeyhint="search"></div>
      <div class="row gl-chips" role="group" aria-label="Cloud">${[['', 'All clouds'], ['gcp', 'Google Cloud'], ['azure', 'Azure'], ['aws', 'AWS'], ['neutral', 'Vendor-neutral']].map(([k, l]) => `<button class="chip" data-action="x5-cloud" data-v="${k}" aria-pressed="${P.cloud === k}">${l}</button>`).join('')}</div>
      <div class="grid g-2"><div class="field"><label for="gl-exam">Certification</label><select id="gl-exam" data-p5="exam">${opts([['', 'All certifications'], ...ex.map(e => [e.code, `${e.code} · ${e.name}`])], P.exam)}</select></div>
      <div class="field"><label for="gl-dom">Domain</label><select id="gl-dom" data-p5="domain">${opts([['', 'All domains'], ...glDomains().map(d => [d, d])], P.domain)}</select></div></div>
    </section>
    <div id="gl-results" style="margin-top:16px" aria-live="polite">${glResultsHtml()}</div>`}</div>`;
};
function glTermView(id) {
  const t = glById(id); if (!t) return emptyState('Term not found', 'It may have come from an import that is not loaded in this tab.', '<a class="btn" href="#/glossary">Glossary</a>');
  const rel = (t.related || []).map(n => glByName(n)).filter(Boolean);
  const names = [t.term, t.acronym, ...(t.aliases || [])].filter(Boolean).map(s => s.toLowerCase());
  const cross = glCross().filter(r => [r.gcp, r.azure, r.aws, r.function].some(v => v && names.some(n => n.length >= 3 && v.toLowerCase().split(/,|\//).map(x => x.trim()).some(x => x === n || x.startsWith(n + ' ')))));
  const qs = glQuestions(t);
  return `<div class="run-head"><a class="btn sm ghost" href="#/glossary">← Glossary</a><span class="title">${esc(t.term)}</span></div>
  ${glCard(t)}
  <p class="small muted" style="margin:8px 2px 0">Source: ${esc(t.source_section || 'imported')} · id <code>${esc(t.id)}</code></p>
  ${cross.length ? `<section class="card" style="margin-top:16px"><h2>Equivalents on other clouds</h2><div class="cmp-wrap"><table><thead><tr><th scope="col">Function</th><th scope="col">Google Cloud</th><th scope="col">Azure</th><th scope="col">AWS</th></tr></thead><tbody>${cross.map(r => `<tr><td><strong>${esc(r.function)}</strong>${r.notes ? `<div class="small muted">${esc(r.notes)}</div>` : ''}</td><td>${esc(r.gcp)}</td><td>${esc(r.azure)}</td><td>${esc(r.aws)}</td></tr>`).join('')}</tbody></table></div></section>` : ''}
  ${rel.length ? `<section class="card" style="margin-top:16px"><h2>Related terms</h2><div class="gl-list">${rel.map(r => glCard(r, true)).join('')}</div></section>` : ''}
  <section class="card" style="margin-top:16px"><h2>Practice with this term</h2>${qs.length ? `<p class="small muted" style="margin-bottom:10px">${qs.length} question${qs.length === 1 ? '' : 's'} in your bank mention ${esc(t.term)} in the scenario or the correct answer.</p><div class="row"><button class="btn primary" data-action="x5-practice" data-id="${esc(t.id)}">Practice ${Math.min(qs.length, 20)} question${qs.length === 1 ? '' : 's'}</button></div>` : '<p class="small muted">No questions in the bank name this term directly. Search the Question library for related wording.</p>'}</section>`;
}
function glCrossView() {
  const q = S.p5.xq.trim().toLowerCase(); const rows = glCross().filter(r => !q || Object.values(r).some(v => String(v).toLowerCase().includes(q)));
  return `<section class="card gl-filters"><div class="field"><label for="gl-xq">Search equivalents</label><input id="gl-xq" type="search" value="${esc(S.p5.xq)}" placeholder="e.g. Spanner, ExpressRoute, KMS" autocomplete="off" autocapitalize="none" spellcheck="false"></div></section>
  <div id="gl-xresults" style="margin-top:16px">${glCrossTable(rows)}</div>`;
}
const glCrossTable = rows => rows.length ? `<div class="cmp-wrap card" style="padding:0"><table class="gl-x"><thead><tr><th scope="col">Function</th><th scope="col">Google Cloud</th><th scope="col">Azure</th><th scope="col">AWS</th><th scope="col">Notes</th></tr></thead><tbody>${rows.map(r => `<tr><th scope="row">${esc(r.function)}</th>${['gcp', 'azure', 'aws'].map(k => { const hit = glByName(String(r[k]).split(',')[0].trim()); return `<td>${hit ? `<a href="#/glossary/term/${esc(hit.id)}">${esc(r[k])}</a>` : esc(r[k] || '—')}</td>`; }).join('')}<td class="small muted">${esc(r.notes || '')}</td></tr>`).join('')}</tbody></table></div><p class="small muted" style="margin-top:8px">Equivalents are close, not identical. Check limits and pricing before treating them as drop-in replacements.</p>` : emptyState('No matching rows', 'Try another service name.');

/* ---------- Import / export in the user's schema */
const GL_CLOUDS = ['gcp', 'azure', 'aws', 'neutral'];
function glValidateTerm(t) {
  const e = [];
  if (!t || typeof t !== 'object') return ['not a record'];
  if (typeof t.id !== 'string' || !/^[a-z0-9][a-z0-9-]{1,80}$/.test(t.id)) e.push('"id" must be lowercase letters, digits, and hyphens');
  if (typeof t.term !== 'string' || !t.term.trim()) e.push('missing required field "term"');
  if (typeof t.definition !== 'string' || !t.definition.trim()) e.push('missing required field "definition"');
  for (const k of ['clouds', 'exams', 'domains', 'aliases', 'related']) if (t[k] !== undefined && (!Array.isArray(t[k]) || t[k].some(x => typeof x !== 'string'))) e.push(`"${k}" should be a list of text`);
  if (Array.isArray(t.clouds) && t.clouds.some(c => !GL_CLOUDS.includes(c))) e.push(`"clouds" values must be ${GL_CLOUDS.join(', ')}`);
  for (const k of ['acronym', 'source_section']) if (t[k] !== undefined && typeof t[k] !== 'string') e.push(`"${k}" should be text`);
  return e;
}
const glNorm = t => ({ id: t.id, term: t.term.trim(), acronym: t.acronym || '', clouds: t.clouds || [], exams: t.exams || [], domains: t.domains || [], definition: t.definition.trim(), aliases: t.aliases || [], related: t.related || [], source_section: t.source_section || 'Imported' });
function glossaryImport(data) {
  snapshot('Before glossary import'); ensureGlossary();
  const rep = { added: 0, updated: 0, unchanged: 0, rejected: 0, errors: [], warnings: [] };
  const known = new Set(activeExams().map(e => e.code)); const seen = new Set();
  const cur = new Map(glTerms().map(t => [t.id, t])); const ws = new Map(S.ws.glossary.terms.map(t => [t.id, t]));
  (Array.isArray(data.terms) ? data.terms : []).forEach((t, i) => {
    const errs = glValidateTerm(t); if (t && seen.has(t.id)) errs.push('duplicate id in this file');
    if (errs.length) { rep.rejected++; rep.errors.push(`term ${t?.id || '#' + (i + 1)}: ${errs.join('; ')}`); return; }
    seen.add(t.id); const n = glNorm(t);
    (n.exams || []).filter(x => !known.has(x)).forEach(x => rep.warnings.push(`term ${n.id}: exam "${x}" is not loaded in this app (kept as text)`));
    const ex = cur.get(n.id);
    if (!ex) rep.added++; else if (JSON.stringify(ex) === JSON.stringify(n)) { rep.unchanged++; return; } else rep.updated++;
    ws.set(n.id, n);
  });
  if (data.terms !== undefined && !Array.isArray(data.terms)) rep.errors.push('"terms" should be a list');
  const cx = new Map(S.ws.glossary.cross_cloud.map(r => [r.function, r]));
  (Array.isArray(data.cross_cloud) ? data.cross_cloud : []).forEach((r, i) => {
    if (!r || typeof r.function !== 'string' || !r.function.trim()) { rep.rejected++; rep.errors.push(`cross_cloud #${i + 1}: missing required field "function"`); return; }
    if (!['gcp', 'azure', 'aws'].some(k => typeof r[k] === 'string' && r[k].trim())) { rep.rejected++; rep.errors.push(`cross_cloud "${r.function}": needs at least one of gcp, azure, aws`); return; }
    const n = { function: r.function.trim(), gcp: r.gcp || '', azure: r.azure || '', aws: r.aws || '', notes: r.notes || '' };
    const ex = glCross().find(x => x.function === n.function);
    if (!ex) rep.added++; else if (JSON.stringify(ex) === JSON.stringify(n)) { rep.unchanged++; return; } else rep.updated++;
    cx.set(n.function, n);
  });
  S.ws.glossary.terms = [...ws.values()]; S.ws.glossary.cross_cloud = [...cx.values()]; S.ws.glossary._v = (S.ws.glossary._v || 0) + 1; GL_CACHE = null;
  S.meta2.lastImport = Date.now(); markDirty();
  return { ok: rep.rejected === 0, title: rep.rejected ? `Glossary imported with ${rep.rejected} rejected entr${rep.rejected === 1 ? 'y' : 'ies'}.` : 'Glossary imported.', body: `${rep.added} added, ${rep.updated} updated, ${rep.unchanged} unchanged, ${rep.rejected} rejected. Changes are kept in this workspace; save it to keep them.`, list: [...rep.errors, ...rep.warnings] };
}
const _smartImport5 = smartImport;
smartImport = data => (data && typeof data === 'object' && !data.format && (Array.isArray(data.terms) || Array.isArray(data.cross_cloud))) ? glossaryImport(data) : _smartImport5(data);
function glossaryExport() {
  const out = { terms: glTerms().map(({ id, term, acronym, clouds, exams, domains, definition, aliases, related, source_section }) => ({ id, term, acronym, clouds, exams, domains, definition, aliases, related, source_section })), cross_cloud: glCross().map(({ function: fn, gcp, azure, aws, notes }) => ({ function: fn, gcp, azure, aws, notes })) };
  const name = `cloudwalker-glossary-${stamp()}.json`; download(name, out); S.ws.exportLog.push({ t: Date.now(), kind: 'glossary', file: name, count: out.terms.length }); showStatus(`Exported ${out.terms.length} terms and ${out.cross_cloud.length} cross-cloud rows.`);
}

/* ---------- Events: search updates results in place so the keyboard stays open on tablets */
document.addEventListener('input', e => {
  const el = e.target;
  if (el.id === 'gl-q') { S.p5.q = el.value; S.p5.limit = 60; const box = $('#gl-results'); if (box) box.innerHTML = glResultsHtml(); }
  if (el.id === 'gl-xq') { S.p5.xq = el.value; const q = el.value.trim().toLowerCase(); const box = $('#gl-xresults'); if (box) box.innerHTML = glCrossTable(glCross().filter(r => !q || Object.values(r).some(v => String(v).toLowerCase().includes(q)))); }
});
document.addEventListener('change', e => { const el = e.target; if (el.dataset.p5) { S.p5[el.dataset.p5] = el.value; S.p5.limit = 60; render(); $('#' + el.id)?.focus(); } });
document.addEventListener('click', e => {
  const b = e.target.closest('[data-action]'); if (!b) return; const d = b.dataset;
  const fx = {
    'x5-cloud': () => { S.p5.cloud = d.v; S.p5.limit = 60; render(); },
    'x5-more': () => { S.p5.limit += 60; const box = $('#gl-results'); if (box) box.innerHTML = glResultsHtml(); },
    'x5-clear': () => { Object.assign(S.p5, { q: '', cloud: '', exam: '', domain: '', limit: 60 }); render(); },
    'x5-export': glossaryExport,
    'x5-practice': () => { const t = glById(d.id); const ids = shuffle(glQuestions(t)).slice(0, 20); startRunner({ title: `Glossary: ${t.term}`, mode: 'learn', ids, reveal: 'immediate' }); }
  };
  if (fx[d.action]) { e.preventDefault(); fx[d.action](); }
});

