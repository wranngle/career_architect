# Upstream Snapshot

Ported from: https://github.com/santifer/career-ops
Tree SHA:    b8a3a12d492a2da472fcc923531badb0b236d7e1
Ported:     2026-04-23

## What was ported verbatim

- `modes/*.md` (English only; `modes/de/`, `modes/fr/`, `modes/ja/`,
  `modes/pt/`, `modes/ru/` omitted)
- `.claude/skills/career-ops/SKILL.md`
- All root-level `.mjs` utilities (15 files): scan, doctor, verify,
  dedup, merge, pdf, latex, liveness, followup, analyze-patterns,
  update-system, cv-sync-check, normalize-statuses, gemini-eval,
  test-all, liveness-core
- `dashboard/` (Go + Bubble Tea TUI)
- `batch/` (orchestrator)
- `templates/cv-template.html`, `templates/cv-template.tex`,
  `templates/portals.example.yml`, `templates/states.yml`,
  `templates/README.md`
- `fonts/`, `interview-prep/`, `docs/`, `examples/`
- `config/profile.example.yml` (extended with fork additions)
- Root docs: `AGENTS.md`, `DATA_CONTRACT.md`, `CHANGELOG.md`,
  `LEGAL_DISCLAIMER.md`, `SECURITY.md`, `SUPPORT.md`, `VERSION`,
  `.env.example`, `.envrc`

## What was NOT ported

- Multilingual assets: localized READMEs, `modes/{de,fr,ja,pt,ru}/`
- Alt-agent integrations: `.gemini/commands/`, `.opencode/commands/`
- OSS-project bureaucracy for the upstream repo:
  `CODE_OF_CONDUCT.md`, `CONTRIBUTING.md`, `CONTRIBUTORS.md`,
  `GOVERNANCE.md`, `GEMINI.md`, `CITATION.cff`,
  `.release-please-manifest.json`, `renovate.json`, `.coderabbit.yaml`
- Nix flake: `flake.nix`, `flake.lock`
- Upstream `.github/` workflows (the fork keeps its own `.github/`)

## Fork-specific additions

- `src/` — Next.js landing page
- `templates/portals.extensions.yml` — non-AI portal queries
- `scripts/job-distance-analysis.py` — commute rating
- `config/profile.example.yml` extensions: `home_addresses`,
  `commute_thresholds`, `hard_filters`
- `requirements.txt` — Python deps for `job-distance-analysis.py`
  and JobSpy
- `.mcp.json` — MCP server config (Playwright, Memory, Exa)

## Cloud-sandbox runtime quirks

These are known-good workarounds for running the upstream code unmodified
inside Claude Code on the web. Each was verified live in this fork.

| Symptom | Workaround | Notes |
|---|---|---|
| `gemini-eval.mjs` returns HTTP 503 | Pass `--model gemini-2.5-flash` | Default `gemini-2.0-flash` was retired |
| `gemini` CLI errors with "not running in a trusted directory" | Add `--skip-trust` or set `GEMINI_CLI_TRUST_WORKSPACE=true` | Required in cloud sandboxes |
| `claude -p` (used by `batch/batch-runner.sh`) hangs and gets SIGKILL'd at ~2min | Add `--strict-mcp-config` to the invocation | The 2-min "OOM" is actually MCP server discovery (playwright + memory + exa) blowing the harness budget. With the flag, a full A-G eval completes in ~3min |
| Running `batch-runner.sh` with `--parallel >1` fails ALL workers immediately with `API Error: Stream idle timeout - partial response received` | Use `--parallel 1` (the default) | Two simultaneous `claude -p` streams in this sandbox starve each other at the streaming layer. Verified: parallel=2 fails both workers in <60s with empty 59-byte logs; parallel=1 succeeds in ~5min/eval. Stick to serial in cloud-sandbox runs. |
| `batch-runner.sh` errors with "permission denied" | `chmod +x batch/batch-runner.sh` | Repo ships with mode 644 |
| `batch-runner.sh` errors with "--dangerously-skip-permissions cannot be used with root/sudo" | Prepend `IS_SANDBOX=1` | Documented escape hatch for containerized envs |
| Playwright MCP errors with "Chromium distribution 'chrome' is not found at /opt/google/chrome/chrome" | `.mcp.json` already pins `--browser chromium --ignore-https-errors` | Uses pre-installed `chromium-1194` and bypasses sandbox TLS proxy |
| `check-liveness.mjs` reports every URL as "expired" with `ERR_CERT_AUTHORITY_INVALID` | No in-fork workaround — script is upstream | The script launches Chromium without `executablePath` or `ignoreHTTPSErrors`. Cloud sandbox proxies HTTPS through a self-signed CA that the bundled chromium doesn't trust. Needs upstream PR to honor a `PLAYWRIGHT_IGNORE_HTTPS_ERRORS=1` env var or similar. |
| `node` Playwright in `generate-pdf.mjs` works fine | No workaround needed | It loads HTML via `setContent()` and `file://` URLs — no HTTPS validation involved |
| Bursty `curl` / chromium HTTPS traffic returns "DNS cache overflow" | Wait ~15s and retry; reduce concurrency | Sandbox-side DNS cache fills under load. Self-clears. |

