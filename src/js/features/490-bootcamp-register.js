/* ================================================================== V10.1: Bootcamp, registration
 * Wires the Bootcamp pages into the app through registerFeature only: one nav entry (Build group, after
 * Architecture lab), one route with sub-pages, click actions, field inputs and the workspace-import merge. */
const BC_CSS = `.bc-tabs{display:flex;flex-wrap:wrap;gap:8px;margin:4px 0 0}.bc-tabs .chip[aria-current="page"]{background:var(--color-primary-highlight);border-color:var(--color-primary);color:var(--color-text);font-weight:600}
.bc-kpis{grid-template-columns:repeat(5,minmax(0,1fr))}.bc-kpis .kpi{padding:14px 16px}.bc-of{font-size:1rem;color:var(--color-text-muted)}
.bc-chips{gap:6px;flex-wrap:wrap}.bc-list,.bc-log,.bc-levels-prog,.bc-dims,.bc-labs,.bc-weak,.bc-pfmark{list-style:none;padding:0;margin:8px 0 0;display:grid;gap:8px}
.bc-list li,.bc-log li{display:flex;flex-wrap:wrap;align-items:center;gap:6px}.bc-rec{display:block!important}.bc-rec p{margin:2px 0 0}
.bc-levels-prog li,.bc-dims li{display:grid;grid-template-columns:minmax(0,1fr) auto;gap:2px 12px;align-items:baseline}.bc-levels-prog .pbar,.bc-dims .bar{grid-column:1/-1}
.bc-next-title{font-size:1.15rem;font-weight:600;margin:6px 0}
.bc-st{border:1px solid var(--color-border)}.bc-st-passed{background:var(--color-success-bg);color:var(--color-text);border-color:var(--color-success)}.bc-st-in-progress{background:var(--color-primary-highlight);color:var(--color-text)}
.bc-st-blocked{background:var(--color-error-bg);color:var(--color-text);border-color:var(--color-error)}.bc-st-rework{background:var(--color-warning-bg);color:var(--color-text);border-color:var(--color-warning)}
button.bc-stbtn[aria-pressed="true"]{box-shadow:inset 0 0 0 2px var(--color-primary);font-weight:600}
.bc-ex{background:var(--color-primary-highlight);color:var(--color-primary-ink);font-weight:600}.bc-cloud{border:1px solid var(--color-border)}.bc-optional-cloud{border-style:dashed;color:var(--color-text)}
.bc-pf{background:var(--color-success-bg);color:var(--color-text);border:1px solid var(--color-success)}
.bc-fgroup{margin-top:10px}.bc-filters>summary{display:flex;flex-wrap:wrap;gap:4px 12px;align-items:baseline;cursor:pointer;min-height:44px}.bc-filters>summary h2{margin:0}.bc-fgrid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:0 24px}.bc-dates{grid-template-columns:repeat(auto-fit,minmax(140px,1fr))!important}.bc-flabel{font-weight:600;margin:0 0 4px;color:var(--color-text-muted)}
.bc-level{padding:0;margin-top:12px}.bc-level>summary{display:flex;flex-wrap:wrap;align-items:baseline;gap:6px 12px;padding:16px 20px;cursor:pointer;min-height:48px}
.bc-lvnum{font-family:var(--font-display);font-weight:600;color:var(--color-primary-ink)}.bc-lvtitle{font-weight:600;font-size:1.05rem;flex:1 1 200px}
.bc-lvmeta{padding:0 20px 8px;border-top:1px solid var(--color-divider)}.bc-lvmeta p{margin:8px 0 4px}.bc-labs{padding:0 20px 16px}
.bc-labrow{display:grid;grid-template-columns:minmax(0,1fr) auto;gap:6px 16px;align-items:start;padding:10px 0;border-top:1px solid var(--color-divider)}.bc-labrow p{margin:2px 0 0}.bc-labrow.is-ex{border-left:3px solid var(--color-primary);padding-left:10px}
.bc-labrow .bc-chips{justify-content:flex-end}
.bc-detail{display:grid;grid-template-columns:minmax(0,1.35fr) minmax(0,1fr);gap:16px;align-items:start;margin-top:16px}.bc-side{position:sticky;top:12px}
.bc-sec{padding:0}.bc-sec+.bc-sec{margin-top:12px}.bc-sec>summary{padding:14px 20px;cursor:pointer;min-height:48px;display:flex;align-items:center}.bc-sec>summary h2{font-size:1.05rem;margin:0;display:inline}
.bc-secbody{padding:0 20px 16px}.bc-secbody p{margin:8px 0}.bc-ul{margin:6px 0;padding-left:20px;display:grid;gap:4px}.bc-ol{list-style:decimal}
.bc-contract{margin-top:10px;padding:10px 12px;border-left:3px solid var(--color-border);background:var(--color-surface-2);border-radius:0 var(--r-md) var(--r-md) 0}.bc-contract p{margin:4px 0}.bc-src{margin:0;font-weight:600;color:var(--color-text-muted)}
.bc-inner{margin-top:8px}.bc-inner summary{cursor:pointer;font-weight:600;min-height:36px;display:flex;align-items:center}
.bc-pre{white-space:pre;overflow-x:auto;max-width:100%;padding:12px;background:var(--color-surface-2);border-radius:var(--r-md);font-size:.82rem;line-height:1.45}
.bc-dl dt{font-weight:600;margin-top:8px}.bc-dl dd{margin:2px 0 0}
.bc-h3{font-size:1rem;margin:18px 0 4px}.bc-h2{font-size:1.15rem}
.bc-dims-edit{display:grid;gap:12px;margin-top:8px}.bc-dimhead{display:flex;flex-direction:column;gap:2px}.bc-seg{display:flex;flex-wrap:wrap;gap:6px;margin-top:6px}.bc-seg .chip{min-width:40px;justify-content:center}
.bc-seg .chip:disabled{opacity:.5;cursor:default}
.bc-gate{margin-top:14px;padding:12px;border:1px solid var(--color-border);border-radius:var(--r-md)}.bc-gate.ok{border-color:var(--color-success);background:var(--color-success-bg)}.bc-gate p{margin:0 0 6px}.bc-gate ul{list-style:none;padding:0;margin:0;display:grid;gap:2px}.bc-gate li.no{color:var(--color-text-muted)}
.bc-evidence{list-style:none;padding:0;margin:6px 0 0;display:grid;gap:4px}.bc-evidence label,.bc-check label{display:flex;align-items:center;gap:10px;min-height:40px;cursor:pointer}
.bc-evidence input,.bc-check input{width:20px;height:20px;accent-color:var(--color-primary);flex:none}.bc-check{margin-top:10px}.bc-check p{margin:0 0 0 30px}
.bc-record .field{margin-top:10px}.bc-record input[type=text]{font-family:var(--font-mono,ui-monospace,monospace);font-size:.9rem}.bc-record .field .btn{align-self:flex-start}
.bc-warn{color:var(--color-text);background:var(--color-warning-bg);border-left:3px solid var(--color-warning);padding:6px 10px;border-radius:0 var(--r-md) var(--r-md) 0}.bc-okmsg{color:var(--color-text);background:var(--color-success-bg);padding:6px 10px;border-radius:var(--r-md)}
.bc-tablewrap{overflow-x:auto;max-width:100%;margin-top:8px}.bc-table th,.bc-table td{padding:8px 10px;border-bottom:1px solid var(--color-divider);text-align:left;vertical-align:top}.bc-table td.num{font-variant-numeric:tabular-nums;white-space:nowrap}
.bc-lvrow th{background:var(--color-surface-2);font-family:var(--font-display);font-weight:600}
input.sr-only:focus-visible+.bc-file{outline:3px solid var(--color-primary);outline-offset:2px}
.bc-pfmark li{display:flex;flex-wrap:wrap;justify-content:space-between;gap:8px;padding:8px 0;border-top:1px solid var(--color-divider)}.bc-pfcat h3{margin:0 0 4px}.bc-issues{margin:6px 0 0;padding-left:20px}
.bc-weak>li{padding:10px 0;border-top:1px solid var(--color-divider)}.bc-weak p{margin:0 0 4px}.bc-pager{justify-content:space-between;margin-top:16px;gap:8px}
.bc-jump{margin-left:auto}@media (min-width:1101px){.bc-jump{display:none}}.bc-error ul{margin:8px 0;padding-left:20px}.bc-id{margin:0 0 2px;text-transform:uppercase;letter-spacing:.06em}
details>summary h2,details>summary h3{display:inline}
@media (max-width:860px){.bc-fgrid{grid-template-columns:minmax(0,1fr)}}
@media (max-width:1100px){.bc-detail{grid-template-columns:minmax(0,1fr)}.bc-side{position:static}.bc-kpis{grid-template-columns:repeat(3,minmax(0,1fr))}}
@media (max-width:640px){.bc-kpis{grid-template-columns:repeat(2,minmax(0,1fr))}.bc-labrow{grid-template-columns:minmax(0,1fr)}.bc-labrow .bc-chips{justify-content:flex-start}.bc-level>summary,.bc-sec>summary{padding:12px 14px}.bc-lvmeta,.bc-labs,.bc-secbody{padding-left:14px;padding-right:14px}}
@media (prefers-reduced-motion:no-preference){.bc-sec[open]>.bc-secbody{animation:bcIn .18s ease-out}@keyframes bcIn{from{opacity:0}to{opacity:1}}}`;

