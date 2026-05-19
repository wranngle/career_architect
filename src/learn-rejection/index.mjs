/**
 * learn-rejection — turn rejection emails into durable lessons.
 *
 * Reads a rejection email (markdown / plain text) and emits / amends
 * <root>/data/lessons.md with a new bullet that captures the actionable
 * signal from the email. The funnel-metrics CLI (feature #5, commit
 * c7ea9ab) tells us WHICH stage drops candidates; this CLI tells us WHY
 * a specific drop happened, and parks the lesson where the next tailor /
 * outreach / negotiate pass can read it.
 *
 * The "LLM" client is pluggable: callers inject `extractLesson(email, ctx)`.
 * The bundled mock client is a deterministic keyword + clause extractor
 * that finds the rejection reason (qualification gap, compliance / cert
 * requirement, location, level, comp). Offline, reproducible, no network.
 *
 * Lessons file is markdown + frontmatter (same shape as `tailor` PR #11
 * and `funnel-metrics` PR #5): one bullet per lesson, deduplicated by
 * its canonical-form signature, sorted newest-first.
 */

import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs';
import { join, resolve } from 'node:path';

export const LESSONS_VERSION = 1;

const STOPWORDS = new Set([
  'the', 'a', 'an', 'and', 'or', 'but', 'of', 'in', 'on', 'at', 'to', 'for',
  'with', 'by', 'from', 'as', 'is', 'are', 'was', 'were', 'be', 'been',
  'this', 'that', 'these', 'those', 'it', 'we', 'you', 'they', 'our', 'your',
  'their', 'will', 'would', 'should', 'could', 'can', 'have', 'has', 'had',
  'do', 'does', 'did', 'not', 'no', 'so', 'if', 'then', 'than', 'about',
  'into', 'over', 'under', 'between', 'per', 'team', 'role',
]);

/**
 * Reason taxonomy. Order matters: first match wins so a "SOC 2 compliance
 * gap" reads as `compliance` rather than `qualification_gap`. Each entry
 * names the bucket and the patterns that route an email there. Patterns
 * are case-insensitive substrings of either the raw email or its
 * tokenized form.
 */
export const REASON_RULES = [
  {
    kind: 'compliance',
    patterns: [
      /\bsoc\s?2\b/i, /\bsoc\s?ii\b/i, /\biso\s?27001\b/i, /\bhipaa\b/i,
      /\bgdpr\b/i, /\bpci[- ]?dss\b/i, /\bfedramp\b/i,
      /\bcompliance\b/i, /\baudit(?:ed|ing)?\b/i, /\bcertif(?:ied|ication)\b/i,
    ],
  },
  {
    kind: 'seniority',
    patterns: [
      /\bmore\s+senior\b/i, /\bmore\s+years\b/i, /\bstaff[- ]level\b/i,
      /\bprincipal[- ]level\b/i, /\bsenior(?:ity)?\b/i, /\blevel(?:ling)?\b/i,
    ],
  },
  {
    kind: 'compensation',
    patterns: [
      /\bcompensation\b/i, /\bsalary\b/i, /\bbudget\b/i, /\bband\b/i,
      /\brange\b/i, /\boutside\s+(?:our\s+)?range\b/i, /\btoo\s+high\b/i,
    ],
  },
  {
    kind: 'location',
    patterns: [
      /\bremote\b/i, /\bonsite\b/i, /\bon[- ]site\b/i, /\bhybrid\b/i,
      /\brelocat(?:e|ion)\b/i, /\btime\s?zone\b/i, /\bpacific\b/i,
      /\beastern\b/i, /\b(?:in[- ]?)?office\b/i,
    ],
  },
  {
    kind: 'industry_fit',
    patterns: [
      /\bindustry\s+(?:fit|experience|background)\b/i,
      /\bdomain\s+(?:fit|experience)\b/i,
      /\bvertical\s+experience\b/i,
      /\bspecific\s+(?:industry|domain|vertical)\b/i,
    ],
  },
  {
    kind: 'qualification_gap',
    patterns: [
      /\black(?:s|ed|ing)\b/i, /\bmiss(?:ing|ed)\b/i, /\bgap\b/i,
      /\bdoes\s+not\s+(?:meet|match)\b/i, /\bdid\s+not\s+(?:meet|match)\b/i,
      /\binsufficient\b/i, /\bnot\s+enough\b/i,
      /\brequired\b/i, /\bmust\s+have\b/i,
    ],
  },
];

