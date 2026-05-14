#!/usr/bin/env node

/**
 * funnel-metrics.mjs — Application funnel counts as JSON.
 *
 * Reads <root>/data/applications.md (the canonical pipe-table tracker shared by
 * scan.mjs / followup-cadence.mjs / merge-tracker.mjs) and writes a six-field
 * JSON snapshot to <root>/dist/funnel-metrics.json. Buckets are cumulative:
 * every "Responded" row also counts as "applied", etc. — the standard
 * top-of-funnel-to-offer interpretation.
 *
 *   applied   → row was submitted (any canonical status except Evaluated/SKIP)
 *   screening → row reached recruiter contact (Responded/Interview/Offer/Accepted)
 *   technical → row reached interview loop (Interview/Offer/Accepted)
 *   onsite    → row reached final-round / onsite (Interview rows whose notes
 *               mention onsite|final|onsite/final, plus Offer/Accepted)
 *   offer     → row received an offer (Offer/Accepted)
 *   accepted  → row accepted the offer (status Accepted, or Offer with
 *               "accepted" in the notes field)
 *
 * Usage:
 *   node funnel-metrics.mjs                     # reads ./data/applications.md, writes ./dist/funnel-metrics.json
 *   node funnel-metrics.mjs --root <dir>        # override CWD root
 *   node funnel-metrics.mjs --out <path>        # override output path
 *   node funnel-metrics.mjs --stdout            # print JSON to stdout instead of writing a file
 */

import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs';
import { join, dirname, resolve } from 'node:path';

const STAGES = ['applied', 'screening', 'technical', 'onsite', 'offer', 'accepted'];

function parseArgs(argv) {
  const args = { root: process.cwd(), out: null, stdout: false };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--root') args.root = resolve(argv[++i] ?? '');
    else if (a === '--out') args.out = resolve(argv[++i] ?? '');
    else if (a === '--stdout') args.stdout = true;
  }
  if (!args.out) args.out = join(args.root, 'dist/funnel-metrics.json');
  return args;
}

// Pipe-table row → { status, notes }. Tolerant of extra trailing pipes.
function parseTracker(path) {
  if (!existsSync(path)) return [];
  const entries = [];
  for (const line of readFileSync(path, 'utf-8').split('\n')) {
    if (!line.startsWith('|')) continue;
    const parts = line.split('|').map((s) => s.trim());
    // Format mirrors followup-cadence.mjs / normalize-statuses.mjs:
    // ['', '#', 'fecha', 'empresa', 'rol', 'score', 'STATUS', 'pdf', 'report', 'notas', '']
    if (parts.length < 9) continue;
    const num = Number.parseInt(parts[1], 10);
    if (!Number.isFinite(num)) continue;
    entries.push({ status: parts[6] ?? '', notes: parts[9] ?? '' });
  }
  return entries;
}

// Strip markdown bold and lowercase. Mirrors normalize-statuses.mjs preamble.
function canon(raw) {
  return raw.replace(/\*\*/g, '').trim().toLowerCase();
}

function bucketize(entries) {
  const counts = Object.fromEntries(STAGES.map((s) => [s, 0]));
  for (const { status, notes } of entries) {
    const s = canon(status);
    const n = (notes ?? '').toLowerCase();

    // Skip non-applied lanes — these never entered the funnel.
    if (s === '' || s === 'skip' || s === 'evaluated' || s === 'discarded') continue;

    // Everything below counts as applied (Applied, Responded, Interview, Offer,
    // Accepted, Rejected). Rejected counts as having applied even if it
    // bounced — the funnel measures attempts, not just successes.
    counts.applied += 1;
    if (s === 'rejected' || s === 'applied') continue;

    if (s === 'responded') {
      counts.screening += 1;
      continue;
    }
    if (s === 'interview') {
      counts.screening += 1;
      counts.technical += 1;
      if (/\bonsite\b|\bfinal(?:[-\s]round)?\b/.test(n)) counts.onsite += 1;
      continue;
    }
    if (s === 'offer' || s === 'accepted') {
      counts.screening += 1;
      counts.technical += 1;
      counts.onsite += 1;
      counts.offer += 1;
      if (s === 'accepted' || /\baccepted\b/.test(n)) counts.accepted += 1;
    }
  }
  return counts;
}

function main() {
  const args = parseArgs(process.argv.slice(2));
  const trackerPath = join(args.root, 'data/applications.md');
  const entries = parseTracker(trackerPath);
  const counts = bucketize(entries);

  const payload = {
    generatedAt: new Date().toISOString(),
    source: trackerPath,
    totalRows: entries.length,
    counts,
  };
  const json = JSON.stringify(payload, null, 2);

  if (args.stdout) {
    process.stdout.write(`${json}\n`);
    return 0;
  }
  mkdirSync(dirname(args.out), { recursive: true });
  writeFileSync(args.out, `${json}\n`, 'utf-8');
  process.stdout.write(`funnel-metrics: wrote ${args.out} (${entries.length} rows)\n`);
  return 0;
}

process.exit(main());