The batch worker as-shipped does not pass `--strict-mcp-config`, so it
will hang in cloud sandboxes. Either run the worker outside Claude Code
on the web (terminal, devcontainer), or send a PR upstream to add the
flag conditionally on `$CLAUDECODE`.

## MCP server notes (operational lessons)

These are workarounds and warnings carried over from the legacy
`mcp-server-instructions.md` and `claude-idempotent-deployment.md`,
deduplicated and condensed. Apply them when adding or debugging MCP
servers.

### Tool-availability mandate

A "✓ Connected" status from `claude mcp list` is **insufficient**.
Tools may not appear in the session's tool list even when the server
boots cleanly (sequential-thinking has been observed to do this).
**Always test the actual tool** by invoking it (e.g.
`mcp__exa__web_search_exa`, `mcp__ref-tools__ref_search_documentation`)
before declaring an MCP integration working. If tools don't appear
after a successful boot, restart Claude Code.

### Idempotent install pattern

When upgrading or replacing an MCP server, always:

```
claude mcp remove <name>
claude mcp add <name> [args]
claude mcp list           # verify "✓ Connected"
# then invoke a real tool to verify the tool surface is exposed
```

Adding without the remove step accumulates duplicate registrations.

### Transport incompatibility — known dead ends

These MCP servers are documented in the legacy doc but **cannot be
used with Claude Code's stdio interface**. Don't try.

| Server | Transport | Why it's dead |
|---|---|---|
| Pieces (`pieces-os`) | SSE (Server-Sent Events) | Claude Code only speaks stdio; SSE is unsupported. `lightconetech/mcp-gateway` could theoretically bridge but is untested. |
| `sms03/resume-mcp` | FastAPI HTTP server | Designed for web integrations, not the stdio MCP protocol. |
| `rajg1011/Resume-MCP-Server` | StreamableHTTPServerTransport | Same reason — HTTP-only. |

### Cross-platform tip

The legacy doc was Windows-centric (used absolute `node.exe` paths
and `.cjs` entry points). The fork's `.mcp.json` uses `npx -y` for
every server, which self-resolves on Linux/macOS/Windows without
hardcoded paths. Don't pin Windows-style paths into `.mcp.json`.

## Syncing from upstream

Ported upstream files live at the repo root, in `modes/`, `batch/`,
`dashboard/`, `fonts/`, `interview-prep/`, `docs/`, `examples/`,
and inside `templates/` (all but `portals.extensions.yml`), plus
`config/profile.example.yml` above the "CareerArchitect extensions"
marker.

To sync later:

1. Check upstream's new SHA on https://github.com/santifer/career-ops.
2. Diff each of the ported paths against upstream and apply.
3. Do NOT touch `src/`, `scripts/`, `templates/portals.extensions.yml`,
   `requirements.txt`, or the extension section of `config/profile.example.yml`.
4. Update the SHA and date at the top of this file.
