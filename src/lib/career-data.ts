import {existsSync, readFileSync} from 'node:fs';
import {join} from 'node:path';
import process from 'node:process';
import {
  sampleApplications,
  sampleScans,
  type CareerApplication,
  type ProfileSignal,
  type PublicSurfaceCheck,
  type RoleVocabularyRow,
  type ScanRun,
  type Status,
} from '@/lib/sample-data';

export type DataMode = 'live' | 'demo';

export type Dataset<T> = {
  items: T[];
  mode: DataMode;
  source: string;
  note: string;
};

export type ProfileReadinessData = {
  signals: ProfileSignal[];
  publicSurfaceChecks: PublicSurfaceCheck[];
  roleVocabularyRows: RoleVocabularyRow[];
  mode: DataMode;
  source: string;
  note: string;
};

export type AdminDataStatus = {
  applications: Dataset<CareerApplication>;
  scans: Dataset<ScanRun>;
  profile: ProfileReadinessData;
  mode: DataMode;
};

type FileState = {
  exists: boolean;
  content: string;
};

// Split-repo support: point CAREER_DATA_DIR at the directory holding your
// user-layer files (cv.md, config/, data/, …) when they live outside this
// repo — mirrors lib/resolve-root.mjs for the Node CLIs.
const envDataDir = process.env.CAREER_DATA_DIR;
const ROOT = envDataDir && existsSync(envDataDir) ? envDataDir : process.cwd();
const APPLICATIONS_PATH = join(ROOT, 'data/applications.md');
const SCAN_HISTORY_PATH = join(ROOT, 'data/scan-history.tsv');
const CV_PATH = join(ROOT, 'cv.md');
const PROFILE_PATH = join(ROOT, 'config/profile.yml');
const PROFILE_MODE_PATH = join(ROOT, 'modes/_profile.md');
const PROFILE_TEMPLATE_PATH = join(ROOT, 'modes/_profile.template.md');
const PORTALS_PATH = join(ROOT, 'portals.yml');
const ARTICLE_DIGEST_PATH = join(ROOT, 'article-digest.md');

const STATUS_BY_LABEL: Record<string, Status> = {
  evaluated: 'evaluated',
  applied: 'applied',
  responded: 'responded',
  screen: 'screen',
  tech: 'tech',
  onsite: 'onsite',
  interview: 'interview',
  offer: 'offer',
  rejected: 'rejected',
  ghosted: 'ghosted',
  discarded: 'discarded',
  skip: 'skip',
};

export function getApplications(): Dataset<CareerApplication> {
  if (!existsSync(APPLICATIONS_PATH)) {
    return {
      items: sampleApplications,
      mode: 'demo',
      source: 'src/lib/sample-data.ts',
      note: 'data/applications.md is missing, so this page is showing sample rows.',
    };
  }

  const parsed = parseApplications(readText(APPLICATIONS_PATH));
  return {
    items: parsed,
    mode: 'live',
    source: 'data/applications.md',
    note: parsed.length === 0
      ? 'data/applications.md exists but has no application rows yet.'
      : 'Loaded from the local applications tracker.',
  };
}

export function getScans(): Dataset<ScanRun> {
  if (!existsSync(SCAN_HISTORY_PATH)) {
    return {
      items: sampleScans,
      mode: 'demo',
      source: 'src/lib/sample-data.ts',
      note: 'data/scan-history.tsv is missing, so this page is showing sample runs.',
    };
  }

  const parsed = parseScanHistory(readText(SCAN_HISTORY_PATH));
  return {
    items: parsed,
    mode: 'live',
    source: 'data/scan-history.tsv',
    note: parsed.length === 0
      ? 'data/scan-history.tsv exists but has no scan rows yet.'
      : 'Grouped from the local scan history file.',
  };
}

