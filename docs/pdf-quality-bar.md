# PDF Quality Bar

What "ATS-clean" means in this repo, and which pieces enforce it. The
pipeline is `modes/pdf.md` (content tailoring) → `templates/cv-template.html`
(layout) → `generate-pdf.mjs` (Playwright Chromium, HTML → PDF).

## Automatic enforcement in `generate-pdf.mjs`

### Unicode normalization (`normalizeTextForATS`)

ATS parsers and legacy systems choke on typographic Unicode — it causes
mojibake and parse failures. Before rendering, the script normalizes body
text (it masks `<style>`/`<script>` blocks and skips tags/attributes/URLs,
so CSS and markup are untouched):

| Input | Replaced with |
|---|---|
| Em-dash `—` (U+2014), en-dash `–` (U+2013) | `-` |
| Smart double quotes (U+201C-U+201F) | `"` |
| Smart single quotes (U+2018-U+201B) | `'` |
| Ellipsis `…` (U+2026) | `...` |
| Zero-width chars (U+200B/C/D, U+2060, U+FEFF) | removed |
| Non-breaking space (U+00A0) | regular space |

The run logs a per-category replacement count
(`🧹 ATS normalization: N replacements (em-dash=2, nbsp=5, ...)`) so you can
see what was cleaned.

### Font embedding from `fonts/`

`templates/cv-template.html` declares `@font-face` rules for **Space Grotesk**
(headings) and **DM Sans** (body) pointing at `./fonts/*.woff2`. The script
rewrites those relative URLs to absolute `file://` paths under the runtime
repo's `fonts/` directory (via `REPO_ROOT`, so it works in a split-repo
layout), then waits on `document.fonts.ready` before printing — no fallback
fonts sneak into the PDF, and the text stays selectable (never rasterized).

### Render settings and reporting

- Headless Chromium, `--format=letter|a4` (letter for US/Canada employers,
  A4 elsewhere), 0.6 in margins on all sides, `printBackground: true`.
- After writing the PDF, the script counts `/Type /Page` objects in the
  buffer and reports **page count** and file size. Check that number against
  the page budget below — the script reports, it does not truncate.

## Quality thresholds (`modes/pdf.md`)

- **ATS compatibility score:** 90%+ target, 85%+ minimum across major parsers
  (Jobscan, Resume Worded, SkillSyncer). Below 85% → regenerate.
- **Keyword coverage:** every JD must-have appears (verbatim or recognized
  synonym) in the Summary, an Experience bullet, AND the Skills block —
  three independent occurrences. Never invent skills; only reformulate real
  experience using the JD's vocabulary.
- **Page budget:** senior IC roles ≤ 2 pages; everything else 1 page.

## Layout rules (hard)

From the format-enforcement table in `modes/pdf.md`:

- Single-column layout, left-aligned (never full-justify). No sidebars.
- Standard section headings only (`Professional Summary`, `Work Experience`,
  `Education`, `Skills`, `Certifications`, `Projects`) — no creative names.
- Dates as `Month YYYY – Month YYYY`; bullets `•` or `▪` only (no emoji/arrows).
- Contact info in the document body at the top — never in PDF headers/footers
  (ATS strips those).
- Banned: tables (including "skills grid" tables), text boxes, images/SVG
  text, multi-column blocks, italics, underlines.
- UTF-8, selectable text. Section labels and font sizes are pinned in
  `templates/cv-template.html` — verify before customizing.

## Template design constraints

When editing `templates/cv-template.html`, `docs/ui-constraints.md` (the
Uncodixfy ruleset) applies — CLAUDE.md corrective rule 3. In particular:
`tokens/tokens.css` is the tier-1 color source (exhaust it before the
built-in palettes), and no gradient/glassmorphism/decorative-label patterns
beyond what the template already ships.

## Output variants

Three artifacts per evaluation unless waived (`modes/pdf.md`):

1. `output/cv-{name}-{company}-{date}.pdf` — via `generate-pdf.mjs`.
2. `output/cv-{name}-{company}-{date}.tex` — via `generate-latex.mjs`, for
   Overleaf / pdflatex.
3. `output/cv-{name}-{company}-{date}.txt` — ASCII-only paste version for
   "paste resume here" textareas.

## Known foot-guns

- **Never write a binary file (`.pdf`, `.docx`, fonts) with a plain-text
  Write/echo tool** — it corrupts the header. Always go through
  `generate-pdf.mjs` / `generate-latex.mjs`.
- Never compress whitespace when transcribing CV content — collapsed line
  breaks tank ATS parsing.
- Don't fall back to hand-built PDF byte streams if `pip install` fails for
  `reportlab`/`weasyprint` — the Playwright path is installed via
  `npm install` and works in every tested sandbox.
- No `--no-headless` in Playwright calls — sandboxes have no display server.
