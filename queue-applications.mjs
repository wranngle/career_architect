#!/usr/bin/env node

/**
 * queue-applications.mjs — Promote scored pipeline entries to the submit queue.
 *
 * Reads <root>/data/pipeline.md for unchecked entries shaped:
 *   - [ ] URL | Company | Title
 * and joins each entry to a <root>/reports/*.md report by URL (matched via
 * `**URL:** <url>` in the report body). Reports carry a `**Score:** N.N/5`
 * line (0-5 scale); the threshold flag is on the 0-100 scale so it matches
 * the rest of the career-ops UX. Score is normalized as `report_score * 20`.
 *
 * Entries at or above the threshold are moved from pipeline.md to
 * <root>/data/submit-queue.md (appended under a `## Queued` section, with the
 * normalized score and the path to the pre-generated CV PDF). The original
 * pipeline.md row is rewritten as a checked entry annotated `→ submit-queue`.
 *
 * For each promoted entry the script invokes generate-pdf.mjs to write
 * <root>/output/cv-<company-slug>.pdf, unless `--no-pdf` is passed or
 * `--pdf-cmd <cmd>` injects a test stub.
 *
 * Usage:
 *   node queue-applications.mjs                       # threshold 80, runs PDF gen
 *   node queue-applications.mjs --threshold 75        # custom cutoff (0-100)
 *   node queue-applications.mjs --root <dir>          # override CWD root
 *   node queue-applications.mjs --no-pdf              # skip PDF generation
 *   node queue-applications.mjs --pdf-cmd <cmd>       # substitute PDF command (used by tests)
 *   node queue-applications.mjs --dry-run             # print plan, do not mutate
 */

import { readFileSync, writeFileSync, readdirSync, existsSync, mkdirSync, statSync } from 'node:fs';
import { join, dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';

const SCRIPT_DIR = dirname(fileURLToPath(import.meta.url));

function parseArgs(argv) {
  const args = {
    root: process.cwd(),
    threshold: 80,
    noPdf: false,
    pdfCmd: null,
    dryRun: false,
  };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--root') args.root = resolve(argv[++i] ?? '');
    else if (a === '--threshold') args.threshold = Number(argv[++i]);
    else if (a === '--no-pdf') args.noPdf = true;
    else if (a === '--pdf-cmd') args.pdfCmd = argv[++i] ?? null;
    else if (a === '--dry-run') args.dryRun = true;
  }
  if (!Number.isFinite(args.threshold)) args.threshold = 80;
  return args;
}

function slugify(s) {
  return String(s)
    .toLowerCase()
    .replaceAll(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '') || 'unknown';
}

function parsePipeline(text) {
  const entries = [];
  for (const match of text.matchAll(/^- \[ \] (https?:\/\/\S+)(?:\s*\|\s*([^|\n]+))?(?:\s*\|\s*([^|\n]+))?/gm)) {
    const [line, url, companyRaw, titleRaw] = match;
    entries.push({
      raw: line,
      url,
      company: (companyRaw || '').trim(),
      title: (titleRaw || '').trim(),
    });
  }
  return entries;
}

function scoreByUrl(rootDir) {
  const reportsDir = join(rootDir, 'reports');
  const out = new Map();
  if (!existsSync(reportsDir)) return out;
  for (const file of readdirSync(reportsDir)) {
    if (!file.endsWith('.md')) continue;
    let text;
    try { text = readFileSync(join(reportsDir, file), 'utf-8'); } catch { continue; }
    const urlMatch = text.match(/\*\*URL:\*\*\s*(\S+)/i);
    const scoreMatch = text.match(/\*\*Score:\*\*\s*([\d.]+)/i);
    if (!urlMatch || !scoreMatch) continue;
    const score5 = Number(scoreMatch[1]);
    if (!Number.isFinite(score5)) continue;
    out.set(urlMatch[1], { score100: score5 * 20, reportFile: file });
  }
  return out;
}

function buildPromotedRow(entry, score100, pdfPath) {
  const parts = [`- [x] ~~${entry.url}~~`];
  if (entry.company) parts.push(entry.company);
  if (entry.title) parts.push(entry.title);
  parts.push(`score ${score100.toFixed(0)}`);
  parts.push(`→ submit-queue`);
  return parts.join(' | ');
}

function buildQueueRow(entry, score100, pdfPath) {
  const parts = [`- [ ] ${entry.url}`];
  if (entry.company) parts.push(entry.company);
  if (entry.title) parts.push(entry.title);
  parts.push(`score ${score100.toFixed(0)}`);
  parts.push(`cv ${pdfPath}`);
  return parts.join(' | ');
}

