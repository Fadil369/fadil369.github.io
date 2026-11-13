#!/usr/bin/env bash
# Black-box smoke test for a deployed clinical ACP service. Safe to run any time: read-only, no sign-in, no prompts.
#
#   deploy/acp/smoke.sh                                   # checks https://acp.brainsait.de
#   deploy/acp/smoke.sh https://acp.example.org           # another host
#   deploy/acp/smoke.sh https://acp.brainsait.de ~/.secrets/bpr-acp.env
#                                                         # also validates COPILOT_GITHUB_TOKEN and reports its expiry
#
# Exit status is the number of failed checks. The token is read from the file and sent only to api.github.com,
# through stdin, so it never appears in a process list or in this script's output.
set -u
URL=${1:-https://acp.brainsait.de}
ENV_FILE=${2:-}
URL=${URL%/}
HOST=${URL#https://}
fails=0
pass() { printf '  PASS  %s\n' "$1"; }
fail() { printf '  FAIL  %s\n' "$1"; fails=$((fails + 1)); }
warn() { printf '  WARN  %s\n' "$1"; }
check() { if [ "$2" = "$3" ]; then pass "$1"; else fail "$1 (expected $3, got $2)"; fi; }
curl_() { curl -q -s --path-as-is --max-time 20 "$@"; }  # -q: ignore ~/.curlrc (e.g. a global "location" that follows redirects)
code() { curl_ -o /dev/null -w '%{http_code}' "$@"; }

echo "ACP smoke test: $URL"

echo "Availability"
check "GET /healthz is 200" "$(code "$URL/healthz")" 200
check "healthz body is {\"ok\":true}" "$(curl_ "$URL/healthz")" '{"ok":true}'
check "GET / serves the UI" "$(code "$URL/")" 200
check "HEAD / works" "$(code -I "$URL/")" 200
check "HEAD /healthz works" "$(code -I "$URL/healthz")" 200
check "http redirects to https" "$(code "http://$HOST/")" 301

echo "Security headers (exactly one copy each, on success and error responses)"
for probe in "GET /" "POST /api/prompt" "GET /nope" "GET /login"; do
  set -- $probe
  report=$(curl_ -D - -o /dev/null -X "$1" -H 'content-type: application/json' -d '{}' "$URL$2" | tr -d '\r' |
    awk -F': ' 'tolower($1) ~ /^(strict-transport-security|x-content-type-options|referrer-policy|x-frame-options|permissions-policy|content-security-policy)$/ { n[tolower($1)]++ }
      END { bad = ""; for (h in n) if (n[h] != 1) bad = bad " " h "x" n[h]; if (length(n) != 6) bad = bad " (only " length(n) " of 6 present)"; print bad }')
  if [ -z "$report" ]; then pass "$probe: six security headers, each once"; else fail "$probe: duplicate or missing headers:$report"; fi
done
hdr() { curl_ -D - -o /dev/null "$URL/" | tr -d '\r' | grep -i "^$1:" | head -1 | cut -d' ' -f2-; }
check "Referrer-Policy is no-referrer" "$(hdr referrer-policy)" no-referrer
check "X-Frame-Options is DENY" "$(hdr x-frame-options)" DENY
case "$(hdr strict-transport-security)" in *includeSubDomains*) pass "HSTS includes subdomains" ;; *) fail "HSTS missing includeSubDomains" ;; esac
case "$(hdr content-security-policy)" in *"default-src 'none'"*"frame-ancestors 'none'"*) pass "CSP is default-deny with no framing" ;; *) fail "CSP is not default-deny" ;; esac

