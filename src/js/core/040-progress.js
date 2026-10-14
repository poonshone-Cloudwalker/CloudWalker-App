/* ------------------------------------------------------------------ Progress */
const attempts = id => S.progress.answers[id] || [];
const lastAttempt = id => { const a = attempts(id); return a[a.length - 1]; };
const isMissed = id => { const l = lastAttempt(id); return !!l && !l.correct; };
const isSeen = id => attempts(id).length > 0;
function record(id, choice, mode, ms) {
  const q = Q(id); const correct = choice === q.correct_index;
  (S.progress.answers[id] ||= []).push({ t: Date.now(), choice, correct, mode, ms: Math.round(ms || 0) });
  const s = S.session; s.answered++;
  if (correct) { s.correct++; s.streak++; s.best = Math.max(s.best, s.streak); } else s.streak = 0;
  renderSessionMini(); srsOnAnswer(id, correct);
  return correct;
}
function agg(filter = () => true, keyFn) {
  const m = new Map();
  for (const [id, arr] of Object.entries(S.progress.answers)) {
    const q = Q(id); if (!q || !filter(q)) continue;
    const keys = [].concat(keyFn(q));
    for (const k of keys) { const r = m.get(k) || { att: 0, cor: 0, miss: 0, ids: new Set() }; for (const a of arr) { r.att++; a.correct ? r.cor++ : r.miss++; } r.ids.add(id); m.set(k, r); }
  }
  return m;
}
function totals(filter = () => true) {
  let att = 0, cor = 0, uniqSeen = 0;
  for (const [id, arr] of Object.entries(S.progress.answers)) { const q = Q(id); if (!q || !filter(q)) continue; uniqSeen++; for (const a of arr) { att++; if (a.correct) cor++; } }
  return { att, cor, uniqSeen, acc: pct(cor, att) };
}
function weakDomains(n = 5, min = 3) {
  const m = agg(() => true, q => q.exam_code + '||' + q.domain);
  return [...m.entries()].filter(([, r]) => r.att >= min).map(([k, r]) => { const [code, domain] = k.split('||'); return { code, domain, ...r, acc: pct(r.cor, r.att) }; }).sort((a, b) => a.acc - b.acc || b.att - a.att).slice(0, n);
}

