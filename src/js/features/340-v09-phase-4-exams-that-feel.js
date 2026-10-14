/* ================================================================== V09 Phase 4: exams that feel like the real thing
 * - Exam setup reads EXAM_PROFILES. Official values are used as-is; anything the official
 *   page does not state gets a practice default that is labelled "practice setting, not official".
 * - The runner supports single, multi (choose N, all-or-nothing), case-study sets (shared
 *   scenario panel), ordering (drag, keyboard, or tap), and a light performance-based sim
 *   (a form checked against an answer key). New items are generated-practice drafts.
 * - Options are shuffled per attempt; the mapping is stored with the response so reviews
 *   stay correct. Exam mode: answers stay editable until submit, flag for review, a review
 *   screen before submitting, 10- and 5-minute warnings, explanations only at the end.
 */
const PRACTICE_DEFAULT = { questions: 50, minutes: 90, passPct: 70 };
const NO_SHUFFLE_RX = /\b(all|none|both) of the (above|following)\b|\boptions? [A-F]\b|\b[A-F] (and|or) [A-F]\b|\bboth [A-F]\b/i;
const qtypeOf = q => q.qtype || 'single';
const isChoiceType = q => ['single', 'case', 'multi'].includes(qtypeOf(q));
function parseScale(s) { const m = String(s || '').replace(/,/g, '').match(/(\d+)\D+(\d+)/); return m ? [+m[1], +m[2]] : null; }
function simSpec(code) {
  const p = examProfile(code); const bankN = examQs(code).length; const out = { code };
  if (p && p.questions != null) { out.n = p.questions; out.nOfficial = true; out.nNote = p.questionsAreMax ? `Official: up to ${p.questions} questions.` : `Official: ${p.questions} questions.`; }
  else if (p && p.questionRange) { out.n = p.questionRange[1]; out.nOfficial = true; out.nNote = `Official: ${p.questionRange[0]}–${p.questionRange[1]} questions; this uses ${p.questionRange[1]}.`; }
  else { out.n = PRACTICE_DEFAULT.questions; out.nOfficial = false; out.nNote = 'Practice setting, not official.'; }
  if (out.n > bankN) { out.nNote += ` The app has ${bankN}, so it uses ${bankN}.`; out.n = bankN; }
  if (p && p.durationMin) { out.minutes = p.durationMin; out.minOfficial = true; } else { out.minutes = PRACTICE_DEFAULT.minutes; out.minOfficial = false; }
  const sc = p && parseScale(p.scale);
  if (p && p.passScore != null && sc) { out.scale = sc; out.passScore = p.passScore; out.passPct = Math.round((p.passScore - sc[0]) / (sc[1] - sc[0]) * 1000) / 10; out.passOfficial = true; }
  else { out.scale = null; out.passPct = PRACTICE_DEFAULT.passPct; out.passOfficial = false; out.passNote = p && p.passScore != null ? `Official pass mark is ${p.passScore}, but the scale is not stated, so a practice mark of ${PRACTICE_DEFAULT.passPct}% is used.` : `Practice setting, not official: ${PRACTICE_DEFAULT.passPct}%.`; }
  out.sourceUrl = p?.sourceUrl || null; out.lastVerified = p?.lastVerified || null; out.status = p?.statusNote || null;
  return out;
}
/* Domain weights for sampling: verified official weights, otherwise equal. */
function p4Weights(code, keys) {
  const ow = officialWeights(code); const doms = domainsOf(code);
  if (ow && ow.length === doms.length) { const byNum = {}; doms.forEach((d, i) => byNum[String(parseInt(d, 10))] = ow[i]); if (keys.every(k => byNum[k] != null)) return byNum; }
  return Object.fromEntries(keys.map(k => [k, 1]));
}
function freshIds(ids, days) { if (!days) return ids; const cut = Date.now() - days * DAY; return ids.filter(id => !(S.progress.answers[id] || []).some(a => a.t >= cut)); }
const seenBefore = (ids, t = Date.now()) => ids.filter(id => (S.progress.answers[id] || []).some(a => a.t < t)).length;

/* ---------- Case studies (original, fictional companies; practice material) */
const CASE_STUDIES = {
  'case-harbor-pine': { title: 'Harbor & Pine Outfitters (fictional)', exam: 'PCA', body: [
    'Harbor & Pine is an online outdoor-gear retailer with shoppers in North America and Europe. Its storefront runs on a few on-premises servers that the four-person engineering team patches by hand.',
    'Business needs: survive flash sales, when traffic jumps to about 20 times normal for a few hours; open new markets without new data centers; get near-real-time insight into what shoppers click during a sale.',
    'Technical needs: prefer managed services so the small team spends time on features, not servers; keep cardholder data in an isolated environment that only the payments team can reach; recover the order database with no more than 15 minutes of data loss.',
    'Constraints: the CFO wants spend to follow traffic rather than be sized for the peak, and the security lead must be able to show auditors who can access payment systems.'] }
};

