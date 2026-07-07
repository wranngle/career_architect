# Scan Tier Ladder

The 5-tier search ladder for exhaustive job discovery. Canonical definition:
"Search Tier Ladder (extended — agent flow)" in `modes/scan.md`. This doc
explains each tier's cost/coverage tradeoff as the code implements it.

Two distinct flows share this ladder:

- **`scan.mjs` (script flow)** covers Tier 1a (ATS JSON APIs) plus Tier 1c
  (external aggregators via the generic pattern — see
  `docs/scan-aggregators-pattern.md`). Zero LLM tokens.
- **Agent flow** (Claude/Codex running `modes/scan.md`) adds Playwright,
  WebSearch, and Exa tiers for companies and boards the script can't reach.

Higher tiers are MANDATORY before lower tiers — start at Tier 1, proceed
sequentially.

## The ladder

| Tier | Method | Platforms | When |
|---|---|---|---|
| 1a | `scan.mjs` (zero-token JSON APIs) | Greenhouse, Ashby, Lever | Always first — free, fast, fresh |
| 1b | `scan-jobspy.py` (Python JobSpy) | Indeed, LinkedIn, Glassdoor, ZipRecruiter, Google, Bayt, Naukri, BDJobs | Always, concurrent with 1a |
| 1c | Direct API (aggregator pattern in `scan.mjs`) | USAJOBS (`scripts/usajobs_search.py`), Google Jobs via SERP (`scripts/google_jobs_serp.py`) | Always — federal + aggregated coverage that 1a/1b miss |
| 2 | Targeted Exa with `site:` filter | RemoteOK, We Work Remotely, FlexJobs, Wellfound; Mentra, Hire Autism, Spectroomz, Exceptional Individuals, abilityJOBS, Spectrum Careers, Specialisterne | Mandatory if role is remote-first or accessibility-focused |
| 3 | Broad Exa | Jooble, Monster, CareerBuilder; Seek (AU), Jora | Mandatory unless explicitly out of scope |
| 4 | Specialized Exa (academic) | Chronicle of Higher Education, HigherEdJobs, Academic Jobs Online | Only if role is academic/research |
| 5 | Playwright last-resort | Anything Tiers 2-4 missed (bot protection, JS-heavy SPA, login wall) | Conditional — must be justified in the coverage checklist |

## Cost / coverage per tier

- **Tier 1a** — `node scan.mjs`. Pure HTTP + JSON against public ATS APIs of
  `tracked_companies` in `portals.yml`. Free, real-time, no auth, but only
  covers companies you track that use Greenhouse/Ashby/Lever.
- **Tier 1b** — `python3 scan-jobspy.py`. Reads the `jobspy_searches:` block
  from `portals.yml` (template in `templates/portals.extensions.yml`). Widest
  free reach, but the underlying scrapers rate-limit hard: rotate platforms,
  vary keywords, use `hours_old=168` for routine scans, and keep at most one
  invocation per platform per minute (full tactics list in `modes/scan.md`).
- **Tier 1c** — runs automatically inside `node scan.mjs` when the `usajobs:`
  / `google_jobs_serp:` blocks are enabled and their env vars are set.
  USAJOBS is free (key by email); SERP API's free tier is 100 searches/month,
  so keep `results` low. This is the only tier that reaches US federal jobs.
- **Tiers 2-4** — agent-driven Exa searches (the `exa` MCP server in
  `.mcp.json`, or direct API with `EXA_API_KEY`). Costs Exa API calls plus
  agent tokens; results can be stale (search-index lag), so Tier 3-style
  WebSearch results must pass the liveness check in `modes/scan.md` step 7.5
  before entering the pipeline. Query templates live in the "Exa query
  patterns library" section of `modes/scan.md` — compose 2-3 patterns per
  role, skip patterns that don't match the role's intent.
- **Tier 5** — Playwright browsing, one page at a time, never in parallel.
  Highest cost (agent tokens + wall-clock), highest fidelity. Only for sites
  the cheaper tiers provably cannot read, and each use must be justified
  per-site in the coverage checklist.

## Shared dedup across tiers

Every tier writes to the same two files — `data/pipeline.md` (section
`## Pendientes`) and `data/scan-history.tsv` — and dedups against those plus
`data/applications.md` (URL match and normalized company+role match). Running
tiers in any order therefore never produces duplicate pipeline entries.

## Coverage checklist (mandatory)

Every exhaustive scan must end with the `SEARCH COVERAGE CHECKLIST` block
defined in `modes/scan.md`: one line per tier/platform, each marked
`[X jobs]`, `[Error: <msg>]`, `[No results]`, or `[Skipped: <reason>]`, plus
an Issues section (rate limits, errors, Tier 5 justification). Skipping a
tier without a checklist entry is a coverage bug — the user trusts the
system to be exhaustive.

## Relation to the 3-level model

`modes/scan.md` also describes an older 3-level model (Nivel 1 Playwright,
Nivel 2 ATS APIs/feeds, Nivel 3 WebSearch) for scanning `tracked_companies`.
The 5-tier ladder supersedes it for exhaustive searches: levels 1-2 fold
into Tier 1a/Tier 5, and level 3 generalizes into Tiers 2-4.
