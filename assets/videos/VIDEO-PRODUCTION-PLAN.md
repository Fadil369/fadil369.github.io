# BrainSAIT Demo Videos — Production Plan (ready to re-submit)

**Status:** BLOCKED at submission — the 15 clip generations were cancelled/timed out in the host confirmation UI (14× USER_CANCELLED, 1× CONFIRMATION_TIMEOUT). Nothing was charged. Re-submit when the user can confirm the generation panel.

## Deliverables (per TL contract)

3 × Arabic-subtitled product demo videos, 30–60s, 16:9, 720P mp4, <10MB each, EN+AR burned subtitles:
1. `oid-fhir-integration-platform.mp4` — FHIR Integration Platform (10,499 SAR/yr, developers/health-tech)
2. `health-ai-identity-infrastructure-suite.mp4` — Health AI Identity Suite (14,999 SAR/yr, health groups/vendors)
3. `oid-white-label-enterprise.mp4` — White-Label Enterprise (22,499 SAR/yr, vendors/resellers/HIS partners)

Source facts from `research/phase2/final-report.md` §5.9: "Short (30–60 second) Arabic-subtitled product demo videos for the top 3 enterprise SKUs… Arabic video content for B2B SaaS is underproduced in Saudi Arabia — early investment creates a moat."

## Pipeline (verified working)

- **Generation:** `video_generate_submit` (provider=happyhorse, mode=t2v, 16:9, 8s, 720P, watermark=false) × 15 clips (5 scenes × 3 products). ⚠️ Each submission needs user confirmation in the host panel.
- **Assembly:** ffmpeg concat + PIL subtitle overlays (toolchain INSTALLED: pillow, arabic-reshaper, python-bidi; Arabic font `/System/Library/Fonts/Supplemental/Al Nile.ttc`; EN font `/System/Library/Fonts/Supplemental/Arial Unicode.ttf`).
- **⚠️ ffmpeg (Homebrew 8.0.1) has NO libass/drawtext** → burn subtitles as transparent PNG strips via the `overlay` filter (PIL renders proper Arabic shaping), fade in/out per scene.
- **Encode:** h264, crf 26, 1280×720, yuv420p, `-movflags +faststart`, `-an` (silent, web-friendly).
- **Posters:** extract frame at t=1s from each final video (poster for `<video poster=...>`).
- **Disk:** only 12 GiB free on host — delete `public/assets/videos/.clips/` after each assembly.

## Scene storyboard + subtitles (AR line = primary, EN = secondary)

### Video 1 — FHIR Integration Platform
| S | Scene | AR subtitle | EN subtitle |
|---|---|---|---|
| 1 | Title: "FHIR INTEGRATION PLATFORM" + chips FHIR R4/NPHIES/API | منصة تكامل FHIR — اربط، وحّد، وتحقق | The FHIR Integration Platform — connect, standardize, verify |
| 2 | Fragmented systems, broken data lines, amber pain glow | أنظمة المستشفيات متفرقة والتحقق اليدوي يبطئ كل شيء | Fragmented systems and manual verification slow everything down |
| 3 | Integration hub, data streams → unified, Patient/Practitioner/Organization cards | منصة واحدة تربط بياناتك بمعيار FHIR R4 وتوحد الهوية الصحية | One platform connects your data on FHIR R4 and unifies health identity |
| 4 | API console, verify endpoint, audit logs | تحقق فوري بواجهة برمجية متوافقة مع NPHIES وسجلات تدقيق كاملة | Instant verification via a NPHIES-ready API with full audit trails |
| 5 | CTA "Built for Saudi Healthcare" + Book a Demo | جاهز للسوق السعودي — احجز عرضاً توضيحياً اليوم | Built for Saudi healthcare — book a demo today |

### Video 2 — Healthcare AI Identity Infrastructure Suite
| S | Scene | AR subtitle | EN subtitle |
|---|---|---|---|
| 1 | Title: "IDENTITY INFRASTRUCTURE SUITE" + ISSUE/VERIFY/MANAGE | حزمة البنية التحتية للهوية — أصدر، تحقق، وأدر | The Identity Infrastructure Suite — issue, verify, manage |
| 2 | Paper credentials pile, re-credentialing clock | أكثر من 800 ألف ممارس صحي يحتاجون هوية رقمية موثوقة | 800,000+ practitioners need trusted digital identity |
| 3 | Issuance hub, AI assistant, namespace tree | أصدر الشارات الرقمية بمعيار FHIR مع مساعد ذكاء اصطناعي لسياسات الاعتماد | Issue FHIR-standard badges with an AI assistant for credentialing policy |
| 4 | QR scan verification, green check, PDPL chip | تحقق متوافق مع PDPL وسجلات جاهزة للتدقيق | PDPL-compliant verification with audit-ready records |
| 5 | CTA "Your Identity Layer" + Book a Demo | بنيتك التحتية للهوية — احجز عرضاً توضيحياً | Your identity layer — book a demo |

### Video 3 — OID White-Label Enterprise License
| S | Scene | AR subtitle | EN subtitle |
|---|---|---|---|
| 1 | Title: "WHITE-LABEL ENTERPRISE" + YOUR BRAND/MULTI-TENANT/SCALE | رخصة العلامة البيضاء — علامتك التجارية، بنيتنا التحتية | The White-Label License — your brand, our infrastructure |
| 2 | Complexity wall, cursor struggling | أطلق منصة شارات رقمية لعملائك دون بناء بنية تحتية من الصفر | Launch a digital badge platform without building infrastructure from scratch |
| 3 | White-label studio, re-skin badge, sub-tenant tree | خصّص الشارات بعلامتك وأدر المستأجرين الفرعيين من لوحة واحدة | Customize badges with your brand and manage sub-tenants from one console |
| 4 | Multi-tenant console, revenue chart | ربحية لكل ترخيص مع توافق كامل مع NPHIES | Per-license margin with full NPHIES alignment |
| 5 | CTA "Launch Your Badge Platform" + Become a Partner | كن شريكاً — احجز عرضاً توضيحياً | Become a partner — book a demo |

## Shared style block (paste verbatim in every clip prompt)

```
Premium enterprise software motion render, deep navy-indigo gradient background (#0A0E1F to #121A3A),
cyan-teal accent glow (#22D3EE), glassmorphism panels with subtle 1px light borders and soft inner glow,
generous negative space, faint geometric Islamic pattern lines, soft radial ambient light, subtle floating
light particles, Apple/Stripe/Linear aesthetic, smooth professional animation, no people, no stock footage,
no external brand logos, no watermarks.
```

## Clip prompt templates (per product, 5 scenes)

`[Scene description from storyboard] + [SHARED STYLE BLOCK]` — scene descriptions are already drafted (see submission history); all titles in-frame are EN-only (Arabic lives in burned subtitles to avoid AI text garbling).
