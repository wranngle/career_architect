/**
 * timeline — render the in-flight application calendar as a Mermaid gantt.
 *
 * Reads the canonical pipe-table tracker at <root>/data/applications.md
 * (same schema parsed by followup-cadence.mjs / normalize-statuses.mjs /
 * funnel-metrics.mjs from PR #5) and emits <root>/out/timeline.md, a
 * markdown document with a fenced ```mermaid gantt``` block — one section
 * per funnel stage, one row per in-flight application.
 *
 * "In-flight" = a row that entered the funnel and has not closed out, i.e.
 * status ∈ { Applied, Responded, Screen, Tech, Onsite, Interview, Offer }
 * (per templates/states.yml). Accepted and the closed-loss statuses
 * (Rejected, Ghosted, Discarded, SKIP, Evaluated) are excluded by default —
 * they are no longer awaiting a next action. Pass --include to widen the
 * filter.
 *
 * Sibling: funnel-metrics.mjs (PR #5) reports stage counts as JSON; this
 * CLI reports the same stages as a calendar so the operator can see which
 * specific applications are stuck where. Cite #5 in the PR proof.
 */

import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs';
import { join } from 'node:path';

export const DEFAULT_IN_FLIGHT_STATUSES = ['applied', 'responded', 'screen', 'tech', 'onsite', 'interview', 'offer'];
export const STAGE_ORDER = ['applied', 'responded', 'screen', 'tech', 'onsite', 'interview', 'offer', 'accepted', 'rejected', 'ghosted', 'discarded', 'evaluated', 'skip'];

const STAGE_LABELS = {
  applied: 'Applied',
  responded: 'Responded',
  screen: 'Recruiter screen',
  tech: 'Tech interview',
  onsite: 'Onsite / final round',
  interview: 'Interview loop',
  offer: 'Offer',
  accepted: 'Accepted',
  rejected: 'Rejected',
  ghosted: 'Ghosted',
  discarded: 'Discarded',
  evaluated: 'Evaluated',
  skip: 'Skipped',
};

// Mermaid gantt task states. `done` = finished, `active` = current, `crit` =
// needs attention. We map by stage so the chart reads at a glance.
const STAGE_TASK_STATE = {
  applied: 'active',
  responded: 'active',
  screen: 'active',
  tech: 'crit, active',
  onsite: 'crit, active',
  interview: 'crit, active',
  offer: 'crit, active',
  accepted: 'done',
  rejected: 'done',
  ghosted: 'done',
  discarded: 'done',
  evaluated: 'done',
  skip: 'done',
};

const DEFAULT_DURATION_DAYS = {
  applied: 7,
  responded: 5,
  screen: 5,
  tech: 7,
  onsite: 10,
  interview: 10,
  offer: 7,
  accepted: 1,
  rejected: 1,
  ghosted: 1,
  discarded: 1,
  evaluated: 1,
  skip: 1,
};

export function canonStatus(raw) {
  return String(raw ?? '').replaceAll('**', '').trim().toLowerCase();
}

export function slugify(text) {
  return String(text ?? '')
    .toLowerCase()
    .replaceAll(/[^a-z0-9]+/g, '-')
    .replaceAll(/^-+|-+$/g, '')
    || 'row';
}

// Date helpers — keep the chart deterministic by working off ISO date strings
// (YYYY-MM-DD) only, never wallclock time. Mermaid gantt accepts that format
// natively when `dateFormat YYYY-MM-DD` is declared in the header.
const ISO_DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

export function isIsoDate(s) {
  return typeof s === 'string' && ISO_DATE_RE.test(s);
}

export function addDays(isoDate, days) {
  const [y, m, d] = isoDate.split('-').map(Number);
  // Use UTC so DST never shifts a date by ±1.
  const t = Date.UTC(y, m - 1, d) + days * 86_400_000;
  const dt = new Date(t);
  const yy = dt.getUTCFullYear();
  const mm = String(dt.getUTCMonth() + 1).padStart(2, '0');
  const dd = String(dt.getUTCDate()).padStart(2, '0');
  return `${yy}-${mm}-${dd}`;
}

