/* ------------------------------------------------------------------ View: Study */
VIEWS.study = () => {
  const f = S.ui.study ||= { mode: 'learn', exam: '', domain: '', subdomain: '', vendor: '', service: '', tag: '', include: 'all', count: 20, order: 'random' };
  const doms = f.exam ? domainsOf(f.exam) : [];
  return `
  <div class="page-head"><div><h1>Study</h1><p class="muted">Learn mode shows the answer and the reasoning right after each choice. Rate your confidence and flag anything you want to revisit.</p></div></div>
  <div class="grid g-2">
    <section class="card" aria-labelledby="h-learn"><h2 id="h-learn">Build a study set</h2>
      <form class="stack" data-form="study">
        <div class="field"><span class="lbl" id="lbl-smode">Session type</span>
          <div class="seg-control" role="group" aria-labelledby="lbl-smode">${[['learn', 'Learn'], ['drill', 'Focus drill'], ['mastery', 'Mastery review']].map(([k, l]) => `<button type="button" data-action="study-mode" data-v="${k}" aria-pressed="${f.mode === k}">${l}</button>`).join('')}</div>
          <p class="small muted">${f.mode === 'learn' ? 'A general set from the filters below.' : f.mode === 'drill' ? 'A tight set on one domain, sub-domain, vendor, or service.' : 'Low-confidence questions first, then missed, then unseen.'}</p>
        </div>
        <div class="filters">
          <div class="field"><label for="s-exam">Certification</label><select id="s-exam" name="exam">${examOpts(f.exam)}</select></div>
          ${f.mode !== 'mastery' ? `
          <div class="field"><label for="s-domain">Domain</label><select id="s-domain" name="domain" ${f.exam ? '' : 'disabled'}>${opts(doms, f.domain, f.exam ? 'All domains' : 'Choose a certification first')}</select></div>
          <div class="field"><label for="s-sub">Sub-domain</label><select id="s-sub" name="subdomain">${opts(subdomainsOf(f.exam, f.domain), f.subdomain, 'All sub-domains')}</select></div>
          <div class="field"><label for="s-vendor">Vendor</label><select id="s-vendor" name="vendor">${opts(uniq(activeExams().map(e => e.vendor)), f.vendor, 'All vendors')}</select></div>
          <div class="field"><label for="s-svc">Service</label><select id="s-svc" name="service">${opts(servicesOf(f.exam), f.service, 'Any service')}</select></div>
          <div class="field"><label for="s-tag">Concept tag</label><select id="s-tag" name="tag">${opts(tagsOf(), f.tag, 'Any tag')}</select></div>
          <div class="field"><label for="s-inc">Include</label><select id="s-inc" name="include">${opts([['all', 'All matching'], ['unseen', 'Unseen only'], ['missed', 'Missed only'], ['flagged', 'Flagged only']], f.include)}</select></div>
          <div class="field"><label for="s-order">Order</label><select id="s-order" name="order">${opts([['random', 'Shuffled'], ['source', 'Blueprint order']], f.order)}</select></div>` : ''}
          <div class="field"><label for="s-count">Questions</label><input id="s-count" name="count" type="number" min="1" max="200" value="${f.count}" inputmode="numeric"></div>
        </div>
        <p class="small muted" id="study-count" aria-live="polite">${studyPool(f).length} questions match.</p>
        <div class="row"><button class="btn primary" type="submit">Start session</button></div>
      </form>
    </section>
    <section class="card" aria-labelledby="h-how"><h2 id="h-how">How each mode works</h2>
      <div class="stack small">
        <div><strong>Learn.</strong> <span class="muted">Immediate feedback, the reason the correct option works, and why the others fall short. Tags and services appear under each question so you can connect it to the wider topic.</span></div>
        <div><strong>Focus drill.</strong> <span class="muted">Narrow to one weak area. Pick a domain or sub-domain for exam objectives, or a service tag for cross-exam practice (for example, every question that touches Cloud Interconnect or ExpressRoute).</span></div>
        <div><strong>Mastery review.</strong> <span class="muted">Works through what you marked Low confidence, then what you got wrong, then what you haven't seen, so study time goes where it counts.</span></div>
        <div><strong>Keyboard.</strong> <span class="muted">Press <span class="kbd">1</span>–<span class="kbd">4</span> or <span class="kbd">A</span>–<span class="kbd">D</span> to answer, <span class="kbd">Enter</span> or <span class="kbd">→</span> for next, <span class="kbd">←</span> for previous, <span class="kbd">F</span> to flag.</span></div>
      </div>
    </section>
  </div>`;
};
function studyPool(f) {
  if (f.mode === 'mastery') return masteryQueue(f.exam, 1000);
  let qs = allQ().filter(q => (!f.exam || q.exam_code === f.exam) && (!f.domain || q.domain === f.domain) && (!f.subdomain || q.subdomain === f.subdomain) && (!f.vendor || q.vendor === f.vendor) && (!f.service || q.services.includes(f.service)) && (!f.tag || q.tags.includes(f.tag)));
  if (f.include === 'unseen') qs = qs.filter(q => !isSeen(q.id)); else if (f.include === 'missed') qs = qs.filter(q => isMissed(q.id)); else if (f.include === 'flagged') qs = qs.filter(q => S.progress.flags.has(q.id));
  return qs.map(q => q.id);
}
function startStudy() {
  const f = S.ui.study; const n = Math.max(1, Math.min(200, parseInt(f.count, 10) || 20));
  let ids = studyPool(f);
  if (f.mode === 'mastery') ids = ids.slice(0, n); else ids = (f.order === 'source' ? ids : shuffle(ids)).slice(0, n);
  const scope = [f.exam, f.domain && f.domain.replace(/^\d+\.\s*/, ''), f.subdomain, f.service, f.tag].filter(Boolean).join(', ');
  startRunner({ title: `${modeName(f.mode)}${scope ? ': ' + scope : ''}`, mode: f.mode, ids, reveal: 'immediate', examCode: f.exam || null });
}

