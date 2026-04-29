#!/usr/bin/env python3
"""Compute commute distances from every home_address in config/profile.yml to
each local job location. Remote jobs are flagged separately.

Usage:
    python scripts/job-distance-analysis.py
    python scripts/job-distance-analysis.py --tracker data/job-locations.tsv

Inputs:
    config/profile.yml         — home_addresses[] with lat/lon,
                                 commute_thresholds{excellent, acceptable}
    data/job-locations.tsv     — optional, user-managed; rows with columns:
                                 title, company, location, lat, lon, remote
                                 (missing lat/lon = remote or unlocated)

The TSV is a derived view — `data/applications.md` (the canonical tracker)
doesn't include lat/lon. Generate the TSV manually or have the AI populate
it from Mapbox/Exa lookups when running `oferta` on each entry. If the
file doesn't exist, this script reports "(no jobs in tracker)" and exits 0.

Output: plaintext report to stdout.
"""
from __future__ import annotations

import argparse
import csv
import math
import sys
from pathlib import Path

try:
    import yaml
except ImportError:
    sys.stderr.write(
        "error: PyYAML not installed. Run `pip install -r requirements.txt`\n"
    )
    sys.exit(1)


EARTH_RADIUS_MI = 3956


def haversine(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    lat1, lon1, lat2, lon2 = map(math.radians, [lat1, lon1, lat2, lon2])
    dlat = lat2 - lat1
    dlon = lon2 - lon1
    a = math.sin(dlat / 2) ** 2 + math.cos(lat1) * math.cos(lat2) * math.sin(dlon / 2) ** 2
    return EARTH_RADIUS_MI * 2 * math.asin(math.sqrt(a))


def rate_commute(miles: float, excellent: float, acceptable: float) -> str:
    if miles < excellent:
        return "EXCELLENT"
    if miles < acceptable:
        return "ACCEPTABLE"
    return "DIFFICULT"


def load_profile(path: Path) -> dict:
    if not path.exists():
        sys.stderr.write(
            f"error: {path} not found. Copy config/profile.example.yml to "
            "config/profile.yml and fill in home_addresses.\n"
        )
        sys.exit(2)
    with path.open() as f:
        return yaml.safe_load(f) or {}


def load_tracker(path: Path) -> list[dict]:
    if not path.exists():
        return []
    with path.open(newline="") as f:
        return list(csv.DictReader(f, delimiter="\t"))


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__.splitlines()[0])
    parser.add_argument("--profile", default="config/profile.yml", type=Path)
    parser.add_argument("--tracker", default="data/job-locations.tsv", type=Path)
    args = parser.parse_args()

    profile = load_profile(args.profile)
    homes = profile.get("home_addresses") or []
    if not homes:
        sys.stderr.write("error: no home_addresses in profile.yml\n")
        return 2
    thresholds = profile.get("commute_thresholds") or {}
    excellent = float(thresholds.get("excellent", 10))
    acceptable = float(thresholds.get("acceptable", 25))

    jobs = load_tracker(args.tracker)
    remote, located = [], []
    for j in jobs:
        if str(j.get("remote", "")).lower() in ("true", "1", "yes", "y"):
            remote.append(j)
            continue
        try:
            j["_lat"] = float(j["lat"])
            j["_lon"] = float(j["lon"])
            located.append(j)
        except (KeyError, ValueError, TypeError):
            remote.append(j)  # treat unlocated as remote for reporting

    print("JOB DISTANCE ANALYSIS")
    print("=" * 60)
    print(f"Profile: {args.profile} | Tracker: {args.tracker}")
    print(f"Thresholds: <{excellent:.0f}mi EXCELLENT, <{acceptable:.0f}mi ACCEPTABLE")
    print()

    if not jobs:
        print("(no jobs in tracker — run /career-ops scan first)")
        return 0

    if remote:
        print(f"REMOTE / UNLOCATED ({len(remote)}):")
        for j in remote:
            print(f"  - {j.get('title', '?')} @ {j.get('company', '?')}")
        print()

    if located:
        print(f"LOCAL ({len(located)}):")
        for home in homes:
            print(f"\nFROM {home.get('label', '?')}: {home.get('address', '?')}")
            hlat, hlon = float(home["lat"]), float(home["lon"])
            for j in located:
                miles = haversine(hlat, hlon, j["_lat"], j["_lon"])
                rating = rate_commute(miles, excellent, acceptable)
                print(
                    f"  -> {j.get('title', '?')} @ {j.get('company', '?')} "
                    f"({j.get('location', '?')}): {miles:.1f} mi [{rating}]"
                )
    return 0


if __name__ == "__main__":
    sys.exit(main())
