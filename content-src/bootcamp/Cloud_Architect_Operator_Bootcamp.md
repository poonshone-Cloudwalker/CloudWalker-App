# Cloud Architect Operator Bootcamp

**Terminal-first • evidence-led • production judgment**

A career-changer pathway toward strong cloud architecture, security, automation, platform engineering, and technical leadership. The aim is not certification recall: every level makes you design, build, secure, operate, recover, explain, and improve a system.

> **Scope note:** This is a curriculum blueprint with 72 lab briefs and nine fully specified capstone-style example labs. Cloud spend and service availability vary by account, region, and date; use the safety gates below, verify current provider behavior, and never run a lab in a production account.

## Operating contract for every lab

Each lab begins with its scenario and constraints. Every learner submission includes:

1. Working terminal evidence: commands, scripts, config, and reproducible results—not console screenshots.
2. Deterministic tests: `make validate` (or documented equivalent) exits nonzero on a failed requirement and avoids depending on live cloud state unless the lab explicitly tests a disposable deployment.
3. A failure drill: inject the named fault in a disposable environment, capture symptoms, diagnosis, recovery, and residual risk.
4. One decision record (`docs/adr/0001-*.md`) or the specifically requested runbook/incident report. Include context, decision, alternatives, consequences, and evidence.
5. A cleanup command and a post-cleanup check. Cloud labs must have a time limit, budget/alert where available, region allowlist, resource inventory, and teardown proof.
6. A short `REPORT.md`: what worked, what did not, test output, cost-control evidence, and next improvement.

**Standard acceptance gate:** clean checkout → documented setup → `make validate` passes → failure drill is reproducible → cleanup completes → no lab-owned resources remain → required evidence and ADR/runbook/report exist. Each lab's brief adds its own acceptance tests. If a test requires cloud credentials, it must also have a deterministic offline/unit mode.

**Safety:** use a dedicated sandbox account/project/subscription, least-privilege lab role, synthetic data, no public ingress unless explicitly required, no real secrets in Git, region allowlists, short TTLs, and teardown even after a failed apply. Budget alerts are not hard spending caps. Never assume a destroy command succeeded—query and verify.

## 1. Curriculum roadmap

| Level | Outcome | Main tools | Promotion evidence |
|---|---|---|---|
| 1. Operator foundations | Diagnose a host/network path, automate a repeatable local task, and explain evidence | Bash, Linux, `dig`, `curl`, OpenSSL, Git, Python, SQLite/SQL | Reproducible CLI repo; tested parser; DNS/HTTP/TLS diagnostic report |
| 2. AWS foundations | Navigate account/region/identity safely and perform read-only then disposable AWS operations | AWS CLI, IAM, CloudTrail concepts, S3, VPC primitives | Account preflight, least-privilege policy, resource inventory, teardown proof |
| 3. Repeatable delivery | Build and promote an artifact through tested CI, Terraform, and containers | Terraform, Git, Docker, CI, AWS | Plan review, immutable image, pipeline tests, rollback path |
| 4. Operate and recover | Set useful service objectives, detect faults, restore data, and explain cost | CloudWatch/CLI, SRE methods, backups, DR, FinOps | SLO/alert pack, incident timeline, restore evidence, cost report |
| 5. Secure the system | Apply identity, encryption, secrets, segmentation, detection, and governance controls | IAM, KMS, Secrets Manager, VPC, AWS Config/CloudTrail concepts | Threat model, negative tests, detection evidence, remediation record |
| 6. Architect deliberately | Turn requirements into documented, tested tradeoffs and migration plans | C4/diagrams-as-code, Terraform, ADRs, load/failure tests | Options analysis, architecture tests, migration/rollback plan |
| 7. Build a platform | Offer safe, paved paths with policy guardrails and self-service evidence | Terraform modules, OPA/Conftest or Checkov, CI, AWS | Versioned golden path, policy tests, developer docs, exception workflow |
| 8. Compare providers | Map equivalent primitives and design hybrid/multi-cloud deliberately | Terraform, `gcloud`, Azure CLI, AWS CLI | Capability matrix, identity/network mapping, provider-specific lab evidence |
| 9. Lead architecture | Facilitate decisions, reviews, incidents, and executive communication | Git, docs, diagrams, tabletop scripts, evidence-based review | Architecture review pack, executive brief, coaching plan, crisis simulation |

**Suggested pacing:** progress by evidence, not calendar. Complete a level's eight labs in any order, then its exemplar as the level gate. A learner may split cloud labs across sessions; each session starts with a preflight and ends with cleanup verification.

## 2. Directory structure for all labs

```text
cloud-architect-operator-bootcamp/
├── README.md
├── Makefile
├── .gitignore
├── progress/
│   ├── tracker.csv
│   └── evidence-index.md
├── standards/
│   ├── lab-contract.md
│   ├── scoring-rubric.md
│   ├── cost-and-teardown.md
│   ├── security-baseline.md
│   └── templates/
│       ├── LAB-README.template.md
│       ├── ADR.template.md
│       ├── RUNBOOK.template.md
│       └── INCIDENT.template.md
├── levels/
│   ├── 01-operator-foundations/
│   │   ├── README.md
│   │   ├── labs/01-linux-processes/ ... labs/08-sql-audit/
│   │   └── exemplar/01-dns-tls-diagnostics/
│   ├── 02-aws-foundations/ (labs/01..08, exemplar/01-safe-s3-inventory)
│   ├── 03-repeatable-delivery/ (labs/01..08, exemplar/01-container-to-pipeline)
│   ├── 04-reliability-operations/ (labs/01..08, exemplar/01-slo-failure-drill)
│   ├── 05-cloud-security/ (labs/01..08, exemplar/01-least-privilege-data-path)
│   ├── 06-architecture-decisions/ (labs/01..08, exemplar/01-resilient-service-design)
│   ├── 07-platform-engineering/ (labs/01..08, exemplar/01-guardrailed-golden-path)
│   ├── 08-clouds-hybrid/ (labs/01..08, exemplar/01-provider-capability-map)
│   └── 09-architecture-leadership/ (labs/01..08, exemplar/01-review-and-crisis)
└── portfolio/
    ├── README.md
    ├── architecture-decisions/
    ├── diagrams/
    ├── operational-evidence/
    └── case-studies/
```

Each `labs/NN-slug/` is independently runnable and contains `README.md`, `src/` or `app/`, `tests/`, `scripts/`, `docs/`, and—only where needed—`infra/`. Keep generated state, credentials, plans containing sensitive values, logs with identifiers, and `.env` files out of Git. Pin tool versions and provider versions; commit lock files where appropriate.

## 3. Lab README template

