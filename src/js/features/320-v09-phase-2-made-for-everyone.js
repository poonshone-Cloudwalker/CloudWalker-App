/* ================================================================== V09 Phase 2: made for everyone
 * EXAM_PROFILES is the single home for certification facts (codes, question counts,
 * durations, pass marks, prices, domain weights, retirement dates). Every value was
 * read from the official page in sourceUrl / guideUrl on lastVerified. Anything the
 * official page did not state is null, and the UI shows "Check the official exam
 * page" for it. Nothing here is estimated. Google Cloud does not use exam codes, so
 * its short labels (CDL, ACE, PCA, ...) are the app's own and marked codeIsOfficial:false.
 */
const VERIFIED_ON = '2026-10-12';
const EXAM_PROFILES = {
  'CLF-C02': { name: 'AWS Certified Cloud Practitioner', vendor: 'AWS', cloud: 'aws', level: 'foundational', questions: 65, questionRange: null, durationMin: 90, passScore: 700, scale: '100–1,000', priceUSD: 100, status: 'active', statusNote: null,
    domains: [['Cloud Concepts', 24], ['Security and Compliance', 30], ['Cloud Technology and Services', 34], ['Billing, Pricing, and Support', 12]],
    sourceUrl: 'https://aws.amazon.com/certification/certified-cloud-practitioner/', guideUrl: 'https://docs.aws.amazon.com/aws-certification/latest/cloud-practitioner-02/cloud-practitioner-02.html', lastVerified: VERIFIED_ON, verified: true },
  'SAA-C03': { name: 'AWS Certified Solutions Architect – Associate', vendor: 'AWS', cloud: 'aws', level: 'associate', questions: 65, questionRange: null, durationMin: 130, passScore: 720, scale: '100–1,000', priceUSD: 150, status: 'active', statusNote: null,
    domains: [['Design Secure Architectures', 30], ['Design Resilient Architectures', 26], ['Design High-Performing Architectures', 24], ['Design Cost-Optimized Architectures', 20]],
    sourceUrl: 'https://aws.amazon.com/certification/certified-solutions-architect-associate/', guideUrl: 'https://docs.aws.amazon.com/aws-certification/latest/solutions-architect-associate-03/solutions-architect-associate-03.html', lastVerified: VERIFIED_ON, verified: true },
  'SAP-C02': { name: 'AWS Certified Solutions Architect – Professional', vendor: 'AWS', cloud: 'aws', level: 'professional', questions: 75, questionRange: null, durationMin: 180, passScore: null, scale: null, priceUSD: 300, status: 'retiring', statusNote: 'Being replaced by SAP-C03: registration for SAP-C03 opens October 27, 2026, and the last day to take SAP-C02 is November 16, 2026.',
    domains: null, sourceUrl: 'https://aws.amazon.com/certification/certified-solutions-architect-professional/', guideUrl: null, lastVerified: VERIFIED_ON, verified: true },
  'DOP-C02': { name: 'AWS Certified DevOps Engineer – Professional', vendor: 'AWS', cloud: 'aws', level: 'professional', questions: 75, questionRange: null, durationMin: 180, passScore: null, scale: null, priceUSD: 300, status: 'active', statusNote: null, domains: null,
    sourceUrl: 'https://aws.amazon.com/certification/certified-devops-engineer-professional/', guideUrl: null, lastVerified: VERIFIED_ON, verified: true },
  'SCS-C03': { name: 'AWS Certified Security – Specialty', vendor: 'AWS', cloud: 'aws', level: 'specialty', questions: 65, questionRange: null, durationMin: 170, passScore: null, scale: null, priceUSD: 300, status: 'active', statusNote: null, domains: null,
    sourceUrl: 'https://aws.amazon.com/certification/certified-security-specialty/', guideUrl: null, lastVerified: VERIFIED_ON, verified: true },
  'DEA-C01': { name: 'AWS Certified Data Engineer – Associate', vendor: 'AWS', cloud: 'aws', level: 'associate', questions: 65, questionRange: null, durationMin: 130, passScore: null, scale: null, priceUSD: 150, status: 'active', statusNote: null, domains: null,
    sourceUrl: 'https://aws.amazon.com/certification/certified-data-engineer-associate/', guideUrl: null, lastVerified: VERIFIED_ON, verified: true },
  'ANS-C01': { name: 'AWS Certified Advanced Networking – Specialty', vendor: 'AWS', cloud: 'aws', level: 'specialty', questions: 65, questionRange: null, durationMin: 170, passScore: null, scale: null, priceUSD: 300, status: 'retiring', statusNote: 'AWS says the last day to take this exam is December 31, 2026, and no new certifications are issued after that.', domains: null,
    sourceUrl: 'https://aws.amazon.com/certification/certified-advanced-networking-specialty/', guideUrl: null, lastVerified: VERIFIED_ON, verified: true },
  'AIB-C01': { name: 'AWS Certified AI Business Strategist', vendor: 'AWS', cloud: 'aws', level: 'business', questions: 85, questionRange: null, durationMin: 170, passScore: 700, scale: '100–1,000', priceUSD: 50, status: 'beta', statusNote: 'Beta exam: 85 questions in 170 minutes for 50 USD. AWS lists 100 USD as the standard price, and the exam guide gives 130 minutes for the standard exam.',
    domains: [['AI Fundamentals and Literacy', 24], ['AI Strategy and Business Value Creation', 28], ['AI Governance and Responsible AI Leadership', 24], ['Business Readiness, Leadership, and AI Transformation', 24]],
    sourceUrl: 'https://aws.amazon.com/certification/certified-ai-business-strategist/', guideUrl: 'https://docs.aws.amazon.com/aws-certification/latest/ai-business-strategist-01/ai-business-strategist-01.html', lastVerified: VERIFIED_ON, verified: true },
  'AZ-900': { name: 'Microsoft Azure Fundamentals', vendor: 'Microsoft', cloud: 'azure', level: 'foundational', questions: null, questionRange: null, durationMin: null, passScore: 700, scale: null, priceUSD: null, status: 'active', statusNote: null,
    domains: [['Describe cloud concepts', [25, 30]], ['Describe Azure architecture and services', [35, 40]], ['Describe Azure management and governance', [30, 35]]],
    sourceUrl: 'https://learn.microsoft.com/en-us/credentials/certifications/resources/study-guides/az-900', guideUrl: null, credentialUrl: 'https://learn.microsoft.com/en-us/credentials/certifications/azure-fundamentals/', lastVerified: VERIFIED_ON, verified: true },
  'AZ-104': { name: 'Microsoft Azure Administrator', vendor: 'Microsoft', cloud: 'azure', level: 'associate', questions: null, questionRange: null, durationMin: null, passScore: 700, scale: null, priceUSD: null, status: 'active', statusNote: null,
    domains: [['Manage Azure identities and governance', [20, 25]], ['Implement and manage storage', [15, 20]], ['Deploy and manage Azure compute resources', [20, 25]], ['Implement and manage virtual networking', [15, 20]], ['Monitor and maintain Azure resources', [10, 15]]],
    sourceUrl: 'https://learn.microsoft.com/en-us/credentials/certifications/resources/study-guides/az-104', guideUrl: null, credentialUrl: 'https://learn.microsoft.com/en-us/credentials/certifications/azure-administrator/', lastVerified: VERIFIED_ON, verified: true },
  'AZ-305': { name: 'Designing Microsoft Azure Infrastructure Solutions', vendor: 'Microsoft', cloud: 'azure', level: 'professional', questions: null, questionRange: null, durationMin: null, passScore: 700, scale: null, priceUSD: null, status: 'active', statusNote: null,
    domains: [['Design identity, governance, and monitoring solutions', [25, 30]], ['Design data storage solutions', [20, 25]], ['Design business continuity solutions', [15, 20]], ['Design infrastructure solutions', [30, 35]]],
    sourceUrl: 'https://learn.microsoft.com/en-us/credentials/certifications/resources/study-guides/az-305', guideUrl: null, credentialUrl: 'https://learn.microsoft.com/en-us/credentials/certifications/azure-solutions-architect/', lastVerified: VERIFIED_ON, verified: true },
  'AZ-400': { name: 'Designing and Implementing Microsoft DevOps Solutions', vendor: 'Microsoft', cloud: 'azure', level: 'professional', questions: null, questionRange: null, durationMin: null, passScore: 700, scale: null, priceUSD: null, status: 'active', statusNote: null,
    domains: [['Design and implement processes and communications', [10, 15]], ['Design and implement a source control strategy', [10, 15]], ['Design and implement build and release pipelines', [50, 55]], ['Develop a security and compliance plan', [10, 15]], ['Implement an instrumentation strategy', [5, 10]]],
    sourceUrl: 'https://learn.microsoft.com/en-us/credentials/certifications/resources/study-guides/az-400', guideUrl: null, credentialUrl: 'https://learn.microsoft.com/en-us/credentials/certifications/devops-engineer/', lastVerified: VERIFIED_ON, verified: true },
  'AZ-500': { name: 'Microsoft Azure Security Technologies', vendor: 'Microsoft', cloud: 'azure', level: 'associate', questions: null, questionRange: null, durationMin: null, passScore: 700, scale: null, priceUSD: null, status: 'retired', statusNote: 'Microsoft retired this exam on August 31, 2026. Check Microsoft Learn for the current Azure security credential.', domains: null,
    sourceUrl: 'https://learn.microsoft.com/en-us/credentials/certifications/resources/study-guides/az-500', guideUrl: null, lastVerified: VERIFIED_ON, verified: true },
  'AZ-700': { name: 'Designing and Implementing Microsoft Azure Networking Solutions', vendor: 'Microsoft', cloud: 'azure', level: 'associate', questions: null, questionRange: null, durationMin: null, passScore: 700, scale: null, priceUSD: null, status: 'active', statusNote: null,
    domains: [['Design and implement core networking infrastructure', [25, 30]], ['Design, implement, and manage connectivity services', [20, 25]], ['Design and implement application delivery services', [15, 20]], ['Design and implement private access to Azure services', [10, 15]], ['Design and implement Azure network security services', [15, 20]]],
    sourceUrl: 'https://learn.microsoft.com/en-us/credentials/certifications/resources/study-guides/az-700', guideUrl: null, credentialUrl: 'https://learn.microsoft.com/en-us/credentials/certifications/azure-network-engineer-associate/', lastVerified: VERIFIED_ON, verified: true },
  'DP-700': { name: 'Implementing Data Engineering Solutions Using Microsoft Fabric', vendor: 'Microsoft', cloud: 'azure', level: 'associate', questions: null, questionRange: null, durationMin: null, passScore: 700, scale: null, priceUSD: null, status: 'active', statusNote: null,
    domains: [['Implement and manage an analytics solution', [30, 35]], ['Ingest and transform data', [30, 35]], ['Monitor and optimize an analytics solution', [30, 35]]],
    sourceUrl: 'https://learn.microsoft.com/en-us/credentials/certifications/resources/study-guides/dp-700', guideUrl: null, credentialUrl: 'https://learn.microsoft.com/en-us/credentials/certifications/fabric-data-engineer-associate/', lastVerified: VERIFIED_ON, verified: true },
  'CDL': { name: 'Google Cloud Digital Leader', vendor: 'Google Cloud', cloud: 'gcp', level: 'foundational', codeIsOfficial: false, questions: null, questionRange: [50, 60], durationMin: 90, passScore: null, scale: null, priceUSD: 99, status: 'active', statusNote: 'Google says a new version of the exam went live on August 12; check the exam guide for current topics.', domains: null,
    sourceUrl: 'https://cloud.google.com/learn/certification/cloud-digital-leader', guideUrl: null, lastVerified: VERIFIED_ON, verified: true },
  'ACE': { name: 'Google Cloud Associate Cloud Engineer', vendor: 'Google Cloud', cloud: 'gcp', level: 'associate', codeIsOfficial: false, questions: null, questionRange: [50, 60], durationMin: 120, passScore: null, scale: null, priceUSD: 125, status: 'active', statusNote: null, domains: null,
    sourceUrl: 'https://cloud.google.com/learn/certification/cloud-engineer', guideUrl: null, lastVerified: VERIFIED_ON, verified: true },
  'PCA': { name: 'Google Cloud Professional Cloud Architect', vendor: 'Google Cloud', cloud: 'gcp', level: 'professional', codeIsOfficial: false, questions: null, questionRange: [50, 60], durationMin: 120, passScore: null, scale: null, priceUSD: 200, status: 'active', statusNote: 'Each exam includes 2 case studies that make up 20–30% of the exam.', domains: null,
    sourceUrl: 'https://cloud.google.com/learn/certification/cloud-architect', guideUrl: null, lastVerified: VERIFIED_ON, verified: true },
  'PCNE': { name: 'Google Cloud Professional Cloud Network Engineer', vendor: 'Google Cloud', cloud: 'gcp', level: 'professional', codeIsOfficial: false, questions: null, questionRange: [50, 60], durationMin: 120, passScore: null, scale: null, priceUSD: 200, status: 'active', statusNote: null, domains: null,
    sourceUrl: 'https://cloud.google.com/learn/certification/cloud-network-engineer', guideUrl: null, lastVerified: VERIFIED_ON, verified: true },
  'PCSE': { name: 'Google Cloud Professional Cloud Security Engineer', vendor: 'Google Cloud', cloud: 'gcp', level: 'professional', codeIsOfficial: false, questions: null, questionRange: [50, 60], durationMin: 120, passScore: null, scale: null, priceUSD: 200, status: 'active', statusNote: null, domains: null,
    sourceUrl: 'https://cloud.google.com/learn/certification/cloud-security-engineer', guideUrl: null, lastVerified: VERIFIED_ON, verified: true },
  'PCDOE': { name: 'Google Cloud Professional Cloud DevOps Engineer', vendor: 'Google Cloud', cloud: 'gcp', level: 'professional', codeIsOfficial: false, questions: null, questionRange: [50, 60], durationMin: 120, passScore: null, scale: null, priceUSD: 200, status: 'active', statusNote: null, domains: null,
    sourceUrl: 'https://cloud.google.com/learn/certification/cloud-devops-engineer', guideUrl: null, lastVerified: VERIFIED_ON, verified: true },
  'PDE': { name: 'Google Cloud Professional Data Engineer', vendor: 'Google Cloud', cloud: 'gcp', level: 'professional', codeIsOfficial: false, questions: null, questionRange: [40, 50], durationMin: 120, passScore: null, scale: null, priceUSD: 200, status: 'active', statusNote: null, domains: null,
    sourceUrl: 'https://cloud.google.com/learn/certification/data-engineer', guideUrl: null, lastVerified: VERIFIED_ON, verified: true },
  'SY0-701': { name: 'CompTIA Security+ (V7)', vendor: 'CompTIA', cloud: 'neutral', level: 'associate', questions: 90, questionRange: null, questionsAreMax: true, durationMin: 90, passScore: 750, scale: '100–900', priceUSD: null, status: 'retiring', statusNote: 'English SY0-701 retires June 11, 2027. CompTIA expects Security+ V8 on or around November 17, 2026.',
    domains: [['General security concepts', 12], ['Threats, vulnerabilities, and mitigations', 22], ['Security architecture', 18], ['Security operations', 28], ['Security program management and oversight', 20]],
    sourceUrl: 'https://www.comptia.org/en-us/certifications/security/v7/', guideUrl: null, lastVerified: VERIFIED_ON, verified: true },
  'TF-004': { name: 'HashiCorp Certified: Terraform Associate (004)', vendor: 'HashiCorp', cloud: 'neutral', level: 'associate', codeIsOfficial: false, questions: null, questionRange: null, durationMin: 60, passScore: null, scale: null, priceUSD: 70.5, status: 'active', statusNote: 'Tests Terraform 1.12. Price excludes local taxes and fees.', domains: null,
    sourceUrl: 'https://developer.hashicorp.com/certifications/infrastructure-automation', guideUrl: null, lastVerified: VERIFIED_ON, verified: true }
};
const examProfile = code => EXAM_PROFILES[code] ? { code, ...EXAM_PROFILES[code] } : null;
const CLOUD_NAME = { aws: 'AWS', azure: 'Microsoft Azure', gcp: 'Google Cloud', neutral: 'Vendor-neutral' };
const LEVEL_LABEL = { foundational: 'Foundational', associate: 'Associate', professional: 'Professional', specialty: 'Specialty', business: 'Business' };
const bankCount = code => examQs(code).length;
const OFFICIAL = 'Check the official exam page';
function profileFact(v, fmt = x => x) { return v == null ? `<span class="muted">${OFFICIAL}</span>` : esc(fmt(v)); }
function profileChips(p) {
  const n = bankCount(p.code); const out = [`<span class="chip">${esc(LEVEL_LABEL[p.level] || p.level)}</span>`];
  out.push(n ? `<span class="chip ok-chip">${n} practice questions here</span>` : '<span class="chip">No practice questions here yet</span>');
  if (p.status === 'retiring') out.push('<span class="chip warn-chip">Retiring</span>'); if (p.status === 'retired') out.push('<span class="chip warn-chip">Retired</span>'); if (p.status === 'beta') out.push('<span class="chip warn-chip">Beta</span>');
  if (!p.verified) out.push(`<span class="chip warn-chip">${OFFICIAL}</span>`);
  return out.join('');
}
/* Domain weights for planning: midpoints of official ranges, normalised. null when not recorded. */
function officialWeights(code) {
  const p = EXAM_PROFILES[code]; if (!p || !p.verified || !Array.isArray(p.domains)) return null;
  const w = p.domains.map(([, v]) => Array.isArray(v) ? (v[0] + v[1]) / 2 : v); if (!w.length || w.some(x => typeof x !== 'number' || !isFinite(x) || x <= 0)) return null; /* V09.1: names without official weights mean weights are not stated */ const s = w.reduce((a, b) => a + b, 0); return w.map(x => x / s);
}