/* ---------- Sample items for the new formats: original practice material, drafts until approved */
const SAMPLE_ITEMS = [
  { id: 'gp-saa-m01', exam_code: 'SAA-C03', domain: '2. Design Resilient Architectures', subdomain: '2.2 Design highly available and/or fault-tolerant architectures', question_type: 'scenario', difficulty: 'medium', qtype: 'multi', selectCount: 2, answerKey: [0, 1], correct_index: 0,
    question: 'A stateless web application runs on Amazon EC2 instances in one Availability Zone behind an Application Load Balancer. Leadership wants it to keep serving traffic if that Availability Zone fails, with little operational effort. Which TWO actions meet the requirement? (Choose 2.)',
    options: ['Configure the Auto Scaling group to launch instances in at least two Availability Zones.', 'Enable the Application Load Balancer in subnets in at least two Availability Zones.', 'Move the instances into a cluster placement group.', 'Take hourly EBS snapshots and copy them to another Region.', 'Move to a larger instance type.'],
    correct_rationale: 'High availability across Availability Zones needs both halves: instances running in more than one zone, and a load balancer that can route to every zone that has instances.',
    optionRationales: ['Spreads capacity across zones so a zone failure leaves healthy instances running.', 'Lets the load balancer route traffic to targets in the surviving zone.', 'A cluster placement group packs instances close together in one zone, which is the opposite of what is needed.', 'Snapshots help recovery after data loss but do not keep the application serving during a zone outage.', 'A bigger instance is still a single point of failure in one zone.'] },
  { id: 'gp-az305-m01', exam_code: 'AZ-305', domain: '3. Design Business Continuity Solutions', subdomain: '3.2 Design for high availability', question_type: 'scenario', difficulty: 'medium', qtype: 'multi', selectCount: 2, answerKey: [0, 3], correct_index: 0,
    question: 'You are designing storage for an application\'s blob data in Azure. The data must stay readable if the primary region becomes unavailable, using a built-in Azure Storage redundancy option rather than custom replication. Which TWO redundancy options meet the requirement? (Choose 2.)',
    options: ['Read-access geo-redundant storage (RA-GRS)', 'Locally redundant storage (LRS)', 'Zone-redundant storage (ZRS)', 'Read-access geo-zone-redundant storage (RA-GZRS)', 'Premium block blob storage with LRS'],
    correct_rationale: 'Only the read-access geo options replicate to a secondary region and let applications read from that secondary endpoint while the primary region is unavailable.',
    optionRationales: ['Replicates to a paired secondary region and allows reads from the secondary endpoint.', 'Keeps all copies in one datacenter; a regional outage makes the data unavailable.', 'Protects against a zone failure but keeps all copies in one region.', 'Combines zone redundancy in the primary region with readable geo-replication to a secondary region.', 'LRS keeps copies in one location regardless of the performance tier.'] },
  { id: 'gp-sec-m01', exam_code: 'SY0-701', domain: '4. Security Operations', subdomain: '4.6 Implement and maintain identity and access management', question_type: 'scenario', difficulty: 'easy', qtype: 'multi', selectCount: 2, answerKey: [0, 2], correct_index: 0,
    question: 'After a phishing campaign, a company wants to reduce the risk that a stolen password lets an attacker sign in. Which TWO controls most directly reduce that risk? (Choose 2.)',
    options: ['Require multifactor authentication for every user.', 'Force all users to change passwords every 30 days.', 'Block sign-ins that use legacy protocols unable to perform multifactor authentication.', 'Show a legal warning banner on the sign-in page.', 'Lower the account lockout threshold to 20 failed attempts.'],
    correct_rationale: 'A stolen password alone should not be enough to sign in. Multifactor authentication adds a second factor, and blocking legacy protocols closes the path attackers use to skip it.',
    optionRationales: ['The attacker also needs the second factor, so the stolen password alone fails.', 'The attacker can use the current password until the next change, and frequent forced changes tend to produce weaker, predictable passwords.', 'Legacy protocols that cannot prompt for a second factor are a common way around multifactor authentication.', 'A banner sets expectations but does not stop anyone holding a valid password.', 'An attacker with the correct password does not trigger failed attempts.'] },
  { id: 'gp-pca-c01', exam_code: 'PCA', domain: '1. Designing and Planning a Cloud Solution Architecture', subdomain: '1.1 Designing cloud solution architecture', question_type: 'scenario', difficulty: 'medium', qtype: 'case', caseStudyId: 'case-harbor-pine', correct_index: 0,
    question: 'Which platform best fits Harbor & Pine\'s storefront, given its flash-sale spikes, small team, and the CFO\'s cost goal?',
    options: ['Cloud Run, deploying the storefront as containers that scale with request volume', 'Compute Engine instances sized for peak traffic and kept running all year', 'A self-managed Kubernetes cluster built on Compute Engine VMs', 'An on-premises expansion with more servers for each sale'],
    correct_rationale: 'Cloud Run is fully managed and scales with incoming requests, so capacity follows the flash-sale spikes and the team has no servers to patch.',
    optionRationales: ['Managed, request-driven scaling matches the spikes, the small team, and spend that follows traffic.', 'Paying for peak capacity all year conflicts with the CFO\'s goal and keeps the patching burden.', 'Running Kubernetes yourself adds the operational load the team wants to avoid.', 'More servers on site keep the patching problem and do not help new markets.'] },
  { id: 'gp-pca-c02', exam_code: 'PCA', domain: '3. Designing for Security and Compliance', subdomain: '3.3 Designing network security', question_type: 'scenario', difficulty: 'hard', qtype: 'case', caseStudyId: 'case-harbor-pine', correct_index: 0,
    question: 'How should Harbor & Pine isolate cardholder data so that only the payments team can reach it and auditors can see who has access?',
    options: ['Run payment processing in a separate project inside a VPC Service Controls perimeter, with IAM roles granted only to the payments team\'s group', 'Keep payments in the storefront project, in a separate subnet', 'Add a "pci" label to the payment resources', 'Store card data in BigQuery and describe its sensitivity in column descriptions'],
    correct_rationale: 'A separate project gives a clean IAM boundary that auditors can review, and a VPC Service Controls perimeter reduces the risk of data leaving the protected services.',
    optionRationales: ['Project-level separation plus a service perimeter and group-based IAM gives both isolation and a clear access record.', 'A subnet does not separate IAM: anyone with project-wide roles could still reach the data.', 'Labels organise resources and billing; they do not enforce access.', 'Descriptions document data but do not restrict who can query it.'] },
  { id: 'gp-pca-c03', exam_code: 'PCA', domain: '4. Analyzing and Optimizing Technical and Business Processes', subdomain: '4.1 Analyzing business processes', question_type: 'scenario', difficulty: 'medium', qtype: 'case', caseStudyId: 'case-harbor-pine', correct_index: 0,
    question: 'Harbor & Pine wants to see what shoppers click during a sale within seconds, not the next day. Which design fits?',
    options: ['Publish click events to Pub/Sub, process them with Dataflow, and stream them into BigQuery', 'Export a CSV of clicks every night to Cloud Storage', 'Write every click to a Cloud SQL database and query it with read replicas', 'Cache clicks in Memorystore and read them back for reports'],
    correct_rationale: 'Pub/Sub, Dataflow, and BigQuery form a managed streaming pipeline that makes events queryable within seconds and scales with the sale.',
    optionRationales: ['A managed streaming pipeline with near-real-time analytics.', 'Nightly exports give next-day insight, which misses the requirement.', 'A transactional database is a poor fit for high-volume clickstream analytics during a spike.', 'A cache is not an analytics store; data can be evicted and is hard to query for reports.'] },
  { id: 'gp-sec-o01', exam_code: 'SY0-701', domain: '4. Security Operations', subdomain: '4.8 Explain appropriate incident response activities', question_type: 'concept', difficulty: 'medium', qtype: 'ordering', answerKey: [0, 1, 2, 3, 4, 5], correct_index: 0,
    question: 'Preparation is already done. Put the remaining incident response activities in the order they normally happen.',
    options: ['Detection', 'Analysis', 'Containment', 'Eradication', 'Recovery', 'Lessons learned'],
    correct_rationale: 'You detect a possible incident, analyse it to confirm scope and impact, contain it to stop the damage spreading, eradicate the cause, recover systems to normal service, and finish with a lessons-learned review.',
    optionRationales: ['Something unusual is noticed through alerts, logs, or reports.', 'Confirm it is an incident and understand scope and impact before acting.', 'Limit the damage first, for example by isolating hosts or disabling accounts.', 'Remove the cause, such as malware or a compromised account.', 'Restore systems and monitor that they stay clean.', 'Review what happened and improve controls and the response plan.'] },
  { id: 'gp-saa-o01', exam_code: 'SAA-C03', domain: '2. Design Resilient Architectures', subdomain: '2.1 Design scalable and loosely coupled architectures', question_type: 'scenario', difficulty: 'medium', qtype: 'ordering', answerKey: [0, 1, 2, 3, 4, 5], correct_index: 0,
    question: 'A team releases a new version of a web application with a blue/green deployment and weighted DNS routing. Put the steps in order.',
    options: ['Deploy the new version to the green environment.', 'Run smoke tests against the green environment.', 'Send a small share of traffic to green with a weighted routing policy.', 'Watch error rates and latency on green.', 'Shift the remaining traffic to green.', 'Keep blue available for rollback, then decommission it once green is stable.'],
    correct_rationale: 'Deploy and test before any users see the new version, expose it gradually while watching health signals, then complete the cutover and keep the old environment until you are confident.',
    optionRationales: ['Nothing can be tested until the new version is deployed.', 'Catch obvious failures before real users are routed to green.', 'A small weighted share limits the impact of anything the tests missed.', 'Health signals decide whether to continue or roll back.', 'Only after green proves healthy under real traffic.', 'Blue is the fast rollback path until green is proven.'] },
  { id: 'gp-sec-p01', exam_code: 'SY0-701', domain: '3. Security Architecture', subdomain: '3.2 Apply security principles to secure enterprise infrastructure', question_type: 'scenario', difficulty: 'medium', qtype: 'pbq-sim', correct_index: 0,
    question: 'A public web server sits in a screened subnet (DMZ) and a PostgreSQL database sits on the internal network. Set each firewall rule so the site works and everything else is blocked. Rules are evaluated top to bottom.',
    options: ['Internet → web server, TCP 443', 'Internet → web server, TCP 22 (SSH)', 'Web server → database, TCP 5432', 'Internet → database, TCP 5432', 'Any → any (final rule)'],
    sim: { kind: 'firewall', fields: [{ id: 'r1', label: 'Internet → web server, TCP 443', choices: ['Allow', 'Deny'] }, { id: 'r2', label: 'Internet → web server, TCP 22 (SSH)', choices: ['Allow', 'Deny'] }, { id: 'r3', label: 'Web server → database, TCP 5432', choices: ['Allow', 'Deny'] }, { id: 'r4', label: 'Internet → database, TCP 5432', choices: ['Allow', 'Deny'] }, { id: 'r5', label: 'Any → any (final rule)', choices: ['Allow', 'Deny'] }] },
    answerKey: { r1: 'Allow', r2: 'Deny', r3: 'Allow', r4: 'Deny', r5: 'Deny' },
    correct_rationale: 'Allow only what the service needs: HTTPS from the internet to the web server, and database traffic from the web server alone. Administrative access from the internet, direct database access, and everything else are denied, ending with an implicit-deny style final rule.',
    optionRationales: ['Customers need HTTPS to reach the site.', 'SSH from the whole internet exposes administration; manage it from a restricted admin network instead.', 'The application tier needs to reach its database.', 'The database should never be reachable from the internet.', 'Deny everything not explicitly allowed.'] },
  { id: 'gp-ace-p01', exam_code: 'ACE', domain: '5. Configuring Access and Security', subdomain: '5.1 Managing Identity and Access Management (IAM)', question_type: 'scenario', difficulty: 'medium', qtype: 'pbq-sim', correct_index: 0,
    question: 'Grant each principal the least-privileged predefined role from the list that still lets them do their job.',
    options: ['Data analysts group: read objects in the reports bucket', 'CI service account: upload build artifacts to the artifacts bucket, without reading or deleting', 'On-call engineers group: start, stop, and reset VM instances in the project', 'Auditors group: read-only view of resources across the project'],
    sim: { kind: 'iam', fields: [{ id: 'f1', label: 'Data analysts group: read objects in the reports bucket', choices: ['roles/storage.objectViewer', 'roles/storage.admin', 'roles/storage.objectCreator', 'roles/owner'] }, { id: 'f2', label: 'CI service account: upload build artifacts to the artifacts bucket, without reading or deleting', choices: ['roles/storage.objectCreator', 'roles/storage.objectAdmin', 'roles/storage.admin', 'roles/editor'] }, { id: 'f3', label: 'On-call engineers group: start, stop, and reset VM instances in the project', choices: ['roles/compute.instanceAdmin.v1', 'roles/compute.viewer', 'roles/editor', 'roles/owner'] }, { id: 'f4', label: 'Auditors group: read-only view of resources across the project', choices: ['roles/viewer', 'roles/editor', 'roles/browser', 'roles/owner'] }] },
    answerKey: { f1: 'roles/storage.objectViewer', f2: 'roles/storage.objectCreator', f3: 'roles/compute.instanceAdmin.v1', f4: 'roles/viewer' },
    correct_rationale: 'Pick the narrowest predefined role that covers the task. Bucket-level storage roles fit the first two, Compute Instance Admin is the narrowest listed role that can operate instances, and Viewer gives read-only access across the project.',
    optionRationales: ['Object Viewer reads objects; Storage Admin and Owner grant far more, and Object Creator cannot read.', 'Object Creator can create objects but not read, overwrite, or delete them; the admin roles and Editor are broader than needed.', 'Compute Viewer cannot change instance state; Editor and Owner are far broader. Instance Admin also allows creating and deleting instances, so a custom role would be tighter still.', 'Viewer is read-only across the project; Browser shows only the resource hierarchy, and Editor and Owner can change things.'] }
].map(x => ({ ...x, exam: x.exam_code, services: [], tags: ['new-format'], origin: 'generated-practice', reviewStatus: 'draft', distractor_summary: '' }));
const SAMPLE_IDS = SAMPLE_ITEMS.map(x => x.id);