export function classifyReason(email) {
  for (const rule of REASON_RULES) {
    for (const re of rule.patterns) {
      if (re.test(email)) return rule.kind;
    }
  }
  return 'other';
}

/**
 * Pull the specific phrase that triggered the classification. Searches
 * for capitalized acronyms, quoted terms, and the surrounding clause of
 * the matched pattern. Returns the raw token(s) — the lesson sentence
 * embeds them verbatim so the bullet says "SOC 2" not "compliance" when
 * the email said SOC 2.
 */
export function extractKeyTerms(email, reasonKind) {
  const terms = new Set();
  if (reasonKind === 'compliance') {
    const acronyms = email.match(/\b(?:SOC\s?2|SOC\s?II|ISO\s?27001|HIPAA|GDPR|PCI[- ]?DSS|FedRAMP)\b/gi);
    if (acronyms) {
      for (const a of acronyms) terms.add(a.replace(/\s+/g, ' ').trim());
    }
  }
  if (reasonKind === 'seniority') {
    const m = email.match(/\b(\d+\+?\s+years?(?:\s+of\s+\w+)?)\b/i)
      ?? email.match(/\b(staff[- ]level|principal[- ]level|senior(?:ity)?)\b/i);
    if (m) terms.add(m[1]);
  }
  if (reasonKind === 'compensation') {
    const m = email.match(/\$[\d,]+(?:k|K)?(?:\s?[-–]\s?\$?[\d,]+(?:k|K)?)?/);
    if (m) terms.add(m[0]);
  }
  if (reasonKind === 'location') {
    const m = email.match(/\b(remote|onsite|on[- ]site|hybrid|relocat\w+)\b/i);
    if (m) terms.add(m[1]);
  }
  if (reasonKind === 'industry_fit') {
    const m = email.match(/\b(fintech|healthtech|biotech|govtech|defense|edtech|legaltech|adtech|martech)\b/i);
    if (m) terms.add(m[1]);
  }
  return [...terms];
}

/**
 * Parse the first `# Subject` heading and `Company:` / `Role:` / `Date:`
 * frontmatter-ish prefix lines if present. Falls back to filename-derived
 * context. Returns `{ subject, company, role, date, body }`.
 */
export function parseRejectionEmail(text, fallbackContext = {}) {
  const lines = text.split('\n');
  let subject = '';
  const meta = {};
  let bodyStart = 0;
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const h = /^#\s+(.+?)\s*$/.exec(line);
    const kv = /^(Company|Role|Title|Date|From):\s*(.+?)\s*$/i.exec(line);
    if (h && !subject) {
      subject = h[1].trim();
      bodyStart = i + 1;
      continue;
    }
    if (kv) {
      meta[kv[1].toLowerCase()] = kv[2].trim();
      bodyStart = i + 1;
      continue;
    }
    if (line.trim() === '' && bodyStart === i) {
      bodyStart = i + 1;
      continue;
    }
    if (subject || Object.keys(meta).length > 0) break;
    break;
  }
  const body = lines.slice(bodyStart).join('\n').trim();
  return {
    subject: subject || fallbackContext.subject || '(no subject)',
    company: meta.company || fallbackContext.company || '(unknown)',
    role: meta.role || meta.title || fallbackContext.role || '(unknown)',
    date: meta.date || fallbackContext.date || '(unknown)',
    body,
  };
}

/**
 * Mock LLM client. Deterministic, offline. Given parsed email context
 * and the chosen reason kind, produces a single-sentence lesson bullet
 * that names the company, the missing thing (verbatim from the email
 * when possible), and the action item.
 */
export function mockLlmClient() {
  return {
    extractLesson(parsed) {
      const text = `${parsed.subject}\n${parsed.body}`;
      const kind = classifyReason(text);
      const terms = extractKeyTerms(text, kind);
      const termPhrase = terms.length > 0 ? terms.join(' / ') : null;
      const sentence = composeLessonSentence({ kind, parsed, termPhrase });
      return {
        kind,
        terms,
        company: parsed.company,
        role: parsed.role,
        date: parsed.date,
        sentence,
      };
    },
  };
}

