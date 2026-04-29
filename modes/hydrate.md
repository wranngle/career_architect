# Modo: hydrate — Profile Bootstrap (Aggressive Profile Hydration)

Build (or repair) the user's career profile by scraping every URL the AI
can reach autonomously, then **explicitly demanding** anything it can't.
This is the most-thorough alternative to the lightweight onboarding flow
in `CLAUDE.md` First Run § Step 1-5.

## When to invoke

- User explicitly says "hydrate", "build my profile", "import LinkedIn",
  "set me up", "onboard me", "ingest my work", or similar.
- First-run detection: `cv.md` missing OR shorter than ~600 chars OR
  `config/profile.yml` is the unmodified template OR `modes/_profile.md`
  is the unmodified template OR `article-digest.md` is missing.
- Triggered automatically by the orchestrator when an `oferta` evaluation
  reports "low confidence — profile too thin to score reliably".

When ANY of those is true, do NOT silently proceed with `oferta` /
`scan` / `pdf`. Run hydrate first. Bad profile → bad evals → wasted
applications.

## Inputs the AI can scrape autonomously

For each source the user provides a URL for, drive the scrape with the
tool listed:

| Source | Best tool | Notes |
|---|---|---|
| **GitHub profile** (`github.com/<user>`) | Playwright + GitHub REST API (`https://api.github.com/users/<user>` + `/repos`) | No auth needed for public; pull bio, pinned repos, top-3 by stars, recent commits, languages |
| **Personal website / portfolio** | Exa `crawling_exa` or Playwright `browser_navigate` + `browser_snapshot` | Extract project case studies, "About" page, talks, articles |
| **Personal blog (Medium / Substack / Dev.to)** | Exa `crawling_exa` with `numResults=20` and the user's profile URL | Pull post titles + summaries; treat as proof points |
| **Upwork profile** (`upwork.com/freelancers/<id>`) | Playwright (Upwork is bot-shy — use real-browser UA) | Pull rate, total earnings, hours, top skills, recent client reviews; if hit captcha, fall back to user paste |
| **Twitter/X profile** | Exa `crawling_exa` (twitter.com is JS-heavy; Exa's livecrawl handles it) OR demand paste | Top pinned, recent tech-related posts |
| **Google Scholar / ORCID / publications** | Exa `crawling_exa` | Pull publication titles + venues; relevant for research/academic archetypes |
| **Public talks / conference videos** | Exa `web_search_exa` for `"<user_name>" speaker site:youtube.com OR site:vimeo.com` | Pull talk titles + venues |
| **Existing CV / resume URL** | Playwright + extract text | If hosted on personal site, GitHub Pages, or Drive public link |
| **Existing GitHub repo with proof points** | Read README + recent commit log via `git log` if cloned, else GitHub REST API | For each pinned repo: README first paragraph + top contributors |

## Inputs the AI must explicitly demand from the user

LinkedIn especially, but every gated platform: tell the user clearly
that you cannot reach them autonomously, and ask for a copy-paste of
the relevant content.

**LinkedIn** is the canonical example — most signal lives there but
LinkedIn aggressively blocks scrapers and requires login. Don't waste
attempts. Just say:

> I can't pull LinkedIn directly without you logged in (LinkedIn blocks
> AI scrapers). Open https://www.linkedin.com/in/<your-handle>/ in your
> own browser, then **copy the entire visible page** (Cmd/Ctrl+A,
> Cmd/Ctrl+C) and paste it into this chat. I'll handle the parsing.

Apply the same explicit demand for any of these if URLs alone don't yield content:

- LinkedIn profile (always)
- LinkedIn-published articles
- Private Notion / Confluence portfolio pages
- Slack/Discord community contributions the user wants treated as proof points
- Behance / Dribbble profiles behind logged-in views
- Stack Overflow profile (sometimes scrapable, often rate-limited — try Exa first, fall back to paste)
- Unlisted YouTube videos / private Google Drive CV
- Any "internal" employer system (intranet, internal RFCs, docs the user only has via VPN/SSO)
- Patent filings (if the user has them)
- Performance reviews / recommendation letters they want surfaced as proof points

For each of these, **explicitly tell the user** what you need and why
you can't get it yourself. Never silently skip.

## Discovery prompt (first message of a hydrate session)

