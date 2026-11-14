# fadil369.github.io

Bilingual (English/Arabic) professional profile and the **BrainSAIT Provider Registry (BPR)** hub, published to GitHub Pages at <https://fadil369.github.io>. The same repository holds a prototype clinical-training assistant (ACP service) and a set of Copilot marketplace plugins.

## What is here

| Path | Contents |
| --- | --- |
| `src/` | React + TypeScript single-page app (Vite). Entry is `src/index.html`; routes live in `src/pages/` (profile, store, BPR pages under `src/pages/bpr/`). |
| `public/`, `scripts/` | Static assets and build, publish, prerender and verification scripts. |
| `acp/` | Agent Client Protocol client, CLI, web service and Electron desktop shell for the clinical assistant. See [docs/ACP_CLIENT.md](docs/ACP_CLIENT.md). |
| `plugins/`, `marketplace.json` | Five clinical Copilot plugins and their marketplace catalog. See [docs/CLINICAL_PLUGIN_MARKETPLACE.md](docs/CLINICAL_PLUGIN_MARKETPLACE.md). |
| `src/pages/clinic/`, `src/lib/clinic*.ts` | Synthetic-data clinic reception and doctor workspace at `/bpr/clinic`. See [docs/CLINIC_WORKSPACE.md](docs/CLINIC_WORKSPACE.md). |
| `deploy/acp/` | systemd unit, Apache vhost and runbook for hosting the ACP service. See [deploy/acp/README.md](deploy/acp/README.md). |
| `docs/` | Operational notes: [BPR public data](docs/BPR_PUBLIC_DATA.md), [Shopify](docs/SHOPIFY_INTEGRATION.md), [commerce automation](docs/COMMERCE_AUTOMATION.md), [testing workflows](docs/TESTING_WORKFLOWS.md). |
| Repo root HTML/route folders | **Committed build output.** GitHub Pages serves `main` directly, so rebuilt files are committed. Do not edit them by hand. |

## Develop

Requires Node 24 (matches CI).

```sh
npm ci --include=dev     # --include=dev matters if NODE_ENV=production is set in your shell
npm run dev              # Vite dev server
npm test                 # unit tests
npm run test:acp         # ACP client/server/desktop tests
npm run verify:clinical-marketplace
```

## Publish the site

Pages serves committed output, so a change to `src/` is not live until the rebuilt files are committed:

```sh
npm run build            # tsc + vite build into dist/
node scripts/publish.mjs # flatten dist/ into the repo root and routes
node scripts/prerender.mjs  # no-JS content, canonical/hreflang, JSON-LD, sitemap (needs Chromium via Playwright)
```

Skipping `prerender.mjs` strips SEO and no-JS content from every page, so always run all three. `npm run deploy` runs the full chain, including data snapshots, OG images and the CV PDF.

Build-time variables must be in the **process environment**. Vite's root is `src/`, so a repo-root `.env` is not read. For example, to link the BPR AI page to the clinical assistant:

```sh
VITE_ACP_SERVICE_URL=https://acp.brainsait.de npm run build
```

See `.env.example` for the available variables. Never commit real secrets.

## Clinical assistant (prototype)

A GitHub-sign-in web service and local CLI/desktop app run the GitHub Copilot CLI over ACP to draft **fictional or public** training, research, FHIR and NPHIES material. It is **not** a clinical tool, must not receive real patient or participant data, and needs independent security and clinical-governance review before any operational use. Details, isolation settings and limits are in [docs/ACP_CLIENT.md](docs/ACP_CLIENT.md).

## CI

`.github/workflows/site-quality.yml` runs `npm test`, the marketplace check and the ACP tests on every push and pull request; `codeql.yml` runs CodeQL.

## License

No license file is present; all rights reserved unless stated otherwise.