/* ---------- Who the learner is */
const BACKGROUNDS = [
  { id: 'pm', from: 'project or program management', label: 'Project / program management', noun: 'project management', technical: false, experience: 'years of coordinating multi-site{industry} rollouts (vendors, permits, budgets, and clients)', mapsTo: 'requirements from stakeholders, vendor and contractor coordination, permits and compliance, budgets and change control, risk and schedule management', partners: 'vendors, contractors, and field crews', seedIntro: 'Coordinating rollouts, vendors, compliance, budgets, and clients is real architecture-adjacent experience.' },
  { id: 'it-support', from: 'IT support', label: 'IT support / helpdesk', noun: 'IT support', technical: true, experience: 'resolving user, device, and access problems under time pressure', mapsTo: 'structured troubleshooting, identity and access requests, endpoint and network basics, documentation, and ticket discipline', partners: 'users, vendors, and escalation teams', seedIntro: 'Troubleshooting under pressure and supporting real users is the daily reality of operating cloud systems.' },
  { id: 'sysadmin', from: 'systems administration', label: 'Systems / network administration', noun: 'systems administration', technical: true, experience: 'running servers, networks, and backups that other people depend on', mapsTo: 'capacity, patching, backup and recovery, network design, monitoring, and change control', partners: 'application teams, vendors, and on-call engineers', seedIntro: 'Running production systems on-premises maps directly to operating them in the cloud.' },
  { id: 'developer', from: 'software development', label: 'Software development', noun: 'software development', technical: true, experience: 'building and shipping software', mapsTo: 'application design, APIs, testing, CI/CD, performance, and debugging in production', partners: 'product owners, other engineering teams, and third-party providers', seedIntro: 'Building and shipping software gives you the application side of architecture decisions.' },
  { id: 'data', from: 'data and analytics', label: 'Data / analytics', noun: 'data and analytics', technical: true, experience: 'turning raw data into reports and decisions', mapsTo: 'data modelling, pipelines, data quality, governance, and translating business questions into analysis', partners: 'business stakeholders, data owners, and engineering teams', seedIntro: 'Data work gives you the requirements, governance, and pipeline instincts cloud data platforms need.' },
  { id: 'security', from: 'security', label: 'Security', noun: 'security', technical: true, experience: 'protecting systems and responding to security issues', mapsTo: 'risk assessment, identity and access, incident response, compliance evidence, and security reviews', partners: 'engineering teams, auditors, and vendors', seedIntro: 'Security judgment is part of every architecture decision, and your experience shows it.' },
  { id: 'changer', from: 'a non-technical career', label: 'Non-technical career changer', noun: 'previous career', technical: false, experience: 'your previous work', mapsTo: 'stakeholder communication, process improvement, budgets, customer focus, and learning new systems fast', partners: 'colleagues, customers, and suppliers', seedIntro: 'Your previous career already shows the people and process skills cloud teams rely on.' },
  { id: 'student', from: 'your studies', label: 'Student', noun: 'student', technical: false, experience: 'coursework, projects, and part-time work', mapsTo: 'learning fast, team projects, deadlines, and hands-on labs', partners: 'teammates, instructors, and clients on projects', seedIntro: 'Projects, labs, and part-time work are valid evidence when you are starting out.' },
  { id: 'other', from: 'another field', label: 'Other', noun: 'previous', technical: false, experience: 'your previous work', mapsTo: 'stakeholder communication, planning, risk management, and learning new systems', partners: 'colleagues, customers, and suppliers', seedIntro: 'Whatever you did before, the stories below help you show what transfers.' }
];
const TARGET_ROLES = [['practitioner', 'Cloud practitioner', 'cloud practitioner'], ['engineer', 'Cloud engineer', 'cloud engineer'], ['architect', 'Solutions architect', 'solutions architect'], ['devops', 'DevOps / platform engineer', 'DevOps or platform engineer'], ['security', 'Cloud security engineer', 'cloud security engineer'], ['data', 'Data engineer', 'data engineer'], ['network', 'Network engineer', 'cloud network engineer']];
const YEARS = [['0-1', 'Less than 2 years'], ['2-4', '2 to 4 years'], ['5-9', '5 to 9 years'], ['10+', '10 years or more']];
const CLOUD_PICKS = [['aws', 'AWS'], ['azure', 'Microsoft Azure'], ['gcp', 'Google Cloud'], ['unsure', 'Not sure yet']];
function cwProfile() {
  const p = S.ws.career.profile;
  p.background ??= ''; p.backgroundOther ??= ''; p.years ??= ''; p.targetRole ??= ''; p.clouds ??= []; p.industry ??= ''; p.priorExperience ??= ''; p.targetExam ??= ''; p.examDate ??= '';
  if (typeof p.weeklyHours !== 'number' || !(p.weeklyHours > 0)) p.weeklyHours = 10;
  return p;
}
const bgInfo = () => BACKGROUNDS.find(b => b.id === cwProfile().background) || null;
const roleInfo = id => TARGET_ROLES.find(r => r[0] === id);
function tplVars() {
  const p = cwProfile(); const b = bgInfo(); const other = p.background === 'other' && p.backgroundOther.trim();
  return { background: other ? other.toLowerCase() : b ? b.noun : 'previous', industry: p.industry.trim(), priorExperience: p.priorExperience.trim() || (b ? b.experience : 'your previous work'), targetRole: roleInfo(p.targetRole)?.[2] || 'cloud architect', mapsTo: b ? b.mapsTo : BACKGROUNDS.find(x => x.id === 'other').mapsTo, partners: b ? b.partners : 'colleagues, customers, and suppliers' };
}
/* {background}, {industry}, {priorExperience}, {targetRole}, {mapsTo}, {partners}. An empty {industry} disappears with its leading space. */
function fillTpl(s) {
  if (s == null) return s; const v = tplVars();
  let out = String(s).replace(/\{(background|priorExperience|targetRole|mapsTo|partners)\}/g, (m, k) => v[k]);
  return out.replace(/\s?\{industry\}/g, v.industry ? ' ' + v.industry : '');
}
const bgLabel = () => { const p = cwProfile(); const b = bgInfo(); return b ? (b.id === 'other' && p.backgroundOther.trim() ? p.backgroundOther.trim() : b.label) : ''; };
const bgFrom = () => { const p = cwProfile(); const b = bgInfo(); return b ? (b.id === 'other' && p.backgroundOther.trim() ? p.backgroundOther.trim().toLowerCase() : b.from) : ''; };
const onboarded = () => !!(cwProfile().onboardedAt || cwProfile().onboardingSkippedAt);