/* Validation and normalisation for the new formats */
const _validateP4 = validateQuestion;
validateQuestion = function (q, i) {
  const errs = _validateP4(q, i); if (!q || typeof q !== 'object') return errs; const id = q.id || '#' + i; const t = q.qtype || 'single'; const n = Array.isArray(q.options) ? q.options.length : 0;
  if (t === 'multi' && !(Array.isArray(q.answerKey) && q.answerKey.length >= 2 && q.answerKey.every(k => Number.isInteger(k) && k >= 0 && k < n) && new Set(q.answerKey).size === q.answerKey.length && (q.selectCount == null || q.selectCount === q.answerKey.length))) errs.push(`${id}: multi-select needs "answerKey" with 2+ option indexes matching "selectCount"`);
  if (t === 'ordering' && !(Array.isArray(q.answerKey) && q.answerKey.length === n && [...q.answerKey].sort((a, b) => a - b).every((k, j) => k === j))) errs.push(`${id}: ordering needs "answerKey" listing every option index once, in the correct order`);
  if (t === 'pbq-sim' && !(q.sim && Array.isArray(q.sim.fields) && q.sim.fields.length && q.answerKey && q.sim.fields.every(f => f && f.id && Array.isArray(f.choices) && f.choices.includes(q.answerKey[f.id])))) errs.push(`${id}: a simulation needs "sim.fields" and an "answerKey" value from each field's choices`);
  if (t === 'case' && !(q.caseStudyId && CASE_STUDIES[q.caseStudyId])) errs.push(`${id}: case-study items need a known "caseStudyId"`);
  return errs;
};
const _normalizeP4 = normalizeQuestion;
normalizeQuestion = function (q) { const n = _normalizeP4(q); n.answerKey = q.answerKey ?? null; n.sim = q.sim ?? null; if (n.qtype === 'multi' && Array.isArray(n.answerKey)) n.selectCount = n.answerKey.length; return n; };
function p4AddSamples() { let added = 0; for (const it of SAMPLE_ITEMS) { if (S.bank.has(it.id) || !examMetaFor(it.exam_code)) continue; if (validateQuestion(it, 0).length) { console.warn('Sample item rejected', it.id, validateQuestion(it, 0)); continue; } S.bank.set(it.id, normalizeQuestion(it)); S.order.push(it.id); added++; } return added; }

/* ---------- Scoring */
function scoreItem(q, a) {
  const t = qtypeOf(q);
  if (a == null) return false;
  if (t === 'multi') { const k = new Set(q.answerKey); return Array.isArray(a) && a.length === k.size && a.every(x => k.has(x)); }
  if (t === 'ordering') return Array.isArray(a) && a.length === q.answerKey.length && a.every((x, i) => x === q.answerKey[i]);
  if (t === 'pbq-sim') return typeof a === 'object' && Object.entries(q.answerKey).every(([f, v]) => a[f] === v);
  return a === q.correct_index;
}
function recordAny(id, ans, mode, ms) {
  const q = Q(id); const correct = scoreItem(q, ans); const single = isChoiceType(q) && qtypeOf(q) !== 'multi';
  (S.progress.answers[id] ||= []).push({ t: Date.now(), choice: single ? ans : -1, correct, mode, ms: Math.round(ms || 0), ...(single ? {} : { answer: ans }) });
  const s = S.session; s.answered++; if (correct) { s.correct++; s.streak++; s.best = Math.max(s.best, s.streak); } else s.streak = 0;
  renderSessionMini(); srsOnAnswer(id, correct); persistSoon(SAVE_QUICK); return correct;
}

