# Scan Aggregators Pattern

How `scan.mjs` runs external job-search APIs (USAJOBS, Google Jobs via SERP)
through one generic pattern, and how their results merge into the same
filter → dedup → pipeline flow as the built-in Greenhouse/Ashby/Lever scanners.

## Where it lives

- **Code:** `scan.mjs` — `AGGREGATORS_CONFIG`, `loadAggregators()`, `runAggregator()`
  (the block starting around the "External-API aggregators" comment).
- **Config:** one YAML block per aggregator, read from `portals.yml` (user
  override — wins when present) or `templates/portals.extensions.yml` (shipped
  defaults). In a split-repo layout, where your data directory has no
  `templates/`, the extensions file is resolved from the runtime repo via
  `REPO_ROOT` (see "Split-repo layout" in `DATA_CONTRACT.md`).
- **Scripts:** `scripts/usajobs_search.py`, `scripts/google_jobs_serp.py`.

## YAML block shape

The block's top-level key must match an entry in `AGGREGATORS_CONFIG`
(currently `usajobs` and `google_jobs_serp`) — that name selects the
arg-builder and JSON normalizer. Keys the code actually reads:

| Key | Required | What the code does with it |
|---|---|---|
| `enabled` | yes | Must be exactly `true`; anything else → skipped as `disabled`. |
| `script` | yes | Path passed to `python3`; missing → skipped as `no script configured`. |
| `env_required` | no | List of env var names; if any is unset the aggregator is skipped as `missing env: ...` (no partial runs). |
| `output_env` | no | Env var set on the child process so the script emits machine-readable output. Default: `<NAME>_OUTPUT` (e.g. `USAJOBS_OUTPUT`). |
| `output_value` | no | Value for `output_env`. Default: `json`. |
| `defaults` | no | Key/value map merged into every search by the arg-builder (e.g. `results_per_page`, `pages`, `salary_min`). |
| `searches` | yes | List of search objects; the script is invoked **once per entry**. |

Per-search keys are aggregator-specific:

- `usajobs`: `keyword`, `location`, `salary_min` (falls back to
  `defaults.salary_min`); `defaults` also supplies `results_per_page` (25)
  and `pages` (1).
- `google_jobs_serp`: `query`, `location`, `salary_min`; `defaults` supplies
  `results` (10 — keep low, SerpAPI free tier is 100 searches/month).
  Note: SerpAPI rejects a literal `Remote` location — omit `location` and put
  the remote intent in the query string.

See the commented `usajobs:` and `google_jobs_serp:` blocks at the bottom of
`templates/portals.extensions.yml` for working examples, including `.env`
setup (`USAJOBS_USER_AGENT` + `USAJOBS_API_KEY`, `SERPAPI_API_KEY`).

## Execution model

For each search entry, `runAggregator()` invokes:

```
python3 <script> <args built from search + defaults>
```

with `output_env=output_value` in the environment, a 30 s timeout, and stdin
ignored. The script must print a JSON array to stdout. The per-aggregator
normalizer then maps that JSON to the internal offer shape:

```
{ title, company, location, url, source }   // source = "<name>-api"
```

Offers missing `url`, `title`, or `company` are dropped by the normalizer.
A failing search does not abort the run — the error (first line of the
message) is collected and printed in the scan summary as `<name>:<label>`.

## Downstream: filter → dedup → pipeline

Aggregator offers flow through exactly the same gates as ATS-API offers:

1. **Title filter** — `title_filter.positive` / `.negative` from `portals.yml`.
2. **Location filter** — only if `english_only: true` in `portals.yml`.
3. **URL dedup** — against `data/scan-history.tsv`, `data/pipeline.md`
   checkbox lines, and any URL in `data/applications.md`.
4. **Company+role dedup** — normalized `company::role` keys parsed from the
   `data/applications.md` table.

Survivors are appended (unless `--dry-run`) to:

- `data/pipeline.md`, section `## Pendientes`, as `- [ ] {url} | {company} | {title}`
- `data/scan-history.tsv`, as `{url}\t{date}\t{name}-api\t{title}\t{company}\tadded`

## Reading the scan summary

Each aggregator gets one line in the `node scan.mjs` summary:

```
usajobs                skipped (missing env: USAJOBS_USER_AGENT, USAJOBS_API_KEY)
google_jobs_serp       2 searches → 18 hits → 5 new
```

Skip reasons are exact: `disabled`, `missing env: ...`, `no script configured`,
or `unknown aggregator: <name>` (block name has no `AGGREGATORS_CONFIG` entry).

## Adding a new aggregator

1. Write `scripts/<name>_search.py` that prints a JSON array to stdout when
   `$<NAME>_OUTPUT=json` (follow `scripts/google_jobs_serp.py`).
2. Add an entry to `AGGREGATORS_CONFIG` in `scan.mjs` with three functions:
   `args(search, defaults)` → argv list, `normalize(json, source)` → offer
   array, and `label(search)` → short string for error reporting.
3. Add the YAML block to `templates/portals.extensions.yml` (defaults) and
   enable/override it in your `portals.yml`.

No changes to dedup, filtering, or the pipeline writer are needed — the
pattern handles that uniformly.
