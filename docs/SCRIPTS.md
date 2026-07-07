# Scripts Reference

Scripts live in three places: root-level `.mjs` utilities, thin CLI shims in `bin/` (real logic in `src/<name>/index.mjs`), and Python aggregators (`scan-jobspy.py` in the root, the rest in `scripts/`). Many are exposed via `npm run <name>`; the remainder are invoked directly with `node` or `python3`.

## npm Scripts (package.json)

| Command | Script | Purpose |
|---------|--------|---------|
| `npm run dev` | `next dev` | Next.js landing page dev server (`src/`) |
| `npm run build` | `next build` | Production build of the landing page |
| `npm run start` | `next start` | Serve the production build |
| `npm run lint` | `xo` | Lint JS/TS |
| `npm run lint:fix` | `xo --fix` | Lint with auto-fix |
| `npm test` | `node --test && node test-all.mjs` | Aggregate: unit tests in `tests/` + full repo checks |
| `npm run doctor` | `doctor.mjs` | Validate setup prerequisites |
| `npm run verify` | `verify-pipeline.mjs` | Check pipeline data integrity |
| `npm run normalize` | `normalize-statuses.mjs` | Fix non-canonical statuses |
| `npm run dedup` | `dedup-tracker.mjs` | Remove duplicate tracker entries |
| `npm run merge` | `merge-tracker.mjs` | Merge batch TSVs into applications.md |
| `npm run pdf` | `generate-pdf.mjs` | Convert HTML to ATS-optimized PDF |
| `npm run sync-check` | `cv-sync-check.mjs` | Validate CV/profile consistency |
| `npm run update:check` | `update-system.mjs check` | Fork-detached stub — always reports up-to-date |
| `npm run update` | `update-system.mjs apply` | Disabled in this hard fork (exits 1) |
| `npm run rollback` | `update-system.mjs rollback` | Disabled in this hard fork (exits 1) |
| `npm run liveness` | `check-liveness.mjs` | Test if job URLs are still active |
| `npm run scan` | `scan.mjs` | Zero-token portal scanner |
| `npm run gemini:eval` | `gemini-eval.mjs` | Gemini-powered JD evaluation (free-tier alternative) |
| `npm run voice-coach` | `voice-coach.mjs` | Provision an ElevenLabs voice job-coach agent |
| `npm run rehearse` | `bin/rehearse.mjs` | 5-turn mock recruiter call |
| `npm run tailor` | `bin/tailor.mjs` | Per-JD CV variant |
| `npm run negotiate` | `bin/negotiate.mjs` | Offer negotiation script generator |
| `npm run outreach` | `bin/outreach.mjs` | Cold-message generator |
| `npm run timeline` | `bin/timeline.mjs` | Application calendar |
| `npm run learn-rejection` | `bin/learn-rejection.mjs` | Rejection-feedback learner |
| `npm run test:rehearse` | `tests/rehearse.test.mjs` | Unit tests for rehearse |
| `npm run test:tailor` | `tests/tailor.test.mjs` | Unit tests for tailor |
| `npm run test:negotiate` | `tests/negotiate.test.mjs` | Unit tests for negotiate |
| `npm run test:outreach` | `tests/outreach.test.mjs` | Unit tests for outreach |
| `npm run test:timeline` | `tests/timeline.test.mjs` | Unit tests for timeline |
| `npm run test:learn` | `tests/learn.test.mjs` | Unit tests for learn-rejection |

Pass flags after `--`, e.g. `npm run normalize -- --dry-run`.

## Root Utilities (no npm script — run with `node`)

| Script | Purpose |
|--------|---------|
| `analyze-patterns.mjs` | Rejection pattern detector: parses applications.md + linked reports, outputs structured JSON patterns (`--summary` for a table, `--min-threshold N`) |
| `followup-cadence.mjs` | Follow-up cadence tracker: flags overdue active applications (JSON; `--summary`, `--overdue-only`, `--applied-days N`) |
| `generate-latex.mjs` | Validates a generated `.tex` CV and compiles it to PDF via `pdflatex` (requires MiKTeX/TeX Live on PATH) |
| `quick-rank.mjs` | Cheap LLM rank pass over pending `data/pipeline.md` URLs with a cross-provider model fallback chain; writes `data/ranked-{YYYY-MM-DD}.tsv` (`QUICK_RANK_MODELS` env overrides the chain) |
| `funnel-metrics.mjs` | Application funnel counts as JSON — cumulative applied/screening/technical/onsite/offer/accepted buckets to `dist/funnel-metrics.json` (`--stdout` to print) |
| `morning-brief.mjs` | Overnight summary: today's top 3 reports, follow-ups due, new pipeline entries (cron-safe; `--no-followups`, `--since-hours N`) |
| `recon-brief.mjs` | Company interview-prep recon: recent engineering-blog posts + GitHub org commits → `interview-prep/<slug>-recon-<date>.md` |
| `notify-slack.mjs` | Posts a Slack webhook when a scan finds a high-fit role (threshold default 4.0; no-ops cleanly if `SLACK_WEBHOOK_URL` unset; `--dry-run`) |
| `queue-applications.mjs` | Promotes scored pipeline entries at/above a threshold to `data/submit-queue.md` and pre-generates CV PDFs via generate-pdf.mjs (`--threshold N` on a 0-100 scale, `--no-pdf`) |
| `clay-enrich.mjs` | Optional Clay.com company-enrichment helper: `node clay-enrich.mjs <job.json|->` (also importable; returns input unchanged without `CLAY_API_KEY`) |
| `test-all.mjs` | Comprehensive repo test suite: syntax, scripts, dashboard, data contract, personal data, paths (`--quick` skips the dashboard build) |

