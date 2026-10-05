#!/usr/bin/env python3
"""Sync catalog.json from the WooCommerce Store API.

WooCommerce is the machine-owned source for every commercial fact: price, sale
price, sale window, availability, SKU, category. Editorial fields (Arabic copy,
benefits, FAQs, tier, stage) are authored by a human and are never overwritten
here -- they are carried across from the existing catalog by slug.

Stage assignment is preserved from the existing catalog. A WooCommerce product
with no matching slug is reported as UNMAPPED rather than guessed into a stage,
because the six store categories (Agents, Apps, Books, Courses, Skills,
Templates) do not correspond one-to-one with the five editorial stages.

Usage:
    python3 scripts/sync-catalog-from-woocommerce.py [--dry-run]
"""

import argparse
import collections
import datetime
import hashlib
import json
import pathlib
import sys
import urllib.request

STORE_API = "https://shop.brainsait.de/wp-json/wc/store/v1/products"
PER_PAGE = 100
MAX_PAGES = 20
ROOT = pathlib.Path(__file__).resolve().parent.parent
CATALOG = ROOT / "src/data/catalog.json"
PROVENANCE = ROOT / "src/data/.catalog-provenance.json"

EDITORIAL_FIELDS = (
    "nameAr",
    "description",
    "descriptionAr",
    "tagline",
    "taglineAr",
    "benefits",
    "faqs",
    "faqAr",
    "tier",
    "sub",
    "categoryAr",
    "badges",
    "demoUrl",
    "limitedDemo",
    "rating",
    "users",
    "formats",
    "whatsIncluded",
    "commercial",
    "flag",
    "image",
    "category",
)


def halala_to_sar(minor):
    """Convert WooCommerce minor units to SAR. Mirrors fromHalala() in TypeScript."""
    if minor is None or minor == "":
        return 0.0
    try:
        value = float(minor)
    except (TypeError, ValueError):
        return 0.0
    return round(value) / 100


def fetch_products():
    products = []
    for page in range(1, MAX_PAGES + 1):
        url = f"{STORE_API}?per_page={PER_PAGE}&page={page}"
        with urllib.request.urlopen(url, timeout=60) as response:
            batch = json.load(response)
        products.extend(batch)
        if len(batch) < PER_PAGE:
            break
    return products


def canonical_hash(rows):
    payload = json.dumps(rows, sort_keys=True, separators=(",", ":"))
    return hashlib.sha256(payload.encode()).hexdigest()


def file_hash(path):
    return hashlib.sha256(pathlib.Path(path).read_bytes()).hexdigest()


def handle_index(products):
    """WooCommerce slug -> product, for matching editorial entries to commerce."""
    return {p["slug"]: p for p in products}


def stage_index(catalog):
    index = {}
    for stage in ("learn", "solutions", "templates", "oid"):
        for item in catalog.get(stage) or []:
            if isinstance(item, dict) and item.get("slug"):
                index[item["slug"]] = stage
    for item in (catalog.get("build") or {}).get("courses") or []:
        if isinstance(item, dict) and item.get("slug"):
            index[item["slug"]] = "build.courses"
    return index