export function getProfileReadiness(): ProfileReadinessData {
  const cv = fileState(CV_PATH);
  const profile = fileState(PROFILE_PATH);
  const profileMode = fileState(PROFILE_MODE_PATH);
  const portals = fileState(PORTALS_PATH);
  const articleDigest = fileState(ARTICLE_DIGEST_PATH);
  const profileModeIsTemplate = profileMode.exists
    && existsSync(PROFILE_TEMPLATE_PATH)
    && normalizeText(profileMode.content) === normalizeText(readText(PROFILE_TEMPLATE_PATH));
  const profileLooksExample = profile.content.includes('Jane Smith')
    || profile.content.includes('jane@example.com');

  const signals: ProfileSignal[] = [
    cvSignal(cv),
    profileSignal(profile, profileLooksExample),
    profileModeSignal(profileMode, profileModeIsTemplate),
    portalsSignal(portals),
    articleDigestSignal(articleDigest),
  ];

  return {
    signals,
    publicSurfaceChecks: buildPublicSurfaceChecks(cv.exists, profile.exists, portals.exists),
    roleVocabularyRows: buildSetupVocabularyRows(),
    mode: profile.exists || cv.exists || portals.exists ? 'live' : 'demo',
    source: 'local setup files',
    note: 'Computed from local setup files instead of fabricated profile claims.',
  };
}

export function getAdminDataStatus(): AdminDataStatus {
  const applications = getApplications();
  const scans = getScans();
  const profile = getProfileReadiness();
  return {
    applications,
    scans,
    profile,
    mode: applications.mode === 'live' || scans.mode === 'live' || profile.mode === 'live'
      ? 'live'
      : 'demo',
  };
}

function parseApplications(markdown: string): CareerApplication[] {
  const lines = markdown.split('\n').map(line => line.trim()).filter(Boolean);
  const headerLine = lines.find(line =>
    line.startsWith('|')
    && line.toLowerCase().includes('company')
    && line.toLowerCase().includes('role'));
  const headers = headerLine ? tableCells(headerLine).map(value => headerKey(value)) : [];
  const index = (name: string, fallback: number) => {
    const found = headers.indexOf(name);
    return found === -1 ? fallback : found;
  };

  const numberIndex = index('#', 0);
  const dateIndex = index('date', 1);
  const companyIndex = index('company', 2);
  const roleIndex = index('role', 3);
  const scoreIndex = index('score', 4);
  const statusIndex = index('status', 5);
  const pdfIndex = index('pdf', 6);
  const reportIndex = index('report', 7);
  const notesIndex = index('notes', 8);

  return lines
    .filter(line => {
      if (!line.startsWith('|')) {
        return false;
      }

      const firstCell = tableCells(line)[0] ?? '';
      return Number.parseInt(firstCell, 10) > 0;
    })
    .map(line => {
      const cells = tableCells(line);
      const reportPath = markdownLinkHref(cells[reportIndex]) ?? cells[reportIndex] ?? '';
      const app: CareerApplication = {
        number: Number.parseInt(cells[numberIndex] ?? '0', 10),
        date: cells[dateIndex] ?? '',
        company: stripMarkdown(cells[companyIndex] ?? 'Unknown company'),
        role: stripMarkdown(cells[roleIndex] ?? 'Unknown role'),
        score: parseScore(cells[scoreIndex]),
        status: parseStatus(cells[statusIndex]),
        hasPDF: isTruthyCell(cells[pdfIndex]),
        reportPath,
        notes: stripMarkdown(cells[notesIndex] ?? ''),
        // The tracker does not record posting URLs — leave jobURL unset
        // rather than mislabeling the report path as the job link.
      };
      return app;
    })
    .filter(app => app.number > 0);
}

