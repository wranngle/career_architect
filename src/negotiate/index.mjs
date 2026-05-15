/**
 * negotiate — offer-negotiation script generator.
 *
 * Reads a structured offer JSON and emits a markdown negotiation script with
 * three required sections: `## Anchor`, `## Walk-away`, `## Likely objections`.
 *
 * The anchor number is derived deterministically from the offer's base salary
 * times the candidate's target multiplier (default 1.15). The walk-away pulls
 * from `candidate.walk_away_base_usd` when present, else falls back to the
 * current base. Objections are seeded from a small rules table keyed on the
 * shape of the offer (equity cliff, lower-than-market base, signing bonus
 * presence, competing offers) so the output is grounded in the input rather
 * than free-form.
 *
 * Deterministic and offline by default. An optional `llm` client can decorate
 * objection talking points later, but is not required.
 */

import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs';
import { join, dirname, resolve } from 'node:path';

export const DEFAULT_TARGET_MULTIPLIER = 1.15;

export function slugify(name) {
  return String(name)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

export function formatUsd(n) {
  if (!Number.isFinite(n)) return '$0';
  return `$${Math.round(n).toLocaleString('en-US')}`;
}

export function parseOffer(text) {
  let raw;
  try {
    raw = JSON.parse(text);
  } catch (e) {
    const err = new Error(`negotiate: offer JSON is not valid JSON: ${e.message}`);
    err.code = 'EOFFERJSON';
    throw err;
  }
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) {
    const err = new Error('negotiate: offer JSON must be an object at the root');
    err.code = 'EOFFERSHAPE';
    throw err;
  }
  const comp = raw.compensation ?? {};
  const base = Number(comp.base_salary_usd);
  if (!Number.isFinite(base) || base <= 0) {
    const err = new Error('negotiate: offer.compensation.base_salary_usd must be a positive number');
    err.code = 'EOFFERBASE';
    throw err;
  }
  return raw;
}

/**
 * Compute the anchor: base × target multiplier. Always uses the candidate's
 * declared multiplier when present; otherwise the DEFAULT_TARGET_MULTIPLIER
 * (1.15). The product is rounded to the nearest dollar so downstream
 * formatting is stable.
 */
export function computeAnchor(offer) {
  const base = Number(offer.compensation.base_salary_usd);
  const candidate = offer.candidate ?? {};
  const multiplier = Number.isFinite(Number(candidate.target_base_multiplier))
    ? Number(candidate.target_base_multiplier)
    : DEFAULT_TARGET_MULTIPLIER;
  return {
    base,
    multiplier,
    anchor: Math.round(base * multiplier),
  };
}

export function computeWalkAway(offer) {
  const candidate = offer.candidate ?? {};
  const declared = Number(candidate.walk_away_base_usd);
  if (Number.isFinite(declared) && declared > 0) {
    return { walkAway: declared, source: 'candidate.walk_away_base_usd' };
  }
  return {
    walkAway: Number(offer.compensation.base_salary_usd),
    source: 'fallback: current base (no walk_away_base_usd declared)',
  };
}

/**
 * Derive a list of likely objections grounded in the offer's shape. Each
 * objection has a `prompt` (what the recruiter will say) and a `response`
 * (the talking point the candidate should have ready).
 */
export function deriveObjections(offer, { anchor, walkAway }) {
  const out = [];
  const comp = offer.compensation ?? {};
  const candidate = offer.candidate ?? {};
  const competing = Array.isArray(candidate.competing_offers) ? candidate.competing_offers : [];

  out.push({
    prompt: 'Our budget for this role is capped at the offered base.',
    response:
      `The market for this role is closer to ${formatUsd(anchor)} based on the candidate's ` +
      'target multiplier; ask whether the cap reflects band ceiling or first-pass policy, then ' +
      'propose closing the gap with a signing bonus or accelerated equity if base is truly frozen.',
  });

  const cliffMonths = Number(comp.equity?.cliff_months);
  if (Number.isFinite(cliffMonths) && cliffMonths >= 12) {
    out.push({
      prompt: 'Equity vests over four years with a one-year cliff — standard package.',
      response:
        `Cliff of ${cliffMonths} months concentrates risk in year one; ask for a partial pre-cliff ` +
        'grant or a signing bonus that covers walking-away cost (current walk-away anchor: ' +
        `${formatUsd(walkAway)}).`,
    });
  }

  const signing = Number(comp.signing_bonus_usd);
  if (!Number.isFinite(signing) || signing <= 0) {
    out.push({
      prompt: 'We do not typically offer a signing bonus.',
      response:
        'Signing bonus is the cheapest lever for the company because it is one-time and not band-bound; ' +
        `frame as a buyout of opportunity cost, not a raise. Target ${formatUsd(Math.round(anchor * 0.1))} ` +
        '(10% of the anchor) as opening ask.',
    });
  }

  if (competing.length > 0) {
    const top = competing.reduce(
      (acc, x) => (Number(x.base_salary_usd) > acc ? Number(x.base_salary_usd) : acc),
      0,
    );
    if (top > 0) {
      out.push({
        prompt: 'Can you share what the competing offer looks like?',
        response:
          `Disclose the top competing base (${formatUsd(top)}) only if you are willing to walk; otherwise ` +
          'pivot to "I am evaluating multiple options and the gap right now is base, not fit." Anchor ' +
          `the ask at ${formatUsd(anchor)} regardless of the competing number.`,
      });
    }
  }

  out.push({
    prompt: 'When can we expect your decision?',
    response:
      'Buy time only as long as you have a real reason to. Ask for the offer in writing first; the ' +
      'written form is what makes the rest of the conversation negotiable. Default ask: 5 business days ' +
      'from receipt of the written offer.',
  });

  return out;
}

