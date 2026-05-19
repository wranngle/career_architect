/**
 * tailor — per-JD CV variant generator.
 *
 * Reads a JD markdown file (heading + body) and a canonical CV markdown, then
 * emits a one-pager variant at <root>/out/cv-<slug>.md whose bullet ordering
 * inside each Work Experience role has been re-ranked against the JD keyword
 * signal. The canonical CV remains untouched; only the variant is written.
 *
 * Markdown emit pattern (frontmatter + sections, see PR #5 / funnel-metrics
 * for the in-repo precedent) — the file is human-readable AND machine-parsable
 * via the `---` YAML-ish frontmatter block at the top.
 *
 * The "LLM" client is pluggable: callers inject a `rankBullets(bullets, jd)`
 * function. The bundled mock client is a deterministic keyword-overlap scorer,
 * which keeps tests reproducible and offline.
 */

import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs';
import { join, dirname, resolve, basename } from 'node:path';

export const STOPWORDS = new Set([
  'the', 'a', 'an', 'and', 'or', 'but', 'of', 'in', 'on', 'at', 'to', 'for',
  'with', 'by', 'from', 'as', 'is', 'are', 'was', 'were', 'be', 'been', 'being',
  'this', 'that', 'these', 'those', 'it', 'its', 'we', 'you', 'they', 'our',
  'your', 'their', 'will', 'would', 'should', 'could', 'can', 'may', 'might',
  'have', 'has', 'had', 'do', 'does', 'did', 'not', 'no', 'so', 'if', 'then',
  'than', 'about', 'into', 'over', 'under', 'between', 'across', 'per',
  're', 'role', 'work', 'team', 'teams', 'engineer', 'engineering', 'senior',
  'years', 'year',
]);