def map_product(product, existing):
    prices = product.get("prices") or {}
    price = halala_to_sar(prices.get("regular_price"))
    sale_raw = prices.get("sale_price")
    sale = halala_to_sar(sale_raw) if sale_raw not in (None, "") else 0.0
    on_sale = bool(product.get("on_sale"))

    offer_price = None
    if on_sale and sale_raw not in (None, "") and 0 < sale < price:
        offer_price = sale

    permalink = product.get("permalink") or ""
    if ".org" in permalink:
        raise SystemExit(f"refusing to write an .org permalink: {permalink}")

    merged = dict(existing) if existing else {}
    for legacy, modern in (
        ("shopifyUrlMonthly", "storeUrlMonthly"),
        ("shopifyUrlOneTime", "storeUrlOneTime"),
        ("shopifyHandle", "storeHandle"),
        ("shopifyUrl", "storeUrl"),
    ):
        if legacy in merged:
            merged.setdefault(modern, merged.pop(legacy))
    merged["slug"] = product.get("slug")
    merged["name"] = product.get("name")
    merged["sku"] = product.get("sku")
    merged["price"] = price
    merged["originalPrice"] = price
    merged["available"] = bool(product.get("is_purchasable"))
    merged["storeUrl"] = permalink
    merged["storeHandle"] = product.get("slug")
    for legacy in ("shopifyUrl", "shopifyHandle"):
        merged.pop(legacy, None)

    if offer_price is not None:
        merged["offerPrice"] = offer_price
        merged["offerUntil"] = product.get("date_on_sale_to")
        merged["offerLabel"] = None
        merged["offerLabelEn"] = None
        merged["offerLabelAr"] = None
    else:
        for field in ("offerPrice", "offerUntil", "offerLabel", "offerLabelEn", "offerLabelAr"):
            merged.pop(field, None)

    categories = product.get("categories") or []
    if categories:
        merged["category"] = categories[0].get("name")

    short = product.get("short_description") or ""
    if short and not merged.get("description"):
        merged["description"] = short

    return merged


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--dry-run", action="store_true")
    parser.add_argument("--print-input-hash", action="store_true")
    parser.add_argument("--print-file-hash", action="store_true")
    args = parser.parse_args()

    catalog = json.loads(CATALOG.read_text(), object_pairs_hook=collections.OrderedDict)
    stages = stage_index(catalog)
    products = fetch_products()

    if args.print_input_hash:
        print(canonical_hash(products))
        return 0
    if args.print_file_hash:
        print(file_hash(CATALOG))
        return 0

    wc_slugs = {p["slug"] for p in products}
    unmapped = sorted(wc_slugs - set(stages))
    # An editorial entry is accounted for when its commerce handle exists in the
    # store, even if the editorial slug differs from the store slug.
    accounted = set(stages) | {
        item.get("storeHandle")
        for stage in ("learn", "solutions", "templates", "oid")
        for item in (catalog.get(stage) or [])
        if isinstance(item, dict) and item.get("storeHandle")
    } | {
        item.get("storeHandle")
        for item in (catalog.get("build") or {}).get("courses") or []
        if isinstance(item, dict) and item.get("storeHandle")
    }
    catalog_only = sorted(h for h in accounted if h and h not in wc_slugs)
    malformed = [
        i
        for i in (catalog.get("solutions") or [])
        if not isinstance(i, dict) or not i.get("slug")
    ]

    report = {
        "generated_at": datetime.datetime.now(datetime.timezone.utc).isoformat(),
        "source": STORE_API,
        "woocommerce_products": len(products),
        "mapped_by_existing_stage": len(wc_slugs & set(stages)),
        "unmapped_woocommerce_slugs": unmapped,
        "catalog_slugs_absent_from_woocommerce": catalog_only,
        "malformed_existing_entries": len(malformed),
        "input_hash": canonical_hash(products),
    }

    print(json.dumps(report, indent=2)[:4000])
    if unmapped:
        print(
            f"\nUNMAPPED {len(unmapped)} WooCommerce product(s) have no editorial stage.\n"
            "They are NOT written. Assign a stage for each, or drop them from the store.",
            file=sys.stderr,
        )
    if args.dry_run:
        print("\ndry run: nothing written")
        return 0

    meta = catalog.setdefault("meta", collections.OrderedDict())
    meta["source"] = STORE_API
    meta["source_hash"] = report["input_hash"]
    meta["generated_at"] = report["generated_at"]
    meta["updated"] = report["generated_at"]

    existing_by_slug = {}
    for stage in ("learn", "solutions", "templates", "oid"):
        for item in catalog.get(stage) or []:
            if isinstance(item, dict) and item.get("slug"):
                existing_by_slug[item["slug"]] = item
    for item in (catalog.get("build") or {}).get("courses") or []:
        if isinstance(item, dict) and item.get("slug"):
            existing_by_slug[item["slug"]] = item

    by_handle = handle_index(products)
    counts = collections.Counter()
    for stage in ("learn", "solutions", "templates", "oid"):
        rebuilt = []
        for item in catalog.get(stage) or []:
            if not isinstance(item, dict) or not item.get("slug"):
                rebuilt.append(item)
                continue
            handle = item.get("storeHandle") or item.get("slug")
            fresh = by_handle.get(handle)
            if fresh is None:
                rebuilt.append(item)
                counts[f"{stage}:absent"] += 1
                continue
            merged = map_product(fresh, item)
            merged["stage"] = item.get("stage") or stage
            rebuilt.append(merged)
            counts[stage] += 1
        catalog[stage] = rebuilt

    courses = []
    for item in (catalog.get("build") or {}).get("courses") or []:
        if not isinstance(item, dict) or not item.get("slug"):
            courses.append(item)
            continue
        handle = item.get("storeHandle") or item.get("slug")
        fresh = by_handle.get(handle)
        if fresh is None:
            courses.append(item)
            continue
        merged = map_product(fresh, item)
        merged["stage"] = item.get("stage") or "build"
        courses.append(merged)
        counts["build.courses"] += 1
    catalog["build"]["courses"] = courses

    meta["product_count"] = collections.OrderedDict(
        [
            ("learn", len(catalog.get("learn") or [])),
            ("build", len(courses) + (1 if (catalog.get("build") or {}).get("program") else 0)),
            ("solutions", len([i for i in catalog.get("solutions") or [] if isinstance(i, dict) and i.get("slug")])),
            ("templates", len(catalog.get("templates") or [])),
            ("oid", len(catalog.get("oid") or [])),
            ("bpr", meta.get("product_count", {}).get("bpr", 0)),
        ]
    )

    CATALOG.write_text(json.dumps(catalog, ensure_ascii=False, indent=2) + "\n")
    PROVENANCE.write_text(
        json.dumps(
            {
                "input_hash": report["input_hash"],
                "output_hash": file_hash(CATALOG),
                "generated_at": report["generated_at"],
                "source": STORE_API,
            },
            indent=2,
        )
        + "\n"
    )
    print(f"\nwrote {CATALOG}")
    print(f"wrote {PROVENANCE}")
    print(f"counts {dict(counts)}")
    return 0


if __name__ == "__main__":
    sys.exit(main())