function bcRerender(focusId) { const y = window.scrollY; render(); window.scrollTo(0, y); const el = focusId && document.getElementById(focusId); if (el) el.focus({ preventScroll: true }); }
const BC_TEXT_LABEL = { validation_command: 'Validation command edited', evidence_link: 'Evidence link edited', reviewer_notes: 'Reviewer notes edited', personal_notes: 'Personal notes edited' };

registerFeature({
  id: 'bootcamp',
  css: BC_CSS,
  views: { bootcamp: arg => {
    const [a, b] = String(arg || '').split('/'); if (a !== 'library' || !b) BCUI.scrolled = ''; if (a !== 'tracker') BCUI.importMsg = null;
    if (a === 'lab') return bcLabView(decodeURIComponent(b || ''));
    if (a === 'library') return bcLibraryView(Number(b) >= 1 && Number(b) <= 9 ? Number(b) : 0);
    if (a === 'tracker') return bcTrackerView(); if (a === 'portfolio') return bcPortfolioView(); if (a === 'recommend') return bcRecommendView(); if (a === 'guide') return bcGuideView();
    return bcDashboardView();
  } },
  nav: [{ route: 'bootcamp', label: 'Bootcamp', group: 'Build', after: 'lab', icon: '<rect x="3" y="4" width="18" height="16" rx="2"/><path d="M7 9l3 3-3 3M12 15h5"/>' }],
  actions: {
    'bootcamp-filter': (d, el) => { if (!(d.k in BCUI.filters)) return; BCUI.filters[d.k] = d.v || ''; BCUI.filtersOpen = true; bcRerender(null); $(`[data-action="bootcamp-filter"][data-k="${CSS.escape(d.k)}"][data-v="${CSS.escape(d.v || '')}"]`)?.focus({ preventScroll: true }); },
    'bootcamp-filter-clear': () => { for (const k of Object.keys(BCUI.filters)) BCUI.filters[k] = ''; BCUI.filtersOpen = true; bcRerender(null); $('[data-action="bootcamp-filter"][data-k="vendor"][data-v=""]')?.focus({ preventScroll: true }); },
    'bootcamp-status': d => { bcSetStatus(d.id, d.s); bcRerender('bc-status-' + d.s); },
    'bootcamp-score': (d, el) => { const v = d.v === '' ? null : Number(d.v); if (!BC_SCORE_FIELDS.includes(d.f) || !(v === null || (Number.isInteger(v) && v >= 0 && v <= 4))) return; bcEdit(d.id, r => { r[d.f] = v; }, 'Scored'); bcRerender(v === null ? el.id.replace(/-x$/, '-0') : el.id); },
    'bootcamp-confidence': (d, el) => { bcEdit(d.id, r => { r.confidence = r.confidence === d.c ? '' : d.c; }, 'Confidence updated'); bcRerender(el.id); },
    'bootcamp-portfolio': (d, el) => { bcSetPortfolio(d.id, bcRec(d.id).portfolio === d.s ? '' : d.s); bcRerender(el.id); },
    'bootcamp-reviewed': (d, el) => { bcEdit(d.id, r => { r.last_reviewed = bcToday(); }, 'Reviewed'); bcRerender(el.id); },
    'bootcamp-focus': (d, el) => { if (!bcTopic(d.k)) return; const p = bcData().prefs; const s = new Set(p.focus_topics); s.has(d.k) ? s.delete(d.k) : s.add(d.k); p.focus_topics = [...s]; p.updated = Date.now(); bcData().updated = p.updated; markDirty(); persistSoon(SAVE_QUICK); bcRerender(el.id); },
    'bootcamp-jump': () => { const h = $('#h-bc-rec'); if (h) { h.scrollIntoView({ block: 'start' }); h.focus({ preventScroll: true }); } },
    'bootcamp-export': () => { download(`cloudwalker-bootcamp-${stamp()}.json`, bcExportObject()); showStatus('Bootcamp progress exported.'); },
    'bootcamp-export-csv': () => { downloadText('tracker.csv', bcTrackerCsv(), 'text/csv'); showStatus('tracker.csv exported.'); },
    'bootcamp-export-index': () => { downloadText('evidence-index.md', bcEvidenceIndexMd()); showStatus('evidence-index.md downloaded. Check it before publishing.'); },
  },
  inputs: {
    'bootcamp-text': (d, el) => { const max = BC_TEXT_FIELDS[d.f]; if (!max) return; bcEdit(d.id, r => { r[d.f] = el.value.slice(0, max); }, BC_TEXT_LABEL[d.f]); },
    'bootcamp-date': (d, el) => { if (!BC_DATE_FIELDS.includes(d.f)) return; const v = el.value; if (v && !/^\d{4}-\d{2}-\d{2}$/.test(v)) return; bcEdit(d.id, r => { r[d.f] = v; }, null); },
    'bootcamp-evidence': (d, el) => { if (!BC_EVIDENCE.some(([k]) => k === d.k)) return; bcEdit(d.id, r => { r.evidence[d.k] = el.checked; }, (el.checked ? 'Evidence: ' : 'Evidence removed: ') + BC_EVIDENCE.find(([k]) => k === d.k)[1]);
      const r = bcRec(d.id); const c = $('#bc-ev-count'); if (c) c.textContent = `${bcEvidenceCount(r)} of ${BC_EVIDENCE.length}`; const g = $('#bc-gate'); if (g) g.outerHTML = bcGatePanel(r); },
    'bootcamp-cleanup': (d, el) => { bcEdit(d.id, r => { r.cleanup_verified = el.checked; }, el.checked ? 'Cleanup verified' : 'Cleanup verification removed'); },
    'bootcamp-import': (d, el) => { const f = el.files && el.files[0]; if (!f) return;
      f.text().then(txt => { try { const rep = bcImportText(txt); const n = rep.added + rep.updated;
          BCUI.importMsg = { ok: true, text: `Imported: ${rep.added} new lab record${rep.added === 1 ? '' : 's'}, ${rep.updated} updated, ${rep.kept} kept because the copy here is newer or the same.${rep.unknownIds ? ` ${rep.unknownIds} record${rep.unknownIds === 1 ? ' is' : 's are'} for labs this version does not know; ${rep.unknownIds === 1 ? 'it is' : 'they are'} kept.` : ''}${rep.skipped.length ? ` ${rep.skipped.length} skipped because ${rep.skipped.length === 1 ? 'it was' : 'they were'} malformed:` : ''}`, details: rep.skipped };
          if (!n && !rep.skipped.length) BCUI.importMsg.text += ' Nothing changed.'; }
        catch (e) { BCUI.importMsg = { ok: false, text: e.message, details: [] }; }
        if (route().name === 'bootcamp') bcRerender('bc-import-file'); showStatus(BCUI.importMsg.text.split('. ')[0] + '.'); })
        .catch(() => { BCUI.importMsg = { ok: false, text: 'The file could not be read, so nothing was imported.', details: [] }; bcRerender('bc-import-file'); });
      el.value = ''; },
  },
  mergeImport(w) { if (!w || w.bootcamp === undefined) return; const rep = bcMerge(w.bootcamp); if (rep.skipped.length) console.warn('Bootcamp: some imported lab records were skipped:\n  ' + rep.skipped.join('\n  ')); },
});
