#!/usr/bin/env node

/**
 * scan.mjs — Zero-token portal scanner
 *
 * Fetches Greenhouse, Ashby, and Lever APIs directly, applies title
 * filters from portals.yml, deduplicates against existing history,
 * and appends new offers to pipeline.md + scan-history.tsv.
 *
 * Zero Claude API tokens — pure HTTP + JSON.
 *
 * Usage:
 *   node scan.mjs                  # scan all enabled companies
 *   node scan.mjs --dry-run        # preview without writing files
 *   node scan.mjs --company Cohere # scan a single company
 */

import { readFileSync, writeFileSync, appendFileSync, existsSync, mkdirSync } from 'fs';
import { execFileSync } from 'child_process';
import yaml from 'js-yaml';
const parseYaml = yaml.load;

// ── Config ──────────────────────────────────────────────────────────

const PORTALS_PATH = 'portals.yml';
const PORTALS_EXTENSIONS_PATH = 'templates/portals.extensions.yml';
const SCAN_HISTORY_PATH = 'data/scan-history.tsv';
const PIPELINE_PATH = 'data/pipeline.md';
const APPLICATIONS_PATH = 'data/applications.md';

// Ensure required directories exist (fresh setup)
mkdirSync('data', { recursive: true });

const CONCURRENCY = 10;
const FETCH_TIMEOUT_MS = 10_000;

// ── API detection ───────────────────────────────────────────────────

