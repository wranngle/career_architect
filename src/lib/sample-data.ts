// Src/lib/sample-data.ts
// Synthetic placeholder data for the /admin demo dashboard.
// NO real customer or applicant data — every record below is fabricated.
// Mirror the Go TUI's CareerApplication / PipelineMetrics / ProgressMetrics
// shapes (see dashboard/internal/model/career.go).

export type Status
  = | 'evaluated'
  | 'applied'
  | 'responded'
  | 'interview'
  | 'offer'
  | 'rejected'
  | 'discarded'
  | 'skip';

export type CareerApplication = {
  number: number;
  date: string; // YYYY-MM-DD
  company: string;
  role: string;
  status: Status;
  score: number; // 0–5
  hasPDF: boolean;
  reportPath: string;
  notes: string;
  jobURL: string;
  archetype?: string;
  tldr?: string;
  remote?: string;
  compEstimate?: string;
};

export const sampleApplications: CareerApplication[] = [
  {
    number: 1,
    date: '2026-04-28',
    company: 'Acme Corp',
    role: 'Senior Platform Engineer',
    status: 'interview',
    score: 4.6,
    hasPDF: true,
    reportPath: 'reports/2026-04-28-acme-corp.md',
    notes: 'Onsite scheduled — system design + behavioral.',
    jobURL: 'https://example.com/jobs/acme-corp/senior-platform-engineer',
    archetype: 'Builder-IC',
    tldr: 'Modernizing a Kubernetes control plane; strong CI/CD culture.',
    remote: 'Hybrid (2 days)',
    compEstimate: '$190k–$220k + equity',
  },
  {
    number: 2,
    date: '2026-04-26',
    company: 'Example Industries',
    role: 'Staff Software Engineer, Data Platform',
    status: 'applied',
    score: 4.2,
    hasPDF: true,
    reportPath: 'reports/2026-04-26-example-industries.md',
    notes: 'Recruiter screen Friday.',
    jobURL: 'https://example.com/jobs/example-industries/staff-data',
    archetype: 'Platform-Lead',
    tldr: 'Lakehouse migration; team rebuild after Q1 reorg.',
    remote: 'Remote (US)',
    compEstimate: '$210k–$245k',
  },
  {
    number: 3,
    date: '2026-04-25',
    company: 'Demo HVAC Co.',
    role: 'Lead Backend Engineer',
    status: 'evaluated',
    score: 3.9,
    hasPDF: true,
    reportPath: 'reports/2026-04-25-demo-hvac.md',
    notes: 'Pending application — comp range borderline.',
    jobURL: 'https://example.com/jobs/demo-hvac/lead-backend',
    archetype: 'IC→Lead',
    tldr: 'IoT telemetry pipeline rewrite from monolith.',
    remote: 'Onsite (Austin)',
    compEstimate: '$165k–$185k',
  },
  {
    number: 4,
    date: '2026-04-22',
    company: 'Placeholder Robotics',
    role: 'Principal Engineer, Perception',
    status: 'responded',
    score: 4.7,
    hasPDF: true,
    reportPath: 'reports/2026-04-22-placeholder-robotics.md',
    notes: 'Recruiter responded — coordinator scheduling tech screen.',
    jobURL: 'https://example.com/jobs/placeholder-robotics/principal-perception',
    archetype: 'Principal-IC',
    tldr: 'Sensor fusion stack; small team, high autonomy.',
    remote: 'Hybrid (3 days)',
    compEstimate: '$260k–$310k + equity',
  },
  {
    number: 5,
    date: '2026-04-20',
    company: 'Sample Health Systems',
    role: 'Engineering Manager, Identity',
    status: 'rejected',
    score: 4,
    hasPDF: true,
    reportPath: 'reports/2026-04-20-sample-health.md',
    notes: 'Rejected post-onsite — went with internal candidate.',
    jobURL: 'https://example.com/jobs/sample-health/em-identity',
    archetype: 'EM',
    tldr: 'OIDC + SCIM platform for hospital network.',
    remote: 'Remote (US)',
    compEstimate: '$225k–$255k',
  },
  {
    number: 6,
    date: '2026-04-18',
    company: 'Placeholder Bio',
    role: 'Senior Full-Stack Engineer',
    status: 'offer',
    score: 4.4,
    hasPDF: true,
    reportPath: 'reports/2026-04-18-placeholder-bio.md',
    notes: 'Offer received — negotiating equity refresh.',
    jobURL: 'https://example.com/jobs/placeholder-bio/sr-fullstack',
    archetype: 'Builder-IC',
    tldr: 'LIMS replacement; React + Python + Postgres.',
    remote: 'Remote (US/EU)',
    compEstimate: '$200k base + 0.15% equity',
  },
  {
    number: 7,
    date: '2026-04-16',
    company: 'Demo Logistics',
    role: 'Backend Engineer III',
    status: 'skip',
    score: 2.8,
    hasPDF: false,
    reportPath: 'reports/2026-04-16-demo-logistics.md',
    notes: 'Skipped — comp band below floor; on-call expectations heavy.',
    jobURL: 'https://example.com/jobs/demo-logistics/be3',
    archetype: 'IC',
    tldr: 'Route optimization microservices.',
    remote: 'Onsite (Dallas)',
    compEstimate: '$135k–$155k',
  },
  {
    number: 8,
    date: '2026-04-14',
    company: 'Acme Fintech',
    role: 'Staff Engineer, Payments',
    status: 'applied',
    score: 4.3,
    hasPDF: true,
    reportPath: 'reports/2026-04-14-acme-fintech.md',
    notes: 'Applied via referral — no movement yet.',
    jobURL: 'https://example.com/jobs/acme-fintech/staff-payments',
    archetype: 'Platform-IC',
    tldr: 'Ledger rebuild + ISO 20022 migration.',
    remote: 'Hybrid (NYC)',
    compEstimate: '$245k–$275k + bonus',
  },
  {
    number: 9,
    date: '2026-04-11',
    company: 'Example Mobility',
    role: 'Senior SRE',
    status: 'discarded',
    score: 3.4,
    hasPDF: false,
    reportPath: 'reports/2026-04-11-example-mobility.md',
    notes: 'Closed by employer before screen.',
    jobURL: 'https://example.com/jobs/example-mobility/sr-sre',
    archetype: 'SRE-IC',
    tldr: 'Fleet telemetry observability.',
    remote: 'Onsite (Detroit)',
    compEstimate: '$170k–$195k',
  },
  {
    number: 10,
    date: '2026-04-08',
    company: 'Placeholder Climate',
    role: 'Lead Engineer, Carbon Markets',
    status: 'evaluated',
    score: 4.1,
    hasPDF: true,
    reportPath: 'reports/2026-04-08-placeholder-climate.md',
    notes: 'High-fit; awaiting final cv tailoring before submission.',
    jobURL: 'https://example.com/jobs/placeholder-climate/lead-carbon',
    archetype: 'Lead-IC',
    tldr: 'MRV pipeline + compliance reporting.',
    remote: 'Remote (global)',
    compEstimate: '$190k–$230k',
  },
];

