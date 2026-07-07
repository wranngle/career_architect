# Project Agents

Subagent definitions available to Claude Code sessions in this repo.

## Project-specific agents (career_architect)

| Agent | Use for |
|---|---|
| [`career-architect-landing-page-designer`](CareerArchitect-landing-page-designer.md) | Market-positioning and landing-page **strategy**: audience research, value-proposition drafting, pricing hypotheses, section outlines, copy critique. Not for fabricated testimonials, fake logos, or unsourced market claims. |
| [`landing-page-developer`](landing-page-developer.md) | High-conversion landing-page **implementation**: drafting or refactoring `src/app/page.tsx` (or any marketing page) through the problem → agitation → solution → social-proof → CTA arc, thinking about ICP, headline, value prop, and CTA copy alongside the code. |

Both agents should read `docs/ui-constraints.md` before touching `src/` and
treat `tokens/tokens.css` as the tier-1 color source.

## Vendored collection

The remaining `*.md` files in this directory are the
[wshobson/agents](https://github.com/wshobson/agents) collection (backend-architect,
python-pro, security-auditor, …), vendored unmodified as general-purpose
helpers. They are not career-ops-specific; see each file's frontmatter for
its trigger description.
