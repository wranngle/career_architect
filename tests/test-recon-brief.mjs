import { test } from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { readFileSync, readdirSync, mkdtempSync, rmSync, existsSync } from 'node:fs';
import { join, dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { tmpdir } from 'node:os';

const TESTS_DIR = dirname(fileURLToPath(import.meta.url));
const REPO_DIR = resolve(TESTS_DIR, '..');
const SCRIPT = join(REPO_DIR, 'recon-brief.mjs');
const FIXTURES = join(TESTS_DIR, 'fixtures/recon-brief');
const EMPTY_FIXTURES = join(TESTS_DIR, 'fixtures/recon-brief-empty');

function run(args) {
  return spawnSync(process.execPath, [SCRIPT, ...args], {
    encoding: 'utf-8',
    timeout: 15_000,
  });
}

function freshRoot(prefix = 'recon-brief-') {
  return mkdtempSync(join(tmpdir(), prefix));
}

function findOutput(root, company) {
  const dir = join(root, 'interview-prep');
  if (!existsSync(dir)) return null;
  const slug = company.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
  const match = readdirSync(dir).find((f) => f.startsWith(`${slug}-recon-`) && f.endsWith('.md'));
  return match ? join(dir, match) : null;
}

test('recon-brief: writes interview-prep/<slug>-recon-<date>.md with required section headers', () => {
  const root = freshRoot();
  try {
    const res = run(['Acme Corp', '--root', root, '--fixtures', FIXTURES]);
    assert.equal(res.status, 0, `expected exit 0, got ${res.status}\nstderr: ${res.stderr}`);
    const out = findOutput(root, 'Acme Corp');
    assert.ok(out, 'expected an output markdown file under interview-prep/');
    const md = readFileSync(out, 'utf-8');
    assert.match(md, /^# Acme Corp — recon brief$/m, 'expected H1 title');
    assert.match(md, /^## Recent posts$/m, 'expected "## Recent posts" section');
    assert.match(md, /^## Recent commits$/m, 'expected "## Recent commits" section');
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test('recon-brief: extracts posts and commits from fixture bodies (non-empty content)', () => {
  const root = freshRoot();
  try {
    const res = run(['Acme', '--root', root, '--fixtures', FIXTURES]);
    assert.equal(res.status, 0);
    const out = findOutput(root, 'Acme');
    const md = readFileSync(out, 'utf-8');
    // Each fixture entry should surface as a bullet under its section.
    assert.match(md, /How we cut p95 latency by 38%/, 'expected post title in output');
    assert.match(md, /acme\/ingestion-core/, 'expected repo name from PushEvent in output');
    assert.match(md, /batch-coalesce small writes/, 'expected commit message in output');
    // PushEvent-only filter: WatchEvent on docs-site should NOT appear in commits.
    const commitsSection = md.split('## Recent commits')[1]?.split('## Sources')[0] ?? '';
    assert.ok(!/docs-site/.test(commitsSection), 'docs-site WatchEvent must be filtered out of commits');
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test('recon-brief: missing fixtures degrade gracefully with placeholder sections (still exit 0)', () => {
  const root = freshRoot();
  try {
    const res = run(['Empty Co', '--root', root, '--fixtures', EMPTY_FIXTURES]);
    assert.equal(res.status, 0, `expected exit 0, got ${res.status}\nstderr: ${res.stderr}`);
    const out = findOutput(root, 'Empty Co');
    const md = readFileSync(out, 'utf-8');
    assert.match(md, /^## Recent posts$/m);
    assert.match(md, /^## Recent commits$/m);
    assert.match(md, /No posts collected/);
    assert.match(md, /No commits collected/);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test('recon-brief: --limit caps section entries', () => {
  const root = freshRoot();
  try {
    const res = run(['Acme', '--root', root, '--fixtures', FIXTURES, '--limit', '1']);
    assert.equal(res.status, 0);
    const out = findOutput(root, 'Acme');
    const md = readFileSync(out, 'utf-8');
    const postsSection = md.split('## Recent posts')[1]?.split('## Recent commits')[0] ?? '';
    const commitsSection = md.split('## Recent commits')[1]?.split('## Sources')[0] ?? '';
    const postBullets = postsSection.split('\n').filter((l) => l.startsWith('- ')).length;
    const commitBullets = commitsSection.split('\n').filter((l) => l.startsWith('- ')).length;
    assert.equal(postBullets, 1, 'expected exactly 1 post bullet with --limit 1');
    assert.equal(commitBullets, 1, 'expected exactly 1 commit bullet with --limit 1');
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test('recon-brief: missing company arg exits 2 with usage', () => {
  const res = run([]);
  assert.equal(res.status, 2, `expected exit 2, got ${res.status}`);
  assert.match(res.stdout + res.stderr, /Usage:/);
});
