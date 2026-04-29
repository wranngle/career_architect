#!/usr/bin/env python3
"""Google Jobs aggregator via SERP API.

Wired into scan.mjs's generic AGGREGATORS_CONFIG pattern as
`google_jobs_serp`. Hits the SERP API's `google_jobs` engine —
no scraping, structured JSON, free tier 100 searches/month.

Usage:
    SERPAPI_API_KEY=... \\
      python scripts/google_jobs_serp.py "remote python" "Austin, TX" 50000

Args (all optional, with defaults from env / argv):
    1. query       — search keywords     (default $SERP_JOBS_QUERY or "remote")
    2. location    — geo string          (default $SERP_JOBS_LOCATION or "")
    3. salary_min  — minimum salary      (default $SERP_JOBS_SALARY_MIN or 0; appended to query)
    4. results     — results to fetch    (default 10, max 100)

Setup:
    1. Sign up: https://serpapi.com/users/sign_up (free, 100/mo)
    2. Add to .env:
         SERPAPI_API_KEY=...
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


def search_google_jobs(
    query: str = "remote",
    location: str = "",
    salary_min: int = 0,
    results: int = 10,
) -> list[dict[str, Any]]:
    api_key = os.environ.get("SERPAPI_API_KEY")
    if not api_key:
        sys.stderr.write(
            "Set SERPAPI_API_KEY (free key: https://serpapi.com/users/sign_up).\n"
        )
        sys.exit(2)

    q = query
    if salary_min:
        q = f"{query} ${salary_min}+"

    url = "https://serpapi.com/search.json"
    params: dict[str, Any] = {
        "engine": "google_jobs",
        "q": q,
        "api_key": api_key,
        "num": min(max(results, 1), 100),
    }
    if location:
        params["location"] = location

    try:
        response = requests.get(url, params=params, timeout=20)
        response.raise_for_status()
    except requests.HTTPError as exc:
        status = exc.response.status_code if exc.response is not None else "?"
        body = (exc.response.text[:200] if exc.response is not None else "").strip()
        sys.stderr.write(f"SERP API error (HTTP {status}): {body}\n")
        if status == 401:
            sys.stderr.write("  → check SERPAPI_API_KEY is valid.\n")
        sys.exit(2)
    except requests.RequestException as exc:
        sys.stderr.write(f"SERP API request failed: {exc}\n")
        sys.exit(2)

    return response.json().get("jobs_results", []) or []


def main() -> int:
    query = sys.argv[1] if len(sys.argv) > 1 else os.environ.get("SERP_JOBS_QUERY", "remote")
    location = sys.argv[2] if len(sys.argv) > 2 else os.environ.get("SERP_JOBS_LOCATION", "")
    salary_min = int(sys.argv[3]) if len(sys.argv) > 3 else int(os.environ.get("SERP_JOBS_SALARY_MIN", "0"))
    results = int(sys.argv[4]) if len(sys.argv) > 4 else 10

    jobs = search_google_jobs(query, location, salary_min, results)

    if os.environ.get("SERP_JOBS_OUTPUT") == "json":
        print(json.dumps(jobs, indent=2))
        return 0

    print(f"Google Jobs found: {len(jobs)}")
    for job in jobs:
        title = job.get("title", "N/A")
        company = job.get("company_name", "N/A")
        loc = job.get("location", "N/A")
        # SERP returns multiple "apply links"; use the first share_link or apply_options[0]
        link = (job.get("share_link")
                or (job.get("apply_options") or [{}])[0].get("link", "N/A")
                or job.get("job_id", "N/A"))
        print(f"{title} at {company}")
        print(f"  Location: {loc}")
        print(f"  URL:      {link}")
        print("---")
    return 0


if __name__ == "__main__":
    sys.exit(main())
