# Clinical ACP client

The ACP v1 client launches `copilot --acp` over stdio. Each prompt creates a new session and temporary working directory; there is no conversation history. It loads one clinical marketplace plugin, disables built-in MCP servers, limits the agent's available tools to `skill`, and declines ACP permission requests. The client does not grant filesystem or terminal capabilities. These controls and the plugin instructions are **not** an operating-system sandbox or a privacy or clinical-safety guarantee.

Use only fictional or public material. Never submit real or potentially real patient or participant information. Responses are unvalidated drafts for qualified human review, not clinical advice. Copilot authentication, API access, usage costs, and organizational policies apply.

## CLI and desktop

Install dependencies with `npm ci`, install and authenticate the GitHub Copilot CLI separately, and ensure the Copilot API is reachable. From this checkout:

```sh
npm run acp:cli -- clinical-training "Create a fictional communication exercise."
npm run acp:desktop
```

Choose `clinical-copilot`, `clinical-research`, `healthcare-fhir`, `nphies-readiness`, or `clinical-training`. Electron runs locally; it does not use the website backend. It is not a packaged or signed desktop distribution.

## Website service

The static website cannot run an ACP agent. The separate Node service serves its own same-origin interface; BPR links to it when `VITE_ACP_SERVICE_URL` is set at website build time. An unset or invalid URL leaves the integration visibly unconfigured.

Before deploying, run the service as a dedicated, unprivileged user in an isolated environment with no access to production records, credentials, or network services other than those required for Copilot. Configure a public HTTPS reverse proxy that accepts only the configured host, forwards to `127.0.0.1:8787`, limits request rates and sizes, and does not cache or log request bodies. Restrict access at the network layer as appropriate. Independent security and clinical-governance review is required before any operational use. The service is a prototype, not a production-ready patient-data service.

Create a GitHub OAuth App with callback `https://YOUR-ACP-HOST/callback`. Configure the following as server-side secrets/settings, never in the browser or the repository:

```text
ACP_PUBLIC_URL=https://YOUR-ACP-HOST
ACP_GITHUB_CLIENT_ID=...
ACP_GITHUB_CLIENT_SECRET=...
ACP_ALLOWED_GITHUB_IDS=12345,67890
ACP_PORT=8787
```

The allowlist contains **numeric GitHub user IDs**, not usernames. Empty or malformed configuration prevents startup. Sign-in uses OAuth state and PKCE, and sessions are held only in server memory for 30 minutes. Restarting the process signs everyone out. The server stores neither the GitHub OAuth token nor prompt history, but Copilot and deployment infrastructure may have their own retention policies.

The service uses the server operator's separately authenticated Copilot CLI entitlement, **not** each visitor's OAuth token; visitors can incur costs on that entitlement. The OAuth allowlist controls who can request prompts. Configure quotas and monitoring at deployment and do not expose the service until those safeguards are in place.

```sh
npm run acp:server
```

Set `VITE_ACP_SERVICE_URL=https://YOUR-ACP-HOST` when building the website. Deploying the backend, setting up HTTPS and the OAuth App, and publishing the rebuilt static site are separate operator steps; none is performed by this repository alone.

Run `npm run test:acp` for protocol and authentication tests with a mock agent and mock GitHub. These tests do not establish that a real model follows the plugin instructions or that the system is clinically safe.
