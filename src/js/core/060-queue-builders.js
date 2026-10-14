/* ------------------------------------------------------------------ Queue builders */
function blueprintSample(code, n, diffs) {
  const ex = examMetaFor(code); let pool = examQs(code).filter(q => diffs.includes(q.difficulty));
  if (!pool.length) return [];
  n = Math.min(n, pool.length);
  const byD = new Map(); for (const q of pool) { const k = String(q.domain_number); (byD.get(k) || byD.set(k, []).get(k)).push(q.id); }
  const w = ex && Object.keys(ex.domain_weights || {}).length ? ex.domain_weights : Object.fromEntries([...byD.keys()].map(k => [k, 1]));
  const keys = [...byD.keys()]; const tw = keys.reduce((s, k) => s + (w[k] || 0), 0) || keys.length;
  const alloc = keys.map(k => { const exact = n * (w[k] || (tw === keys.length ? 1 : 0)) / tw; return { k, n: Math.min(Math.floor(exact), byD.get(k).length), rem: exact % 1 }; });
  let left = n - alloc.reduce((s, a) => s + a.n, 0);
  for (const a of alloc.sort((x, y) => y.rem - x.rem)) { if (left <= 0) break; if (a.n < byD.get(a.k).length) { a.n++; left--; } }
  let picked = alloc.flatMap(a => shuffle(byD.get(a.k)).slice(0, a.n));
  if (picked.length < n) { const rest = shuffle(pool.map(q => q.id).filter(id => !picked.includes(id))); picked = picked.concat(rest.slice(0, n - picked.length)); }
  return shuffle(picked);
}
function masteryQueue(code, n) {
  const pool = allQ().filter(q => !code || q.exam_code === code).map(q => q.id);
  const low = shuffle(pool.filter(id => S.progress.confidence[id] === 'low'));
  const missed = shuffle(pool.filter(id => isMissed(id) && !low.includes(id)));
  const unseen = shuffle(pool.filter(id => !isSeen(id) && !low.includes(id)));
  const medium = shuffle(pool.filter(id => S.progress.confidence[id] === 'medium' && !low.includes(id) && !missed.includes(id) && isSeen(id)));
  return uniq([...low, ...missed, ...unseen, ...medium]).slice(0, n);
}
function reviewPool(f = S.ui.review) {
  let ids = allQ().filter(q => (!f.exam || q.exam_code === f.exam) && (!f.domain || q.domain === f.domain) && (!f.subdomain || q.subdomain === f.subdomain) && (!f.service || q.services.includes(f.service))).map(q => q.id);
  if (f.source === 'missed') ids = ids.filter(isMissed);
  else if (f.source === 'flagged') ids = ids.filter(id => S.progress.flags.has(id));
  else if (f.source === 'low') ids = ids.filter(id => S.progress.confidence[id] === 'low');
  if (f.sort === 'recent') ids.sort((a, b) => (lastAttempt(b)?.t || 0) - (lastAttempt(a)?.t || 0));
  else ids.sort((a, b) => { const qa = Q(a), qb = Q(b); return qa.exam_code.localeCompare(qb.exam_code) || qa.domain_number - qb.domain_number || qa.subdomain.localeCompare(qb.subdomain, undefined, { numeric: true }); });
  return ids;
}