/* ---------- STAR story seeds per background (practice material, not exam content).
 * The project/program management set is the original PM_SEEDS (same permanent ids
 * pm-01 … pm-10), made industry-neutral; {industry} is filled from the profile. */
const BACKGROUND_SEEDS = {
  pm: PM_SEEDS,
  'it-support': [
    { id: 'it-01', title: 'Calming a site-wide outage from the helpdesk', comps: ['delivery', 'communication'], translate: 'Incident response in the cloud: triage, status updates, escalation, and a written follow-up.', prompts: ['What broke, how many people were affected, and what was at stake?', 'What was your part: first contact, triage, or coordination?', 'How you triaged, who you escalated to, and how you kept users informed.', 'Time to restore, tickets avoided, what changed afterward.'] },
    { id: 'it-02', title: 'Finding the root cause of a recurring ticket', comps: ['technical', 'failure'], translate: 'Root-cause analysis and problem management, the same discipline as a cloud postmortem.', prompts: ['Which issue kept coming back and how often?', 'Why you took ownership of it.', 'The evidence you gathered and how you proved the cause.', 'Tickets reduced, hours saved per month.'] },
    { id: 'it-03', title: 'Tightening account access during a staff change', comps: ['security', 'delivery'], translate: 'Identity and access management: least privilege, joiner-mover-leaver processes, and audit trails.', prompts: ['What access problem or risk did you notice?', 'What you were responsible for.', 'The process or controls you put in place.', 'Accounts cleaned up, audit findings closed.'] },
    { id: 'it-04', title: 'Writing the knowledge base that cut repeat calls', comps: ['mentoring', 'customer'], translate: 'Runbooks and documentation, which cloud teams depend on to operate at scale.', prompts: ['What questions kept repeating?', 'Why it fell to you.', 'How you wrote, tested, and promoted the articles.', 'Call volume or handle time before and after.'] },
    { id: 'it-05', title: 'Rolling out new laptops or software to a whole team', comps: ['delivery', 'influence'], translate: 'Change management and phased rollouts, the same pattern as a cloud migration wave.', prompts: ['How many users, what deadline, what could go wrong?', 'Your role in planning and doing it.', 'How you staged it, tested it, and handled stragglers.', 'Completion rate, issues, time taken.'] },
    { id: 'it-06', title: 'Explaining a technical problem to a frustrated manager', comps: ['communication', 'customer'], translate: 'Translating technical risk into business terms, a core architect skill.', prompts: ['What was the problem and why was the manager upset?', 'What you needed them to decide or accept.', 'How you explained it without jargon.', 'The decision made and the relationship afterward.'] },
    { id: 'it-07', title: 'Automating a tedious manual task', comps: ['technical', 'cost'], translate: 'Automation and scripting, the starting point for infrastructure as code.', prompts: ['What was manual and how long did it take?', 'Why you decided to automate it.', 'What you built and how you made it safe to run.', 'Hours saved, errors avoided.'] }
  ],
  sysadmin: [
    { id: 'sa-01', title: 'Recovering a failed server or storage system', comps: ['delivery', 'failure'], translate: 'Backup, restore, and disaster recovery: the same RPO and RTO thinking cloud designs need.', prompts: ['What failed and what did it affect?', 'Your responsibility during recovery.', 'How you restored service and what you changed afterward.', 'Downtime, data lost or saved, follow-up actions.'] },
    { id: 'sa-02', title: 'Planning capacity before a busy period', comps: ['cost', 'technical'], translate: 'Capacity planning and right-sizing, which become autoscaling and cost decisions in the cloud.', prompts: ['What growth or peak were you preparing for?', 'What you owned.', 'How you measured, forecast, and decided.', 'Outcome under load, money spent or saved.'] },
    { id: 'sa-03', title: 'Redesigning a network segment or VLAN layout', comps: ['technical', 'security'], translate: 'Network segmentation maps directly to VPC/VNet design, subnets, and firewall rules.', prompts: ['What was wrong with the old layout?', 'Your role in the redesign.', 'How you planned, tested, and cut over.', 'Security or performance improvement, incidents during cutover.'] },
    { id: 'sa-04', title: 'Patching on schedule without breaking production', comps: ['delivery', 'ambiguity'], translate: 'Change control and maintenance windows, which become deployment pipelines and managed patching.', prompts: ['How many systems and what constraints?', 'What you were accountable for.', 'How you tested, staged, and rolled back if needed.', 'Patch compliance, outages avoided.'] },
    { id: 'sa-05', title: 'Building monitoring that caught problems early', comps: ['technical', 'customer'], translate: 'Observability: metrics, alerts, and dashboards that cloud operations rely on.', prompts: ['What kept surprising the team?', 'Why you took it on.', 'What you measured and how you set alert thresholds.', 'Incidents caught early, noise reduced.'] },
    { id: 'sa-06', title: 'Moving a workload to new hardware or a hosted platform', comps: ['delivery', 'influence'], translate: 'A small migration: discovery, dependencies, cutover, and rollback, exactly like a cloud migration.', prompts: ['What moved, and why?', 'Your role.', 'How you mapped dependencies and planned the cutover.', 'Downtime, issues, benefits after the move.'] },
    { id: 'sa-07', title: 'Pushing back on a risky change request', comps: ['conflict', 'security'], translate: 'Architecture review: protecting reliability and security with evidence, then recording the decision.', prompts: ['What was requested and what was the risk?', 'What you had to protect.', 'How you made the case and what compromise you reached.', 'Outcome and how it was recorded.'] },
    { id: 'sa-08', title: 'Scripting a repeatable server build', comps: ['technical', 'mentoring'], translate: 'Configuration management is the direct ancestor of infrastructure as code.', prompts: ['How were servers built before?', 'Why you changed it.', 'What you scripted and how others used it.', 'Build time and configuration drift before and after.'] }
  ],
  developer: [
    { id: 'dev-01', title: 'Fixing a production performance problem', comps: ['technical', 'delivery'], translate: 'Performance and scaling decisions: caching, databases, and load, the bread and butter of architecture.', prompts: ['What was slow and who noticed?', 'What you were responsible for.', 'How you measured, found the bottleneck, and fixed it.', 'Latency or cost before and after.'] },
    { id: 'dev-02', title: 'Choosing between two technical approaches', comps: ['influence', 'communication'], translate: 'Exactly what an Architecture Decision Record captures: options, trade-offs, and the reasons for the choice.', prompts: ['What decision, and what were the options?', 'Your role in making it.', 'How you compared options and brought others along.', 'The choice made and how it worked out.'] },
    { id: 'dev-03', title: 'Setting up or improving a CI/CD pipeline', comps: ['technical', 'delivery'], translate: 'Delivery pipelines are core platform and DevOps architecture.', prompts: ['How were releases done before?', 'Why you took it on.', 'What you built and how you made it safe.', 'Release frequency, failed deployments, time saved.'] },
    { id: 'dev-04', title: 'Handling a production incident you caused', comps: ['failure', 'communication'], translate: 'Blameless postmortems and building guardrails so the same failure cannot repeat.', prompts: ['What went wrong and what was the impact?', 'What you owned.', 'How you fixed it and what you changed to prevent it.', 'Time to recover and the lasting fix.'] },
    { id: 'dev-05', title: 'Designing an API another team depended on', comps: ['customer', 'technical'], translate: 'Interface design and contracts between systems, a central architecture concern.', prompts: ['Who needed the API and for what?', 'What you were responsible for.', 'How you designed, versioned, and documented it.', 'Adoption, integration issues avoided.'] },
    { id: 'dev-06', title: 'Cutting a cloud or infrastructure bill', comps: ['cost', 'technical'], translate: 'FinOps: tying spend to value and designing for cost.', prompts: ['What was expensive and why?', 'Your role.', 'What you changed in code or infrastructure.', 'Monthly savings in numbers.'] },
    { id: 'dev-07', title: 'Mentoring a junior developer', comps: ['mentoring', 'communication'], translate: 'Raising the bar for a team is a big part of senior and architect roles.', prompts: ['Who, and what did they struggle with?', 'Why you took it on.', 'How you taught and gave feedback.', 'What they could do afterward.'] },
    { id: 'dev-08', title: 'Securing an application after a review finding', comps: ['security', 'delivery'], translate: 'Secure design: secrets, identity, and least privilege in application architecture.', prompts: ['What was found and how serious was it?', 'Your responsibility.', 'How you fixed it and prevented it elsewhere.', 'Findings closed, risk reduced.'] }
  ],
  data: [
    { id: 'da-01', title: 'Building a report people actually trusted', comps: ['customer', 'technical'], translate: 'Requirements to design: clarifying the question, the data, and the definition of done.', prompts: ['Who needed it and what decision did it support?', 'What you were responsible for.', 'How you clarified definitions and validated the numbers.', 'Adoption, decisions made, time saved.'] },
    { id: 'da-02', title: 'Fixing bad data at the source', comps: ['influence', 'technical'], translate: 'Data quality and ownership are governance problems that cloud data platforms must design for.', prompts: ['What was wrong with the data and what did it break?', 'Your role.', 'How you traced it and convinced the owners to fix it.', 'Error rate before and after.'] },
    { id: 'da-03', title: 'Automating a manual data pipeline', comps: ['technical', 'delivery'], translate: 'Pipelines and orchestration are the core of cloud data engineering.', prompts: ['What was manual and how often did it run?', 'Why you took it on.', 'What you built and how you monitored it.', 'Hours saved, failures reduced.'] },
    { id: 'da-04', title: 'Protecting sensitive data in an analysis', comps: ['security', 'ambiguity'], translate: 'Data classification, access control, and masking, which cloud governance tools enforce.', prompts: ['What sensitive data was involved?', 'What you had to guarantee.', 'How you controlled access or masked it.', 'Compliance outcome, incidents avoided.'] },
    { id: 'da-05', title: 'Presenting findings to leadership', comps: ['communication', 'customer'], translate: 'The executive-summary skill: a clear recommendation with costs and risks.', prompts: ['What did leadership need to decide?', 'What you prepared.', 'How you framed the story and the uncertainty.', 'The decision made and its result.'] },
    { id: 'da-06', title: 'Speeding up a slow query or dashboard', comps: ['technical', 'cost'], translate: 'Performance and cost trade-offs: indexing, partitioning, and caching.', prompts: ['What was slow and who was affected?', 'Your responsibility.', 'How you diagnosed and fixed it.', 'Run time and cost before and after.'] },
    { id: 'da-07', title: 'Handling a request with unclear requirements', comps: ['ambiguity', 'customer'], translate: 'Scoping under ambiguity, which every architecture engagement starts with.', prompts: ['What was asked, and what was unclear?', 'What you had to deliver.', 'How you narrowed scope and confirmed it.', 'Rework avoided, time to answer.'] }
  ],
  security: [
    { id: 'sec-01', title: 'Leading the response to a security incident', comps: ['delivery', 'communication'], translate: 'Incident response in the cloud: containment, evidence, communication, and lessons learned.', prompts: ['What happened and what was at risk?', 'Your role in the response.', 'How you contained it and kept people informed.', 'Time to contain, impact limited, changes made.'] },
    { id: 'sec-02', title: 'Getting a team to fix a finding they resisted', comps: ['influence', 'conflict'], translate: 'Security architecture is mostly influence: making the secure path the easy path.', prompts: ['What was the finding and why did they resist?', 'What you needed to protect.', 'How you made the case or made the fix easier.', 'Outcome and relationship afterward.'] },
    { id: 'sec-03', title: 'Preparing evidence for an audit', comps: ['security', 'ambiguity'], translate: 'Compliance by design: controls, logging, and evidence that cloud governance automates.', prompts: ['Which audit or standard, and what was in scope?', 'What you were accountable for.', 'How you gathered and organized evidence.', 'Findings, time taken, process improvements.'] },
    { id: 'sec-04', title: 'Reducing excessive access permissions', comps: ['security', 'technical'], translate: 'Least privilege and identity design, central to every cloud security exam.', prompts: ['What access was too broad?', 'Your role.', 'How you reviewed, reduced, and avoided breaking work.', 'Permissions removed, risk reduced.'] },
    { id: 'sec-05', title: 'Explaining a risk to a non-technical executive', comps: ['communication', 'customer'], translate: 'Translating risk into business terms and options, which architects do in every design review.', prompts: ['What risk, and what decision did they face?', 'What you prepared.', 'How you framed likelihood, impact, and options.', 'The decision and its result.'] },
    { id: 'sec-06', title: 'Automating a security check', comps: ['technical', 'mentoring'], translate: 'Policy as code and automated guardrails in cloud platforms.', prompts: ['What was checked manually before?', 'Why you automated it.', 'What you built and how teams used it.', 'Issues caught, time saved.'] },
    { id: 'sec-07', title: 'Balancing security with a delivery deadline', comps: ['delivery', 'ambiguity'], translate: 'Trade-off reasoning: what to require now, what to accept as risk, and what to revisit.', prompts: ['What was the deadline and the security concern?', 'What you had to decide.', 'How you agreed on minimum controls and follow-ups.', 'Launch outcome and follow-up completed.'] }
  ],
  changer: [
    { id: 'cc-01', title: 'Learning something unfamiliar quickly at work', comps: ['career-change', 'ambiguity'], translate: 'Evidence that you learn fast, which is the core question for any career changer.', prompts: ['What did you have to learn and why?', 'What depended on it.', 'How you learned it and checked your understanding.', 'What you achieved with it.'] },
    { id: 'cc-02', title: 'Improving a process that wasted time', comps: ['delivery', 'cost'], translate: 'Process improvement is the same instinct as automation and cost optimization in the cloud.', prompts: ['What was inefficient?', 'Why you took it on.', 'What you changed and how you got others to adopt it.', 'Time or money saved.'] },
    { id: 'cc-03', title: 'Handling an unhappy customer or stakeholder', comps: ['customer', 'communication'], translate: 'Stakeholder management: understanding needs and setting expectations, which architects do constantly.', prompts: ['Who was unhappy and why?', 'What you were responsible for.', 'How you listened, explained, and resolved it.', 'Outcome and relationship afterward.'] },
    { id: 'cc-04', title: 'Delivering on a tight deadline', comps: ['delivery', 'ambiguity'], translate: 'Prioritization under pressure, the same as planning a cloud release or migration.', prompts: ['What was due and why was it tight?', 'Your part.', 'What you prioritized, cut, or delegated.', 'Delivered on time? What changed?'] },
    { id: 'cc-05', title: 'Persuading people without formal authority', comps: ['influence', 'communication'], translate: 'Influence without authority is how architects get designs adopted.', prompts: ['What did you want people to do?', 'Why they did not have to listen to you.', 'How you made the case.', 'What changed as a result.'] },
    { id: 'cc-06', title: 'Owning a mistake and fixing it', comps: ['failure', 'delivery'], translate: 'The postmortem mindset: own it, fix it, prevent it.', prompts: ['What went wrong?', 'Your part in it.', 'How you fixed it and what you changed.', 'The lasting improvement.'] },
    { id: 'cc-07', title: 'Managing a budget or tracking costs', comps: ['cost', 'customer'], translate: 'Cost awareness is a large part of cloud work (FinOps).', prompts: ['What budget and what pressure?', 'Your responsibility.', 'How you tracked and controlled spending.', 'Savings or overruns avoided.'] }
  ],
  student: [
    { id: 'st-01', title: 'A team project with a hard deadline', comps: ['delivery', 'influence'], translate: 'Coordinating people and work toward a date, like any cloud project.', prompts: ['What was the project and the deadline?', 'Your role on the team.', 'How you organized the work and handled problems.', 'Grade, demo, or result.'] },
    { id: 'st-02', title: 'Building a cloud lab or personal project', comps: ['technical', 'career-change'], translate: 'Hands-on proof of cloud skill; pair it with an ADR and a portfolio entry.', prompts: ['What did you build and why?', 'What you were trying to learn.', 'Key design decisions and what you would change.', 'What works now, and what it cost to run.'] },
    { id: 'st-03', title: 'Learning a hard topic on your own', comps: ['career-change', 'ambiguity'], translate: 'Self-directed learning, the skill employers test most in junior candidates.', prompts: ['What was hard and why did it matter?', 'What depended on it.', 'How you learned and checked your understanding.', 'What you could do afterward.'] },
    { id: 'st-04', title: 'Resolving a disagreement in a group', comps: ['conflict', 'communication'], translate: 'Handling technical disagreement with evidence, then recording the decision.', prompts: ['What was the disagreement?', 'What you needed to protect.', 'How you resolved it.', 'Outcome for the project and the team.'] },
    { id: 'st-05', title: 'Helping customers in a part-time job', comps: ['customer', 'communication'], translate: 'Customer focus and clear communication carry straight into support and consulting roles.', prompts: ['What kind of customers and problems?', 'What you were responsible for.', 'A specific case you handled well.', 'The result for the customer.'] },
    { id: 'st-06', title: 'Recovering from a project that went wrong', comps: ['failure', 'delivery'], translate: 'Owning failure and learning from it, the postmortem mindset.', prompts: ['What went wrong?', 'Your part in it.', 'What you did to recover.', 'What you do differently now.'] }
  ],
  other: [
    { id: 'ot-01', title: 'Learning something new fast to keep work moving', comps: ['career-change', 'ambiguity'], translate: 'Evidence that you learn fast, which is the core question for any career changer.', prompts: ['What did you not know and why did it matter?', 'What depended on you learning it?', 'How you learned it and verified your understanding.', 'Time saved or problem solved.'] },
    { id: 'ot-02', title: 'Coordinating several people or teams', comps: ['delivery', 'influence'], translate: 'Coordination across teams is how cloud projects actually get delivered.', prompts: ['Who was involved and what was the goal?', 'Your role.', 'How you kept everyone aligned.', 'The result.'] },
    { id: 'ot-03', title: 'Solving a problem nobody else would take on', comps: ['ambiguity', 'technical'], translate: 'Taking ownership of ambiguous problems is what architects are hired for.', prompts: ['What was the problem?', 'Why you took it on.', 'How you worked it out.', 'The result in numbers if you can.'] },
    { id: 'ot-04', title: 'Explaining something complex simply', comps: ['communication', 'customer'], translate: 'Explaining trade-offs to non-specialists is a daily architect task.', prompts: ['What needed explaining, and to whom?', 'Why it mattered.', 'How you explained it.', 'What they understood or decided.'] },
    { id: 'ot-05', title: 'Saving money or time for your organization', comps: ['cost', 'delivery'], translate: 'Cost and efficiency thinking maps directly to FinOps.', prompts: ['What was wasteful?', 'Your role.', 'What you changed.', 'Money or time saved.'] },
    { id: 'ot-06', title: 'Recovering when something went wrong', comps: ['failure', 'communication'], translate: 'Incident handling and postmortems.', prompts: ['What went wrong and what was the impact?', 'Your part.', 'How you recovered and communicated.', 'What changed afterward.'] }
  ]
};
const allSeeds = () => Object.values(BACKGROUND_SEEDS).flat();
const seedsFor = bg => BACKGROUND_SEEDS[bg] || BACKGROUND_SEEDS.other;
const fillSeed = s => ({ ...s, title: fillTpl(s.title), translate: fillTpl(s.translate), prompts: s.prompts.map(fillTpl) });
const storySourceLabel = () => { const l = bgLabel(); return l ? `${l} experience` : 'Previous career experience'; };

