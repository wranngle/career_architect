# CareerArchitect

A fork of [santifer/career-ops](https://github.com/santifer/career-ops) with
a Next.js landing page and a few coverage extensions for non-AI job
categories.

## Demo

🎬 _Loom walkthrough coming soon — JD evaluation, tailored CV generation, scanner + tracker flow._

<!-- Replace with: <a href="https://www.loom.com/share/<id>"><img src="https://cdn.loom.com/sessions/thumbnails/<id>-with-play.gif" alt="Career Architect demo"></a> -->

> **Looking for the additive bits as a clean overlay?** The non-personal
> additions from this fork (the `hydrate` mode, USAJOBS + Google-Jobs-SERP
> aggregators, the generic external-aggregator pattern for `scan.mjs`, the
> ATS quality bar, the MCP troubleshooting docs, the 5-tier search
> ladder) live as a separate, MIT-licensed public repo:
> **[wranngle/CareerArchitect](https://github.com/wranngle/CareerArchitect)**
> *(after the rename — see `BRANCHES (status)` below)*. That repo has
> zero personal data; this one is my personal working tree and contains
> my CV, profile, and application history.

## Why a fork

Upstream Career-Ops is tuned for senior AI/ML engineers searching
Greenhouse/Ashby/Lever. This fork adds:

- **Non-AI portal coverage** — `templates/portals.extensions.yml` has
  WebSearch queries for neurodiversity boards (Mentra, Hire Autism,
  Spectroomz, Exceptional Individuals, abilityJOBS), academic platforms,
  and international aggregators (Seek, Jora, Bayt, Naukri).
- **Commute analysis** — `scripts/job-distance-analysis.py` rates each
  tracked job's distance from every address in your `home_addresses`.
- **Hard quality filters** — minimum pay, MLM/commission-only exclusions
  via a new `hard_filters` section in `config/profile.yml`.
- **ElevenLabs voice job coach** — `npm run voice-coach` provisions a
  personal Conversational AI agent grounded in your `cv.md` + profile
  + target JD. Mock interviews, story drilling, JD prep, and
  negotiation rehearsal by voice. Requires `ELEVENLABS_API_KEY`. See
  [`modes/voice-coach.md`](./modes/voice-coach.md).
- **Landing page** — a Next.js site under `src/`, decoupled from the
  pipeline; keep it, replace it, or delete it.

Everything else (`.mjs` utilities, Go dashboard, skill modes, batch
orchestrator, PDF generation) is upstream verbatim.

## Install

```bash
# Prereqs: Node ≥18, Go ≥1.21, Python ≥3.11
npm install
npx playwright install chromium
pip install -r requirements.txt
npm run doctor                          # validates the environment

# Config
cp config/profile.example.yml config/profile.yml
cp templates/portals.example.yml portals.yml
# Optional: append sections from templates/portals.extensions.yml
#           into portals.yml for non-AI board coverage.
# Edit cv.md with your master resume content.
# Copy .env.example to .env if you want Gemini evaluation.
```

## Use (inside Claude Code)

```
/career-ops                       # show all subcommands
/career-ops <JD text or URL>      # auto-pipeline: evaluate → PDF → tracker
/career-ops scan                  # scan all enabled portals
/career-ops pdf                   # tailor cv.md for one JD, render PDF
/career-ops tracker               # pipeline status
/career-ops followup              # flag overdue follow-ups
```

Full list: `.claude/skills/career-ops/SKILL.md`.

## Dashboard

Two surfaces, one data model. Use whichever fits the task.

### Web (`/admin`) — recommended for first look

```bash
npm run dev
# then open http://localhost:3000/admin
```

Renders the same Pipeline / Progress / Scans screens as the Go TUI, with
synthetic placeholder data so reviewers can poke around without a tracker.md
on disk. See [`src/app/admin/`](./src/app/admin) and the demo banner at the
top of every admin page for the framing.

### Terminal (Go TUI)

```bash
cd dashboard && go build -o ../career-dashboard ./...
./career-dashboard --theme=wranngle   # or catppuccin-latte / catppuccin-mocha / auto
```

See [`dashboard/README.md`](./dashboard/README.md) for full theme + flag
reference. The TUI reads tracker.md and `reports/` directly off disk.

## Design tokens

The Next.js layer pulls from
[`tokens/tokens.css`](./tokens/tokens.css) (mirrored from the canonical
Wranngle DESIGN.md). The TUI's `wranngle` theme maps the same palette onto
the Catppuccin slot structure (see
[`dashboard/internal/theme/wranngle.go`](./dashboard/internal/theme/wranngle.go)).

## Landing page

```bash
npm run dev
```

## Non-goals

Same as upstream: no database, no auto-submit, no queues, no vector DB.
Claude evaluates and tailors; you submit via Simplify.jobs or any other
manual path.

## Branches (status)

`main` is the only canonical branch. The repo is intentionally a single flat
cloud document store — every branch ever opened has been reconciled into
`main`, and nothing on disk lives only on a side branch.

| Remote branch | Status | Why it still exists |
|---|---|---|
| `origin/main` | Canonical | Everything ships here. |
| `origin/master` | Deprecated — merged into main | Old root-commit branch from initial scaffolding (commit `5c660f8`). All useful files were carried into main during the upstream port; the rest were intentionally removed (see `UPSTREAM.md`). Confirmed ancestor of main with zero unique commits. |
| `origin/claude/setup-deployment-stack-Ig0PD` | Deprecated — merged into main | Earlier Claude session's deployment-stack work; superseded by the upstream port. Confirmed ancestor of main. |
| `origin/claude/complete-verification-pass-pGa7Y` | Deprecated — merged into main | Earlier Claude session's verification pass; superseded. Confirmed ancestor of main. |
| `origin/add-claude-github-actions-1765928276448` | Deprecated — closed PR #1 already merged | Source branch for the Claude Code Action install PR, kept by GitHub after merge. |

These four can be deleted via the GitHub UI (Settings → Branches, or each
branch page's trash icon) at any time — they're zero-information and only
remain because the cloud sandbox proxy blocks `git push --delete` and the
GitHub MCP exposed to in-sandbox sessions has no `delete_branch` tool.

## License

MIT, matching upstream.

## Credits

All non-trivial design credit belongs to Santiago Fernández de Valderrama
([@santifer](https://github.com/santifer)). This fork layers coverage
extensions and a landing page on top.