echo "Sign-in"
location=$(curl_ -D - -o /dev/null "$URL/login" | tr -d '\r' | grep -i '^location:' | cut -d' ' -f2-)
check "/login redirects to GitHub authorize" "${location%%\?*}" https://github.com/login/oauth/authorize
case "$location" in *code_challenge_method=S256*) pass "PKCE (S256) is used" ;; *) fail "PKCE missing" ;; esac
case "$location" in *allow_signup=false*) pass "sign-up from the OAuth flow is disabled" ;; *) fail "allow_signup=false missing" ;; esac
case "$location" in *scope=*) fail "an OAuth scope is requested (none should be)" ;; *) pass "no OAuth scope requested" ;; esac
case "$location" in *"redirect_uri=https%3A%2F%2F$HOST%2Fcallback"*) pass "redirect_uri is $URL/callback" ;; *) fail "redirect_uri does not match $URL/callback" ;; esac
cookie=$(curl_ -D - -o /dev/null "$URL/login" | tr -d '\r' | grep -i '^set-cookie:' | head -1)
case "$cookie" in *"__Host-bpr-oauth="*HttpOnly*Secure*SameSite=Lax* | *"__Host-bpr-oauth="*Secure*HttpOnly*SameSite=Lax*) pass "state cookie is __Host-, HttpOnly, Secure, SameSite=Lax" ;; *) fail "state cookie flags wrong" ;; esac

echo "Access control and input handling"
check "unauthenticated prompt is 401" "$(code -X POST -H 'content-type: application/json' -d '{}' "$URL/api/prompt")" 401
check "forged session cookie is 401" "$(code -X POST -H 'cookie: __Host-bpr-acp=forged' -H 'content-type: application/json' -d '{}' "$URL/api/prompt")" 401
check "sign-out without a matching Origin is 403" "$(code -X POST "$URL/logout")" 403
check "callback without state is 400" "$(code "$URL/callback?code=x&state=y")" 400
check "path traversal is refused" "$([ "$(code "$URL/../../etc/passwd")" -ge 400 ] && echo refused)" refused
check "server source is not served" "$(code "$URL/acp/server.mjs")" 404
check "dotfiles are not served" "$(code "$URL/.env")" 404
check "unknown methods get no handler" "$(code -X PUT "$URL/api/prompt")" 404
session=$(curl_ "$URL/api/session")
check "session endpoint reports signed out" "$session" '{"authenticated":false}'

echo "Certificate"
end=$(echo | openssl s_client -connect "$HOST:443" -servername "$HOST" 2>/dev/null | openssl x509 -noout -enddate 2>/dev/null | cut -d= -f2)
if [ -z "$end" ]; then fail "could not read the TLS certificate"; else
  days=$(python3 -c 'import sys,datetime as d; print((d.datetime.strptime(sys.argv[1], "%b %d %H:%M:%S %Y %Z") - d.datetime.utcnow()).days)' "$end" 2>/dev/null || echo "")
  if [ -z "$days" ]; then warn "certificate expires $end (could not compute days)"
  elif [ "$days" -ge 14 ]; then pass "certificate valid for $days more days (expires $end)"
  else fail "certificate expires in $days days ($end): check the renewal hooks"; fi
fi

if [ -n "$ENV_FILE" ]; then
  echo "Copilot token"
  token=$(grep '^COPILOT_GITHUB_TOKEN=' "$ENV_FILE" 2>/dev/null | cut -d= -f2-)
  if [ -z "$token" ]; then fail "COPILOT_GITHUB_TOKEN not found in $ENV_FILE"; else
    resp=$(printf 'Authorization: Bearer %s\n' "$token" | curl_ -D - -o /dev/null -H @- -H 'User-Agent: bpr-acp-smoke' https://api.github.com/user | tr -d '\r')
    unset token
    status=$(printf '%s\n' "$resp" | head -1 | cut -d' ' -f2)
    check "token is accepted by GitHub" "$status" 200
    expiry=$(printf '%s\n' "$resp" | grep -i '^github-authentication-token-expiration:' | cut -d' ' -f2-)
    if [ -z "$expiry" ]; then warn "GitHub reported no expiry for this token"; else
      left=$(python3 -c 'import sys,datetime as d; print((d.datetime.strptime(sys.argv[1], "%Y-%m-%d %H:%M:%S UTC") - d.datetime.utcnow()).days)' "$expiry" 2>/dev/null || echo "")
      if [ -z "$left" ]; then warn "token expires $expiry"
      elif [ "$left" -ge 7 ]; then pass "token expires $expiry ($left days left)"
      else fail "token expires $expiry ($left days left): rotate it now (see README, Token rotation)"; fi
    fi
  fi
fi

echo
if [ "$fails" -eq 0 ]; then echo "All checks passed."; else echo "$fails check(s) failed."; fi
exit "$fails"