function detectApi(company) {
  // Greenhouse: explicit api field
  if (company.api && company.api.includes('greenhouse')) {
    return { type: 'greenhouse', url: company.api };
  }

  const url = company.careers_url || '';

  // Ashby
  const ashbyMatch = url.match(/jobs\.ashbyhq\.com\/([^/?#]+)/);
  if (ashbyMatch) {
    return {
      type: 'ashby',
      url: `https://api.ashbyhq.com/posting-api/job-board/${ashbyMatch[1]}?includeCompensation=true`,
    };
  }

  // Lever
  const leverMatch = url.match(/jobs\.lever\.co\/([^/?#]+)/);
  if (leverMatch) {
    return {
      type: 'lever',
      url: `https://api.lever.co/v0/postings/${leverMatch[1]}`,
    };
  }

  // Greenhouse EU boards
  const ghEuMatch = url.match(/job-boards(?:\.eu)?\.greenhouse\.io\/([^/?#]+)/);
  if (ghEuMatch && !company.api) {
    return {
      type: 'greenhouse',
      url: `https://boards-api.greenhouse.io/v1/boards/${ghEuMatch[1]}/jobs`,
    };
  }

  return null;
}

// ── API parsers ─────────────────────────────────────────────────────

function parseGreenhouse(json, companyName) {
  const jobs = json.jobs || [];
  return jobs.map(j => ({
    title: j.title || '',
    url: j.absolute_url || '',
    company: companyName,
    location: j.location?.name || '',
  }));
}

function parseAshby(json, companyName) {
  const jobs = json.jobs || [];
  return jobs.map(j => ({
    title: j.title || '',
    url: j.jobUrl || '',
    company: companyName,
    location: j.location || '',
  }));
}

function parseLever(json, companyName) {
  if (!Array.isArray(json)) return [];
  return json.map(j => ({
    title: j.text || '',
    url: j.hostedUrl || '',
    company: companyName,
    location: j.categories?.location || '',
  }));
}

const PARSERS = { greenhouse: parseGreenhouse, ashby: parseAshby, lever: parseLever };

// ── Fetch with timeout ──────────────────────────────────────────────

async function fetchJson(url) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
  try {
    const res = await fetch(url, { signal: controller.signal });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return await res.json();
  } finally {
    clearTimeout(timer);
  }
}

// ── Title filter ────────────────────────────────────────────────────

function buildTitleFilter(titleFilter) {
  const positive = (titleFilter?.positive || []).map(k => k.toLowerCase());
  const negative = (titleFilter?.negative || []).map(k => k.toLowerCase());

  return (title) => {
    const lower = title.toLowerCase();
    const hasPositive = positive.length === 0 || positive.some(k => lower.includes(k));
    const hasNegative = negative.some(k => lower.includes(k));
    return hasPositive && !hasNegative;
  };
}

// ── Location / language filter ──────────────────────────────────────

// Crude English-locale gate: opt-in via portals.yml `english_only: true`.
// We only have title + location at this stage (no JD body), so we filter
// by matching the location string against English-tilted markers.
// Anything that doesn't match is dropped. Remote-only roles always pass.
const ENGLISH_LOCATION_MARKERS = [
  /\bremote\b/i,
  /\banywhere\b/i,
  /\b(USA?|United States|U\.S\.A?\.?)\b/i,
  /\b(UK|United Kingdom|England|Scotland|Wales|Northern Ireland|London|Manchester|Edinburgh)\b/i,
  /\b(Canada|Toronto|Vancouver|Montreal|Ottawa)\b/i,
  /\b(Australia|Sydney|Melbourne|Brisbane|NZ|New Zealand|Auckland|Wellington)\b/i,
  /\b(Ireland|Dublin)\b/i,
  /\b(Singapore|SG)\b/i,
  /\b(India|Bangalore|Bengaluru|Mumbai|Hyderabad|Pune|Delhi|Chennai)\b/i,
  /\b(United Arab Emirates|UAE|Dubai|Abu Dhabi)\b/i,
  /\b(South Africa|Johannesburg|Cape Town)\b/i,
  /\b(Hong Kong|Philippines|Manila|Cebu)\b/i,
];

function buildLocationFilter(englishOnly) {
  if (!englishOnly) return () => true;
  return (location) => {
    if (!location) return true; // unknown location: don't drop
    return ENGLISH_LOCATION_MARKERS.some(rx => rx.test(location));
  };
}

// ── Dedup ───────────────────────────────────────────────────────────

function loadSeenUrls() {
  const seen = new Set();

  // scan-history.tsv
  if (existsSync(SCAN_HISTORY_PATH)) {
    const lines = readFileSync(SCAN_HISTORY_PATH, 'utf-8').split('\n');
    for (const line of lines.slice(1)) { // skip header
      const url = line.split('\t')[0];
      if (url) seen.add(url);
    }
  }

  // pipeline.md — extract URLs from checkbox lines
  if (existsSync(PIPELINE_PATH)) {
    const text = readFileSync(PIPELINE_PATH, 'utf-8');
    for (const match of text.matchAll(/- \[[ x]\] (https?:\/\/\S+)/g)) {
      seen.add(match[1]);
    }
  }

  // applications.md — extract URLs from report links and any inline URLs
  if (existsSync(APPLICATIONS_PATH)) {
    const text = readFileSync(APPLICATIONS_PATH, 'utf-8');
    for (const match of text.matchAll(/https?:\/\/[^\s|)]+/g)) {
      seen.add(match[0]);
    }
  }

  return seen;
}

function loadSeenCompanyRoles() {
  const seen = new Set();
  if (existsSync(APPLICATIONS_PATH)) {
    const text = readFileSync(APPLICATIONS_PATH, 'utf-8');
    // Parse markdown table rows: | # | Date | Company | Role | ...
    for (const match of text.matchAll(/\|[^|]+\|[^|]+\|\s*([^|]+)\s*\|\s*([^|]+)\s*\|/g)) {
      const company = match[1].trim().toLowerCase();
      const role = match[2].trim().toLowerCase();
      if (company && role && company !== 'company') {
        seen.add(`${company}::${role}`);
      }
    }
  }
  return seen;
}

// ── Pipeline writer ─────────────────────────────────────────────────

function appendToPipeline(offers) {
  if (offers.length === 0) return;

  let text = readFileSync(PIPELINE_PATH, 'utf-8');

  // Find "## Pendientes" section and append after it
  const marker = '## Pendientes';
  const idx = text.indexOf(marker);
  if (idx === -1) {
    // No Pendientes section — append at end before Procesadas
    const procIdx = text.indexOf('## Procesadas');
    const insertAt = procIdx === -1 ? text.length : procIdx;
    const block = `\n${marker}\n\n` + offers.map(o =>
      `- [ ] ${o.url} | ${o.company} | ${o.title}`
    ).join('\n') + '\n\n';
    text = text.slice(0, insertAt) + block + text.slice(insertAt);
  } else {
    // Find the end of existing Pendientes content (next ## or end)
    const afterMarker = idx + marker.length;
    const nextSection = text.indexOf('\n## ', afterMarker);
    const insertAt = nextSection === -1 ? text.length : nextSection;

    const block = '\n' + offers.map(o =>
      `- [ ] ${o.url} | ${o.company} | ${o.title}`
    ).join('\n') + '\n';
    text = text.slice(0, insertAt) + block + text.slice(insertAt);
  }

  writeFileSync(PIPELINE_PATH, text, 'utf-8');
}

function appendToScanHistory(offers, date) {
  // Ensure file + header exist
  if (!existsSync(SCAN_HISTORY_PATH)) {
    writeFileSync(SCAN_HISTORY_PATH, 'url\tfirst_seen\tportal\ttitle\tcompany\tstatus\n', 'utf-8');
  }

  const lines = offers.map(o =>
    `${o.url}\t${date}\t${o.source}\t${o.title}\t${o.company}\tadded`
  ).join('\n') + '\n';

  appendFileSync(SCAN_HISTORY_PATH, lines, 'utf-8');
}

// ── Parallel fetch with concurrency limit ───────────────────────────

async function parallelFetch(tasks, limit) {
  const results = [];
  let i = 0;

  async function next() {
    while (i < tasks.length) {
      const task = tasks[i++];
      results.push(await task());
    }
  }

  const workers = Array.from({ length: Math.min(limit, tasks.length) }, () => next());
  await Promise.all(workers);
  return results;
}

// ── Main ────────────────────────────────────────────────────────────

// ── External-API aggregators (USAJOBS, future SERP, etc.) ──────────────
//
// Each aggregator is a YAML block (in portals.yml — user override — or in
// templates/portals.extensions.yml — defaults) of the form:
//
//   <name>:
//     enabled: true|false
//     script: scripts/<name>_search.py
//     env_required: [VAR1, VAR2]            # bail if any are missing
//     output_env: <NAME>_OUTPUT             # env var the script honors
//     output_value: json
//     normalize: usajobs | flat             # which JSON shape parser
//     defaults: { ... }                     # key/value passed verbatim
//     searches: [ { ...arg-builder... } ]
//
// The script is invoked once per search; its stdout JSON gets normalized
// to the offer shape `{ title, company, location, url, source }` and
// flows through the same dedup + filter pipeline as the ATS scanners.
//
// Supported aggregators are listed in AGGREGATORS_CONFIG below — to add
// a new one, write a normalizer + arg-builder pair and add an entry.
const AGGREGATORS_CONFIG = {
  usajobs: {
    args: (s, d) => [
      String(s.keyword ?? ''),
      String(s.location ?? ''),
      String(s.salary_min ?? d.salary_min ?? 0),
      String(d.results_per_page ?? 25),
      String(d.pages ?? 1),
    ],
    normalize: (json, source) => {
      const out = [];
      for (const item of json || []) {
        const d = item.MatchedObjectDescriptor || {};
        const title = (d.PositionTitle || '').trim();
        const company = (d.OrganizationName || '').trim();
        const locList = d.PositionLocation || [];
        const location = Array.isArray(locList)
          ? locList.map(l => l?.LocationName).filter(Boolean).join(', ')
          : String(locList || '').trim();
        const url = (d.PositionURI || '').trim();
        if (!url || !title || !company) continue;
        out.push({ title, company, location, url, source });
      }
      return out;
    },
    label: s => `${s.keyword || ''}@${s.location || 'any'}`,
  },
  google_jobs_serp: {
    args: (s, d) => [
      String(s.query ?? ''),
      String(s.location ?? ''),
      String(s.salary_min ?? d.salary_min ?? 0),
      String(d.results ?? 10),
    ],
    normalize: (json, source) => {
      const out = [];
      for (const job of json || []) {
        const title = (job.title || '').trim();
        const company = (job.company_name || '').trim();
        const location = (job.location || '').trim();
        const url = (job.share_link
          || (job.apply_options || [{}])[0]?.link
          || job.job_id
          || '').trim();
        if (!url || !title || !company) continue;
        out.push({ title, company, location, url, source });
      }
      return out;
    },
    label: s => `${s.query || ''}@${s.location || 'any'}`,
  },
};

function loadAggregators(userConfig) {
  let extConfig = {};
  if (existsSync(PORTALS_EXTENSIONS_PATH)) {
    try {
      extConfig = parseYaml(readFileSync(PORTALS_EXTENSIONS_PATH, 'utf-8')) || {};
    } catch { /* ignore */ }
  }
  const out = [];
  for (const name of Object.keys(AGGREGATORS_CONFIG)) {
    const block = userConfig?.[name] || extConfig[name];
    if (!block) continue;
    out.push({ name, ...block });
  }
  return out;
}

function runAggregator(name, cfg) {
  const handler = AGGREGATORS_CONFIG[name];
  if (!handler) return { offers: [], skipped: `unknown aggregator: ${name}` };
  if (!cfg || cfg.enabled !== true) return { offers: [], skipped: 'disabled' };

  const missing = (cfg.env_required || []).filter(v => !process.env[v]);
  if (missing.length) return { offers: [], skipped: `missing env: ${missing.join(', ')}` };

  const script = cfg.script;
  if (!script) return { offers: [], skipped: 'no script configured' };

  const defaults = cfg.defaults || {};
  const searches = cfg.searches || [];
  const offers = [];
  const errors = [];
  const outputEnv = cfg.output_env || `${name.toUpperCase()}_OUTPUT`;
  const outputValue = cfg.output_value || 'json';
  const source = `${name}-api`;

  for (const s of searches) {
    try {
      const stdout = execFileSync(
        'python3',
        [script, ...handler.args(s, defaults)],
        {
          encoding: 'utf-8',
          env: { ...process.env, [outputEnv]: outputValue },
          timeout: 30_000,
          stdio: ['ignore', 'pipe', 'pipe'],
        },
      );
      offers.push(...handler.normalize(JSON.parse(stdout), source));
    } catch (err) {
      errors.push({ search: handler.label(s), error: err.message.split('\n')[0] });
    }
  }

  return { offers, errors, ranSearches: searches.length };
}

async function main() {
  const args = process.argv.slice(2);
  const dryRun = args.includes('--dry-run');
  const companyFlag = args.indexOf('--company');
  const filterCompany = companyFlag !== -1 ? args[companyFlag + 1]?.toLowerCase() : null;

  // 1. Read portals.yml
  if (!existsSync(PORTALS_PATH)) {
    console.error('Error: portals.yml not found. Run onboarding first.');
    process.exit(1);
  }

  const config = parseYaml(readFileSync(PORTALS_PATH, 'utf-8'));
  const companies = config.tracked_companies || [];
  const titleFilter = buildTitleFilter(config.title_filter);
  const locationFilter = buildLocationFilter(config.english_only === true);

  // 2. Filter to enabled companies with detectable APIs
  const targets = companies
    .filter(c => c.enabled !== false)
    .filter(c => !filterCompany || c.name.toLowerCase().includes(filterCompany))
    .map(c => ({ ...c, _api: detectApi(c) }))
    .filter(c => c._api !== null);

  const skippedCount = companies.filter(c => c.enabled !== false).length - targets.length;

  console.log(`Scanning ${targets.length} companies via API (${skippedCount} skipped — no API detected)`);
  if (dryRun) console.log('(dry run — no files will be written)\n');

  // 3. Load dedup sets
  const seenUrls = loadSeenUrls();
  const seenCompanyRoles = loadSeenCompanyRoles();

  // 4. Fetch all APIs
  const date = new Date().toISOString().slice(0, 10);
  let totalFound = 0;
  let totalFiltered = 0;
  let totalDupes = 0;
  const newOffers = [];
  const errors = [];

  const tasks = targets.map(company => async () => {
    const { type, url } = company._api;
    try {
      const json = await fetchJson(url);
      const jobs = PARSERS[type](json, company.name);
      totalFound += jobs.length;

      for (const job of jobs) {
        if (!titleFilter(job.title)) {
          totalFiltered++;
          continue;
        }
        if (!locationFilter(job.location)) {
          totalFiltered++;
          continue;
        }
        if (seenUrls.has(job.url)) {
          totalDupes++;
          continue;
        }
        const key = `${job.company.toLowerCase()}::${job.title.toLowerCase()}`;
        if (seenCompanyRoles.has(key)) {
          totalDupes++;
          continue;
        }
        // Mark as seen to avoid intra-scan dupes
        seenUrls.add(job.url);
        seenCompanyRoles.add(key);
        newOffers.push({ ...job, source: `${type}-api` });
      }
    } catch (err) {
      errors.push({ company: company.name, error: err.message });
    }
  });

  await parallelFetch(tasks, CONCURRENCY);

  // 4b. External-API aggregators (USAJOBS, etc.) — wired uniformly.
  const aggregators = loadAggregators(config);
  const aggregatorSummary = [];
  for (const agg of aggregators) {
    const result = runAggregator(agg.name, agg);
    let added = 0, dupes = 0, filtered = 0;
    for (const offer of result.offers) {
      if (!titleFilter(offer.title)) { filtered++; continue; }
      if (!locationFilter(offer.location)) { filtered++; continue; }
      if (seenUrls.has(offer.url)) { dupes++; continue; }
      const key = `${offer.company.toLowerCase()}::${offer.title.toLowerCase()}`;
      if (seenCompanyRoles.has(key)) { dupes++; continue; }
      seenUrls.add(offer.url);
      seenCompanyRoles.add(key);
      newOffers.push(offer);
      added++;
    }
    if (result.errors?.length) {
      for (const e of result.errors) errors.push({ company: `${agg.name}:${e.search}`, error: e.error });
    }
    totalFiltered += filtered;
    totalDupes += dupes;
    totalFound += result.offers.length;
    aggregatorSummary.push({ name: agg.name, ...result, added });
  }

  // 5. Write results
  if (!dryRun && newOffers.length > 0) {
    appendToPipeline(newOffers);
    appendToScanHistory(newOffers, date);
  }

  // 6. Print summary
  console.log(`\n${'━'.repeat(45)}`);
  console.log(`Portal Scan — ${date}`);
  console.log(`${'━'.repeat(45)}`);
  console.log(`Companies scanned:     ${targets.length}`);
  for (const a of aggregatorSummary) {
    if (a.skipped) {
      console.log(`${a.name.padEnd(22)} skipped (${a.skipped})`);
    } else {
      console.log(`${a.name.padEnd(22)} ${a.ranSearches} searches → ${a.offers.length} hits → ${a.added} new`);
    }
  }
  console.log(`Total jobs found:      ${totalFound}`);
  console.log(`Filtered by title:     ${totalFiltered} removed`);
  console.log(`Duplicates:            ${totalDupes} skipped`);
  console.log(`New offers added:      ${newOffers.length}`);

  if (errors.length > 0) {
    console.log(`\nErrors (${errors.length}):`);
    for (const e of errors) {
      console.log(`  ✗ ${e.company}: ${e.error}`);
    }
  }

  if (newOffers.length > 0) {
    console.log('\nNew offers:');
    for (const o of newOffers) {
      console.log(`  + ${o.company} | ${o.title} | ${o.location || 'N/A'}`);
    }
    if (dryRun) {
      console.log('\n(dry run — run without --dry-run to save results)');
    } else {
      console.log(`\nResults saved to ${PIPELINE_PATH} and ${SCAN_HISTORY_PATH}`);
    }
  }

  console.log(`\n→ Run /career-ops pipeline to evaluate new offers.`);
  console.log('→ Share results and get help: https://discord.gg/8pRpHETxa4');
}

main().catch(err => {
  console.error('Fatal:', err.message);
  process.exit(1);
});
