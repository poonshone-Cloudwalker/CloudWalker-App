/* ================================================================== V10: flashcards
 * Glossary flashcards: term on the front, definition on the back, self-graded Again / Hard / Good / Easy.
 * Terms come only from the glossary (GLOSSARY_SEED overlaid by S.ws.glossary, through glTerms()); this
 * feature stores no terms of its own. Intervals reuse the retention engine's LADDER (same day, 1, 3, 7,
 * 14, 30 days). A term is "new" until first graded, "learning" below the 7-day step, "known" from it.
 * Saved data (S.ws.flashcards): { exam, cards: { <termId>: { step, due, last, reviews, lapses, updated } }, updated }.
 * The study session itself (queue, position, flipped) is screen state and is not saved. The saved record is
 * created the first time the feature is used, so workspaces of people who never open it are unchanged. */
const FC_KNOWN_STEP = 3, FC_SESSION_MAX = 20, FC_AGAIN_GAP = 3;
const FC_GRADES = [['again', 'Again', 'See it again in this session'], ['hard', 'Hard', 'Same step as before'], ['good', 'Good', 'Next step'], ['easy', 'Easy', 'Skip a step']];
let FC = { session: null };

function fcData() {
  const d = (S.ws.flashcards ||= { exam: '', cards: {}, updated: 0 });
  if (!d.cards || typeof d.cards !== 'object') d.cards = {}; if (typeof d.exam !== 'string') d.exam = ''; return d;
}
const fcExamName = code => examMetaFor(code)?.name || EXAM_PROFILES[code]?.name || code;
function fcExams() { const s = new Set(); for (const t of glTerms()) for (const e of t.exams || []) if (e) s.add(e); return [...s].sort(); }
const fcTerms = exam => glTerms().filter(t => t && t.id && t.term && t.definition && (!exam || (t.exams || []).includes(exam)));
function fcState(id) {
  const c = fcData().cards[id]; if (!c) return 'new';
  return c.step >= FC_KNOWN_STEP ? 'known' : 'learning';
}
const fcDue = (id, now = Date.now()) => { const c = fcData().cards[id]; return !!c && c.due <= now; };
function fcCounts(terms) { const n = { new: 0, learning: 0, known: 0, due: 0 }; const now = Date.now(); for (const t of terms) { n[fcState(t.id)]++; if (fcDue(t.id, now)) n.due++; } return n; }
function fcBuildSession() {
  const d = fcData(); const terms = fcTerms(d.exam); const now = Date.now();
  const due = terms.filter(t => fcDue(t.id, now)).sort((a, b) => d.cards[a.id].due - d.cards[b.id].due);
  const fresh = terms.filter(t => !d.cards[t.id]);
  const ids = [...due, ...fresh].slice(0, FC_SESSION_MAX).map(t => t.id);
  FC.session = { exam: d.exam, ids, i: 0, flipped: false, graded: 0, again: 0 };
  return FC.session;
}
function fcGrade(grade) {
  const s = FC.session; if (!s || !s.flipped) return; const id = s.ids[s.i]; const d = fcData(); const now = Date.now();
  const prev = d.cards[id]; const step0 = prev ? prev.step : 0;
  const step = grade === 'again' ? 0 : grade === 'hard' ? step0 : grade === 'good' ? Math.min(LADDER.length - 1, step0 + 1) : Math.min(LADDER.length - 1, step0 + 2);
  d.cards[id] = { step, due: now + LADDER[step][0], last: now, reviews: (prev?.reviews || 0) + 1, lapses: (prev?.lapses || 0) + (grade === 'again' ? 1 : 0), updated: now };
  d.updated = now; s.graded++;
  if (grade === 'again') { s.again++; s.ids.splice(Math.min(s.ids.length, s.i + 1 + FC_AGAIN_GAP), 0, id); }
  s.i++; s.flipped = false;
  markDirty(); persistSoon(SAVE_QUICK);
}