`liveness-core.mjs` is a shared module (used by check-liveness.mjs and scan.mjs), not a CLI.

## Python Scripts

| Script | Purpose |
|--------|---------|
| `scan-jobspy.py` | Aggregator scan via python-jobspy (LinkedIn, Indeed, Glassdoor, Google Jobs, ZipRecruiter, +more): reads `jobspy_searches:` from portals.yml, applies title filters, dedupes, appends to pipeline.md (`--dry-run`, `--search <name>`; requires `pip install -U python-jobspy`) |
| `scripts/usajobs_search.py` | USAJOBS federal-jobs aggregator — free API, requires `USAJOBS_USER_AGENT` + `USAJOBS_API_KEY` |
| `scripts/google_jobs_serp.py` | Google Jobs aggregator via SERP API's `google_jobs` engine — requires `SERPAPI_API_KEY` (free tier 100 searches/month) |
| `scripts/job-distance-analysis.py` | Commute distance report from each `home_addresses[]` entry in config/profile.yml against the user-managed `data/job-locations.tsv`; remote jobs flagged separately |

---

## doctor

Validates that all prerequisites are in place: Node.js >= 20.19, dependencies installed, Playwright chromium, required files (`cv.md`, `config/profile.yml`, `portals.yml`), fonts directory, and auto-creates `data/`, `output/`, `reports/` if missing. Runtime checks run against the repo; user-layer file checks resolve against the data root (split-repo aware, see `lib/resolve-root.mjs`).

```bash
npm run doctor
```

**Exit codes:** `0` all checks passed, `1` one or more checks failed (fix messages printed).

---

## verify

Health check for pipeline data integrity. Validates `data/applications.md` against seven rules: canonical statuses (per `templates/states.yml`), no duplicate company+role pairs, all report links point to existing files, scores match `X.XX/5` / `N/A` / `DUP`, rows have proper pipe-delimited format, no pending TSVs in `batch/tracker-additions/`, and no markdown bold in scores.

```bash
npm run verify
```

**Exit codes:** `0` pipeline clean (zero errors), `1` errors found. Warnings (e.g. possible duplicates) do not cause a non-zero exit.

---

## normalize

Maps non-canonical statuses to their canonical English equivalents per `templates/states.yml` and strips markdown bold and dates from the status column. Aliases like `Enviada` become `Applied`, `CERRADA` becomes `Discarded`, etc. DUPLICADO info is moved to the notes column.

```bash
npm run normalize             # apply changes
npm run normalize -- --dry-run  # preview without writing
```

Creates a `.bak` backup of `applications.md` before writing.

**Exit codes:** `0` always (changes or no changes).

---

## dedup

Removes duplicate entries from `applications.md` by grouping on normalized company name + fuzzy role match. Keeps the entry with the highest score. If a removed entry had a more advanced pipeline status, that status is promoted to the keeper.

```bash
npm run dedup             # apply changes
npm run dedup -- --dry-run  # preview without writing
```

Creates a `.bak` backup before writing.

**Exit codes:** `0` always.

---

## merge

Merges batch tracker additions (`batch/tracker-additions/*.tsv`) into `applications.md`. Handles 9-column TSV, 8-column TSV, and pipe-delimited markdown formats. Detects duplicates by report number, entry number, and company+role fuzzy match. Higher-scored re-evaluations update existing entries in place.

```bash
npm run merge                 # apply merge
npm run merge -- --dry-run    # preview without writing
npm run merge -- --verify     # merge then run verify-pipeline
```

Processed TSVs are moved to `batch/tracker-additions/merged/`.

**Exit codes:** `0` success, `1` verification errors (with `--verify`).

---

## pdf

Renders an HTML file to a print-quality, ATS-parseable PDF via headless Chromium. Resolves font paths from `fonts/`, normalizes Unicode for ATS compatibility (em-dashes, smart quotes, zero-width characters), and reports page count and file size.