export function slugify(name) {
  return String(name)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

export function tokenize(text) {
  return String(text)
    .toLowerCase()
    .match(/[a-z][a-z0-9+#.-]{2,}/g) ?? [];
}

export function keywordsFromJd(jdText) {
  const freq = new Map();
  for (const tok of tokenize(jdText)) {
    if (STOPWORDS.has(tok)) continue;
    freq.set(tok, (freq.get(tok) ?? 0) + 1);
  }
  return freq;
}

export function scoreBullet(bullet, jdKeywords) {
  let score = 0;
  for (const tok of tokenize(bullet)) {
    if (STOPWORDS.has(tok)) continue;
    const w = jdKeywords.get(tok);
    if (w) score += w;
  }
  return score;
}

/**
 * Parse the JD heading and full body. The first `# ` heading is the title;
 * the rest is preserved verbatim for the LLM scorer to read.
 */
export function parseJd(jdText) {
  const lines = jdText.split('\n');
  let title = '';
  for (const line of lines) {
    const m = /^#\s+(.+?)\s*$/.exec(line);
    if (m) { title = m[1].trim(); break; }
  }
  if (!title) {
    const err = new Error('tailor: JD file is missing a top-level `# Title` heading');
    err.code = 'ENOJDTITLE';
    throw err;
  }
  return { title, body: jdText };
}

/**
 * Parse a CV markdown into a structured shape we can re-rank without losing
 * the original prose. Sections: top-of-page header lines (before the first
 * `## ` heading), then named sections keyed by their `## ` heading. Inside
 * each section we surface H3 sub-blocks (e.g. each role under Work Experience)
 * with their bullet lists, so we can re-order bullets per-role.
 */
export function parseCv(cvText) {
  const lines = cvText.split('\n');
  const header = [];
  const sections = [];
  let current = null;

  const flushBlock = (section, block) => {
    if (block) section.blocks.push(block);
  };

  let currentBlock = null;
  for (const raw of lines) {
    const sectionMatch = /^##\s+(.+?)\s*$/.exec(raw);
    const subMatch = /^###\s+(.+?)\s*$/.exec(raw);
    if (sectionMatch) {
      if (current) {
        flushBlock(current, currentBlock);
        currentBlock = null;
      }
      current = { heading: sectionMatch[1].trim(), preamble: [], blocks: [] };
      sections.push(current);
      continue;
    }
    if (!current) {
      header.push(raw);
      continue;
    }
    if (subMatch) {
      flushBlock(current, currentBlock);
      currentBlock = { heading: subMatch[1].trim(), preface: [], bullets: [] };
      continue;
    }
    if (currentBlock) {
      const bulletMatch = /^-\s+(.+)$/.exec(raw);
      if (bulletMatch) {
        currentBlock.bullets.push(bulletMatch[1].trimEnd());
      } else {
        currentBlock.preface.push(raw);
      }
    } else {
      current.preamble.push(raw);
    }
  }
  if (current) flushBlock(current, currentBlock);
  return { header, sections };
}

/**
 * Rerank the bullets inside every H3 block of every section, using the
 * provided ranker. Stable: equal scores preserve source order so a no-signal
 * JD doesn't shuffle anything. Returns a NEW parsed CV — the input is not
 * mutated.
 */
export function rerankCv(parsed, ranker) {
  const sections = parsed.sections.map((s) => ({
    ...s,
    blocks: s.blocks.map((b) => {
      if (b.bullets.length === 0) return b;
      const scored = b.bullets.map((text, originalIndex) => ({
        text,
        originalIndex,
        score: ranker(text),
      }));
      scored.sort((a, b2) => (b2.score - a.score) || (a.originalIndex - b2.originalIndex));
      return { ...b, bullets: scored.map((x) => x.text) };
    }),
  }));
  return { header: parsed.header, sections };
}

/**
 * Mock LLM client. Deterministic, offline. Returns a ranker function over
 * bullets given a JD's keyword frequency map.
 */
export function mockLlmClient(jdText) {
  const kws = keywordsFromJd(jdText);
  return {
    rankBullets(bullet) {
      return scoreBullet(bullet, kws);
    },
    keywords: kws,
  };
}

export function renderCvMarkdown({ jdTitle, sourceCv, jdPath, generatedAt, parsed }) {
  const lines = [];
  lines.push('---');
  lines.push(`title: ${jdTitle}`);
  lines.push(`source_cv: ${sourceCv}`);
  lines.push(`jd: ${jdPath}`);
  lines.push(`generated_at: ${generatedAt}`);
  lines.push(`tailor_version: 1`);
  lines.push('---');
  lines.push('');
  for (const h of parsed.header) lines.push(h);
  if (parsed.header.length === 0 || parsed.header[parsed.header.length - 1] !== '') {
    lines.push('');
  }
  for (const section of parsed.sections) {
    lines.push(`## ${section.heading}`);
    for (const p of section.preamble) lines.push(p);
    for (const block of section.blocks) {
      lines.push(`### ${block.heading}`);
      for (const p of block.preface) lines.push(p);
      for (const bullet of block.bullets) lines.push(`- ${bullet}`);
    }
  }
  // Normalize trailing whitespace — single trailing newline.
  let out = lines.join('\n').replace(/\n{3,}/g, '\n\n');
  if (!out.endsWith('\n')) out += '\n';
  return out;
}

export function defaultCvCandidates(root) {
  return [
    join(root, 'cv.md'),
    join(root, 'examples/cv-example.md'),
  ];
}

export function resolveCvPath(root, override) {
  if (override) {
    const p = resolve(override);
    if (!existsSync(p)) {
      const err = new Error(`tailor: CV file not found: ${p}`);
      err.code = 'ENOCV';
      throw err;
    }
    return p;
  }
  for (const candidate of defaultCvCandidates(root)) {
    if (existsSync(candidate)) return candidate;
  }
  const err = new Error(
    `tailor: no CV found under ${root} (tried cv.md and examples/cv-example.md)`,
  );
  err.code = 'ENOCV';
  throw err;
}

export async function runTailor({ jdPath, root, cvPath, llm, outDirOverride }) {
  if (!existsSync(jdPath)) {
    const err = new Error(`tailor: JD file not found: ${jdPath}`);
    err.code = 'ENOJD';
    throw err;
  }
  const jdText = readFileSync(jdPath, 'utf-8');
  const { title } = parseJd(jdText);

  const resolvedCv = resolveCvPath(root, cvPath);
  const cvText = readFileSync(resolvedCv, 'utf-8');
  const parsedCv = parseCv(cvText);

  const client = llm ?? mockLlmClient(jdText);
  const reranked = rerankCv(parsedCv, (bullet) => client.rankBullets(bullet, jdText));

  const md = renderCvMarkdown({
    jdTitle: title,
    sourceCv: resolvedCv,
    jdPath,
    generatedAt: new Date().toISOString(),
    parsed: reranked,
  });

  const outDir = outDirOverride ?? join(root, 'out');
  mkdirSync(outDir, { recursive: true });
  const slug = slugify(title);
  const outPath = join(outDir, `cv-${slug}.md`);
  writeFileSync(outPath, md, 'utf-8');

  return { outPath, slug, title, sourceCv: resolvedCv, parsedCv, reranked };
}

export function parseArgs(argv) {
  const args = { jd: null, root: process.cwd(), cv: null, outDir: null };
  const positional = [];
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--root') args.root = argv[++i] ?? process.cwd();
    else if (a === '--cv') args.cv = argv[++i] ?? null;
    else if (a === '--out-dir') args.outDir = argv[++i] ?? null;
    else if (a === '--help' || a === '-h') args.help = true;
    else if (a.startsWith('--')) {
      const err = new Error(`tailor: unknown flag ${a}`);
      err.code = 'EUSAGE';
      throw err;
    } else positional.push(a);
  }
  if (positional.length > 0) args.jd = positional[0];
  return args;
}

export const HELP = [
  'Usage: tailor <jd.md> [--root <dir>] [--cv <cv.md>] [--out-dir <dir>]',
  '',
  '  <jd.md>     Path to the JD markdown (must have a top-level `# Title`).',
  '  --root      Project root (defaults to cwd). Output goes to <root>/out/.',
  '  --cv        Override CV source. Default: <root>/cv.md, then',
  '              <root>/examples/cv-example.md.',
  '  --out-dir   Override output directory.',
  '',
  'Writes <out-dir>/cv-<jd-slug>.md with frontmatter and the same sections as',
  'the source CV, but with each role\'s bullets re-ranked against the JD\'s',
  'keyword signal (highest-relevance bullet first). Deterministic and offline',
  'with the bundled mock ranker.',
].join('\n');