// PipelineMetrics — aggregate roll-up.
export type PipelineMetrics = {
  total: number;
  byStatus: Record<Status, number>;
  avgScore: number;
  topScore: number;
  withPDF: number;
  actionable: number; // Total minus skip/rejected/discarded
};

export function buildPipelineMetrics(apps: CareerApplication[]): PipelineMetrics {
  const byStatus: Record<string, number> = {};
  for (const a of apps) {
    byStatus[a.status] = (byStatus[a.status] ?? 0) + 1;
  }
  const scores = apps.map(a => a.score).filter(s => s > 0);
  const avg = scores.length > 0 ? scores.reduce((a, b) => a + b, 0) / scores.length : 0;
  const top = scores.length > 0 ? Math.max(...scores) : 0;
  const withPDF = apps.filter(a => a.hasPDF).length;
  const actionable = apps.filter(a => !['skip', 'rejected', 'discarded'].includes(a.status)).length;
  return {
    total: apps.length,
    byStatus,
    avgScore: Number(avg.toFixed(2)),
    topScore: Number(top.toFixed(2)),
    withPDF,
    actionable,
  };
}

// ProgressMetrics — funnel + time-series.
export type FunnelStage = {label: string; count: number; pct: number};
export type ScoreBucket = {label: string; count: number};
export type WeekActivity = {week: string; count: number};

export type ProgressMetrics = {
  funnelStages: FunnelStage[];
  scoreBuckets: ScoreBucket[];
  weeklyActivity: WeekActivity[];
  responseRate: number;
  interviewRate: number;
  offerRate: number;
  avgScore: number;
  topScore: number;
  totalOffers: number;
  activeApps: number;
};

