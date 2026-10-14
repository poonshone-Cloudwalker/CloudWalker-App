/* ================================================================== Phase 2 content
 * Authored content for the Architecture Lab, Interview Arena, and Career Command.
 * Model answers are reference designs, not the only correct design: the rubric
 * scores the judgment calls an interviewer or design reviewer would look for.
 */
const LAB_SECTIONS = [
  ['requirements', 'Requirements and assumptions', 'Restate the functional and non-functional requirements. Put numbers on scale, availability, RPO/RTO, and budget. List assumptions you are making.'],
  ['architecture', 'High-level architecture', 'Name the main components and how a request or event flows through them.'],
  ['data', 'Data design', 'Where each kind of data lives, consistency needs, retention, and why those stores fit.'],
  ['security', 'Networking and security', 'Network boundaries, identity, encryption, compliance scope, and edge protection.'],
  ['reliability', 'Reliability and recovery', 'Failure domains, how the design meets the availability and RPO/RTO targets, and how you would test it.'],
  ['cost', 'Cost and operations', 'Main cost drivers, how you would control them, and what you would monitor (SLIs, alerts).'],
  ['tradeoffs', 'Trade-offs and risks', 'What you chose not to do, why, and what would make you revisit the decision.']
];

const LAB_SCENARIOS = [
{
  id: 'lab-01', title: 'Flash-sale checkout for a global retailer', cloud: 'Google Cloud', level: 'Senior', minutes: 45,
  tags: ['multi-region', 'consistency', 'PCI', 'scale'], exams: ['PCA', 'ACE'],
  brief: 'A retailer runs limited-edition drops that push checkout from 2,000 to 50,000 requests per second for about 20 minutes. Customers are in North America, Europe, and Asia. Last year the monolithic checkout oversold inventory by 4% and went down for 38 minutes in one region. Card payments go through a third-party processor, but the retailer still stores some cardholder data today.',
  requirements: ['Checkout p95 latency under 400 ms during drops', 'No overselling of limited inventory', 'Survive the loss of a full region with no lost orders; RTO under 5 minutes', 'Reduce PCI DSS scope', 'Engineering team of 12, little appetite for running databases'],
  rubric: [
    ['Identifies that inventory needs strongly consistent writes across regions and picks a store that provides it (e.g. Spanner multi-region) or explains a reservation pattern that prevents oversell', 15],
    ['Active-active multi-region serving behind a single global entry point (global external Application Load Balancer) with health-based failover', 12],
    ['Decouples non-critical work (email, fulfilment, analytics) from the checkout path using a queue or event bus (Pub/Sub)', 10],
    ['Shrinks PCI scope: tokenization through the processor, cardholder data isolated in a separate project/perimeter, nothing sensitive in logs', 12],
    ['Edge protection for a high-value target: Cloud Armor WAF rules, rate limiting, bot management', 8],
    ['Caching or precomputation for read-heavy catalog and product pages (CDN, Memorystore)', 8],
    ['Maps RPO 0 / RTO < 5 min to concrete mechanisms (synchronous replication, no manual failover steps) and proposes load and failover testing before the drop', 12],
    ['Cost reasoning: scale-to-demand compute, commitments only for the steady baseline, cost of multi-region database acknowledged', 8],
    ['Observability: SLOs on checkout success/latency with burn-rate alerting during drops', 8],
    ['States trade-offs explicitly (cost and complexity of multi-region writes vs. risk of oversell)', 7]
  ],
  model: {
    requirements: 'Peak 50k RPS for ~20 min, 25x baseline. Hard constraints: zero oversell, RPO 0 for orders, RTO < 5 min, p95 < 400 ms. Assume card data never needs to be stored once a processor token is used, and that the catalog changes slowly during a drop.',
    architecture: 'Global external Application Load Balancer with Cloud CDN for static and catalog content and Cloud Armor in front. Stateless checkout and cart services on Cloud Run (or GKE Autopilot) in three regions, min instances pre-warmed before each drop. Checkout writes an order and decrements inventory in one Spanner transaction, then publishes an OrderPlaced event to Pub/Sub. Downstream subscribers handle payment capture confirmation, email, fulfilment, and analytics.',
    data: 'Spanner multi-region instance for inventory, orders, and carts that must not be lost: external consistency removes the oversell race. Product catalog in Spanner or Firestore, cached in Memorystore and at the CDN edge. Events land in BigQuery for analytics. Card data replaced by processor tokens; no PAN stored.',
    security: 'Payment integration in a dedicated project inside a VPC Service Controls perimeter; only the payment service identity can call it. Cloud Armor preconfigured WAF rules, per-client rate limits, and reCAPTCHA-based bot challenges for the drop endpoint. Workload identity everywhere, no service account keys. Logs scrubbed with Sensitive Data Protection rules where needed.',
    reliability: 'Three regions serve traffic; the load balancer drains a failed region automatically. Spanner synchronous replication gives RPO 0. Pub/Sub retains events so downstream outages delay but never lose orders. Load test at 1.5x expected peak and run a region-failure game day before each major drop.',
    cost: 'Compute scales with demand; committed use discounts only for the steady baseline. The Spanner multi-region instance is the biggest fixed cost; use autoscaling for processing units between drops. SLOs: checkout success rate and p95 latency, with fast-burn alerts paging during a drop.',
    tradeoffs: 'Spanner multi-region is more expensive than a regional database with replicas, but asynchronous replicas reintroduce oversell and data-loss risk, which is the problem being solved. Rejected an inventory-reservation microservice on a cache because it adds a second source of truth. Revisit if drops stop being global.'
  },
  pitfalls: ['Choosing a regional database with read replicas and calling it multi-region', 'Putting email and fulfilment inside the synchronous checkout path', 'Ignoring PCI scope and treating it as an encryption problem only', 'No plan to pre-warm capacity before a known spike']
},
{
  id: 'lab-02', title: 'Hybrid connectivity for a regulated bank', cloud: 'Google Cloud', level: 'Senior', minutes: 40,
  tags: ['hybrid', 'Interconnect', 'DNS', 'exfiltration'], exams: ['PCNE', 'PCA'],
  brief: 'A bank with two on-premises data centers (New York and Chicago) is moving analytics and new customer apps to Google Cloud. Regulators require that data never crosses the public internet and that the bank can show it is protected against data exfiltration. On-premises apps must resolve cloud service names, and cloud workloads must resolve on-premises names.',
  requirements: ['Highest available SLA for hybrid connectivity', 'No public internet path for Google API traffic from on-premises', 'Prevent copying data to projects outside the bank, even with valid credentials', 'Bidirectional hybrid DNS', 'Central network team, many application teams'],
  rubric: [
    ['Designs the 99.99% Interconnect topology: four connections across two metros and both edge availability domains, Cloud Routers in two regions', 15],
    ['Sets global dynamic routing so every region can use every path', 8],
    ['Private access to Google APIs from on-premises (restricted VIP or Private Service Connect endpoint, advertised over Cloud Router, with DNS records)', 12],
    ['VPC Service Controls perimeter around data projects, using the restricted VIP so API access is enforced', 15],
    ['Hybrid DNS: inbound server policy for on-prem → cloud, outbound forwarding zones for cloud → on-prem, return route for 35.199.192.0/19', 12],
    ['Shared VPC (or hub-and-spoke with NCC) giving the central team control while app teams own projects', 10],
    ['Baseline guardrails via hierarchical firewall policies and organization policies', 8],
    ['Addresses encryption expectations (MACsec or HA VPN over Interconnect if IPsec is mandated)', 8],
    ['Explains how the design would be evidenced to auditors (logs, Connectivity Tests, perimeter dry-run results)', 6],
    ['States trade-offs and cost of the 99.99% topology', 6]
  ],
  model: {
    requirements: 'Target 99.99% hybrid availability, private-only API access, exfiltration controls auditable by regulators, bidirectional DNS. Assume bank owns routers in two colocation metros and that some workloads need IPsec by policy.',
    architecture: 'Dedicated Interconnect: two connections in a New York-area metro and two in a Chicago-area metro, each pair spanning both edge availability domains. VLAN attachments terminate on Cloud Routers in two regions in a Shared VPC host project; dynamic routing mode is global. Optional NCC hub if more VPCs or sites are added later.',
    data: 'Analytics data in BigQuery and Cloud Storage in projects inside a VPC Service Controls perimeter. Access levels allow requests from the bank\'s on-premises ranges and approved identities only.',
    security: 'On-premises DNS resolves *.googleapis.com to restricted.googleapis.com (199.36.153.4/30), advertised via Cloud Router custom advertisements, so API calls are forced through the perimeter. Hierarchical firewall policy denies ingress from the internet by default. Org policies block external IPs and service account keys. MACsec on Dedicated Interconnect if link encryption is required; HA VPN over Interconnect where IPsec is mandated.',
    reliability: 'Four connections in two metros survive the loss of a link, an edge availability domain, or an entire metro. BFD on BGP sessions for fast failover. Connectivity Tests and Network Intelligence Center used to verify paths after changes.',
    cost: 'Main costs are port fees and VLAN attachments; egress over Interconnect is cheaper than internet egress and offsets part of it. Monitor attachment utilization against capacity and BGP session state.',
    tradeoffs: 'The 99.99% topology doubles circuit cost versus 99.9%, justified by regulatory exposure. VPC-SC adds friction for developers (ingress/egress rules needed for tools); mitigate by rolling out in dry-run first and documenting exceptions.'
  },
  pitfalls: ['Four connections in one metro (only meets 99.9%)', 'Using private.googleapis.com and assuming it enforces VPC Service Controls', 'Forgetting the DNS forwarding return route', 'Leaving routing mode regional']
},
{
  id: 'lab-03', title: 'IoT telemetry pipeline on a startup budget', cloud: 'AWS', level: 'Mid', minutes: 35,
  tags: ['streaming', 'serverless', 'cost', 'analytics'], exams: ['SAA-C03'],
  brief: 'A smart-thermostat startup has 200,000 devices that each send a reading every 30 seconds. Customers need an alert within 60 seconds if a home drops below 5°C. The data science team wants two years of history for analysis. The team is four engineers and the monthly cloud budget is tight.',
  requirements: ['~6,700 messages per second steady, bursts to 3x', 'Alert latency under 60 seconds', 'Two years of queryable history at low cost', 'Latest reading per device available to the mobile app', 'Minimal operational overhead'],
  rubric: [
    ['Uses a managed device ingestion or streaming entry point (AWS IoT Core and/or Kinesis Data Streams) sized for the stated rate', 12],
    ['Separates the real-time alert path from the bulk storage path', 12],
    ['Stores history cheaply in S3 in a columnar, partitioned format (Firehose with Parquet conversion) and queries it with Athena/Glue', 14],
    ['Keeps latest state per device in a key-value store (DynamoDB) for the app', 10],
    ['Alerting via event rules or stream processing with deduplication and notification fan-out (SNS)', 10],
    ['Handles failures: DLQs, retries, idempotent processing, poison messages', 10],
    ['Lifecycle policies to colder storage tiers for older data', 8],
    ['Does the arithmetic: message rate, data volume per month, and the main cost driver', 12],
    ['Least-privilege device identity (per-device certificates) and encryption', 6],
    ['States trade-offs (e.g. Lambda vs. Flink for windowed logic)', 6]
  ],
  model: {
    requirements: '200k devices / 30 s ≈ 6,700 msg/s, ~580M messages/day. At ~200 bytes each that is ~115 GB/day raw, ~40 TB over two years before compression. Alert SLA 60 s. Budget pressure means serverless and columnar storage.',
    architecture: 'Devices publish over MQTT to AWS IoT Core with per-device X.509 certificates. An IoT rule writes to Kinesis Data Streams. Two consumers: a Lambda (or Managed Service for Apache Flink for windowed logic) that evaluates alert conditions and updates latest state, and Amazon Data Firehose that buffers, converts to Parquet, and writes to S3 partitioned by date and region.',
    data: 'S3 data lake (Parquet, partitioned by dt/region) catalogued by Glue, queried with Athena. DynamoDB table keyed by deviceId holds the latest reading and alert state, with TTL on transient items.',
    security: 'Per-device certificates and IoT policies scoped to the device\'s own topic. KMS encryption on Kinesis, S3, and DynamoDB. Bucket policies deny non-TLS access; Block Public Access on.',
    reliability: 'Kinesis retains data for replay. Lambda event source mapping with bisect-on-error and an on-failure destination (SQS DLQ). Alert writes are idempotent (conditional writes on deviceId + window). Multi-AZ by default across managed services.',
    cost: 'Biggest drivers: IoT Core messaging and Kinesis shards. Batch readings on device where possible (e.g. send every 30 s but aggregate fields). Parquet + compression cuts storage and Athena scan costs by ~10x. S3 lifecycle to Standard-IA after 30 days and Glacier Instant Retrieval after 180 days.',
    tradeoffs: 'Lambda keeps ops minimal but makes windowed logic awkward; move to Flink if alerts need multi-reading windows. Kinesis on-demand mode avoids shard planning at the cost of a higher per-GB price; switch to provisioned once traffic is predictable.'
  },
  pitfalls: ['Writing every reading to DynamoDB as history', 'Storing raw JSON in S3 and scanning it all with Athena', 'One pipeline for both alerts and archive', 'No DLQ or replay story']
},
{
  id: 'lab-04', title: 'Enterprise landing zone for 60 teams', cloud: 'Azure', level: 'Senior', minutes: 45,
  tags: ['governance', 'identity', 'hub-spoke', 'policy'], exams: ['AZ-305'],
  brief: 'A manufacturer is consolidating 60 application teams onto Azure after years of shadow IT subscriptions. Security wants consistent guardrails, central egress inspection, and no standing admin access. Finance wants costs per business unit. Some workloads are internet-facing; most are internal.',
  requirements: ['Consistent policy across all current and future subscriptions', 'Central network control and egress inspection', 'Just-in-time privileged access', 'Central logging with 2-year retention', 'Self-service subscription creation for teams'],
  rubric: [
    ['Management group hierarchy aligned to the Azure landing zone model (platform vs. landing zones, Corp vs. Online, sandbox)', 12],
    ['Azure Policy initiatives at management group scope for locations, tagging, diagnostics, and security baselines, with exemptions process', 12],
    ['Hub-and-spoke or Virtual WAN with Azure Firewall in the hub and UDRs/routing intent for inspection', 12],
    ['Identity: Entra ID groups, PIM for eligible admin roles, Conditional Access, break-glass accounts', 12],
    ['Subscription vending (automated, IaC-based) with baseline networking, policy, budgets, and tags', 10],
    ['Central Log Analytics workspace(s) with diagnostic settings enforced by policy and retention set to requirement', 10],
    ['Cost allocation via tags and management group/subscription boundaries, budgets with alerts', 8],
    ['Private endpoints and private DNS zones centralized, with policy to register records', 8],
    ['Defender for Cloud for posture and regulatory compliance tracking', 8],
    ['Explains trade-offs (central control vs. team autonomy, cost of central firewall)', 8]
  ],
  model: {
    requirements: '60 teams now, more later; guardrails must apply to new subscriptions automatically. Admin access just-in-time. Logs retained 2 years. Teams self-serve subscriptions within guardrails.',
    architecture: 'Management groups: Root → Contoso → Platform (Identity, Management, Connectivity) and Landing zones (Corp, Online), plus Sandbox and Decommissioned. Connectivity subscription hosts a hub VNet (or Virtual WAN hub) with Azure Firewall Premium, VPN/ExpressRoute gateways, and DNS Private Resolver. Spokes peer to the hub; UDRs send 0.0.0.0/0 and spoke-to-spoke traffic to the firewall.',
    data: 'Central Log Analytics workspace in the Management subscription; diagnostic settings deployed by DeployIfNotExists policies. Table retention configured for 2 years with lower-cost plans for verbose tables.',
    security: 'Entra ID groups mapped to roles; PIM eligible assignments with approval for Owner and Contributor at management group scope; Conditional Access requiring MFA and compliant devices for admin portals; two monitored break-glass accounts. Policy denies public IPs in Corp, enforces private endpoints for PaaS, and requires tags. Defender for Cloud CSPM with regulatory initiative assigned.',
    reliability: 'Zone-redundant firewall and gateways in the hub. Policy-driven configuration means a lost spoke can be redeployed from IaC. Platform changes go through a pipeline with what-if checks.',
    cost: 'Subscription vending pipeline creates subscriptions with budgets, cost-center tags, and owner tags. Cost Management views by management group and tag. Firewall is a fixed cost; justify centrally rather than per team.',
    tradeoffs: 'Central firewall adds latency and a shared dependency; acceptable for egress and cross-spoke traffic, but high-throughput internal flows may get exceptions. Strict Corp policies slow some teams; Sandbox gives them room to experiment.'
  },
  pitfalls: ['Mirroring the org chart in management groups', 'Assigning policy per subscription instead of at management group scope', 'Standing Owner rights for platform engineers', 'No automated subscription vending, so teams bypass the process']
},
{
  id: 'lab-05', title: '90-day data center exit', cloud: 'Multi-cloud', level: 'Mid', minutes: 35,
  tags: ['migration', 'VMware', 'databases', 'cutover'], exams: ['PCA', 'AZ-305', 'SAA-C03'],
  brief: 'A logistics company must leave its colocation facility in 90 days when the lease ends. It runs 350 VMware VMs, 12 SQL Server databases (largest 4 TB), and a 200 TB file share. The operations team knows VMware well and has no cloud experience. Leadership wants to modernize eventually but cannot risk the deadline.',
  requirements: ['Out of the facility in 90 days', 'Order system downtime under 1 hour at cutover', 'Rollback option for the first week after cutover', 'Team can operate the result on day one', 'Path to modernization afterward'],
  rubric: [
    ['Chooses rehost (or VMware-in-cloud) for the bulk because of the deadline, and explains why refactoring now is too risky', 15],
    ['Runs discovery and dependency mapping to plan waves of tightly coupled systems together', 12],
    ['Uses continuous replication for databases (DMS or native replication) to keep cutover under 1 hour', 12],
    ['Moves the 200 TB share with a method that fits bandwidth and changes (offline device + incremental sync, or online transfer if bandwidth allows) with the math shown', 10],
    ['Defines a rollback plan (reverse replication or keep source writable) with clear go/no-go criteria', 12],
    ['Builds a landing zone first (networking, identity, logging) so waves land consistently', 10],
    ['Test migrations in isolated networks before each cutover', 8],
    ['Post-migration: rightsizing before commitments, modernization backlog', 8],
    ['Addresses skills: training and runbooks for a VMware team', 6],
    ['States trade-offs (VMware service cost vs. native VMs; speed vs. optimization)', 7]
  ],
  model: {
    requirements: 'Deadline-driven. 350 VMs, 12 SQL Server DBs, 200 TB files. Order system RTO at cutover < 1 h, rollback for 1 week. Assume 1 Gbps link to start (≈ 10 TB/day at best).',
    architecture: 'Landing zone first: hub network with private connectivity to the facility, identity federation, central logging. Bulk VMs move to a managed VMware service (Google Cloud VMware Engine, Azure VMware Solution, or VMware Cloud on AWS) using HCX for fast, low-change migration, or to native VMs with Migrate to VMs / Azure Migrate / AWS MGN where the team is comfortable. Waves grouped by dependency maps from discovery.',
    data: 'SQL Server databases replicate continuously (Database Migration Service or Always On to a cloud replica) so cutover is a short promotion. 200 TB share: 200 TB at ~10 TB/day is ~20 days online under perfect conditions; ship an offline transfer device for the bulk and use an agent-based sync for the delta.',
    security: 'Private connectivity during migration; no public exposure of replication endpoints. Same AD/identity extended to the cloud. Baseline policies applied by the landing zone.',
    reliability: 'Each wave gets a test migration into an isolated network, then a scheduled cutover with go/no-go criteria. Reverse replication from cloud to on-premises keeps rollback possible for one week; source VMs stay powered off, not deleted.',
    cost: 'Expect a temporary double-run cost. After 60 days of utilization data, rightsize and then buy commitments for the steady state. VMware service is a stepping stone; plan exit to native services where it pays.',
    tradeoffs: 'Rehosting carries technical debt and initial overspend, accepted to hit the date. Refactoring the order system is deferred to a modernization backlog with its own business case.'
  },
  pitfalls: ['Proposing a microservices rewrite under a 90-day deadline', 'Moving 200 TB online without doing the bandwidth math', 'No rollback plan', 'Buying three-year commitments based on on-premises VM sizes']
},
{
  id: 'lab-06', title: 'Multi-tenant SaaS isolation', cloud: 'AWS', level: 'Senior', minutes: 40,
  tags: ['multi-tenancy', 'isolation', 'noisy-neighbor', 'cost-attribution'], exams: ['SAA-C03'],
  brief: 'A B2B analytics SaaS has 400 small customers and 6 large enterprise customers. Enterprises demand stronger isolation and their own encryption keys. Small customers share infrastructure today, and one heavy customer recently slowed everyone down. Finance cannot tell which customers are profitable.',
  requirements: ['Tiered isolation: shared for small, dedicated for enterprise', 'Per-tenant encryption keys for enterprise', 'Prevent noisy neighbors', 'Per-tenant cost visibility', 'Onboard a new small tenant in minutes'],
  rubric: [
    ['Defines pool vs. silo tiers and what each tier gets (e.g. shared compute/DB for pool; dedicated account or stack for silo)', 15],
    ['Tenant context propagated securely (token claims) and enforced at the data layer (row-level filters, partition keys, or per-tenant schemas)', 12],
    ['Per-tenant KMS keys for enterprise tenants with key policies; crypto-shredding on offboarding', 10],
    ['Noisy-neighbor controls: per-tenant throttling/quotas at the API layer and fair-share queues', 12],
    ['Account-per-tenant (or stack-per-tenant) for silo tenants via automated vending', 10],
    ['Cost attribution: tagging, per-tenant metering of usage, CUR analysis', 10],
    ['Automated onboarding pipeline for both tiers', 8],
    ['Observability per tenant (metrics with tenant dimension, SLOs per tier)', 8],
    ['Security testing of isolation (cross-tenant access tests)', 7],
    ['States trade-offs (silo cost vs. isolation; operational overhead of many accounts)', 8]
  ],
  model: {
    requirements: '406 tenants, two tiers. Enterprise: dedicated resources and customer-specific keys. Pool: cheap, fast onboarding. Fairness and unit economics are explicit goals.',
    architecture: 'Control plane (tenant registry, onboarding, billing metering) shared. Pool tier: API Gateway → services on ECS Fargate → Aurora PostgreSQL with tenant_id on every table and row-level security, plus a shared S3 bucket with tenant prefixes enforced by IAM session tags (ABAC). Silo tier: a dedicated AWS account per enterprise tenant created by an account-vending pipeline, running the same stack from IaC.',
    data: 'Pool tenants share Aurora with RLS; large analytics jobs run through per-tenant SQS queues so one tenant can\'t monopolize workers. Silo tenants get their own Aurora cluster and buckets encrypted with a per-tenant customer managed KMS key.',
    security: 'JWT claims carry tenant_id; services assume a role with session tags so IAM policies restrict access to that tenant\'s prefix/rows. Enterprise keys can be controlled by the customer through key policies; deleting the key crypto-shreds data on exit. Automated tests attempt cross-tenant reads every release.',
    reliability: 'Per-tenant usage plans and throttles on API Gateway; per-tenant queues with worker concurrency limits. Silo tenants isolate blast radius. SLOs per tier.',
    cost: 'Every resource tagged with tenant and tier; pool usage metered per tenant (requests, compute seconds, storage) and joined with CUR in Athena to compute per-tenant margin.',
    tradeoffs: 'Silo accounts multiply operational overhead; only justified for tenants whose contracts pay for it. Row-level security is cheaper but needs rigorous testing because a bug exposes data.'
  },
  pitfalls: ['One giant shared database with tenant_id but no enforcement below the app', 'No throttling per tenant', 'Silo for everyone (unaffordable) or pool for everyone (fails enterprise deals)', 'No metering, so unit economics stay invisible']
},
{
  id: 'lab-07', title: 'Disaster recovery for a tier-1 payments API', cloud: 'AWS', level: 'Senior', minutes: 40,
  tags: ['DR', 'RPO', 'RTO', 'game-days'], exams: ['SAA-C03'],
  brief: 'A payments company processes card authorizations through an API in us-east-1. The regulator now requires documented and tested recovery from a full regional outage. Targets: RPO under 1 second, RTO under 5 minutes. The CFO wants to know the cost difference between DR options.',
  requirements: ['RPO < 1 s, RTO < 5 min for regional loss', 'Recovery must be tested quarterly with evidence', 'No duplicate authorizations after failover', 'Cost comparison of options'],
  rubric: [
    ['Compares DR strategies (backup/restore, pilot light, warm standby, multi-site) against RPO/RTO and rules out the ones that cannot meet them', 15],
    ['Database replication that meets RPO < 1 s (Aurora Global Database or DynamoDB global tables) and explains failover mechanics', 15],
    ['Traffic failover that does not depend on slow DNS or manual steps (Route 53 ARC routing controls, Global Accelerator, health checks)', 12],
    ['Idempotency keys to prevent duplicate authorizations during retries and failover', 12],
    ['Infrastructure in the DR region kept in sync through IaC and pipelines', 8],
    ['Quarterly game days with measured RTO/RPO and stored evidence', 10],
    ['Cost comparison with numbers or ratios for warm standby vs. active-active', 10],
    ['Handles dependencies (secrets, KMS keys, third-party endpoints) in the DR region', 8],
    ['States trade-offs and residual risks', 10]
  ],
  model: {
    requirements: 'RPO < 1 s and RTO < 5 min rule out backup/restore and pilot light. Choose between warm standby and active-active. Quarterly evidence required.',
    architecture: 'API on ECS Fargate (or Lambda) in us-east-1 and us-west-2. Warm standby: secondary region runs at ~20% capacity and scales on failover. Route 53 Application Recovery Controller routing controls flip traffic in seconds; health checks feed alarms, but failover is a deliberate, rehearsed switch.',
    data: 'Aurora Global Database (typical lag < 1 s) with managed cross-region failover; or DynamoDB global tables if the data model fits. Authorization requests carry an idempotency key stored with the result so retries return the original outcome.',
    security: 'Multi-Region KMS keys and replicated Secrets Manager secrets so the DR region can decrypt and connect without manual steps. Same IAM roles deployed by IaC.',
    reliability: 'Runbook automated in Systems Manager: freeze writes, promote Aurora secondary, flip ARC routing control, scale DR services. Quarterly game day in production-like conditions; capture timestamps as evidence of achieved RTO/RPO.',
    cost: 'Warm standby ≈ 1.2–1.4x single-region cost; active-active ≈ 2x plus higher engineering complexity for conflict-free writes. Recommend warm standby unless business requires zero-downtime regional maintenance.',
    tradeoffs: 'Aurora Global Database failover is fast but not zero-RPO; if the regulator demands RPO = 0, a different architecture (synchronous multi-region store) is needed at higher latency. Manual approval step adds a minute but prevents false failovers.'
  },
  pitfalls: ['Choosing pilot light for a 5-minute RTO', 'Relying on DNS TTL alone for failover', 'Forgetting KMS keys and secrets in the DR region', 'No idempotency, causing double charges']
},
{
  id: 'lab-08', title: 'Analytics and ML platform for a mid-size insurer', cloud: 'Google Cloud', level: 'Mid', minutes: 40,
  tags: ['data-platform', 'governance', 'ML', 'BI'], exams: ['PCA', 'CDL'],
  brief: 'An insurer has claims data in an on-premises SQL Server, policy data in a SaaS CRM, and call-center transcripts. Analysts wait days for reports. Leadership wants self-service dashboards, a claims-fraud model, and generative AI summaries of calls, while protecting customer PII.',
  requirements: ['Daily and near-real-time data ingestion', 'Self-service BI with consistent metrics', 'Fraud model in production with monitoring', 'PII protected, with column-level access control', 'Cost predictability'],
  rubric: [
    ['Central analytical store (BigQuery) with layered datasets (raw, curated, serving)', 12],
    ['Ingestion matched to sources: CDC/replication for SQL Server, connectors for SaaS, streaming where needed', 12],
    ['Governance: catalog, policy tags / column-level security, row-level security, data quality checks', 14],
    ['PII handling: discovery and de-identification of transcripts before broad use (Sensitive Data Protection)', 10],
    ['Semantic layer / BI for consistent metrics (Looker)', 8],
    ['ML lifecycle: training, deployment, monitoring for drift (Agent Platform / BigQuery ML) with explainability for fraud decisions', 12],
    ['Generative AI summaries grounded on transcripts, with safety controls', 8],
    ['Cost predictability (editions/reservations, partitioning, clustering)', 10],
    ['States trade-offs (build vs. buy, batch vs. streaming)', 7],
    ['Mentions responsible AI concerns for fraud decisions affecting customers', 7]
  ],
  model: {
    requirements: 'Three sources, daily + near-real-time. Self-service BI, production fraud model, call summaries. PII controls and predictable spend.',
    architecture: 'Datastream replicates SQL Server changes into BigQuery; CRM data via a managed connector or scheduled transfer; transcripts land in Cloud Storage and are processed by Dataflow. BigQuery datasets: raw → curated (dbt or Dataform) → marts. Looker provides a governed semantic layer.',
    data: 'Partitioned and clustered tables; Dataplex for catalog and data quality rules. Fraud features computed in BigQuery; model trained with BigQuery ML or on Agent Platform and served from an endpoint with model monitoring.',
    security: 'Policy tags on PII columns with masked views for analysts; row-level security by line of business. Sensitive Data Protection de-identifies transcripts before summarization. VPC Service Controls around the data projects.',
    reliability: 'Pipelines idempotent with retries; freshness SLOs per dataset with alerts. Model performance and drift monitored; fallback to rules if the model is unhealthy.',
    cost: 'BigQuery editions with a baseline reservation and autoscaling for predictability; partition pruning enforced. Summaries generated once per call and stored, not on every view.',
    tradeoffs: 'Streaming everything raises cost and complexity; only claims status needs near-real-time. Fraud model outputs go to human reviewers rather than auto-denials until explainability and fairness are validated.'
  },
  pitfalls: ['Dumping all data into one dataset with no layers', 'Granting analysts raw PII', 'No model monitoring or human review for fraud decisions', 'On-demand pricing with no guardrails for a large analyst population']
},
{
  id: 'lab-09', title: 'Zero-trust access for contractors', cloud: 'Multi-cloud', level: 'Mid', minutes: 30,
  tags: ['zero-trust', 'identity', 'least-privilege', 'audit'], exams: ['PCA', 'AZ-305', 'SAA-C03'],
  brief: 'A software company employs 300 contractors on personal laptops. Today they connect over a shared VPN that exposes the whole internal network. Last quarter a contractor account was phished and used to browse internal admin tools. The company runs internal web apps on Google Cloud and Azure, and some SSH-managed servers on AWS.',
  requirements: ['No network-level access for contractors', 'Access based on identity, device posture, and context', 'Admin access only just-in-time with approval', 'Full audit trail', 'Fast offboarding'],
  rubric: [
    ['Replaces VPN with identity-aware access to each application (IAP, Entra application proxy / Conditional Access, AWS Verified Access or Session Manager)', 15],
    ['Strong, phishing-resistant MFA and Conditional Access / context-aware access levels including device posture', 12],
    ['Least privilege: per-app access groups, no broad network reach', 12],
    ['Just-in-time privileged access with approval (PIM, PAM, temporary elevation)', 12],
    ['Server access without inbound SSH (Session Manager / IAP TCP forwarding) with session logging', 10],
    ['Central identity with lifecycle automation (joiner/mover/leaver) and fast offboarding', 10],
    ['Centralized audit logs and alerts on anomalous access', 10],
    ['Plan for unmanaged devices (browser isolation, limited access level) vs. managed', 8],
    ['States trade-offs and rollout plan', 11]
  ],
  model: {
    requirements: 'Replace network trust with per-request identity and context. Contractors use unmanaged devices. JIT admin. Auditable. Offboarding within minutes.',
    architecture: 'Entra ID (or Cloud Identity) as the single IdP with contractors in their own groups. Google Cloud apps behind Identity-Aware Proxy with access levels; Azure apps behind Entra application proxy with Conditional Access; AWS servers reached through Systems Manager Session Manager with no inbound ports. VPN decommissioned for contractors.',
    data: 'Sensitive apps require compliant or managed device posture; unmanaged contractor devices get access only to low-risk apps, optionally through a managed browser or virtual desktop.',
    security: 'Phishing-resistant MFA (FIDO2 keys) for contractors with admin-capable roles. PIM/PAM eligible assignments with approval and time limits. Per-app groups; no wildcard access.',
    reliability: 'Break-glass accounts monitored. Access policies managed as code with review.',
    cost: 'Identity-aware proxies are low cost compared with VPN appliances and incident response. Licensing for posture-based Conditional Access is the main new cost.',
    tradeoffs: 'Device posture checks may block some contractors; offer a managed VDI fallback. Migrating every app takes time, so start with admin tools (highest risk) and finish with low-risk apps.'
  },
  pitfalls: ['Keeping the VPN and adding MFA only', 'Granting admin roles permanently', 'Ignoring unmanaged devices', 'No session logging for server access']
},
{
  id: 'lab-10', title: 'Cut the cloud bill 30% without breaking SLOs', cloud: 'AWS', level: 'Mid', minutes: 30,
  tags: ['FinOps', 'rightsizing', 'commitments', 'storage'], exams: ['SAA-C03', 'CDL'],
  brief: 'A media company\'s AWS bill grew from $180k to $310k per month in a year. The CFO wants a 30% reduction within two quarters. Engineering fears cuts will hurt reliability. Nobody can say which product line drives the growth.',
  requirements: ['30% reduction in two quarters', 'No SLO regressions', 'Cost visibility by product line', 'Lasting governance, not a one-time cleanup'],
  rubric: [
    ['Starts with visibility: cost allocation tags, CUR/Data Exports, per-product-line breakdown', 12],
    ['Quick wins: idle and orphaned resources, dev/test schedules, gp2→gp3, old snapshots', 10],
    ['Rightsizing from utilization data (Compute Optimizer) before buying commitments', 12],
    ['Commitment strategy (Savings Plans/RIs) sized to the stable baseline after rightsizing', 12],
    ['Spot for fault-tolerant workloads with diversification', 8],
    ['Storage tiering and lifecycle (Intelligent-Tiering, Glacier classes) for large media assets', 10],
    ['Data transfer and architecture fixes (CloudFront, VPC endpoints vs. NAT, same-region placement)', 10],
    ['Guards SLOs: changes behind monitoring, canaries, and rollback', 8],
    ['Governance: budgets with alerts/actions, ownership, monthly reviews (people + process + tooling)', 10],
    ['Quantifies expected savings per lever and sequences them', 8]
  ],
  model: {
    requirements: '$310k/month → ~$217k. Two quarters. SLOs must hold. Build lasting FinOps practice.',
    architecture: 'Month 1: enable cost allocation tags and Data Exports (CUR 2.0) into Athena + QuickSight dashboards by product line and environment. Assign an owner per product line. Quick wins: delete unattached EBS and old snapshots, schedule non-prod (~65% fewer hours), migrate gp2→gp3, remove idle load balancers.',
    data: 'Media assets: S3 Intelligent-Tiering for unpredictable access, lifecycle to Glacier Instant Retrieval for back catalog. Delete incomplete multipart uploads. Serve through CloudFront to reduce origin egress.',
    security: 'Cost controls never weaken security baselines; use SCPs to prevent untagged resources rather than deleting resources blindly.',
    reliability: 'Rightsizing and Spot rollouts go through canaries with SLO dashboards; rollback criteria defined. Spot only for stateless encoders and batch jobs, diversified across instance types.',
    cost: 'Typical sequencing and savings: quick wins 8–12%, rightsizing 8–10%, Savings Plans on the remaining baseline 10–15% of compute, storage tiering and CDN 5–8%. Combined, 30% is realistic. Budgets with alerts per product line; monthly FinOps review.',
    tradeoffs: 'Buying commitments first would lock in waste; rightsizing first delays savings by a month but compounds them. Aggressive Spot use can hurt encoding SLAs; keep an On-Demand base.'
  },
  pitfalls: ['Buying three-year commitments before rightsizing', 'Cutting without visibility, so savings can\'t be attributed', 'Ignoring data transfer and NAT costs', 'One-time cleanup with no ownership afterward']
}
];

