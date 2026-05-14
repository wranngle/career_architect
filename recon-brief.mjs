#!/usr/bin/env node

/**
 * recon-brief.mjs — Company interview-prep recon generator.
 *
 * Builds a one-page recon markdown file for a target company by combining:
 *   - the most recent posts from the company's engineering blog (HTML feed
 *     or Atom/RSS, sniffed in that order)
 *   - the most recent public commits across the company's GitHub org repos
 *
 * Output: <root>/interview-prep/<company-slug>-recon-<YYYY-MM-DD>.md with
 * required sections `## Recent posts` and `## Recent commits`.
 *
 * Usage:
 *   node recon-brief.mjs <company>
 *       --blog <url>        # explicit blog index URL (otherwise infers)
 *       --gh <org>          # explicit GitHub org slug (otherwise infers)
 *       --root <dir>        # CWD root (defaults to process.cwd())
 *       --fixtures <dir>    # offline mode: read blog.html, github.json from dir
 *       --limit <n>         # cap per-section entries (default 10)
 *
 * Offline / test mode is selected via --fixtures, which short-circuits all
 * network fetches and pulls fixed bodies from the given directory. The
 * fixture contract is documented in lib/scrape-fixtures/README.md.
 */

import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs';
import { join, resolve } from 'node:path';

const DEFAULT_LIMIT = 10;
const USER_AGENT = 'career-architect-recon/0.1 (+https://github.com/wranngle/career_architect)';
const FETCH_TIMEOUT_MS = 8000;

function parseArgs(argv) {
  const args = {
    company: null,
    blog: null,
    gh: null,
    root: process.cwd(),
    fixtures: null,
    limit: DEFAULT_LIMIT,
  };
  const positional = [];
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--blog') args.blog = argv[++i] ?? null;
    else if (a === '--gh') args.gh = argv[++i] ?? null;
    else if (a === '--root') args.root = resolve(argv[++i] ?? '');
    else if (a === '--fixtures') args.fixtures = resolve(argv[++i] ?? '');
    else if (a === '--limit') args.limit = Number.parseInt(argv[++i] ?? '', 10) || DEFAULT_LIMIT;
    else if (a === '--help' || a === '-h') args.help = true;
    else if (a.startsWith('--')) {
      process.stderr.write(`recon-brief: unknown flag ${a}\n`);
      process.exit(2);
    } else positional.push(a);
  }
  args.company = positional[0] ?? null;
  return args;
}

function slugify(name) {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
}

function today() {
  return new Date().toISOString().slice(0, 10);
}

