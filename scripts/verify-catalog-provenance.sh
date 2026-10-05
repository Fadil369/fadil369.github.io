#!/usr/bin/env bash
# GENERATED-CATALOG PROVENANCE GATE
#
# catalog.json is generated. Two things can invalidate it, and this checks both:
#
#   1. DRIFT  -- WooCommerce changed but nobody re-synced. Caught by comparing a
#                fresh hash of the live Store API input against the recorded one.
#   2. EDIT   -- somebody hand-edited catalog.json. Caught by comparing a hash of
#                the file bytes against one recorded in a separate committed file
#                (.catalog-provenance.json). The recorded hashes cannot live inside
#                catalog.json itself, because editing the file would edit them too.
#
# A failure here means: run the sync, or revert the hand-edit. Never hand-patch.
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
CATALOG="$ROOT/src/data/catalog.json"
PROVENANCE="$ROOT/src/data/.catalog-provenance.json"

fail() {
  echo "PROVENANCE FAIL: $1" >&2
  exit 1
}

[ -f "$CATALOG" ] || fail "catalog.json not found at $CATALOG"
[ -f "$PROVENANCE" ] || fail ".catalog-provenance.json missing -- run scripts/sync-catalog-from-woocommerce.py"

read -r STORED_INPUT STORED_OUTPUT < <(python3 -c "
import json
d = json.load(open('$PROVENANCE'))
print(d.get('input_hash', ''), d.get('output_hash', ''))
")

[ -n "$STORED_INPUT" ] || fail "no input_hash recorded"
[ -n "$STORED_OUTPUT" ] || fail "no output_hash recorded"

ACTUAL_INPUT="$(python3 "$ROOT/scripts/sync-catalog-from-woocommerce.py" --print-input-hash)" \
  || fail "could not fetch the WooCommerce input"
ACTUAL_OUTPUT="$(python3 "$ROOT/scripts/sync-catalog-from-woocommerce.py" --print-file-hash)" \
  || fail "could not hash catalog.json"

if [ "$STORED_INPUT" != "$ACTUAL_INPUT" ]; then
  fail "DRIFT - WooCommerce changed and was not synced (stored=$STORED_INPUT actual=$ACTUAL_INPUT). Run: npm run sync:store"
fi

if [ "$STORED_OUTPUT" != "$ACTUAL_OUTPUT" ]; then
  fail "EDIT - catalog.json was hand-modified (stored=$STORED_OUTPUT actual=$ACTUAL_OUTPUT). Revert it, or re-run the sync if the change was intended."
fi

echo "provenance ok (input + output hashes match)"