```markdown
# Lab NN — Title

## Scenario and constraints
Who needs what? State scale, availability, data sensitivity, budget/time limit,
regions, permissions, and what is explicitly out of scope.

## Learning objectives
- Observable objective 1
- Observable objective 2

## Prerequisites and safety
Tool versions, sandbox identity, allowed regions, expected spend class, TTL,
credential check, and stop/cleanup rule. Never paste credentials into logs.

## Starter repository
List every relevant starter file and its purpose.

## Tasks (terminal-first)
Numbered commands/tasks, expected outputs, and where learner judgment is required.

## Failure injection
Fault, safe injection command, expected symptom, diagnosis evidence, recovery,
and how to restore the baseline. State what must never be injected in production.

## Deliverables
Code/config, tests, ADR or runbook or incident report, REPORT.md, and evidence paths.

## Validation and acceptance
`make validate`; unit/format/lint/security/policy tests; cloud integration checks;
explicit expected results and failure exit behavior.

## Cost controls and cleanup
Preflight; budget/alert if available; region/TTL/tagging; exact destroy command;
post-destroy inventory query; evidence that no lab-owned resources remain.

## Scoring (0–4 each)
Correctness, security, resilience, operational quality, cost, automation,
communication. Explain what 0, 2, and 4 mean for this lab.
```

## 4. Scoring rubric and learner tracker

Score each dimension 0–4: **0** absent/unsafe; **1** incomplete and largely unverified; **2** functional happy path with material gaps; **3** tested, documented, and safe for the stated scope; **4** robust evidence, negative/failure testing, thoughtful tradeoffs, and clear improvement path. Seven dimensions yield 28 points. Suggested gate: at least 20/28, no 0 in security or cost, all acceptance tests pass. A numerical score never overrides an unsafe deployment.

| Dimension | Evidence to inspect |
|---|---|
| Correctness | Tests, expected behavior, reproducible commands |
| Security | Least privilege, data handling, secrets, negative tests |
| Resilience | Fault behavior, recovery, backup/restore or rollback |
| Operational quality | Observability, runbook, clear ownership, actionable alerts |
| Cost | Estimates/limits, resource scope, cleanup proof, waste analysis |
| Automation | Idempotence, CI, scripts, machine-checkable guardrails |
| Communication | ADR/report quality, diagrams, audience-appropriate explanation |

**Progress tracker** (`progress/tracker.csv`; one row per lab):

```csv
level,lab_id,status,started,completed,score_correctness,score_security,score_resilience,score_operations,score_cost,score_automation,score_communication,validation_command,evidence_link,cleanup_verified,reviewer_notes
1,01-linux-processes,not-started,,,,,,,,,,,,,
```

Statuses: `not-started`, `in-progress`, `blocked`, `passed`, `rework`. Record evidence in a private/local tracker if it would reveal account IDs, internal names, or security-sensitive details. Do not commit real cloud identifiers or raw incident logs to a public portfolio.

## 5. Lab catalog: eight briefs per level

The common operating contract above applies to **every** lab below: scenario + constraints, terminal tasks, failure drill, ADR/runbook/report, cleanup/cost controls, grading, and acceptance gate. Every brief lists its own starter directory, deterministic validator idea, and additional acceptance evidence. For every lab, implement `make validate` as an offline deterministic check plus an explicitly named, optional sandbox integration target. Use test fixtures, local emulators, mocks, or static policy tests for repeatability; never make routine validation create cloud resources.

### Level 1 — Operator foundations

| ID / scenario and constraints | Terminal work and failure drill | Starter files | Validator idea / acceptance |
|---|---|---|---|
| 1.01 Linux process triage: a local service is slow; no root access, synthetic logs only. | Use `ps`, `/proc`, `ss`, `journalctl` where available; induce a CPU-bound test process and diagnose safely. | `scripts/triage.sh`, `fixtures/process.log`, `tests/test_triage.py` | Assert required fields and exit codes on fixture; output identifies PID/state and next action. |
| 1.02 Filesystem and permissions: a batch job cannot read its input; do not change global permissions. | Use `find`, `stat`, `chmod` in a temp tree; inject owner/mode mismatch and restore least privilege. | `scripts/check_permissions.sh`, `fixtures/tree/`, `tests/test_permissions.py` | Temp-dir tests detect expected denial and verify no world-writable files. |
| 1.03 Network path: an internal API times out; only local or approved public targets. | `ip`, `ss`, `curl`, `nc`/`timeout`; inject closed-port and DNS-failure fixtures, distinguish layers. | `scripts/netcheck.sh`, `tests/test_netcheck.py` | Mock command outputs; classification and bounded timeout assertions pass. |
| 1.04 DNS investigation: a migration changed a record; use a named test domain or local resolver. | `dig`/`getent`, TTL and record parsing; inject NXDOMAIN/stale-answer fixture. | `scripts/dns_report.py`, `fixtures/dig-*.txt`, `tests/test_dns_report.py` | Fixture-backed parser checks A/AAAA/CNAME/TXT and failure classification. |
| 1.05 HTTP/TLS probe: a client reports certificate errors; no credential collection. | `curl -v`, `openssl s_client`; inspect chain/expiry/hostname on controlled endpoint or fixtures. | `scripts/tls_probe.sh`, `fixtures/tls/`, `tests/test_tls_probe.py` | Offline parser detects expiry/hostname/chain cases; output redacts sensitive headers. |
| 1.06 Git recovery: a teammate committed an accidental secret-like dummy string; no real secret. | Branch, revert, cherry-pick, history scan; inject a fixture leak and practice safe remediation, not history rewriting as sole fix. | `scripts/secret_scan.py`, `fixtures/dummy-leak.txt`, `.git/hooks/` | Test catches fixture token; clean sample passes; repo has remediation note and reviewable history. |
| 1.07 Python log utility: ops needs a deterministic summary of mixed-format synthetic logs. | Build CLI with `argparse`, parsing, JSON output; inject malformed lines and timezone edge. | `src/logsum.py`, `fixtures/app.log`, `tests/test_logsum.py` | Fixed fixtures produce byte-stable JSON; malformed input is counted and handled. |
| 1.08 SQL audit: investigate duplicate or orphaned synthetic order rows. | SQLite schema, joins, constraints, transaction; inject duplicate/orphan input and demonstrate rollback. | `sql/schema.sql`, `sql/audit.sql`, `tests/test_sql.py` | Build temporary DB; assert counts and constraints; rerun is deterministic. |

### Level 2 — AWS foundations and CLI operations