/* ---------- Runner state */
const examLike = r => r && r.reveal === 'end' && !r.readOnly;
const permOf = (r, q) => (r && r.perm && r.perm[q.id]) || q.options.map((_, i) => i);
startRunner = function (cfg) {
  if (!cfg.ids.length) { toast('No questions match those settings.'); return; }
  const perm = {}; const shuffleOn = cfg.shuffle !== false;
  for (const id of cfg.ids) { const q = Q(id); if (!q) continue; const t = qtypeOf(q); const idx = q.options.map((_, i) => i);
    if (t === 'ordering') perm[id] = shuffle(idx);
    else if (isChoiceType(q) && shuffleOn && !q.options.some(o => NO_SHUFFLE_RX.test(o)) && !NO_SHUFFLE_RX.test(q.question)) perm[id] = shuffle(idx); }
  S.runner = {
    id: 'r' + Date.now(), title: cfg.title, mode: cfg.mode, reveal: cfg.reveal || 'immediate', examCode: cfg.examCode || null,
    ids: cfg.ids.slice(), idx: 0, resp: {}, draft: {}, flags: {}, time: {}, perm, shownAt: Date.now(), startedAt: Date.now(),
    endAt: cfg.minutes ? Date.now() + cfg.minutes * 60000 : null, minutes: cfg.minutes || 0, readOnly: !!cfg.readOnly, finished: false,
    sim: !!cfg.sim, passPct: cfg.passPct ?? null, seenBefore: seenBefore(cfg.ids), warned: {}
  };
  go('run');
};
function p4Leave() { const r = S.runner; if (!r || r.readOnly) return; const id = r.ids[r.idx]; r.time ||= {}; r.time[id] = (r.time[id] || 0) + Math.max(0, Date.now() - (r.shownAt || Date.now())); r.shownAt = Date.now(); }
move = function (d) { const r = S.runner; if (!r) return; const n = r.idx + d; if (n < 0 || n >= r.ids.length) return; p4Leave(); r.idx = n; r.reviewing = false; r.shownAt = Date.now(); render(); $('#qtext')?.focus(); };
function p4Flag() { const r = S.runner; if (!r) return; const id = r.ids[r.idx]; if (examLike(r)) { r.flags ||= {}; r.flags[id] = !r.flags[id]; announce(r.flags[id] ? 'Flagged for review.' : 'Flag removed.'); } else toggleFlag(id); render(); $('[data-action="flag"]')?.focus(); }
function commitItem(r, id, ans) { const q = Q(id); const ms = (r.time?.[id] || 0) + (r.ids[r.idx] === id ? Date.now() - r.shownAt : 0); const correct = recordAny(id, ans, r.mode, ms); r.resp[id] = { choice: isChoiceType(q) && qtypeOf(q) !== 'multi' ? ans : -1, answer: ans, correct, perm: r.perm?.[id] || null }; return correct; }
/* Click or key 1–4 on an option. di is the displayed position; it maps back to the original option. */
answer = function (di) {
  const r = S.runner; if (!r || r.readOnly || r.finished) return; const id = r.ids[r.idx]; const q = Q(id); const t = qtypeOf(q);
  if (!isChoiceType(q)) return; const perm = permOf(r, q); if (di < 0 || di >= perm.length) return; const oi = perm[di];
  r.draft ||= {};
  if (t === 'multi') {
    if (r.resp[id] && !examLike(r)) return; const cur = new Set(r.draft[id] || []); cur.has(oi) ? cur.delete(oi) : cur.add(oi); r.draft[id] = [...cur].sort((a, b) => a - b);
    if (examLike(r)) delete r.resp[id]; announce(`${cur.has(oi) ? 'Selected' : 'Cleared'} ${LETTERS[di]}. ${cur.size} of ${q.selectCount} chosen.`); render(); $(`[data-action="answer"][data-i="${di}"]`)?.focus(); return;
  }
  if (examLike(r)) { r.draft[id] = oi; announce(`Answer ${LETTERS[di]} selected. You can change it until you submit.`); render(); $(`[data-action="answer"][data-i="${di}"]`)?.focus(); return; }
  if (r.resp[id]) return;
  const correct = commitItem(r, id, oi);
  announce(r.reveal === 'immediate' ? (correct ? 'Correct.' : `Incorrect. The correct answer is ${LETTERS[perm.indexOf(q.correct_index)]}.`) : `Answer ${LETTERS[di]} locked.`);
  render(); $('[data-action="next"]')?.focus();
};
function p4Check() { const r = S.runner; const id = r.ids[r.idx]; const q = Q(id); const d = r.draft?.[id] ?? (qtypeOf(q) === 'ordering' ? permOf(r, q).slice() : null);
  if (qtypeOf(q) === 'multi' && (!d || d.length !== q.selectCount)) { showStatus(`Choose exactly ${q.selectCount} answers.`); return; }
  if (qtypeOf(q) === 'pbq-sim' && (!d || q.sim.fields.some(f => !d[f.id]))) { showStatus('Set every field before checking.'); return; }
  const c = commitItem(r, id, d); announce(c ? 'Correct.' : 'Not quite. See the explanation.'); render(); $('[data-action="next"]')?.focus(); }
function ordCurrent(r, q) { return (r.resp[q.id]?.answer) || r.draft?.[q.id] || permOf(r, q).slice(); }
function ordMove(i, d) { const r = S.runner; const q = Q(r.ids[r.idx]); if (r.resp[q.id] && !examLike(r)) return; const a = ordCurrent(r, q).slice(); const j = i + d; if (j < 0 || j >= a.length) return; [a[i], a[j]] = [a[j], a[i]]; r.draft[q.id] = a; if (examLike(r)) delete r.resp[q.id]; render(); announce(`Moved to position ${j + 1}.`); $(`[data-ord="${j}"] [data-action="p4-ord"][data-d="${d}"]`)?.focus() || $(`[data-ord="${j}"] [data-action="p4-ord"]`)?.focus(); }

/* ---------- Time warnings at 10 and 5 minutes */
tickTimer = function () {
  clearInterval(timerHandle); const r = S.runner; if (!r || !r.endAt || r.finished) return;
  timerHandle = setInterval(() => {
    const el = $('#timer'); const left = (r.endAt - Date.now()) / 1000;
    if (el) { el.textContent = fmtTime(left); el.classList.toggle('low', left < 300); }
    r.warned ||= {};
    for (const m of [10, 5]) if (left <= m * 60 && left > 0 && !r.warned[m] && r.minutes > m) { r.warned[m] = true; const msg = `${m} minutes left.`; announce(msg); toast(msg); const w = $('#timeWarn'); if (w) w.textContent = msg; }
    if (left <= 0) { clearInterval(timerHandle); announce('Time is up. Your exam has been submitted.'); finishRunner(true); }
  }, 1000);
};

/* ---------- Finishing: review screen first, then score every format */
finishRunner = function (force) {
  const r = S.runner; if (!r || r.finished) return; p4Leave();
  if (r.readOnly) { r.finished = true; clearInterval(timerHandle); S.runner = null; go('results'); return; }
  if (!force && examLike(r) && !r.reviewing) { r.reviewing = true; render(); $('#rv-h')?.focus(); return; }
  r.finished = true; clearInterval(timerHandle);
  if (examLike(r)) for (const id of r.ids) if (r.draft?.[id] != null && !r.resp[id]) commitItem(r, id, r.draft[id]);
  const answered = r.ids.filter(id => r.resp[id]); const cor = answered.filter(id => r.resp[id].correct).length;
  const scored = r.mode === 'exam' ? r.ids : answered; const byDomain = {};
  for (const id of scored) { const q = Q(id); const d = byDomain[q.exam_code + ': ' + q.domain] ||= { total: 0, correct: 0 }; d.total++; if (r.resp[id]?.correct) d.correct++; }
  const summary = { id: r.id, mode: r.mode, examCode: r.examCode, title: r.title, exam: r.examCode, started: r.startedAt, ended: Date.now(), total: scored.length, answered: answered.length, correct: cor, byDomain, ids: scored, responses: r.resp,
    timed: !!r.endAt, minutes: r.minutes, sim: !!r.sim, passPct: r.passPct, time: r.time || {}, perm: r.perm || {}, flags: Object.keys(r.flags || {}).filter(k => r.flags[k]), seenBefore: r.seenBefore || 0 };
  if (answered.length || r.mode === 'exam') S.progress.sessions.push(summary);
  S.lastResult = summary; S.runner = null; go('results');
};

/* ---------- Rendering helpers per format */
function choiceOptions(r, q, resp, reveal) {
  const perm = permOf(r, q); const multi = qtypeOf(q) === 'multi'; const sel = resp ? resp.answer ?? resp.choice : r.draft?.[q.id];
  const chosenSet = multi ? new Set(Array.isArray(sel) ? sel : []) : null; const keySet = multi ? new Set(q.answerKey) : null;
  const lockedForever = r.readOnly || (resp && !examLike(r));
  return perm.map((oi, di) => {
    const chosen = multi ? chosenSet.has(oi) : sel === oi; const right = multi ? keySet.has(oi) : oi === q.correct_index; let cls = '', verdict = '';
    if (reveal) { if (right) { cls = 'correct'; verdict = multi ? (chosen ? 'Correct, selected' : 'Correct, missed') : 'Correct answer'; } else if (chosen) { cls = 'wrong'; verdict = 'Your answer'; } }
    else if (chosen) cls = 'chosen';
    return `<button class="opt ${cls}" data-action="answer" data-i="${di}" ${lockedForever ? 'disabled' : ''} ${multi ? `aria-pressed="${chosen}"` : ''} aria-describedby="qtext"><span class="key" aria-hidden="true">${multi ? (chosen ? '✓' : LETTERS[di]) : LETTERS[di]}</span><span><span class="sr-only">Option ${LETTERS[di]}: </span>${rich(q.options[oi])}</span><span class="verdict">${verdict}</span></button>`;
  }).join('');
}
function orderingHtml(r, q, resp, reveal) {
  const cur = ordCurrent(r, q); const locked = r.readOnly || (resp && !examLike(r));
  return `<p class="small muted" id="ordHelp">Drag the handle, or use the Up and Down buttons, to put the items in order. Position 1 comes first.</p>
  <ol class="ord-list" aria-describedby="ordHelp">${cur.map((oi, i) => { const ok = reveal ? q.answerKey[i] === oi : null;
    return `<li class="ord-item ${ok === true ? 'ok' : ok === false ? 'no' : ''}" data-ord="${i}"><span class="ord-handle" ${locked ? '' : 'data-drag="1"'} aria-hidden="true">⠿</span><span class="ord-n">${i + 1}</span><span class="ord-t">${rich(q.options[oi])}${reveal && ok === false ? `<span class="small muted"> (belongs at position ${q.answerKey.indexOf(oi) + 1})</span>` : ''}</span>
      ${locked ? '' : `<span class="ord-btns"><button class="btn sm ghost" data-action="p4-ord" data-i="${i}" data-d="-1" aria-label="Move ${esc(q.options[oi])} up" ${i === 0 ? 'disabled' : ''}>Up</button><button class="btn sm ghost" data-action="p4-ord" data-i="${i}" data-d="1" aria-label="Move ${esc(q.options[oi])} down" ${i === cur.length - 1 ? 'disabled' : ''}>Down</button></span>`}</li>`; }).join('')}</ol>`;
}
function pbqHtml(r, q, resp, reveal) {
  const cur = resp?.answer || r.draft?.[q.id] || {}; const locked = r.readOnly || (resp && !examLike(r));
  return `<div class="pbq" role="group" aria-label="Simulation">${q.sim.fields.map(f => { const v = cur[f.id] || ''; const ok = reveal ? v === q.answerKey[f.id] : null;
    return `<div class="pbq-row ${ok === true ? 'ok' : ok === false ? 'no' : ''}"><label for="pbq-${esc(f.id)}">${esc(f.label)}</label><select id="pbq-${esc(f.id)}" data-x4pbq="${esc(f.id)}" ${locked ? 'disabled' : ''}>${opts(f.choices.slice().sort((x, y) => x.localeCompare(y)), v, 'Choose…')}</select>${reveal && ok === false ? `<span class="small">Expected: <strong>${esc(q.answerKey[f.id])}</strong></span>` : ''}</div>`; }).join('')}</div>`;
}
function caseHtml(q) { const c = CASE_STUDIES[q.caseStudyId]; if (!c) return ''; return `<h3>${esc(c.title)}</h3>${c.body.map(p => `<p>${esc(p)}</p>`).join('')}<p class="small muted">Practice material, not an official case study.</p>`; }