const COMPETENCIES = [
  ['influence', 'Influence without authority'], ['ambiguity', 'Ambiguity and scoping'], ['conflict', 'Disagreement and conflict'], ['failure', 'Failure and learning'],
  ['customer', 'Customer and business focus'], ['technical', 'Technical depth'], ['delivery', 'Delivery under pressure'], ['communication', 'Communicating to executives'],
  ['cost', 'Cost ownership'], ['security', 'Security and risk judgment'], ['career-change', 'Learning fast / career change'], ['mentoring', 'Mentoring and raising the bar']
];

const INTERVIEW_QUESTIONS = [
  // Behavioral
  { id: 'iq-01', cat: 'Behavioral', comp: 'influence', prompt: 'Tell me about a time you convinced a team to adopt a technical approach they initially resisted.', signals: ['Clear stakes and who resisted', 'Used data, prototypes, or trade-off framing rather than authority', 'Listened and adjusted the proposal', 'Measurable outcome'], followups: ['What would you do differently?', 'What if they had still said no?'] },
  { id: 'iq-02', cat: 'Behavioral', comp: 'failure', prompt: 'Describe a decision you made that turned out to be wrong. How did you find out and what did you change?', signals: ['Owns the mistake without blaming', 'Explains how it was detected', 'Concrete correction', 'Lasting change in process or judgment'], followups: ['How do you detect wrong decisions earlier now?'] },
  { id: 'iq-03', cat: 'Behavioral', comp: 'ambiguity', prompt: 'Tell me about a project where the requirements were unclear. How did you decide what to build?', signals: ['Identified stakeholders and real goals', 'Made assumptions explicit', 'Delivered incrementally to reduce risk', 'Outcome tied to the business goal'], followups: ['Which assumption was riskiest?'] },
  { id: 'iq-04', cat: 'Behavioral', comp: 'conflict', prompt: 'Tell me about a time you disagreed with a senior stakeholder on a technical or design decision.', signals: ['Respectful disagreement with evidence', 'Understood their constraints', 'Reached a decision and committed', 'Relationship intact or improved'], followups: ['How did you document the decision?'] },
  { id: 'iq-05', cat: 'Behavioral', comp: 'communication', prompt: 'Explain a complex technical topic you had to present to executives. How did you adapt it?', signals: ['Started from business impact', 'Removed jargon', 'Gave options with costs and risks', 'Executives could make a decision'], followups: ['What questions did they ask?'] },
  { id: 'iq-06', cat: 'Behavioral', comp: 'career-change', prompt: 'You are coming from a different field. Why cloud architecture, and what from your past makes you effective at it?', signals: ['Specific, credible motivation', 'Transferable skills mapped to architect work (stakeholders, systems thinking, risk)', 'Evidence of fast learning: certifications, labs, portfolio', 'Honest about gaps and plan to close them'], followups: ['What is the hardest thing you have learned so far?'] },
  { id: 'iq-07', cat: 'Behavioral', comp: 'delivery', prompt: 'Tell me about a time you delivered something important under a tight deadline. What did you cut?', signals: ['Explicit prioritization', 'Protected quality where it mattered', 'Communicated trade-offs early', 'Delivered and followed up on deferred items'], followups: ['How did you handle the technical debt afterward?'] },
  { id: 'iq-08', cat: 'Behavioral', comp: 'customer', prompt: 'Describe a time you changed a technical plan because of what you learned about the customer or business.', signals: ['Actually talked to users/business', 'Changed course based on evidence', 'Outcome measured in business terms'], followups: ['How do you stay close to customers as an architect?'] },
  // Architecture fundamentals
  { id: 'iq-09', cat: 'Fundamentals', comp: 'technical', prompt: 'How do you choose between a relational database and a NoSQL database for a new service?', signals: ['Starts from access patterns and consistency needs', 'Discusses scale, schema evolution, transactions', 'Mentions operational and team factors', 'Names concrete services and when each fits'], followups: ['When would you use both?'] },
  { id: 'iq-10', cat: 'Fundamentals', comp: 'technical', prompt: 'Explain RPO and RTO and how they drive a DR design.', signals: ['Correct definitions', 'Maps targets to strategies (backup, pilot light, warm standby, active-active)', 'Mentions cost curve', 'Mentions testing recovery'], followups: ['How would you prove the RTO to an auditor?'] },
  { id: 'iq-11', cat: 'Fundamentals', comp: 'technical', prompt: 'What does "design for failure" mean in practice?', signals: ['Redundancy across failure domains', 'Timeouts, retries with backoff, idempotency', 'Graceful degradation and circuit breakers', 'Testing failures (chaos, game days)'], followups: ['Give an example from a system you know.'] },
  { id: 'iq-12', cat: 'Fundamentals', comp: 'technical', prompt: 'When would you choose asynchronous messaging over synchronous APIs between services?', signals: ['Decoupling and load leveling', 'Tolerating downstream outages', 'Trade-offs: eventual consistency, ordering, debugging', 'Idempotent consumers and DLQs'], followups: ['How do you keep the user experience good with async?'] },
  { id: 'iq-13', cat: 'Fundamentals', comp: 'technical', prompt: 'How do caching layers improve a system, and what can go wrong?', signals: ['Latency and load benefits', 'Cache invalidation and staleness', 'Thundering herd / stampede', 'Where to cache (edge, app, DB)'], followups: ['How do you decide TTLs?'] },
  { id: 'iq-14', cat: 'Fundamentals', comp: 'security', prompt: 'Walk me through how you would apply least privilege across a new cloud environment.', signals: ['Groups and roles rather than individuals', 'Workload identities without long-lived keys', 'Guardrails (org policies / SCPs)', 'Just-in-time elevation and access reviews'], followups: ['How do you handle break-glass?'] },
  { id: 'iq-15', cat: 'Fundamentals', comp: 'technical', prompt: 'What are SLIs, SLOs, and error budgets, and how would you use them with a product team?', signals: ['Correct definitions', 'User-centric SLIs', 'Error budget policy that balances velocity and reliability', 'Burn-rate alerting'], followups: ['What happens when the budget is spent?'] },
  { id: 'iq-16', cat: 'Fundamentals', comp: 'technical', prompt: 'Explain the trade-offs between containers, serverless functions, and VMs.', signals: ['Control vs. operational burden', 'Scaling and cold starts', 'Cost model differences', 'Fit for workload types and team skills'], followups: ['Which would you choose for a steady 24/7 API?'] },
  { id: 'iq-17', cat: 'Fundamentals', comp: 'technical', prompt: 'How would you design network segmentation for a three-tier application in the cloud?', signals: ['Public vs. private subnets/tiers', 'Security groups/firewall rules by role', 'No public IPs on app/DB tiers, controlled egress', 'Private access to managed services'], followups: ['How do you inspect east-west traffic?'] },
  { id: 'iq-18', cat: 'Fundamentals', comp: 'cost', prompt: 'A team says the cloud is more expensive than on-premises. How do you respond?', signals: ['Asks for a full TCO comparison', 'Checks for lift-and-shift waste and rightsizing', 'Commitments, autoscaling, managed services', 'Business value (speed, resilience) beyond cost'], followups: ['When is on-premises actually cheaper?'] },
  // Cloud-specific
  { id: 'iq-19', cat: 'Google Cloud', comp: 'technical', prompt: 'When would you recommend Spanner over Cloud SQL?', signals: ['Horizontal scale beyond a single instance', 'Global strong consistency / multi-region', 'Availability SLA needs', 'Cost and complexity acknowledged'], followups: ['What about AlloyDB?'] },
  { id: 'iq-20', cat: 'Google Cloud', comp: 'security', prompt: 'What problem does VPC Service Controls solve that IAM does not?', signals: ['Exfiltration by authorized identities', 'Perimeter around APIs', 'Access levels and ingress/egress rules', 'Dry-run rollout'], followups: ['How do on-premises clients reach services inside the perimeter?'] },
  { id: 'iq-21', cat: 'Google Cloud', comp: 'technical', prompt: 'Explain Shared VPC and when you would use it instead of VPC peering.', signals: ['Central network admin, decentralized projects', 'IAM at subnet level', 'Peering is non-transitive and decentralized', 'Scale considerations / NCC'], followups: ['How does billing work with Shared VPC?'] },
  { id: 'iq-22', cat: 'AWS', comp: 'technical', prompt: 'How would you connect 100 VPCs and two data centers on AWS?', signals: ['Transit Gateway as hub', 'Direct Connect with resiliency model', 'Route table segmentation', 'Centralized inspection and egress'], followups: ['When is VPC peering still better?'] },
  { id: 'iq-23', cat: 'AWS', comp: 'security', prompt: 'What is the difference between an SCP, an IAM policy, and a permissions boundary?', signals: ['SCP sets the maximum for accounts, grants nothing', 'IAM policy grants', 'Boundary caps a principal\'s maximum', 'Effective permissions are the intersection'], followups: ['Give a scenario for each.'] },
  { id: 'iq-24', cat: 'AWS', comp: 'technical', prompt: 'How do you choose between SQS, SNS, EventBridge, and Kinesis?', signals: ['Queue vs. pub/sub vs. event routing vs. streaming', 'Ordering and replay needs', 'Throughput and consumer patterns', 'Concrete example for each'], followups: ['Which combination for order processing?'] },
  { id: 'iq-25', cat: 'Azure', comp: 'technical', prompt: 'How would you structure management groups and policy for a large Azure estate?', signals: ['Landing zone hierarchy (platform/landing zones)', 'Policy at management group scope', 'Subscriptions as units of scale and billing', 'Exemptions and remediation'], followups: ['Where do sandbox subscriptions go?'] },
  { id: 'iq-26', cat: 'Azure', comp: 'security', prompt: 'Explain how Conditional Access and PIM work together.', signals: ['Conditional Access controls sign-in conditions', 'PIM controls standing privilege', 'JIT with approval and MFA', 'Access reviews'], followups: ['How do you protect break-glass accounts?'] },
  // Trade-offs / judgment
  { id: 'iq-27', cat: 'Judgment', comp: 'technical', prompt: 'A product manager wants five-nines availability for a new internal tool. How do you respond?', signals: ['Asks what downtime really costs', 'Explains cost and complexity of each extra nine', 'Composite availability of dependencies', 'Proposes an appropriate SLO'], followups: ['How would you document the agreed target?'] },
  { id: 'iq-28', cat: 'Judgment', comp: 'ambiguity', prompt: 'Should a startup go multicloud from day one? Argue your position.', signals: ['Considers team size and operational cost', 'Lock-in risk vs. velocity', 'Portable designs where cheap (containers, IaC, open formats)', 'Clear recommendation with conditions to revisit'], followups: ['What would change your answer?'] },
  { id: 'iq-29', cat: 'Judgment', comp: 'cost', prompt: 'You can either refactor a monolith now or rehost it to meet a deadline. How do you decide?', signals: ['Deadline and risk tolerance', 'Business value of refactoring now', 'Strangler pattern later', 'Makes the decision explicit (ADR)'], followups: ['What signals would trigger the refactor?'] },
  { id: 'iq-30', cat: 'Judgment', comp: 'security', prompt: 'Security wants to block a release because of a medium-severity finding. Engineering wants to ship. What do you do?', signals: ['Understands actual risk and exploitability', 'Looks for compensating controls', 'Time-bound exception with owner', 'Improves process to avoid repeat'], followups: ['Who makes the final call?'] },
  { id: 'iq-31', cat: 'Judgment', comp: 'communication', prompt: 'How do you know your architecture was good, six months after launch?', signals: ['SLOs met, incidents and their causes', 'Cost per unit vs. forecast', 'Delivery speed of teams on it', 'Revisits ADRs and records learnings'], followups: ['Which metric matters most to you?'] },
  { id: 'iq-32', cat: 'Judgment', comp: 'mentoring', prompt: 'How do you raise the architecture quality of teams you do not manage?', signals: ['Golden paths and templates', 'Design reviews that teach', 'ADRs and shared standards', 'Measures adoption, not mandates'], followups: ['How do you handle a team that ignores guidance?'] }
];