| ID / scenario and constraints | Terminal work and failure drill | Starter files | Validator idea / acceptance |
|---|---|---|---|
| 2.01 Identity and account preflight: contractor must prove account/role/region before any write. | AWS CLI STS identity, region checks, allowlist; inject wrong profile/region. | `scripts/preflight.sh`, `config/regions.txt`, `tests/test_preflight.py` | Stub CLI JSON; wrong identity/region fails closed; no write API called. |
| 2.02 S3 inventory: audit a designated sandbox bucket without reading object bodies. | CLI list, classify public/encryption/versioning metadata; simulate access denied. | `scripts/s3_audit.py`, `fixtures/s3-*.json`, `tests/test_s3_audit.py` | Fixture tests identify missing controls; command is read-only; report omits object data. |
| 2.03 IAM policy review: a report role has excessive actions; no policy attachment changes. | Parse policy JSON, enumerate wildcard/resource scope, run IAM Access Analyzer only if available. | `policies/role.json`, `scripts/iam_review.py`, `tests/test_iam_review.py` | Deterministic policy fixtures flag `*`; remediation policy narrows actions/resources. |
| 2.04 VPC route reasoning: app subnet cannot reach a private dependency; no public exposure. | Inspect VPC/subnet/route JSON; build route graph and trace simulated paths. | `fixtures/network.json`, `src/route_trace.py`, `tests/test_routes.py` | Unit graph tests classify reachable/unreachable; no AWS mutation in validation. |
| 2.05 CloudTrail evidence: answer who changed a synthetic resource in a time window. | AWS CLI lookup-events or fixture mode; inject empty/late event data. | `scripts/change_timeline.py`, `fixtures/events.json`, `tests/test_timeline.py` | Stable event ordering/time-window filters and empty-result handling pass. |
| 2.06 CLI pagination: inventory resources beyond first page in a sandbox account. | Use paginators/output JSON; inject repeated token/partial page fixture. | `scripts/inventory.py`, `fixtures/pages/`, `tests/test_inventory.py` | Fixture verifies all pages, deduplication, and loop guard. |
| 2.07 Tag policy: cost report cannot attribute untagged resources. | Enumerate chosen resource types; emit CSV; inject missing/invalid tags. | `config/required-tags.json`, `scripts/tag_audit.py`, `tests/test_tags.py` | Test fixtures report missing keys and stable CSV; do not mutate tags. |
| 2.08 Safe S3 lifecycle: synthetic archive objects need retention and deletion policy. | Use a disposable bucket only in optional integration mode; inspect lifecycle/versioning; inject policy mismatch. | `infra/`, `scripts/check_bucket.py`, `tests/test_bucket_policy.py` | Static policy tests enforce encryption, block-public-access and lifecycle; integration teardown verified. |

### Level 3 — Terraform, CI/CD, containers, repeatable delivery

| ID / scenario and constraints | Terminal work and failure drill | Starter files | Validator idea / acceptance |
|---|---|---|---|
| 3.01 Terraform foundations: create a local-only reproducible module before cloud use. | `terraform fmt/validate/plan`; inject invalid variable and drift in local fixture. | `infra/main.tf`, `variables.tf`, `tests/` | Terraform validate and plan assertions; no provider credentials/resource required. |
| 3.02 AWS module contract: team needs a versioned S3 module with safe defaults. | Terraform module, variables/outputs, validation and static policy checks; inject public access config. | `infra/modules/bucket/`, `tests/` | Plan JSON assertions reject unsafe public access and missing encryption/versioning settings. |
| 3.03 Containerize a small service: build must be reproducible and non-root. | Docker build, inspect image, run tests; inject bad health endpoint or root user. | `app/`, `Dockerfile`, `.dockerignore`, `tests/` | Build test, non-root config assertion, health check and container smoke test pass. |
| 3.04 CI quality gate: changes must fail before merge when tests/security checks fail. | Pipeline YAML, lint/test/scan/plan stages; inject failing test and unsafe IaC fixture. | `.github/workflows/ci.yml`, `Makefile`, `tests/` | Local CI-equivalent target proves fail-closed ordering; workflow syntax/policy tests pass. |
| 3.05 Artifact promotion: same image digest moves dev→stage; no rebuild between environments. | Tag by digest, generate manifest/SBOM; inject tag-only mismatch. | `scripts/promote.sh`, `release/manifest.json`, `tests/` | Test asserts digest equality and rejects mutable `latest` promotion. |
| 3.06 Terraform state hygiene: a team needs collaboration without leaking state. | Local state inspection, backend design, locking/secret review; inject sensitive variable in plan fixture. | `infra/backend.tf.example`, `docs/state.md`, `tests/` | Static checks prohibit committed state/secrets and document state recovery/locking. |
| 3.07 Deployment rollback: a bad release must be rolled back with evidence. | Scripted local/container deployment versions; inject failed health check. | `scripts/deploy.sh`, `scripts/rollback.sh`, `tests/` | Test confirms failed health check restores previous digest and records event. |
| 3.08 Release provenance: produce verifiable build metadata for a small service. | Generate checksums, metadata, signed attestations in an optional local workflow; inject checksum mismatch. | `scripts/release.sh`, `release/`, `tests/` | Deterministic checksum verification rejects altered artifact; provenance fields complete. |

### Level 4 — Observability, SRE, incidents, backup, DR, FinOps

| ID / scenario and constraints | Terminal work and failure drill | Starter files | Validator idea / acceptance |
|---|---|---|---|
| 4.01 SLI/SLO design: checkout latency matters more than host CPU; use synthetic data. | Calculate availability/latency indicators and error budget in Python; inject bad window boundary. | `data/requests.csv`, `src/slo.py`, `tests/` | Known dataset yields fixed SLI/error budget; edge intervals tested. |
| 4.02 Alert quality: on-call is flooded by CPU alerts with no user impact. | Evaluate alert fixtures for symptom/actionability; inject duplicate/noisy alert. | `alerts/`, `scripts/alert_lint.py`, `tests/` | Lint flags no owner/runbook or absent threshold rationale; clean alert passes. |
| 4.03 Incident timeline: intermittent 5xx after a release. | Parse synthetic logs/events, correlate UTC timeline; inject clock skew/missing timestamp. | `fixtures/`, `scripts/timeline.py`, `docs/incident.md` | Deterministic correlation and missing-data annotation pass. |
| 4.04 Backup restore: a service owner needs evidence, not a green backup job. | Create/restore encrypted local test data; AWS optional isolated integration; inject corrupt backup. | `scripts/backup.sh`, `scripts/restore.sh`, `tests/` | Restored checksum matches; corrupt backup is rejected; recovery time recorded. |
| 4.05 DR objective: choose recovery approach under RTO/RPO and budget limits. | Model recovery tiers and dependency sequence in Python; inject unavailable dependency. | `data/dependencies.json`, `src/dr_model.py`, `tests/` | Scenario tests flag unmet RTO/RPO; report names critical path and assumptions. |
| 4.06 FinOps allocation: untagged spend obscures service ownership. | Parse synthetic CUR-like CSV, allocate shared costs with documented rule; inject missing owner. | `data/cost.csv`, `src/allocate.py`, `tests/` | Totals reconcile exactly; unallocated share visible; no fabricated savings claims. |
| 4.07 Capacity and scaling: traffic peak causes queue growth. | Simulate throughput/queue and scaling response; inject slow dependency. | `src/queue_model.py`, `tests/`, `docs/runbook.md` | Deterministic load profile identifies saturation and recommended intervention. |
| 4.08 AWS operational alarm: detect a deliberately disabled control in sandbox. | Terraform/CLI deploy a low-cost metric/log alarm or validate equivalent config; inject missing metric. | `infra/`, `scripts/`, `tests/` | Static tests and optional live alarm check; cleanup and no-data behavior documented. |

### Level 5 — Cloud security engineering

