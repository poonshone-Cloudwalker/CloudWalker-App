/* ------------------------------------------------------------------ Routing & chrome */
const ICON = {
  dashboard: '<path d="M4 13h6V4H4zM14 20h6v-9h-6zM4 20h6v-4H4zM14 4v4h6V4z"/>',
  exams: '<path d="M5 4h11l3 3v13H5z"/><path d="M9 11h7M9 15h7M9 7h3"/>',
  study: '<path d="M4 6c3-1.5 5.5-1.5 8 0v13c-2.5-1.5-5-1.5-8 0zM12 6c2.5-1.5 5-1.5 8 0v13c-3-1.5-5.5-1.5-8 0"/>',
  exam: '<circle cx="12" cy="13" r="7"/><path d="M12 13V9M10 3h4"/>',
  review: '<path d="M4 12a8 8 0 1 0 2.4-5.7M4 4v4h4"/>',
  analytics: '<path d="M5 20V10M12 20V4M19 20v-7"/>',
  library: '<path d="M5 4h4v16H5zM11 4h4v16h-4zM17 5l3 1-3 14-3-1z"/>',
  certify: '<path d="M12 3l8 4-8 4-8-4z"/><path d="M6 9v5c0 1.7 2.7 3 6 3s6-1.3 6-3V9"/>',
  career: '<path d="M4 20V9l8-5 8 5v11"/><path d="M9 20v-6h6v6"/>',
  retention: '<path d="M12 7v5l3 2"/><circle cx="12" cy="12" r="8"/><path d="M3 4l3 3M21 4l-3 3"/>',
  lab: '<path d="M4 6h7v5H4zM13 13h7v5h-7zM13 6h7v3h-7zM4 15h7v3H4z"/>',
  adr: '<path d="M6 3h9l4 4v14H6z"/><path d="M9 12l2 2 4-4"/>',
  portfolio: '<path d="M4 8h16v11H4z"/><path d="M9 8V5h6v3M4 13h16"/>',
  interview: '<path d="M4 5h11v8H8l-4 3z"/><path d="M15 9h5v8l-3-2h-6v-2"/>',
  glossary: '<path d="M5 4h11a3 3 0 0 1 3 3v13H8a3 3 0 0 1-3-3z"/><path d="M5 17a3 3 0 0 1 3-3h11"/><path d="M9 8h6"/>',
  outputs: '<path d="M5 4h10l4 4v12H5z"/><path d="M9 13l2 2 4-4"/><path d="M12 4v4h7"/>',
  settings: '<circle cx="12" cy="12" r="3"/><path d="M12 3v3M12 18v3M3 12h3M18 12h3M5.6 5.6l2.1 2.1M16.3 16.3l2.1 2.1M5.6 18.4l2.1-2.1M16.3 7.7l2.1-2.1"/>'
};
const NAV = [
  ['dashboard', 'Command center', 'Command'], ['career', 'Career command', 'Command'],
  ['certify', 'Certification overview', 'Certify'], ['exams', 'Exams', 'Certify'], ['study', 'Study', 'Certify'], ['exam', 'Exam mode', 'Certify'], ['retention', 'Retention engine', 'Certify'], ['review', 'Review', 'Certify'], ['library', 'Question library', 'Certify'], ['glossary', 'Glossary', 'Certify'], ['analytics', 'Analytics', 'Certify'],
  ['lab', 'Architecture lab', 'Build'], ['adr', 'ADR studio', 'Build'], ['portfolio', 'Portfolio', 'Build'], ['outputs', 'Career outputs', 'Build'],
  ['interview', 'Interview arena', 'Prove'],
  ['settings', 'Settings & data', 'Data']];
