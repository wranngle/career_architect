# scrape-fixtures

Frozen HTTP response bodies used by offline tests of network-aware scripts
(`recon-brief.mjs`, future scrapers). Real fixtures live under
`tests/fixtures/<script-name>/`; this directory documents the contract.

## Fixture contract (per script)

`recon-brief.mjs --fixtures <dir>` expects:

| File           | Purpose                                                              |
|----------------|----------------------------------------------------------------------|
| `blog.html`    | Engineering blog response body. Atom `<entry>`, RSS `<item>`, or plain HTML `<article>` blocks. |
| `github.json`  | GitHub `/orgs/<org>/events/public` JSON array. Must contain `PushEvent` entries with `payload.commits[]`. |

Missing files degrade gracefully: the script renders an empty section with
an explanatory placeholder instead of failing.

## Why offline fixtures

Network-dependent tests are flaky and leak the target company's identity
into CI logs. Fixtures give us deterministic assertions on the exact
markdown shape (`## Recent posts` + `## Recent commits`) without making
live HTTP calls.

## Adding a new fixture set

1. Capture the upstream body once (`curl -A '<UA>' <url> > blog.html`).
2. Trim to ≤ 20 entries to keep diffs reviewable.
3. Strip any obvious personal identifiers (cookies, session URLs, IPs).
4. Drop into `tests/fixtures/<script-name>/` and reference from a
   `--fixtures` flag in the test.