/* Explanation that knows about shuffling and the new formats */
const _explainP3 = explainPanel;
explainPanel = function (q, correct, perm) {
  perm = perm || q.options.map((_, i) => i); const L = oi => LETTERS[perm.indexOf(oi)]; const t = qtypeOf(q);
  const keyLine = t === 'multi' ? `Correct answers: ${q.answerKey.map(L).sort().join(' and ')}.` : t === 'ordering' ? 'Correct order: ' + q.answerKey.map((oi, i) => `${i + 1}. ${q.options[oi]}`).join('  ') : t === 'pbq-sim' ? 'Correct settings: ' + q.sim.fields.map(f => `${f.label} = ${q.answerKey[f.id]}`).join('; ') : null;
  const view = { ...q, correct_index: t === 'single' || t === 'case' ? q.correct_index : -1 };
  let h = _explainP3(t === 'single' || t === 'case' ? q : view, correct);
  if (t === 'single' || t === 'case') {
    h = h.replace(/The answer is [A-F]\./, `The answer is ${L(q.correct_index)}.`).replace(/Why [A-F] is correct/, `Why ${L(q.correct_index)} is correct`);
    if (q.optionRationales) h = h.replace(/<ul>([\s\S]*?)<\/ul><\/div>\s*\n\s*(?=(?:<div class="blk"><h3>Common|<div class="blk"><h3>Prerequisites|<div class="blk"><h3>Official))/, () => `<ul>${perm.filter(oi => oi !== q.correct_index).map(oi => `<li><strong>${L(oi)}.</strong> ${String(q.optionRationales[oi] || '').trim() ? rich(q.optionRationales[oi]) : '<span class="muted">No explanation for this option yet.</span>'}</li>`).join('')}</ul></div>\n    `);
    return h;
  }
  const line = correct === true ? 'Correct.' : correct === false ? 'Not quite.' : '';
  h = h.replace(/<p class="result-line">[\s\S]*?<\/p>/, `<p class="result-line">${line} ${esc(keyLine)}</p>`).replace(/<h3>Why [^<]* is correct<\/h3>/, '<h3>Why this is the answer</h3>');
  if (q.optionRationales) { const items = t === 'pbq-sim' ? q.sim.fields.map((f, i) => [f.label, q.optionRationales[i]]) : t === 'ordering' ? q.answerKey.map((oi, i) => [`${i + 1}. ${q.options[oi]}`, q.optionRationales[oi]]) : perm.map(oi => [`${L(oi)}. ${q.options[oi]}`, q.optionRationales[oi]]);
    h = h.replace(/<h3>Why the others are wrong<\/h3>[\s\S]*?<\/div>\s*\n/, `<h3>${t === 'multi' ? 'Each option' : t === 'ordering' ? 'Why each step sits where it does' : 'Each setting'}</h3><ul>${items.map(([l, x]) => `<li><strong>${esc(l)}</strong> ${String(x || '').trim() ? rich(x) : '<span class="muted">No explanation yet.</span>'}</li>`).join('')}</ul></div>\n`); }
  return h;
};

