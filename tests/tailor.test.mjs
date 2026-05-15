import { test } from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { readFileSync, mkdtempSync, mkdirSync, writeFileSync, rmSync, cpSync, existsSync } from 'node:fs';
import { join, dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { tmpdir } from 'node:os';

import {
  parseCv,
  parseJd,
  rerankCv,
  mockLlmClient,
  slugify,
  renderCvMarkdown,
  runTailor,
} from '../src/tailor/index.mjs';

const TESTS_DIR = dirname(fileURLToPath(import.meta.url));
const REPO_DIR = resolve(TESTS_DIR, '..');
const CLI = join(REPO_DIR, 'bin/tailor.mjs');
const JD_FIXTURE = join(REPO_DIR, 'fixtures/jd-sample.md');
const CV_EXAMPLE = join(REPO_DIR, 'examples/cv-example.md');

function freshRoot(prefix = 'tailor-') {
  return mkdtempSync(join(tmpdir(), prefix));
}

function seedExampleCv(root) {
  // The CLI auto-discovers <root>/examples/cv-example.md as the fallback CV.
  const dest = join(root, 'examples');
  mkdirSync(dest, { recursive: true });
  cpSync(CV_EXAMPLE, join(dest, 'cv-example.md'));
}

function run(args, { cwd } = {}) {
  return spawnSync(process.execPath, [CLI, ...args], {
    encoding: 'utf-8',
    cwd: cwd ?? REPO_DIR,
    timeout: 15_000,
  });
}

function readFrontmatter(md) {
  const m = /^---\n([\s\S]*?)\n---/.exec(md);
  if (!m) return null;
  const out = {};
  for (const line of m[1].split('\n')) {
    const kv = /^([a-z_]+):\s*(.+)$/.exec(line);
    if (kv) out[kv[1]] = kv[2].trim();
  }
  return out;
}

function extractFirstRoleBullets(md) {
  // Bullets between the first `### ` heading and the next `### ` or `## `.
  const lines = md.split('\n');
  const out = [];
  let inRole = false;
  for (const line of lines) {
    if (/^###\s+/.test(line)) {
      if (inRole) break;
      inRole = true;
      continue;
    }
    if (inRole && /^##\s+/.test(line)) break;
    if (inRole) {
      const m = /^-\s+(.+)$/.exec(line);
      if (m) out.push(m[1].trim());
    }
  }
  return out;
}

// ---------------------------------------------------------------------------
// central promise: tailor produces a CV variant with JD-matching frontmatter
// AND a bullet ordering that differs from the canonical CV. This is the one
// promise of the feature; the rest of the tests defend the edges.
// ---------------------------------------------------------------------------

test('tailor: emits cv-<slug>.md with JD-title frontmatter and reordered bullets', () => {
  const root = freshRoot();
  try {
    seedExampleCv(root);
    const res = run([JD_FIXTURE, '--root', root]);
    assert.equal(res.status, 0, `expected exit 0 — stderr: ${res.stderr}\nstdout: ${res.stdout}`);

    const expectedSlug = slugify('Senior AI Platform Engineer');
    const outPath = join(root, 'out', `cv-${expectedSlug}.md`);
    assert.ok(existsSync(outPath), `expected output at ${outPath}`);

    const md = readFileSync(outPath, 'utf-8');
    const fm = readFrontmatter(md);
    assert.ok(fm, 'expected YAML frontmatter block at the top of the output');
    assert.equal(fm.title, 'Senior AI Platform Engineer', 'frontmatter title must match JD `#` heading');
    assert.match(fm.source_cv, /examples\/cv-example\.md$/);
    assert.match(fm.jd, /jd-sample\.md$/);
    assert.match(fm.generated_at, /^\d{4}-\d{2}-\d{2}T/);

    const canonicalCv = readFileSync(CV_EXAMPLE, 'utf-8');
    const canonicalFirstRole = extractFirstRoleBullets(canonicalCv);
    const tailoredFirstRole = extractFirstRoleBullets(md);
    assert.ok(canonicalFirstRole.length >= 3, 'canonical CV must have at least 3 bullets in first role');
    assert.equal(
      tailoredFirstRole.length,
      canonicalFirstRole.length,
      'tailored CV must preserve bullet count, only reorder',
    );
    assert.notDeepEqual(
      tailoredFirstRole,
      canonicalFirstRole,
      'bullet ordering in the tailored CV must differ from canonical (rewrote priorities)',
    );
    // Same set of bullets — re-ordered, not invented or dropped.
    assert.deepEqual(
      [...tailoredFirstRole].sort(),
      [...canonicalFirstRole].sort(),
      'tailored CV must contain exactly the same bullets as canonical (no hallucination, no drops)',
    );
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

// ---------------------------------------------------------------------------
// stability: tailoring is deterministic for the same (JD, CV) pair
// ---------------------------------------------------------------------------

test('tailor: deterministic re-rank — same JD + same CV → identical bullet order', () => {
  const root = freshRoot();
  try {
    seedExampleCv(root);
    const a = run([JD_FIXTURE, '--root', root]);
    assert.equal(a.status, 0, `first run failed: ${a.stderr}`);
    const slug = slugify('Senior AI Platform Engineer');
    const outPath = join(root, 'out', `cv-${slug}.md`);
    const first = extractFirstRoleBullets(readFileSync(outPath, 'utf-8'));
    rmSync(outPath);

    const b = run([JD_FIXTURE, '--root', root]);
    assert.equal(b.status, 0, `second run failed: ${b.stderr}`);
    const second = extractFirstRoleBullets(readFileSync(outPath, 'utf-8'));

    assert.deepEqual(second, first, 'two runs with same inputs must produce same bullet order');
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

// ---------------------------------------------------------------------------
// dry-run / no-op: --help exits 0 without touching the filesystem
// ---------------------------------------------------------------------------

test('tailor: --help prints usage and writes no output', () => {
  const root = freshRoot();
  try {
    const res = run(['--help'], { cwd: root });
    assert.equal(res.status, 0);
    assert.match(res.stdout, /Usage: tailor/);
    assert.equal(existsSync(join(root, 'out')), false, '--help must not create out/ directory');
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

// ---------------------------------------------------------------------------
// edge: missing JD file → exit 2 (not 1), with explanatory stderr
// ---------------------------------------------------------------------------

test('tailor: missing JD file exits 2 with explanatory stderr', () => {
  const root = freshRoot();
  try {
    seedExampleCv(root);
    const res = run([join(root, 'no-such.md'), '--root', root]);
    assert.equal(res.status, 2, `expected exit 2, got ${res.status}\nstderr: ${res.stderr}`);
    assert.match(res.stderr, /JD file not found/i);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

// ---------------------------------------------------------------------------
// edge: JD missing top-level `# Title` heading → exit 2
// ---------------------------------------------------------------------------

test('tailor: JD without `# Title` heading exits 2', () => {
  const root = freshRoot();
  try {
    seedExampleCv(root);
    const badJd = join(root, 'bad-jd.md');
    writeFileSync(badJd, '## Subheading only\n\nNo title here.\n', 'utf-8');
    const res = run([badJd, '--root', root]);
    assert.equal(res.status, 2, `expected exit 2, got ${res.status}\nstderr: ${res.stderr}`);
    assert.match(res.stderr, /missing a top-level/i);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

// ---------------------------------------------------------------------------
// edge: no CV anywhere → exit 2
// ---------------------------------------------------------------------------

test('tailor: no CV under root exits 2 with explanatory stderr', () => {
  const root = freshRoot();
  try {
    // Deliberately do NOT seed examples/cv-example.md.
    const res = run([JD_FIXTURE, '--root', root]);
    assert.equal(res.status, 2, `expected exit 2, got ${res.status}\nstderr: ${res.stderr}`);
    assert.match(res.stderr, /CV source missing|no CV found/i);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

// ---------------------------------------------------------------------------
// unit: empty-JD (zero signal) preserves canonical order (stable sort)
// ---------------------------------------------------------------------------

test('tailor: zero-signal JD → bullet order is preserved verbatim', () => {
  const cvText = [
    '# CV — Alex',
    '',
    '## Work Experience',
    '',
    '### Co A — Remote',
    '',
    '- alpha bullet',
    '- bravo bullet',
    '- charlie bullet',
    '',
  ].join('\n');
  const parsed = parseCv(cvText);
  // JD body with only stopwords — every score is zero.
  const ranker = (bullet) => mockLlmClient('the a an and or').rankBullets(bullet);
  const reranked = rerankCv(parsed, ranker);
  const block = reranked.sections[0].blocks[0];
  assert.deepEqual(
    block.bullets,
    ['alpha bullet', 'bravo bullet', 'charlie bullet'],
    'no JD signal must not shuffle bullets — stable sort required',
  );
});

// ---------------------------------------------------------------------------
// unit: mock LLM ranks higher-overlap bullets above lower-overlap ones
// ---------------------------------------------------------------------------

test('tailor: mock LLM scores Kafka-heavy bullet higher than Kafka-absent bullet', () => {
  const jd = '# X\n\nWe build Kafka pipelines and model registries.';
  const client = mockLlmClient(jd);
  const high = client.rankBullets('Built Kafka streams + model registry for fraud detection');
  const low = client.rankBullets('Wrote internal docs for the onboarding wiki');
  assert.ok(high > low, `expected high(${high}) > low(${low}) for JD-aligned bullet`);
});

// ---------------------------------------------------------------------------
// programmatic API smoke: runTailor() returns the structured result
// ---------------------------------------------------------------------------

test('tailor: runTailor() returns slug, title, and parsed structures', async () => {
  const root = freshRoot();
  try {
    seedExampleCv(root);
    const result = await runTailor({
      jdPath: JD_FIXTURE,
      root,
      cvPath: null,
      outDirOverride: null,
    });
    assert.equal(result.slug, 'senior-ai-platform-engineer');
    assert.equal(result.title, 'Senior AI Platform Engineer');
    assert.ok(result.outPath.endsWith('cv-senior-ai-platform-engineer.md'));
    assert.ok(result.parsedCv.sections.length > 0, 'parsed CV must surface sections');
    assert.ok(result.reranked.sections.length > 0, 'reranked CV must surface sections');
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});