/* ---------- Navigation */
ICON.path = '<path d="M5 19c3 0 3-6 7-6s4-6 7-6"/><circle cx="5" cy="19" r="2"/><circle cx="19" cy="7" r="2"/>';
ICON.plan = '<rect x="4" y="5" width="16" height="15" rx="2"/><path d="M4 10h16M9 3v4M15 3v4M8 14h3M8 17h6"/>';
NAV.splice(NAV.findIndex(n => n[0] === 'certify') + 1, 0, ['path', 'Certification path', 'Certify'], ['plan', 'Study plan', 'Certify']);

/* ---------- Onboarding: five questions, skippable, editable later in Career → Profile */
const OB_STEPS = ['Background', 'Experience', 'Target role', 'Cloud', 'Time and exam'];
function obStart(step = 0) { const p = cwProfile(); S.ob = { step, d: { background: p.background, backgroundOther: p.backgroundOther, industry: p.industry, priorExperience: p.priorExperience, years: p.years, targetRole: p.targetRole, clouds: [...p.clouds], weeklyHours: p.weeklyHours, targetExam: p.targetExam, examDate: p.examDate } }; }
const radioCards = (name, list, cur) => `<div class="ob-grid">${list.map(([v, l, sub]) => `<label class="ob-card"><input type="radio" name="${name}" value="${esc(v)}" data-ob="${name}" ${cur === v ? 'checked' : ''}><span><strong>${esc(l)}</strong>${sub ? `<small>${esc(sub)}</small>` : ''}</span></label>`).join('')}</div>`;
function obStepHtml(i, d) {
  if (i === 0) {
    const b = BACKGROUNDS.find(x => x.id === d.background);
    return `<fieldset class="ob-fs"><legend>What best describes your background?</legend>${radioCards('background', BACKGROUNDS.map(b => [b.id, b.label]), d.background)}</fieldset>
      ${d.background === 'other' ? `<div class="field" style="margin-top:12px"><label for="ob-other">Describe it in a few words</label><input id="ob-other" type="text" data-ob="backgroundOther" value="${esc(d.backgroundOther)}" placeholder="for example, teaching or logistics"></div>` : ''}
      <div class="grid g-2" style="margin-top:12px"><div class="field"><label for="ob-ind">Industry <span class="muted">(optional)</span></label><input id="ob-ind" type="text" data-ob="industry" value="${esc(d.industry)}" placeholder="for example, retail, healthcare, banking"></div>
      <div class="field"><label for="ob-prior">What did you mostly do? <span class="muted">(optional)</span></label><input id="ob-prior" type="text" data-ob="priorExperience" value="${esc(d.priorExperience)}" placeholder="${esc(b ? b.experience.replace(/\{industry\}/g, '') : 'a few words about your work')}"></div></div>
      <p class="small muted" style="margin-top:8px">Used to tailor interview story seeds and model answers. It stays on this device.</p>`;
  }
  if (i === 1) return `<fieldset class="ob-fs"><legend>How many years of experience do you have in that background?</legend>${radioCards('years', YEARS, d.years)}</fieldset>`;
  if (i === 2) return `<fieldset class="ob-fs"><legend>Which role are you aiming for?</legend>${radioCards('targetRole', TARGET_ROLES.map(([v, l]) => [v, l]), d.targetRole)}</fieldset>`;
  if (i === 3) return `<fieldset class="ob-fs"><legend>Which cloud or clouds do you want to work with? <span class="muted small">(choose any)</span></legend><div class="ob-grid">${CLOUD_PICKS.map(([v, l]) => `<label class="ob-card"><input type="checkbox" value="${v}" data-ob="clouds" ${d.clouds.includes(v) ? 'checked' : ''}><span><strong>${esc(l)}</strong></span></label>`).join('')}</div></fieldset>`;
  return `<div class="grid g-2"><div class="field"><label for="ob-hours">Study hours per week</label><input id="ob-hours" type="number" min="1" max="60" inputmode="numeric" data-ob="weeklyHours" value="${esc(d.weeklyHours)}"></div>
    <div class="field"><label for="ob-exam">Target exam <span class="muted">(optional)</span></label><select id="ob-exam" data-ob="targetExam">${opts(activeExams().map(e => [e.code, `${e.code} · ${examLabel(e.code)}`]), d.targetExam, 'Decide after I see my path')}</select></div>
    <div class="field"><label for="ob-date">Exam date <span class="muted">(optional)</span></label><input id="ob-date" type="date" data-ob="examDate" min="${isoDate(Date.now() + DAY)}" value="${esc(d.examDate)}"></div></div>
    <p class="small muted" style="margin-top:8px">With an exam and a date, CloudWalker builds a week-by-week study plan and re-plans it if you fall behind.</p>`;
}
VIEWS.welcome = () => {
  if (!S.ob) obStart(); const { step, d } = S.ob; const last = step === OB_STEPS.length - 1;
  return `<div class="page-head"><div><h1>Set up CloudWalker for you</h1><p class="muted">Five quick questions so story seeds, your certification path, and your study plan fit you. Skip anything; you can change it later in Career → Profile.</p></div></div>
  <section class="card ob" aria-labelledby="ob-h"><div class="ob-steps" aria-hidden="true">${OB_STEPS.map((l, i) => `<span class="${i < step ? 'done' : i === step ? 'cur' : ''}">${i + 1}. ${esc(l)}</span>`).join('')}</div>
    <h2 id="ob-h" tabindex="-1" class="small muted" style="margin:6px 0 12px">Step ${step + 1} of ${OB_STEPS.length}</h2>
    ${obStepHtml(step, d)}
    <div class="row" style="margin-top:18px;justify-content:space-between"><div class="row">${step ? '<button class="btn" data-action="ob-back">Back</button>' : ''}<button class="btn primary" data-action="${last ? 'ob-finish' : 'ob-next'}">${last ? 'Finish and see my path' : 'Next'}</button></div><button class="btn ghost" data-action="ob-skip">Skip setup</button></div>
  </section>`;
};
function obFinish() {
  const p = cwProfile(); const d = S.ob.d;
  Object.assign(p, { background: d.background || '', backgroundOther: (d.backgroundOther || '').trim(), industry: (d.industry || '').trim(), priorExperience: (d.priorExperience || '').trim(), years: d.years || '', targetRole: d.targetRole || '', clouds: d.clouds || [], weeklyHours: Math.max(1, Math.min(80, +d.weeklyHours || 10)), targetExam: d.targetExam || '', examDate: d.examDate || '', onboardedAt: Date.now() });
  if (p.targetExam && examMetaFor(p.targetExam)) { p.focusExam = p.targetExam; try { applyFocusDefaults(p.targetExam); savePrefs(); } catch { /* preferences are optional */ } }
  let note = 'Setup saved.';
  if (p.targetExam && p.examDate) { const r = makePlan(p.targetExam, p.examDate, p.weeklyHours); note = r.error ? `Setup saved. ${r.error}` : 'Setup saved and your study plan is ready.'; }
  S.ob = null; markDirty(); go('path'); showStatus(note);
}

