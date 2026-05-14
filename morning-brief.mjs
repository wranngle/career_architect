#!/usr/bin/env node
/**
 * morning-brief.mjs — Overnight career-ops summary.
 *
 * Reads from CWD (so it works in private-data repo or alongside the runtime):
 *   data/pipeline.md            — checkbox-style URL queue (recent additions = last 24h by scan-history.tsv or file mtime)
 *   data/scan-history.tsv       — optional, used to tag "new in last 24h" by first_seen
 *   reports/*.md                — picks top 3 by **Score:** N.N/5 frontmatter
 *   followup-cadence.mjs        — invoked via child_process in --overdue-only mode (script-relative)
 *
 * Prints three sections, in this fixed order, then exits 0:
 *   ## Today's top 3
 *   ## Followups due
 *   ## New in pipeline
 *
 * Empty sections render an italic "_(none)_" placeholder; missing files do
 * not error. Designed to be safe in a cron / morning shell-hook.
 *
 * Usage:
 *   node morning-brief.mjs                        — read from CWD, run followup-cadence
 *   node morning-brief.mjs --root <dir>           — override CWD for data/reports lookup
 *   node morning-brief.mjs --no-followups         — skip followup-cadence sub-invocation
 *   node morning-brief.mjs --since-hours <N>      — change "new" window (default 24)
 */

import { readFileSync, readdirSync, existsSync, statSync } from 'node:fs';
import { join, dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';

const SCRIPT_DIR = dirname(fileURLToPath(import.meta.url));

function parseArgs(argv) {
  const args = { root: process.cwd(), followups: true, sinceHours: 24 };
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    if (arg === '--root') args.root = resolve(argv[++i]);
    else if (arg === '--no-followups') args.followups = false;
    else if (arg === '--since-hours') args.sinceHours = Number(argv[++i]) || 24;
  }
  return args;
}

function readTopReports(rootDir, limit = 3) {
  const reportsDir = join(rootDir, 'reports');
  if (!existsSync(reportsDir)) return [];
  const entries = readdirSync(reportsDir).filter(f => f.endsWith('.md'));
  const parsed = [];
  for (const file of entries) {
    const full = join(reportsDir, file);
    let text;
    try { text = readFileSync(full, 'utf-8'); } catch { continue; }
    const scoreMatch = text.match(/\*\*Score:\*\*\s*([\d.]+)/i) || text.match(/^Score:\s*([\d.]+)/im);
    if (!scoreMatch) continue;
    const score = Number(scoreMatch[1]);
    if (!Number.isFinite(score)) continue;
    const titleMatch = text.match(/^#\s+(.+)$/m);
    const title = titleMatch ? titleMatch[1].trim() : file.replace(/\.md$/, '');
    parsed.push({ file, title, score });
  }
  parsed.sort((a, b) => b.score - a.score);
  return parsed.slice(0, limit);
}

function readRecentPipeline(rootDir, sinceHours) {
  const pipelinePath = join(rootDir, 'data/pipeline.md');
  if (!existsSync(pipelinePath)) return [];
  const text = readFileSync(pipelinePath, 'utf-8');
  const cutoffMs = Date.now() - sinceHours * 3600 * 1000;

  // Prefer scan-history.tsv to tag "first seen" timestamps. Each row:
  //   url<TAB>first_seen<TAB>portal<TAB>title<TAB>company<TAB>status
  const historyPath = join(rootDir, 'data/scan-history.tsv');
  const firstSeenByUrl = new Map();
  if (existsSync(historyPath)) {
    const histText = readFileSync(historyPath, 'utf-8');
    for (const line of histText.split('\n').slice(1)) {
      if (!line.trim()) continue;
      const cols = line.split('\t');
      const [url, firstSeen] = cols;
      if (!url || !firstSeen) continue;
      const d = Date.parse(firstSeen);
      if (Number.isFinite(d) && !firstSeenByUrl.has(url)) firstSeenByUrl.set(url, d);
    }
  }

  // Fallback timestamp = pipeline.md mtime (covers fresh repos without history).
  const mtime = statSync(pipelinePath).mtimeMs;

  const items = [];
  for (const match of text.matchAll(/- \[ \] (https?:\/\/\S+)(?:\s*\|\s*([^|\n]+))?(?:\s*\|\s*([^|\n]+))?/g)) {
    const [, url, companyRaw, titleRaw] = match;
    const seenAt = firstSeenByUrl.get(url) ?? mtime;
    if (seenAt < cutoffMs) continue;
    items.push({
      url,
      company: (companyRaw || '').trim(),
      title: (titleRaw || '').trim(),
      seenAt,
    });
  }
  items.sort((a, b) => b.seenAt - a.seenAt);
  return items;
}

function readFollowupsDue(rootDir, enabled) {
  if (!enabled) return [];
  const scriptPath = join(SCRIPT_DIR, 'followup-cadence.mjs');
  if (!existsSync(scriptPath)) return [];
  const result = spawnSync(process.execPath, [scriptPath, '--overdue-only'], {
    cwd: rootDir,
    encoding: 'utf-8',
    timeout: 30_000,
  });
  if (result.status !== 0 || !result.stdout) return [];
  let payload;
  try { payload = JSON.parse(result.stdout); } catch { return []; }
  if (!payload?.entries) return [];
  return payload.entries.map(e => ({
    company: e.company,
    role: e.role,
    urgency: e.urgency,
    daysSinceApp: e.daysSinceApplication,
    daysSinceLast: e.daysSinceLastFollowup,
  }));
}

function renderBullets(lines) {
  if (lines.length === 0) return '_(none)_';
  return lines.map(line => `- ${line}`).join('\n');
}

function renderBrief({ topReports, followups, pipeline }) {
  const top = renderBullets(
    topReports.map(r => `**${r.score.toFixed(1)}** — ${r.title} _(reports/${r.file})_`)
  );
  const due = renderBullets(
    followups.map(f => {
      const lastBit = f.daysSinceLast === null || f.daysSinceLast === undefined
        ? `${f.daysSinceApp}d since apply`
        : `${f.daysSinceLast}d since last touch`;
      return `[${f.urgency}] ${f.company} — ${f.role} (${lastBit})`;
    })
  );
  const fresh = renderBullets(
    pipeline.map(p => {
      const label = [p.company, p.title].filter(Boolean).join(' — ') || p.url;
      return `${label} — ${p.url}`;
    })
  );

  return [
    "## Today's top 3",
    top,
    '',
    '## Followups due',
    due,
    '',
    '## New in pipeline',
    fresh,
    '',
  ].join('\n');
}

const args = parseArgs(process.argv.slice(2));
const topReports = readTopReports(args.root);
const followups = readFollowupsDue(args.root, args.followups);
const pipeline = readRecentPipeline(args.root, args.sinceHours);
process.stdout.write(renderBrief({ topReports, followups, pipeline }));
