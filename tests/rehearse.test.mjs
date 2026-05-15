import { test } from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { readFileSync, mkdtempSync, mkdirSync, writeFileSync, rmSync, readdirSync } from 'node:fs';
import { join, dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { tmpdir } from 'node:os';

const TESTS_DIR = dirname(fileURLToPath(import.meta.url));
const REPO_DIR = resolve(TESTS_DIR, '..');
const CLI = join(REPO_DIR, 'bin/rehearse.mjs');
const FIXTURE = join(REPO_DIR, 'fixtures/mock-recruiter.json');

function run(args, { cwd } = {}) {
  return spawnSync(process.execPath, [CLI, ...args], {
    encoding: 'utf-8',
    cwd: cwd ?? REPO_DIR,
    timeout: 15_000,
  });
}

function freshRoot(prefix = 'rehearse-') {
  return mkdtempSync(join(tmpdir(), prefix));
}

function seedReconBrief(root, slug) {
  const dir = join(root, 'interview-prep');
  mkdirSync(dir, { recursive: true });
  const path = join(dir, `${slug}-recon-2026-05-14.md`);
  const body = [
    `# ${slug} — recon brief`,
    '',
    'Generated: 2026-05-14T00:00:00Z',
    '',
    '## Recent posts',
    '',
    '- 2026-05-10 — [Inference cost roadmap](https://example.com/post)',
    '',
    '## Recent commits',
    '',
    '- 2026-05-12 — `acme/api`: bump rate limiter (`abc1234`)',
    '',
    '## Sources',
    '',
    '- blog: https://example.com/blog',
    '- github: https://api.github.com/orgs/acme/events/public',
    '',
  ].join('\n');
  writeFileSync(path, body, 'utf-8');
  return path;
}

function findRehearsalOutput(root, slug) {
  const dir = join(root, 'interview-prep', slug);
  try {
    const files = readdirSync(dir).filter((f) => f.startsWith('rehearsal-') && f.endsWith('.md'));
    return files.length > 0 ? join(dir, files[0]) : null;
  } catch {
    return null;
  }
}

// ---------------------------------------------------------------------------
// happy path: mock LLM, scripted answers, 5 turns → 10 transcript entries + score
// ---------------------------------------------------------------------------

test('rehearse: happy path produces 5 Q + 5 A entries and a Score block', () => {
  const root = freshRoot();
  try {
    seedReconBrief(root, 'acme-corp');
    const res = run(['--company', 'acme-corp', '--root', root, '--mock', FIXTURE]);
    assert.equal(res.status, 0, `expected exit 0 — stderr: ${res.stderr}\nstdout: ${res.stdout}`);
    const out = findRehearsalOutput(root, 'acme-corp');
    assert.ok(out, 'expected rehearsal markdown under interview-prep/<slug>/');
    const md = readFileSync(out, 'utf-8');

    const qMatches = [...md.matchAll(/^### Q\d+$/gm)];
    const aMatches = [...md.matchAll(/^### A\d+$/gm)];
    assert.equal(qMatches.length, 5, `expected 5 Q headers, got ${qMatches.length}`);
    assert.equal(aMatches.length, 5, `expected 5 A headers, got ${aMatches.length}`);
    assert.equal(qMatches.length + aMatches.length, 10, 'expected 10 total Q/A entries');

    assert.match(md, /^## Score$/m, 'expected "## Score" section');
    assert.match(md, /Total: \d+ \/ \d+/, 'expected total line in score block');
    assert.match(md, /Verdict: /, 'expected verdict line in score block');
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

// ---------------------------------------------------------------------------
// failure path: no recon brief → exit 2 with explanatory stderr
// ---------------------------------------------------------------------------

test('rehearse: missing recon brief exits 2 with "recon brief not found"', () => {
  const root = freshRoot();
  try {
    const res = run(['--company', 'nonexistent-co', '--root', root, '--mock', FIXTURE]);
    assert.equal(res.status, 2, `expected exit 2, got ${res.status}\nstderr: ${res.stderr}`);
    assert.match(res.stderr, /recon brief not found/i);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

// ---------------------------------------------------------------------------
// transcript content sanity: scripted answers are echoed verbatim under A1..A5
// ---------------------------------------------------------------------------

test('rehearse: transcript contains scripted answers and recon source pointer', () => {
  const root = freshRoot();
  try {
    const reconPath = seedReconBrief(root, 'acme-corp');
    const res = run(['--company', 'acme-corp', '--root', root, '--mock', FIXTURE]);
    assert.equal(res.status, 0, `expected exit 0 — stderr: ${res.stderr}`);
    const out = findRehearsalOutput(root, 'acme-corp');
    const md = readFileSync(out, 'utf-8');

    const fixture = JSON.parse(readFileSync(FIXTURE, 'utf-8'));
    for (const ans of fixture.scripted_answers) {
      assert.ok(md.includes(ans.slice(0, 40)), `expected scripted answer fragment in transcript: ${ans.slice(0, 40)}…`);
    }
    assert.ok(md.includes(reconPath), 'expected recon source path in header');
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});
