/* ------------------------------------------------------------------ Boot */
S.booting = true; const BOOT_T0 = performance.now();
const _renderP9 = render; render = function () { if (S.booting) return; _renderP9(); };
if (innerWidth > 860 && innerWidth <= 1180) { $('#shell').classList.add('collapsed'); $('#collapseBtn').setAttribute('aria-pressed', 'true'); $('#collapseBtn').setAttribute('aria-label', 'Expand sidebar'); }
$('#main').innerHTML = '<div class="page boot-load"><h1 class="sr-only">CloudWalker is loading</h1><p class="muted" id="bootText" role="status" style="padding:24px 0 10px">Loading the question bank…</p><div class="bar" id="bootBar" role="progressbar" aria-label="Loading the question bank" aria-valuemin="0" aria-valuemax="100" aria-valuenow="0"><i style="width:0%"></i></div></div>';
try { applyTheme(); renderNav(); } catch { /* chrome paints fully after boot */ }
bootBankAsync((i, n) => { const p = Math.round(i / n * 100); const b = $('#bootBar'); if (b) { b.setAttribute('aria-valuenow', p); b.firstChild.style.width = p + '%'; } })
  .then(() => { p4AddSamples(); p5AddFoundations(); performance.mark('cw-bank-ready'); })
  .catch(err => { S.bootError = err; })
  .finally(() => {
    S.bootTimings = { bankMs: Math.round(performance.now() - BOOT_T0) }; const tx = $('#bootText'); if (tx) tx.textContent = 'Loading your saved work…';
    persistBoot().catch(e => { PERSIST.status = 'blocked'; PERSIST.reason = String(e && e.message || e); }).finally(() => {
      S.booting = false; prefsBoot(); applyTheme(); renderSessionMini(); p2AfterBoot(); p4AfterBoot(); featuresAfterBoot(); lastRoute = location.hash; render(); persistAfterBoot();
      if (S.bootError) $('#main').insertAdjacentHTML('afterbegin', `<div class="page">${emptyState('The embedded question bank could not be loaded', String(S.bootError.message || S.bootError) + '. Import a question bank JSON from Settings to continue.', '<a class="btn primary" href="#/settings">Open settings</a>')}</div>`);
      S.bootTimings.readyMs = Math.round(performance.now() - BOOT_T0); performance.mark('cw-ready');
    });
  });
})();
