#!/usr/bin/env python3

"""
scan-jobspy.py — Aggregator scan via python-jobspy

Companion to scan.mjs (which only hits Greenhouse/Ashby/Lever JSON APIs).
This script taps the JobSpy library to pull from LinkedIn, Indeed,
Glassdoor, Google Jobs, ZipRecruiter, Bayt, Naukri, and BDJobs in one
call — the discovery layer the project spec calls the "OEM engine".

Reads `jobspy_searches:` block from portals.yml. Applies the same
title_filter (positive/negative keywords) from portals.yml. Dedupes
against pipeline.md, scan-history.tsv, and applications.md. Appends
new offers in the exact format scan.mjs uses.

Usage:
  python3 scan-jobspy.py                # run all enabled searches
  python3 scan-jobspy.py --dry-run      # preview, don't write
  python3 scan-jobspy.py --search "AI Engineer USA"  # filter by name

Requires: python-jobspy (pip install -U python-jobspy)

Optimization tactics (ported from the legacy job-search-agent.md):
- Platform rotation: spread the same query across indeed/linkedin/glassdoor
  rather than asking one platform for 100+ results — reduces 429s.
- Keyword variation: run 2-3 queries with synonym variants
  ("Senior Backend Engineer" / "Senior Software Engineer Backend" /
  "Senior Platform Engineer") to widen recall.
- Date filtering: hours_old=168 (7 days) for routine; hours_old=24 for
  daily refreshes. Avoid hours_old=0 (no filter) outside bootstrap.
- Easy-apply filtering: avoid easy_apply=True for senior roles — it
  skews toward low-effort listings. Default easy_apply=None.
- Country selection: set country_indeed explicitly per scan; defaults
  often pull stale geo.
- Concurrency: max 1 JobSpy invocation in flight per platform per
  minute; underlying scrapers 429 hard if hammered.
"""

import argparse
import os
import re
import sys
from datetime import date
from pathlib import Path

try:
    import yaml
except ImportError:
    sys.stderr.write("Missing dependency: pip install pyyaml\n")
    sys.exit(2)

try:
    from jobspy import scrape_jobs
except ImportError:
    sys.stderr.write("Missing dependency: pip install -U python-jobspy\n")
    sys.exit(2)

ROOT = Path(__file__).parent
PORTALS_PATH = ROOT / "portals.yml"
PIPELINE_PATH = ROOT / "data" / "pipeline.md"
SCAN_HISTORY_PATH = ROOT / "data" / "scan-history.tsv"
APPLICATIONS_PATH = ROOT / "data" / "applications.md"

DEFAULT_SEARCHES = [
    {
        "name": "AI Engineer Remote USA",
        "sites": ["indeed", "linkedin", "glassdoor", "zip_recruiter"],
        "search_term": "AI engineer",
        "location": "Remote",
        "country_indeed": "USA",
        "results_wanted": 50,
        "hours_old": 168,
        "enabled": True,
    },
]


def load_portals():
    if not PORTALS_PATH.exists():
        sys.stderr.write(f"Error: {PORTALS_PATH} not found.\n")
        sys.exit(1)
    with open(PORTALS_PATH) as f:
        return yaml.safe_load(f) or {}


def build_title_filter(title_filter_cfg):
    positive = [k.lower() for k in (title_filter_cfg or {}).get("positive", [])]
    negative = [k.lower() for k in (title_filter_cfg or {}).get("negative", [])]

    def keep(title: str) -> bool:
        lower = (title or "").lower()
        has_pos = (not positive) or any(k in lower for k in positive)
        has_neg = any(k in lower for k in negative)
        return has_pos and not has_neg

    return keep


def load_seen_urls():
    seen = set()
    if SCAN_HISTORY_PATH.exists():
        for line in SCAN_HISTORY_PATH.read_text().splitlines()[1:]:
            url = line.split("\t", 1)[0]
            if url:
                seen.add(url)
    if PIPELINE_PATH.exists():
        for m in re.finditer(r"- \[[ x]\] (https?://\S+)", PIPELINE_PATH.read_text()):
            seen.add(m.group(1))
    if APPLICATIONS_PATH.exists():
        for m in re.finditer(r"https?://[^\s|)]+", APPLICATIONS_PATH.read_text()):
            seen.add(m.group(0))
    return seen


def load_seen_company_roles():
    seen = set()
    if APPLICATIONS_PATH.exists():
        text = APPLICATIONS_PATH.read_text()
        for m in re.finditer(r"\|[^|]+\|[^|]+\|\s*([^|]+)\s*\|\s*([^|]+)\s*\|", text):
            company = m.group(1).strip().lower()
            role = m.group(2).strip().lower()
            if company and role and company != "company":
                seen.add(f"{company}::{role}")
    return seen


def detect_language(text: str) -> str:
    """Crude English detector — checks for common English words.
    Returns 'en' if English-looking, else 'other'."""
    if not text:
        return "unknown"
    sample = text.lower()[:500]
    en_markers = [" the ", " and ", " for ", " with ", " you ", " our ", " we ",
                  " a ", " in ", " of ", " to ", " is ", " are "]
    hits = sum(1 for m in en_markers if m in sample)
    return "en" if hits >= 3 else "other"