/* ---------- Certification path: only exams in EXAM_PROFILES, with reasons */
const F_EXAM = { aws: 'CLF-C02', azure: 'AZ-900', gcp: 'CDL' }, A_EXAM = { aws: 'SAA-C03', azure: 'AZ-104', gcp: 'ACE' };
function pathFor(c) {
  const p = cwProfile(); const b = bgInfo(); const role = p.targetRole || 'architect'; const junior = !p.years || p.years === '0-1'; const technical = !!(b && b.technical);
  const bgL = bgFrom() || 'another field'; const steps = [];
  const add = (code, why, optional) => { const pr = examProfile(code); if (pr) steps.push({ code, why, optional: !!optional }); };
  if (role === 'practitioner' || !technical || junior) add(F_EXAM[c], role === 'practitioner' ? 'For a cloud practitioner role the foundational exam is the goal itself: core services, pricing, security responsibilities, and how the cloud is used in business.' : !technical ? `You are coming from ${bgL}. A foundational exam builds the cloud vocabulary and service map that associate exams assume, so the next step goes faster.` : 'You told us you have under two years of experience. A foundational exam is a quick confidence-builder before the associate level.');
  const pro = { aws: 'SAP-C02', azure: 'AZ-305', gcp: 'PCA' }, dev = { aws: 'DOP-C02', azure: 'AZ-400', gcp: 'PCDOE' }, net = { aws: 'ANS-C01', azure: 'AZ-700', gcp: 'PCNE' }, dat = { aws: 'DEA-C01', azure: 'DP-700', gcp: 'PDE' };
  const assoc = why => add(A_EXAM[c], why || `The core hands-on associate exam for ${CLOUD_NAME[c]}. It builds the design and operations knowledge the next step assumes.`);
  ({
    practitioner: () => { if (c === 'aws' && (!technical || ['data'].includes(b?.id))) add('AIB-C01', `Optional. A business-focused AWS exam on AI strategy, value, and governance that fits a background in ${bgL}.`, true); },
    engineer: () => { assoc(`The hands-on associate exam for ${CLOUD_NAME[c]}: deploying, operating, and securing the services a cloud engineer works with every day.`); add('TF-004', 'Infrastructure as code is everyday cloud engineering work. This exam is vendor-neutral, so it carries across clouds.', true); },
    architect: () => { assoc(c === 'azure' ? 'AZ-104 builds the administration skills that AZ-305 design questions assume. Check Microsoft Learn for the current prerequisites of the Solutions Architect Expert certification.' : null); add(pro[c], 'The professional-level design exam that matches the solutions architect role you are targeting.'); },
    devops: () => { assoc(); add('TF-004', 'Infrastructure as code and pipelines are the core of platform work, and Terraform is used across all three clouds.'); add(dev[c], 'The professional DevOps exam for this cloud: pipelines, release strategy, and operating at scale.'); },
    security: () => { if (!(b?.id === 'security' && !junior)) add('SY0-701', 'Vendor-neutral security fundamentals first, so cloud-specific security builds on solid concepts.'); assoc(); if (c === 'azure') steps.push({ notice: EXAM_PROFILES['AZ-500'].statusNote, code: 'AZ-500' }); else add(c === 'aws' ? 'SCS-C03' : 'PCSE', 'The cloud security exam for this provider: identity, data protection, detection, and incident response.'); },
    data: () => { if (c === 'gcp') assoc(); add(dat[c], 'The data engineering exam for this cloud: ingestion, transformation, storage choices, and governance.'); },
    network: () => { assoc(); add(net[c], c === 'aws' ? 'The networking specialty exam matches the role, but AWS is retiring it. Plan to sit it before the retirement date or check AWS for what replaces it.' : 'The networking exam for this cloud: hybrid connectivity, routing, private access, and network security.'); }
  }[role] || (() => assoc()))();
  return steps;
}
function stepHtml(s, i) {
  if (s.notice) return `<li class="path-step"><div class="path-n" aria-hidden="true">${i + 1}</div><div><strong>Security exam for Microsoft Azure</strong><p class="small">${esc(s.notice)}</p><div class="row"><a class="btn sm" href="${esc(EXAM_PROFILES['AZ-500'].sourceUrl)}" target="_blank" rel="noopener">Microsoft Learn</a></div></div></li>`;
  const p = examProfile(s.code); const inBank = bankCount(s.code) > 0; const cur = cwProfile().targetExam === s.code;
  const facts = [p.questions != null ? `${p.questionsAreMax ? 'up to ' : ''}${p.questions} questions` : p.questionRange ? `${p.questionRange[0]}–${p.questionRange[1]} questions` : null, p.durationMin ? `${p.durationMin} min` : null, p.priceUSD != null ? `${p.priceUSD} USD` : null].filter(Boolean);
  return `<li class="path-step"><div class="path-n" aria-hidden="true">${i + 1}</div><div>
    <div class="row" style="gap:8px"><strong>${esc(p.name)}</strong><span class="small muted">${esc(s.code)}${p.codeIsOfficial === false ? ' (app label)' : ''}</span>${s.optional ? '<span class="chip">Optional</span>' : ''}</div>
    <div class="chips" style="margin:6px 0">${profileChips(p)}</div>
    <p class="small">${esc(s.why)}</p>
    ${p.statusNote ? `<p class="small" style="color:var(--color-warning)">${esc(p.statusNote)}</p>` : ''}
    <p class="small muted">${facts.length ? esc(facts.join(' · ')) + '. ' : ''}${facts.length < 3 ? OFFICIAL + ' for anything not shown. ' : ''}Source: <a href="${esc(p.sourceUrl)}" target="_blank" rel="noopener">official page</a>, checked ${esc(p.lastVerified)}.</p>
    <div class="row">${inBank ? (cur ? '<span class="chip ok-chip">Your target exam</span>' : `<button class="btn sm" data-action="p2-target" data-v="${esc(s.code)}">Make this my target exam</button>`) + `<a class="btn sm ghost" href="#/study">Practice</a>` : ''}</div>
  </div></li>`;
}
VIEWS.path = () => {
  const p = cwProfile();
  if (!p.targetRole) return `<div class="page-head"><div><h1>Certification path</h1></div></div>${emptyState('Tell us where you are headed', 'Answer five quick questions and CloudWalker recommends a certification path for your background, experience, and target role.', '<button class="btn primary" data-action="p2-setup">Start setup</button>')}`;
  const picked = p.clouds.filter(c => c !== 'unsure'); const clouds = picked.length ? picked : ['aws', 'azure', 'gcp'];
  const role = roleInfo(p.targetRole || 'architect'); const yrs = YEARS.find(y => y[0] === p.years)?.[1];
  return `<div class="page-head"><div><h1>Certification path</h1><p class="muted">For a <strong>${esc(role[2])}</strong> role${bgFrom() ? `, coming from <strong>${esc(bgFrom())}</strong>` : ''}${yrs ? ` (${esc(yrs.toLowerCase())})` : ''}. <a href="#/career/profile">Change</a></p></div></div>
  ${picked.length ? '' : '<p class="notice" style="margin-bottom:16px">You have not picked a cloud yet, so here is the path on each. Many people start with the cloud their current or target employer uses.</p>'}
  <div class="grid ${clouds.length > 1 ? 'g-2' : ''}">${clouds.map(c => { const steps = pathFor(c); return `<section class="card" aria-labelledby="h-path-${c}"><h2 id="h-path-${c}">${esc(CLOUD_NAME[c])}</h2><ol class="path-list">${steps.map(stepHtml).join('')}</ol></section>`; }).join('')}</div>
  <section class="card" style="margin-top:20px"><details><summary><strong>Exam facts and sources</strong> <span class="small muted">(${Object.keys(EXAM_PROFILES).length} exams, checked ${VERIFIED_ON})</span></summary>
    <p class="small muted" style="margin:8px 0">Every number comes from the official page linked in its row. Blank cells mean the official page did not state it. Google Cloud does not use exam codes, so its short labels are the app's own.</p>
    <div style="overflow-x:auto"><table><thead><tr><th scope="col">Exam</th><th scope="col">Level</th><th scope="col" class="num">Questions</th><th scope="col" class="num">Minutes</th><th scope="col" class="num">Pass mark</th><th scope="col" class="num">Price (USD)</th><th scope="col">Status</th><th scope="col">Source</th></tr></thead><tbody>
    ${Object.keys(EXAM_PROFILES).map(examProfile).map(x => `<tr><th scope="row">${esc(x.code)}<div class="small muted">${esc(x.name)}</div></th><td>${esc(LEVEL_LABEL[x.level])}</td><td class="num">${x.questions != null ? (x.questionsAreMax ? 'up to ' : '') + x.questions : x.questionRange ? x.questionRange.join('–') : '—'}</td><td class="num">${x.durationMin ?? '—'}</td><td class="num">${x.passScore != null ? esc(x.passScore + (x.scale ? ' of ' + x.scale : '')) : '—'}</td><td class="num">${x.priceUSD ?? '—'}</td><td>${esc(x.status)}</td><td><a href="${esc(x.sourceUrl)}" target="_blank" rel="noopener">Official page</a></td></tr>`).join('')}</tbody></table></div>
    <p class="small muted" style="margin-top:8px">Not affiliated with or endorsed by AWS, Microsoft, Google, CompTIA, or HashiCorp. Exam details change; confirm on the official page before you book.</p></details></section>`;
};