/* ---------- Runner view */
VIEWS.run = () => {
  const r = S.runner;
  if (!r) return emptyState('No active session', 'Start a study set, a focus drill, or a practice exam to begin.', '<a class="btn primary" href="#/study">Study</a><a class="btn" href="#/exam">Start exam</a>');
  if (r.reviewing) return reviewScreen(r);
  const id = r.ids[r.idx]; const q = Q(id); const resp = r.resp[id]; const t = qtypeOf(q);
  const reveal = r.readOnly || (resp && r.reveal === 'immediate');
  const answered = x => !!(r.resp[x] || r.draft?.[x] != null); const answeredCount = r.ids.filter(answered).length;
  const flagged = examLike(r) ? !!r.flags?.[id] : S.progress.flags.has(id); const conf = S.progress.confidence[id] || '';
  const body = t === 'ordering' ? orderingHtml(r, q, resp, reveal) : t === 'pbq-sim' ? pbqHtml(r, q, resp, reveal) : `<div class="options" role="group" aria-label="Answer options">${choiceOptions(r, q, resp, reveal)}</div>`;
  const needsCheck = !r.readOnly && !examLike(r) && !resp && ['multi', 'ordering', 'pbq-sim'].includes(t);
  const instr = t === 'multi' ? `<p class="chip strong" style="display:inline-block;margin-bottom:10px">Choose ${q.selectCount}</p>` : t === 'pbq-sim' ? '<p class="chip strong" style="display:inline-block;margin-bottom:10px">Simulation: set every field</p>' : t === 'ordering' ? '<p class="chip strong" style="display:inline-block;margin-bottom:10px">Put in order</p>' : '';
  const draftNote = examLike(r) && answered(id) ? '<p class="notice" style="margin-top:14px">Answer saved. You can change it until you submit. Explanations appear after you submit.</p>' : resp && !reveal && !examLike(r) ? '<p class="notice" style="margin-top:14px">Answer locked. Explanations appear when you finish.</p>' : '';
  const card = `<article class="card qcard" aria-labelledby="qhead">
      <h2 class="sr-only" id="qhead">Question ${r.idx + 1} of ${r.ids.length}</h2>
      <div class="qmeta"><span class="chip strong">Question ${r.idx + 1} of ${r.ids.length}</span><span class="chip">${esc(q.exam_code)}</span><span class="chip">${esc(q.domain)}</span>${q.reviewStatus === 'draft' ? '<span class="chip warn-chip">Draft practice item</span>' : ''}${flagged && examLike(r) ? '<span class="chip warn-chip">Flagged for review</span>' : ''}</div>
      ${t === 'case' ? `<details class="case-inline"><summary>Case study: ${esc(CASE_STUDIES[q.caseStudyId]?.title || '')}</summary>${caseHtml(q)}</details>` : ''}
      ${instr}<p class="qtext" id="qtext" tabindex="-1">${rich(q.question)}</p>
      ${body}
      ${needsCheck ? `<div class="row" style="margin-top:12px"><button class="btn primary" data-action="p4-check">Check answer</button></div>` : ''}
      ${reveal ? explainPanel(q, resp ? resp.correct : (lastAttempt(id) ? lastAttempt(id).correct : null), resp?.perm || r.perm?.[id]) : draftNote}
      <div class="qmeta" style="margin-top:18px">${reveal ? q.services.map(s => `<span class="chip">${esc(s)}</span>`).join('') : ''}<span class="chip">${esc(q.difficulty)}${q.difficulty_source === 'inferred' ? ' (inferred)' : ''}</span><span class="chip faint">${esc(q.id)}</span></div>
      <div class="run-foot">
        <button class="btn ${flagged ? 'flag-on' : ''}" data-action="flag" aria-pressed="${flagged}">${flagged ? 'Flagged' : examLike(r) ? 'Flag for review' : 'Flag for later'}</button>
        ${examLike(r) ? '' : `<div class="seg-control" role="group" aria-label="Confidence">${['high', 'medium', 'low'].map(c => `<button type="button" data-action="conf" data-v="${c}" aria-pressed="${conf === c}">${c[0].toUpperCase() + c.slice(1)}</button>`).join('')}</div>`}
        <span class="spacer"></span>
        <button class="btn" data-action="prev" ${r.idx === 0 ? 'disabled' : ''}>Previous</button>
        ${r.idx < r.ids.length - 1 ? `<button class="btn primary" data-action="next">Next question</button>` : `<button class="btn primary" data-action="end-run">${r.readOnly ? 'Close review' : examLike(r) ? 'Review and submit' : r.mode === 'exam' ? 'Submit exam' : 'Finish session'}</button>`}
      </div></article>`;
  return `
  <div class="run-head"><span class="title">${esc(r.title)}</span><span class="spacer"></span><span class="sr-only" aria-live="assertive" id="timeWarn"></span>
    ${r.endAt ? `<span class="timer ${(r.endAt - Date.now()) < 300000 ? 'low' : ''}" id="timer" role="timer" aria-label="Time remaining">${fmtTime((r.endAt - Date.now()) / 1000)}</span>` : ''}
    <button class="btn sm" data-action="end-run">${r.readOnly ? 'Close review' : examLike(r) ? 'Review and submit' : r.mode === 'exam' ? 'Submit exam' : 'End session'}</button></div>
  <div class="bar" style="margin-bottom:18px" role="progressbar" aria-label="Session progress" aria-valuemin="0" aria-valuemax="${r.ids.length}" aria-valuenow="${answeredCount}"><i style="width:${pct(answeredCount, r.ids.length)}%"></i></div>
  <div class="runner ${t === 'case' ? 'has-case' : ''}">
    ${t === 'case' ? `<aside class="case-panel card" aria-label="Case study" tabindex="0">${caseHtml(q)}</aside>` : ''}
    ${card}
    <aside class="side-panel" aria-label="Session details">
      <section class="card"><h3>${r.mode === 'exam' ? 'Question map' : 'Progress'}</h3>
        <p class="small muted" style="margin-bottom:10px">${answeredCount} of ${r.ids.length} answered${r.reveal === 'immediate' || r.readOnly ? `, ${r.ids.filter(x => r.resp[x]?.correct).length} correct` : ''}${examLike(r) ? `, ${Object.values(r.flags || {}).filter(Boolean).length} flagged` : ''}.</p>
        <div class="palette">${r.ids.map((x, i) => { const rs = r.resp[x]; const st = rs && (r.reveal === 'immediate' || r.readOnly) ? (rs.correct ? 'ok' : 'no') : answered(x) ? 'done' : ''; const fl = examLike(r) ? r.flags?.[x] : S.progress.flags.has(x);
          return `<button class="${st} ${i === r.idx ? 'cur' : ''} ${fl ? 'flag' : ''}" data-action="jump" data-i="${i}" aria-label="Question ${i + 1}${answered(x) ? ', answered' : ', not answered'}${fl ? ', flagged' : ''}" ${i === r.idx ? 'aria-current="true"' : ''}>${i + 1}</button>`; }).join('')}</div></section>
      <section class="card small"><h3>Shortcuts</h3><p class="muted"><span class="kbd">1</span>–<span class="kbd">${Math.min(6, q.options.length)}</span> choose, <span class="kbd">Enter</span> next, <span class="kbd">←</span> back, <span class="kbd">F</span> flag${examLike(r) ? ', <span class="kbd">R</span> review and submit' : ''}.</p></section>
    </aside></div>`;
};
function reviewScreen(r) {
  const f = r.reviewFilter || 'all'; const answered = x => !!(r.resp[x] || r.draft?.[x] != null);
  const un = r.ids.filter(x => !answered(x)).length; const fl = r.ids.filter(x => r.flags?.[x]).length;
  const list = r.ids.map((x, i) => [x, i]).filter(([x]) => f === 'all' || (f === 'flagged' && r.flags?.[x]) || (f === 'unanswered' && !answered(x)));
  return `<div class="run-head"><span class="title">${esc(r.title)}: review before submitting</span><span class="spacer"></span>${r.endAt ? `<span class="timer" id="timer" role="timer" aria-label="Time remaining">${fmtTime((r.endAt - Date.now()) / 1000)}</span>` : ''}<span class="sr-only" aria-live="assertive" id="timeWarn"></span></div>
  <section class="card"><h2 id="rv-h" tabindex="-1">Review your answers</h2>
    <p class="muted">${r.ids.length - un} of ${r.ids.length} answered · ${un} unanswered${un ? ' (scored as incorrect)' : ''} · ${fl} flagged for review.${r.endAt ? ' The clock is still running.' : ''}</p>
    <div class="row" role="group" aria-label="Show" style="margin:12px 0">${[['all', 'All'], ['flagged', `Flagged (${fl})`], ['unanswered', `Unanswered (${un})`]].map(([k, l]) => `<button class="chip ${f === k ? 'strong' : ''}" data-action="p4-rvf" data-v="${k}" aria-pressed="${f === k}">${l}</button>`).join('')}</div>
    <div class="rv-grid">${list.map(([x, i]) => `<button class="rv-cell ${answered(x) ? 'done' : ''} ${r.flags?.[x] ? 'flag' : ''}" data-action="jump" data-i="${i}"><strong>${i + 1}</strong><span class="small">${answered(x) ? 'Answered' : 'Not answered'}${r.flags?.[x] ? ' · Flagged' : ''}</span></button>`).join('') || '<p class="small muted">Nothing in this view.</p>'}</div>
    <div class="row" style="margin-top:16px"><button class="btn" data-action="jump" data-i="${r.idx}">Return to questions</button><button class="btn primary" data-action="p4-submit">Submit exam</button></div></section>`;
}