export function composeLessonSentence({ kind, parsed, termPhrase }) {
  const company = parsed.company !== '(unknown)' ? parsed.company : 'employer';
  switch (kind) {
    case 'compliance':
      return termPhrase
        ? `${company} declined citing ${termPhrase}; lead with explicit ${termPhrase} experience in cover letter and CV summary for compliance-sensitive shops.`
        : `${company} declined citing compliance requirements; surface audit / certification work in the CV summary before the recruiter screen.`;
    case 'seniority':
      return termPhrase
        ? `${company} declined on seniority (${termPhrase}); pre-qualify level expectations before applying to similar roles.`
        : `${company} declined on seniority; pre-qualify level expectations before applying to similar roles.`;
    case 'compensation':
      return termPhrase
        ? `${company} declined on comp (${termPhrase}); share comp band in first recruiter reply to avoid wasted loops.`
        : `${company} declined on comp; share comp band in first recruiter reply to avoid wasted loops.`;
    case 'location':
      return termPhrase
        ? `${company} declined on location (${termPhrase}); filter portals on location compatibility before queuing applications.`
        : `${company} declined on location; filter portals on location compatibility before queuing applications.`;
    case 'industry_fit':
      return termPhrase
        ? `${company} declined on industry fit (${termPhrase}); add a vertical-specific proof-point bullet to the tailored CV.`
        : `${company} declined on industry fit; add a vertical-specific proof-point bullet to the tailored CV.`;
    case 'qualification_gap':
      return `${company} declined on a stated qualification gap; mine the JD for must-haves before applying and reflect each in the tailored CV.`;
    default:
      return `${company} declined for unstated reasons; ask the recruiter for one concrete reason during the closeout reply.`;
  }
}

/**
 * Canonical-form signature for dedup. Strips dates, company-specific
 * tokens, and casing so two rejections from the same root cause collapse
 * into a single bullet (the older one gets its `last_seen` updated, not
 * a duplicate row).
 */
export function lessonSignature(lesson) {
  return [lesson.kind, ...lesson.terms.map((t) => t.toLowerCase().replace(/\s+/g, ' '))]
    .join('|');
}

export function parseLessonsFile(text) {
  if (!text || text.trim() === '') return { frontmatter: null, lessons: [] };
  const fmMatch = /^---\n([\s\S]*?)\n---\n?/.exec(text);
  const frontmatter = fmMatch ? fmMatch[1] : null;
  const rest = fmMatch ? text.slice(fmMatch[0].length) : text;
  const lessons = [];
  const lineRe = /^-\s+\[(?<kind>[^\]]+)\]\s+\((?<date>[^)]+)\)\s+(?<company>[^—]+?)\s+—\s+(?<sentence>.+?)(?:\s+<!--\s+sig:(?<sig>[^>]+?)\s+-->)?\s*$/;
  for (const raw of rest.split('\n')) {
    const m = lineRe.exec(raw);
    if (!m) continue;
    const sig = m.groups.sig?.trim() ?? null;
    lessons.push({
      kind: m.groups.kind.trim(),
      date: m.groups.date.trim(),
      company: m.groups.company.trim(),
      sentence: m.groups.sentence.trim(),
      sig,
    });
  }
  return { frontmatter, lessons };
}

export function renderLessonsFile({ lessons, generatedAt }) {
  const lines = [];
  lines.push('---');
  lines.push(`title: Lessons from rejections`);
  lines.push(`generated_at: ${generatedAt}`);
  lines.push(`lessons_version: ${LESSONS_VERSION}`);
  lines.push(`count: ${lessons.length}`);
  lines.push('---');
  lines.push('');
  lines.push('# Lessons');
  lines.push('');
  lines.push('Durable signal mined from rejection emails by `bin/learn-rejection.mjs`.');
  lines.push('Pairs with the funnel-metrics snapshot (feature #5) which counts stage drops;');
  lines.push('this file explains *why* each drop happened so tailor / outreach / negotiate');
  lines.push('can adapt the next attempt.');
  lines.push('');
  for (const l of lessons) {
    const sigComment = l.sig ? ` <!-- sig:${l.sig} -->` : '';
    lines.push(`- [${l.kind}] (${l.date}) ${l.company} — ${l.sentence}${sigComment}`);
  }
  let out = lines.join('\n');
  if (!out.endsWith('\n')) out += '\n';
  return out;
}