/* ---------- Views */
function fcExamPicker(cur) {
  const opts = [['', 'All certifications'], ...fcExams().map(c => [c, c])];
  return `<div class="row fc-exams" role="group" aria-label="Certification">${opts.map(([c, l]) => `<button type="button" class="chip ${c === cur ? 'strong' : ''}" data-action="flashcards-exam" data-exam="${esc(c)}" aria-pressed="${c === cur}"${c ? ` title="${esc(fcExamName(c))}"` : ''}>${esc(l)}</button>`).join('')}</div>`;
}
function fcDeckView() {
  const d = fcData(); const terms = fcTerms(d.exam); const n = fcCounts(terms); const ready = Math.min(FC_SESSION_MAX, n.due + n.new);
  const label = { new: 'New', learning: 'Learning', known: 'Known' };
  return `<div class="page-head"><div><h1>Flashcards</h1><p class="muted">Recall the definition of each glossary term, then check yourself. Terms come from the glossary${d.exam ? ` for ${esc(fcExamName(d.exam))}` : ''}.</p></div></div>
  <section class="card" aria-labelledby="h-fc-pick"><h2 id="h-fc-pick">Choose a certification</h2>${fcExamPicker(d.exam)}</section>
  <section class="card" style="margin-top:16px" aria-labelledby="h-fc-deck"><h2 id="h-fc-deck">${esc(d.exam ? fcExamName(d.exam) : 'All certifications')}</h2>
    <div class="grid g-3 fc-kpis" style="margin-top:8px">${['new', 'learning', 'known'].map(k => `<div class="kpi"><div class="v" id="fc-n-${k}">${n[k]}</div><div class="l">${label[k]}</div></div>`).join('')}</div>
    <p class="small muted" style="margin-top:8px" id="fc-summary">${terms.length} term${terms.length === 1 ? '' : 's'} in this deck. ${n.due} due for review now.</p>
    <div class="row" style="margin-top:12px">${ready ? `<button class="btn primary" data-action="flashcards-start">Study ${ready} card${ready === 1 ? '' : 's'}</button>` : `<p class="small" role="status">Nothing is due and there are no new terms in this deck. Come back later, or pick another certification.</p>`}</div></section>
  <section class="card" style="margin-top:16px" aria-labelledby="h-fc-list"><h2 id="h-fc-list">Terms in this deck</h2>
    ${terms.length ? `<ul class="fc-list">${terms.map(t => { const st = fcState(t.id); return `<li><a href="#/glossary/term/${encodeURIComponent(t.id)}">${esc(t.term)}</a>${t.acronym ? ` <span class="muted small">(${esc(t.acronym)})</span>` : ''} <span class="chip fc-st-${st}">${label[st]}</span>${fcDue(t.id) ? ' <span class="chip">Due</span>' : ''}</li>`; }).join('')}</ul>` : emptyState('No terms for this certification', 'The glossary has no terms tagged with it yet. Terms you import into the glossary appear here too.')}</section>`;
}
function fcStudyView() {
  const s = FC.session && FC.session.exam === fcData().exam ? FC.session : fcBuildSession();
  const back = '<a class="btn sm ghost" href="#/flashcards">← Deck</a>';
  if (!s.ids.length) return `<div class="run-head">${back}</div><div class="page-head"><div><h1>Flashcard study</h1></div></div>${emptyState('Nothing to study right now', 'No cards are due and every term in this deck has been seen. Pick another certification on the deck page.', '<a class="btn primary" href="#/flashcards">Back to the deck</a>')}`;
  if (s.i >= s.ids.length) return `<div class="run-head">${back}</div><div class="page-head"><div><h1>Session complete</h1></div></div>
    <section class="card" aria-labelledby="h-fc-done"><h2 id="h-fc-done" tabindex="-1">Well done</h2><p id="fc-done-text">You graded ${s.graded} card${s.graded === 1 ? '' : 's'}${s.again ? `, and ${s.again} came back for another try` : ''}.</p>
    <div class="row" style="margin-top:12px"><button class="btn primary" data-action="flashcards-again-session">Study more</button><a class="btn" href="#/flashcards">Back to the deck</a></div></section>`;
  const t = glById(s.ids[s.i]); const pos = s.i + 1, total = s.ids.length; const pct = Math.round(s.i / total * 100);
  if (!t) { s.i++; return fcStudyView(); }
  return `<div class="run-head">${back}<span class="chip" id="fc-pos">Card ${pos} of ${total}</span></div>
  <div class="page-head"><div><h1>Flashcard study</h1><p class="muted">${esc(s.exam ? fcExamName(s.exam) : 'All certifications')}</p></div></div>
  <div class="bar fc-progress" role="progressbar" aria-label="Session progress" aria-valuemin="0" aria-valuemax="${total}" aria-valuenow="${s.i}"><i style="width:${pct}%"></i></div>
  <section class="card fc-card" aria-labelledby="fc-term" style="margin-top:16px">
    <p class="small muted fc-side">Term</p>
    <h2 id="fc-term" class="fc-term" tabindex="-1">${esc(t.term)}${t.acronym ? ` <span class="muted">(${esc(t.acronym)})</span>` : ''}</h2>
    ${s.flipped ? `<div id="fc-back" class="fc-back" tabindex="-1" aria-labelledby="fc-back-l"><p class="small muted fc-side" id="fc-back-l">Definition</p><p class="fc-def">${esc(t.definition)}</p></div>
      <div class="fc-grades" role="group" aria-labelledby="fc-grade-l"><p class="small" id="fc-grade-l">How well did you recall it?</p><div class="fc-grade-row">${FC_GRADES.map(([g, l, hint]) => `<button class="btn ${g === 'good' ? 'primary' : ''}" data-action="flashcards-grade" data-grade="${g}" aria-describedby="fc-h-${g}">${l}<span class="sr-only" id="fc-h-${g}">: ${hint}</span></button>`).join('')}</div></div>`
      : `<p class="small muted" style="margin-top:12px">Say or write the definition to yourself, then check.</p><div class="row" style="margin-top:12px"><button class="btn primary" id="fc-flip" data-action="flashcards-flip">Show definition</button></div>`}
  </section>`;
}

