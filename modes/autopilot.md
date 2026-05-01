# Modo: autopilot — Daily Autonomous Routine

The "autonomous" half of the hirability hacking system. Designed to be invoked
on a recurring interval via Claude Code's `/loop` skill (e.g.
`/loop 1d /career-ops autopilot`). Each run produces a single digest file
the user reviews each morning.

## Routine (run in order, never in parallel)

### Paso 1 — Discovery
```
node scan.mjs              # ATS APIs (Greenhouse / Ashby / Lever)
python3 scan-jobspy.py     # Aggregators (Indeed / LinkedIn / Glassdoor / etc.)
```
Both write to the same `data/pipeline.md` + `data/scan-history.tsv`. Dedup
is shared across them. Errors in either are non-fatal — log and continue.

### Paso 2 — Quick rank
```
node quick-rank.mjs --top 25
```
Produces `data/ranked-{YYYY-MM-DD}.tsv` sorted by 1-5 quick score. Costs
~500 tokens per URL (vs ~8000 for full A-H eval).

**Rate-limit note:** Gemini free tier is 15 RPM. The script defaults to
`CONCURRENCY=2` which keeps under the limit. Built-in
exponential-backoff retries handle transient 429s. For paid tier or a
larger pipeline, override via `QUICK_RANK_CONCURRENCY=5 node quick-rank.mjs`.

**ATS URL handling:** quick-rank.mjs detects Greenhouse / Ashby / Lever
URLs and fetches the JD via their JSON APIs (not the SPA HTML), so the
LLM sees the real description, not the React shell.

### Paso 3 — Top-N full evaluation
For each of the top N (default 5) from the ranked file with
`quick_score >= 4.0`, run the full `auto-pipeline` mode. The hard-stop
gate in `auto-pipeline.md` will SKIP any that flunk the deeper 10-dim
score, so this is automatically self-pruning.

**N selection:** default 5. Override via `autopilot.top_n` in
`config/profile.yml` if user wants more aggressive throughput.

### Paso 4 — Digest
Write `data/digest-{YYYY-MM-DD}.md` with:

```markdown
# Daily Digest — YYYY-MM-DD

## New offers discovered
- Total scanned: {scan_count}
- New URLs added to pipeline: {new_count}
- Top 5 by quick rank:
  1. {score} — {company} — {title} — {url}
  ...

## Full evaluations completed
- {N} reports generated, average score {avg}/5
- Top scoring: {top company} — {top role} — {top score}/5
- Reports saved: {list of report paths}
- PDFs generated: {count}

## Skipped (sub-4.0 hard-stop)
- {N} skipped — see SKIP entries in applications.md

## Suggested actions for the human
- Review top 3 reports: {paths}
- Apply to top 1 (highest scorer >= 4.5)
- Mark any false-positive matches as Discarded so the system learns
```

### Paso 5 — Notify (optional)
If `config/profile.yml` has `notify:` block configured (slack_webhook,
email, etc.), POST a one-line summary. Otherwise just print to stdout —
the user runs `cat data/digest-{date}.md` when ready.

## Running it

**One-off:** `/career-ops autopilot`

**Scheduled (Claude Code):** `/loop 1d /career-ops autopilot`
The `/loop` skill re-invokes this command on the interval. Halt with
`/loop stop`.

**Cron (terminal):** add a `cron` entry that runs
`claude -p --strict-mcp-config "/career-ops autopilot"` daily.

## Safety

- NEVER auto-submits applications. The pipeline ends at PDF + tracker row.
  Submission stays manual via Simplify.jobs autofill (per `modes/apply.md`).
- The 4.0 hard-stop in `auto-pipeline.md` enforces sub-4.0 SKIP, so
  spending tokens on bad matches is bounded.
- All outputs are gitignored — re-runs don't pollute the repo.
- If the digest shows weird patterns (zero matches, all sub-3.0 scores,
  mass dupes), STOP the loop and inspect — your filters or profile may
  be misconfigured.
