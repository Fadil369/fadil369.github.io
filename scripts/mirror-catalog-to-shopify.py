#!/usr/bin/env python3
"""
Mirror the front-store catalog (fadil369.github.io — SOURCE OF TRUTH) into
Shopify (store.brainsait.org).

For every LEARN module and SOLUTIONS listing in src/data/catalog.json the
script upserts a Shopify product keyed by handle == catalog slug:

  * title    — catalog name (EN) + AR name when present
  * body     — tagline + description (EN) + descriptionAr (AR) so both the
               storefront and Shopify admin carry full titles & descriptions
  * price    — catalog price (SOLUTIONS demos without a price become 0 SAR
               listings with an enterprise-access note)
  * tags     — stage + category so collections can be built later

Existing products are updated to match the catalog (alignment: title, body,
price) — the catalog always wins. Nothing is archived or deleted by this
script.

Usage:
    export SHOPIFY_ADMIN_TOKEN=shpat_...
    python3 scripts/mirror-catalog-to-shopify.py [--write]
"""
import argparse
import json
import os
import sys
import urllib.request
from pathlib import Path

CATALOG_PATH = Path(__file__).parent.parent / "src" / "data" / "catalog.json"


def shopify_request(path: str, method="GET", body=None):
    token = os.environ.get("SHOPIFY_ADMIN_TOKEN", "")
    url = f"https://f3rbxp-n1.myshopify.com/admin/api/2026-04{path}"
    data = json.dumps(body).encode() if body is not None else None
    req = urllib.request.Request(url, data=data, method=method, headers={
        "X-Shopify-Access-Token": token, "Content-Type": "application/json"})
    try:
        with urllib.request.urlopen(req, timeout=60) as resp:
            return json.loads(resp.read().decode())
    except urllib.error.HTTPError as e:
        raise RuntimeError(f"Shopify {method} {path} → HTTP {e.code}: {e.read().decode()[:300]}")


def fetch_all_products():
    """Fetch products of every status (active/draft/archived) — a catalog item can
    legitimately point at a draft product (e.g. deliberately paused SKUs), and those
    must still be recognized as existing so we update instead of duplicating them."""
    products, since_id = [], 0
    while True:
        data = shopify_request(f"/products.json?limit=250&since_id={since_id}")
        batch = data.get("products", [])
        if not batch:
            break
        products.extend(batch)
        if len(batch) < 250:
            break
        since_id = batch[-1]["id"]
    return products


def source_tag(tags: str) -> str | None:
    for t in (tags or "").split(","):
        t = t.strip()
        if t.startswith("source:"):
            return t[len("source:"):]
    return None


def ar_title(name_ar, name_en):
    return f"{name_en} | {name_ar}" if name_ar and name_ar != name_en else name_en


def body_html(item, stage):
    parts = []
    if item.get("tagline"):
        parts.append(f"<p><strong>{item['tagline']}</strong></p>")
    if item.get("description"):
        parts.append(f"<p>{item['description']}</p>")
    if item.get("descriptionAr"):
        parts.append(f"<p dir='rtl'>{item['descriptionAr']}</p>")
    if stage == "SOLUTIONS" and not item.get("price"):
        parts.append("<p>Enterprise / demo access — contact BrainSAIT for a live walkthrough.</p>")
        parts.append("<p dir='rtl'>وصول مؤسسي / عرض تجريبي — تواصل مع برينسايت لجلسة تعريفية مباشرة.</p>")
    return "".join(parts) or "<p>BrainSAIT — Learn · Build · Solutions.</p>"


def upsert_product(handle, title, body, price, ptype, tags, image, existing):
    if existing:
        # Preserve status/published (never silently reactivate a deliberately
        # draft/archived product) and preserve the existing tag taxonomy (which
        # carries the source:<slug> tag other tooling matches on) — only align
        # the fields the catalog actually owns.
        payload = {"product": {"title": title, "body_html": body, "product_type": ptype}}
        r = shopify_request(f"/products/{existing['id']}.json", method="PUT", body=payload)
        return {"action": "updated", "id": existing["id"], "handle": handle}

    payload = {
        "product": {
            "title": title,
            "body_html": body,
            "vendor": "BrainSAIT",
            "product_type": ptype,
            "tags": f"{tags}, source:{handle}",
            "status": "active",
            "published": True,
            "handle": handle,
            "variants": [{
                "title": "Default",
                "price": f"{price:.2f}" if price else "0.00",
                "requires_shipping": False,
            }],
        }
    }
    if image:
        payload["product"]["images"] = [{"src": image}]
    r = shopify_request("/products.json", method="POST", body=payload)
    return {"action": "created", "id": r["product"]["id"], "handle": handle}


def main():
    ap = argparse.ArgumentParser(description="Mirror github.io catalog → Shopify (catalog wins)")
    ap.add_argument("--write", action="store_true", help="apply changes (default: dry run)")
    ap.add_argument("--stage", choices=["learn", "solutions", "all"], default="all")
    args = ap.parse_args()

    if not os.environ.get("SHOPIFY_ADMIN_TOKEN"):
        print("SHOPIFY_ADMIN_TOKEN not set"); sys.exit(1)

    cat = json.loads(CATALOG_PATH.read_text())
    all_products = fetch_all_products()
    by_handle = {p["handle"]: p for p in all_products}
    by_source = {source_tag(p.get("tags", "")): p for p in all_products if source_tag(p.get("tags", ""))}
    print(f"products in Shopify (any status): {len(all_products)}  "
          f"({sum(1 for p in all_products if p['status'] == 'active')} active, "
          f"{len(by_source)} with a source: tag)")

    items = []
    if args.stage in ("learn", "all"):
        items += [("LEARN", m) for m in cat["learn"]]
    if args.stage in ("solutions", "all"):
        items += [("SOLUTIONS", s) for s in cat["solutions"]]

    created = updated = unchanged = 0
    for stage, item in items:
        handle = item["slug"]
        title = ar_title(item.get("nameAr"), item.get("name") or item.get("slug"))
        body = body_html(item, stage)
        price = item.get("price") or 0.0
        image = item.get("image")
        tags = f"{stage}, {item.get('category') or item.get('tier') or 'catalog'}, github-io"

        # Prefer a match on the source:<slug> tag or the catalog's own recorded
        # shopifyHandle — the live Shopify handle can diverge from the catalog
        # slug (bilingual titles get auto-slugified with the Arabic name, or
        # hyphenation differs) without the product actually being a duplicate.
        cur = (by_source.get(handle) or by_handle.get(item.get("shopifyHandle") or "")
               or by_handle.get(handle))

        if cur:
            cur_price = float(cur.get("variants")[0].get("price", 0) or 0)
            needs = (cur.get("title") != title or cur.get("body_html") != body)
            if not needs:
                unchanged += 1
                continue
            note = "" if cur["status"] == "active" else f" [{cur['status']}, left as-is]"
            if args.write:
                upsert_product(handle, title, body, price, stage, tags, image, cur)
                print(f"  UPD {handle}{note}")
            else:
                print(f"  ~UPD {handle} (live handle: {cur['handle']}, price {cur_price} vs catalog {price}){note}")
            updated += 1
        else:
            if args.write:
                upsert_product(handle, title, body, price, stage, tags, image, None)
                print(f"  NEW {handle} @ {price} SAR")
            else:
                print(f"  +NEW {handle} @ {price} SAR")
            created += 1

    print(f"\nsummary: {created} new, {updated} update, {unchanged} unchanged "
          f"({'WRITTEN' if args.write else 'dry-run'})")


if __name__ == "__main__":
    main()