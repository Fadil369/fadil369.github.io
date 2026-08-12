#!/usr/bin/env python3
"""
Sync the front-store catalog from Shopify.

Reads SHOPIFY_ADMIN_TOKEN and SHOPIFY_STORE_DOMAIN from the environment,
fetches all active products, maps them to the Learn / Build / Solutions stages,
and merges them into src/data/catalog.json.

Existing catalog entries are preserved (including custom fields like benefits,
faqs, etc.) and updated with live title, price, availability and image.

Usage:
    export SHOPIFY_ADMIN_TOKEN=shpat_...
    export SHOPIFY_STORE_DOMAIN=brainsait.myshopify.com
    python3 scripts/sync-catalog-from-shopify.py [--write]

Without --write the script prints a dry-run summary.
"""

import argparse
import json
import os
import re
import sys
import urllib.request
from pathlib import Path
from typing import Any

SHOPIFY_STORE_URL = "https://store.brainsait.org"
CATALOG_PATH = Path(__file__).parent.parent / "src" / "data" / "catalog.json"


def shopify_request(path: str) -> dict:
    token = os.environ.get("SHOPIFY_ADMIN_TOKEN", "")
    shop = os.environ.get("SHOPIFY_STORE_DOMAIN", "brainsait.myshopify.com")
    url = f"https://{shop}/admin/api/2026-04{path}"
    req = urllib.request.Request(
        url,
        headers={
            "X-Shopify-Access-Token": token,
            "Content-Type": "application/json",
        },
    )
    with urllib.request.urlopen(req, timeout=60) as resp:
        return json.loads(resp.read().decode())


def fetch_products() -> list[dict]:
    """Fetch all active products using cursor-based since_id pagination."""
    products = []
    since_id = 0
    while True:
        data = shopify_request(f"/products.json?limit=250&since_id={since_id}&status=active")
        batch = data.get("products", [])
        if not batch:
            break
        products.extend(batch)
        if len(batch) < 250:
            break
        since_id = batch[-1]["id"]
    return products


def slugify(text: str) -> str:
    return re.sub(r"[^a-z0-9]+", "-", text.lower()).strip("-")


def strip_html(value: str) -> str:
    """Plain-text rendering of Shopify body_html, safe for <p> and card badges."""
    text = re.sub(r"<[^>]+>", " ", value or "")
    return re.sub(r"[ \t\r\f\v]+", " ", text).replace(" \n", "\n").strip()


def determine_stage(product: dict) -> str:
    tags = [t.strip().lower() for t in product.get("tags", "").split(",") if t.strip()]
    ptype = (product.get("product_type") or "").lower()
    handle = (product.get("handle") or "").lower()

    # Learn-family product types (any casing): books, eBooks, guides,
    # templates, courses, novels, audio/video education.
    learn_ptypes = {
        "book", "ebook", "e-book", "e_book", "guide", "template",
        "course", "audio", "audiobook", "podcast", "video", "ebooks",
        "education", "novel", "hardware-guide",
    }
    learn_by_substring = ("guide" in ptype or "book" in ptype or "novel" in ptype
                          or "course" in ptype or "ebook" in ptype)
    learn_tag = "stage:learn" in tags or "category:education" in tags or "category:novels" in tags

    if learn_tag or ptype in learn_ptypes or learn_by_substring:
        return "learn"
    if "stage:build" in tags or "category:build" in tags or "incubation" in handle or ptype in {"build ticket", "program"}:
        return "build"
    if "stage:solutions" in tags or ptype in {"software", "solution", "demo", "service", "app"}:
        return "solutions"
    return "solutions"