registerFeature({
  id: 'flashcards',
  css: `.fc-exams{gap:8px;flex-wrap:wrap}.fc-list{list-style:none;padding:0;margin:8px 0 0;display:grid;gap:6px}.fc-list li{display:flex;flex-wrap:wrap;align-items:center;gap:6px;padding:6px 0;border-bottom:1px solid var(--color-divider)}
.fc-st-known{background:var(--color-success-bg);color:var(--color-text)}.fc-st-learning{background:var(--color-warning-bg);color:var(--color-text)}
.fc-card{min-height:260px}.fc-term{font-size:1.5rem;margin:4px 0 0}.fc-side{text-transform:uppercase;letter-spacing:.06em;margin:0}
.fc-back{margin-top:16px;padding-top:12px;border-top:1px dashed var(--color-border)}.fc-def{font-size:1.1rem;line-height:1.55;margin:6px 0 0}
.fc-back:focus-visible,.fc-term:focus-visible{outline:3px solid var(--color-primary);outline-offset:4px;border-radius:6px}
.fc-grades{margin-top:16px}.fc-grade-row{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:8px;margin-top:6px}.fc-grade-row .btn{min-height:48px;justify-content:center}
@media (max-width:520px){.fc-grade-row{grid-template-columns:repeat(2,minmax(0,1fr))}}
@media (prefers-reduced-motion:no-preference){.fc-back{animation:fcIn .2s ease-out}@keyframes fcIn{from{opacity:0;transform:translateY(4px)}to{opacity:1;transform:none}}}`,
  views: { flashcards: arg => arg === 'study' ? fcStudyView() : fcDeckView() },
  nav: [{ route: 'flashcards', label: 'Flashcards', group: 'Certify', after: 'study', icon: '<rect x="3" y="6" width="14" height="12" rx="2"/><path d="M7 6V4.5A1.5 1.5 0 0 1 8.5 3H19a2 2 0 0 1 2 2v10.5a1.5 1.5 0 0 1-1.5 1.5H17"/>' }],
  actions: {
    'flashcards-exam': data => { const d = fcData(); d.exam = data.exam || ''; d.updated = Date.now(); FC.session = null; markDirty(); persistSoon(SAVE_QUICK); render(); $(`[data-action="flashcards-exam"][data-exam="${CSS.escape(d.exam)}"]`)?.focus(); },
    'flashcards-start': () => { fcBuildSession(); go('flashcards', 'study'); }, /* a route change moves focus to the page, as everywhere else in the app */
    'flashcards-flip': () => { if (!FC.session) return; FC.session.flipped = true; render(); $('#fc-back')?.focus(); },
    'flashcards-grade': data => { fcGrade(data.grade); render(); ($('#fc-flip') || $('#h-fc-done') || $('main h1'))?.focus(); },
    'flashcards-again-session': () => { fcBuildSession(); render(); ($('#fc-flip') || $('main h1'))?.focus(); },
  },
  mergeImport(w) {
    const x = w && w.flashcards; if (!x || typeof x !== 'object') return; const d = fcData();
    for (const [id, c] of Object.entries(x.cards || {})) if (c && typeof c === 'object' && Number.isInteger(c.step) && c.step >= 0 && c.step < LADDER.length && typeof c.due === 'number' && (c.updated || 0) > (d.cards[id]?.updated || 0)) d.cards[id] = c;
    if (typeof x.exam === 'string' && (x.updated || 0) > (d.updated || 0)) d.exam = x.exam;
    d.updated = Math.max(d.updated || 0, x.updated || 0); FC.session = null;
  },
});
