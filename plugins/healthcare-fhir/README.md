# Healthcare FHIR

The `fhir-mapping` skill drafts a mapping from fictional fields to FHIR R4 using specifications supplied by the user. It does not connect to an FHIR server, validate production data, or establish conformance.

Do not enter real patient, provider, or confidential operational data. Skill instructions are not an enforceable privacy or safety boundary; outputs require qualified human review and organizational approval.

Use the [marketplace setup and safety guidance](../../docs/CLINICAL_PLUGIN_MARKETPLACE.md). After the marketplace is published:

```sh
copilot plugin install healthcare-fhir@brainsait-clinical
```

Local test: `copilot --plugin-dir ./plugins/healthcare-fhir`. Supply a public FHIR R4 specification and fictional fields; do not provide actual records.