const WHITEBOARD_PROMPTS = [
  { id: 'wb-01', title: 'URL shortener at global scale', minutes: 35, prompt: 'Design a URL shortening service handling 100M new links per month and 10B redirects per month, with analytics on clicks.', checklist: ['Clarified requirements and non-goals', 'Back-of-envelope: QPS, storage, read/write ratio', 'API design', 'Key generation strategy and collisions', 'Data store choice and partitioning', 'Caching / CDN for redirects', 'Analytics pipeline separated from redirect path', 'Availability and multi-region', 'Abuse prevention', 'Trade-offs stated'] },
  { id: 'wb-02', title: 'Video upload and processing platform', minutes: 40, prompt: 'Design a platform where creators upload videos up to 10 GB that are transcoded into multiple formats and served worldwide.', checklist: ['Clarified requirements', 'Direct-to-storage resumable uploads', 'Event-driven transcoding pipeline with queue', 'Parallelism and Spot/preemptible workers', 'Storage classes and lifecycle', 'CDN delivery and signed URLs', 'Failure handling and retries', 'Cost estimate drivers', 'Monitoring and SLOs', 'Trade-offs stated'] },
  { id: 'wb-03', title: 'Ride-hailing dispatch', minutes: 45, prompt: 'Design the dispatch system that matches riders with nearby drivers in real time for a city of 5 million people.', checklist: ['Clarified requirements', 'Location update ingestion rate', 'Geospatial indexing approach', 'Matching algorithm placement', 'Consistency for assignment (no double-booking)', 'Real-time push to clients', 'Regional failure handling', 'Data for analytics/ML', 'Security and privacy of location data', 'Trade-offs stated'] },
  { id: 'wb-04', title: 'Multi-region e-commerce catalog', minutes: 35, prompt: 'Design a product catalog and search service for 20M products serving customers on three continents with sub-200 ms search.', checklist: ['Clarified requirements', 'Source of truth vs. search index', 'Index update pipeline', 'Read replicas / regional indexes', 'Caching strategy', 'Consistency expectations', 'Failover behavior', 'Cost drivers', 'Observability', 'Trade-offs stated'] },
  { id: 'wb-05', title: 'Centralized logging for 500 services', minutes: 30, prompt: 'Design centralized logging and alerting for 500 microservices across three cloud accounts or projects, with 1-year retention for audit logs.', checklist: ['Volume estimate and retention tiers', 'Collection agents / routing', 'Hot vs. cold storage', 'Access control and PII handling', 'Search and dashboards', 'Alerting strategy (symptoms vs. causes)', 'Cost controls (sampling, exclusion)', 'Multi-account aggregation', 'Tamper resistance for audit logs', 'Trade-offs stated'] },
  { id: 'wb-06', title: 'Real-time leaderboard for a mobile game', minutes: 30, prompt: 'Design a global leaderboard showing top 100 players and each player\'s rank among 50M players, updating in near real time.', checklist: ['Clarified requirements', 'Write rate estimate', 'In-memory sorted structures (e.g. Redis sorted sets)', 'Sharding approach for rank queries', 'Persistence and recovery', 'Anti-cheat validation', 'Regional vs. global boards', 'Cost', 'Failure modes', 'Trade-offs stated'] },
  { id: 'wb-07', title: 'Hybrid identity and access for a merger', minutes: 35, prompt: 'Two companies merge, each with its own directory and cloud accounts. Design identity and access so employees can reach both companies\' cloud apps within 30 days.', checklist: ['Current-state inventory', 'Federation vs. consolidation decision', 'SSO and MFA approach', 'Group and role mapping', 'Privileged access controls', 'Joiner/mover/leaver process', 'Audit and access reviews', 'Phased rollout plan', 'Risks during transition', 'Trade-offs stated'] },
  { id: 'wb-08', title: 'Notification service', minutes: 30, prompt: 'Design a service that sends email, SMS, and push notifications for 30 internal product teams, up to 50M notifications per day.', checklist: ['Clarified requirements and priorities', 'API and templates', 'Queueing per channel and priority', 'Rate limits and provider failover', 'User preferences and opt-out', 'Idempotency and deduplication', 'Retries and DLQs', 'Delivery tracking/analytics', 'Multi-tenant fairness', 'Trade-offs stated'] }
];

