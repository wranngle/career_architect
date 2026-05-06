# Mode: voice-coach — Personal ElevenLabs Voice Job Coach

When the user wants to provision a personal **voice** job coach — a Conversational AI agent on their ElevenLabs workspace, grounded in their own CV / profile / target JD — run this mode.

This is a complement to `interview-prep` (which produces a written research dossier). `voice-coach` produces an **agent you call on the phone**: mock interviews, story-bank drilling, JD-specific prep, negotiation rehearsal, and open coaching, all in voice, with retrieval over the user's own documents.

## Inputs

1. **`config/profile.yml`** — candidate identity, target roles, comp targets, archetypes
2. **`cv.md`** — master resume content
3. **Target JD** (optional) — markdown file path; defaults to using the first `target_companies` + `target_roles.primary[0]` from profile
4. **`templates/voice-coach-system-prompt.md`** — the system-prompt template (do not edit per-user; pass values via `--*` flags or profile)
5. **`ELEVENLABS_API_KEY`** in env — get one at https://elevenlabs.io/app/settings/api-keys

## Step 1 — Provision

Run the script. The defaults read from `config/profile.yml`:

```bash
node voice-coach.mjs
```

Override target on the fly:

```bash
node voice-coach.mjs \
  --target-company ElevenLabs \
  --target-role "Automations Engineer" \
  --jd reports/elevenlabs-automations-engineer-2026-04-27.md
```

Pick a voice / coach persona / LLM:

```bash
node voice-coach.mjs --voice-id <voice_id> --coach-name "Coach Riley" --llm claude-opus-4-7
```

Provision a **demo** agent (no personal KB, generic candidate placeholder — useful for showing the feature without exposing your data):

```bash
node voice-coach.mjs --demo
```

Preview the payload without hitting the API:

```bash
node voice-coach.mjs --dry-run
```

The script:
1. Reads `config/profile.yml` and `cv.md` (skipped under `--demo`)
2. Resolves comp anchors from `salary_target` or `compensation.target_range`, or `--comp-anchor / --comp-target / --comp-floor` overrides
3. Substitutes the prompt template with the resolved values
4. Uploads each KB file to ElevenLabs (`POST /v1/convai/knowledge-base/file`)
5. Creates the agent (`POST /v1/convai/agents/create`) with RAG enabled
6. Appends the agent record to `data/voice-coach-agent.json` and prints the dashboard URL

## Step 2 — Test

Open the dashboard URL the script printed (or click into the agent from https://elevenlabs.io/app/conversational-ai/agents) and click **Test agent** to start a voice coaching call. The agent will open with mode selection — pick mock interview, story drilling, JD prep, negotiation rehearsal, or open coaching.

## Step 3 — Iterate

The script provisions a **fresh agent per run** rather than mutating an existing one — versioning by re-creation. To iterate on the prompt or add new KB:

1. Edit `templates/voice-coach-system-prompt.md` (system prompt) or update `cv.md` / `config/profile.yml`
2. Re-run `node voice-coach.mjs ...` — you'll get a new `agent_id`
3. The previous record stays in `data/voice-coach-agent.json` (most-recent first); delete superseded agents from the ElevenLabs UI when you're sure you don't want them

## Step 4 — Compose with interview-prep

For a high-stakes interview, run BOTH:

1. `/career-ops interview-prep <Company> <Role>` — produces a written dossier in `reports/`
2. `node voice-coach.mjs --target-company <Company> --target-role <Role> --jd reports/<the-dossier>.md` — provisions a voice coach grounded in that dossier

The voice coach then drills you against the dossier's likely questions, story mappings, and process intel.

## Knowledge base content

By default the agent's KB contains:
- The user's CV (`cv.md`)
- The user's career-ops profile (`config/profile.yml`)
- Any JD or report passed via `--jd` (repeatable)

The agent has RAG enabled and will pull from these in conversation. The system prompt instructs it to cite source docs by name and to refuse to fabricate company-internal facts.

## Cost notes

- KB uploads are negligible (storage only)
- Agent creation is free
- Voice conversations consume ElevenLabs Conversational AI credits — see https://elevenlabs.io/pricing
- Default LLM is `claude-opus-4-7`; switch with `--llm` for cheaper coaching sessions

## Boundaries

- The voice coach is a coaching agent only. It has no SMS / email / booking tools — drill, simulate, and coach.
- For document work (writing CV bullets, generating tailored CVs, building portfolio pages), redirect to `/career-ops` modes (`pdf`, `oferta`, `interview-prep`) or to Claude Code.
- The agent will never coach you to lie — no fake competing offers, no overstated traction.

## Cleanup

Delete provisioned agents from https://elevenlabs.io/app/conversational-ai/agents when you no longer want them. Knowledge base documents are listed at https://elevenlabs.io/app/conversational-ai/knowledge-base.
