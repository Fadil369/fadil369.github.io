#!/usr/bin/env python3
"""Reconcile the storefront catalog with the LIVE public Shopify feed.

Unlike sync-catalog-from-shopify.py (which needs a Shopify Admin API token),
this script reads the public storefront feed:

    https://store.brainsait.de/products.json?limit=250

which exposes every product published to the Online Store sales channel —
no credentials required.

It then:
  1. Attaches missing `shopifyHandle`/`shopifyUrl` to existing build courses
     that match live products by slug (fhir-and-nphies-lab,
     solo-ai-business-workshop).
  2. Adds live products that are missing from the catalog:
       - templates : tpl-briefs-drafts, tpl-content-ideas, tpl-changelog-agent
       - solutions : brainsait-provider-registry-bpr-solutions-ready,
                     solutions-brainsait-super-partner-program-1,
                     solutions-ready-oid
       - build     : build-forge-incubator-founders-program-1,
                     spark-ai-startup-builder
  3. Refreshes meta.product_count and meta.updated.

Intentionally skipped (not shelf items):
  - brainsait-learn-digital-access-library-membership (the LEARN monthly
    membership is already surfaced via the shelf banner / checkout link)
  - bpr-slot-integration-fee (a per-SAR integration fee, not an offer)

Usage:
    python3 scripts/sync-catalog-from-public-storefront.py [--write]

Without --write a dry-run summary is printed.
"""

import argparse
import json
import re
import urllib.request
from datetime import datetime, timezone
from pathlib import Path

STORE = "https://store.brainsait.de"
CATALOG_PATH = Path(__file__).parent.parent / "src" / "data" / "catalog.json"

NEW_TEMPLATES = ["tpl-briefs-drafts", "tpl-content-ideas", "tpl-changelog-agent"]
NEW_SOLUTIONS = [
    ("brainsait-provider-registry-bpr-solutions-ready", ["Bilingual", "Ready to Deploy"], False),
    ("solutions-brainsait-super-partner-program-1", ["Membership"], True),
    ("solutions-ready-oid", ["Bilingual", "Ready to Deploy"], False),
]
NEW_BUILD_COURSES = [
    ("build-forge-incubator-founders-program-1", True),
    ("spark-ai-startup-builder", False),
]
COURSE_HANDLE_FIXES = {
    "fhir-nphies-hands-on-lab": "fhir-and-nphies-lab",
    "solo-ai-business-workshop": "solo-ai-business-workshop",
}


def fetch_products() -> dict:
    url = f"{STORE}/products.json?limit=250"
    with urllib.request.urlopen(url, timeout=60) as resp:
        data = json.loads(resp.read().decode())
    return {p["handle"]: p for p in data.get("products", [])}


def strip_html(value: str) -> str:
    text = re.sub(r"<[^>]+>", " ", value or "")
    return re.sub(r"[ \t\r\f\v]+", " ", text).replace(" \n", "\n").strip()


def base_entry(shop: dict, handle: str, stage: str, sub: str, tier: str,
               category: str, badges: list, monthly: bool) -> dict:
    p = shop[handle]
    variant = p["variants"][0] if p.get("variants") else {}
    price = float(variant.get("price", 0) or 0)
    price = int(price) if price == int(price) else price
    image = p["images"][0]["src"] if p.get("images") else ""
    desc = strip_html(p.get("body_html", ""))
    title = p.get("title", handle)
    entry = {
        "slug": handle,
        "stage": stage,
        "name": title,
        "nameAr": title,
        "category": category,
        "categoryAr": "",
        "sub": sub,
        "tier": tier,
        "tagline": desc[:160],
        "taglineAr": "",
        "description": desc,
        "descriptionAr": "",
        "price": price,
        "image": image,
        "badges": badges,
        "benefits": [],
        "formats": "",
        "whatsIncluded": [],
        "faqs": [],
        "faqAr": [],
        "rating": None,
        "users": "",
        "flag": None,
        "demoUrl": None,
        "limitedDemo": False,
        "shopifyUrl": f"{STORE}/products/{handle}",
        "shopifyHandle": handle,
        "sku": variant.get("sku") or None,
        "available": True,
        "commercial": True,
        "shopifyUrlMonthly": None,
    }
    if monthly:
        entry["billingEn"] = "monthly"
        entry["billingAr"] = "شهري"
    return entry


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--write", action="store_true", help="Write changes to catalog.json")
    args = parser.parse_args()

    shop = fetch_products()
    catalog = json.loads(CATALOG_PATH.read_text(encoding="utf-8"))

    existing = set()
    for key in ("learn", "solutions", "templates", "oid"):
        for item in catalog.get(key, []):
            if item.get("shopifyHandle"):
                existing.add(item["shopifyHandle"])
    for course in catalog.get("build", {}).get("courses", []):
        if course.get("shopifyHandle"):
            existing.add(course["shopifyHandle"])

    changes = []

    # 1) Attach handles to existing build courses that match live products.
    for course in catalog.get("build", {}).get("courses", []):
        handle = COURSE_HANDLE_FIXES.get(course.get("slug"))
        if handle and handle in shop and not course.get("shopifyHandle"):
            course["shopifyHandle"] = handle
            course["shopifyUrl"] = f"{STORE}/products/{handle}"
            changes.append(f"linked build course {course['slug']} -> {handle}")

    # 2) Add genuinely missing live products.
    for handle in NEW_TEMPLATES:
        if handle in shop and handle not in existing:
            catalog["templates"].append(base_entry(
                shop, handle, "templates", "content", "standalone",
                "AGENT TEMPLATES", ["Bilingual", "AI Agent"], False))
            changes.append(f"added template {handle}")

    for handle, badges, monthly in NEW_SOLUTIONS:
        if handle in shop and handle not in existing:
            catalog["solutions"].append(base_entry(
                shop, handle, "solutions", "general_professional", "bundle_component",
                "SOLUTIONS MEMBERSHIP" if monthly else "SOLUTIONS READY", badges, monthly))
            changes.append(f"added solution {handle}")

    for handle, monthly in NEW_BUILD_COURSES:
        if handle in shop and handle not in existing:
            catalog["build"]["courses"].append(base_entry(
                shop, handle, "build", "general_professional", "upgrade_path",
                "BUILD", [], monthly))
            changes.append(f"added build course {handle}")

    # 3) Refresh meta counts.
    counts = {
        "learn": len(catalog.get("learn", [])),
        "build": len(catalog.get("build", {}).get("courses", []))
                 + (1 if catalog.get("build", {}).get("program") else 0),
        "solutions": len(catalog.get("solutions", [])),
        "templates": len(catalog.get("templates", [])),
        "oid": len(catalog.get("oid", [])),
        "bpr": 0,
    }
    catalog.setdefault("meta", {})["product_count"] = counts
    if isinstance(catalog["meta"].get("checkout"), dict):
        catalog["meta"]["checkout"]["product_count"] = counts
    catalog["meta"]["updated"] = datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%S.000Z")

    for c in changes:
        print(" -", c)
    print("counts:", counts)

    if args.write and changes:
        CATALOG_PATH.write_text(json.dumps(catalog, ensure_ascii=False, indent=2) + "\n",
                                encoding="utf-8")
        print("catalog.json updated")
    elif not changes:
        print("no changes")
    else:
        print("dry-run (pass --write to apply)")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