export function mergeLesson(existingLessons, incoming, today) {
  const sig = lessonSignature(incoming);
  const idx = existingLessons.findIndex((l) => l.sig === sig);
  if (idx === -1) {
    return {
      added: true,
      lessons: [
        {
          kind: incoming.kind,
          date: today,
          company: incoming.company,
          sentence: incoming.sentence,
          sig,
        },
        ...existingLessons,
      ],
    };
  }
  const merged = [...existingLessons];
  merged[idx] = { ...merged[idx], date: today, sentence: incoming.sentence };
  const [updated] = merged.splice(idx, 1);
  return { added: false, lessons: [updated, ...merged] };
}

export function isoToday() {
  return new Date().toISOString().slice(0, 10);
}

export async function runLearn({
  emailPath,
  root,
  lessonsPath,
  llm,
  today,
  stdout,
}) {
  if (!existsSync(emailPath)) {
    const err = new Error(`learn-rejection: email file not found: ${emailPath}`);
    err.code = 'ENOEMAIL';
    throw err;
  }
  const emailText = readFileSync(emailPath, 'utf-8');
  const parsed = parseRejectionEmail(emailText);
  const client = llm ?? mockLlmClient();
  const lesson = client.extractLesson(parsed);

  const resolvedLessonsPath = lessonsPath ?? join(root, 'data/lessons.md');
  const existing = existsSync(resolvedLessonsPath)
    ? parseLessonsFile(readFileSync(resolvedLessonsPath, 'utf-8'))
    : { frontmatter: null, lessons: [] };

  const { added, lessons } = mergeLesson(existing.lessons, lesson, today ?? isoToday());
  const document = renderLessonsFile({
    lessons,
    generatedAt: new Date().toISOString(),
  });

  if (!stdout) {
    mkdirSync(resolve(resolvedLessonsPath, '..'), { recursive: true });
    writeFileSync(resolvedLessonsPath, document, 'utf-8');
  }

  return {
    added,
    lesson,
    outPath: resolvedLessonsPath,
    document,
    totalLessons: lessons.length,
  };
}

export function parseArgs(argv) {
  const args = { email: null, root: process.cwd(), lessons: null };
  const positional = [];
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--root') args.root = argv[++i] ?? process.cwd();
    else if (a === '--lessons') args.lessons = argv[++i] ?? null;
    else if (a === '--today') args.today = argv[++i] ?? null;
    else if (a === '--stdout') args.stdout = true;
    else if (a === '--help' || a === '-h') args.help = true;
    else if (a.startsWith('--')) {
      const err = new Error(`learn-rejection: unknown flag ${a}`);
      err.code = 'EUSAGE';
      throw err;
    } else positional.push(a);
  }
  if (positional.length > 0) args.email = positional[0];
  if (!args.help && !args.email) {
    const err = new Error('learn-rejection: missing required <rejection.md> argument');
    err.code = 'EUSAGE';
    throw err;
  }
  return args;
}

export const HELP = [
  'Usage: learn-rejection <rejection.md> [--root <dir>] [--lessons <path>]',
  '                       [--today <YYYY-MM-DD>] [--stdout]',
  '',
  '  <rejection.md>  Path to the rejection email (markdown or plain text).',
  '                  First `# Subject` line and optional Company:/Role:/Date:',
  '                  prefix lines are parsed as context.',
  '  --root          Project root (default: cwd). Lessons file lives at',
  '                  <root>/data/lessons.md unless --lessons is set.',
  '  --lessons       Override lessons.md path.',
  '  --today         Override the date stamped on a new lesson (YYYY-MM-DD).',
  '  --stdout        Print the rendered lessons.md to stdout instead of',
  '                  writing the file (no-op safe).',
  '',
  'Extracts a single durable lesson from the rejection email and merges it',
  'into data/lessons.md (deduped by canonical signature). The funnel-metrics',
  'CLI (feature #5) counts WHICH stage drops; this CLI explains WHY each drop',
  'happened so the next tailor / outreach / negotiate pass can adapt.',
].join('\n');