/* ---------- Study plan: built backwards from the exam date */
const MIN_PER_Q = 2; /* planning assumption: about 2 minutes per practice question including the explanation */
const startOfDay = t => { const d = new Date(t); d.setHours(0, 0, 0, 0); return d.getTime(); };
function planDomains(code) {
  const doms = domainsOf(code); const ow = officialWeights(code); const ok = !!ow && ow.length === doms.length;
  const rows = doms.map((name, i) => {
    let seen = 0, cor = 0; for (const q of examQs(code)) if (q.domain === name) { const l = lastAttempt(q.id); if (l) { seen++; if (l.correct) cor++; } }
    const acc = seen ? cor / seen : null; const factor = seen >= 5 ? clamp(1 + (0.75 - acc) * 1.2, 0.6, 1.5) : 1;
    return { name, weight: ok ? ow[i] : 1 / doms.length, acc, seen, factor };
  });
  const tot = rows.reduce((s, r) => s + r.weight * r.factor, 0) || 1; rows.forEach(r => r.share = r.weight * r.factor / tot);
  return { rows, weightSource: ok ? 'official' : 'equal' };
}
function allocate(n, rows) { const raw = rows.map(r => n * r.share); const out = raw.map(Math.floor); let left = n - out.reduce((a, b) => a + b, 0); raw.map((x, i) => [x - Math.floor(x), i]).sort((a, b) => b[0] - a[0]).forEach(([, i]) => { if (left > 0) { out[i]++; left--; } }); return Object.fromEntries(rows.map((r, i) => [r.name, out[i]])); }
function buildPlan(code, examDate, hours, extraQs = 0) {
  const start = startOfDay(Date.now()); const end = parseISO(examDate);
  if (!examMetaFor(code)) return { error: 'Pick an exam that has practice questions in the app.' };
  if (!end || end <= start) return { error: 'The exam date needs to be in the future.' };
  const nW = Math.max(1, Math.ceil((end - start) / (7 * DAY))); const D = planDomains(code);
  const simLen = examProfile(code)?.durationMin || 90; const weeks = [];
  for (let i = 0; i < nW; i++) {
    const ws = start + i * 7 * DAY, we = Math.min(start + (i + 1) * 7 * DAY, end); const minutes = Math.round(hours * 60 * (we - ws) / (7 * DAY)); const left = nW - i;
    const split = left === 1 ? [0.35, 0.5, 0.15] : left === 2 && nW >= 4 ? [0.55, 0.3, 0.15] : i >= nW / 2 ? [0.65, 0.2, 0.15] : [0.85, 0, 0.15];
    const simMin = minutes * split[1]; const sims = simMin >= simLen * 0.5 ? Math.max(1, Math.round(simMin / simLen)) : 0;
    weeks.push({ start: ws, end: we, minutes, practiceQs: Math.round(minutes * split[0] / MIN_PER_Q), sims, reviewMin: Math.round(minutes * split[2]) });
  }
  if (extraQs > 0) { const tgt = weeks.length > 1 ? weeks.slice(0, -1) : weeks; const per = Math.ceil(extraQs / tgt.length); tgt.forEach(w => w.practiceQs += per); }
  weeks.forEach(w => w.domainQs = allocate(w.practiceQs, D.rows));
  const over = weeks.map(w => (w.practiceQs * MIN_PER_Q + w.reviewMin + w.sims * simLen) - w.minutes).filter(x => x > 15);
  const warning = over.length ? `At ${hours} h a week the plan needs more time than you have in ${over.length} week${over.length === 1 ? '' : 's'}. About ${Math.ceil(hours + Math.max(...over) / 60)} h a week, or a later exam date, would fit.` : null;
  return { code, examDate, weeklyHours: hours, created: Date.now(), start, end, weeks, weightSource: D.weightSource, domains: D.rows.map(r => ({ name: r.name, weight: r.weight, acc: r.acc, seen: r.seen, factor: r.factor, share: r.share })), simLen, warning };
}
function makePlan(code, examDate, hours) { const prev = S.ws.plan; const pl = buildPlan(code, examDate, hours); if (pl.error) return pl; pl.replans = prev && prev.code === code ? prev.replans || [] : []; pl.lastCheck = Date.now(); S.ws.plan = pl; markDirty(); return pl; }
function answersIn(code, a, b) { let n = 0, ms = 0; for (const [id, arr] of Object.entries(S.progress.answers)) { const q = Q(id); if (!q || q.exam_code !== code) continue; for (const x of arr) if (x.t >= a && x.t < b) { n++; ms += Math.min(x.ms || 90000, 300000); } } return { n, min: Math.round(ms / 60000) }; }
const simsIn = (code, a, b) => S.progress.sessions.filter(s => s.mode === 'exam' && s.examCode === code && s.ended >= a && s.ended < b).length;
function planStatus(pl) {
  const now = Date.now(); let planned = 0; for (const w of pl.weeks) planned += now >= w.end ? w.practiceQs : now > w.start ? w.practiceQs * (now - w.start) / (w.end - w.start) : 0;
  const done = answersIn(pl.code, pl.start, now).n; return { planned: Math.round(planned), done, behind: planned >= 20 && done < planned * 0.8 };
}
/* Re-plan automatically, at most once a day, when practice falls below 80% of plan. */
function p2CheckPlan() {
  const pl = S.ws.plan; if (!pl || !pl.weeks || Date.now() >= pl.end) return;
  if (startOfDay(pl.lastCheck || 0) === startOfDay(Date.now())) return; pl.lastCheck = Date.now();
  const st = planStatus(pl); if (!st.behind) { markDirty(); return; }
  const np = buildPlan(pl.code, pl.examDate, pl.weeklyHours, st.planned - st.done); if (np.error) return;
  np.replans = [...(pl.replans || []), { t: Date.now(), reason: `You had done ${st.done} of ${st.planned} planned practice questions, so the ${st.planned - st.done} you missed are spread over the remaining weeks.` }].slice(-10);
  np.lastCheck = Date.now(); S.ws.plan = np; markDirty(); showStatus('Your study plan was re-planned because you were behind. See Study plan for details.');
}
function domainDrill(code, domain, n) {
  const qs = examQs(code).filter(q => q.domain === domain).map(q => q.id);
  const missed = shuffle(qs.filter(isMissed)), unseen = shuffle(qs.filter(id => !isSeen(id))), rest = shuffle(qs.filter(id => isSeen(id) && !isMissed(id)));
  return uniq([...missed, ...unseen, ...rest]).slice(0, Math.max(1, Math.min(n, 25)));
}
const pctBar = (v, max, label) => `<div class="pbar" role="img" aria-label="${esc(label)}: ${v} of ${max}"><i style="width:${max ? Math.min(100, Math.round(v / max * 100)) : 0}%"></i></div>`;
function planForm(p, pl) {
  return `<div class="filters"><div class="field"><label for="pl-exam">Exam</label><select id="pl-exam">${opts(activeExams().map(e => [e.code, `${e.code} · ${examLabel(e.code)}`]), pl?.code || p.targetExam || focusExam())}</select></div>
    <div class="field"><label for="pl-date">Exam date</label><input id="pl-date" type="date" min="${isoDate(Date.now() + DAY)}" value="${esc(pl?.examDate || p.examDate || '')}"></div>
    <div class="field"><label for="pl-hours">Hours per week</label><input id="pl-hours" type="number" min="1" max="60" inputmode="numeric" value="${esc(pl?.weeklyHours || p.weeklyHours)}"></div></div>
    <div class="row" style="margin-top:10px"><button class="btn primary" data-action="p2-plan-build">${pl ? 'Rebuild plan' : 'Create study plan'}</button></div>`;
}
VIEWS.plan = () => {
  p2CheckPlan(); const p = cwProfile(); const pl = S.ws.plan;
  const head = `<div class="page-head"><div><h1>Study plan</h1><p class="muted">Built backwards from your exam date and weekly hours, weighted by the exam's domains and by where you are weakest. It re-plans itself if you fall behind.</p></div></div>`;
  if (!pl || !pl.weeks) return head + `<section class="card"><h2>Create your plan</h2><p class="small muted" style="margin-bottom:12px">Pick an exam that has practice questions here, the date you plan to sit it, and the hours you can study each week.</p>${planForm(p, null)}</section>`;
  const now = Date.now(); const pr = examProfile(pl.code); const days = Math.ceil((pl.end - startOfDay(now)) / DAY);
  if (now >= pl.end) return head + `<section class="card"><h2>Your exam date has passed</h2><p class="small muted" style="margin-bottom:12px">The plan for ${esc(pl.code)} ended on ${esc(fmtDate(pl.end))}. Set a new date to plan again.</p>${planForm(p, pl)}</section>`;
  const wk = pl.weeks.find(w => now >= w.start && now < w.end) || pl.weeks[0]; const done = answersIn(pl.code, wk.start, wk.end); const sims = simsIn(pl.code, wk.start, wk.end); const st = planStatus(pl);
  const lastRe = (pl.replans || []).slice(-1)[0];
  return head + `
  <section class="card" style="margin-bottom:16px"><div class="card-head"><h2>${esc(pl.code)} · ${esc(examLabel(pl.code))}</h2><span class="chip">${days} day${days === 1 ? '' : 's'} to go</span></div>
    <p class="small muted">Exam on ${esc(fmtDate(pl.end))} · ${pl.weeklyHours} h a week · ${pl.weeks.length} week${pl.weeks.length === 1 ? '' : 's'} · overall ${st.done} of ${st.planned} planned practice questions so far</p>
    ${lastRe ? `<div class="notice" role="status" style="margin-top:10px"><strong>Re-planned ${esc(humanTime(lastRe.t))}.</strong> <span class="small">${esc(lastRe.reason)}</span></div>` : ''}
    ${pl.warning ? `<div class="notice err" style="margin-top:10px"><span class="small">${esc(pl.warning)}</span></div>` : ''}
    <details style="margin-top:10px"><summary class="small">Change exam, date, or hours</summary><div style="margin-top:10px">${planForm(p, pl)}</div></details></section>
  <section class="card" style="margin-bottom:16px" aria-labelledby="h-wk"><h2 id="h-wk">This week (${esc(fmtDate(wk.start))} to ${esc(fmtDate(wk.end - 1))})</h2>
    <div class="grid g-3" style="margin-top:10px">
      <div><div class="small muted">Practice questions</div><strong>${done.n} / ${wk.practiceQs}</strong>${pctBar(done.n, wk.practiceQs, 'Practice questions this week')}</div>
      <div><div class="small muted">Daily review</div><strong>about ${Math.round(wk.reviewMin / 7)} min a day</strong><div class="small"><a href="#/retention">Open daily review</a></div></div>
      <div><div class="small muted">Full practice exams</div><strong>${sims} / ${wk.sims}</strong>${wk.sims ? pctBar(sims, wk.sims, 'Practice exams this week') : '<div class="small muted">None this week</div>'}</div></div>
    <h3 style="margin:16px 0 8px;font-size:1rem">Practice by domain</h3>
    <div class="list">${Object.entries(wk.domainQs).filter(([, n]) => n > 0).map(([dom, n]) => `<div class="list-item"><div><strong>${esc(dom)}</strong><div class="small muted">${n} question${n === 1 ? '' : 's'} this week</div></div><button class="btn sm" data-action="p2-drill" data-v="${esc(dom)}" data-n="${Math.min(n, 20)}">Practice ${Math.min(n, 20)}</button></div>`).join('')}</div></section>
  <section class="card" style="margin-bottom:16px" aria-labelledby="h-dw"><h2 id="h-dw">How time is split across domains</h2>
    <p class="small muted" style="margin:6px 0 10px">${pl.weightSource === 'official' ? `Weights come from the official exam guide (<a href="${esc(pr.guideUrl || pr.sourceUrl)}" target="_blank" rel="noopener">source</a>, checked ${esc(pr.lastVerified)}).` : `Official domain weights are not recorded for this exam, so every domain starts equal. ${OFFICIAL} for its exam guide.`} Domains where you score under 75% (after at least 5 answers) get more time; strong domains get less.</p>
    <div style="overflow-x:auto"><table><thead><tr><th scope="col">Domain</th><th scope="col" class="num">Weight</th><th scope="col" class="num">Your accuracy</th><th scope="col" class="num">Time multiplier</th><th scope="col" class="num">Share of practice</th></tr></thead><tbody>
      ${pl.domains.map(d => `<tr><th scope="row">${esc(d.name)}</th><td class="num">${Math.round(d.weight * 100)}%${pl.weightSource === 'equal' ? ' (equal)' : ''}</td><td class="num">${d.acc == null ? '—' : Math.round(d.acc * 100) + '% of ' + d.seen}</td><td class="num">×${d.factor.toFixed(2)}</td><td class="num">${Math.round(d.share * 100)}%</td></tr>`).join('')}</tbody></table></div></section>
  <section class="card" aria-labelledby="h-wks"><h2 id="h-wks">Week by week</h2><div style="overflow-x:auto"><table><thead><tr><th scope="col">Week</th><th scope="col" class="num">Practice</th><th scope="col" class="num">Done</th><th scope="col" class="num">Practice exams</th><th scope="col" class="num">Review</th></tr></thead><tbody>
    ${pl.weeks.map((w, i) => { const a = w.start <= now ? answersIn(pl.code, w.start, w.end).n : null; return `<tr ${w === wk ? 'aria-current="true" class="cur-row"' : ''}><th scope="row">${i + 1}. ${esc(fmtDate(w.start))}</th><td class="num">${w.practiceQs}</td><td class="num">${a == null ? '—' : a}</td><td class="num">${w.sims || '—'}</td><td class="num">${w.reviewMin} min</td></tr>`; }).join('')}</tbody></table></div>
    <p class="small muted" style="margin-top:10px">Planning assumptions: about ${MIN_PER_Q} minutes per practice question including the explanation, 15% of time on daily review, and practice exams of ${pl.simLen} minutes${pr?.durationMin ? ' (the official duration)' : ' (a practice setting, not official)'} in the second half. Re-plans happen at most once a day, when you are below 80% of plan.</p></section>`;
};

