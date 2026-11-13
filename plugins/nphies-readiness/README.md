# NPHIES readiness

The `nphies-readiness` skill drafts administrative readiness plans from supplied public NPHIES documentation. It does not send transactions, check actual coverage, validate live messages or certify compliance.

Do not enter actual claims, patient information, private facility data, or credentials. Skill instructions are not an enforceable privacy or safety boundary; outputs require qualified human review and organizational approval.

Use the [marketplace setup and safety guidance](../../docs/CLINICAL_PLUGIN_MARKETPLACE.md). After the marketplace is published:

```sh
copilot plugin install nphies-readiness@brainsait-clinical
```

Local test: `copilot --plugin-dir ./plugins/nphies-readiness`. Supply current public documentation and a fictional facility scenario; never paste real claims or credentials.
