# Deploying the clinical ACP service (acp.brainsait.de)

Prototype, allow-listed, synthetic data only. Read `docs/ACP_CLIENT.md` first. Nothing here runs automatically.

## Prerequisites
- DNS: `*.brainsait.de` already resolves to the web host and a wildcard certificate exists, so no DNS or certificate step is needed.
- A GitHub OAuth App (GitHub has no API for this; register it at <https://github.com/settings/applications/new>):
  - Application name `BPR Clinical ACP (prototype)`, homepage `https://acp.brainsait.de`, **Authorization callback URL `https://acp.brainsait.de/callback`** (exact), Device Flow **off**.
  - Copy the Client ID, click *Generate a new client secret* and copy it, then run `deploy/acp/setup-oauth-env.sh <client_id>`.
    It reads the secret from the clipboard (never argv or chat), validates the credentials with GitHub, writes `~/.secrets/bpr-acp.env` (mode 600, allow-list = your GitHub user ID) and clears the clipboard.
- A fine-grained token with the **Copilot Requests** permission (`COPILOT_GITHUB_TOKEN`). Visitors spend this account's Copilot entitlement.
- Node 22+ and the Copilot CLI on the host: `sudo npm install -g @github/copilot`.

## Install
```sh
sudo git clone --depth 1 --filter=blob:none --sparse https://github.com/Fadil369/fadil369.github.io /opt/bpr-acp
cd /opt/bpr-acp && sudo git sparse-checkout set acp plugins deploy package.json package-lock.json
sudo npm ci --omit=dev --ignore-scripts

scp ~/.secrets/bpr-acp.env brainsait:/tmp/bpr-acp.env      # fill COPILOT_GITHUB_TOKEN first
ssh brainsait 'sudo install -m 600 -o root -g root /tmp/bpr-acp.env /etc/bpr-acp.env && shred -u /tmp/bpr-acp.env'
sudo cp deploy/acp/bpr-acp.service /etc/systemd/system/
sudo systemctl daemon-reload && sudo systemctl enable --now bpr-acp

sudo cp deploy/acp/acp.brainsait.de.conf /etc/apache2/sites-available/
sudo a2ensite acp.brainsait.de && sudo apachectl configtest && sudo systemctl reload apache2
```

## Verify
```sh
curl -s https://acp.brainsait.de/healthz          # {"ok":true}
curl -s https://acp.brainsait.de/api/session      # {"authenticated":false}
sudo journalctl -u bpr-acp -n 50 --no-pager       # no secrets, prompts or request bodies are logged
```
Then sign in at `https://acp.brainsait.de/` with an allow-listed account and run a synthetic prompt.
Startup refuses to run (and says why) if `ACP_AGENT_HOME`, `COPILOT_GITHUB_TOKEN` or the OAuth settings are missing.

### Smoke test

`deploy/acp/smoke.sh` is a read-only black-box check (availability, one copy of each security header on success and error responses, OAuth parameters and cookie flags, access control, certificate lifetime). It never signs in or runs a prompt. Pass the env file to also validate the Copilot token and see its expiry:

```sh
deploy/acp/smoke.sh https://acp.brainsait.de ~/.secrets/bpr-acp.env
```

The exit status is the number of failed checks. `npm run test:acp:e2e` is the browser counterpart for the web UI (sign-in, CSP, Copy, sign-out) with GitHub and the agent mocked; set `ACP_E2E_CHROME` to an installed Chrome if Playwright's browser is not installed.

## Operations

**Logs.** `journalctl -u bpr-acp`. One line per event, never prompts, drafts, tokens or stack traces: `signed in: user <id>`, `prompt ok: user <id> plugin <name> chars <n> stop <reason> <ms>ms`, `denied sign-in`, `rate limited`, `empty agent response`, `request failed`. Apache logs method, path (no query string) and status only.

**Token rotation.** `COPILOT_GITHUB_TOKEN` is a fine-grained PAT with only "Copilot Requests", and it expires (30 days by default). Check the date with the smoke test. To rotate: create the new token, replace the value in your local env file, copy it to the server and restart:

```sh
ssh brainsait 'sudo install -m 600 -o root -g root /dev/stdin /etc/bpr-acp.env' < ~/.secrets/bpr-acp.env
ssh brainsait 'sudo systemctl restart bpr-acp'
deploy/acp/smoke.sh https://acp.brainsait.de ~/.secrets/bpr-acp.env
```

Then delete the old token in GitHub. In-memory sessions are dropped by the restart; users simply sign in again.

**Certificate.** The service uses the host's wildcard certificate (`/etc/letsencrypt/live/wildcard-brainsait.de`). It renews through `certbot renew` with DNS-01 manual hooks in `/etc/letsencrypt/brainsait-hooks/` and the Apache reload hook, so renewal depends on those hooks working. The smoke test fails when fewer than 14 days remain; run `sudo certbot renew --dry-run --cert-name wildcard-brainsait.de` well before the first renewal window to confirm.

**Sandbox.** The unit runs as a throwaway user with no capabilities, a private `/proc` and user namespace, a system-call allow list, and a read-only filesystem. After changing the unit, test it with a real prompt, not just `systemctl start`: the agent is the part most likely to need something the sandbox removed.

## Update and roll back
```sh
cd /opt/bpr-acp && sudo git -c safe.directory=/opt/bpr-acp pull --ff-only && sudo npm ci --omit=dev --ignore-scripts && sudo systemctl restart bpr-acp   # re-install deploy/acp/*.service and *.conf if they changed, then daemon-reload / reload apache2
sudo systemctl disable --now bpr-acp && sudo a2dissite acp.brainsait.de && sudo systemctl reload apache2   # take it offline
```

## Show the link on the website
Only after the service is verified, build with `VITE_ACP_SERVICE_URL=https://acp.brainsait.de npm run build` (Vite's root is `src/`, so a repo-root `.env` is not read), then run `node scripts/publish.mjs` and `node scripts/prerender.mjs`, and commit the rebuilt output. Until then `/bpr/ai` shows the integration as not configured.