/* ---------- Exam setup driven by EXAM_PROFILES */
VIEWS.exam = () => {
  const f = S.ui.exam4 ||= { exam: S.ui.exam?.exam || focusExam() || activeExams()[0]?.code || '', kind: 'sim', count: 50, minutes: 90, diffs: ['easy', 'medium', 'hard'], reveal: 'end', fresh: 0 };
  if (!examMetaFor(f.exam)) f.exam = activeExams()[0]?.code || '';
  const spec = simSpec(f.exam); const pr = examProfile(f.exam); const all = examQs(f.exam).map(q => q.id);
  const pool = freshIds(f.kind === 'sim' ? all : examQs(f.exam).filter(q => f.diffs.includes(q.difficulty)).map(q => q.id), +f.fresh);
  const n = f.kind === 'sim' ? spec.n : Math.max(5, +f.count || 50); const seenPct = pool.length ? Math.round(seenBefore(pool) / pool.length * 100) : 0;
  const ow = officialWeights(f.exam); const doms = domainsOf(f.exam); const wOk = ow && ow.length === doms.length;
  const tag = ok => ok ? '<span class="chip ok-chip">Official</span>' : '<span class="chip warn-chip">Practice setting, not official</span>';
  return `<div class="page-head"><div><h1>Exam mode</h1><p class="muted">Full simulations use the official number of questions, time, and pass mark where the exam provider publishes them. Answers stay editable until you submit, you can flag questions for review, and explanations appear only at the end.</p></div></div>
  <div class="grid g-2">
    <section class="card" aria-labelledby="h-setup"><h2 id="h-setup">Set up</h2>
      <div class="field"><label for="x4-exam">Certification</label><select id="x4-exam" data-x4="exam">${examOpts(f.exam, null)}</select></div>
      <div class="seg-control" role="group" aria-label="Exam type" style="margin:12px 0">${[['sim', 'Full simulation'], ['custom', 'Custom practice exam']].map(([k, l]) => `<button type="button" data-action="p4-kind" data-v="${k}" aria-pressed="${f.kind === k}">${l}</button>`).join('')}</div>
      ${f.kind === 'sim' ? `<dl class="dstat"><div><dt>Questions ${tag(spec.nOfficial)}</dt><dd>${spec.n}</dd></div><div><dt>Time ${tag(spec.minOfficial)}</dt><dd>${spec.minutes} min</dd></div><div><dt>Pass mark ${tag(spec.passOfficial)}</dt><dd>${spec.passOfficial ? `${spec.passScore} of ${spec.scale[0]}–${spec.scale[1]}` : spec.passPct + '%'}</dd></div><div><dt>Domain mix ${tag(wOk)}</dt><dd>${wOk ? 'Official weights' : 'Equal'}</dd></div></dl>
        <p class="small muted" style="margin-top:8px">${esc(spec.nNote)}${spec.passNote ? ' ' + esc(spec.passNote) : ''}${spec.status ? ' ' + esc(spec.status) : ''} ${spec.sourceUrl ? `Source: <a href="${esc(spec.sourceUrl)}" target="_blank" rel="noopener">official page</a>, checked ${esc(spec.lastVerified)}.` : 'Check the official exam page.'}</p>`
      : `<div class="grid g-2"><div class="field"><label for="x4-count">Questions</label><input id="x4-count" type="number" min="5" max="${pool.length || 200}" data-x4="count" value="${Math.min(+f.count || 50, pool.length || 50)}" inputmode="numeric"></div><div class="field"><label for="x4-min">Minutes (0 = untimed)</label><input id="x4-min" type="number" min="0" max="300" data-x4="minutes" value="${f.minutes}" inputmode="numeric"></div></div>
        <fieldset style="margin-top:10px"><legend class="small muted">Difficulty</legend><div class="checks">${DIFFS.map(d => `<label class="check"><input type="checkbox" data-x4diff="${d}" ${f.diffs.includes(d) ? 'checked' : ''}> ${d}</label>`).join('')}</div></fieldset>
        <div class="seg-control" role="group" aria-label="Explanations" style="margin-top:10px">${[['end', 'Explanations at the end'], ['immediate', 'After each question']].map(([k, l]) => `<button type="button" data-action="p4-reveal" data-v="${k}" aria-pressed="${f.reveal === k}">${l}</button>`).join('')}</div>`}
      <div class="field" style="margin-top:12px"><label for="x4-fresh">Fresh questions only</label><select id="x4-fresh" data-x4="fresh">${opts([['0', 'Off: any question'], ['7', 'Not seen in the last 7 days'], ['14', 'Not seen in the last 14 days'], ['30', 'Not seen in the last 30 days'], ['3650', 'Never seen before']], String(f.fresh))}</select></div>
      <p class="small muted" aria-live="polite" style="margin-top:8px">${pool.length} questions eligible. ${seenPct}% of them you have seen before.${pool.length < n ? ` <strong>Only ${pool.length} are eligible, so the exam will be shorter than ${n}.</strong>` : ''}${seenPct > 70 ? ' <strong>Most of these are familiar, so your score may overstate readiness. Try "Fresh questions only".</strong>' : ''}</p>
      <div class="row" style="margin-top:12px"><button class="btn primary" data-action="p4-start" ${pool.length ? '' : 'disabled'}>Start ${f.kind === 'sim' ? 'full simulation' : 'practice exam'}</button></div></section>
    <section class="card"><h2>${esc(pr?.name || examMetaFor(f.exam)?.name || '')}</h2>${f.exam ? blueprintStrip(f.exam, true) : ''}
      <div class="legend">${doms.map((d, i) => { const tt = totals(q => q.exam_code === f.exam && q.domain === d); return `<div><span>${esc(d)}</span><span class="muted">${wOk ? Math.round(ow[i] * 100) + '%' : 'equal'}${tt.att ? `, ${tt.acc}% correct` : ''}</span></div>`; }).join('')}</div>
      <div class="notice" style="margin-top:14px"><strong>New question formats.</strong> <span class="small">Try multiple-select, a case study, ordering, and simulation items. They are draft practice items and stay out of normal pools until approved in Content review.</span><div class="row" style="margin-top:8px"><button class="btn sm" data-action="p4-samples" data-v="practice">Practice them</button><button class="btn sm" data-action="p4-samples" data-v="exam">10-minute mini exam</button></div></div></section></div>`;
};
blueprintSample = function (code, n, diffs, ids) {
  let pool = (ids ? ids.map(Q) : examQs(code)).filter(q => q && diffs.includes(q.difficulty)); if (!pool.length) return [];
  n = Math.min(n, pool.length); const byD = new Map(); for (const q of pool) { const k = String(q.domain_number); (byD.get(k) || byD.set(k, []).get(k)).push(q.id); }
  const keys = [...byD.keys()]; const w = p4Weights(code, keys); const tw = keys.reduce((s, k) => s + (w[k] || 0), 0) || keys.length;
  const alloc = keys.map(k => { const exact = n * (w[k] || 0) / tw; return { k, n: Math.min(Math.floor(exact), byD.get(k).length), rem: exact % 1 }; });
  let left = n - alloc.reduce((s, a) => s + a.n, 0); for (const a of alloc.sort((x, y) => y.rem - x.rem)) { if (left <= 0) break; if (a.n < byD.get(a.k).length) { a.n++; left--; } }
  let picked = alloc.flatMap(a => shuffle(byD.get(a.k)).slice(0, a.n)); if (picked.length < n) picked = picked.concat(shuffle(pool.map(q => q.id).filter(id => !picked.includes(id))).slice(0, n - picked.length));
  return shuffle(picked);
};
function p4StartExam() {
  const f = S.ui.exam4; const spec = simSpec(f.exam);
  if (f.kind === 'sim') { const pool = freshIds(examQs(f.exam).map(q => q.id), +f.fresh); const ids = blueprintSample(f.exam, spec.n, DIFFS, pool); startRunner({ title: `${f.exam} full simulation`, mode: 'exam', ids, reveal: 'end', minutes: spec.minutes, examCode: f.exam, sim: ids.length >= spec.n, passPct: spec.passPct }); return; }
  if (!f.diffs.length) { toast('Choose at least one difficulty level.'); return; }
  const pool = freshIds(examQs(f.exam).map(q => q.id), +f.fresh); const ids = blueprintSample(f.exam, Math.max(1, +f.count || 50), f.diffs, pool);
  startRunner({ title: `${f.exam} practice exam`, mode: 'exam', ids, reveal: f.reveal, minutes: Math.max(0, +f.minutes || 0), examCode: f.exam, sim: false, passPct: spec.passPct });
}
startExam = p4StartExam;