async function fetchText(url, { timeoutMs = FETCH_TIMEOUT_MS, accept = 'text/html,*/*' } = {}) {
  const ctl = new AbortController();
  const t = setTimeout(() => ctl.abort(), timeoutMs);
  try {
    const res = await fetch(url, {
      headers: { 'user-agent': USER_AGENT, accept },
      signal: ctl.signal,
      redirect: 'follow',
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return await res.text();
  } finally {
    clearTimeout(t);
  }
}

async function fetchJson(url, opts = {}) {
  const body = await fetchText(url, { ...opts, accept: 'application/json' });
  return JSON.parse(body);
}

// Best-effort HTML/feed parser. We avoid pulling in a dep — the test fixture
// covers the shapes we actually emit. Returns [{ title, url, date }, ...].
function extractPosts(body, baseUrl) {
  const posts = [];
  // Atom <entry>
  const atomEntries = [...body.matchAll(/<entry[\s\S]*?<\/entry>/g)];
  for (const m of atomEntries) {
    const block = m[0];
    const title = (block.match(/<title[^>]*>([\s\S]*?)<\/title>/i) ?? [])[1];
    const link = (block.match(/<link[^>]*href="([^"]+)"/i) ?? [])[1];
    const date = (block.match(/<(?:updated|published)[^>]*>([^<]+)</i) ?? [])[1];
    if (title && link) posts.push({ title: cleanText(title), url: link, date: date?.slice(0, 10) ?? '' });
  }
  if (posts.length > 0) return posts;
  // RSS <item>
  const rssItems = [...body.matchAll(/<item[\s\S]*?<\/item>/g)];
  for (const m of rssItems) {
    const block = m[0];
    const title = (block.match(/<title[^>]*>(?:<!\[CDATA\[)?([\s\S]*?)(?:\]\]>)?<\/title>/i) ?? [])[1];
    const link = (block.match(/<link[^>]*>([\s\S]*?)<\/link>/i) ?? [])[1];
    const date = (block.match(/<pubDate[^>]*>([^<]+)</i) ?? [])[1];
    if (title && link) {
      const parsed = date ? new Date(date) : null;
      const iso = parsed && !Number.isNaN(parsed.getTime()) ? parsed.toISOString().slice(0, 10) : '';
      posts.push({ title: cleanText(title), url: cleanText(link), date: iso });
    }
  }
  if (posts.length > 0) return posts;
  // Plain HTML: look for <article> blocks containing an <a href> + a heading.
  const articleBlocks = [...body.matchAll(/<article[\s\S]*?<\/article>/gi)];
  for (const m of articleBlocks) {
    const block = m[0];
    const link = (block.match(/<a[^>]*href="([^"]+)"/i) ?? [])[1];
    const heading = (block.match(/<h[1-3][^>]*>([\s\S]*?)<\/h[1-3]>/i) ?? [])[1];
    if (link && heading) {
      posts.push({
        title: cleanText(heading),
        url: resolveUrl(link, baseUrl),
        date: '',
      });
    }
  }
  return posts;
}

function cleanText(s) {
  return s.replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim();
}

function resolveUrl(href, base) {
  try {
    return new URL(href, base).toString();
  } catch {
    return href;
  }
}

function inferBlogUrl(company) {
  // Cheap heuristics. Caller overrides via --blog when wrong.
  const slug = slugify(company);
  return `https://${slug}.com/blog/`;
}

function inferGhOrg(company) {
  return slugify(company);
}

async function gatherPosts(args) {
  if (args.fixtures) {
    const path = join(args.fixtures, 'blog.html');
    if (!existsSync(path)) return { posts: [], source: null, error: `missing fixture ${path}` };
    const body = readFileSync(path, 'utf-8');
    return { posts: extractPosts(body, 'https://fixture.invalid/'), source: `fixture:${path}` };
  }
  const url = args.blog ?? inferBlogUrl(args.company);
  try {
    const body = await fetchText(url);
    return { posts: extractPosts(body, url), source: url };
  } catch (e) {
    return { posts: [], source: url, error: String(e.message ?? e) };
  }
}

async function gatherCommits(args) {
  if (args.fixtures) {
    const path = join(args.fixtures, 'github.json');
    if (!existsSync(path)) return { commits: [], source: null, error: `missing fixture ${path}` };
    const events = JSON.parse(readFileSync(path, 'utf-8'));
    return { commits: eventsToCommits(events), source: `fixture:${path}` };
  }
  const org = args.gh ?? inferGhOrg(args.company);
  const url = `https://api.github.com/orgs/${encodeURIComponent(org)}/events/public`;
  try {
    const events = await fetchJson(url);
    return { commits: eventsToCommits(events), source: url };
  } catch (e) {
    return { commits: [], source: url, error: String(e.message ?? e) };
  }
}

// GitHub PushEvent → flat commit list (repo + sha + message + date).
function eventsToCommits(events) {
  const out = [];
  if (!Array.isArray(events)) return out;
  for (const ev of events) {
    if (ev?.type !== 'PushEvent') continue;
    const repo = ev?.repo?.name ?? '';
    const date = ev?.created_at?.slice(0, 10) ?? '';
    const commits = ev?.payload?.commits ?? [];
    for (const c of commits) {
      out.push({
        repo,
        sha: (c?.sha ?? '').slice(0, 7),
        message: (c?.message ?? '').split('\n')[0],
        date,
        author: c?.author?.name ?? '',
      });
    }
  }
  return out;
}

function renderMarkdown({ company, generatedAt, postsResult, commitsResult, limit }) {
  const lines = [];
  lines.push(`# ${company} — recon brief`);
  lines.push('');
  lines.push(`Generated: ${generatedAt}`);
  lines.push('');
  lines.push('## Recent posts');
  lines.push('');
  if (postsResult.posts.length === 0) {
    lines.push(`_No posts collected from ${postsResult.source ?? 'blog'}${postsResult.error ? ` (${postsResult.error})` : ''}._`);
  } else {
    for (const p of postsResult.posts.slice(0, limit)) {
      const datePrefix = p.date ? `${p.date} — ` : '';
      lines.push(`- ${datePrefix}[${p.title}](${p.url})`);
    }
  }
  lines.push('');
  lines.push('## Recent commits');
  lines.push('');
  if (commitsResult.commits.length === 0) {
    lines.push(`_No commits collected from ${commitsResult.source ?? 'github'}${commitsResult.error ? ` (${commitsResult.error})` : ''}._`);
  } else {
    for (const c of commitsResult.commits.slice(0, limit)) {
      const datePrefix = c.date ? `${c.date} — ` : '';
      const shaSuffix = c.sha ? ` (\`${c.sha}\`)` : '';
      lines.push(`- ${datePrefix}\`${c.repo}\`: ${c.message}${shaSuffix}`);
    }
  }
  lines.push('');
  lines.push('## Sources');
  lines.push('');
  lines.push(`- blog: ${postsResult.source ?? 'n/a'}`);
  lines.push(`- github: ${commitsResult.source ?? 'n/a'}`);
  lines.push('');
  return lines.join('\n');
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  if (args.help || !args.company) {
    process.stdout.write(
      'Usage: node recon-brief.mjs <company> [--blog url] [--gh org] [--root dir] [--fixtures dir] [--limit n]\n',
    );
    return args.help ? 0 : 2;
  }
  const [postsResult, commitsResult] = await Promise.all([gatherPosts(args), gatherCommits(args)]);
  const generatedAt = new Date().toISOString();
  const md = renderMarkdown({
    company: args.company,
    generatedAt,
    postsResult,
    commitsResult,
    limit: args.limit,
  });
  const outDir = join(args.root, 'interview-prep');
  mkdirSync(outDir, { recursive: true });
  const outPath = join(outDir, `${slugify(args.company)}-recon-${today()}.md`);
  writeFileSync(outPath, md, 'utf-8');
  process.stdout.write(`recon-brief: wrote ${outPath} (${postsResult.posts.length} posts, ${commitsResult.commits.length} commits)\n`);
  return 0;
}

main().then((code) => process.exit(code ?? 0)).catch((e) => {
  process.stderr.write(`recon-brief: ${e?.stack ?? e}\n`);
  process.exit(1);
});
