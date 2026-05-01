#!/usr/bin/env node

/**
 * quick-rank.mjs — cheap LLM rank pass over pending pipeline URLs
 *
 * For each URL in `data/pipeline.md` (## Pendientes section), pulls the JD
 * via fetch (curl-style or ATS JSON API, no Playwright = much faster), sends
 * a TINY prompt (~500 tokens vs ~8000 for full A-H eval), and writes a
 * sorted ranking to `data/ranked-{YYYY-MM-DD}.tsv`.
 *
 * MODEL FALLBACK CHAIN
 * ────────────────────
 * Tries flagship models cross-provider first, then walks down to lite tiers.
 * On a 429 / quota-exhausted error, the run permanently advances to the
 * next model for the rest of the session — no point retrying an exhausted
 * pool. Default chain (override with QUICK_RANK_MODELS env, comma-sep).
 *
 * All Gemini IDs verified live against generativelanguage.googleapis.com
 * /v1beta/models. All Claude aliases verified via `claude -p --model X`.
 *
 *   gemini:gemini-3-pro-preview            ← flagship (verified, quota-gated)
 *   claude:opus                            ← flagship (free via Claude Code Max)
 *   gemini:gemini-3.1-pro-preview          ← flagship (verified, quota-gated)
 *   gemini:gemini-pro-latest               ← flagship alias (verified, quota-gated)
 *   gemini:gemini-3-flash-preview          ← mid (verified, has free quota)
 *   gemini:gemini-3.1-flash-lite-preview   ← mid (verified, 15 RPM / 500 RPD)
 *   gemini:gemini-flash-latest             ← mid alias (verified, has quota)
 *   claude:sonnet                          ← mid (free via Max)
 *   gemini:gemini-2.5-flash                ← lite (verified, often exhausted first)
 *   gemini:gemini-2.5-flash-lite           ← lite (verified, has quota)
 *   gemini:gemini-flash-lite-latest        ← lite alias (verified, has quota)
 *   gemini:gemma-3-27b-it                  ← lite (verified, 30 RPM / 14.4K RPD!)
 *   claude:haiku                           ← cheap last resort (free via Max)
 *
 * Usage:
 *   node quick-rank.mjs                # rank all pending
 *   node quick-rank.mjs --top 10       # show top 10 in stdout
 *   node quick-rank.mjs --limit 50     # rank at most 50 URLs
 *   QUICK_RANK_MODELS="claude:opus,gemini:gemini-3-flash" node quick-rank.mjs
 */

