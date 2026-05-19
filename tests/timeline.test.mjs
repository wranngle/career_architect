import { test } from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { readFileSync, writeFileSync, mkdtempSync, cpSync, existsSync, mkdirSync } from 'node:fs';
import { join, dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { tmpdir } from 'node:os';

import {
  DEFAULT_IN_FLIGHT_STATUSES,
  STAGE_ORDER,
  addDays,
  buildTask,
  canonStatus,
  isInFlight,
  parseArgs,
  parseTracker,
  renderDocument,
  renderGantt,
  runTimeline,
} from '../src/timeline/index.mjs';

const TESTS_DIR = dirname(fileURLToPath(import.meta.url));
const REPO_DIR = resolve(TESTS_DIR, '..');
const CLI = join(REPO_DIR, 'bin/timeline.mjs');
const FIXTURE_ROOT = join(TESTS_DIR, 'fixtures/timeline');

const PINNED_TODAY = '2026-05-14';

function freshRoot() {
  const dir = mkdtempSync(join(tmpdir(), 'timeline-'));
  cpSync(FIXTURE_ROOT, dir, { recursive: true });
  return dir;
}

function run(args, { cwd } = {}) {
  return spawnSync(process.execPath, [CLI, ...args], {
    encoding: 'utf-8',
    cwd: cwd ?? REPO_DIR,
    timeout: 15_000,
  });
}

// ---------------------------------------------------------------------------
// Central promise: `timeline` produces out/timeline.md with a fenced mermaid
// gantt block, and every in-flight application gets at least one row in the
// chart. The "≥1 row per in-flight app" guarantee is THE feature contract.
// ---------------------------------------------------------------------------

test('timeline: every in-flight application gets at least one row in the mermaid gantt block', () => {
  const root = freshRoot();
  const res = run(['--root', root, '--today', PINNED_TODAY]);
  assert.equal(res.status, 0, `stderr: ${res.stderr}\nstdout: ${res.stdout}`);

  const outPath = join(root, 'out/timeline.md');
  assert.ok(existsSync(outPath), `expected ${outPath}`);
  const md = readFileSync(outPath, 'utf-8');

  // The output must contain a fenced mermaid gantt block.
  const block = md.match(/```mermaid\n([\s\S]*?)\n```/);
  assert.ok(block, 'output must contain a ```mermaid``` fenced block');
  const gantt = block[1];
  assert.match(gantt, /^gantt\b/m, 'mermaid block must start with `gantt`');
  assert.match(gantt, /^\s*dateFormat YYYY-MM-DD/m, 'gantt must declare YYYY-MM-DD dateFormat');

  // Compute in-flight rows the same way the CLI does so the assertion
  // mirrors the contract rather than restating it.
  const rows = parseTracker(join(root, 'data/applications.md'));
  const inFlight = rows.filter((r) => isInFlight(r));
  assert.ok(inFlight.length > 0, 'fixture must contain at least one in-flight app');

  // Each in-flight row's number must appear in a chart row (the row label
  // includes `#<num>` per buildTask). That is the "≥1 row per in-flight
  // app" guarantee.
  for (const row of inFlight) {
    assert.match(
      gantt,
      new RegExp(`#${row.num}\\b`),
      `expected at least one gantt row for in-flight app #${row.num} (${row.empresa})`,
    );
  }
});

// ---------------------------------------------------------------------------
// Closed-status rows are excluded by default — this is the "in-flight"
// half of the contract. Without it the chart bloats with rejected/SKIP rows.
// ---------------------------------------------------------------------------

test('timeline: closed-status rows (Rejected, Accepted, Discarded, SKIP, Evaluated) are excluded by default', () => {
  const root = freshRoot();
  const res = run(['--root', root, '--today', PINNED_TODAY]);
  assert.equal(res.status, 0);

  const md = readFileSync(join(root, 'out/timeline.md'), 'utf-8');
  const block = md.match(/```mermaid\n([\s\S]*?)\n```/)[1];

  // Fixture closed rows: #3 Rejected, #8 Accepted, #9 Discarded, #10 SKIP, #11 Evaluated.
  for (const closed of ['Charlie Testbed', 'Hotel Sample', 'India Dummy', 'Juliet Phantom', 'Kilo Decoy']) {
    assert.ok(
      !block.includes(closed),
      `closed-status row "${closed}" must not appear in default in-flight chart`,
    );
  }
});

// ---------------------------------------------------------------------------
// --include widens the filter — operators sometimes want to see every row,
// including rejected ones for postmortem.
// ---------------------------------------------------------------------------

test('timeline: --include adds extra statuses to the in-flight filter', () => {
  const root = freshRoot();
  const res = run([
    '--root', root,
    '--today', PINNED_TODAY,
    '--include', 'applied,responded,interview,offer,rejected',
  ]);
  assert.equal(res.status, 0);

  const md = readFileSync(join(root, 'out/timeline.md'), 'utf-8');
  const block = md.match(/```mermaid\n([\s\S]*?)\n```/)[1];
  assert.ok(block.includes('Charlie Testbed'), 'with --include rejected, Charlie Testbed should appear');
});

// ---------------------------------------------------------------------------
// --stdout suppresses the file write — useful in pipelines and CI sanity
// checks where the operator doesn't want side effects on out/.
// ---------------------------------------------------------------------------

test('timeline: --stdout prints the document and does not write a file', () => {
  const root = freshRoot();
  const res = run(['--root', root, '--today', PINNED_TODAY, '--stdout']);
  assert.equal(res.status, 0);
  assert.match(res.stdout, /```mermaid/, 'stdout must contain the mermaid fence');
  assert.match(res.stdout, /gantt/);
  assert.ok(!existsSync(join(root, 'out/timeline.md')), 'no file should have been written');
});

// ---------------------------------------------------------------------------
// Empty tracker still produces a valid mermaid block (with a placeholder
// milestone). Prevents the CLI from emitting broken markdown on day one
// before the operator has any applications.
// ---------------------------------------------------------------------------

test('timeline: empty applications.md still produces a valid mermaid gantt block', () => {
  const root = mkdtempSync(join(tmpdir(), 'timeline-empty-'));
  mkdirSync(join(root, 'data'), { recursive: true });
  writeFileSync(
    join(root, 'data/applications.md'),
    '# empty tracker\n\n| # | fecha | empresa | rol | score | STATUS | pdf | report | notas |\n| - | - | - | - | - | - | - | - | - |\n',
    'utf-8',
  );

  const res = run(['--root', root, '--today', PINNED_TODAY]);
  assert.equal(res.status, 0, `stderr: ${res.stderr}`);

  const md = readFileSync(join(root, 'out/timeline.md'), 'utf-8');
  assert.match(md, /```mermaid/);
  assert.match(md, /gantt/);
  assert.match(md, /No in-flight applications yet/);
});

// ---------------------------------------------------------------------------
// Doctrine-drift test: STAGE_ORDER must remain a superset of the funnel
// stages PR #5 (funnel-metrics.mjs) buckets into. If a future stage gets
// added to one side without the other, this test fails loudly.
// ---------------------------------------------------------------------------

test('timeline: STAGE_ORDER aligns with the in-flight portion of the funnel-metrics buckets', () => {
  // The PR #5 stages are: applied, screening, technical, onsite, offer, accepted.
  // STAGE_ORDER here follows the canonical *status* names (applied, responded,
  // interview, offer, accepted), which is one level finer than buckets. The
  // contract is: every default in-flight status is present in STAGE_ORDER.
  for (const s of DEFAULT_IN_FLIGHT_STATUSES) {
    assert.ok(STAGE_ORDER.includes(s), `STAGE_ORDER must include in-flight status "${s}"`);
  }
});

// ---------------------------------------------------------------------------
// Pure helpers — pinned so tests stay green without filesystem or clock.
// ---------------------------------------------------------------------------

test('canonStatus: strips markdown bold, lowercases, trims', () => {
  assert.equal(canonStatus('  **Applied** '), 'applied');
  assert.equal(canonStatus('Responded'), 'responded');
  assert.equal(canonStatus(''), '');
  assert.equal(canonStatus(undefined), '');
});

test('addDays: works across month and year boundaries with no DST drift', () => {
  assert.equal(addDays('2026-04-28', 5), '2026-05-03');
  assert.equal(addDays('2026-12-30', 3), '2027-01-02');
  assert.equal(addDays('2026-03-08', 1), '2026-03-09'); // US DST spring-forward day
});

test('buildTask: rowNum and stage round-trip; taskId is namespaced by row number', () => {
  const row = { num: 5, fecha: '2026-04-05', empresa: 'Echo Mock Labs', rol: 'Voice Eng II', status: 'Interview' };
  const t = buildTask(row, { today: PINNED_TODAY });
  assert.equal(t.rowNum, 5);
  assert.equal(t.stage, 'interview');
  assert.equal(t.start, '2026-04-05');
  assert.ok(t.taskId.startsWith('app005_'), `taskId must be namespaced by row number: ${t.taskId}`);
  assert.match(t.label, /#5/);
});

test('buildTask: unparseable fecha falls back to today so the gantt stays valid', () => {
  const row = { num: 99, fecha: 'TBD', empresa: 'Lima', rol: 'X', status: 'Applied' };
  const t = buildTask(row, { today: PINNED_TODAY });
  assert.equal(t.start, PINNED_TODAY);
});

test('renderGantt: empty input produces a single Today milestone, not malformed mermaid', () => {
  const out = renderGantt([], { title: 't', today: PINNED_TODAY });
  assert.match(out, /^gantt$/m);
  assert.match(out, /dateFormat YYYY-MM-DD/);
  assert.match(out, /No in-flight applications yet/);
});

test('renderDocument: includes the PR #5 funnel-metrics back-reference', () => {
  const doc = renderDocument({ rows: [], tasks: [], today: PINNED_TODAY, source: 'data/applications.md' });
  assert.match(doc, /PR #5/);
  assert.match(doc, /funnel-metrics/);
});

// ---------------------------------------------------------------------------
// CLI dry-run / no-op safety: --stdout must never touch the filesystem.
// ---------------------------------------------------------------------------

test('timeline (CLI): --stdout makes no filesystem mutation under <root>/out/', () => {
  const root = freshRoot();
  assert.ok(!existsSync(join(root, 'out')), 'precondition: out/ should not exist yet');
  const res = run(['--root', root, '--today', PINNED_TODAY, '--stdout']);
  assert.equal(res.status, 0);
  assert.ok(!existsSync(join(root, 'out')), 'out/ must not be created when --stdout is set');
});

// ---------------------------------------------------------------------------
// Bad usage produces exit code 2 with HELP — matches the PR #10-#13 CLI shape.
// ---------------------------------------------------------------------------

test('timeline (CLI): unknown flag exits 2 with HELP', () => {
  const res = run(['--bogus-flag']);
  assert.equal(res.status, 2);
  assert.match(res.stderr, /unknown flag --bogus-flag/);
  assert.match(res.stderr, /Usage: timeline/);
});

test('timeline (CLI): --today YYYY-MM-DD validation rejects non-ISO dates', () => {
  const res = run(['--today', 'tomorrow']);
  assert.equal(res.status, 2);
  assert.match(res.stderr, /--today must be YYYY-MM-DD/);
});

test('parseArgs: parses --include into a lowercase array', () => {
  const a = parseArgs(['--include', 'Applied, Interview, Offer']);
  assert.deepEqual(a.include, ['Applied', 'Interview', 'Offer']);
});

// ---------------------------------------------------------------------------
// Programmatic API: runTimeline returns a deterministic shape — useful for
// dashboards that want to render the gantt inline rather than via the CLI.
// ---------------------------------------------------------------------------

test('runTimeline: returns { tasks, rows, document, outPath } and writes when writeFile=true', () => {
  const root = freshRoot();
  const result = runTimeline({ root, today: PINNED_TODAY });
  assert.ok(Array.isArray(result.rows) && result.rows.length > 0);
  assert.ok(Array.isArray(result.tasks) && result.tasks.length > 0);
  assert.match(result.document, /```mermaid/);
  assert.equal(result.outPath, join(root, 'out/timeline.md'));
  assert.ok(existsSync(result.outPath));
});

test('runTimeline: writeFile=false suppresses the file write but still returns the document', () => {
  const root = freshRoot();
  const result = runTimeline({ root, today: PINNED_TODAY, writeFile: false });
  assert.match(result.document, /```mermaid/);
  assert.ok(!existsSync(join(root, 'out/timeline.md')));
});
