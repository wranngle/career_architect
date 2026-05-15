import { test } from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { readFileSync, mkdtempSync, writeFileSync, existsSync } from 'node:fs';
import { join, dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { tmpdir } from 'node:os';

import {
  computeAnchor,
  computeWalkAway,
  deriveObjections,
  parseOffer,
  renderScript,
  runNegotiate,
  slugify,
  DEFAULT_TARGET_MULTIPLIER,
} from '../src/negotiate/index.mjs';

const TESTS_DIR = dirname(fileURLToPath(import.meta.url));
const REPO_DIR = resolve(TESTS_DIR, '..');
const CLI = join(REPO_DIR, 'bin/negotiate.mjs');
const OFFER_FIXTURE = join(REPO_DIR, 'fixtures/offer-sample.json');

function freshRoot(prefix = 'negotiate-') {
  return mkdtempSync(join(tmpdir(), prefix));
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

// ---------------------------------------------------------------------------
// central promise: negotiate produces a markdown script with the three named
// sections AND an anchor computed from base salary × target multiplier. This
// is THE feature contract; everything else defends the edges.
// ---------------------------------------------------------------------------

test('negotiate: emits markdown with Anchor / Walk-away / Likely objections, anchor = base × multiplier', () => {
  const root = freshRoot();
  const res = run([OFFER_FIXTURE, '--root', root]);
  assert.equal(res.status, 0, `expected exit 0 — stderr: ${res.stderr}\nstdout: ${res.stdout}`);

  const offer = JSON.parse(readFileSync(OFFER_FIXTURE, 'utf-8'));
  const expectedSlug = slugify(offer.company);
  const outPath = join(root, 'out', `negotiate-${expectedSlug}.md`);
  assert.ok(existsSync(outPath), `expected output at ${outPath}`);

  const md = readFileSync(outPath, 'utf-8');

  // The three required sections per the round-2 spec.
  assert.match(md, /^## Anchor$/m, 'output must contain `## Anchor` heading');
  assert.match(md, /^## Walk-away$/m, 'output must contain `## Walk-away` heading');
  assert.match(md, /^## Likely objections$/m, 'output must contain `## Likely objections` heading');

  // Anchor arithmetic: base × target_base_multiplier, rounded to nearest dollar.
  const base = offer.compensation.base_salary_usd;
  const multiplier = offer.candidate.target_base_multiplier;
  const expectedAnchor = Math.round(base * multiplier);

  const fm = readFrontmatter(md);
  assert.ok(fm, 'expected YAML frontmatter block at top');
  assert.equal(Number(fm.base_salary_usd), base);
  assert.equal(Number(fm.target_multiplier), multiplier);
  assert.equal(Number(fm.anchor_usd), expectedAnchor,
    `anchor_usd in frontmatter must equal base (${base}) × multiplier (${multiplier}) = ${expectedAnchor}`);

  // Anchor must also appear in the Anchor section body as a formatted dollar
  // amount — frontmatter alone is not enough; the human-readable script must
  // surface the number too.
  const formatted = `$${expectedAnchor.toLocaleString('en-US')}`;
  const anchorSectionMatch = /## Anchor\n\n([\s\S]*?)\n## /.exec(md);
  assert.ok(anchorSectionMatch, 'must be able to extract the Anchor section body');
  assert.ok(anchorSectionMatch[1].includes(formatted),
    `Anchor section body must contain formatted anchor ${formatted}; got: ${anchorSectionMatch[1]}`);
});

// ---------------------------------------------------------------------------
// edge: multiplier defaulting
// ---------------------------------------------------------------------------

test('negotiate: omitted target_base_multiplier defaults to DEFAULT_TARGET_MULTIPLIER (1.15)', () => {
  const offer = parseOffer(JSON.stringify({
    company: 'NoMult',
    role: 'Engineer',
    compensation: { base_salary_usd: 100000 },
  }));
  const { base, multiplier, anchor } = computeAnchor(offer);
  assert.equal(base, 100000);
  assert.equal(multiplier, DEFAULT_TARGET_MULTIPLIER);
  assert.equal(multiplier, 1.15);
  assert.equal(anchor, 115000);
});

// ---------------------------------------------------------------------------
// edge: walk-away falls back to current base when not declared
// ---------------------------------------------------------------------------

test('negotiate: walk-away falls back to current base when not declared', () => {
  const offer = parseOffer(JSON.stringify({
    company: 'NoWalk',
    role: 'Engineer',
    compensation: { base_salary_usd: 150000 },
  }));
  const { walkAway, source } = computeWalkAway(offer);
  assert.equal(walkAway, 150000);
  assert.match(source, /fallback/);
});

test('negotiate: declared walk_away_base_usd is honored', () => {
  const offer = parseOffer(JSON.stringify({
    company: 'WithWalk',
    role: 'Engineer',
    compensation: { base_salary_usd: 150000 },
    candidate: { walk_away_base_usd: 140000 },
  }));
  const { walkAway, source } = computeWalkAway(offer);
  assert.equal(walkAway, 140000);
  assert.equal(source, 'candidate.walk_away_base_usd');
});

// ---------------------------------------------------------------------------
// edge: objections are grounded in offer shape (not generic boilerplate)
// ---------------------------------------------------------------------------

test('negotiate: objections respond to specific offer-shape signals', () => {
  const offer = parseOffer(JSON.stringify({
    company: 'Shaped',
    role: 'Engineer',
    compensation: {
      base_salary_usd: 200000,
      equity: { cliff_months: 12 },
    },
    candidate: {
      target_base_multiplier: 1.2,
      walk_away_base_usd: 190000,
      competing_offers: [{ company: 'Other', base_salary_usd: 215000 }],
    },
  }));
  const { anchor } = computeAnchor(offer);
  const { walkAway } = computeWalkAway(offer);
  const objections = deriveObjections(offer, { anchor, walkAway });

  // Must surface at least one objection per shape signal: cliff, missing
  // signing bonus, competing offers. The "decision deadline" / "budget cap"
  // pair is always present.
  const blob = JSON.stringify(objections).toLowerCase();
  assert.match(blob, /cliff/, 'objection set must address the equity cliff');
  assert.match(blob, /signing bonus/, 'objection set must address the missing signing bonus');
  assert.match(blob, /\$215,000/, 'objection set must cite the competing offer base');
  assert.ok(objections.length >= 3, `expected at least 3 objections; got ${objections.length}`);
});

test('negotiate: signing-bonus objection is suppressed when one is offered', () => {
  const offer = parseOffer(JSON.stringify({
    company: 'WithBonus',
    role: 'Engineer',
    compensation: {
      base_salary_usd: 200000,
      signing_bonus_usd: 25000,
    },
  }));
  const { anchor } = computeAnchor(offer);
  const { walkAway } = computeWalkAway(offer);
  const objections = deriveObjections(offer, { anchor, walkAway });
  const blob = JSON.stringify(objections).toLowerCase();
  assert.doesNotMatch(blob, /signing bonus is the cheapest lever/);
});

// ---------------------------------------------------------------------------
// edge: invalid input paths
// ---------------------------------------------------------------------------

test('negotiate: missing offer file exits 2 with `offer file not found`', () => {
  const root = freshRoot();
  const missing = join(root, 'nope.json');
  const res = run([missing, '--root', root]);
  assert.equal(res.status, 2);
  assert.match(res.stderr, /offer file not found/);
});

test('negotiate: invalid JSON exits 2', () => {
  const root = freshRoot();
  const bad = join(root, 'bad.json');
  writeFileSync(bad, '{not json', 'utf-8');
  const res = run([bad, '--root', root]);
  assert.equal(res.status, 2);
  assert.match(res.stderr, /not valid JSON/);
});

test('negotiate: missing base_salary_usd exits 2', () => {
  const root = freshRoot();
  const incomplete = join(root, 'no-base.json');
  writeFileSync(incomplete, JSON.stringify({
    company: 'X', role: 'Y', compensation: {},
  }), 'utf-8');
  const res = run([incomplete, '--root', root]);
  assert.equal(res.status, 2);
  assert.match(res.stderr, /base_salary_usd must be a positive number/);
});

test('negotiate: --help prints usage and exits 0', () => {
  const res = run(['--help']);
  assert.equal(res.status, 0);
  assert.match(res.stdout, /Usage: negotiate <offer\.json>/);
});

test('negotiate: unknown flag exits 2', () => {
  const res = run(['--frobnicate']);
  assert.equal(res.status, 2);
  assert.match(res.stderr, /unknown flag --frobnicate/);
});

// ---------------------------------------------------------------------------
// programmatic API: runNegotiate returns parsed result
// ---------------------------------------------------------------------------

test('negotiate: runNegotiate returns anchor + walkAway + outPath', async () => {
  const root = freshRoot();
  const result = await runNegotiate({
    offerPath: OFFER_FIXTURE,
    root,
    outDirOverride: null,
  });
  const offer = JSON.parse(readFileSync(OFFER_FIXTURE, 'utf-8'));
  assert.equal(result.anchor, Math.round(offer.compensation.base_salary_usd * offer.candidate.target_base_multiplier));
  assert.equal(result.walkAway, offer.candidate.walk_away_base_usd);
  assert.match(result.outPath, /negotiate-acme-corp\.md$/);
  assert.ok(existsSync(result.outPath));
});

// ---------------------------------------------------------------------------
// dry-run / no-op: rendering does NOT write a file. Only runNegotiate writes.
// renderScript is pure so we assert it produces all three sections without
// touching disk.
// ---------------------------------------------------------------------------

test('negotiate: renderScript is pure — no I/O, all three sections present', () => {
  const offer = parseOffer(readFileSync(OFFER_FIXTURE, 'utf-8'));
  const { base, multiplier, anchor } = computeAnchor(offer);
  const { walkAway, source: walkAwaySource } = computeWalkAway(offer);
  const objections = deriveObjections(offer, { anchor, walkAway });
  const md = renderScript(offer, { anchor, base, multiplier, walkAway, walkAwaySource, objections });
  assert.match(md, /^## Anchor$/m);
  assert.match(md, /^## Walk-away$/m);
  assert.match(md, /^## Likely objections$/m);
  // Pure function — no Date.now stability needed for this assert; just checks
  // the function executed without writing anything.
});