def determine_subcategory(product: dict) -> str:
    tags = [t.strip().lower() for t in product.get("tags", "").split(",") if t.strip()]
    ptype = (product.get("product_type") or "").lower()

    mapping = {
        "healthcare": {"healthcare", "medical", "hospital", "clinic", "nphies", "fhir"},
        "business": {"business", "income", "strategy", "entrepreneur"},
        "development": {"development", "developer", "software", "coding", "dev"},
        "ai": {"ai", "cloud", "ml", "machine-learning", "artificial-intelligence"},
        "travel": {"travel", "tourism"},
        "education": {"education", "academy", "course"},
        "hospitality": {"hospitality", "restaurant", "cafe", "food", "fnb"},
        "publishing": {"publishing", "book", "novel"},
    }

    for sub, keywords in mapping.items():
        if any(k in tags for k in keywords) or any(k in ptype for k in keywords):
            return sub
    return "business"


def determine_tier(product: dict) -> str:
    ptype = (product.get("product_type") or "").lower()
    if ptype in {"book", "ebook", "e-book", "e_book", "ebooks", "guide", "template", "audiobook", "novel", "hardware-guide"}:
        return "book"
    if ptype in {"course", "audio", "video", "podcast", "education"}:
        return "course"
    return "product"


def determine_commercial(product: dict) -> str:
    ptype = (product.get("product_type") or "").lower()
    if "demo" in ptype:
        return "demo"
    if "service" in ptype:
        return "service"
    return "product"


def first_price(product: dict) -> float | None:
    variants = product.get("variants", [])
    if variants:
        try:
            return float(variants[0].get("price", 0))
        except ValueError:
            return None
    return None


def first_image(product: dict) -> str | None:
    images = product.get("images", [])
    if images:
        return images[0].get("src")
    return None


def product_to_catalog(product: dict, existing: dict | None = None) -> dict:
    handle = product.get("handle") or slugify(product.get("title", "unnamed"))
    stage = determine_stage(product)
    sub = determine_subcategory(product)
    price = first_price(product)
    image = first_image(product)

    defaults = {
        "slug": handle,
        "stage": stage,
        "name": product.get("title", ""),
        "nameAr": product.get("title", ""),
        "category": sub.capitalize(),
        "categoryAr": sub.capitalize(),
        "sub": sub,
        "tier": determine_tier(product),
        "tagline": strip_html(product.get("body_html", ""))[:160],
        "description": strip_html(product.get("body_html", "")),
        "price": price,
        "billingEn": "one-time",
        "billingAr": "دفعة واحدة",
        "free": price == 0,
        "image": image or "/assets/images/books/placeholder.webp",
        "badges": [],
        "available": product.get("status") == "active",
        "shopifyUrl": f"{SHOPIFY_STORE_URL}/products/{handle}",
        "shopifyHandle": handle,
        "sku": product.get("variants", [{}])[0].get("sku") if product.get("variants") else None,
        "commercial": determine_commercial(product),
    }

    if existing:
        # Start with live Shopify data, then overlay preserved custom fields.
        merged = dict(defaults)
        stale = {"taglineAr", "tagline_en", "tagline_ar"}
        preserved = {k: v for k, v in existing.items() if k not in merged and k not in stale}
        merged.update(preserved)
        return merged

    return defaults


def load_catalog() -> dict:
    with open(CATALOG_PATH, "r", encoding="utf-8") as f:
        return json.load(f)


def save_catalog(catalog: dict) -> None:
    with open(CATALOG_PATH, "w", encoding="utf-8") as f:
        json.dump(catalog, f, ensure_ascii=False, indent=2)


def build_lookup(catalog: dict) -> dict[str, dict]:
    lookup = {}
    for item in catalog.get("learn", []):
        if item.get("shopifyHandle"):
            lookup[item["shopifyHandle"]] = item
    for item in catalog.get("solutions", []):
        if item.get("shopifyHandle"):
            lookup[item["shopifyHandle"]] = item
    for item in catalog.get("build", {}).get("courses", []):
        if item.get("shopifyHandle"):
            lookup[item["shopifyHandle"]] = item
    return lookup