Send this verbatim (or in the user's language if profile.yml says so):

```
I'll build out your full career profile so every future evaluation is
calibrated to YOU specifically, not a generic candidate. The more I
know, the sharper the system gets.

For each item below, paste the URL or "skip":

1. LinkedIn profile URL  →  I'll then ask you to copy/paste the page
   contents (LinkedIn blocks me from reading it directly)
2. GitHub profile URL    →  I'll pull pinned repos, languages, bio
3. Personal website / portfolio URL  →  I'll crawl it for case studies
4. Upwork / Toptal / Fiverr profile URL (if freelancer)
5. Personal blog / Medium / Substack / Dev.to URL
6. Twitter/X handle  (with @ or full URL)
7. Google Scholar / ORCID / publications page (if researcher)
8. Public talks / YouTube channel / conference recordings
9. Resume URL (PDF/HTML link, if hosted)

If any of those don't apply (e.g. you don't have a Twitter), just say
"skip". I'll then ask follow-up questions for everything I can't scrape.
```

After collecting URLs, **execute the scrape plan in parallel** (one
Playwright/Exa call per source, awaited concurrently), then move to
gap-filling questions.

## Gap-filling questions (after scrape)

Read what was scraped. For each of these dimensions, if the answer
isn't already in the scraped content, ASK:

1. **Target roles** — exact titles you want to apply for (e.g. "Senior
   Backend Engineer", "Director of AI", "Staff ML Engineer at a Series
   A startup"). Don't accept vague answers like "engineering roles"
   unless you can derive specifics from the user's existing CV.
2. **Salary band** — minimum acceptable, target, walk-away. USD or
   their local currency.
3. **Geography** — city + commute radius OR "remote only" + which
   countries/timezones.
4. **Visa / work authorization** — citizen, GC, H-1B, EU passport,
   needs sponsorship?
5. **Availability** — start date, current notice period.
6. **Hard filters / deal-breakers** — anything that's an automatic
   "no": no Java shops, no on-site, no startups under 20 people, no
   defense contractors, no commission-only.
7. **Proof points** — top 3 wins of the past 5 years. Format:
   "did X, achieved Y measurable result, in Z months". These go into
   `article-digest.md` as the canonical evidence pool the AI cites
   during evaluations.
8. **Drainers** — what kind of work exhausts you. Used to negative-score
   roles that lean heavily on those activities.
9. **Superpower** — one thing you do markedly better than other
   candidates with similar resumes. Used as the lead in cover letters
   and the `modes/_profile.md` narrative section.
10. **Recent learning / direction** — what skills you've been
    deliberately building. Signals "growth trajectory" to evaluators.

## Assembling the four output files

Write to all four in this order. **Never** put user-specific content
into system-layer files (`modes/_shared.md`, `modes/oferta.md`, etc.) —
that's the rule from `CLAUDE.md` Data Contract.

### 1. `cv.md` (master CV — single source of truth)

Standard markdown sections:
- `# {Name}` + contact line (email, location, LinkedIn URL, GitHub URL, website)
- `## Summary` (3-5 sentence narrative; pull "superpower" from
  gap-filling Q9 + scrape evidence)
- `## Experience` (reverse-chronological roles with `Month YYYY – Month YYYY` dates,
  3-5 quantified bullets each per `modes/pdf.md` rules)
- `## Projects` (notable side projects from GitHub + portfolio scrape)
- `## Education`
- `## Skills` (grouped: Languages / Frameworks / Tools / Domains)
- `## Publications / Talks` (only if applicable)

Use ASCII bullets (`-`), `Month YYYY – Month YYYY` date format, plain text.

### 2. `config/profile.yml` (preferences + identity)

Copy from `config/profile.example.yml` if missing, then fill:
- `identity.full_name`, `identity.email`, `identity.location`, `identity.timezone`
- `targeting.roles[]` (from gap-fill Q1)
- `targeting.salary.{min, target, walk_away, currency}` (from Q2)
- `targeting.geography.{home_addresses, commute_thresholds, remote_only}` (from Q3 + Q4)
- `targeting.work_auth` (from Q4)
- `targeting.availability` (from Q5)
- `hard_filters[]` (from Q6)
- `language.modes_dir` (default `modes/`; switch to `modes/de` etc. only if user explicitly opts in)

### 3. `modes/_profile.md` (narrative + archetype + scoring weights)

Write the user-specific framing the system uses for every evaluation:
- `## Archetypes` — 3-6 archetype labels with one-line descriptions (e.g.
  "Backend Distributed-Systems Engineer", "AI Tooling Product Engineer").
  Map these to the upstream's archetype-aware scoring in `modes/oferta.md`.
- `## Narrative` — 1-paragraph bio voiced as the candidate; this is what
  the AI quotes as "you" in cover letters.
- `## Superpower` — 1-2 sentences (from Q9).
- `## Scoring weights` — map of {dimension → weight 0..1} that biases
  the 10-dim evaluator in `modes/oferta.md`. Defaults are fine if user
  doesn't have strong preferences.
- `## Drainers` — explicit negative signals (from Q8).

### 4. `article-digest.md` (proof points pool)

Compact, citation-shaped:
- One bullet per proof point, format:
  `**{role}, {company} ({date}):** {action} → {result}` followed by
  one source URL. Source = the scraped page that confirms it
  (GitHub README, blog post, LinkedIn post, talk slides, etc.).
- Group by archetype.
- Aim for 8-15 entries minimum. If the user has fewer, ask follow-ups
  in the gap-fill phase to surface more.

## Quality gates (block downstream until met)

Refuse to proceed to `scan` / `oferta` / `pdf` if any of these are true
post-hydrate. Tell the user exactly what's missing:

- `cv.md` < 1000 chars
- `config/profile.yml` missing `targeting.salary.target` OR
  `targeting.roles` empty
- `modes/_profile.md` has fewer than 2 archetypes
- `article-digest.md` has fewer than 5 proof points
- LinkedIn was offered as a source but never pasted (user said "skip" —
  then explicitly note in `_profile.md` "LinkedIn intentionally not
  used; relying on portfolio + GitHub for signal" so future sessions
  don't re-prompt)

## Re-hydration

If the user runs `hydrate` again later, **diff** existing files against
new inputs rather than overwriting. Specifically:
- Append new proof points to `article-digest.md`; never delete entries
  unless the user explicitly says one is wrong.
- Update `cv.md` Experience bullets in-place with quantified rewrites,
  but keep the dates and company names.
- Update `config/profile.yml` salary band / geography / hard filters in
  place; never reset to defaults.
- `modes/_profile.md` narrative + scoring weights: surface diffs to the
  user as a single "here's what I'd change — confirm or override"
  prompt before writing.

## What hydrate does NOT do

- Submit applications (that's `apply`)
- Generate PDFs (that's `pdf` — runs after hydrate is done)
- Score offers (that's `oferta`)
- Find offers (that's `scan`)

It is exclusively about getting the four user-layer files into a state
where the rest of the system can do its job well.