| ID / scenario and constraints | Terminal work and failure drill | Starter files | Validator idea / acceptance |
|---|---|---|---|
| 5.01 IAM least privilege: batch job only needs a narrow S3 prefix. | Generate/test policy against allowed and denied action/resource pairs; inject wildcard. | `policies/`, `tests/test_policy.py` | Positive and negative authorization matrix passes; wildcard is rejected. |
| 5.02 Encryption decisions: data has distinct sensitivity classes. | Terraform design for encryption at rest/in transit, key ownership and rotation; inject plaintext config fixture. | `infra/`, `docs/data-classification.md`, `tests/` | Static plan checks encryption settings; ADR explains key and recovery tradeoffs. |
| 5.03 Secret handling: deploy pipeline must not expose a dummy credential. | Use local secret fixture or managed secret reference; scan Git/history/log outputs; inject canary. | `app/`, `scripts/secret_check.py`, `tests/` | Canaries never appear in logs/artifact; scanner catches fixture exposure. |
| 5.04 Network segmentation: app, data, and admin paths must be distinct. | Terraform security-group/NACL intent and path tests; inject broad ingress. | `infra/`, `tests/network_policy/` | Policy graph rejects unintended flows and permits only declared paths. |
| 5.05 Detection engineering: suspicious role use should create a useful finding. | Parse synthetic CloudTrail events, normalize and correlate; inject benign lookalike. | `fixtures/events/`, `src/detect.py`, `tests/` | True/false positive fixtures produce expected severity and explanation. |
| 5.06 Governance guardrail: prevent public storage and unapproved regions. | Write policy-as-code checks for Terraform plan; inject violating resource. | `policy/`, `infra/`, `tests/` | `make policy` rejects violations and emits actionable location/rule. |
| 5.07 Threat model: public API handles sensitive synthetic data. | Draw trust boundaries, identify abuse cases, map controls/tests; inject missing auth assumption. | `docs/threat-model.md`, `diagrams/`, `tests/` | Review checklist links each high-priority threat to a control and validation. |
| 5.08 Security incident: leaked dummy key is suspected active. | Revoke/rotate in local simulation or disposable account; inspect audit evidence; inject delayed detection. | `scripts/respond.sh`, `docs/runbook.md`, `tests/` | Exercise checklist proves containment, rotation, scope check, and post-incident report. |

### Level 6 — Architecture requirements, tradeoffs, resilience, migration, ADRs

| ID / scenario and constraints | Terminal work and failure drill | Starter files | Validator idea / acceptance |
|---|---|---|---|
| 6.01 Requirements discovery: product brief omits latency and data residency. | Convert synthetic interview notes into measurable NFRs and assumptions; inject conflicting stakeholder statement. | `brief/`, `docs/requirements.md`, `tests/` | Schema/checklist validates units, owner, measurement method, unresolved assumptions. |
| 6.02 Options analysis: choose managed database vs self-managed under staffing limit. | Build weighted decision model with sensitivity analysis; inject changed workload assumption. | `data/options.json`, `src/decision.py`, `tests/` | Ranking reproducible; sensitivity output shows when recommendation changes; ADR present. |
| 6.03 Resilience topology: service must survive one AZ failure within stated RTO. | Model dependency graph and failure domains; inject shared single point of failure. | `architecture/`, `src/failure_model.py`, `tests/` | Failure test identifies blast radius and checks RTO assumptions. |
| 6.04 Migration waves: legacy service has undocumented dependencies. | Parse synthetic dependency inventory, group waves, identify rollback checkpoints; inject missing owner. | `data/dependencies.csv`, `src/waves.py`, `tests/` | Every component mapped to wave/owner/rollback; unknowns explicitly blocked. |
| 6.05 Data migration: cutover requires integrity and bounded downtime. | Write checksum/reconciliation and dual-run plan; inject row mismatch. | `scripts/reconcile.py`, `docs/cutover.md`, `tests/` | Test catches mismatch; go/no-go criteria and rollback trigger are explicit. |
| 6.06 ADR quality: a prior decision lacks alternatives and consequences. | Lint ADR front matter/content; revise one decision with evidence and revisit trigger. | `docs/adr/`, `scripts/adr_lint.py`, `tests/` | Linter rejects missing fields; ADR distinguishes fact, assumption, and judgment. |
| 6.07 Capacity design: peak event increases load 5x (exercise-defined synthetic factor). | Model stateless/stateful bottlenecks and queueing; inject dependency latency. | `src/capacity.py`, `data/load.csv`, `tests/` | Tests assert constraints and reveal bottleneck; assumptions clearly stated. |
| 6.08 Architecture review: proposed diagram hides identity and failure paths. | Validate diagram source/annotations and run architecture fitness checks; inject missing trust boundary. | `diagrams/`, `docs/review.md`, `tests/` | Checklist requires flows, trust zones, dependencies, failure domains, owners, and tradeoffs. |

### Level 7 — Platform engineering

| ID / scenario and constraints | Terminal work and failure drill | Starter files | Validator idea / acceptance |
|---|---|---|---|
| 7.01 Landing-zone blueprint: new team needs isolated accounts and common controls. | Terraform structure and account vending contract; no org-wide apply in learner account. | `infra/modules/`, `docs/landing-zone.md`, `tests/` | Static tests verify boundaries, baseline controls, ownership, and bootstrap sequence. |
| 7.02 Golden path service: developers need a secure deployable starter. | Generate service skeleton, container, pipeline, IaC module; inject insecure default. | `templates/service/`, `scripts/new-service.sh`, `tests/` | Generated sample builds/tests; required security and operations files exist. |
| 7.03 Policy as code: enforce tags, approved region, encryption, and no public exposure. | Conftest/OPA or equivalent over plan JSON; inject each violation. | `policy/`, `fixtures/plans/`, `tests/` | Each rule has passing/failing fixtures and remediation text. |
| 7.04 Module release lifecycle: module consumers need safe version upgrades. | Semantic version, changelog, compatibility tests; inject breaking output change. | `modules/`, `CHANGELOG.md`, `tests/` | Compatibility test detects breaking interface; upgrade notes include migration path. |
| 7.05 Self-service workflow: developer requests a dev environment with bounded scope. | CLI-driven config validation and plan generation; inject oversized/invalid request. | `cli/`, `schemas/`, `tests/` | Bad request rejected before cloud call; valid request produces reviewable plan. |
| 7.06 Exception process: legacy app needs temporary policy exception. | Implement expiring exception schema, owner, rationale, compensating control; inject expired exception. | `exceptions/`, `policy/`, `tests/` | Expired/unowned exceptions fail; audit trail and expiry date required. |
| 7.07 Platform observability: platform team needs adoption and failure signals without surveillance. | Parse synthetic platform events, aggregate service-level metrics; inject missing telemetry. | `events/`, `src/metrics.py`, `tests/` | Metrics disclose denominators and privacy boundaries; missing data is surfaced. |
| 7.08 Platform upgrade: provider/module change may affect many teams. | Simulate version matrix and staged rollout; inject incompatible consumer. | `matrix/`, `scripts/rollout.py`, `tests/` | Blocked consumer is identified; canary/rollback gates and owner comms included. |

