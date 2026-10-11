#!/usr/bin/env bash
# GENERATED-CATALOG PROVENANCE GATE
#
# catalog.json is generated from the Shopify store. Two things can invalidate it,
# and this checks both:
#
#   1. DRIFT  -- Shopify changed but nobody re-synced. Caught by comparing a
#                fresh hash of the live Store API input against the recorded one.
#   2. EDIT   -- somebody hand-edited catalog.json. Caught by comparing a hash of
#                the file bytes against one recorded in a separate committed file
#                (.catalog-provenance.json). The recorded hashes cannot live inside
#                catalog.json itself, because editing the file would edit them too.
#
# A failure here means: run the sync, or revert the hand-edit. Never hand-patch.
#
# NOTE: this previously validated against the WooCommerce Store API
# (shop.brainsait.de/wp-json/wc/store/v1/products). That store was retired when
# the catalogue moved to Shopify, so the gate could never pass and every commit
# touching catalog.json failed on an endpoint that no longer exists. It now
# validates against the same Shopify Admin API the catalogue is generated from.
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
CATALOG="$ROOT/src/data/catalog.json"
PROVENANCE="$ROOT/src/data/.catalog-provenance.json"
SYNC="$ROOT/scripts/sync-catalog-from-shopify.py"

fail() {
  echo "PROVENANCE FAIL: $1" >&2
  exit 1
}

[ -f "$CATALOG" ] || fail "catalog.json not found at $CATALOG"
[ -f "$PROVENANCE" ] || fail ".catalog-provenance.json missing -- run npm run sync:shopify"

# Credentials are read from a local, gitignored env file when present.
if [ -f "$ROOT/.env.shopify" ]; then
  set -a; . "$ROOT/.env.shopify"; set +a
fi

if [ -z "${SHOPIFY_ADMIN_TOKEN:-}" ]; then
  echo "provenance gate SKIPPED - no SHOPIFY_ADMIN_TOKEN available."
  echo "  Create $ROOT/.env.shopify with SHOPIFY_ADMIN_TOKEN and SHOPIFY_STORE_DOMAIN"
  echo "  to enforce this check locally or in CI."
  exit 0
fi

read -r STORED_INPUT STORED_OUTPUT < <(python3 -c "
import json
d = json.load(open('$PROVENANCE'))
print(d.get('input_hash', ''), d.get('output_hash', ''))
")

[ -n "$STORED_INPUT" ] || fail "no input_hash recorded"
[ -n "$STORED_OUTPUT" ] || fail "no output_hash recorded"

ACTUAL_INPUT="$(python3 "$SYNC" --print-input-hash | tail -1)" \
  || fail "could not fetch the Shopify input"
ACTUAL_OUTPUT="$(python3 "$SYNC" --print-file-hash | tail -1)" \
  || fail "could not hash catalog.json"

if [ "$STORED_INPUT" != "$ACTUAL_INPUT" ]; then
  fail "DRIFT - Shopify changed and was not synced (stored=$STORED_INPUT actual=$ACTUAL_INPUT). Run: npm run sync:shopify"
fi

if [ "$STORED_OUTPUT" != "$ACTUAL_OUTPUT" ]; then
  fail "EDIT - catalog.json was hand-modified (stored=$STORED_OUTPUT actual=$ACTUAL_OUTPUT). Revert it, or re-run the sync if the change was intended."
fi

echo "provenance ok (input + output hashes match)"