export function buildProgressMetrics(apps: CareerApplication[]): ProgressMetrics {
  const total = apps.length || 1;
  const counts = (filter: (a: CareerApplication) => boolean) =>
    apps.filter(app => filter(app)).length;

  const applied = counts(a =>
    ['applied', 'responded', 'interview', 'offer', 'rejected'].includes(a.status));
  const responded = counts(a =>
    ['responded', 'interview', 'offer'].includes(a.status));
  const interview = counts(a => ['interview', 'offer'].includes(a.status));
  const offer = counts(a => a.status === 'offer');

  const funnelStages: FunnelStage[] = [
    {label: 'Evaluated', count: total, pct: 100},
    {label: 'Applied', count: applied, pct: (applied / total) * 100},
    {label: 'Responded', count: responded, pct: (responded / total) * 100},
    {label: 'Interview', count: interview, pct: (interview / total) * 100},
    {label: 'Offer', count: offer, pct: (offer / total) * 100},
  ];

  const buckets: Array<{label: string; min: number; max: number}> = [
    {label: '4.5–5.0', min: 4.5, max: 5.01},
    {label: '4.0–4.4', min: 4, max: 4.5},
    {label: '3.5–3.9', min: 3.5, max: 4},
    {label: '3.0–3.4', min: 3, max: 3.5},
    {label: '<3.0', min: 0, max: 3},
  ];
  const scoreBuckets: ScoreBucket[] = buckets.map(b => ({
    label: b.label,
    count: counts(a => a.score >= b.min && a.score < b.max),
  }));

  // Group apps by ISO-week-ish bucket using YYYY-Wxx (synthetic).
  const weekMap = new Map<string, number>();
  for (const a of apps) {
    const wk = isoWeekKey(a.date);
    weekMap.set(wk, (weekMap.get(wk) ?? 0) + 1);
  }

  const weeklyActivity = [...weekMap.entries()]
    .map(([week, count]) => ({week, count}))
    .sort((a, b) => (a.week < b.week ? 1 : -1));

  const scores = apps.map(a => a.score).filter(s => s > 0);
  const avg = scores.length > 0 ? scores.reduce((a, b) => a + b, 0) / scores.length : 0;
  const top = scores.length > 0 ? Math.max(...scores) : 0;

  const activeApps = counts(a => !['skip', 'rejected', 'discarded'].includes(a.status));

  return {
    funnelStages,
    scoreBuckets,
    weeklyActivity,
    responseRate: applied ? responded / applied : 0,
    interviewRate: applied ? interview / applied : 0,
    offerRate: applied ? offer / applied : 0,
    avgScore: Number(avg.toFixed(2)),
    topScore: Number(top.toFixed(2)),
    totalOffers: offer,
    activeApps,
  };
}

function isoWeekKey(yyyyMmDd: string): string {
  // Lightweight ISO week label: YYYY-Wxx. Approximation; sufficient for demo.
  const d = new Date(yyyyMmDd + 'T00:00:00Z');
  if (Number.isNaN(d.getTime())) {
    return 'unknown';
  }

  const target = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
  const dayNumber = (target.getUTCDay() + 6) % 7;
  target.setUTCDate(target.getUTCDate() - dayNumber + 3);
  const firstThursday = new Date(Date.UTC(target.getUTCFullYear(), 0, 4));
  const week
    = 1
      + Math.round(((target.getTime() - firstThursday.getTime()) / 86_400_000
        - 3
        + ((firstThursday.getUTCDay() + 6) % 7))
      / 7);
  return `${target.getUTCFullYear()}-W${String(week).padStart(2, '0')}`;
}

// Sample scan history — synthetic batch run results (mirrors batch/ + scan.mjs UX).
export type ScanRun = {
  id: string;
  startedAt: string;
  durationSec: number;
  portalsScanned: number;
  newJobs: number;
  evaluated: number;
  status: 'completed' | 'partial' | 'failed';
  notes: string;
};

