/**
 * outreach — cold-message generator for a (person, JD) pair.
 *
 * Reads two structured JSON inputs and emits a 4-line cold message (≤500
 * chars) that:
 *   1. opens with the recipient's first name,
 *   2. cites one specific signal from the person JSON (article, talk, repo),
 *   3. ties to the role on the JD side in one line,
 *   4. closes with a single concrete ask.
 *
 * Deterministic and offline by default. Signal selection is a stable rank
 * (most-recent first, ties broken by signal kind priority article > talk >
 * github) so the same input pair always produces the same message — which
 * is what makes the test loop tractable.
 *
 * Sibling pattern: notify-slack (round-1 PR #8) emits to an external
 * surface; outreach is the same notify-out shape but for human cold
 * messages, the destination being stdout or a markdown file.
 */

import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs';
import { join } from 'node:path';

export const MAX_MESSAGE_CHARS = 500;

const SIGNAL_KIND_PRIORITY = ['article', 'talk', 'github', 'post', 'release', 'press'];

export function slugify(name) {
  return String(name)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

export function parsePerson(text) {
  let raw;
  try {
    raw = JSON.parse(text);
  } catch (e) {
    const err = new Error(`outreach: person JSON is not valid JSON: ${e.message}`);
    err.code = 'EPERSONJSON';
    throw err;
  }
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) {
    const err = new Error('outreach: person JSON must be an object at the root');
    err.code = 'EPERSONSHAPE';
    throw err;
  }
  const firstName = typeof raw.first_name === 'string' ? raw.first_name.trim() : '';
  if (!firstName) {
    const err = new Error('outreach: person.first_name is required (non-empty string)');
    err.code = 'EPERSONNAME';
    throw err;
  }
  const signals = Array.isArray(raw.signals) ? raw.signals : [];
  if (signals.length === 0) {
    const err = new Error('outreach: person.signals must be a non-empty array');
    err.code = 'EPERSONSIGNALS';
    throw err;
  }
  return raw;
}

export function parseJd(text) {
  let raw;
  try {
    raw = JSON.parse(text);
  } catch (e) {
    const err = new Error(`outreach: jd JSON is not valid JSON: ${e.message}`);
    err.code = 'EJDJSON';
    throw err;
  }
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) {
    const err = new Error('outreach: jd JSON must be an object at the root');
    err.code = 'EJDSHAPE';
    throw err;
  }
  if (!raw.title || typeof raw.title !== 'string') {
    const err = new Error('outreach: jd.title is required (non-empty string)');
    err.code = 'EJDTITLE';
    throw err;
  }
  return raw;
}

/**
 * Pick the single signal the cold message will cite. Stable, deterministic.
 * Ranking:
 *   1. signals with a parseable `published_at` or `last_active` — most recent
 *      date wins;
 *   2. ties broken by SIGNAL_KIND_PRIORITY index (lower index = stronger);
 *   3. final tiebreak: source-array index (stable).
 */
export function pickSignal(signals) {
  const decorated = signals.map((s, i) => {
    const dateStr = s.published_at ?? s.last_active ?? null;
    const ts = dateStr ? Date.parse(dateStr) : Number.NEGATIVE_INFINITY;
    const kindIdx = SIGNAL_KIND_PRIORITY.indexOf(s.kind);
    return {
      signal: s,
      ts: Number.isFinite(ts) ? ts : Number.NEGATIVE_INFINITY,
      kindRank: kindIdx === -1 ? SIGNAL_KIND_PRIORITY.length : kindIdx,
      origIdx: i,
    };
  });
  decorated.sort((a, b) => {
    if (b.ts !== a.ts) return b.ts - a.ts;
    if (a.kindRank !== b.kindRank) return a.kindRank - b.kindRank;
    return a.origIdx - b.origIdx;
  });
  return decorated[0].signal;
}

/**
 * Format the cited-signal line for the message. We surface the title (or
 * repo) as the anchor, since that is what makes the line specific enough
 * for the recipient to recognize as not-boilerplate.
 */
export function formatSignalLine(signal) {
  const title = signal.title ?? signal.repo ?? signal.url ?? 'your recent work';
  if (signal.kind === 'article' || signal.kind === 'post' || signal.kind === 'press') {
    return `Your piece "${title}" landed with me`;
  }
  if (signal.kind === 'talk') {
    const venue = signal.venue ? ` at ${signal.venue}` : '';
    return `Your talk "${title}"${venue} stuck with me`;
  }
  if (signal.kind === 'github' || signal.kind === 'release') {
    return `${title} on GitHub is doing exactly the kind of work I want to ship against`;
  }
  return `"${title}" caught my eye`;
}

/**
 * Compose the 4-line message. Hard-capped at MAX_MESSAGE_CHARS (500).
 * Line shape:
 *   1. "Hi <FirstName>,"
 *   2. <signal cite>.
 *   3. I'm exploring the <JD title>{ at <Company>} role — <one-line fit>.
 *   4. Worth a 15-min call this week? Happy to send a 1-paragraph fit summary first.
 */
