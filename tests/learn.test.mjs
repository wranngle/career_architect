import { test } from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import {
  readFileSync, writeFileSync, mkdtempSync, mkdirSync, rmSync, existsSync,
} from 'node:fs';
import { join, dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { tmpdir } from 'node:os';

import {
  classifyReason,
  extractKeyTerms,
  parseRejectionEmail,
  mockLlmClient,
  lessonSignature,
  parseLessonsFile,
  renderLessonsFile,
  mergeLesson,
  runLearn,
  parseArgs,
  HELP,
} from '../src/learn-rejection/index.mjs';

const TESTS_DIR = dirname(fileURLToPath(import.meta.url));
const REPO_DIR = resolve(TESTS_DIR, '..');
const CLI = join(REPO_DIR, 'bin/learn-rejection.mjs');
const SEED_LESSONS = join(REPO_DIR, 'data/lessons.md');

function freshRoot(prefix = 'learn-') {
  return mkdtempSync(join(tmpdir(), prefix));
}

function writeEmail(root, name, body) {
  const p = join(root, name);
  writeFileSync(p, body, 'utf-8');
  return p;
}

function run(args, { cwd } = {}) {
  return spawnSync(process.execPath, [CLI, ...args], {
    encoding: 'utf-8',
    cwd: cwd ?? REPO_DIR,
    timeout: 15_000,
  });
}

const SOC2_EMAIL = `# Decision on your Senior Platform Engineer application

Company: Vault Health
Role: Senior Platform Engineer
Date: 2026-05-10

Hi Cody,

Thanks for taking the time to interview with Vault Health. After review,
the hiring committee decided to move forward with another candidate.

Our customers operate under strict healthcare data rules, and the role
requires hands-on experience shipping infrastructure inside a SOC 2 Type II
audited environment. The committee felt your prior environments did not
demonstrate that compliance background.

Best,
Dana
`;

// ---------------------------------------------------------------------------
// CENTRAL PROMISE
// A sample rejection mentioning SOC 2 → new bullet in lessons.md mentioning SOC 2.
// ---------------------------------------------------------------------------

test('central promise: SOC 2 rejection produces a new lessons.md bullet citing SOC 2', () => {
  const root = freshRoot();
  try {
    mkdirSync(join(root, 'data'), { recursive: true });
    const emailPath = writeEmail(root, 'reject-vault.md', SOC2_EMAIL);

    const res = run([emailPath, '--root', root, '--today', '2026-05-11']);
    assert.equal(res.status, 0, `stdout=${res.stdout}\nstderr=${res.stderr}`);

    const lessonsPath = join(root, 'data/lessons.md');
    assert.ok(existsSync(lessonsPath), 'lessons.md should be written');
    const out = readFileSync(lessonsPath, 'utf-8');

    assert.match(out, /SOC ?2/, 'lessons.md must mention SOC 2 verbatim');
    assert.match(out, /\[compliance\]/, 'new bullet must be classified as compliance');
    assert.match(out, /Vault Health/, 'company name must appear in the bullet');
    assert.match(out, /2026-05-11/, 'today date must stamp the new bullet');
    assert.match(out, /lessons_version: 1/);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

// ---------------------------------------------------------------------------
// Edge: classifier behavior
// ---------------------------------------------------------------------------

test('classifier: SOC 2 routes to compliance, not qualification_gap', () => {
  assert.equal(classifyReason('We need SOC 2 Type II background.'), 'compliance');
  assert.equal(classifyReason('Candidate lacked SOC 2 experience.'), 'compliance');
});

test('classifier: seniority phrasing routes to seniority', () => {
  assert.equal(classifyReason('We were looking for a more senior candidate'), 'seniority');
  assert.equal(classifyReason('Hiring for staff-level only.'), 'seniority');
});

test('classifier: compensation phrasing routes to compensation', () => {
  assert.equal(classifyReason('Your range is outside our budget for this role'), 'compensation');
});

test('classifier: location phrasing routes to location', () => {
  assert.equal(classifyReason('This role is onsite in NYC.'), 'location');
});

test('classifier: industry-fit phrasing routes to industry_fit', () => {
  assert.equal(
    classifyReason('We are looking for someone with specific industry experience in fintech.'),
    'industry_fit',
  );
});

test('classifier: vague rejection routes to other', () => {
  assert.equal(
    classifyReason('Thanks for your time. We have decided to go in a different direction.'),
    'other',
  );
});

test('extractKeyTerms: pulls SOC 2 verbatim including spacing variants', () => {
  assert.deepEqual(extractKeyTerms('We need SOC 2 audited stack.', 'compliance'), ['SOC 2']);
  assert.deepEqual(extractKeyTerms('Our SOC2 program requires this.', 'compliance'), ['SOC2']);
});

// ---------------------------------------------------------------------------
// Edge: email parser
// ---------------------------------------------------------------------------

test('parseRejectionEmail: extracts subject + Company/Role/Date metadata', () => {
  const parsed = parseRejectionEmail(SOC2_EMAIL);
  assert.equal(parsed.subject, 'Decision on your Senior Platform Engineer application');
  assert.equal(parsed.company, 'Vault Health');
  assert.equal(parsed.role, 'Senior Platform Engineer');
  assert.equal(parsed.date, '2026-05-10');
  assert.ok(parsed.body.includes('SOC 2'), 'body should retain SOC 2 text');
});

test('parseRejectionEmail: falls back gracefully when context is missing', () => {
  const parsed = parseRejectionEmail('We decided to pass. Thanks.');
  assert.equal(parsed.company, '(unknown)');
  assert.equal(parsed.role, '(unknown)');
  assert.equal(parsed.subject, '(no subject)');
});

// ---------------------------------------------------------------------------
// Edge: lessons file round-trip
// ---------------------------------------------------------------------------

test('lessons file round-trip: parse(render(x)) preserves bullets and sigs', () => {
  const lessons = [
    {
      kind: 'compliance',
      date: '2026-05-11',
      company: 'Vault Health',
      sentence: 'Vault Health declined citing SOC 2.',
      sig: 'compliance|soc 2',
    },
    {
      kind: 'location',
      date: '2026-04-08',
      company: 'Mariner Cloud',
      sentence: 'Mariner Cloud declined on location (onsite).',
      sig: 'location|onsite',
    },
  ];
  const doc = renderLessonsFile({ lessons, generatedAt: '2026-05-11T00:00:00.000Z' });
  const parsed = parseLessonsFile(doc);
  assert.equal(parsed.lessons.length, 2);
  assert.equal(parsed.lessons[0].sig, 'compliance|soc 2');
  assert.equal(parsed.lessons[0].sentence, 'Vault Health declined citing SOC 2.');
});

test('seed lessons.md: ships parseable and references funnel-metrics feature #5', () => {
  const text = readFileSync(SEED_LESSONS, 'utf-8');
  const parsed = parseLessonsFile(text);
  assert.ok(parsed.lessons.length >= 2, 'seed must ship with example lessons');
  assert.match(text, /funnel-metrics/i, 'seed must cite the funnel-metrics feature');
  assert.match(text, /feature #5/, 'seed must cite feature index 5');
  for (const l of parsed.lessons) {
    assert.ok(l.sig, `lesson "${l.sentence}" must carry a sig`);
  }
});

// ---------------------------------------------------------------------------
// Edge: dedup / merge semantics
// ---------------------------------------------------------------------------

test('mergeLesson: identical-signature rejection updates date instead of duplicating', () => {
  const initial = mergeLesson([], {
    kind: 'compliance',
    company: 'Acme Co',
    sentence: 'Acme Co declined citing SOC 2; lead with SOC 2 experience.',
    terms: ['SOC 2'],
  }, '2026-04-01');
  assert.equal(initial.added, true);
  assert.equal(initial.lessons.length, 1);

  const second = mergeLesson(initial.lessons, {
    kind: 'compliance',
    company: 'Acme Co',
    sentence: 'Acme Co declined citing SOC 2; lead with SOC 2 experience.',
    terms: ['SOC 2'],
  }, '2026-05-11');
  assert.equal(second.added, false, 'second rejection with same sig must merge, not add');
  assert.equal(second.lessons.length, 1, 'should still be a single bullet');
  assert.equal(second.lessons[0].date, '2026-05-11', 'date must update to latest');
});

test('mergeLesson: different-signature lessons coexist, newest first', () => {
  const a = mergeLesson([], {
    kind: 'location', company: 'A', terms: ['onsite'],
    sentence: 'A declined on location.',
  }, '2026-04-01');
  const b = mergeLesson(a.lessons, {
    kind: 'compliance', company: 'B', terms: ['SOC 2'],
    sentence: 'B declined citing SOC 2.',
  }, '2026-05-01');
  assert.equal(b.lessons.length, 2);
  assert.equal(b.lessons[0].kind, 'compliance', 'newer lesson first');
  assert.equal(b.lessons[1].kind, 'location');
});

test('runLearn: second SOC 2 rejection from same company merges instead of duplicating', () => {
  const root = freshRoot();
  try {
    mkdirSync(join(root, 'data'), { recursive: true });
    const emailPath = writeEmail(root, 'reject-vault.md', SOC2_EMAIL);
    const first = run([emailPath, '--root', root, '--today', '2026-05-11']);
    assert.equal(first.status, 0);
    const second = run([emailPath, '--root', root, '--today', '2026-05-20']);
    assert.equal(second.status, 0);
    const out = readFileSync(join(root, 'data/lessons.md'), 'utf-8');
    const parsed = parseLessonsFile(out);
    const soc2 = parsed.lessons.filter((l) => /SOC ?2/.test(l.sentence));
    assert.equal(soc2.length, 1, 'duplicate SOC 2 rejection must not add a second bullet');
    assert.equal(soc2[0].date, '2026-05-20', 'date must update on merge');
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

// ---------------------------------------------------------------------------
// Edge: mock LLM is deterministic & offline
// ---------------------------------------------------------------------------

test('mockLlmClient: deterministic across calls and offline', () => {
  const client = mockLlmClient();
  const parsed = parseRejectionEmail(SOC2_EMAIL);
  const a = client.extractLesson(parsed);
  const b = client.extractLesson(parsed);
  assert.deepEqual(a, b);
  assert.equal(a.kind, 'compliance');
  assert.ok(a.terms.some((t) => /SOC ?2/i.test(t)));
});

// ---------------------------------------------------------------------------
// Edge: CLI exit codes and dry-run safety
// ---------------------------------------------------------------------------

test('cli: unknown flag exits 2 and prints HELP', () => {
  const res = run(['--nope', 'x.md']);
  assert.equal(res.status, 2);
  assert.match(res.stderr, /unknown flag --nope/);
  assert.match(res.stderr, /Usage: learn-rejection/);
});

test('cli: missing email argument exits 2 and prints HELP', () => {
  const res = run([]);
  assert.equal(res.status, 2);
  assert.match(res.stderr, /missing required <rejection.md>/);
});

test('cli: missing email file exits 1', () => {
  const root = freshRoot();
  try {
    const res = run([join(root, 'nope.md'), '--root', root]);
    assert.equal(res.status, 1);
    assert.match(res.stderr, /email file not found/);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test('cli: --stdout writes no file (dry-run safety)', () => {
  const root = freshRoot();
  try {
    mkdirSync(join(root, 'data'), { recursive: true });
    const emailPath = writeEmail(root, 'r.md', SOC2_EMAIL);
    const res = run([emailPath, '--root', root, '--today', '2026-05-11', '--stdout']);
    assert.equal(res.status, 0);
    assert.match(res.stdout, /SOC ?2/);
    assert.equal(
      existsSync(join(root, 'data/lessons.md')),
      false,
      '--stdout must not write the lessons file',
    );
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test('cli: --help exits 0 and prints usage', () => {
  const res = run(['--help']);
  assert.equal(res.status, 0);
  assert.match(res.stdout, /Usage: learn-rejection/);
});

// ---------------------------------------------------------------------------
// Edge: arg parsing in isolation
// ---------------------------------------------------------------------------

test('parseArgs: basic positional + flags', () => {
  const a = parseArgs(['email.md', '--root', '/x', '--today', '2026-05-11']);
  assert.equal(a.email, 'email.md');
  assert.equal(a.root, '/x');
  assert.equal(a.today, '2026-05-11');
});

test('parseArgs: unknown flag throws EUSAGE', () => {
  assert.throws(() => parseArgs(['--bogus']), (e) => e.code === 'EUSAGE');
});

test('HELP: documents core flags', () => {
  assert.match(HELP, /<rejection\.md>/);
  assert.match(HELP, /--root/);
  assert.match(HELP, /--lessons/);
  assert.match(HELP, /--stdout/);
});
