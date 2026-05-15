#!/usr/bin/env node
/**
 * notify-slack.mjs — Post a Slack webhook when a scan finds a high-fit role.
 *
 * Inputs (CLI flags override env / report parsing):
 *   --report <path>     Path to a reports/*.md file; pulls Score, role, URL from it.
 *   --role <name>       Role display name (overrides report parse).
 *   --score <n>         Score numerator (0..5). Overrides report parse.
 *   --score-out-of <n>  Score denominator (default 5).
 *   --cv-path <path>    Path to tailored CV (PDF/markdown). Surfaced in payload.
 *   --url <url>         Job posting URL (overrides report parse).
 *   --threshold <n>     Min score to fire (default 4.0). Below threshold = exit 0, no POST.
 *   --webhook <url>     Override SLACK_WEBHOOK_URL.
 *   --dry-run           Print the payload, do not POST. Exit 0.
 *
 * Behavior:
 *   - Webhook unset (no --webhook, no SLACK_WEBHOOK_URL): print skip notice, exit 0.
 *   - Score < threshold: print skip notice, exit 0.
 *   - Otherwise: POST application/json with { role, score, scoreOutOf, cvPath, url,
 *     threshold, text, blocks } to the webhook. Non-2xx response = exit 1.
 *
 * Usage:
 *   SLACK_WEBHOOK_URL=https://hooks.slack.com/services/... \
 *     node notify-slack.mjs --report reports/042-acme-2026-05-14.md \
 *                           --cv-path output/cv-acme.pdf
 *   node notify-slack.mjs --role "Voice Eng" --score 4.6 --cv-path output/cv.pdf --dry-run
 */

import { readFileSync, existsSync } from 'node:fs';

function parseArgs(argv) {
  const args = {
    report: null,
    role: null,
    score: null,
    scoreOutOf: 5,
    cvPath: null,
    url: null,
    threshold: 4.0,
    webhook: null,
    dryRun: false,
  };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--report') args.report = argv[++i];
    else if (a === '--role') args.role = argv[++i];
    else if (a === '--score') args.score = Number(argv[++i]);
    else if (a === '--score-out-of') args.scoreOutOf = Number(argv[++i]);
    else if (a === '--cv-path') args.cvPath = argv[++i];
    else if (a === '--url') args.url = argv[++i];
    else if (a === '--threshold') args.threshold = Number(argv[++i]);
    else if (a === '--webhook') args.webhook = argv[++i];
    else if (a === '--dry-run') args.dryRun = true;
    else if (a === '--help' || a === '-h') {
      process.stdout.write(readFileSync(new URL(import.meta.url)).toString().split('\n').slice(1, 28).join('\n').replace(/^ \*\/?/gm, '').trim() + '\n');
      process.exit(0);
    }
  }
  return args;
}

function parseReport(path) {
  if (!existsSync(path)) {
    throw new Error(`report not found: ${path}`);
  }
  const text = readFileSync(path, 'utf-8');
  const result = { role: null, score: null, scoreOutOf: 5, url: null };
  const h1 = text.match(/^#\s+(?:Evaluation:\s*)?(.+?)\s*$/m);
  if (h1) result.role = h1[1].trim();
  const scoreLine = text.match(/^\*\*Score:\*\*\s*([\d.]+)\s*\/\s*(\d+)/m);
  if (scoreLine) {
    result.score = Number(scoreLine[1]);
    result.scoreOutOf = Number(scoreLine[2]);
  }
  const urlLine = text.match(/^\*\*URL:\*\*\s*(\S+)/m);
  if (urlLine) result.url = urlLine[1].trim();
  return result;
}

function buildPayload({ role, score, scoreOutOf, cvPath, url, threshold }) {
  const ratio = `${score}/${scoreOutOf}`;
  const summary = `High-fit role: ${role} (${ratio})`;
  const lines = [`*${role}* — score *${ratio}* (threshold ${threshold})`];
  if (url) lines.push(`Posting: <${url}>`);
  if (cvPath) lines.push(`Tailored CV: \`${cvPath}\``);
  return {
    role,
    score,
    scoreOutOf,
    threshold,
    cvPath: cvPath ?? null,
    url: url ?? null,
    text: summary,
    blocks: [
      {
        type: 'section',
        text: { type: 'mrkdwn', text: lines.join('\n') },
      },
    ],
  };
}

async function main() {
  const args = parseArgs(process.argv.slice(2));

  let role = args.role;
  let score = args.score;
  let scoreOutOf = args.scoreOutOf;
  let url = args.url;
  if (args.report) {
    const parsed = parseReport(args.report);
    role ??= parsed.role;
    score ??= parsed.score;
    if (parsed.scoreOutOf) scoreOutOf = parsed.scoreOutOf;
    url ??= parsed.url;
  }
  if (!role || score == null || Number.isNaN(score)) {
    process.stderr.write('notify-slack: need --role and --score (or --report with parseable fields)\n');
    process.exit(2);
  }

  const webhook = args.webhook ?? process.env.SLACK_WEBHOOK_URL ?? '';
  if (!webhook) {
    process.stdout.write('notify-slack: SLACK_WEBHOOK_URL unset and no --webhook; skipping.\n');
    process.exit(0);
  }

  if (score < args.threshold) {
    process.stdout.write(`notify-slack: score ${score}/${scoreOutOf} below threshold ${args.threshold}; skipping.\n`);
    process.exit(0);
  }

  const payload = buildPayload({
    role, score, scoreOutOf, cvPath: args.cvPath, url, threshold: args.threshold,
  });

  if (args.dryRun) {
    process.stdout.write(JSON.stringify(payload, null, 2) + '\n');
    process.exit(0);
  }

  const res = await fetch(webhook, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(payload),
  });
  const responseBody = await res.text().catch(() => '');
  if (!res.ok) {
    process.stderr.write(`notify-slack: webhook returned ${res.status}: ${responseBody}\n`);
    process.exit(1);
  }
  process.stdout.write(`notify-slack: posted ${role} (${score}/${scoreOutOf}) -> ${res.status}\n`);
  process.exit(0);
}

main().catch((err) => {
  process.stderr.write(`notify-slack: ${err.message}\n`);
  process.exit(1);
});
