/* ------------------------------------------------------------------ View: Review */
VIEWS.review = () => {
  const f = S.ui.review; const ids = reviewPool(f);
  const counts = { missed: allQ().filter(q => isMissed(q.id)).length, flagged: S.progress.flags.size, low: Object.values(S.progress.confidence).filter(c => c === 'low').length };
  return `
  <div class="page-head"><div><h1>Review</h1><p class="muted">Go back over what you got wrong, flagged, or weren't sure about. Queues come from this runtime's answers plus any progress you've imported.</p></div></div>
  <section class="card" aria-labelledby="h-rq2">
    <h2 id="h-rq2" class="sr-only">Review filters</h2>
    <div class="row" style="margin-bottom:14px" role="group" aria-label="Review source">${[['missed', 'Missed', counts.missed], ['flagged', 'Flagged', counts.flagged], ['low', 'Low confidence', counts.low]].map(([k, l, n]) => `<button class="chip" data-action="review-src" data-v="${k}" aria-pressed="${f.source === k}">${l} (${n})</button>`).join('')}</div>
    <form class="filters" data-form="review">
      <div class="field"><label for="r-exam">Certification</label><select id="r-exam" name="exam">${examOpts(f.exam)}</select></div>
      <div class="field"><label for="r-dom">Domain</label><select id="r-dom" name="domain" ${f.exam ? '' : 'disabled'}>${opts(f.exam ? domainsOf(f.exam) : [], f.domain, f.exam ? 'All domains' : 'Choose a certification first')}</select></div>
      <div class="field"><label for="r-sub">Sub-domain</label><select id="r-sub" name="subdomain">${opts(subdomainsOf(f.exam, f.domain), f.subdomain, 'All sub-domains')}</select></div>
      <div class="field"><label for="r-svc">Service</label><select id="r-svc" name="service">${opts(servicesOf(f.exam), f.service, 'Any service')}</select></div>
      <div class="field"><label for="r-sort">Sort</label><select id="r-sort" name="sort">${opts([['recent', 'Most recent first'], ['domain', 'By domain']], f.sort)}</select></div>
    </form>
    <div class="row" style="margin-top:16px"><strong>${ids.length} in queue</strong><span class="spacer"></span><button class="btn primary" data-action="start-review" ${ids.length ? '' : 'disabled'}>Review ${ids.length ? ids.length : ''} questions</button></div>
  </section>
  <div style="margin-top:20px">${ids.length ? `<div class="stack">${ids.slice(0, 50).map(id => libItem(Q(id))).join('')}</div>${ids.length > 50 ? `<p class="small muted" style="margin-top:10px">Showing the first 50. Start the review to work through all ${ids.length}.</p>` : ''}`
    : emptyState(f.source === 'missed' ? 'No missed questions here' : f.source === 'flagged' ? 'Nothing flagged yet' : 'No low-confidence answers yet', f.source === 'missed' ? 'Questions you answer incorrectly land here automatically. Widen the filters, or practice to build a queue.' : f.source === 'flagged' ? 'Use "Flag for later" on any question during a session to add it here.' : 'Rate your confidence after answering. Anything marked Low is queued here for another pass.', '<a class="btn primary" href="#/study">Start studying</a>')}</div>`;
};