### Level 8 — Google Cloud, Azure, multi-cloud, hybrid, vendor strategy

| ID / scenario and constraints | Terminal work and failure drill | Starter files | Validator idea / acceptance |
|---|---|---|---|
| 8.01 Provider capability map: workload may move from AWS to GCP or Azure. | Terraform-independent capability matrix; validate claims against provider CLI/docs during lab. | `data/capabilities.yaml`, `scripts/check_matrix.py`, `tests/` | Required dimensions complete; every claim has evidence/date and caveat. |
| 8.02 GCP identity and project preflight: analyst must verify project and principal before read-only inventory. | `gcloud auth list`, project/region checks, Terraform plan only; inject wrong project. | `scripts/gcp-preflight.sh`, `infra/`, `tests/` | Stubbed CLI checks fail closed on wrong principal/project; no write commands. |
| 8.03 GCP network/storage primitives: map AWS concepts to GCP without assuming one-to-one equivalence. | Terraform plan for isolated sandbox design; use `gcloud` read-only validation; inject unintended public access. | `infra/`, `docs/mapping.md`, `tests/` | Static plan checks and comparison table identify semantics and non-equivalence. |
| 8.04 Azure enterprise identity: workload identity choice must fit an enterprise tenant boundary. | Azure CLI identity/subscription preflight; Terraform plan and identity mapping; inject wrong subscription. | `scripts/az-preflight.sh`, `infra/`, `tests/` | Mocked identity/subscription checks fail closed; secrets not embedded in config. |
| 8.05 Azure network/governance: compare hub-spoke, policy scope, and AWS/GCP analogues. | Terraform plan, `az` read-only checks if sandbox exists; inject route/policy conflict fixture. | `infra/`, `fixtures/`, `docs/adr/`, `tests/` | Policy/route fixtures detect conflict; comparison states limits and scope behavior. |
| 8.06 Hybrid DNS and identity: on-prem service must resolve cloud endpoint across boundaries. | Local DNS simulation, Terraform network intent, identity flow diagram; inject resolver forwarding failure. | `lab/`, `diagrams/`, `tests/` | Tests classify resolution failure; no live on-prem dependency required. |
| 8.07 Multi-cloud data boundary: avoid copying regulated synthetic data across provider boundary. | Data-flow inventory and policy checks; inject unapproved transfer path. | `data/flows.yaml`, `policy/`, `tests/` | Unauthorized flow rejected; residency, key, egress, and exit risks documented. |
| 8.08 Vendor strategy: reduce lock-in only where business value justifies cost. | Model portability, egress, skills, resilience, and operational burden; inject price/availability assumption changes. | `data/assumptions.yaml`, `src/strategy.py`, `tests/` | Sensitivity analysis and ADR explain what remains provider-specific and why. |

### Level 9 — Architecture leadership

| ID / scenario and constraints | Terminal work and failure drill | Starter files | Validator idea / acceptance |
|---|---|---|---|
| 9.01 Design review facilitation: teams disagree on synchronous vs asynchronous design. | Build agenda, decision log, and terminal-checkable evidence bundle; inject unresolved dependency. | `review/`, `scripts/check_evidence.py`, `tests/` | Required risks/options/owners/decision date present; dissent and follow-up captured. |
| 9.02 Executive brief: leadership needs a decision under uncertainty in one page. | Generate concise Markdown from evidence; inject changed cost/risk assumption. | `brief/`, `data/assumptions.yaml`, `tests/` | Word/section limits, recommendation, tradeoff, decision requested, confidence and caveats checked. |
| 9.03 Mentoring plan: a junior engineer needs a safe path to own an operational task. | Create staged tasks, review checklist, and pair-session notes; inject a risky task without guardrails. | `mentoring/`, `tests/checklist_test.py` | Tasks have success criteria, rollback/safety boundary, feedback point, and ownership progression. |
| 9.04 Crisis command: synthetic regional impairment impacts customer requests. | Run tabletop through CLI timeline tool; assign incident roles/comms; inject conflicting signal. | `incident/`, `scripts/tabletop.py`, `tests/` | Timeline has decisions, owner, next update, customer impact, and recovery evidence. |
| 9.05 Post-incident learning: avoid blame and produce measurable corrective actions. | Parse timeline and action list; inject vague action (“improve monitoring”). | `incident/`, `scripts/action_lint.py`, `tests/` | Every action has owner, due date, verification, priority; report separates facts/hypotheses. |
| 9.06 Architecture portfolio defense: interviewer challenges a prior design choice. | Prepare evidence index and adversarial Q&A; inject requirement change. | `portfolio/`, `scripts/verify_links.py`, `tests/` | Every claim links to artifact/test; response names tradeoff and condition to revisit. |
| 9.07 Cross-team migration leadership: three teams have conflicting cutover windows. | Build dependency graph and comms plan; inject missed readiness gate. | `migration/`, `src/readiness.py`, `tests/` | Cutover cannot proceed on failed gate; decision owner, rollback, and escalation explicit. |
| 9.08 Technical strategy: propose a 12-month platform investment under fixed capacity. | Prioritize outcomes, risks, sequencing, and measures; inject staffing reduction. | `strategy/`, `data/options.yaml`, `tests/` | Plan has explicit non-goals, measurable outcomes, dependencies, and re-prioritization logic. |

## 6. Nine complete example labs

Each exemplar is a model of the expected depth and can be copied into its indicated directory. Use local/unit validation by default; cloud deployment is an opt-in, sandbox-only integration exercise. Do not paste output containing account IDs or private endpoints into public evidence.

### Exemplar 1 — DNS and TLS diagnostic CLI

**Scenario and constraints.** A small support team gets intermittent “site unavailable” reports. Build a safe diagnostic that separates resolver, TCP, HTTP, and certificate symptoms. Linux/macOS terminal, Python 3, Git; network tests only to an explicitly approved target. Never collect cookies, auth headers, or private key material.

**Starter tree**
```text
levels/01-operator-foundations/exemplar/01-dns-tls-diagnostics/
├── README.md  Makefile  .gitignore
├── src/diagnose.py
├── fixtures/dns-ok.txt fixtures/dns-nxdomain.txt fixtures/tls-ok.txt fixtures/tls-expired.txt
├── tests/test_diagnose.py
├── docs/adr/0001-diagnostic-boundaries.md docs/runbook.md REPORT.md
└── scripts/validate.sh
```

**Build tasks.** Implement `python -m src.diagnose --target example.test --fixture-dir fixtures --json`; fixture mode must not access the network. Optional `--live` requires explicit allowlisted hostname and bounded timeout. Use `dig`/`getent` and `curl`/`openssl` only in live mode; classify each layer and redact target credentials/query strings. Add a Git commit sequence demonstrating tests before the feature and an ADR explaining why fixture mode is default.

**Failure drill.** Substitute the NXDOMAIN fixture, then the expired-certificate fixture. Confirm the tool distinguishes DNS from TLS, returns nonzero for a failed diagnostic, and does not emit secrets. Restore the passing fixture.

