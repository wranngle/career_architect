/**
 * rehearse — 5-turn mock recruiter call orchestrator.
 *
 * Pulls the most recent recon-brief markdown for a company under
 * <root>/interview-prep/, drives a turn-based dialog where the LLM client
 * generates the next recruiter question and the caller supplies the user
 * answer (stdin in live mode, scripted in test/--mock mode), then asks the
 * LLM to score the transcript.
 *
 * Output: <root>/interview-prep/<company-slug>/rehearsal-<timestamp>.md
 * with one `### Q{n}` and one `### A{n}` heading per turn (10 entries for
 * 5 turns) and a final `## Score` block.
 */

import { readFileSync, readdirSync, existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

export const DEFAULT_TURNS = 5;

export function slugify(name) {
  return String(name).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
}

export function findReconBrief(root, company) {
  const slug = slugify(company);
  const dir = join(root, 'interview-prep');
  if (!existsSync(dir)) return null;
  const candidates = readdirSync(dir)
    .filter((f) => f.startsWith(`${slug}-recon-`) && f.endsWith('.md'))
    .sort()
    .reverse();
  return candidates.length > 0 ? join(dir, candidates[0]) : null;
}

function isoTimestamp() {
  return new Date().toISOString().replace(/[:.]/g, '-');
}

export function renderTranscript({ company, generatedAt, recon, turns, score }) {
  const lines = [];
  lines.push(`# ${company} — recruiter-call rehearsal`);
  lines.push('');
  lines.push(`Generated: ${generatedAt}`);
  lines.push(`Recon source: ${recon ?? 'n/a'}`);
  lines.push('');
  lines.push('## Transcript');
  lines.push('');
  for (let i = 0; i < turns.length; i++) {
    const t = turns[i];
    lines.push(`### Q${i + 1}`);
    lines.push('');
    lines.push(t.question);
    lines.push('');
    lines.push(`### A${i + 1}`);
    lines.push('');
    lines.push(t.answer);
    lines.push('');
  }
  lines.push('## Score');
  lines.push('');
  lines.push(`Total: ${score.total} / ${score.max}`);
  lines.push('');
  lines.push('Breakdown:');
  for (const c of score.criteria ?? []) {
    lines.push(`- ${c.name}: ${c.score}/${c.max} — ${c.note ?? ''}`.trimEnd());
  }
  if (score.verdict) {
    lines.push('');
    lines.push(`Verdict: ${score.verdict}`);
  }
  lines.push('');
  return lines.join('\n');
}

/**
 * Build a mock LLM client from a fixture JSON file. The fixture provides
 * canned questions and (for test mode) the scripted user answers and the
 * scoring rubric.
 */
export function mockLlmClient(fixturePath) {
  const fixture = JSON.parse(readFileSync(fixturePath, 'utf-8'));
  const questions = fixture.questions ?? [];
  const rubric = fixture.scoring_rubric ?? { criteria: [], per_criterion_max: 0 };
  return {
    async nextQuestion(turnIndex /* , context */) {
      const q = questions[turnIndex];
      if (!q) throw new Error(`mock: no question for turn ${turnIndex}`);
      return q;
    },
    async score(transcript) {
      const per = rubric.per_criterion_max ?? 2;
      const criteria = (rubric.criteria ?? []).map((c, idx) => ({
        name: c,
        score: per,
        max: per,
        note: idx < transcript.length ? `answered turn ${idx + 1}` : 'skipped',
      }));
      const total = criteria.reduce((s, c) => s + c.score, 0);
      const max = criteria.reduce((s, c) => s + c.max, 0);
      return {
        total,
        max,
        criteria,
        verdict: rubric.verdict ?? (total >= max * 0.7 ? 'Advance' : 'Reject'),
      };
    },
    scriptedAnswers: fixture.scripted_answers ?? [],
  };
}

async function readStdinLine(prompt) {
  process.stdout.write(`${prompt}\n> `);
  return new Promise((resolve, reject) => {
    let buf = '';
    const onData = (chunk) => {
      buf += chunk.toString();
      const nl = buf.indexOf('\n');
      if (nl !== -1) {
        process.stdin.off('data', onData);
        process.stdin.off('error', onErr);
        process.stdin.pause();
        resolve(buf.slice(0, nl).trim());
      }
    };
    const onErr = (err) => {
      process.stdin.off('data', onData);
      reject(err);
    };
    process.stdin.on('data', onData);
    process.stdin.on('error', onErr);
    process.stdin.resume();
  });
}

export async function runRehearsal({ company, root, turns = DEFAULT_TURNS, llm, getAnswer }) {
  const recon = findReconBrief(root, company);
  if (!recon) {
    const err = new Error(`recon brief not found for ${company} under ${root}/interview-prep`);
    err.code = 'ENORECON';
    throw err;
  }
  const reconText = readFileSync(recon, 'utf-8');
  const turnRecords = [];
  for (let i = 0; i < turns; i++) {
    const question = await llm.nextQuestion(i, { recon: reconText, history: turnRecords });
    const answer = await getAnswer(i, question);
    turnRecords.push({ question, answer });
  }
  const score = await llm.score(turnRecords);
  const generatedAt = new Date().toISOString();
  const md = renderTranscript({ company, generatedAt, recon, turns: turnRecords, score });
  const outDir = join(root, 'interview-prep', slugify(company));
  mkdirSync(outDir, { recursive: true });
  const outPath = join(outDir, `rehearsal-${isoTimestamp()}.md`);
  writeFileSync(outPath, md, 'utf-8');
  return { outPath, turns: turnRecords, score };
}

export function parseArgs(argv) {
  const args = { company: null, turns: DEFAULT_TURNS, mock: null, root: process.cwd() };
  const positional = [];
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--company') args.company = argv[++i] ?? null;
    else if (a === '--turns') args.turns = Number.parseInt(argv[++i] ?? '', 10) || DEFAULT_TURNS;
    else if (a === '--mock') args.mock = argv[++i] ?? null;
    else if (a === '--root') args.root = argv[++i] ?? process.cwd();
    else if (a === '--help' || a === '-h') args.help = true;
    else if (a.startsWith('--')) {
      const err = new Error(`rehearse: unknown flag ${a}`);
      err.code = 'EUSAGE';
      throw err;
    } else positional.push(a);
  }
  if (!args.company && positional.length > 0) args.company = positional[0];
  return args;
}

export const HELP = [
  'Usage: rehearse --company <slug> [--turns 5] [--mock <fixture.json>] [--root <dir>]',
  '',
  '  --company   Company slug (matches recon-brief output filename).',
  '  --turns     Number of Q/A turns (default 5).',
  '  --mock      Path to mock-recruiter.json — skips stdin, returns canned questions.',
  '  --root      Project root containing interview-prep/ (default cwd).',
  '',
  'Reads the most recent <root>/interview-prep/<slug>-recon-*.md and writes',
  '<root>/interview-prep/<slug>/rehearsal-<timestamp>.md with the transcript',
  'and a final score block.',
].join('\n');