/**
 * Parse <root>/data/applications.md into an array of row records. Tolerant
 * of leading/trailing whitespace, header rows, and the markdown alignment
 * row (`| --- | --- | ...`). Mirrors funnel-metrics.mjs::parseTracker but
 * keeps the row index, company, role, and date so we can render rows.
 */
export function parseTracker(path) {
  if (!existsSync(path)) return [];
  const rows = [];
  for (const line of readFileSync(path, 'utf-8').split('\n')) {
    if (!line.startsWith('|')) continue;
    const parts = line.split('|').map((s) => s.trim());
    if (parts.length < 9) continue;
    const num = Number.parseInt(parts[1], 10);
    if (!Number.isFinite(num)) continue;
    rows.push({
      num,
      fecha: parts[2] ?? '',
      empresa: parts[3] ?? '',
      rol: parts[4] ?? '',
      score: parts[5] ?? '',
      status: parts[6] ?? '',
      notes: parts[9] ?? '',
    });
  }
  return rows;
}

export function isInFlight(row, allow = DEFAULT_IN_FLIGHT_STATUSES) {
  const s = canonStatus(row.status);
  if (s === '') return false;
  return allow.includes(s);
}

/**
 * Build a deterministic task record for a row. `taskId` is namespaced by
 * row number so duplicate (empresa, rol) pairs never collide in the
 * mermaid output. `start` falls back to today if the tracker row's fecha
 * is unparseable — that keeps the chart valid rather than emitting a
 * broken gantt directive.
 */
export function buildTask(row, { today }) {
  const stage = canonStatus(row.status);
  const start = isIsoDate(row.fecha) ? row.fecha : today;
  const duration = DEFAULT_DURATION_DAYS[stage] ?? 7;
  const end = addDays(start, duration);
  const taskId = `app${String(row.num).padStart(3, '0')}_${slugify(row.empresa).slice(0, 24)}`;
  const label = `${row.empresa || 'Unknown'} — ${row.rol || 'Role TBD'} (#${row.num})`;
  return {
    rowNum: row.num,
    stage,
    label,
    taskId,
    start,
    end,
    state: STAGE_TASK_STATE[stage] ?? 'active',
  };
}

/**
 * Render the gantt block. Mermaid expects:
 *
 *   ```mermaid
 *   gantt
 *     title …
 *     dateFormat YYYY-MM-DD
 *     section <stage>
 *     <label> :<state>, <id>, <start>, <end>
 *   ```
 *
 * Each in-flight stage gets its own section, in STAGE_ORDER. Empty
 * sections are skipped so the chart stays compact; the caller can still
 * tell from the summary stats which stages had zero rows.
 */
export function renderGantt(tasks, { title, today }) {
  const lines = ['gantt'];
  lines.push(`    title ${title}`);
  lines.push('    dateFormat YYYY-MM-DD');
  lines.push(`    axisFormat %b %d`);
  lines.push(`    todayMarker stroke-width:2px,stroke:#f55,opacity:0.6`);

  const grouped = new Map();
  for (const t of tasks) {
    if (!grouped.has(t.stage)) grouped.set(t.stage, []);
    grouped.get(t.stage).push(t);
  }

  for (const stage of STAGE_ORDER) {
    const rows = grouped.get(stage);
    if (!rows || rows.length === 0) continue;
    lines.push(`    section ${STAGE_LABELS[stage] ?? stage}`);
    for (const t of rows) {
      const safeLabel = t.label.replaceAll(':', '∶'); // gantt label separator
      lines.push(`    ${safeLabel} :${t.state}, ${t.taskId}, ${t.start}, ${t.end}`);
    }
  }

  // Marker line so even an empty chart documents "today" — useful when no
  // rows exist yet but the operator still wants to see the file rendered.
  if (tasks.length === 0) {
    lines.push('    section Today');
    lines.push(`    No in-flight applications yet :milestone, today_marker, ${today}, 0d`);
  }

  return lines.join('\n');
}