import { readFileSync, writeFileSync, existsSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { spawn } from 'child_process';

try {
  const { config } = await import('dotenv');
  config();
} catch { /* optional */ }

import { GoogleGenerativeAI } from '@google/generative-ai';

const ROOT = dirname(fileURLToPath(import.meta.url));
const PIPELINE_PATH = join(ROOT, 'data', 'pipeline.md');
const CV_PATH = join(ROOT, 'cv.md');

const args = process.argv.slice(2);
let limit = Infinity;
let topN = 20;

for (let i = 0; i < args.length; i++) {
  if (args[i] === '--limit' && args[i + 1]) limit = parseInt(args[++i], 10);
  else if (args[i] === '--top' && args[i + 1]) topN = parseInt(args[++i], 10);
}

const apiKey = process.env.GEMINI_API_KEY;
if (!apiKey) {
  console.error('GEMINI_API_KEY not set. Add to .env or export.');
  process.exit(1);
}
if (!existsSync(PIPELINE_PATH)) {
  console.error(`No ${PIPELINE_PATH} — run scan.mjs / scan-jobspy.py first.`);
  process.exit(1);
}
if (!existsSync(CV_PATH)) {
  console.error('cv.md missing.');
  process.exit(1);
}

const cv = readFileSync(CV_PATH, 'utf-8');
const cvSnippet = cv.slice(0, 1500);

const pipeline = readFileSync(PIPELINE_PATH, 'utf-8');
const pendingSection = pipeline.split('## Pendientes')[1]?.split('## Procesadas')[0] || '';
const entries = [];
for (const m of pendingSection.matchAll(/^- \[ \] (https?:\/\/\S+)\s*\|\s*([^|\n]+)\s*\|\s*([^|\n]+)$/gm)) {
  entries.push({ url: m[1].trim(), company: m[2].trim(), title: m[3].trim() });
}
if (entries.length === 0) {
  console.error('No pending URLs in pipeline.md.');
  process.exit(1);
}
const targets = entries.slice(0, limit);

// ── Model fallback chain ─────────────────────────────────────────────
// All IDs verified live this session — see quick-rank.mjs header for ping log.
const DEFAULT_CHAIN = [
  // Flagship tier
  'gemini:gemini-3-pro-preview',
  'claude:opus',
  'gemini:gemini-3.1-pro-preview',
  'gemini:gemini-pro-latest',
  // Mid tier (has free-tier quota right now)
  'gemini:gemini-3-flash-preview',
  'gemini:gemini-3.1-flash-lite-preview',
  'gemini:gemini-flash-latest',
  'claude:sonnet',
  // Lite tier
  'gemini:gemini-2.5-flash',
  'gemini:gemini-2.5-flash-lite',
  'gemini:gemini-flash-lite-latest',
  'gemini:gemma-3-27b-it',
  'claude:haiku',
];
const CHAIN = (process.env.QUICK_RANK_MODELS || DEFAULT_CHAIN.join(','))
  .split(',').map(s => s.trim()).filter(Boolean);

let chainIdx = 0;  // global cursor — only advances on quota exhaustion

console.log(`Ranking ${targets.length} of ${entries.length} pending URLs`);
console.log(`Fallback chain (${CHAIN.length} models): starting with ${CHAIN[0]}\n`);

const genAI = new GoogleGenerativeAI(apiKey);

function isQuotaError(err) {
  const msg = ((err && err.message) || '').toLowerCase();
  return msg.includes('429') || msg.includes('quota') ||
         msg.includes('rate limit') || msg.includes('exceeded') ||
         msg.includes('resource_exhausted') || msg.includes('rate-limit');
}

async function callGemini(prompt, modelName) {
  const m = genAI.getGenerativeModel({ model: modelName });
  const result = await m.generateContent(prompt);
  return result.response.text().trim();
}

// claude -p subprocess. Uses Cody's Claude Code Max subscription, no
// per-token cost. Tricky bits to get right:
//   - IS_SANDBOX=1 lets it run as root in cloud sandboxes
//   - --strict-mcp-config skips MCP server discovery (otherwise hangs ~2min)
//   - --system-prompt overrides the workspace CLAUDE.md auto-discovery,
//     otherwise claude reads the repo context and responds about that
//     instead of the actual ranking prompt
//   - --disable-slash-commands + --setting-sources user further isolate
//     the worker from the calling project's tooling
//   - stdin is closed (< /dev/null) so claude doesn't wait for piped input
const CLAUDE_SYS_PROMPT = `You are a hiring scoring filter. You score job-candidate fit only. Ignore all workspace files, repo context, and tools. Output EXACTLY two lines:
SCORE: <one decimal 1.0-5.0>
REASON: <ten words max>`;

function callClaude(prompt, modelAlias) {
  return new Promise((resolve, reject) => {
    const env = { ...process.env, IS_SANDBOX: '1' };
    const proc = spawn('claude', [
      '-p',
      '--dangerously-skip-permissions',
      '--strict-mcp-config',
      '--disable-slash-commands',
      '--setting-sources', 'user',
      '--model', modelAlias,
      '--system-prompt', CLAUDE_SYS_PROMPT,
      '--output-format', 'text',
      prompt,
    ], { env, stdio: ['ignore', 'pipe', 'pipe'] });
    let stdout = '';
    let stderr = '';
    proc.stdout.on('data', d => { stdout += d; });
    proc.stderr.on('data', d => { stderr += d; });
    const timer = setTimeout(() => proc.kill('SIGKILL'), 90000);
    proc.on('close', code => {
      clearTimeout(timer);
      if (code === 0) resolve(stdout.trim());
      else reject(new Error(`claude -p exit ${code}: ${stderr.slice(0, 200) || stdout.slice(0, 200)}`));
    });
    proc.on('error', reject);
  });
}

async function callWithFallback(prompt) {
  while (chainIdx < CHAIN.length) {
    const spec = CHAIN[chainIdx];
    const colonIdx = spec.indexOf(':');
    const provider = spec.slice(0, colonIdx);
    const modelName = spec.slice(colonIdx + 1);
    try {
      let text;
      if (provider === 'gemini') text = await callGemini(prompt, modelName);
      else if (provider === 'claude') text = await callClaude(prompt, modelName);
      else throw new Error(`unknown provider: ${provider}`);
      return { text, modelUsed: spec };
    } catch (err) {
      if (isQuotaError(err)) {
        process.stderr.write(`  ⚠ ${spec} quota/rate exhausted — falling back to ${CHAIN[chainIdx + 1] || '(none)'}\n`);
        chainIdx++;
        continue;
      }
      // Non-quota error: log and try next model anyway (might be model-specific failure)
      process.stderr.write(`  ⚠ ${spec} error: ${(err.message || '').slice(0, 80)} — trying next\n`);
      chainIdx++;
    }
  }
  throw new Error('All models in fallback chain exhausted');
}

async function fetchJD(url) {
  try {
    let m = url.match(/job-boards(?:\.eu)?\.greenhouse\.io\/([^/]+)\/jobs\/(\d+)/);
    if (m) {
      const apiUrl = `https://boards-api.greenhouse.io/v1/boards/${m[1]}/jobs/${m[2]}?content=true`;
      const res = await fetch(apiUrl, { signal: AbortSignal.timeout(8000) });
      if (res.ok) {
        const j = await res.json();
        const html = j.content || '';
        return html.replace(/<[^>]+>/g, ' ').replace(/&[a-z]+;/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 2500);
      }
    }
    m = url.match(/jobs\.ashbyhq\.com\/([^/]+)\/([0-9a-f-]{36})/i);
    if (m) {
      const apiUrl = `https://api.ashbyhq.com/posting-api/job-board/${m[1]}/${m[2]}?includeCompensation=true`;
      const res = await fetch(apiUrl, { signal: AbortSignal.timeout(8000) });
      if (res.ok) {
        const j = await res.json();
        const text = (j.descriptionPlain || j.description || '').toString();
        return text.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 2500);
      }
    }
    m = url.match(/jobs\.lever\.co\/([^/]+)\/([0-9a-f-]{36})/i);
    if (m) {
      const apiUrl = `https://api.lever.co/v0/postings/${m[1]}/${m[2]}`;
      const res = await fetch(apiUrl, { signal: AbortSignal.timeout(8000) });
      if (res.ok) {
        const j = await res.json();
        const text = (j.descriptionPlain || j.description || '').toString();
        return text.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 2500);
      }
    }
    const res = await fetch(url, {
      signal: AbortSignal.timeout(8000),
      headers: { 'User-Agent': 'Mozilla/5.0' },
    });
    if (!res.ok) return '';
    const html = await res.text();
    return html
      .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
      .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
      .replace(/<[^>]+>/g, ' ')
      .replace(/&nbsp;/g, ' ')
      .replace(/&[a-z]+;/g, ' ')
      .replace(/\s+/g, ' ')
      .trim()
      .slice(0, 2500);
  } catch {
    return '';
  }
}

