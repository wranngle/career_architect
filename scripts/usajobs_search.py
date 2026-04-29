#!/usr/bin/env python3
"""USAJOBS federal-jobs aggregator.

Ported during the strict re-audit pass to fill the USAJOBS gap noted in
the legacy agents/job-search-agent.md. USAJOBS is the canonical source
for US federal positions — fully free, no card required.

Usage:
    USAJOBS_USER_AGENT=you@example.com USAJOBS_API_KEY=... \\
      python scripts/usajobs_search.py "data engineer" "Washington, DC" 100000

Args (all optional, with defaults from env / argv):
    1. keyword         — search keyword       (default $USAJOBS_KEYWORD or "")
    2. location        — location string      (default $USAJOBS_LOCATION or "")
    3. salary_min      — minimum salary       (default $USAJOBS_SALARY_MIN or 0)
    4. results         — results per page     (default 25, max 500)
    5. results_pages   — pages to fetch       (default 1)

Setup (one-time):
    1. Read https://developer.usajobs.gov/general/quick-start
       (the "API Request page" linked from there is currently broken on
       USAJOBS' own portal as of 2026-04 — fall back to emailing
       apirequest@usajobs.gov directly with your email + use case until
       it's fixed)
    2. Receive API key by email
    3. Add to .env:
         USAJOBS_USER_AGENT=your_email@example.com
         USAJOBS_API_KEY=...
"""

from __future__ import annotations

import json
import os
import sys
from typing import Any

try:
    import requests
except ImportError:
    sys.stderr.write("requests not installed. Run: pip install -r requirements.txt\n")
    sys.exit(2)


def search_usajobs(
    keyword: str = "",
    location: str = "",
    salary_min: int = 0,
    results_per_page: int = 25,
    pages: int = 1,
) -> list[dict[str, Any]]:
    user_agent = os.environ.get("USAJOBS_USER_AGENT")
    api_key = os.environ.get("USAJOBS_API_KEY")
    if not user_agent or not api_key:
        sys.stderr.write(
            "Set USAJOBS_USER_AGENT (email) and USAJOBS_API_KEY. "
            "Quick start: https://developer.usajobs.gov/general/quick-start "
            "(if their API Request page errors out, email "
            "apirequest@usajobs.gov directly — known portal bug).\n"
        )
        sys.exit(2)

    url = "https://data.usajobs.gov/api/search"
    headers = {
        "Host": "data.usajobs.gov",
        "User-Agent": user_agent,
        "Authorization-Key": api_key,
    }
    out: list[dict[str, Any]] = []

    for page in range(1, max(pages, 1) + 1):
        params: dict[str, Any] = {
            "ResultsPerPage": min(max(results_per_page, 1), 500),
            "Page": page,
        }
        if keyword:
            params["Keyword"] = keyword
        if location:
            params["LocationName"] = location
        if salary_min:
            params["RemunerationMinimumAmount"] = salary_min

        try:
            response = requests.get(url, params=params, headers=headers, timeout=20)
            response.raise_for_status()
        except requests.HTTPError as exc:
            status = exc.response.status_code if exc.response is not None else "?"
            body = (exc.response.text[:200] if exc.response is not None else "").strip()
            sys.stderr.write(f"USAJOBS API error (HTTP {status}): {body}\n")
            if status == 401:
                sys.stderr.write("  → check USAJOBS_USER_AGENT and USAJOBS_API_KEY are valid.\n")
            sys.exit(2)
        except requests.RequestException as exc:
            sys.stderr.write(f"USAJOBS API request failed: {exc}\n")
            sys.exit(2)

        items = (response.json().get("SearchResult") or {}).get("SearchResultItems") or []
        out.extend(items)
        if len(items) < params["ResultsPerPage"]:
            break

    return out


def main() -> int:
    keyword = sys.argv[1] if len(sys.argv) > 1 else os.environ.get("USAJOBS_KEYWORD", "")
    location = sys.argv[2] if len(sys.argv) > 2 else os.environ.get("USAJOBS_LOCATION", "")
    salary_min = int(sys.argv[3]) if len(sys.argv) > 3 else int(os.environ.get("USAJOBS_SALARY_MIN", "0"))
    per_page = int(sys.argv[4]) if len(sys.argv) > 4 else 25
    pages = int(sys.argv[5]) if len(sys.argv) > 5 else 1

    items = search_usajobs(keyword, location, salary_min, per_page, pages)

    if os.environ.get("USAJOBS_OUTPUT") == "json":
        print(json.dumps(items, indent=2))
        return 0

    print(f"Federal jobs found: {len(items)}")
    for item in items:
        descriptor = item.get("MatchedObjectDescriptor") or {}
        title = descriptor.get("PositionTitle", "N/A")
        org = descriptor.get("OrganizationName", "N/A")
        loc_list = descriptor.get("PositionLocationDisplay") or descriptor.get("PositionLocation", [])
        loc = loc_list if isinstance(loc_list, str) else ", ".join(
            (l.get("LocationName") or "") for l in (loc_list or [])
        )
        remuneration = descriptor.get("PositionRemuneration") or [{}]
        sal_lo = remuneration[0].get("MinimumRange", "N/A")
        sal_hi = remuneration[0].get("MaximumRange", "N/A")
        link = descriptor.get("PositionURI", "N/A")
        print(f"{title} at {org}")
        print(f"  Location: {loc}")
        print(f"  Salary:   ${sal_lo}-${sal_hi}")
        print(f"  URL:      {link}")
        print("---")
    return 0


if __name__ == "__main__":
    sys.exit(main())
