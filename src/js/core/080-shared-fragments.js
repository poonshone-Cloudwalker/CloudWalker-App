/* ------------------------------------------------------------------ Shared fragments */
const opts = (arr, sel, all) => (all != null ? `<option value="">${esc(all)}</option>` : '') + arr.map(a => { const [v, l] = Array.isArray(a) ? a : [a, a]; return `<option value="${esc(v)}" ${String(v) === String(sel) ? 'selected' : ''}>${esc(l)}</option>`; }).join('');
const examOpts = (sel, all = 'All certifications') => opts(activeExams().map(e => [e.code, `${e.code} — ${e.vendor}`]), sel, all);
function metric(name, cor, att, sub) {
  const a = pct(cor, att); const cls = !att ? '' : a >= 80 ? 'good' : a >= 60 ? 'warn' : 'bad';
  return `<div class="metric"><span class="name" title="${esc(name)}">${esc(name)}</span><span class="val">${att ? a + '%' : '—'} <span class="faint">${sub ?? `(${cor}/${att})`}</span></span><div class="bar ${cls}" role="img" aria-label="${esc(name)}: ${att ? a + '% correct' : 'not attempted'}"><i style="width:${a}%"></i></div></div>`;
}
function blueprintStrip(code, tall) {
  const ex = examMetaFor(code); const qs = examQs(code); const ds = domainsOf(code);
  const segs = ds.map(d => {
    const dq = qs.filter(q => q.domain === d); const n = dq[0].domain_number;
    const w = (ex.domain_weights || {})[n] || dq.length; const seen = dq.filter(q => isSeen(q.id)).length;
    return { d, w, cov: pct(seen, dq.length) };
  });
  const label = segs.map(s => `${s.d}: ${s.w}% of exam, ${s.cov}% practiced`).join('; ');
  return `<div class="bp ${tall ? 'tall' : ''}" role="img" aria-label="Blueprint coverage. ${esc(label)}">${segs.map(s => `<span class="seg" style="flex:${s.w}" title="${esc(s.d)}"><i style="width:${s.cov}%"></i></span>`).join('')}</div>`;
}
function diffBar(qs) {
  const c = { easy: 0, medium: 0, hard: 0 }; qs.forEach(q => c[q.difficulty]++); const t = qs.length || 1;
  return `<div class="diffbar" role="img" aria-label="Difficulty: ${c.easy} easy, ${c.medium} medium, ${c.hard} hard">${DIFFS.map(d => `<span class="d-${d}" style="width:${c[d] / t * 100}%"></span>`).join('')}</div><div class="small muted" style="margin-top:4px">${DIFFS.filter(d => c[d]).map(d => `${c[d]} ${d}`).join(', ')}</div>`;
}
function emptyState(title, body, actions = '') { return `<div class="empty"><h3>${esc(title)}</h3><p>${esc(body)}</p>${actions ? `<div class="row">${actions}</div>` : ''}</div>`; }
function lastSessionFor(code) { return [...S.progress.sessions].reverse().find(s => s.exam === code || (s.ids || []).some(id => Q(id)?.exam_code === code)); }

