import { test } from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { readFileSync, writeFileSync, mkdtempSync, cpSync, rmSync, existsSync, mkdirSync } from 'node:fs';
import { join, dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { tmpdir } from 'node:os';

const TESTS_DIR = dirname(fileURLToPath(import.meta.url));
const REPO_DIR = resolve(TESTS_DIR, '..');
const SCRIPT = join(REPO_DIR, 'funnel-metrics.mjs');
const FIXTURE_ROOT = join(TESTS_DIR, 'fixtures/funnel-metrics');

const SIX_STAGES = ['applied', 'screening', 'technical', 'onsite', 'offer', 'accepted'];

function run(rootDir, extraArgs = []) {
  return spawnSync(
    process.execPath,
    [SCRIPT, '--root', rootDir, ...extraArgs],
    { encoding: 'utf-8', timeout: 15_000 },
  );
}

function copyFixture() {
  const dir = mkdtempSync(join(tmpdir(), 'funnel-metrics-'));
  cpSync(FIXTURE_ROOT, dir, { recursive: true });
  return dir;
}

test('funnel-metrics: writes dist/funnel-metrics.json with six integer counts', () => {
  const dir = copyFixture();
  try {
    const res = run(dir);
    assert.equal(res.status, 0, `expected exit 0, got ${res.status}\nstderr: ${res.stderr}`);
    const outPath = join(dir, 'dist/funnel-metrics.json');
    assert.ok(existsSync(outPath), 'expected dist/funnel-metrics.json to exist');
    const payload = JSON.parse(readFileSync(outPath, 'utf-8'));
    assert.ok(payload.counts && typeof payload.counts === 'object', 'payload.counts must be an object');
    for (const stage of SIX_STAGES) {
      assert.equal(typeof payload.counts[stage], 'number', `${stage} must be a number`);
      assert.ok(Number.isInteger(payload.counts[stage]), `${stage} must be an integer`);
      assert.ok(payload.counts[stage] >= 0, `${stage} must be non-negative`);
    }
    assert.equal(Object.keys(payload.counts).length, 6, 'counts must have exactly six fields');
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test('funnel-metrics: cumulative counts match the fixture tracker', () => {
  const dir = copyFixture();
  try {
    const res = run(dir);
    assert.equal(res.status, 0);
    const payload = JSON.parse(readFileSync(join(dir, 'dist/funnel-metrics.json'), 'utf-8'));
    // Derived by hand from tests/fixtures/funnel-metrics/data/applications.md:
    //   rows: 11 tracked, 3 dropped (Discarded/SKIP/Evaluated)
    //   applied  : Applied×2 + Rejected×1 + Responded×1 + Interview×2 + Offer×2 = 8
    //   screening: Responded×1 + Interview×2 + Offer×2                          = 5
    //   technical: Interview×2 + Offer×2                                        = 4
    //   onsite   : Interview-onsite×1 + Offer×2                                 = 3
    //   offer    : Offer×2                                                      = 2
    //   accepted : Offer with "accepted" notes ×1                               = 1
    assert.deepEqual(payload.counts, {
      applied: 8,
      screening: 5,
      technical: 4,
      onsite: 3,
      offer: 2,
      accepted: 1,
    });
    assert.equal(payload.totalRows, 11);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test('funnel-metrics: missing tracker yields all zeroes and still exits 0', () => {
  const dir = mkdtempSync(join(tmpdir(), 'funnel-metrics-empty-'));
  try {
    const res = run(dir);
    assert.equal(res.status, 0, `expected exit 0, got ${res.status}\nstderr: ${res.stderr}`);
    const payload = JSON.parse(readFileSync(join(dir, 'dist/funnel-metrics.json'), 'utf-8'));
    assert.equal(payload.totalRows, 0);
    for (const stage of SIX_STAGES) assert.equal(payload.counts[stage], 0);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test('funnel-metrics: --stdout prints JSON and writes no file', () => {
  const dir = copyFixture();
  try {
    const res = run(dir, ['--stdout']);
    assert.equal(res.status, 0);
    assert.ok(!existsSync(join(dir, 'dist/funnel-metrics.json')), 'should not write file under --stdout');
    const payload = JSON.parse(res.stdout);
    assert.equal(payload.counts.applied, 8);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test('funnel-metrics: monotone cumulative invariant (applied ≥ screening ≥ … ≥ accepted)', () => {
  // Synthetic tracker: any well-formed input must satisfy the funnel monotonicity
  // contract — a later-stage count can never exceed an earlier-stage count.
  const dir = mkdtempSync(join(tmpdir(), 'funnel-metrics-mono-'));
  try {
    mkdirSync(join(dir, 'data'), { recursive: true });
    writeFileSync(join(dir, 'data/applications.md'), [
      '| # | f | c | r | s | STATUS | p | rep | notas |',
      '| - | - | - | - | - | ------ | - | --- | ----- |',
      '| 1 | x | A | r | 1 | Offer    | - | - | accepted contract signed |',
      '| 2 | x | B | r | 1 | Interview| - | - | onsite scheduled |',
      '| 3 | x | C | r | 1 | Responded| - | - | - |',
      '| 4 | x | D | r | 1 | Applied  | - | - | - |',
      '',
    ].join('\n'), 'utf-8');
    const res = run(dir);
    assert.equal(res.status, 0);
    const c = JSON.parse(readFileSync(join(dir, 'dist/funnel-metrics.json'), 'utf-8')).counts;
    assert.ok(c.applied >= c.screening, 'applied ≥ screening');
    assert.ok(c.screening >= c.technical, 'screening ≥ technical');
    assert.ok(c.technical >= c.onsite, 'technical ≥ onsite');
    assert.ok(c.onsite >= c.offer, 'onsite ≥ offer');
    assert.ok(c.offer >= c.accepted, 'offer ≥ accepted');
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});