function parseScanHistory(tsv: string): ScanRun[] {
  const rows = tsv
    .split('\n')
    .map(line => line.trim())
    .filter(Boolean)
    .map(line => line.split('\t'));
  const dataRows = rows.filter(row => row[0] !== 'url');
  const groups = new Map<string, string[][]>();

  for (const row of dataRows) {
    const firstSeen = row[1] ?? 'unknown';
    const dateKey = firstSeen.slice(0, 10);
    const key = dateKey.length > 0 ? dateKey : 'unknown';
    groups.set(key, [...(groups.get(key) ?? []), row]);
  }

  return [...groups.entries()]
    .sort(([a], [b]) => (a < b ? 1 : -1))
    .map(([date, group]) => ({
      id: `scan-history-${date}`,
      startedAt: date === 'unknown' ? new Date(0).toISOString() : `${date}T00:00:00Z`,
      durationSec: 0,
      portalsScanned: new Set(group.map(row => row[2] ?? 'unknown')).size,
      newJobs: group.length,
      evaluated: group.filter(row => isEvaluatedScanStatus(row[5])).length,
      status: 'completed',
      notes: 'Grouped from scan-history.tsv job rows.',
    }));
}

function buildPublicSurfaceChecks(
  hasCv: boolean,
  hasProfile: boolean,
  hasPortals: boolean,
): PublicSurfaceCheck[] {
  return [
    {
      surface: 'CV / resume',
      currentUse: hasCv ? 'Canonical source for generated variants.' : 'Missing.',
      requiredAlignment: 'Generated CVs should only claim what cv.md can support.',
      status: hasCv ? 'ready' : 'blocked',
    },
    {
      surface: 'Profile configuration',
      currentUse: hasProfile ? 'Targeting, compensation, filters, and location policy.' : 'Missing.',
      requiredAlignment: 'Evaluations need real target roles and deal-breakers.',
      status: hasProfile ? 'ready' : 'blocked',
    },
    {
      surface: 'Portal scanner',
      currentUse: hasPortals ? 'Configured scanner input.' : 'Missing.',
      requiredAlignment: 'Portal filters should match target roles before scan runs.',
      status: hasPortals ? 'ready' : 'blocked',
    },
  ];
}

function cvSignal(cv: FileState): ProfileSignal {
  const charCount = cv.content.trim().length;
  return {
    id: 'cv-md',
    label: 'cv.md',
    category: 'proof',
    status: cv.exists && charCount >= 600 ? 'ready' : 'blocked',
    owner: 'CV',
    evidence: cv.exists
      ? `${charCount} characters found in cv.md.`
      : 'cv.md is missing.',
    action: cv.exists
      ? 'Keep this as the canonical CV before generating variants.'
      : 'Add a markdown CV with summary, experience, projects, education, and skills.',
    publicSafe: true,
  };
}

function profileSignal(profile: FileState, looksExample: boolean): ProfileSignal {
  return {
    id: 'profile-yml',
    label: 'config/profile.yml',
    category: 'positioning',
    status: profile.exists && !looksExample ? 'ready' : 'blocked',
    owner: 'Profile',
    evidence: profile.exists
      ? (looksExample ? 'Profile file still contains example identity data.' : 'Profile file exists with non-example identity data.')
      : 'config/profile.yml is missing.',
    action: profile.exists
      ? 'Keep target roles, location policy, compensation, and hard filters current.'
      : 'Copy config/profile.example.yml to config/profile.yml and fill in real targeting details.',
    publicSafe: true,
  };
}

function profileModeSignal(profileMode: FileState, isTemplate: boolean): ProfileSignal {
  return {
    id: 'profile-mode',
    label: 'modes/_profile.md',
    category: 'positioning',
    status: profileMode.exists
      ? (isTemplate ? 'watch' : 'ready')
      : 'blocked',
    owner: 'Profile',
    evidence: profileMode.exists
      ? (isTemplate ? 'Customization file exists but still matches the template.' : 'Customization file has local edits.')
      : 'modes/_profile.md is missing.',
    action: profileMode.exists
      ? 'Put role framing, proof mapping, and negotiation preferences here instead of editing modes/_shared.md.'
      : 'Create modes/_profile.md from modes/_profile.template.md.',
    publicSafe: true,
  };
}