```bash
npm run pdf -- input.html output.pdf
npm run pdf -- input.html output.pdf --format=letter   # US letter
npm run pdf -- input.html output.pdf --format=a4        # A4 (default)
```

**Exit codes:** `0` PDF generated, `1` missing arguments or generation failure.

---

## sync-check

Validates that the career-ops setup is internally consistent: `cv.md` exists and is not too short, `config/profile.yml` exists with required fields, no hardcoded metrics in `modes/_shared.md` or `batch/batch-prompt.md`, and `article-digest.md` freshness (warns if older than 30 days).

```bash
npm run sync-check
```

**Exit codes:** `0` no errors (warnings allowed), `1` errors found.

---

## update:check / update / rollback (fork-detached stub)

This repo is a hard fork that does not sync from upstream `santifer/career-ops`. `update-system.mjs` is a neutered stub: it keeps the CLAUDE.md "Update Check" JSON contract but never touches files.

| Command | Behavior |
|---------|----------|
| `npm run update:check` | Always prints `{"status":"up-to-date","note":"fork-detached"}`, exits 0 |
| `npm run update` | Prints `apply is disabled in this hard fork` to stderr, exits 1 |
| `npm run rollback` | Prints `rollback is disabled in this hard fork` to stderr, exits 1 |
| `node update-system.mjs dismiss` | Prints `{"status":"dismissed"}`, exits 0 (contract compatibility) |

To re-enable upstream sync, follow the restore instructions in the header comment of `update-system.mjs` (recover the pre-neuter script via `git log --diff-filter=D --all -- update-system.mjs`).

---

## liveness

Tests whether job posting URLs are still live using headless Chromium. Detects expired patterns (e.g. "job no longer available"), HTTP 404/410, ATS redirect patterns, and apply-button presence. Supports multi-language expired patterns (English, German, French).

```bash
npm run liveness -- https://example.com/job/123
npm run liveness -- https://a.com/job/1 https://b.com/job/2
npm run liveness -- --file urls.txt
```

Each URL gets a verdict: `active`, `expired`, or `uncertain` with a reason.

**Exit codes:** `0` all URLs active, `1` any expired or uncertain.

---

## scan

Zero-token portal scanner. Hits ATS APIs (Greenhouse, Ashby, Lever) and career pages directly — no LLM tokens consumed. Reads `portals.yml` for target companies and search queries, outputs matching listings to stdout and optionally appends to `data/pipeline.md`.

```bash
npm run scan
```

**Exit codes:** `0` scan completed, `1` configuration error or no portals.yml found.

---

## test

Aggregate quality gate: runs the `node --test` unit suites in `tests/`, then `test-all.mjs` (syntax, scripts, dashboard, data contract, personal data, paths).

```bash
npm test
```

**Exit codes:** `0` everything passed, non-zero on the first failing stage.

---

## gemini:eval

Gemini-powered job offer evaluator — a free-tier alternative to the Claude-based pipeline. Reads evaluation logic from `modes/oferta.md` + `modes/_shared.md` and the CV from `cv.md`, then evaluates a JD passed on the command line. Requires `GEMINI_API_KEY` in `.env` or the environment. Default model `gemini-2.5-flash` (override with `GEMINI_MODEL` or `--model`).

```bash
npm run gemini:eval -- "Paste full JD text here"
npm run gemini:eval -- --file ./jds/my-job.txt
```

---

## voice-coach

Provisions a personal ElevenLabs Conversational AI voice job-coach agent from `config/profile.yml` + `cv.md` (and optionally a target JD), attaching your documents as a RAG knowledge base. Requires `ELEVENLABS_API_KEY`. Writes the resulting agent id to `data/voice-coach-agent.json`.

```bash
npm run voice-coach
npm run voice-coach -- --jd reports/042-acme-2026-05-14.md
npm run voice-coach -- --dry-run     # print payload, no API call
```

---

## bin/ CLIs

Six CLIs share the same shape: a thin argv shim in `bin/<name>.mjs` over the real logic in `src/<name>/index.mjs`. Bad flags print HELP and exit `2`; runtime errors exit `1`. Each has a paired unit-test npm script (`npm run test:<name>`). Run `npm run <name> -- --help` for full usage.

| CLI | Purpose |
|-----|---------|
| `rehearse` | 5-turn mock recruiter call; writes a transcript of the rehearsal |
| `tailor` | Generates a per-JD CV variant from `cv.md` |
| `negotiate` | Offer negotiation script generator |
| `outreach` | Cold-message generator for recruiter/hiring-manager outreach |
| `timeline` | Application calendar for in-flight applications |
| `learn-rejection` | Rejection-feedback learner — folds rejection signals back into targeting |
