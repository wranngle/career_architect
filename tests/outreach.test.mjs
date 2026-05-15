import { test } from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { readFileSync, mkdtempSync, writeFileSync, existsSync } from 'node:fs';
import { join, dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { tmpdir } from 'node:os';

import {
  composeMessage,
  parsePerson,
  parseJd,
  pickSignal,
  runOutreach,
  signalAnchorPhrase,
  MAX_MESSAGE_CHARS,
} from '../src/outreach/index.mjs';

const TESTS_DIR = dirname(fileURLToPath(import.meta.url));
const REPO_DIR = resolve(TESTS_DIR, '..');
const CLI = join(REPO_DIR, 'bin/outreach.mjs');
const PERSON_FIXTURE = join(REPO_DIR, 'fixtures/person-sample.json');
const JD_FIXTURE = join(REPO_DIR, 'fixtures/jd-sample-outreach.json');

function freshRoot(prefix = 'outreach-') {
  return mkdtempSync(join(tmpdir(), prefix));
}

function run(args, { cwd } = {}) {
  return spawnSync(process.execPath, [CLI, ...args], {
    encoding: 'utf-8',
    cwd: cwd ?? REPO_DIR,
    timeout: 15_000,
  });
}

// ---------------------------------------------------------------------------
// central promise: outreach <person.json> <jd.json> emits a single string
// ≤500 chars that contains the recipient's first name AND one specific signal
// (verbatim) from the person JSON. This is THE feature contract per the
// round-2 plan; everything else defends the edges.
// ---------------------------------------------------------------------------

test('outreach: stdout is a single ≤500-char message containing first name and one signal anchor verbatim', () => {
  const res = run([PERSON_FIXTURE, JD_FIXTURE]);
  assert.equal(res.status, 0, `expected exit 0 — stderr: ${res.stderr}\nstdout: ${res.stdout}`);

  const message = res.stdout.replace(/\n$/, ''); // strip CLI trailing newline
  assert.ok(message.length > 0, 'message must be non-empty');
  assert.ok(message.length <= MAX_MESSAGE_CHARS,
    `message must be ≤${MAX_MESSAGE_CHARS} chars; got ${message.length}`);

  const person = JSON.parse(readFileSync(PERSON_FIXTURE, 'utf-8'));
  assert.ok(message.includes(person.first_name),
    `message must contain recipient first name "${person.first_name}"; got: ${message}`);

  // Specific-signal contract: at least one of the person's signals must
  // appear verbatim in the message via its title/repo/url anchor.
  const anchors = person.signals
    .map((s) => signalAnchorPhrase(s))
    .filter((a) => a.length > 0);
  const found = anchors.find((a) => message.includes(a));
  assert.ok(found,
    `message must cite one specific signal from person.signals[]; ` +
    `none of ${JSON.stringify(anchors)} appears in: ${message}`);
});

// ---------------------------------------------------------------------------
// edge: signal ranking is stable and deterministic — most-recent wins
// ---------------------------------------------------------------------------

test('outreach: pickSignal selects the most-recent signal (article 2026-05-09 over talk and github)', () => {
  const person = parsePerson(readFileSync(PERSON_FIXTURE, 'utf-8'));
  const picked = pickSignal(person.signals);
  assert.equal(picked.kind, 'article');
  assert.equal(picked.title, 'Why we shipped our agent evals before our agents');
});

test('outreach: pickSignal kind-priority tiebreak prefers article > talk > github when dates tie', () => {
  const signals = [
    { kind: 'github', repo: 'a/b', last_active: '2026-05-01' },
    { kind: 'talk', title: 'Tie talk', published_at: '2026-05-01' },
    { kind: 'article', title: 'Tie article', published_at: '2026-05-01' },
  ];
  const picked = pickSignal(signals);
  assert.equal(picked.kind, 'article');
  assert.equal(picked.title, 'Tie article');
});

// ---------------------------------------------------------------------------
// edge: composeMessage is pure and respects the 500-char cap even with a
// pathologically long signal title (degrades gracefully without dropping
// the recipient name or the ask).
// ---------------------------------------------------------------------------

test('outreach: composeMessage caps at MAX_MESSAGE_CHARS even when signal title is huge', () => {
  const giantTitle = 'x'.repeat(2000);
  const person = { first_name: 'Sam', last_name: 'Test', signals: [] };
  const jd = { title: 'Engineer', company: 'Acme' };
  const signal = { kind: 'article', title: giantTitle, published_at: '2026-05-01' };
  const msg = composeMessage({ person, jd, signal });
  assert.ok(msg.length <= MAX_MESSAGE_CHARS, `got ${msg.length} chars`);
  assert.ok(msg.startsWith('Hi Sam,'), 'message must still open with the recipient name');
  assert.match(msg, /15-min call/, 'message must still end with the ask');
});

// ---------------------------------------------------------------------------
// edge: --write flag persists to a file with parseable frontmatter
// ---------------------------------------------------------------------------

test('outreach: --write persists the message to <root>/out/ with frontmatter', () => {
  const root = freshRoot();
  const res = run([PERSON_FIXTURE, JD_FIXTURE, '--write', '--root', root]);
  assert.equal(res.status, 0, `stderr: ${res.stderr}`);

  // The CLI logs the written path on stderr.
  const m = /outreach: wrote (.+?) \(\d+ chars\)/.exec(res.stderr);
  assert.ok(m, `expected "wrote ..." log line; stderr: ${res.stderr}`);
  const outPath = m[1];
  assert.ok(existsSync(outPath), `expected file at ${outPath}`);

  const written = readFileSync(outPath, 'utf-8');
  assert.match(written, /^---\n[\s\S]*?\n---\n/, 'output must have YAML frontmatter');
  assert.match(written, /^recipient: Priya/m);
  assert.match(written, /^role: Staff AI Reliability Engineer/m);
  assert.match(written, /^signal_kind: article/m);
});

// ---------------------------------------------------------------------------
// edge: invalid input paths produce useful exit codes
// ---------------------------------------------------------------------------

test('outreach: missing person file exits 2 with `person file not found`', () => {
  const root = freshRoot();
  const missing = join(root, 'nope-person.json');
  const res = run([missing, JD_FIXTURE, '--root', root]);
  assert.equal(res.status, 2);
  assert.match(res.stderr, /person file not found/);
});

test('outreach: missing jd file exits 2 with `jd file not found`', () => {
  const root = freshRoot();
  const missing = join(root, 'nope-jd.json');
  const res = run([PERSON_FIXTURE, missing, '--root', root]);
  assert.equal(res.status, 2);
  assert.match(res.stderr, /jd file not found/);
});

test('outreach: person without first_name exits 2', () => {
  const root = freshRoot();
  const bad = join(root, 'no-name.json');
  writeFileSync(bad, JSON.stringify({ signals: [{ kind: 'article', title: 'x' }] }), 'utf-8');
  const res = run([bad, JD_FIXTURE, '--root', root]);
  assert.equal(res.status, 2);
  assert.match(res.stderr, /first_name is required/);
});

test('outreach: person with empty signals[] exits 2', () => {
  const root = freshRoot();
  const bad = join(root, 'no-signals.json');
  writeFileSync(bad, JSON.stringify({ first_name: 'X', signals: [] }), 'utf-8');
  const res = run([bad, JD_FIXTURE, '--root', root]);
  assert.equal(res.status, 2);
  assert.match(res.stderr, /signals must be a non-empty array/);
});

test('outreach: jd without title exits 2', () => {
  const root = freshRoot();
  const bad = join(root, 'no-title.json');
  writeFileSync(bad, JSON.stringify({ company: 'X' }), 'utf-8');
  const res = run([PERSON_FIXTURE, bad, '--root', root]);
  assert.equal(res.status, 2);
  assert.match(res.stderr, /jd\.title is required/);
});

test('outreach: invalid JSON on person side exits 2', () => {
  const root = freshRoot();
  const bad = join(root, 'bad.json');
  writeFileSync(bad, '{not json', 'utf-8');
  const res = run([bad, JD_FIXTURE, '--root', root]);
  assert.equal(res.status, 2);
  assert.match(res.stderr, /person JSON is not valid JSON/);
});

test('outreach: --help prints usage and exits 0', () => {
  const res = run(['--help']);
  assert.equal(res.status, 0);
  assert.match(res.stdout, /Usage: outreach <person\.json> <jd\.json>/);
});

test('outreach: unknown flag exits 2', () => {
  const res = run(['--frobnicate']);
  assert.equal(res.status, 2);
  assert.match(res.stderr, /unknown flag --frobnicate/);
});

// ---------------------------------------------------------------------------
// dry-run / no-op: default invocation (no --write) MUST NOT write any file
// ---------------------------------------------------------------------------

test('outreach: default invocation does not write any file (dry by default)', async () => {
  const root = freshRoot();
  const result = await runOutreach({
    personPath: PERSON_FIXTURE,
    jdPath: JD_FIXTURE,
    root,
    outDirOverride: null,
    writeFile: false,
  });
  assert.equal(result.outPath, null, 'outPath must be null when writeFile is false');
  // out/ should not exist after a writeFile:false call.
  assert.equal(existsSync(join(root, 'out')), false,
    'no out/ directory should be created when writeFile is false');
});

// ---------------------------------------------------------------------------
// programmatic API: runOutreach returns the rendered message + picked signal
// ---------------------------------------------------------------------------

test('outreach: runOutreach returns message + signal + null outPath when not writing', async () => {
  const root = freshRoot();
  const result = await runOutreach({
    personPath: PERSON_FIXTURE,
    jdPath: JD_FIXTURE,
    root,
    outDirOverride: null,
    writeFile: false,
  });
  assert.ok(result.message);
  assert.ok(result.message.length <= MAX_MESSAGE_CHARS);
  assert.equal(result.signal.kind, 'article');
  assert.equal(result.outPath, null);
});
