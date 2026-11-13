# Clinical plugin marketplace

`marketplace.json` is the GitHub Copilot marketplace catalog. Its plugins are individually installable:

| Plugin | Scope |
| --- | --- |
| [clinical-copilot](../plugins/clinical-copilot/README.md) | Synthetic documentation, public evidence summaries, and administrative drafts |
| [clinical-research](../plugins/clinical-research/README.md) | Research planning outlines |
| [healthcare-fhir](../plugins/healthcare-fhir/README.md) | Synthetic FHIR R4 mapping plans |
| [nphies-readiness](../plugins/nphies-readiness/README.md) | Public-reference administrative readiness plans |
| [clinical-training](../plugins/clinical-training/README.md) | Fictional communication and operations training |

Add further plugins as separately reviewable directories and list each in the catalog with matching name, version and description.

The plugins do not run inside the BPR website. An optional, separately hosted ACP client can link from the site; see [ACP setup and limitations](ACP_CLIENT.md). Neither installation nor this catalog enables patient-record access or a connection to OpenEMR or NPHIES. Use only synthetic or public material, and follow organizational policy when using Copilot. Prompts are not a security or clinical validation mechanism.

For local discovery, start a new approved session with `copilot --plugin-dir ./plugins/<plugin-name>`. Marketplace installation by repository name becomes available only after the catalog is published on the default branch:

```sh
copilot plugin marketplace add Fadil369/fadil369.github.io
copilot plugin marketplace browse brainsait-clinical
copilot plugin install clinical-research@brainsait-clinical
```

Replace `clinical-research` with the plugin you wish to install. Run `npm run verify:clinical-marketplace` to check catalog and skill structure. A separate authorized Copilot session and clinical governance review are needed to evaluate model behavior.