export function renderScript(offer, { anchor, base, multiplier, walkAway, walkAwaySource, objections }) {
  const lines = [];
  const company = offer.company ?? 'unknown';
  const role = offer.role ?? 'unknown';
  const generatedAt = new Date().toISOString();

  lines.push('---');
  lines.push(`company: ${company}`);
  lines.push(`role: ${role}`);
  lines.push(`base_salary_usd: ${base}`);
  lines.push(`target_multiplier: ${multiplier}`);
  lines.push(`anchor_usd: ${anchor}`);
  lines.push(`walk_away_usd: ${walkAway}`);
  lines.push(`generated_at: ${generatedAt}`);
  lines.push('---');
  lines.push('');
  lines.push(`# Negotiation script — ${company} (${role})`);
  lines.push('');

  lines.push('## Anchor');
  lines.push('');
  lines.push(
    `Open at **${formatUsd(anchor)}** base. Derived from current base ` +
    `${formatUsd(base)} × target multiplier ${multiplier}.`,
  );
  lines.push('');
  lines.push(
    'Anchor first, justify second. State the number, then pause. The first ' +
    'side to fill the silence loses leverage.',
  );
  lines.push('');

  lines.push('## Walk-away');
  lines.push('');
  lines.push(`Floor: **${formatUsd(walkAway)}** base. Source: ${walkAwaySource}.`);
  lines.push('');
  lines.push(
    'Below the walk-away you decline and move on; do not counter. The ' +
    'walk-away is non-negotiable internally — never disclose it to the ' +
    'recruiter.',
  );
  lines.push('');

  lines.push('## Likely objections');
  lines.push('');
  for (const [i, obj] of objections.entries()) {
    lines.push(`### ${i + 1}. ${obj.prompt}`);
    lines.push('');
    lines.push(obj.response);
    lines.push('');
  }

  return lines.join('\n');
}

export async function runNegotiate({ offerPath, root, outDirOverride }) {
  if (!existsSync(offerPath)) {
    const err = new Error(`negotiate: offer file not found: ${offerPath}`);
    err.code = 'ENOOFFER';
    throw err;
  }
  const offerText = readFileSync(offerPath, 'utf-8');
  const offer = parseOffer(offerText);

  const { base, multiplier, anchor } = computeAnchor(offer);
  const { walkAway, source: walkAwaySource } = computeWalkAway(offer);
  const objections = deriveObjections(offer, { anchor, walkAway });

  const md = renderScript(offer, {
    anchor, base, multiplier, walkAway, walkAwaySource, objections,
  });

  const outDir = outDirOverride ?? join(root, 'out');
  mkdirSync(outDir, { recursive: true });
  const slug = slugify(offer.company ?? 'offer');
  const outPath = join(outDir, `negotiate-${slug}.md`);
  writeFileSync(outPath, md, 'utf-8');

  return { outPath, slug, anchor, base, multiplier, walkAway, objections };
}

export function parseArgs(argv) {
  const args = { offer: null, root: process.cwd(), outDir: null };
  const positional = [];
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--root') args.root = argv[++i] ?? process.cwd();
    else if (a === '--out-dir') args.outDir = argv[++i] ?? null;
    else if (a === '--help' || a === '-h') args.help = true;
    else if (a.startsWith('--')) {
      const err = new Error(`negotiate: unknown flag ${a}`);
      err.code = 'EUSAGE';
      throw err;
    } else positional.push(a);
  }
  if (positional.length > 0) args.offer = positional[0];
  return args;
}

export const HELP = [
  'Usage: negotiate <offer.json> [--root <dir>] [--out-dir <dir>]',
  '',
  '  <offer.json>  Path to the structured offer JSON (must include',
  '                compensation.base_salary_usd).',
  '  --root        Project root (defaults to cwd). Output goes to <root>/out/.',
  '  --out-dir     Override output directory.',
  '',
  'Writes <out-dir>/negotiate-<company-slug>.md with three sections:',
  '`## Anchor`, `## Walk-away`, `## Likely objections`. The anchor number is',
  'computed deterministically as base_salary_usd × target_base_multiplier',
  '(default 1.15 when not declared in the offer).',
].join('\n');