export const sampleScans: ScanRun[] = [
  {
    id: 'scan-2026-04-28-09:14',
    startedAt: '2026-04-28T09:14:00Z',
    durationSec: 412,
    portalsScanned: 14,
    newJobs: 23,
    evaluated: 19,
    status: 'completed',
    notes: 'All portals responded; 4 jobs deferred (comp parsing).',
  },
  {
    id: 'scan-2026-04-26-09:01',
    startedAt: '2026-04-26T09:01:00Z',
    durationSec: 388,
    portalsScanned: 14,
    newJobs: 11,
    evaluated: 11,
    status: 'completed',
    notes: 'Quiet day on Greenhouse; Ashby + Lever steady.',
  },
  {
    id: 'scan-2026-04-24-09:02',
    startedAt: '2026-04-24T09:02:00Z',
    durationSec: 502,
    portalsScanned: 14,
    newJobs: 31,
    evaluated: 27,
    status: 'partial',
    notes: 'Hire Autism portal timed out; 4 jobs deferred to next run.',
  },
  {
    id: 'scan-2026-04-22-09:00',
    startedAt: '2026-04-22T09:00:00Z',
    durationSec: 449,
    portalsScanned: 14,
    newJobs: 18,
    evaluated: 18,
    status: 'completed',
    notes: 'Steady run; no anomalies.',
  },
  {
    id: 'scan-2026-04-20-09:05',
    startedAt: '2026-04-20T09:05:00Z',
    durationSec: 0,
    portalsScanned: 0,
    newJobs: 0,
    evaluated: 0,
    status: 'failed',
    notes: 'Playwright launch failure; rerun queued.',
  },
];

// Profile readiness — synthetic, public-safe signal map for keeping the
// public profile, CV, portfolio, and application answers coherent.
export type ProfileSignalStatus = 'ready' | 'watch' | 'blocked';

export type ProfileSignalCategory
  = | 'positioning'
  | 'proof'
  | 'safety'
  | 'distribution';

export type ProfileSignal = {
  id: string;
  label: string;
  category: ProfileSignalCategory;
  status: ProfileSignalStatus;
  owner: string;
  evidence: string;
  action: string;
  publicSafe: boolean;
};

export type RoleVocabularyRow = {
  employerLanguage: string;
  publicProfilePhrase: string;
  evidenceType: string;
  priority: 'core' | 'supporting';
};

export type PublicSurfaceCheck = {
  surface: string;
  currentUse: string;
  requiredAlignment: string;
  status: ProfileSignalStatus;
};

export type ProfileReadinessMetrics = {
  total: number;
  ready: number;
  watch: number;
  blocked: number;
  publicSafe: number;
  score: number;
};

export const sampleProfileSignals: ProfileSignal[] = [
  {
    id: 'canonical-narrative',
    label: 'Canonical role narrative',
    category: 'positioning',
    status: 'ready',
    owner: 'Profile',
    evidence: 'CV, profile headline, and public site all frame the candidate as a full-stack automation builder for revenue and operations teams.',
    action: 'Keep target role, current work, and public proof in the same sentence-level frame.',
    publicSafe: true,
  },
  {
    id: 'role-vocabulary',
    label: 'Target-company vocabulary',
    category: 'positioning',
    status: 'ready',
    owner: 'Applications',
    evidence: 'Skill language includes agents, internal tools, CRM workflows, billing handoffs, and operator-facing dashboards.',
    action: 'Refresh profile skills from target-team language before each top-priority application batch.',
    publicSafe: true,
  },
  {
    id: 'sql-proof',
    label: 'SQL and data proof gate',
    category: 'proof',
    status: 'watch',
    owner: 'Portfolio',
    evidence: 'Automation proof is strong; SQL-backed reconciliation and reporting proof should be more explicit before promoting SQL as a top skill.',
    action: 'Publish a small public-safe reporting artifact with schema, query excerpts, and result interpretation.',
    publicSafe: true,
  },
  {
    id: 'public-contradiction-blocker',
    label: 'Public surface contradiction blocker',
    category: 'safety',
    status: 'blocked',
    owner: 'Website',
    evidence: 'Public copy must not imply customers, revenue, or production scale unless the CV, profile, and portfolio can support the same claim.',
    action: 'Downgrade unsupported claims to prototype, internal tool, or lab language before featuring them.',
    publicSafe: true,
  },
  {
    id: 'application-answer-hygiene',
    label: 'Application answer hygiene',
    category: 'safety',
    status: 'ready',
    owner: 'Applications',
    evidence: 'Answers avoid low-signal personal anecdotes and reuse role-relevant proof blocks with consistent numbers and scope.',
    action: 'Keep reusable answer snippets tied to verified project evidence.',
    publicSafe: true,
  },
  {
    id: 'recommendation-gap',
    label: 'Recommendation coverage',
    category: 'distribution',
    status: 'watch',
    owner: 'Network',
    evidence: 'Profile positioning is clear, but third-party validation should cover automation, reliability, and collaboration.',
    action: 'Request three short recommendations mapped to the target role archetype.',
    publicSafe: true,
  },
  {
    id: 'network-routing',
    label: 'Referral routing',
    category: 'distribution',
    status: 'watch',
    owner: 'Network',
    evidence: 'Target-company list exists; first-degree and warm second-degree paths need explicit owner and next action.',
    action: 'Attach each priority company to a referral route before applying cold.',
    publicSafe: true,
  },
  {
    id: 'measurement-loop',
    label: 'Profile measurement loop',
    category: 'distribution',
    status: 'ready',
    owner: 'Profile',
    evidence: 'Search appearances, profile views, recruiter replies, and screen conversions can be tracked with the existing pipeline cadence.',
    action: 'Review metrics weekly and only change one public-surface variable at a time.',
    publicSafe: true,
  },
];