const BOTTOM = [['dashboard', 'Home'], ['retention', 'Review'], ['lab', 'Lab'], ['interview', 'Interview'], ['career', 'Career']];
const svg = k => `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${ICON[k]}</svg>`;
function navCurrent(k, cur) {
  if (cur === k) return true;
  if (cur === 'run') return k === (S.runner?.mode === 'exam' ? 'exam' : S.runner?.mode === 'retention' ? 'retention' : 'study');
  if (cur === 'results') return k === (S.lastResult?.mode === 'exam' ? 'exam' : 'study');
  if (cur === 'recall') return k === 'retention';
  return false;
}
function renderNav() {
  const cur = route().name; let grp = '';
  const due = typeof reviewCount === 'function' && S.ws ? reviewCount() : 0;
  const badge = k => k === 'retention' && due ? `<span class="badge" aria-label="${due} waiting for review">${due}</span>` : '';
  $('#nav').innerHTML = NAV.map(([k, l, g]) => { const head = g !== grp ? `<li class="nav-group" role="presentation">${esc(g)}</li>` : ''; grp = g;
    return head + `<li><a href="#/${k}" ${navCurrent(k, cur) ? 'aria-current="page"' : ''} title="${l}">${svg(k)}<span class="nav-label">${l}</span>${badge(k)}</a></li>`; }).join('');
  const bn = $('#bottomNav'); if (bn) bn.innerHTML = BOTTOM.map(([k, l]) => `<a href="#/${k}" ${navCurrent(k, cur) ? 'aria-current="page"' : ''}>${svg(k)}<span>${l}</span>${badge(k)}</a>`).join('');
}
function renderSessionMini() {
  const s = S.session;
  const el = $('#sessionMini'); if (!el) return;
  el.innerHTML = s.answered ? `This session: <strong>${s.answered}</strong> answered, <strong>${pct(s.correct, s.answered)}%</strong> correct.<br>Current streak <strong>${s.streak}</strong>, best <strong>${s.best}</strong>.` : 'No questions answered yet this session.';
}
function route() { const h = location.hash.replace(/^#\/?/, ''); const [name, ...rest] = h.split('/'); return { name: name || 'dashboard', arg: rest.join('/') }; }
function go(name, arg) { const h = '#/' + name + (arg ? '/' + arg : ''); if (location.hash === h) render(); else location.hash = h; }
function applyTheme() {
  document.documentElement.dataset.theme = S.ui.theme;
  const next = S.ui.theme === 'dark' ? 'light' : 'dark';
  $$('.theme-toggle').forEach(b => {
    b.setAttribute('aria-label', `Switch to ${next} theme`);
    const icon = S.ui.theme === 'dark' ? '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" aria-hidden="true"><circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M2 12h2M20 12h2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/></svg>' : '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" aria-hidden="true"><path d="M20 14.5A8 8 0 0 1 9.5 4 8 8 0 1 0 20 14.5z"/></svg>';
    b.innerHTML = b.classList.contains('icon-btn') ? icon : icon + `<span class="nav-label">${next === 'dark' ? 'Dark' : 'Light'} theme</span>`;
  });
}
function announce(msg) { const l = $('#live'); l.textContent = ''; setTimeout(() => l.textContent = msg, 30); }
function toast(msg) { if (typeof showStatus === 'function') return showStatus(msg); } function toastOld(msg) { let toastT; $('.toast')?.remove(); const t = document.createElement('div'); t.className = 'toast'; t.setAttribute('role', 'status'); t.textContent = msg; document.body.append(t); clearTimeout(toastT); toastT = setTimeout(() => t.remove(), 3200); }
function closeNav() { $('#shell').classList.remove('nav-open'); $('#menuBtn').setAttribute('aria-expanded', 'false'); }

const VIEWS = {};
function render() {
  const r = route(); const v = VIEWS[r.name] || VIEWS.dashboard;
  if (r.name !== 'run') clearInterval(timerHandle);
  $('#main').innerHTML = `<div class="page">${chrome(r.name)}${v(r.arg)}${appFooter()}</div>`;
  renderNav(); closeNav();
  document.title = (NAV.find(n => n[0] === r.name)?.[1] || (r.name === 'run' ? (S.runner?.title || 'Session') : r.name === 'results' ? 'Results' : 'Dashboard')) + ' · CloudWalker';
  if (r.name === 'run') tickTimer();
  afterRender();
}
let lastRoute = '';
window.addEventListener('hashchange', () => { render(); const r = location.hash; if (r !== lastRoute) { $('#main').focus({ preventScroll: true }); window.scrollTo(0, 0); } lastRoute = r; });