def append_to_pipeline(offers):
    if not offers:
        return
    PIPELINE_PATH.parent.mkdir(parents=True, exist_ok=True)
    if not PIPELINE_PATH.exists():
        PIPELINE_PATH.write_text("# Pipeline\n\n## Pendientes\n\n## Procesadas\n")

    text = PIPELINE_PATH.read_text()
    marker = "## Pendientes"
    idx = text.find(marker)
    block = "\n" + "\n".join(
        f"- [ ] {o['url']} | {o['company']} | {o['title']}" for o in offers
    ) + "\n"

    if idx == -1:
        text = text + f"\n{marker}\n{block}"
    else:
        after_marker = idx + len(marker)
        next_section = text.find("\n## ", after_marker)
        insert_at = next_section if next_section != -1 else len(text)
        text = text[:insert_at] + block + text[insert_at:]
    PIPELINE_PATH.write_text(text)


def append_to_scan_history(offers, today):
    SCAN_HISTORY_PATH.parent.mkdir(parents=True, exist_ok=True)
    if not SCAN_HISTORY_PATH.exists():
        SCAN_HISTORY_PATH.write_text("url\tfirst_seen\tportal\ttitle\tcompany\tstatus\n")
    with open(SCAN_HISTORY_PATH, "a") as f:
        for o in offers:
            f.write(f"{o['url']}\t{today}\t{o['source']}\t{o['title']}\t{o['company']}\tadded\n")


def run_search(search_cfg, title_filter, seen_urls, seen_company_roles, english_only):
    name = search_cfg.get("name", "<unnamed>")
    print(f"\n→ {name}")
    try:
        df = scrape_jobs(
            site_name=search_cfg.get("sites", ["indeed"]),
            search_term=search_cfg["search_term"],
            location=search_cfg.get("location", ""),
            country_indeed=search_cfg.get("country_indeed", "USA"),
            results_wanted=search_cfg.get("results_wanted", 25),
            hours_old=search_cfg.get("hours_old", 168),
        )
    except Exception as e:
        print(f"  ✗ JobSpy error: {e}")
        return [], 0, 0, 0

    found = len(df) if df is not None else 0
    if not found:
        print("  (0 results)")
        return [], 0, 0, 0

    new_offers = []
    filtered = dupes = lang_skipped = 0

    for _, row in df.iterrows():
        title = str(row.get("title", "")).strip()
        company = str(row.get("company", "")).strip()
        url = str(row.get("job_url", "")).strip()
        location = str(row.get("location", "")).strip()
        site = str(row.get("site", "jobspy")).strip()
        description = str(row.get("description", "")) if row.get("description") is not None else ""

        if not title or not url:
            continue
        if not title_filter(title):
            filtered += 1
            continue
        if english_only and detect_language(description or title) != "en":
            lang_skipped += 1
            continue
        if url in seen_urls:
            dupes += 1
            continue
        key = f"{company.lower()}::{title.lower()}"
        if key in seen_company_roles:
            dupes += 1
            continue

        seen_urls.add(url)
        seen_company_roles.add(key)
        new_offers.append({
            "title": title,
            "company": company,
            "url": url,
            "location": location,
            "source": f"jobspy-{site}",
        })

    print(f"  found {found} | filtered {filtered} | lang-skipped {lang_skipped} | dupes {dupes} | new {len(new_offers)}")
    return new_offers, found, filtered, dupes


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--dry-run", action="store_true")
    parser.add_argument("--search", help="Filter searches by name (substring match)")
    parser.add_argument("--no-english-filter", action="store_true",
                        help="Disable the English-only filter (default: on)")
    args = parser.parse_args()

    portals = load_portals()
    title_filter = build_title_filter(portals.get("title_filter"))
    searches = portals.get("jobspy_searches") or DEFAULT_SEARCHES

    if args.search:
        searches = [s for s in searches if args.search.lower() in s.get("name", "").lower()]
    searches = [s for s in searches if s.get("enabled", True)]

    print(f"Running {len(searches)} JobSpy search(es)")
    if args.dry_run:
        print("(dry run — no files will be written)")

    english_only = not args.no_english_filter
    seen_urls = load_seen_urls()
    seen_company_roles = load_seen_company_roles()
    today = date.today().isoformat()

    all_new = []
    total_found = total_filtered = total_dupes = 0
    for s in searches:
        new, found, filtered, dupes = run_search(
            s, title_filter, seen_urls, seen_company_roles, english_only
        )
        all_new.extend(new)
        total_found += found
        total_filtered += filtered
        total_dupes += dupes

    if not args.dry_run and all_new:
        append_to_pipeline(all_new)
        append_to_scan_history(all_new, today)

    print(f"\n{'━' * 45}")
    print(f"JobSpy Scan — {today}")
    print(f"{'━' * 45}")
    print(f"Searches run:        {len(searches)}")
    print(f"Total jobs found:    {total_found}")
    print(f"Filtered by title:   {total_filtered}")
    print(f"Duplicates skipped:  {total_dupes}")
    print(f"New offers added:    {len(all_new)}")
    if all_new:
        print("\nFirst 10:")
        for o in all_new[:10]:
            print(f"  + {o['company']} | {o['title']} | {o['location']}")
        if not args.dry_run:
            print(f"\nResults saved to {PIPELINE_PATH} and {SCAN_HISTORY_PATH}")
    print()


if __name__ == "__main__":
    main()