export const sampleRoleVocabularyRows: RoleVocabularyRow[] = [
  {
    employerLanguage: 'AI agents that automate business workflows',
    publicProfilePhrase: 'voice agents, lead parsers, RAG assistants, and human-in-the-loop review flows',
    evidenceType: 'project readme, demo clip, architecture note',
    priority: 'core',
  },
  {
    employerLanguage: 'Internal tooling for GTM and revenue teams',
    publicProfilePhrase: 'CRM enrichment, routing, quoting, billing, and handoff automation',
    evidenceType: 'CV bullet, portfolio case study, application answer',
    priority: 'core',
  },
  {
    employerLanguage: 'Operational reliability and measurable impact',
    publicProfilePhrase: 'latency budgets, evals, alerting, reconciliation checks, and conversion-rate instrumentation',
    evidenceType: 'metrics table, dashboard screenshot, postmortem note',
    priority: 'core',
  },
  {
    employerLanguage: 'Customer-facing judgment with builder speed',
    publicProfilePhrase: 'usable interfaces, Slack notifications, approval queues, and support-ready admin flows',
    evidenceType: 'product screenshots, workflow diagrams',
    priority: 'supporting',
  },
  {
    employerLanguage: 'Finance and operations system literacy',
    publicProfilePhrase: 'Stripe, QuickBooks, ERP exports, invoice reconciliation, and reporting pipelines',
    evidenceType: 'sanitized schema, query note, integration checklist',
    priority: 'supporting',
  },
];

export const samplePublicSurfaceChecks: PublicSurfaceCheck[] = [
  {
    surface: 'CV / resume',
    currentUse: 'Primary proof surface for quantified project outcomes.',
    requiredAlignment: 'Numbers, stack, and role scope must match profile and application answers.',
    status: 'ready',
  },
  {
    surface: 'LinkedIn profile',
    currentUse: 'Recruiter search surface and lightweight proof router.',
    requiredAlignment: 'Headline, about section, and skills should match the target-role vocabulary map.',
    status: 'ready',
  },
  {
    surface: 'Portfolio / website',
    currentUse: 'Public proof surface for demos, project framing, and architecture notes.',
    requiredAlignment: 'No production-scale, customer, or revenue claim should appear without matching evidence elsewhere.',
    status: 'blocked',
  },
  {
    surface: 'GitHub profile',
    currentUse: 'Technical credibility and artifact discovery.',
    requiredAlignment: 'Pinned repositories should map to the same automation, data, and internal-tooling narrative.',
    status: 'watch',
  },
  {
    surface: 'Application answers',
    currentUse: 'Role-specific translation layer for recruiters and hiring managers.',
    requiredAlignment: 'Reusable snippets must cite the same proof blocks as CV and portfolio.',
    status: 'ready',
  },
];

export function buildProfileReadinessMetrics(signals: ProfileSignal[] = sampleProfileSignals): ProfileReadinessMetrics {
  const total = signals.length || 1;
  const ready = signals.filter(signal => signal.status === 'ready').length;
  const watch = signals.filter(signal => signal.status === 'watch').length;
  const blocked = signals.filter(signal => signal.status === 'blocked').length;
  const publicSafe = signals.filter(signal => signal.publicSafe).length;

  return {
    total: signals.length,
    ready,
    watch,
    blocked,
    publicSafe,
    score: Math.round(((ready + (watch * 0.5)) / total) * 100),
  };
}

export const STATUS_LABELS: Record<Status, string> = {
  evaluated: 'Evaluated',
  applied: 'Applied',
  responded: 'Responded',
  interview: 'Interview',
  offer: 'Offer',
  rejected: 'Rejected',
  discarded: 'Discarded',
  skip: 'Skip',
};