/* ---------- Command center: setup prompt and this week's plan */
const _dashP2 = VIEWS.dashboard;
VIEWS.dashboard = arg => {
  p2CheckPlan(); let h = _dashP2(arg); const p = cwProfile(); let card = '';
  if (!onboarded()) card = `<section class="card p2-cta" aria-labelledby="h-p2s"><div><h2 id="h-p2s">Make CloudWalker yours</h2><p class="small muted">Five quick questions about your background, target role, and exam date. You get a certification path, a study plan, and interview story seeds that fit you.</p></div><div class="row"><button class="btn primary" data-action="p2-setup">Start (about 2 minutes)</button><button class="btn ghost" data-action="p2-later">Not now</button></div></section>`;
  else if (S.ws.plan?.weeks && Date.now() < S.ws.plan.end) { const pl = S.ws.plan; const w = pl.weeks.find(x => Date.now() >= x.start && Date.now() < x.end) || pl.weeks[0]; const d = answersIn(pl.code, w.start, w.end).n; const days = Math.ceil((pl.end - startOfDay(Date.now())) / DAY);
    card = `<section class="card p2-cta" aria-labelledby="h-p2w"><div><h2 id="h-p2w">This week's study plan</h2><p class="small muted">${esc(pl.code)} in ${days} day${days === 1 ? '' : 's'} · ${d} of ${w.practiceQs} practice questions this week${w.sims ? ` · ${w.sims} practice exam${w.sims === 1 ? '' : 's'}` : ''}</p>${pctBar(d, w.practiceQs, 'Practice questions this week')}</div><div class="row"><a class="btn primary" href="#/plan">Open plan</a></div></section>`; }
  else if (p.targetRole || p.targetExam) card = `<section class="card p2-cta"><div><h2>Plan your exam</h2><p class="small muted">Add your exam date and weekly hours to get a week-by-week plan.</p></div><div class="row"><a class="btn primary" href="#/plan">Create study plan</a><a class="btn ghost" href="#/path">See my path</a></div></section>`;
  if (!card) return h;
  const i = h.indexOf('class="continue-card"'); const j = i < 0 ? -1 : h.indexOf('</section>', i);
  return j > 0 ? h.slice(0, j + 10) + card + h.slice(j + 10) : h + card;
};

