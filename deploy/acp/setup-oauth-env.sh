#!/usr/bin/env bash
# Finish OAuth setup after registering the GitHub OAuth App (macOS).
#   1. Register the app (values in README.md), copy the Client ID, generate a client secret and COPY it.
#   2. Run: deploy/acp/setup-oauth-env.sh <client_id>
# The secret is read from the clipboard (never argv, never echoed), the app is validated against GitHub,
# a mode-600 env file is written outside the repo, and the clipboard is cleared.
set -euo pipefail
CLIENT_ID="${1:?usage: $0 <github-oauth-client-id>}"
OUT="${ACP_ENV_FILE:-$HOME/.secrets/bpr-acp.env}"
ORIGIN="${ACP_PUBLIC_URL:-https://acp.brainsait.de}"

[[ "$CLIENT_ID" =~ ^[A-Za-z0-9._-]{10,40}$ ]] || { echo "That does not look like a GitHub client ID." >&2; exit 1; }
SECRET="$(pbpaste | tr -d '[:space:]')"
[[ "$SECRET" =~ ^[A-Za-z0-9_]{30,80}$ ]] || { echo "Clipboard does not hold a client secret. Generate one on the app page and copy it first." >&2; exit 1; }

# Validate the ID and secret together with GitHub's token endpoint (sent over stdin, not argv): with a deliberately
# bogus authorization code, valid credentials answer "bad_verification_code", invalid ones "incorrect_client_credentials".
REPLY="$(printf 'client_id=%s&client_secret=%s&code=invalid-validation-probe' "$CLIENT_ID" "$SECRET" \
  | curl -s -m 15 -H 'Accept: application/json' --data-binary @- https://github.com/login/oauth/access_token)"
ERROR="$(printf '%s' "$REPLY" | python3 -c 'import json,sys;print(json.load(sys.stdin).get("error",""))' 2>/dev/null || true)"
[[ "$ERROR" == "bad_verification_code" ]] || { echo "GitHub rejected the credentials (${ERROR:-no answer}). Nothing written." >&2; exit 1; }

OWNER_ID="$(gh api user --jq .id)"
mkdir -p "$(dirname "$OUT")"
( umask 077
  cat > "$OUT" <<ENV
ACP_PUBLIC_URL=$ORIGIN
ACP_PORT=8787
ACP_GITHUB_CLIENT_ID=$CLIENT_ID
ACP_GITHUB_CLIENT_SECRET=$SECRET
ACP_ALLOWED_GITHUB_IDS=$OWNER_ID
ACP_RATE_PER_HOUR=20
ACP_AGENT_HOME=/var/lib/bpr-acp/agent-home
COPILOT_GITHUB_TOKEN=
ENV
)
chmod 600 "$OUT"
printf '' | pbcopy
echo "OK: GitHub accepts client $CLIENT_ID and its secret."
echo "Not checkable yet: the callback URL must be exactly $ORIGIN/callback (GitHub shows a redirect_uri mismatch page on first sign-in if not)."
echo "Wrote $OUT (mode 600; allow-list = your GitHub user id). Clipboard cleared."
echo "Still empty: COPILOT_GITHUB_TOKEN (fine-grained token with 'Copilot Requests')."