function ensureQueueScaffold(text) {
  if (text && /^##\s+Queued/m.test(text)) return text;
  const header = '# Submit Queue\n\nEntries promoted from `data/pipeline.md` once they cross the\n`queue-applications.mjs --threshold` cutoff. Each row carries a normalized\nscore (0-100) and the path to a pre-generated CV PDF.\n\n## Queued\n';
  if (!text || !text.trim()) return header;
  return text.trimEnd() + '\n\n## Queued\n';
}

function runPdf({ rootDir, entry, pdfCmd, noPdf, dryRun }) {
  if (noPdf) return { skipped: true };
  const slug = slugify(entry.company || entry.title || entry.url);
  const outputDir = join(rootDir, 'output');
  mkdirSync(outputDir, { recursive: true });
  const pdfPath = join(outputDir, `cv-${slug}.pdf`);
  if (dryRun) return { path: pdfPath, dryRun: true };
  if (pdfCmd) {
    const res = spawnSync(pdfCmd, [pdfPath, entry.url, entry.company, entry.title], {
      cwd: rootDir,
      encoding: 'utf-8',
      timeout: 15_000,
      shell: true,
    });
    if (res.status !== 0) {
      return { path: pdfPath, error: `pdf-cmd exited ${res.status}: ${res.stderr || res.stdout}` };
    }
    return { path: pdfPath };
  }
  // Default: invoke generate-pdf.mjs from the script directory. The renderer
  // expects an HTML input — fall through to a templated placeholder so the
  // command path is exercised even when the consumer has no tailored HTML
  // staged yet. Failure here is non-fatal: the queue entry still records the
  // intended PDF path so the operator can regenerate later.
  const htmlPath = join(outputDir, `cv-${slug}.html`);
  if (!existsSync(htmlPath)) {
    const stub = `<!doctype html><meta charset="utf-8"><title>CV — ${entry.company || entry.title || 'role'}</title><body><h1>${entry.company || ''} ${entry.title || ''}</h1><p>${entry.url}</p></body>`;
    writeFileSync(htmlPath, stub);
  }
  const generator = join(SCRIPT_DIR, 'generate-pdf.mjs');
  const res = spawnSync(process.execPath, [generator, htmlPath, pdfPath], {
    cwd: rootDir,
    encoding: 'utf-8',
    timeout: 60_000,
  });
  if (res.status !== 0) {
    return { path: pdfPath, error: `generate-pdf exited ${res.status}: ${res.stderr?.slice(0, 200) || res.stdout?.slice(0, 200)}` };
  }
  return { path: pdfPath };
}

function rewritePipeline(pipelineText, promotions) {
  let next = pipelineText;
  for (const { entry, score100 } of promotions) {
    const replacement = buildPromotedRow(entry, score100);
    next = next.replace(entry.raw, replacement);
  }
  return next;
}

function main() {
  const args = parseArgs(process.argv.slice(2));
  const rootDir = args.root;
  const pipelinePath = join(rootDir, 'data/pipeline.md');
  const queuePath = join(rootDir, 'data/submit-queue.md');

  if (!existsSync(pipelinePath)) {
    process.stderr.write(`queue-applications: ${pipelinePath} not found\n`);
    process.exit(0);
  }

  const pipelineText = readFileSync(pipelinePath, 'utf-8');
  const entries = parsePipeline(pipelineText);
  const scores = scoreByUrl(rootDir);

  const promotions = [];
  const skipped = [];
  for (const entry of entries) {
    const hit = scores.get(entry.url);
    if (!hit) { skipped.push({ entry, reason: 'no matching report' }); continue; }
    if (hit.score100 < args.threshold) { skipped.push({ entry, reason: `below threshold (${hit.score100.toFixed(0)} < ${args.threshold})` }); continue; }
    promotions.push({ entry, score100: hit.score100, reportFile: hit.reportFile });
  }

  if (args.dryRun) {
    process.stdout.write(`queue-applications: would promote ${promotions.length} entr${promotions.length === 1 ? 'y' : 'ies'} (threshold ${args.threshold})\n`);
    for (const p of promotions) {
      process.stdout.write(`  + ${p.entry.url} | ${p.entry.company} | score ${p.score100.toFixed(0)}\n`);
    }
    process.exit(0);
  }

  const queueRows = [];
  const errors = [];
  for (const p of promotions) {
    const pdf = runPdf({ rootDir, entry: p.entry, pdfCmd: args.pdfCmd, noPdf: args.noPdf, dryRun: false });
    if (pdf.error) errors.push({ entry: p.entry, error: pdf.error });
    const pdfPath = pdf.path ? pdf.path.replace(rootDir + '/', '') : '(none)';
    queueRows.push(buildQueueRow(p.entry, p.score100, pdfPath));
  }

  if (promotions.length > 0) {
    const existingQueue = existsSync(queuePath) ? readFileSync(queuePath, 'utf-8') : '';
    const scaffolded = ensureQueueScaffold(existingQueue);
    const queueOut = scaffolded.trimEnd() + '\n' + queueRows.join('\n') + '\n';
    writeFileSync(queuePath, queueOut);
    writeFileSync(pipelinePath, rewritePipeline(pipelineText, promotions));
  }

  process.stdout.write(`queue-applications: promoted ${promotions.length} entr${promotions.length === 1 ? 'y' : 'ies'} at threshold ${args.threshold}; skipped ${skipped.length}\n`);
  for (const e of errors) {
    process.stderr.write(`  ! pdf error for ${e.entry.url}: ${e.error}\n`);
  }
  process.exit(0);
}

main();