export function composeMessage({ person, jd, signal }) {
  const firstName = person.first_name.trim();
  const role = jd.title.trim();
  const company = (jd.company ?? person.company ?? '').trim();
  const roleClause = company ? `${role} role at ${company}` : `${role} role`;
  const signalLine = formatSignalLine(signal);

  const fitLine = `I'm looking at the ${roleClause} and the eval-and-reliability framing matches how I already operate.`;

  const ask = 'Worth a 15-min call this week? I can send a 1-paragraph fit summary first.';

  const lines = [
    `Hi ${firstName},`,
    `${signalLine}.`,
    fitLine,
    ask,
  ];

  let text = lines.join('\n');

  // Hard truncate guard. The composition above is engineered to stay under
  // the cap on every fixture we ship, but a long signal title could push it
  // over — when that happens, shorten the signal line first (it's the most
  // variable input), then degrade gracefully without losing the name or ask.
  if (text.length > MAX_MESSAGE_CHARS) {
    const overage = text.length - MAX_MESSAGE_CHARS;
    const shrunk = `${signalLine}.`.slice(0, Math.max(1, `${signalLine}.`.length - overage - 1)) + '…';
    text = [`Hi ${firstName},`, shrunk, fitLine, ask].join('\n');
    if (text.length > MAX_MESSAGE_CHARS) {
      text = text.slice(0, MAX_MESSAGE_CHARS - 1) + '…';
    }
  }

  return text;
}

/**
 * Extract a short "specific signal phrase" from the signal that MUST appear
 * verbatim in the composed message. Used by the test contract to assert that
 * one specific signal from the person JSON survived rendering.
 */
export function signalAnchorPhrase(signal) {
  if (signal.title) return signal.title;
  if (signal.repo) return signal.repo;
  if (signal.url) return signal.url;
  return '';
}

export async function runOutreach({ personPath, jdPath, root, outDirOverride, writeFile }) {
  if (!existsSync(personPath)) {
    const err = new Error(`outreach: person file not found: ${personPath}`);
    err.code = 'ENOPERSON';
    throw err;
  }
  if (!existsSync(jdPath)) {
    const err = new Error(`outreach: jd file not found: ${jdPath}`);
    err.code = 'ENOJD';
    throw err;
  }
  const person = parsePerson(readFileSync(personPath, 'utf-8'));
  const jd = parseJd(readFileSync(jdPath, 'utf-8'));
  const signal = pickSignal(person.signals);
  const message = composeMessage({ person, jd, signal });

  let outPath = null;
  if (writeFile) {
    const outDir = outDirOverride ?? join(root, 'out');
    mkdirSync(outDir, { recursive: true });
    const slug = `${slugify(person.first_name + '-' + (person.last_name ?? ''))}__${slugify(jd.title)}`;
    outPath = join(outDir, `outreach-${slug}.md`);
    const frontmatter = [
      '---',
      `recipient: ${person.first_name}${person.last_name ? ' ' + person.last_name : ''}`,
      `role: ${jd.title}`,
      `company: ${jd.company ?? ''}`,
      `signal_kind: ${signal.kind ?? 'unknown'}`,
      `signal_anchor: ${signalAnchorPhrase(signal)}`,
      `chars: ${message.length}`,
      `generated_at: ${new Date().toISOString()}`,
      '---',
      '',
      message,
      '',
    ].join('\n');
    writeFileSync(outPath, frontmatter, 'utf-8');
  }

  return { message, signal, person, jd, outPath };
}

export function parseArgs(argv) {
  const args = { person: null, jd: null, root: process.cwd(), outDir: null, write: false, help: false };
  const positional = [];
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--root') args.root = argv[++i] ?? process.cwd();
    else if (a === '--out-dir') args.outDir = argv[++i] ?? null;
    else if (a === '--write') args.write = true;
    else if (a === '--help' || a === '-h') args.help = true;
    else if (a.startsWith('--')) {
      const err = new Error(`outreach: unknown flag ${a}`);
      err.code = 'EUSAGE';
      throw err;
    } else positional.push(a);
  }
  if (positional.length > 0) args.person = positional[0];
  if (positional.length > 1) args.jd = positional[1];
  return args;
}

export const HELP = [
  'Usage: outreach <person.json> <jd.json> [--write] [--root <dir>] [--out-dir <dir>]',
  '',
  '  <person.json>  Path to the recipient profile (must include first_name and',
  '                 at least one entry in signals[]).',
  '  <jd.json>      Path to the JD (must include title).',
  '  --write        Also write the message + frontmatter to <root>/out/outreach-<slug>.md.',
  '                 Without --write, the message prints to stdout only.',
  '  --root         Project root (defaults to cwd). Output goes to <root>/out/.',
  '  --out-dir      Override output directory.',
  '',
  'Prints a 4-line cold message (≤500 chars) that opens with the recipient',
  'first name and cites one specific signal from the person JSON.',
].join('\n');
