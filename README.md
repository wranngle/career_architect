# CareerArchitect

A fork of [santifer/career-ops](https://github.com/santifer/career-ops),
an AI job-search toolkit that runs inside Claude Code: score a job
description against your CV, generate a tailored CV PDF, scan job portals,
and track applications in plain files.

This fork keeps the upstream pipeline intact and adds:

- **ElevenLabs voice interview coach** -- `npm run voice-coach` provisions a
  personal Conversational AI agent on your ElevenLabs workspace, grounded in
  your `cv.md`, profile, and an optional target JD as a RAG knowledge base.
  Used for mock interviews, story drilling, JD prep, and negotiation
  rehearsal by voice. Each run creates a fresh agent and records its id in
  `data/voice-coach-agent.json`. Requires `ELEVENLABS_API_KEY`. See
  [`modes/voice-coach.md`](./modes/voice-coach.md).
- **Non-AI portal queries** -- `templates/portals.extensions.yml` adds
  WebSearch queries for boards the upstream AI/dev-tool defaults miss:
  neurodiversity boards (Mentra, Hire Autism, Spectroomz, Exceptional
  Individuals, abilityJOBS), entry-level remote aggregators, academic
  platforms, and international boards (Seek, Jora, Bayt, Naukri). Copy the
  sections you want into your `portals.yml`.
- **Commute scoring** -- `scripts/job-distance-analysis.py` computes
  haversine distance from every `home_addresses` entry in your profile to
  each tracked job location and rates it excellent / acceptable / difficult
  against `commute_thresholds`. Remote jobs are flagged separately.
- **Hard filters** -- a `hard_filters` block in `config/profile.yml` (minimum
  pay, commission-only / MLM exclusions). Jobs that fail are dropped before
  scoring, not just downscored.
- **Next.js landing page** -- a site under `src/` with a public landing page
  and an `/admin` dashboard that reads local career-ops files when present
  and falls back to clearly marked sample data otherwise. It is decoupled
  from the pipeline; keep it, replace it, or delete it.

Everything else (the `.mjs` utilities, the Go TUI dashboard, the skill
modes, the batch orchestrator, PDF generation) is upstream. See
[`UPSTREAM.md`](./UPSTREAM.md) for the exact port snapshot, what was and was
not carried over, and the cloud-sandbox runtime workarounds verified in this
fork.

## Install

```bash
# Prereqs: Node >= 18, Go >= 1.21, Python >= 3.11
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
/career-ops <JD text or URL>      # auto-pipeline: evaluate -> PDF -> tracker
/career-ops scan                  # scan all enabled portals
/career-ops pdf                   # tailor cv.md for one JD, render PDF
/career-ops tracker               # pipeline status
/career-ops followup              # flag overdue follow-ups
```

Full list: [`.claude/skills/career-ops/SKILL.md`](./.claude/skills/career-ops/SKILL.md).

## Voice interview coach

```bash
export ELEVENLABS_API_KEY=...   # https://elevenlabs.io/app/settings/api-keys

npm run voice-coach                                     # uses config/profile.yml + cv.md
npm run voice-coach -- --target-company ElevenLabs \
                       --target-role "Automations Engineer"
npm run voice-coach -- --jd reports/some-role.md        # attach a specific JD
npm run voice-coach -- --dry-run                        # print payload, no API call
npm run voice-coach -- --demo                           # generic demo, no personal KB
```

## Dashboard

Two surfaces, one data model.

### Web (`/admin`)

```bash
npm run dev
# then open http://localhost:3000/admin
```

Renders Pipeline / Progress / Scans and a profile readiness view. It reads
local career-ops files when they exist and falls back to clearly marked
sample data when the tracker is not initialized. See
[`src/app/admin/`](./src/app/admin) and the data banner at the top of every
admin page.

### Terminal (Go TUI)

```bash
cd dashboard && go build -o ../career-dashboard ./...
./career-dashboard --theme=wranngle   # or catppuccin-latte / catppuccin-mocha / auto
```

See [`dashboard/README.md`](./dashboard/README.md) for full theme and flag
reference. The TUI reads `data/applications.md` and `reports/` directly off
disk.

## Non-goals

Same as upstream: no database, no auto-submit, no queues, no vector DB.
Claude evaluates and tailors; you submit manually.

## License

MIT, matching upstream.

## Credits

Core design credit belongs to Santiago Fernandez de Valderrama
([@santifer](https://github.com/santifer)). This fork adds the voice coach,
non-AI portal queries, commute scoring, hard filters, and the landing page
on top.