function portalsSignal(portals: FileState): ProfileSignal {
  return {
    id: 'portals-yml',
    label: 'portals.yml',
    category: 'distribution',
    status: portals.exists ? 'ready' : 'blocked',
    owner: 'Scanner',
    evidence: portals.exists ? 'Portal scanner configuration exists.' : 'portals.yml is missing.',
    action: portals.exists
      ? 'Keep enabled portals and title filters aligned with the current search.'
      : 'Copy templates/portals.example.yml to portals.yml before scanning.',
    publicSafe: true,
  };
}

function articleDigestSignal(articleDigest: FileState): ProfileSignal {
  return {
    id: 'article-digest',
    label: 'article-digest.md',
    category: 'proof',
    status: articleDigest.exists ? 'ready' : 'watch',
    owner: 'Proof',
    evidence: articleDigest.exists
      ? 'Reusable proof-point digest exists.'
      : 'article-digest.md is absent; evaluations will rely mostly on cv.md.',
    action: 'Add compact proof points for projects, articles, demos, and quantified outcomes.',
    publicSafe: true,
  };
}

function buildSetupVocabularyRows(): RoleVocabularyRow[] {
  return [
    {
      employerLanguage: 'Target role titles',
      publicProfilePhrase: 'Add target roles to config/profile.yml.',
      evidenceType: 'profile.yml',
      priority: 'core',
    },
    {
      employerLanguage: 'Proof points',
      publicProfilePhrase: 'Add reusable outcomes to cv.md or article-digest.md.',
      evidenceType: 'cv.md, article-digest.md',
      priority: 'core',
    },
  ];
}

function fileState(path: string): FileState {
  if (!existsSync(path)) {
    return {exists: false, content: ''};
  }

  return {exists: true, content: readText(path)};
}

function readText(path: string): string {
  return readFileSync(path, 'utf8');
}

function tableCells(line: string): string[] {
  const trimmed = line.trim();
  const withoutStart = trimmed.startsWith('|') ? trimmed.slice(1) : trimmed;
  const withoutEnd = withoutStart.endsWith('|') ? withoutStart.slice(0, -1) : withoutStart;
  return withoutEnd
    .split('|')
    .map(cell => cell.trim());
}

function headerKey(value: string): string {
  const stripped = stripMarkdown(value).toLowerCase();
  return stripped === 'no.' || stripped === 'num' ? '#' : stripped;
}

function parseScore(value = ''): number {
  const match = /(\d+(?:\.\d+)?)/.exec(value);
  return match ? Number.parseFloat(match[1]) : 0;
}

function parseStatus(value = ''): Status {
  const key = stripMarkdown(value).toLowerCase();
  return STATUS_BY_LABEL[key] ?? STATUS_BY_LABEL[normalizeText(key)] ?? 'evaluated';
}

function markdownLinkHref(value = ''): string | undefined {
  return /\[[^\]]*]\(([^)]+)\)/.exec(value)?.[1];
}

function stripMarkdown(value: string): string {
  return value
    .replace(/\*\*/g, '')
    .replace(/`/g, '')
    .replace(/\[[^\]]*]\(([^)]+)\)/g, '$1')
    .trim();
}

function normalizeText(value: string): string {
  return value.replace(/\s+/g, ' ').trim();
}

function isTruthyCell(value = ''): boolean {
  const normalized = value.trim().toLowerCase();
  return normalized.includes('✅') || normalized === 'yes' || normalized === 'true';
}

function isEvaluatedScanStatus(value = ''): boolean {
  // Scan-history statuses: scan.mjs writes 'added'; the scan mode records
  // 'skipped_expired' / 'skipped_title'. Anything beyond those means the
  // row progressed into evaluation.
  const normalized = value.trim().toLowerCase();
  return normalized !== '' && normalized !== 'added' && !normalized.startsWith('skipped');
}
