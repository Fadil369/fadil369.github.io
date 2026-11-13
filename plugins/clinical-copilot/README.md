# Clinical Copilot

A GitHub Copilot plugin for **synthetic or non-patient material only**. It provides three opt-in skills:

| Skill | Purpose |
| --- | --- |
| `clinical-draft` | Structure a fictional clinical training note without inventing facts. |
| `clinical-evidence` | Summarize public or user-supplied reference material with traceable sources. |
| `clinical-operations` | Draft a synthetic administrative workflow or checklist. |

This is not a medical device, clinical decision-support system, or EMR integration. It does not diagnose, prescribe, make patient-specific recommendations, access records, or submit claims. A qualified human must review outputs. Do not enter real patient information, including identifiers or de-identified clinical records, into prompts or tool inputs.

Skills are instructions to a model, not an enforceable privacy or clinical-safety boundary. Copilot and its configured tools may send inputs to services; use only with your organization's approval and policies. Plugin installation does not connect the BPR website or enable its synthetic clinic pilot to call a model.

## Try locally

From this checkout, start a new approved Copilot CLI session with:

```sh
copilot --plugin-dir ./plugins/clinical-copilot
```

For example: `Use clinical-draft to structure this fictional training scenario: Patient Example, a completely invented scenario, needs a follow-up appointment.`

## Install after publication

Once the marketplace and plugin are published on this repository's default branch:

```sh
copilot plugin marketplace add Fadil369/fadil369.github.io
copilot plugin install clinical-copilot@brainsait-clinical
```

Review the plugin before installation. Installing a plugin is optional and does not automatically enable it for other users.