def main() -> int:
    parser = argparse.ArgumentParser(description="Sync front-store catalog from Shopify")
    parser.add_argument("--write", action="store_true", help="Write changes to catalog.json")
    parser.add_argument("--token", default=os.environ.get("SHOPIFY_ADMIN_TOKEN", ""), help="Shopify Admin API token")
    parser.add_argument("--shop", default=os.environ.get("SHOPIFY_STORE_DOMAIN", "brainsait.myshopify.com"), help="Shopify admin domain")
    args = parser.parse_args()

    if not args.token:
        print("ERROR: SHOPIFY_ADMIN_TOKEN is required", file=sys.stderr)
        return 1

    os.environ["SHOPIFY_ADMIN_TOKEN"] = args.token
    os.environ["SHOPIFY_STORE_DOMAIN"] = args.shop

    print(f"Fetching products from {args.shop} ...")
    products = fetch_products()
    print(f"Fetched {len(products)} active products.")

    catalog = load_catalog()
    lookup = build_lookup(catalog)

    added = []
    updated = []
    skipped = []

    # Reset stage buckets for fresh merge of Shopify products.
    new_learn = []
    new_solutions = []
    new_build_courses = []

    for product in products:
        handle = product.get("handle") or slugify(product.get("title", ""))
        if not handle:
            skipped.append((product.get("title", "?"), "no handle"))
            continue

        stage = determine_stage(product)

        # The incubation program is handled separately as the build program.
        if stage == "build" and "incubation" in handle:
            program = catalog.get("build", {}).get("program", {})
            price = first_price(product)
            program.update({
                "name": product.get("title", program.get("name", "Build Program")),
                "price": price if price is not None else program.get("price", 9630),
                "standardPrice": program.get("standardPrice", 14900),
                "offerPrice": program.get("offerPrice", price if price is not None else 9630),
                "shopifyUrl": f"{SHOPIFY_STORE_URL}/products/{handle}",
                "available": product.get("status") == "active",
            })
            if "build" not in catalog:
                catalog["build"] = {"program": program, "courses": []}
            catalog["build"]["program"] = program
            updated.append((handle, "build.program"))
            continue

        existing = lookup.get(handle)
        entry = product_to_catalog(product, existing)

        if existing:
            updated.append((handle, stage))
        else:
            added.append((handle, stage))

        if stage == "learn":
            new_learn.append(entry)
        elif stage == "build":
            new_build_courses.append(entry)
        else:
            new_solutions.append(entry)

    # Preserve existing entries that are not in Shopify (manual/draft items).
    existing_handles = {p.get("handle") for p in products if p.get("handle")}
    for item in catalog.get("learn", []):
        if item.get("shopifyHandle") and item["shopifyHandle"] not in existing_handles:
            new_learn.append(item)
    for item in catalog.get("solutions", []):
        if item.get("shopifyHandle") and item["shopifyHandle"] not in existing_handles:
            new_solutions.append(item)
    for item in catalog.get("build", {}).get("courses", []):
        if item.get("shopifyHandle") and item["shopifyHandle"] not in existing_handles:
            new_build_courses.append(item)

    catalog["learn"] = new_learn
    catalog["solutions"] = new_solutions
    catalog["build"]["courses"] = new_build_courses

    print(f"\nSummary: {len(added)} added, {len(updated)} updated, {len(skipped)} skipped")
    if added:
        print("Added:")
        for handle, stage in added[:10]:
            print(f"  + [{stage}] {handle}")
        if len(added) > 10:
            print(f"  ... and {len(added) - 10} more")
    if updated:
        print("Updated:")
        for handle, stage in updated[:10]:
            print(f"  ~ [{stage}] {handle}")
        if len(updated) > 10:
            print(f"  ... and {len(updated) - 10} more")
    if skipped:
        print("Skipped:")
        for title, reason in skipped[:5]:
            print(f"  ! {title} ({reason})")

    if args.write:
        save_catalog(catalog)
        print(f"\nWrote {CATALOG_PATH}")
    else:
        print("\nDry run — pass --write to save changes.")

    return 0


if __name__ == "__main__":
    sys.exit(main())