/* ---------- Results report */
function goNoGo(code) {
  const sims = S.progress.sessions.filter(s => s.mode === 'exam' && s.examCode === code && s.sim && s.total).sort((a, b) => a.ended - b.ended);
  const spec = simSpec(code); const P = spec.passPct;
  const rule = `Go = your last 2 full simulations for this exam are each at least ${Math.round(P + 5)}% (the ${spec.passOfficial ? 'official' : 'practice'} pass mark of ${P}% plus 5 points) and no domain is below 65% in either. Not yet = your latest full simulation passes, but the Go rule is not met. No-Go = your latest full simulation is below the pass mark.`;
  if (!sims.length) return { verdict: 'none', label: 'No verdict yet', rule, why: 'Take a full simulation to get a recommendation.' };
  const st = s => { const raw = s.correct / s.total * 100; const minDom = Math.min(...Object.values(s.byDomain).map(d => d.total ? d.correct / d.total * 100 : 100)); return { raw, minDom, inflated: s.total && s.seenBefore / s.total > 0.7 }; };
  const last = st(sims[sims.length - 1]); const prev = sims.length > 1 ? st(sims[sims.length - 2]) : null;
  const okGo = x => x.raw >= P + 5 && x.minDom >= 65;
  const v = last.raw < P ? ['nogo', 'No-Go'] : prev && okGo(last) && okGo(prev) ? ['go', 'Go'] : ['notyet', 'Not yet'];
  const why = `Latest full simulation: ${Math.round(last.raw)}%, lowest domain ${Math.round(last.minDom)}%.${prev ? ` Previous: ${Math.round(prev.raw)}%, lowest domain ${Math.round(prev.minDom)}%.` : ' Only one full simulation so far.'}${last.inflated ? ' Over 70% of the latest simulation\'s questions were ones you had seen before, so this may overstate readiness.' : ''}`;
  return { verdict: v[0], label: v[1], rule, why };
}
function reportHtml(r) {
  const code = r.examCode || r.exam; const spec = simSpec(code); const raw = r.total ? r.correct / r.total * 100 : 0;
  const scaled = spec.scale ? Math.round(spec.scale[0] + raw / 100 * (spec.scale[1] - spec.scale[0])) : null;
  const doms = domainsOf(code); const ow = officialWeights(code); const wOk = ow && ow.length === doms.length;
  const rows = doms.map((d, i) => { const v = r.byDomain[code + ': ' + d] || { total: 0, correct: 0 }; const ids = r.ids.filter(id => Q(id)?.domain === d); const tm = ids.reduce((s, id) => s + (r.time?.[id] || 0), 0); return { d, v, w: wOk ? ow[i] : 1 / doms.length, share: r.total ? v.total / r.total : 0, avg: ids.length ? tm / ids.length / 1000 : 0 }; });
  const times = r.ids.map(id => [id, (r.time?.[id] || 0) / 1000]); const avgT = times.length ? times.reduce((s, x) => s + x[1], 0) / times.length : 0;
  const pace = r.minutes && r.total ? r.minutes * 60 / r.total : null; const slow = times.slice().sort((a, b) => b[1] - a[1]).slice(0, 3);
  const g = r.sim ? goNoGo(code) : null; const seenPct = r.total ? Math.round(r.seenBefore / r.total * 100) : 0;
  return `<section class="card report" aria-labelledby="h-rep" style="margin-bottom:20px"><h2 id="h-rep">Exam report</h2>
    <div class="grid g-4" style="margin-top:10px">
      <div class="kpi"><div class="v">${Math.round(raw)}%</div><div class="l">Raw score</div><div class="s">${r.correct} of ${r.total}; blanks count as wrong</div></div>
      <div class="kpi"><div class="v">${scaled != null ? scaled : '—'}</div><div class="l">Practice scaled estimate</div><div class="s">${scaled != null ? `Estimate only: a straight-line map of your raw score onto the ${spec.scale[0]}–${spec.scale[1]} scale. Real exams use statistical scaling.` : 'No official scale is recorded for this exam.'}</div></div>
      <div class="kpi"><div class="v">${spec.passPct}%</div><div class="l">Pass mark used</div><div class="s">${spec.passOfficial ? `Official ${spec.passScore}, converted the same straight-line way` : 'Practice setting, not official'}</div></div>
      <div class="kpi"><div class="v">${Math.round(avgT)}s</div><div class="l">Average per question</div><div class="s">${pace ? `Exam pace allows about ${Math.round(pace)}s` : 'Untimed'}</div></div></div>
    ${raw >= spec.passPct ? `<p class="notice ok" style="margin-top:12px">Above the pass mark used for this report.</p>` : `<p class="notice" style="margin-top:12px">Below the pass mark used for this report by ${Math.round(spec.passPct - raw)} points.</p>`}
    ${seenPct > 70 ? `<p class="notice err" style="margin-top:8px">${seenPct}% of these questions were ones you had seen before, so this score probably overstates your readiness. Use "Fresh questions only" next time.</p>` : ''}
    ${g ? `<div class="gng gng-${g.verdict}" style="margin-top:12px"><strong>Recommendation: ${esc(g.label)}</strong><p class="small">${esc(g.why)}</p><p class="small muted">Rule: ${esc(g.rule)}</p></div>` : '<p class="small muted" style="margin-top:12px">Go / Not yet / No-Go is calculated from full simulations only.</p>'}
    <h3 style="margin:16px 0 8px;font-size:1rem">By domain</h3>
    <div style="overflow-x:auto"><table><thead><tr><th scope="col">Domain</th><th scope="col" class="num">Score</th><th scope="col" class="num">Questions</th><th scope="col" class="num">Share here</th><th scope="col" class="num">Exam weight</th><th scope="col" class="num">Avg time</th></tr></thead><tbody>
      ${rows.map(x => `<tr><th scope="row">${esc(x.d)}</th><td class="num ${x.v.total && x.v.correct / x.v.total < 0.65 ? 'bad-cell' : ''}">${x.v.total ? Math.round(x.v.correct / x.v.total * 100) + '%' : '—'}</td><td class="num">${x.v.correct}/${x.v.total}</td><td class="num">${Math.round(x.share * 100)}%</td><td class="num">${Math.round(x.w * 100)}%${wOk ? '' : ' (equal)'}</td><td class="num">${Math.round(x.avg)}s</td></tr>`).join('')}</tbody></table></div>
    <p class="small muted" style="margin-top:8px">Domains under 65% are highlighted. ${wOk ? 'Exam weights are from the official exam guide.' : 'Official weights are not recorded for this exam, so equal weights are shown.'} Slowest questions: ${slow.map(([id, s]) => `${r.ids.indexOf(id) + 1} (${Math.round(s)}s)`).join(', ')}.</p></section>`;
}
const _resultsP4 = VIEWS.results;
VIEWS.results = arg => {
  const r = S.lastResult; let h = _resultsP4(arg); if (!r || r.mode !== 'exam' || !(r.examCode || r.exam)) return h;
  const i = h.indexOf('<div class="grid g-4"'); const j = h.indexOf('<section class="card" aria-labelledby="h-rd">'); const k = j < 0 ? -1 : h.indexOf('</section>', j);
  if (i >= 0 && k > 0) h = h.slice(0, i) + reportHtml(r) + h.slice(k + 10); else h = reportHtml(r) + h;
  return h;
};

/* ---------- Events */
document.addEventListener('click', e => {
  const b = e.target.closest('[data-action^="p4-"]'); if (!b) return; e.preventDefault(); const d = b.dataset; const f = S.ui.exam4;
  const fx = {
    'p4-kind': () => { f.kind = d.v; render(); }, 'p4-reveal': () => { f.reveal = d.v; render(); }, 'p4-start': p4StartExam,
    'p4-check': p4Check, 'p4-ord': () => ordMove(+d.i, +d.d), 'p4-submit': () => finishRunner(true),
    'p4-rvf': () => { S.runner.reviewFilter = d.v; render(); },
    'p4-samples': () => { const ids = SAMPLE_IDS.filter(id => S.bank.has(id)); if (d.v === 'exam') startRunner({ title: 'Mini exam: new formats', mode: 'exam', ids, reveal: 'end', minutes: 10, examCode: null }); else startRunner({ title: 'New question formats', mode: 'learn', ids, reveal: 'immediate' }); }
  };
  if (fx[d.action]) fx[d.action]();
});
document.addEventListener('change', e => {
  const el = e.target;
  if (el.dataset?.x4) { S.ui.exam4[el.dataset.x4] = el.value; if (el.tagName === 'SELECT') { render(); $('#' + el.id)?.focus(); } }
  if (el.dataset?.x4diff) { const s = new Set(S.ui.exam4.diffs); el.checked ? s.add(el.dataset.x4diff) : s.delete(el.dataset.x4diff); S.ui.exam4.diffs = [...s]; render(); }
  if (el.dataset?.x4pbq && S.runner) { const r = S.runner; const id = r.ids[r.idx]; r.draft ||= {}; r.draft[id] = { ...(r.draft[id] || {}), [el.dataset.x4pbq]: el.value }; if (examLike(r)) delete r.resp[id]; persistSoon(); }
});
document.addEventListener('input', e => { const el = e.target; if (el.dataset?.x4 && el.tagName === 'INPUT') S.ui.exam4[el.dataset.x4] = el.value; });
/* Ordering: pointer drag on the handle (works with touch, pen, and mouse) */
let dragOrd = null;
document.addEventListener('pointerdown', e => { const h = e.target.closest('[data-drag]'); if (!h || !S.runner) return; const li = h.closest('[data-ord]'); dragOrd = { from: +li.dataset.ord }; li.classList.add('dragging'); h.setPointerCapture?.(e.pointerId); e.preventDefault(); });
document.addEventListener('pointermove', e => { if (!dragOrd) return; const el = document.elementFromPoint(e.clientX, e.clientY)?.closest('[data-ord]'); if (!el) return; const to = +el.dataset.ord; if (to !== dragOrd.from) { const r = S.runner; const q = Q(r.ids[r.idx]); const a = ordCurrent(r, q).slice(); const [x] = a.splice(dragOrd.from, 1); a.splice(to, 0, x); r.draft[q.id] = a; if (examLike(r)) delete r.resp[q.id]; dragOrd.from = to; render(); $(`[data-ord="${to}"]`)?.classList.add('dragging'); } });
document.addEventListener('pointerup', () => { if (dragOrd) { dragOrd = null; $$('.dragging').forEach(x => x.classList.remove('dragging')); } });
function p4AfterBoot() { const r = S.runner; if (r) { r.draft ||= {}; r.flags ||= {}; r.time ||= {}; r.perm ||= {}; r.warned ||= {}; } }

const _focusP4 = applyFocusDefaults; applyFocusDefaults = function (code) { const r = _focusP4(code); if (S.ui.exam4 && code && examMetaFor(code)) S.ui.exam4.exam = code; return r; };