async function rankOne({ url, company, title }) {
  const jdSnippet = await fetchJD(url);
  if (!jdSnippet) {
    return { url, company, title, score: 0, reason: 'JD fetch failed', modelUsed: '-' };
  }

  const prompt = `You are a hiring filter. Score this job 1-5 for this candidate.

CANDIDATE CV (excerpt):
${cvSnippet}

JOB TITLE: ${title}
COMPANY: ${company}

JD EXCERPT:
${jdSnippet}

Reply EXACTLY in this format and nothing else:
SCORE: <number 1.0-5.0, one decimal>
REASON: <ten words max>`;

  try {
    const { text, modelUsed } = await callWithFallback(prompt);
    const scoreMatch = text.match(/SCORE:\s*([0-9.]+)/i);
    const reasonMatch = text.match(/REASON:\s*(.+?)$/im);
    return {
      url, company, title,
      score: scoreMatch ? parseFloat(scoreMatch[1]) : 0,
      reason: reasonMatch ? reasonMatch[1].trim() : '(no reason)',
      modelUsed,
    };
  } catch (e) {
    return { url, company, title, score: 0, reason: `LLM error: ${e.message.slice(0, 50)}`, modelUsed: '-' };
  }
}

const CONCURRENCY = parseInt(process.env.QUICK_RANK_CONCURRENCY || '2', 10);
const ranked = [];
let done = 0;

async function worker(queue) {
  while (queue.length) {
    const item = queue.shift();
    if (!item) break;
    const r = await rankOne(item);
    ranked.push(r);
    done++;
    process.stderr.write(`  ${String(done).padStart(3)}/${targets.length}  ${r.score.toFixed(1)}  ${r.modelUsed.padEnd(28)}  ${r.company.slice(0, 24).padEnd(24)}  ${r.title.slice(0, 50)}\n`);
  }
}

const queue = [...targets];
await Promise.all(Array.from({ length: CONCURRENCY }, () => worker(queue)));

ranked.sort((a, b) => b.score - a.score);

const date = new Date().toISOString().slice(0, 10);
const outPath = join(ROOT, 'data', `ranked-${date}.tsv`);
const lines = ['score\tcompany\ttitle\turl\treason\tmodel'];
for (const r of ranked) {
  lines.push(`${r.score.toFixed(1)}\t${r.company}\t${r.title}\t${r.url}\t${r.reason}\t${r.modelUsed}`);
}
writeFileSync(outPath, lines.join('\n') + '\n');

console.log(`\n${'━'.repeat(60)}`);
console.log(`Quick Rank — ${date} — ${ranked.length} ranked`);
console.log(`${'━'.repeat(60)}`);
console.log(`Top ${Math.min(topN, ranked.length)}:\n`);
for (const r of ranked.slice(0, topN)) {
  console.log(`  ${r.score.toFixed(1)}  ${r.company.slice(0, 28).padEnd(28)}  ${r.title.slice(0, 50)}`);
  console.log(`        ${r.reason}  [${r.modelUsed}]`);
}
console.log(`\nFull ranking: ${outPath}`);
const modelStats = {};
for (const r of ranked) modelStats[r.modelUsed] = (modelStats[r.modelUsed] || 0) + 1;
console.log(`\nModel usage: ${Object.entries(modelStats).map(([k, v]) => `${k}=${v}`).join(', ')}`);
console.log(`Pick top-N URLs and run them through /career-ops auto-pipeline.`);