const ROLE_TEMPLATES = [
  { title: 'Cloud Solutions Architect', level: 'Mid to Senior', skills: ['Multi-tier application design', 'Networking fundamentals (VPC, hybrid)', 'IAM and security design', 'Data store selection', 'Reliability and DR design', 'Cost optimization', 'Migration strategy', 'Customer-facing communication', 'Architecture documentation (ADRs, diagrams)', 'One professional-level certification'] },
  { title: 'Cloud Network Architect', level: 'Senior', skills: ['VPC design and IP planning', 'Hybrid connectivity (Interconnect / Direct Connect / ExpressRoute)', 'BGP and routing', 'Load balancing and CDN', 'DNS (hybrid)', 'Network security (firewalls, segmentation)', 'Zero trust access', 'Troubleshooting and observability', 'Network certification (PCNE / ANS / AZ-700)'] },
  { title: 'Cloud Security Architect', level: 'Senior', skills: ['Identity and access management', 'Data protection and key management', 'Network security and segmentation', 'Threat detection and response', 'Compliance frameworks (PCI, HIPAA, ISO)', 'Security architecture reviews', 'Policy as code', 'Incident response planning', 'Security certification'] },
  { title: 'Enterprise Cloud Architect', level: 'Principal', skills: ['Landing zones and governance', 'Multi-cloud strategy', 'Portfolio and migration planning', 'FinOps and TCO', 'Reference architectures and standards', 'Executive communication', 'Architecture review boards', 'Organizational change and enablement'] }
];

const STARTER_MILESTONES = [
  [2, 'Pass Cloud Digital Leader', 'cert'], [3, 'Publish first ADR from an Architecture Lab drill', 'portfolio'], [4, 'First portfolio case study ready', 'portfolio'],
  [6, 'Write 4 STAR stories covering 4 competencies', 'interview'], [8, 'Pass Associate Cloud Engineer', 'cert'], [9, 'Complete 5 Architecture Lab scenarios scoring 70%+', 'lab'],
  [10, 'Three portfolio case studies published', 'portfolio'], [11, 'Two mock whiteboard sessions with full checklist', 'interview'], [12, 'Target-role list and tailored resume ready', 'career'],
  [14, 'Pass Professional Cloud Architect', 'cert'], [15, 'Ten applications submitted to target roles', 'career'], [16, 'Interview readiness score 75+', 'interview']
];