/* ---------- Career → Profile: background and goals stay editable */
const _profileTabP2 = profileTab;
profileTab = function () {
  const p = cwProfile(); const yrs = YEARS, roles = TARGET_ROLES.map(([v, l]) => [v, l]);
  return _profileTabP2() + `<section class="card" style="margin-top:16px" data-rec="profile:me" aria-labelledby="h-bg"><div class="card-head"><h2 id="h-bg">Background and goals</h2>${p.onboardedAt ? '<span class="chip ok-chip">Set up</span>' : ''}</div>
    <p class="small muted" style="margin-bottom:12px">Drives your story seeds, model interview answers, certification path, and study plan.</p>
    <div class="filters"><div class="field"><label for="pr-bg">Background</label><select id="pr-bg" data-bind="background">${opts(BACKGROUNDS.map(b => [b.id, b.label]), p.background, 'Not set')}</select></div>
      ${p.background === 'other' ? `<div class="field"><label for="pr-bgo">Your background</label><input id="pr-bgo" type="text" data-bind="backgroundOther" value="${esc(p.backgroundOther)}"></div>` : ''}
      <div class="field"><label for="pr-ind">Industry</label><input id="pr-ind" type="text" data-bind="industry" value="${esc(p.industry)}" placeholder="optional"></div>
      <div class="field"><label for="pr-prior">What you mostly did</label><input id="pr-prior" type="text" data-bind="priorExperience" value="${esc(p.priorExperience)}" placeholder="${esc(bgInfo() ? bgInfo().experience.replace(/\{industry\}/g, '') : 'optional')}"></div>
      <div class="field"><label for="pr-yrs">Years of experience</label><select id="pr-yrs" data-bind="years">${opts(yrs, p.years, 'Not set')}</select></div>
      <div class="field"><label for="pr-role">Target role</label><select id="pr-role" data-bind="targetRole">${opts(roles, p.targetRole, 'Not set')}</select></div>
      <div class="field"><label for="pr-texam">Target exam</label><select id="pr-texam" data-bind="targetExam">${opts(activeExams().map(e => [e.code, e.code]), p.targetExam, 'Not set')}</select></div>
      <div class="field"><label for="pr-date">Exam date</label><input id="pr-date" type="date" data-bind="examDate" value="${esc(p.examDate)}"></div></div>
    <fieldset class="ob-fs" style="margin-top:10px"><legend class="small">Preferred clouds</legend><div class="row">${CLOUD_PICKS.map(([v, l]) => `<label class="row small" style="gap:6px"><input type="checkbox" data-bind="clouds" data-type="multi" value="${v}" ${p.clouds.includes(v) ? 'checked' : ''}>${esc(l)}</label>`).join('')}</div></fieldset>
    <div class="row" style="margin-top:12px"><a class="btn" href="#/path">See my certification path</a><a class="btn" href="#/plan">Study plan</a><button class="btn ghost" data-action="p2-setup">Run setup again</button></div></section>`;
};

/* ---------- Events */
document.addEventListener('change', e => {
  const el = e.target; const k = el.dataset?.ob; if (!k || !S.ob) return; const d = S.ob.d;
  if (k === 'clouds') { d.clouds = el.checked ? uniq([...d.clouds, el.value].filter(v => el.value === 'unsure' ? v === 'unsure' : v !== 'unsure')) : d.clouds.filter(v => v !== el.value); render(); $(`input[data-ob="clouds"][value="${el.value}"]`)?.focus(); return; }
  d[k] = el.type === 'number' ? (+el.value || '') : el.value;
  if (el.type === 'radio') { render(); $(`input[name="${k}"][value="${CSS.escape(el.value)}"]`)?.focus(); }
});
document.addEventListener('input', e => { const el = e.target; const k = el.dataset?.ob; if (k && S.ob && el.type !== 'radio' && el.type !== 'checkbox') S.ob.d[k] = el.type === 'number' ? (+el.value || '') : el.value; });
document.addEventListener('change', e => { const el = e.target; if (el.closest?.('[data-rec="profile:me"]') && ['pr-bg', 'pr-role', 'pr-texam'].includes(el.id)) { if (el.id === 'pr-texam' && el.value && examMetaFor(el.value)) { S.ws.career.profile.focusExam = el.value; try { applyFocusDefaults(el.value); savePrefs(); } catch { /* optional */ } } setTimeout(() => { render(); $('#' + el.id)?.focus(); }, 0); } });
document.addEventListener('click', e => {
  const b = e.target.closest('[data-action^="ob-"],[data-action^="p2-"]'); if (!b) return; e.preventDefault(); const d = b.dataset;
  const fx = {
    'ob-next': () => { S.ob.step = Math.min(OB_STEPS.length - 1, S.ob.step + 1); render(); $('#ob-h')?.focus(); },
    'ob-back': () => { S.ob.step = Math.max(0, S.ob.step - 1); render(); },
    'ob-finish': obFinish,
    'ob-skip': () => { cwProfile().onboardingSkippedAt = Date.now(); S.ob = null; markDirty(); go('dashboard'); showStatus('Setup skipped. You can personalise any time from Career → Profile.'); },
    'p2-setup': () => { obStart(); go('welcome'); },
    'p2-later': () => { cwProfile().onboardingSkippedAt = Date.now(); markDirty(); render(); showStatus('Okay. You can run setup any time from Career → Profile.'); },
    'p2-target': () => { const p = cwProfile(); p.targetExam = d.v; p.focusExam = d.v; try { applyFocusDefaults(d.v); savePrefs(); } catch { /* optional */ } markDirty(); render(); showStatus(`${d.v} is now your target exam. Add a date in Study plan to get a week-by-week plan.`); },
    'p2-plan-build': () => { const code = $('#pl-exam')?.value, date = $('#pl-date')?.value, hrs = Math.max(1, Math.min(60, +$('#pl-hours')?.value || cwProfile().weeklyHours)); const r = makePlan(code, date, hrs); if (r.error) { showStatus(r.error); return; } Object.assign(cwProfile(), { targetExam: code, examDate: date, weeklyHours: hrs }); render(); showStatus('Study plan created.'); },
    'p2-drill': () => { const pl = S.ws.plan; const ids = domainDrill(pl.code, d.v, +d.n || 10); startRunner({ title: `Plan: ${d.v.replace(/^\d+\.\s*/, '')}`, mode: 'drill', ids, reveal: 'immediate', examCode: pl.code }); }
  };
  if (fx[d.action]) fx[d.action]();
});
function p2AfterBoot() {
  cwProfile();
  const fresh = !Object.keys(S.progress.answers).length && !allArtifacts().length && !PERSIST.restoredFrom;
  if (!onboarded() && fresh && ['', '#', '#/', '#/dashboard'].includes(location.hash)) { obStart(); location.hash = '#/welcome'; }
}


