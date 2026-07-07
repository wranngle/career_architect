# MCP Troubleshooting

Operational lessons for the MCP servers this repo configures in `.mcp.json`,
plus known dead ends. Self-contained — apply these when adding or debugging
any MCP server here.

## What `.mcp.json` configures

| Server | Purpose | Env required |
|---|---|---|
| `playwright` | Browser automation (offer verification, scanning, `apply` mode) | — |
| `memory` | Cross-session knowledge graph (`MEMORY_PATH` → `.claude/memory/memory.json`) | — |
| `exa` | Tier 2-4 search in the scan ladder | `EXA_API_KEY` |
| `sequential-thinking` | Structured reasoning | — |
| `mapbox` | Geocoding for `scripts/job-distance-analysis.py` workflows | `MAPBOX_ACCESS_TOKEN` |
| `ref-tools` | Documentation lookup | `REF_API_KEY` |
| `fetch` | URL fetching via `uvx mcp-server-fetch` | — |

Every Node server launches with `npx -y`, which self-resolves on
Linux/macOS/Windows. **Do not pin platform paths** (e.g. Windows-style
absolute `node.exe` paths or `.cjs` entry points) into `.mcp.json`.

## Tool-availability mandate

A "✓ Connected" status from `claude mcp list` is **insufficient**. Tools may
not appear in the session's tool list even when the server boots cleanly
(sequential-thinking has been observed to do this). **Always test the actual
tool** by invoking it (e.g. `mcp__exa__web_search_exa`,
`mcp__ref-tools__ref_search_documentation`) before declaring an MCP
integration working. If tools don't appear after a successful boot, restart
Claude Code.

## Idempotent install pattern

When upgrading or replacing an MCP server:

```
claude mcp remove <name>
claude mcp add <name> [args]
claude mcp list           # verify "✓ Connected"
# then invoke a real tool to verify the tool surface is exposed
```

Adding without the remove step accumulates duplicate registrations.

## Playwright MCP in cloud sandboxes

- **Symptom:** `Chromium distribution 'chrome' is not found at
  /opt/google/chrome/chrome`. **Fix:** already pinned in `.mcp.json` —
  `--browser chromium --ignore-https-errors` uses the pre-installed Chromium
  and bypasses the sandbox's self-signed TLS proxy.
- `generate-pdf.mjs` is unaffected by any of this: it uses Node Playwright
  directly (not the MCP server) and loads HTML via `setContent()` + `file://`
  URLs, so no HTTPS validation is involved.
- `check-liveness.mjs` (upstream) does NOT ignore HTTPS errors and reports
  every URL as expired behind the sandbox TLS proxy — no in-fork workaround.

## MCP discovery cost in headless `claude -p`

`claude -p` (used by `batch/batch-runner.sh`) can hang and get SIGKILL'd at
~2 minutes. That "OOM" is actually MCP server discovery (playwright + memory
+ exa) blowing the harness budget. **Fix:** pass `--strict-mcp-config`; a
full A-G evaluation then completes in ~3 minutes. The batch worker as shipped
does not pass the flag, so either run it outside the cloud sandbox or add the
flag to the invocation.

## Canva MCP (optional visual CV flow)

Only used by the Canva branch of `modes/pdf.md`, gated on
`canva_resume_design_id` in `config/profile.yml`. Known issues and handling
(details in `modes/pdf.md`):

- Export URLs are pre-signed S3 links that **expire in ~2 hours** — download
  immediately with `curl -sL -o ...` and verify with `file <output>.pdf`
  (must say "PDF document"; XML/HTML means the URL expired — re-export).
- If `import-design-from-url` fails or text elements can't be mapped, fall
  back to the HTML/PDF pipeline and tell the user.
- Text replacements must stay within ±15% of the original element's length —
  Canva text boxes are fixed-size and overflow overlaps neighbors.

## Transport incompatibility — known dead ends

These servers **cannot be used with Claude Code's stdio interface**. Don't try.

| Server | Transport | Why it's dead |
|---|---|---|
| Pieces (`pieces-os`) | SSE (Server-Sent Events) | Claude Code only speaks stdio; SSE is unsupported. `lightconetech/mcp-gateway` could theoretically bridge but is untested. |
| `sms03/resume-mcp` | FastAPI HTTP server | Designed for web integrations, not the stdio MCP protocol. |
| `rajg1011/Resume-MCP-Server` | StreamableHTTPServerTransport | Same reason — HTTP-only. |

## Misc sandbox quirks

- Bursty `curl` / Chromium HTTPS traffic can return "DNS cache overflow" —
  the sandbox-side DNS cache fills under load. Wait ~15 s, reduce
  concurrency, retry; it self-clears.
- Two simultaneous `claude -p` streams starve each other at the streaming
  layer in cloud sandboxes (`API Error: Stream idle timeout`). Keep
  `batch-runner.sh` at `--parallel 1` there.
