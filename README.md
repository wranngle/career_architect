# CareerArchitect

A fork of [santifer/career-ops](https://github.com/santifer/career-ops) with
a Next.js landing page and a few coverage extensions for non-AI job
categories.

> **Looking for the additive bits as a clean overlay?** The non-personal
> additions from this fork (the `hydrate` mode, USAJOBS + Google-Jobs-SERP
> aggregators, the generic external-aggregator pattern for `scan.mjs`, the
> ATS quality bar, the MCP troubleshooting docs, the 5-tier search
> ladder) live as a separate, MIT-licensed public repo:
> **[wranngle/career_architect](https://github.com/wranngle/career_architect)**.
> Keep personal search data in the gitignored user-layer files described in
> `DATA_CONTRACT.md`.

## Why a fork

Upstream Career-Ops is tuned for senior AI/ML engineers searching
Greenhouse/Ashby/Lever. This fork adds:

- **Non-AI portal coverage**: `templates/portals.extensions.yml` has
  WebSearch queries for neurodiversity boards (Mentra, Hire Autism,
  Spectroomz, Exceptional Individuals, abilityJOBS), academic platforms,
  and international aggregators (Seek, Jora, Bayt, Naukri).
- **Commute analysis**: `scripts/job-distance-analysis.py` rates each
  tracked job's distance from every address in your `home_addresses`.
- **Hard quality filters**: minimum pay, MLM/commission-only exclusions
  via a new `hard_filters` section in `config/profile.yml`.
- **ElevenLabs voice job coach**: `npm run voice-coach` provisions a
  personal Conversational AI agent grounded in your `cv.md` + profile
  + target JD. Mock interviews, story drilling, JD prep, and
  negotiation rehearsal by voice. Requires `ELEVENLABS_API_KEY`. See
  [`modes/voice-coach.md`](./modes/voice-coach.md).
- **Landing page**: a Next.js site under `src/`, decoupled from the
  pipeline; keep it, replace it, or delete it.

The fork keeps upstream's architecture and license, and carries local
changes across the modes, the `.mjs` scripts, the dashboard, the package
files, the templates, and the agents. See [`UPSTREAM.md`](./UPSTREAM.md)
for the port details.

## Install

```bash
# Prereqs: Node ≥18, Go ≥1.24.2, Python ≥3.11
npm install
npx playwright install chromium
pip install -r requirements.txt
npm run doctor                          # validates the environment

# Config
cp config/profile.example.yml config/profile.yml
cp modes/_profile.template.md modes/_profile.md
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

### Web (`/admin`): recommended for first look

```bash
npm run dev
# then open http://localhost:3000/admin
```

Renders Pipeline / Progress / Scans screens and a Profile readiness view. It
reads local career-ops files when they exist and falls back to clearly marked
sample data when the tracker is not initialized. See
[`src/app/admin/`](./src/app/admin) and the data banner at the top of every
admin page for the framing.

### Terminal (Go TUI)

```bash
cd dashboard && go build -o ../career-dashboard ./...
./career-dashboard --theme=wranngle   # or catppuccin-latte / catppuccin-mocha / auto
```

See [`dashboard/README.md`](./dashboard/README.md) for full theme + flag
reference. The TUI reads `applications.md` / `data/applications.md` and
`reports/` directly off disk.

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

## License

MIT, matching upstream.

## Credits

All non-trivial design credit belongs to Santiago Fernández de Valderrama
([@santifer](https://github.com/santifer)). This fork layers coverage
extensions and a landing page on top.
