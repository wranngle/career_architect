import { test } from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { readFileSync, writeFileSync, mkdtempSync, cpSync, rmSync, existsSync, mkdirSync, chmodSync } from 'node:fs';
import { join, dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { tmpdir } from 'node:os';

const TESTS_DIR = dirname(fileURLToPath(import.meta.url));
const REPO_DIR = resolve(TESTS_DIR, '..');
const SCRIPT = join(REPO_DIR, 'queue-applications.mjs');
const FIXTURE_ROOT = join(TESTS_DIR, 'fixtures/queue-applications');

function copyFixture() {
  const dir = mkdtempSync(join(tmpdir(), 'queue-applications-'));
  cpSync(FIXTURE_ROOT, dir, { recursive: true });
  return dir;
}

function writePdfStub(rootDir) {
  // Minimal stub that writes the requested PDF path so the script can assert
  // "PDF exists on disk" without booting Playwright. Receives the path as $1.
  const stubPath = join(rootDir, 'pdf-stub.sh');
  writeFileSync(stubPath, '#!/usr/bin/env bash\nmkdir -p "$(dirname "$1")"\nprintf "%%PDF-1.4 stub\\n" > "$1"\n');
  chmodSync(stubPath, 0o755);
  return stubPath;
}

function run(rootDir, extraArgs = []) {
  return spawnSync(
    process.execPath,
    [SCRIPT, '--root', rootDir, ...extraArgs],
    { encoding: 'utf-8', timeout: 30_000 },
  );
}

test('queue-applications: promotes entries above threshold and writes PDFs', () => {
  const dir = copyFixture();
  try {
    const pdfStub = writePdfStub(dir);
    const res = run(dir, ['--threshold', '80', '--pdf-cmd', pdfStub]);
    assert.equal(res.status, 0, `expected exit 0, got ${res.status}\nstderr: ${res.stderr}`);

    const queuePath = join(dir, 'data/submit-queue.md');
    assert.ok(existsSync(queuePath), 'submit-queue.md must exist after run');
    const queue = readFileSync(queuePath, 'utf-8');

    // Promoted: alpha (94) and bravo (84). NOT promoted: charlie (70), delta (no report).
    assert.match(queue, /synthetic-alpha-engineer/, 'alpha must be queued');
    assert.match(queue, /synthetic-bravo-platform/, 'bravo must be queued');
    assert.doesNotMatch(queue, /old-charlie-listing/, 'charlie below threshold must NOT be queued');
    assert.doesNotMatch(queue, /no-report-match/, 'delta without a report must NOT be queued');
    assert.match(queue, /## Queued/, 'queue scaffold header must be present');

    // PDFs exist on disk for each promoted entry.
    const alphaPdf = join(dir, 'output/cv-synthetic-alpha.pdf');
    const bravoPdf = join(dir, 'output/cv-bravo-synthworks.pdf');
    assert.ok(existsSync(alphaPdf), `alpha PDF missing at ${alphaPdf}`);
    assert.ok(existsSync(bravoPdf), `bravo PDF missing at ${bravoPdf}`);

    // Pipeline rows for promoted entries are rewritten as moved.
    const pipelineAfter = readFileSync(join(dir, 'data/pipeline.md'), 'utf-8');
    assert.match(pipelineAfter, /- \[x\] ~~https:\/\/example\.com\/jobs\/synthetic-alpha-engineer~~/);
    assert.match(pipelineAfter, /- \[x\] ~~https:\/\/example\.com\/jobs\/synthetic-bravo-platform~~/);
    // Below-threshold and no-report rows stay unchecked.
    assert.match(pipelineAfter, /- \[ \] https:\/\/example\.com\/jobs\/old-charlie-listing/);
    assert.match(pipelineAfter, /- \[ \] https:\/\/example\.com\/jobs\/no-report-match/);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test('queue-applications: --threshold filter is strict (charlie at 70 not promoted at threshold 75)', () => {
  const dir = copyFixture();
  try {
    const pdfStub = writePdfStub(dir);
    const res = run(dir, ['--threshold', '75', '--pdf-cmd', pdfStub]);
    assert.equal(res.status, 0);
    const queue = readFileSync(join(dir, 'data/submit-queue.md'), 'utf-8');
    assert.doesNotMatch(queue, /old-charlie-listing/, 'charlie at 70 must not promote at threshold 75');
    assert.match(queue, /synthetic-alpha-engineer/);
    assert.match(queue, /synthetic-bravo-platform/);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test('queue-applications: --threshold 60 promotes charlie too', () => {
  const dir = copyFixture();
  try {
    const pdfStub = writePdfStub(dir);
    const res = run(dir, ['--threshold', '60', '--pdf-cmd', pdfStub]);
    assert.equal(res.status, 0);
    const queue = readFileSync(join(dir, 'data/submit-queue.md'), 'utf-8');
    assert.match(queue, /old-charlie-listing/, 'charlie at 70 must promote at threshold 60');
    assert.ok(existsSync(join(dir, 'output/cv-charlie-testbed.pdf')));
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test('queue-applications: --no-pdf skips PDF generation but still populates queue', () => {
  const dir = copyFixture();
  try {
    const res = run(dir, ['--threshold', '80', '--no-pdf']);
    assert.equal(res.status, 0);
    const queue = readFileSync(join(dir, 'data/submit-queue.md'), 'utf-8');
    assert.match(queue, /synthetic-alpha-engineer/);
    assert.match(queue, /synthetic-bravo-platform/);
    // No PDFs written.
    assert.ok(!existsSync(join(dir, 'output/cv-synthetic-alpha.pdf')));
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test('queue-applications: missing pipeline.md exits 0 cleanly', () => {
  const dir = mkdtempSync(join(tmpdir(), 'queue-applications-empty-'));
  try {
    mkdirSync(join(dir, 'data'), { recursive: true });
    const res = run(dir, ['--threshold', '80', '--no-pdf']);
    assert.equal(res.status, 0, `expected exit 0 on empty fixture, got ${res.status}\nstderr: ${res.stderr}`);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test('queue-applications: --dry-run prints plan and does not mutate', () => {
  const dir = copyFixture();
  try {
    const pipelineBefore = readFileSync(join(dir, 'data/pipeline.md'), 'utf-8');
    const res = run(dir, ['--threshold', '80', '--dry-run']);
    assert.equal(res.status, 0);
    assert.match(res.stdout, /would promote 2 entries/);
    // Pipeline untouched.
    const pipelineAfter = readFileSync(join(dir, 'data/pipeline.md'), 'utf-8');
    assert.equal(pipelineAfter, pipelineBefore);
    // No submit-queue written.
    assert.ok(!existsSync(join(dir, 'data/submit-queue.md')));
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});