**Validation and acceptance.** `make validate` runs formatting/compile checks and `python -m unittest discover -s tests -v`. Tests assert stable JSON keys, error classifications, bounded timeout configuration, correct exit codes, and redaction. `make validate` must pass offline; malformed fixtures must fail safely, not crash with a traceback.

**Cleanup/cost.** No cloud resources. Remove temp files; `git status --short` is clean except intentional source/docs. Live targets are allowlisted and opt-in.

**Deliverables.** Source, fixtures, tests, ADR, runbook, REPORT with sample terminal output and limitations. **Acceptance:** a reviewer can clone and run tests without credentials; the two injected faults produce distinct, reproducible diagnoses.

### Exemplar 2 — Safe AWS S3 inventory (read-only)

**Scenario and constraints.** An auditor needs a concise inventory of a designated sandbox bucket's public-access block, encryption, versioning, and lifecycle posture. No object bodies, no writes, no bucket creation by default. AWS CLI profile and region must be explicitly supplied; only a sandbox allowlisted bucket is eligible for optional live mode.

**Starter tree**
```text
levels/02-aws-foundations/exemplar/01-safe-s3-inventory/
├── README.md Makefile config/allowlist.json
├── src/audit.py scripts/preflight.sh
├── fixtures/bucket-good.json fixtures/bucket-risky.json
├── tests/test_audit.py tests/test_preflight.py
└── docs/adr/0001-read-only-inventory.md docs/runbook.md REPORT.md
```

**Build tasks.** `scripts/preflight.sh PROFILE REGION` checks `aws sts get-caller-identity`, exact approved account placeholder from local config, region allowlist, and explicit bucket allowlist before any API calls. `python -m src.audit --fixture fixtures/bucket-risky.json --json` produces deterministic findings. Live mode invokes only read APIs (`get-public-access-block`, `get-bucket-encryption`, `get-bucket-versioning`, `get-bucket-lifecycle-configuration`); handle absent configuration separately from AccessDenied. Never infer public access solely from one setting.

**Failure drill.** Change active profile or region in a test stub and prove preflight blocks live mode. Use the risky fixture and confirm findings include remediation and evidence source. Simulate AccessDenied; report “unknown,” not “secure.”

**Validation and acceptance.** `make validate` runs unit tests against checked-in JSON and asserts zero write API names in the command allowlist, stable JSON ordering, fail-closed identity, and correct distinction among compliant, misconfigured, and unknown. Optional `make integration` requires explicit environment confirmation and emits no object contents.

**Cleanup/cost.** Default lab is read-only and has no resource creation. If a dedicated test bucket is authorized separately, Terraform owns it; apply only after review, use tags/TTL, and destroy plus list-bucket verification. No public ACL/policy.

**Deliverables.** CLI, tests, account/region preflight, ADR, runbook, sanitized sample report. **Acceptance:** wrong identity prevents all API operations; offline tests work with no AWS credentials.

### Exemplar 3 — Container to repeatable delivery pipeline

**Scenario and constraints.** A two-person team must ship a tiny HTTP health service consistently. Build locally first; optional AWS deploy is out of scope. Image runs non-root, has no embedded secrets, and can be rolled back by immutable digest.

**Starter tree**
```text
levels/03-repeatable-delivery/exemplar/01-container-to-pipeline/
├── app/server.py app/requirements.txt
├── Dockerfile .dockerignore Makefile
├── tests/test_health.py scripts/build-test.sh scripts/promote.sh
├── .github/workflows/ci.yml release/manifest.schema.json
└── docs/adr/0001-immutable-artifacts.md docs/runbook.md REPORT.md
```

**Build tasks.** Implement `/healthz`; use a pinned base image tag/digest policy, non-root user, minimal build context, deterministic unit tests, image build, container smoke test, and digest-based release manifest. CI runs tests, image build, config checks, and secret scan. Promotion copies the digest into a release manifest; it must not rebuild.

**Failure drill.** Make health check fail and verify the deploy/smoke script refuses promotion. Modify a manifest digest and prove integrity validation fails. Restore source and confirm previous known-good digest remains usable.

**Validation and acceptance.** `make validate` runs unit tests, Dockerfile/pipeline static checks, build and smoke test when Docker is available; a no-Docker unit target is documented. Assertions: non-root user, health endpoint responds, no `.env`/credentials in build context, failed health prevents promotion, digest unchanged between environments.

**Cleanup/cost.** Local images/containers only; `make clean` stops/removes named lab container and image. Verify no running container remains. CI uses no paid cloud runner assumption; do not commit secrets.

**Deliverables.** App, Dockerfile, pipeline, manifest, tests, ADR, rollback runbook, report with image digest. **Acceptance:** clean checkout test/build path works and injected unhealthy image cannot be promoted.

### Exemplar 4 — SLO and failure drill with synthetic telemetry

**Scenario and constraints.** An API owner has synthetic request records and wants a user-facing availability/latency SLO, a useful alert, and a blameless incident report. No live monitoring deployment. Dataset is synthetic and time-bounded.

**Starter tree**
```text
levels/04-reliability-operations/exemplar/01-slo-failure-drill/
├── data/requests.csv data/alerts.json
├── src/slo.py src/timeline.py tests/test_slo.py tests/test_timeline.py
├── scripts/inject_failure.py Makefile
└── docs/slo.md docs/runbook.md docs/incident-report.md REPORT.md
```

**Build tasks.** Calculate request-based availability and p95 latency by fixed window, document denominator/exclusions, and calculate remaining error budget from an explicitly declared target in `docs/slo.md`. Generate a timeline from UTC event fixtures. Alert rule must identify customer symptom, owner, threshold rationale, and runbook. Do not claim SLO targets as industry standards; label them as exercise assumptions.

**Failure drill.** `python scripts/inject_failure.py --profile elevated-5xx --output /tmp/requests.csv` adds a deterministic burst; show SLI/error-budget change and produce a timeline. Then inject missing timestamps and verify they are counted/reported rather than silently discarded.

**Validation and acceptance.** `make validate` tests fixed expected counts, percentile convention, empty windows, timezone handling, malformed data, and deterministic output. Failure dataset must breach the exercise threshold; baseline must not. Report contains impact, timeline, detection, response, recovery, contributing factors, and owned follow-ups.

**Cleanup/cost.** Local fixtures only; remove temp outputs with `make clean`. No cloud service is created.

**Deliverables.** Code, tests, SLO definition, actionable runbook, incident report, ADR on measurement choices, sanitized graph/table in REPORT. **Acceptance:** baseline and injected-failure outputs are reproducible from a fresh checkout.

### Exemplar 5 — Least-privilege S3 data path

**Scenario and constraints.** A batch role reads and writes only its own synthetic prefix in an approved sandbox bucket. The lab teaches policy design, not production key administration. No public access; no real data; live apply requires reviewed sandbox account and budget controls.

**Starter tree**
```text
levels/05-cloud-security/exemplar/01-least-privilege-data-path/
├── infra/main.tf infra/variables.tf infra/outputs.tf
├── policies/batch-role.json policy-tests/matrix.yaml
├── scripts/check_policy.py tests/test_policy.py
└── docs/threat-model.md docs/adr/0001-data-access.md docs/runbook.md REPORT.md
```

