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

## Update and roll back
```sh
cd /opt/bpr-acp && sudo git pull --ff-only && sudo npm ci --omit=dev --ignore-scripts && sudo systemctl restart bpr-acp
sudo systemctl disable --now bpr-acp && sudo a2dissite acp.brainsait.de && sudo systemctl reload apache2   # take it offline
```

## Show the link on the website
Only after the service is verified, set `VITE_ACP_SERVICE_URL=https://acp.brainsait.de` in the local `.env`, run `npm run build`, and commit the rebuilt output. Until then `/bpr/ai` shows the integration as not configured.