export function renderDocument({ rows, tasks, today, source }) {
  const inFlight = tasks.length;
  const stageCounts = Object.fromEntries(STAGE_ORDER.map((s) => [s, 0]));
  for (const t of tasks) stageCounts[t.stage] = (stageCounts[t.stage] ?? 0) + 1;
  const stageSummary = STAGE_ORDER
    .filter((s) => stageCounts[s] > 0)
    .map((s) => `${STAGE_LABELS[s]}: ${stageCounts[s]}`)
    .join(' · ') || 'none';

  const header = [
    '# Application Timeline',
    '',
    `Generated: ${today} (source: \`${source}\`)`,
    '',
    `In-flight applications: **${inFlight}** of ${rows.length} tracked rows.`,
    `Stages: ${stageSummary}`,
    '',
    'Closed rows (Rejected, Discarded, SKIP, Evaluated, Accepted) are excluded by default.',
    'See PR #5 (`feat/funnel-metrics`) for the bucket count companion view.',
    '',
    '```mermaid',
  ];
  const block = renderGantt(tasks, { title: `In-flight applications as of ${today}`, today });
  return `${header.join('\n')}\n${block}\n\`\`\`\n`;
}

/**
 * Top-level entry point. Pure with respect to `today` and `writeFile`, so
 * tests can pin both. Returns { outPath, rows, tasks, document }.
 */
export function runTimeline({
  root = process.cwd(),
  outPath: outPathOverride = null,
  today = isoToday(),
  include = null,
  writeFile = true,
} = {}) {
  const trackerPath = join(root, 'data/applications.md');
  const rows = parseTracker(trackerPath);
  const allow = include && include.length > 0 ? include.map((s) => s.toLowerCase()) : DEFAULT_IN_FLIGHT_STATUSES;
  const inFlightRows = rows.filter((r) => isInFlight(r, allow));
  const tasks = inFlightRows.map((r) => buildTask(r, { today }));
  const document = renderDocument({ rows, tasks, today, source: 'data/applications.md' });

  const outPath = outPathOverride ?? join(root, 'out/timeline.md');
  if (writeFile) {
    mkdirSync(join(outPath, '..'), { recursive: true });
    writeFileSync(outPath, document, 'utf-8');
  }
  return { outPath, rows, tasks, document };
}

export function isoToday() {
  const d = new Date();
  const yy = d.getUTCFullYear();
  const mm = String(d.getUTCMonth() + 1).padStart(2, '0');
  const dd = String(d.getUTCDate()).padStart(2, '0');
  return `${yy}-${mm}-${dd}`;
}

export function parseArgs(argv) {
  const args = { root: process.cwd(), out: null, today: null, include: null, stdout: false, help: false };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--root') args.root = argv[++i] ?? process.cwd();
    else if (a === '--out') args.out = argv[++i] ?? null;
    else if (a === '--today') args.today = argv[++i] ?? null;
    else if (a === '--include') args.include = (argv[++i] ?? '').split(',').map((s) => s.trim()).filter(Boolean);
    else if (a === '--stdout') args.stdout = true;
    else if (a === '--help' || a === '-h') args.help = true;
    else if (a.startsWith('--')) {
      const err = new Error(`timeline: unknown flag ${a}`);
      err.code = 'EUSAGE';
      throw err;
    }
  }
  if (args.today && !isIsoDate(args.today)) {
    const err = new Error(`timeline: --today must be YYYY-MM-DD, got "${args.today}"`);
    err.code = 'EUSAGE';
    throw err;
  }
  return args;
}

export const HELP = [
  'Usage: timeline [--root <dir>] [--out <path>] [--today YYYY-MM-DD]',
  '                [--include status1,status2,...] [--stdout]',
  '',
  '  --root      Project root (defaults to cwd). Reads <root>/data/applications.md.',
  '  --out       Output path. Defaults to <root>/out/timeline.md.',
  '  --today     Pin the "today" date used in the chart header and date fallback.',
  '              Useful for reproducible CI snapshots. Defaults to UTC today.',
  '  --include   Comma-separated lowercase statuses to treat as in-flight.',
  '              Default: applied,responded,interview,offer.',
  '  --stdout    Print the markdown document to stdout instead of writing a file.',
  '',
  'Reads the canonical applications tracker and writes a markdown document',
  'containing a Mermaid gantt block. Every in-flight application produces',
  'at least one row in the chart.',
].join('\n');