**Build tasks.** Define a Terraform-managed private bucket with encryption and public-access blocks, plus a role policy scoped to the named bucket prefix and required actions only. Write an authorization matrix of allowed and denied actions/resources. Keep state remote-backend configuration as a documented example, not a hard-coded backend with learner credentials. Run static policy tests before any optional apply.

**Failure drill.** Inject `Resource: "*"` or an extra destructive action into a policy fixture. Validation must fail and show which matrix case violates the boundary. Restore the least-privilege policy. In optional sandbox mode, test denied access using a separate test principal only if explicitly authorized; never use production identities.

**Validation and acceptance.** `make validate` runs Terraform fmt/validate, plan/policy static checks, and Python matrix tests; no credentials required. Assert public access blocked, encryption configured, actions/resources constrained, all deny cases remain denied. Live mode requires preflight, reviewed plan, TTL, and explicit confirmation.

**Cleanup/cost.** Plan-only by default. If applied, use Terraform destroy, then independently query bucket/object versions and IAM attachments; empty versioned contents via a separately reviewed cleanup script before destroy. Record cleanup proof. Do not delete resources not created by this lab.

**Deliverables.** Terraform, policy matrix/tests, threat model, ADR, runbook, sanitized plan summary, cleanup evidence. **Acceptance:** wildcard injection fails before apply; no secrets/state are committed.

### Exemplar 6 — Resilient service architecture decision

**Scenario and constraints.** A fictional order API must tolerate one-zone impairment, meet an exercise-defined recovery objective, and operate with a small team. Workload and traffic figures are invented exercise inputs, clearly labeled; no live service is required.

**Starter tree**
```text
levels/06-architecture-decisions/exemplar/01-resilient-service-design/
├── requirements/brief.md requirements/assumptions.yaml
├── src/failure_model.py src/cost_model.py tests/
├── diagrams/architecture.mmd docs/adr/0001-topology.md
└── docs/review.md docs/runbook.md REPORT.md
```

**Build tasks.** Extract functional/NFR requirements and unresolved assumptions; compare at least two topologies; model dependency and failure-domain propagation; diagram identity, data, network, and observability flows; state RTO/RPO, recovery steps, and cost drivers. The model is a decision aid, not a reliability prediction. Include trigger conditions to revisit the ADR.

**Failure drill.** Mark one zone unavailable and then make the shared database dependency unavailable. Verify the model shows the first recovery path and the second as a hard limit; revise the design or explicitly accept the gap. Do not represent unmodeled services as highly available.

**Validation and acceptance.** `make validate` validates requirements/ADR metadata, diagram source presence, and deterministic failure-model fixtures. Tests assert declared objectives against exercise scenarios, identify single points of failure, and reject unknown dependency ownership. Review checklist includes tradeoffs and residual risks.

**Cleanup/cost.** No cloud deployment. If the learner adds an optional Terraform proof, it must be separately scoped, low-cost, plan-reviewed, tagged, time-limited, and destroyed with inventory verification.

**Deliverables.** Requirements, diagram source, executable model/tests, ADR, review notes, runbook, report. **Acceptance:** reviewer can change a stated assumption and see which recommendation or risk changes.

### Exemplar 7 — Guardrailed golden path

**Scenario and constraints.** A platform team wants a repeatable starter for small internal APIs. It must make safe defaults easy, permit documented exceptions, and keep validation local. No organization-wide policy or account vending apply.

**Starter tree**
```text
levels/07-platform-engineering/exemplar/01-guardrailed-golden-path/
├── templates/service/{app/,Dockerfile,Makefile,README.md}
├── modules/aws-service/ (Terraform module and examples)
├── policy/{policy.rego,tests/fixtures/}
├── scripts/new-service.sh scripts/validate-generated.sh
└── docs/adr/0001-golden-path.md docs/exception-process.md REPORT.md
```

**Build tasks.** `new-service.sh NAME` safely creates a starter from a template; validate input and refuse overwrite. Template includes health check, non-root container, tests, CI, runbook, ownership, and Terraform module interface. Policy tests check region, tags, encryption, and no public exposure. Exceptions require owner, rationale, compensating control, expiry, and review date.

**Failure drill.** Generate a service with an invalid name, attempt overwrite, introduce a public ingress fixture, and add an expired exception. Each must fail with actionable output before cloud calls.

**Validation and acceptance.** `make validate` generates a temp service, runs its tests, checks generated files, runs policy fixtures, verifies idempotent behavior, and cleans temp dirs. Passing and failing fixtures cover each rule. No cloud credential is needed.

**Cleanup/cost.** Local-only. Optional Terraform example is plan-only; any live test uses sandbox preflight, budget notification, TTL tags, and verified destroy. Never run generated infrastructure automatically as part of `new-service.sh`.

**Deliverables.** Template, module contract, policy and tests, exception workflow, ADR, developer README, report with generation transcript. **Acceptance:** one command creates a working safe starter; violations fail closed with a fix hint.

### Exemplar 8 — Provider capability and hybrid decision map

**Scenario and constraints.** A fictional enterprise is evaluating whether one new workload should stay on AWS, use GCP, use Azure, or connect to an on-prem dependency. Focus on identity, network, governance, logging, key management, data transfer, and exit strategy. No provider resources are created by default.

**Starter tree**
```text
levels/08-clouds-hybrid/exemplar/01-provider-capability-map/
├── data/capabilities.yaml data/assumptions.yaml
├── scripts/validate_matrix.py scripts/preflight-aws.sh scripts/preflight-gcp.sh scripts/preflight-azure.sh
├── infra/aws/ infra/gcp/ infra/azure/ (plan-only examples)
└── docs/mapping.md docs/adr/0001-provider-choice.md docs/runbook.md REPORT.md
```

**Build tasks.** Build a sourced capability matrix across AWS IAM/VPC/CloudTrail/KMS, GCP IAM/VPC/Audit Logs/Cloud KMS, and Azure Entra ID/VNet/Activity Logs/Key Vault, noting scope and non-equivalence rather than claiming universal parity. Use Terraform provider-specific examples and CLI preflights (`aws sts`, `gcloud auth list`/project, `az account show`) that fail closed on unexpected identity/project/subscription. Record verification date/source for mutable capabilities and treat CLI output as sensitive metadata.

**Failure drill.** Feed each preflight a wrong identity/project/subscription fixture and prove it blocks before Terraform apply. Inject a false “equivalent” matrix row; schema validation must require a caveat/evidence field. Simulate hybrid DNS forwarding failure in local fixtures and document the boundary.

**Validation and acceptance.** `make validate` checks YAML schema, required evidence fields, deterministic scoring inputs, and Terraform formatting/validation where providers are available. Offline mode requires no login. Each cloud's live plan is separate, opt-in, region-scoped, and never applied by the default target.

