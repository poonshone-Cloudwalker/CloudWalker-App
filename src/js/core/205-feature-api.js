/* ------------------------------------------------------------------ V10: feature registration
 * New features plug in here instead of wrapping earlier functions. One call per feature file:
 *
 *   registerFeature({
 *     id: 'flashcards',                                  // lowercase, unique
 *     css: '.fc-card{…}',                                // optional, injected once into <head>
 *     views: { flashcards: arg => `<div class="page-head">…</div>` },   // routes: #/flashcards/<arg>
 *     nav: [{ route: 'flashcards', label: 'Flashcards', group: 'Certify', after: 'study', icon: '<path …/>' }],
 *     actions: { 'flashcards-flip': (data, el, event) => { … render(); } },   // data-action="flashcards-flip"; names start with the id
 *     inputs: { 'flashcards-note': (data, el, event) => { … } },          // data-input="flashcards-note" on a field; names start with the id
 *     onBoot() { … },                                    // after saved work is restored, before first paint
 *     mergeImport(workspace) { … },                      // merge your S.ws.<key> from an imported workspace file, newer wins
 *   });
 *
 * Inputs: text fields and textareas call their handler on every keystroke ("input"); checkboxes, radios,
 * selects and file pickers call it once per change ("change"). Read the value from el; don't call render()
 * from a text field's handler, or the field loses focus while the person types.
 * Rules: keep a feature's saved data under one key of S.ws (it is saved and exported automatically);
 * call markDirty() and persistSoon() after changing it; never renumber ids. A clash in names stops
 * that one feature from loading, and errors in its hooks are logged; neither stops the app. */
function registerFeature(f) {
  const R = registerFeature; R.list ||= []; R.actions ||= new Map(); R.inputs ||= new Map();
  const fail = msg => { console.error('registerFeature: ' + msg + ' The feature was not loaded; the rest of the app is unaffected.'); return false; };
  if (!f || typeof f !== 'object' || !/^[a-z0-9][a-z0-9-]{1,39}$/.test(f.id || '')) return fail('"id" must be 2–40 lowercase letters, digits, or hyphens.');
  if (R.list.some(x => x.id === f.id)) return fail(`"${f.id}" is registered twice.`);
  for (const k of Object.keys(f.views || {})) if (VIEWS[k]) return fail(`${f.id}: the route "${k}" already exists.`);
  for (const k of Object.keys(f.actions || {})) if (!k.startsWith(f.id + '-')) return fail(`${f.id}: action names must start with "${f.id}-" so they cannot collide with built-in buttons ("${k}" does not).`);
  for (const k of Object.keys(f.inputs || {})) if (!k.startsWith(f.id + '-')) return fail(`${f.id}: input names must start with "${f.id}-" ("${k}" does not).`);
  R.list.push(f);
  if (f.css) { const st = document.createElement('style'); st.dataset.feature = f.id; st.textContent = f.css; document.head.append(st); }
  for (const [k, fn] of Object.entries(f.views || {})) VIEWS[k] = fn;
  for (const n of f.nav || []) {
    if (!n || !n.route || !n.label) continue;
    if (n.icon) ICON[n.route] = n.icon;
    let at = n.after ? NAV.findIndex(x => x[0] === n.after) + 1 : 0;
    if (!at) { for (let i = NAV.length - 1; i >= 0; i--) if (NAV[i][2] === n.group) { at = i + 1; break; } }
    NAV.splice(at || NAV.length, 0, [n.route, n.label, n.group || 'Data']);
  }
  for (const [k, fn] of Object.entries(f.actions || {})) R.actions.set(k, fn);
  if (!R.clicks && R.actions.size) {
    R.clicks = true;
    document.addEventListener('click', e => {
      const b = e.target.closest && e.target.closest('[data-action]'); const fn = b && R.actions.get(b.dataset.action); if (!fn) return;
      e.preventDefault(); try { fn(b.dataset, b, e); } catch (err) { console.error(`Feature action ${b.dataset.action} failed`, err); showStatus('That action could not finish. Your saved work is safe.'); }
    });
  }
  for (const [k, fn] of Object.entries(f.inputs || {})) R.inputs.set(k, fn);
  if (!R.typing && R.inputs.size) {
    R.typing = true; const TEXT = /^(text|search|url|email|tel|number|password|date|time|datetime-local|month|week)$/;
    const onField = e => {
      const el = e.target.closest && e.target.closest('[data-input]'); const fn = el && R.inputs.get(el.dataset.input); if (!fn) return;
      const textual = el.tagName === 'TEXTAREA' || (el.tagName === 'INPUT' && TEXT.test(el.type)); if ((e.type === 'input') !== textual) return;
      try { fn(el.dataset, el, e); } catch (err) { console.error(`Feature input ${el.dataset.input} failed`, err); showStatus('That change could not be saved. Your other saved work is safe.'); }
    };
    document.addEventListener('input', onField); document.addEventListener('change', onField);
  }
  return true;
}
function featuresAfterBoot() {
  const list = registerFeature.list || []; if (!list.length) return;
  if (list.some(f => f.mergeImport)) {
    const prev = smartImport;
    smartImport = data => { const r = prev(data); const w = data && (data.workspace || data); if (w && data.format === 'cloudwalker-workspace') for (const f of list) if (f.mergeImport) { try { f.mergeImport(w); } catch (e) { console.error(`Feature ${f.id} could not merge the import`, e); } } return r; };
  }
  for (const f of list) if (f.onBoot) { try { f.onBoot(); } catch (e) { console.error(`Feature ${f.id} failed to start`, e); } }
  renderNav();
}
