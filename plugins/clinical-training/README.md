# Clinical training

The `training-exercise` skill designs fictional communication and administrative training exercises. It is not a clinical simulator or a substitute for supervised education, and does not provide patient-specific care.

Do not enter real patient or trainee information. Skill instructions are not an enforceable privacy or clinical-safety boundary; outputs require qualified human review and organizational approval.

Use the [marketplace setup and safety guidance](../../docs/CLINICAL_PLUGIN_MARKETPLACE.md). After the marketplace is published:

```sh
copilot plugin install clinical-training@brainsait-clinical
```

Local test: `copilot --plugin-dir ./plugins/clinical-training`. Example: “Use training-exercise to design a fictional handoff communication workshop.”