**Cleanup/cost.** Default no resources. Any optional proof uses one provider at a time, dedicated sandbox, budget alert, TTL, provider preflight, and exact Terraform destroy plus provider CLI inventory check. Avoid cross-cloud data transfer during testing.

**Deliverables.** Matrix with sources/date, Terraform examples, CLI preflight scripts, hybrid DNS diagram, ADR and report. **Acceptance:** recommendation names provider-specific dependencies, operational burden, portability limits, and conditions that would change the choice.

### Exemplar 9 — Design review and crisis response

**Scenario and constraints.** You are the architecture lead for a fictional checkout service. Reviewers dispute the proposed migration, then a simulated regional impairment occurs during cutover. There is no real customer or cloud system. Communicate for engineers, incident responders, and executives.

**Starter tree**
```text
levels/09-architecture-leadership/exemplar/01-review-and-crisis/
├── review/brief.md review/options.yaml review/agenda.md
├── incident/events.yaml scripts/tabletop.py scripts/check_actions.py
├── docs/adr/0001-cutover-strategy.md docs/incident-report.md
└── docs/executive-brief.md portfolio/evidence-index.md REPORT.md
```

**Build tasks.** Prepare a time-boxed review agenda, requirements/assumptions, options, decision criteria, dissent log, and go/no-go gates. Execute a terminal tabletop that advances synthetic events and requires role, decision, owner, next update, and evidence for each action. Produce a concise executive brief with impact, recommendation, tradeoff, uncertainty, and decision requested. Avoid invented customer impact or financial figures: use scenario data and label it.

**Failure drill.** Inject conflicting telemetry and a missed cutover readiness gate. Operator must pause or roll back according to declared criteria, state what is known/unknown, assign incident roles, and issue the next update. Then run the post-incident action linter against one vague corrective action and improve it to have owner, due date, verification, and priority.

**Validation and acceptance.** `make validate` checks required review/ADR/report fields, verifies every action has owner/verification, confirms a failed readiness gate blocks cutover, and checks evidence links resolve locally. Tabletop transcript must contain timeline, decision rationale, recovery signal, and customer-safe update. Executive brief stays within the exercise's one-page/word-limit rule.

**Cleanup/cost.** No cloud resources; delete generated temporary event transcripts if they contain sensitive practice notes. Public portfolio uses synthetic names only.

**Deliverables.** Review pack, ADR, tabletop transcript, incident report, executive brief, evidence index, mentoring reflection. **Acceptance:** a second person can run the tabletop and reach the same declared go/no-go outcome from the evidence.

## 7. Automated validation ideas for every lab

The catalog's per-lab validation column names the lab-specific check. Implement this common pipeline consistently:

```makefile
.PHONY: validate test lint policy integration clean
validate: lint test policy
lint:
	# formatters, static checks, shellcheck/ruff/terraform fmt as applicable

test:
	# offline deterministic tests; no credentials or cloud writes

policy:
	# IaC, IAM, secret, container, and documentation safety checks

integration:
	# opt-in only; requires sandbox preflight, explicit confirmation, and TTL

clean:
	# remove local artifacts created by this lab only
```

Validation layers: (1) formatting/type/syntax, (2) unit tests with fixed fixtures, (3) security/policy negative tests, (4) reproducibility from clean checkout, (5) optional sandbox integration with explicit identity/region/resource boundary, (6) post-cleanup inventory assertion. Use pinned tools, fixed timestamps where relevant, deterministic sorting, and clear nonzero exit codes. Never make a validator silently skip a failed security check. Tests should cover both compliant and deliberately noncompliant fixtures. Treat cloud integration checks as evidence, not a substitute for deterministic unit tests.

## 8. Cloud cost-control and teardown framework

**Before any cloud command that could write:**

- Confirm sandbox account/project/subscription and principal via provider CLI; compare against an explicit local allowlist. If any identity value is unexpected or absent, stop.
- Set an approved region/location allowlist. Keep default validation plan-only and offline.
- Review `terraform plan` and estimate resource classes, data transfer, storage retention, logs, and possible idle time. Pricing changes; use the provider's current pricing source for a real estimate and record date/assumptions.
- Apply resource tags/labels: `owner`, `bootcamp`, `lab`, `created_at`, `expires_at`, `environment`. Do not put secrets or personal data in tags.
- Set a short TTL and a budget notification where available. Alerts are not hard caps. Avoid managed services with minimum charges, NAT gateways, public IPs, high-volume logs, GPUs, and cross-region/cross-cloud transfer unless a lab explicitly justifies them.
- Use least-privilege, temporary credentials, no root/admin identity, and a clean `git status`. Never put credentials in Terraform variables committed to Git or shell history.

**Apply/operate:** capture plan, resource inventory, and start time. Use low-volume synthetic data, bounded test duration, and explicit resource names. Stop immediately if resources exceed the approved scope.

**Teardown:** run the lab-specific cleanup or `terraform destroy` from the same workspace; empty versioned object stores only when they are lab-owned and the procedure is documented. Then independently query inventory by lab tag/name and region. Check orphaned snapshots, logs, addresses, disks, versions, IAM bindings, and non-default networking resources as relevant. Save sanitized teardown evidence. `cleanup_verified=true` only after no lab-owned billable resources remain. If deletion fails, mark blocked, escalate through the sandbox owner, and do not claim cleanup success.

**Optional shared guard script contract:** `scripts/preflight.sh` validates explicit provider/profile/project/subscription, allowlisted region, required lab ID and expiry, and rejects production-like identities; `scripts/teardown-check.sh` compares pre/post inventory snapshots for remaining lab-owned resources. Keep provider-specific resource discovery explicit and reviewed—never assume one generic tag query finds every resource.

## 9. Hiring-manager portfolio artifacts

Publish a curated set, not raw account dumps:

- **Architecture case study:** anonymized problem, requirements, diagram source/render, options considered, ADR, failure analysis, accepted risks, and revisit triggers.
- **Working repository:** reproducible local setup, deterministic tests, pinned dependencies, CI, security checks, and clear cleanup path.
- **Security evidence:** threat model, least-privilege authorization matrix, negative tests, sanitized detection example, and remediation record.
- **Operations evidence:** SLI/SLO definition, alert/runbook pair, synthetic incident timeline, restore test, RTO/RPO assumptions, and post-incident actions.
- **Platform artifact:** golden-path template, policy-as-code fixtures, exception expiry workflow, developer documentation, and versioning plan.
- **Multi-cloud judgment:** dated, sourced capability matrix that distinguishes true equivalence from superficially similar service names; explain provider-specific choices and exit costs.
- **Leadership samples:** one-page executive brief, design review decision log, mentoring plan, and crisis tabletop with facts separated from hypotheses.
- **Evidence index:** link each claim to a test, command transcript, ADR, or report. Sanitize account IDs, internal hostnames, personal data, credentials, and non-public incident details. Never claim a live production deployment or measured outcome unless the artifact proves it.

A strong portfolio story answers: **What was the constraint? What did you choose and reject? How did you test security and failure behavior? What did it cost to operate? How do you know cleanup/recovery worked? What evidence would make you change the decision?**