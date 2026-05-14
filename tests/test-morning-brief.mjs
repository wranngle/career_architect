import { test } from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { writeFileSync, mkdtempSync, cpSync, rmSync } from 'node:fs';
import { join, dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { tmpdir } from 'node:os';

const TESTS_DIR = dirname(fileURLToPath(import.meta.url));
const REPO_DIR = resolve(TESTS_DIR, '..');
const SCRIPT = join(REPO_DIR, 'morning-brief.mjs');
const FIXTURE_ROOT = join(TESTS_DIR, 'fixtures/morning-brief');
const EMPTY_FIXTURE_ROOT = join(TESTS_DIR, 'fixtures/morning-brief-empty');

function run(rootDir, extraArgs = []) {
  return spawnSync(
    process.execPath,
    [SCRIPT, '--root', rootDir, '--no-followups', ...extraArgs],
    { encoding: 'utf-8', timeout: 15_000 },
  );
}

function buildFixtureCopy() {
  const dir = mkdtempSync(join(tmpdir(), 'morning-brief-'));
  cpSync(FIXTURE_ROOT, dir, { recursive: true });
  const now = Date.now();
  const recent = new Date(now - 6 * 3600 * 1000).toISOString();   // 6h ago — inside default 24h window
  const old = new Date(now - 72 * 3600 * 1000).toISOString();     // 72h ago — outside the window
  const tsv = [
    'url\tfirst_seen\tportal\ttitle\tcompany\tstatus',
    `https://example.com/jobs/synthetic-alpha-engineer\t${recent}\ttest\tVoice Engineer\tSynthetic Alpha\tadded`,
    `https://example.com/jobs/synthetic-bravo-platform\t${recent}\ttest\tPlatform Engineer\tBravo Synthworks\tadded`,
    `https://example.com/jobs/old-charlie-listing\t${old}\ttest\tForge Engineer\tCharlie Testbed\tadded`,
    '',
  ].join('\n');
  writeFileSync(join(dir, 'data/scan-history.tsv'), tsv, 'utf-8');
  return dir;
}

test('morning-brief: prints three required section headers in order', () => {
  const dir = buildFixtureCopy();
  try {
    const res = run(dir);
    assert.equal(res.status, 0, `expected exit 0, got ${res.status}\nstderr: ${res.stderr}`);
    const out = res.stdout;
    const top = out.indexOf("## Today's top 3");
    const due = out.indexOf('## Followups due');
    const fresh = out.indexOf('## New in pipeline');
    assert.ok(top !== -1, 'missing "## Today\'s top 3" header');
    assert.ok(due !== -1, 'missing "## Followups due" header');
    assert.ok(fresh !== -1, 'missing "## New in pipeline" header');
    assert.ok(top < due && due < fresh, 'sections must appear in fixed order');
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test('morning-brief: top-3 reports ranked by Score, highest first', () => {
  const dir = buildFixtureCopy();
  try {
    const res = run(dir);
    assert.equal(res.status, 0);
    const out = res.stdout;
    const idxAlpha = out.indexOf('Synthetic Alpha');
    const idxBravo = out.indexOf('Bravo Synthworks');
    const idxCharlie = out.indexOf('Charlie Testbed');
    assert.ok(idxAlpha !== -1, 'top-scoring report not surfaced');
    assert.ok(idxBravo !== -1 && idxBravo > idxAlpha, 'second report missing or mis-ordered');
    assert.ok(idxCharlie !== -1 && idxCharlie > idxBravo, 'third report missing or mis-ordered');
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test('morning-brief: "new in pipeline" only includes URLs seen in last 24h', () => {
  const dir = buildFixtureCopy();
  try {
    const res = run(dir);
    assert.equal(res.status, 0);
    const out = res.stdout;
    const pipelineSection = out.slice(out.indexOf('## New in pipeline'));
    assert.ok(pipelineSection.includes('synthetic-alpha-engineer'), 'recent URL missing from pipeline section');
    assert.ok(pipelineSection.includes('synthetic-bravo-platform'), 'recent URL missing from pipeline section');
    assert.ok(!pipelineSection.includes('old-charlie-listing'), 'stale URL leaked into pipeline section');
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test('morning-brief: empty data dir renders placeholders and exits 0', () => {
  const res = run(EMPTY_FIXTURE_ROOT);
  assert.equal(res.status, 0, `expected exit 0 on empty fixture, got ${res.status}\nstderr: ${res.stderr}`);
  const out = res.stdout;
  assert.ok(out.includes("## Today's top 3"));
  assert.ok(out.includes('## Followups due'));
  assert.ok(out.includes('## New in pipeline'));
  const placeholders = out.match(/_\(none\)_/g) ?? [];
  assert.equal(placeholders.length, 3, 'each empty section should render a "_(none)_" placeholder');
});
