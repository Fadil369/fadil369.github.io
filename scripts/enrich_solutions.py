#!/usr/bin/env python3
"""Enrich BrainSAIT solution cards with specific bilingual descriptions.

Fills in the 105 generic/placeholder descriptions and adds Arabic taglines +
descriptions for all 115 solutions, so each card and its opened detail page read
like a real product. Keyed by slug.
"""
import json, sys

# slug -> (en_tagline, en_description, ar_tagline, ar_description)
D = {
    # ── Agents (Business) ──
    "digital-healthcare-masterclass": (
        "Masterclass covering digital health strategy, workflow automation and AI in clinical settings.",
        "A complete masterclass on digital healthcare: strategy, clinical workflow automation, patient-facing AI and implementation roadmap. Includes frameworks, case studies and templates you can apply immediately.",
        "ماستركلاس شامل في الصحة الرقمية: الاستراتيجية، وأتمتة مسارات العمل، والذكاء الاصطناعي في البيئات السريرية.",
        "ماستركلاس متكامل في الصحة الرقمية يغطي الاستراتيجية وأتمتة سير العمل السريري والذكاء الاصطناعي الموجه للمرضى وخارطة التنفيذ، مع أطر عمل ودراسات حالة وقوالب جاهزة للتطبيق.",
    ),
    "nphies-assistant": (
        "Navigate the Saudi insurance claims platform (NPHIES) and validate submissions with confidence.",
        "An assistant for the Saudi claims platform: step-by-step navigation, submission validation and denial-prevention guidance for providers and payers.",
        "تنقّل في منصة المطالبات السعودية NPHIES وتحقق من الإرساليات بثقة.",
        "مساعد لمنصة المطالبات السعودية: إرشاد خطوة بخطوة والتحقق من الإرساليات وإرشادات منع الرفض لمقدمي الخدمات وشركات التأمين.",
    ),
    "hook-architect": (
        "Generate 15–20 high-impact hooks for any marketing content in seconds.",
        "An AI hook machine that generates 15–20 proven high-impact hooks for any campaign, post or ad — engineered for CTR, retention and Arabic-English audiences.",
        "ولّد 15–20 عنوانًا جذابًا عالي التأثير لأي محتوى تسويقي في ثوانٍ.",
        "محرك عناوين ذكي يولّد 15–20 عنوانًا مجربًا عالي التأثير لأي حملة أو منشور أو إعلان، مصمم لرفع نسبة النقر والاحتفاظ، يدعم الجمهور العربي والإنجليزي.",
    ),
    "investor-pitch-agent": (
        "Turn your startup story into an investor-ready pitch deck with structured feedback.",
        "An AI agent that structures your pitch, sharpens your value proposition, and gives investor-grade feedback — deck by deck, section by section.",
        "حوّل قصة شركتك الناشئة إلى عرض تقديمي جاهز للمستثمرين مع تغذية راجعة منظمة.",
        "وكيل ذكاء اصطناعي ينظّم عرضك التقديمي، ويصقل عرض القيمة، ويقدّم ملاحظات بمستوى المستثمرين — قسمًا بعد قسم.",
    ),
    "clinical-documentation-agent": (
        "AI-powered clinical note generation with compliance standards built in.",
        "Generates structured, compliant clinical documentation from dictation or notes — built to align with documentation and privacy standards.",
        "توليد ملاحظات سريرية مدعومة بالذكاء الاصطناعي مع معايير الامتثال مدمجة.",
        "يولّد وثائق سريرية منظمة ومتوافقة من الإملاء أو الملاحظات، مصممة للتوافق مع معايير التوثيق والخصوصية.",
    ),
    "landing-page-engineer": (
        "Design and copy a conversion-focused landing page in minutes.",
        "An AI landing page engineer: headline, structure, social proof and CTA blocks wired for conversion — not just pretty design.",
        "صمّم صفحة هبوط تركز على التحويل خلال دقائق، من التصميم إلى النص.",
        "مهندس صفحات هبوط بالذكاء الاصطناعي: عناوين وبنية وإثبات اجتماعي وأزرار دعوة مصممة لزيادة التحويل، لا مجرد تصميم جميل.",
    ),
    "ai-system-architect": (
        "Multi-agent AI system architecture for enterprises, ready to implement.",
        "Architecture blueprints for production multi-agent AI systems: roles, orchestration, security boundaries, observability and cost controls.",
        "معمارية أنظمة ذكاء اصطناعي متعددة الوكلاء للمؤسسات، جاهزة للتنفيذ.",
        "مخططات معمارية جاهزة للإنتاج لأنظمة ذكاء اصطناعي متعددة الوكلاء: الأدوار والتنسيق وحدود الأمان والمراقبة والتحكم في التكاليف.",
    ),
    "vision-2030-aligner": (
        "Align your products and proposals with Saudi Vision 2030 pillars.",
        "Maps any product, proposal or initiative to Vision 2030 priorities, with the evidence language and framing Saudi stakeholders expect.",
        "وائم منتجاتك ومقترحاتك مع ركائز رؤية السعودية 2030.",
        "يربط أي منتج أو مقترح أو مبادرة بأولويات رؤية 2030، بلغة الإثبات والتأطير التي يتوقعها أصحاب القرار في السعودية.",
    ),
    "workflow-architect": (
        "Design and document business workflows that teams actually follow.",
        "An AI workflow architect that turns messy processes into clear, documented, automatable workflows with handoff points and owners.",
        "صمّم ووثّق مسارات العمل التي تتبعها فرقك فعليًا.",
        "مهندس مسارات عمل بالذكاء الاصطناعي يحوّل العمليات المعقدة إلى مسارات واضحة وموثقة وقابلة للأتمتة مع نقاط التسليم والمسؤوليات.",
    ),
    "brand-voice-dna": (
        "Extract and document a consistent brand voice from your existing content.",
        "Analyzes your copy to define a Brand Voice DNA — tone, vocabulary, do/don'ts and a mini style guide your team and AI can reuse.",
        "استخرج ووثّق هوية صوتية متسقة لعلامتك التجارية من محتواك الحالي.",
        "يحلّل نصوصك ليحدد الحمض النووي لصوت العلامة: النبرة والمفردات والأفعال والأمتناع ودليل أسلوب مصغر يعيد استخدامه فريقك والذكاء الاصطناعي.",
    ),
    "enterprise-auditor": (
        "Run a structured readiness audit of your enterprise AI setup.",
        "An enterprise audit agent covering governance, data, security, ops and vendor risk — producing a scored readiness report with fixes.",
        "نفّذ تدقيق جاهزية منظمًا لإعداد الذكاء الاصطناعي في مؤسستك.",
        "وكيل تدقيق مؤسسي يغطي الحوكمة والبيانات والأمان والعمليات ومخاطر البائعين، وينتج تقرير جاهزية مُقيّم مع إصلاحات.",
    ),
    "strategic-ai-blueprint": (
        "A strategic playbook for adopting AI across your organization.",
        "A blueprint for AI strategy: where it pays off, how to sequence pilots, governance guardrails and the operating model that sustains it.",
        "كتاب استراتيجي لتبني الذكاء الاصطناعي عبر مؤسستك.",
        "مخطط استراتيجي للذكاء الاصطناعي: أين يحقق العائد، وكيف تُسلسَل التجارب، وضوابط الحوكمة، ونموذج التشغيل المستدام.",
    ),
    "brainsait-abeer-group-saudi-healthcare-transformation-blueprint": (
        "The BrainSAIT × Abeer Group blueprint for Saudi healthcare transformation.",
        "A partnership blueprint applying the BrainSAIT stack to Abeer Group's Saudi healthcare transformation: NPHIES, FHIR, care coordination and digital patient journeys.",
        "مخطط تحول الرعاية الصحية السعودية من BrainSAIT بالشراكة مع مجموعة عبير.",
        "مخطط شراكة يطبّق منصة BrainSAIT على تحول الرعاية الصحية لدى مجموعة عبير: NPHIES وFHIR وتنسيق الرعاية ومسارات المرضى الرقمية.",
    ),
    "solo-ai-business-blueprint": (
        "Physician-led enterprise from scratch — the flagship solo AI business blueprint.",
        "The complete flagship blueprint for building a physician-led AI business from zero: positioning, offer, delivery, pricing and scaling. Includes the shorter Mini-Book and PDF Drive Edition for a faster read.",
        "النسخة الكاملة لبناء مشروع ذكاء اصطناعي بقيادة طبيب من الصفر.",
        "المخطط الرائد الكامل لبناء مشروع ذكاء اصطناعي بقيادة طبيب من الصفر: التموضع والعرض والتسليم والتسعير والتوسع، مع نسخ مختصرة إضافية.",
    ),
    "linkedin-authority-builder": (
        "Grow professional authority on LinkedIn with a system, not luck.",
        "A LinkedIn authority system: positioning, content calendar, engagement loops and profile optimization that compound over time.",
        "بني حضورًا مهنيًا على لينكدإن بنظام وليس بالصدفة.",
        "نظام لبناء السلطة المهنية على لينكدإن: التموضع وتقويم المحتوى وحلقات التفاعل وتحسين الملف الشخصي بتراكم مستمر.",
    ),
    "email-sequence-architect": (
        "Design email sequences that convert, from welcome to reactivation.",
        "An AI email architect that maps your funnel into sequences: hooks, value, objection handling, CTA rhythm and reactivation flows.",
        "صمّم تسلسلات بريدية تحوّل: من الترحيب حتى إعادة التنشيط.",
        "مهندس بريد إلكتروني بالذكاء الاصطناعي يحوّل مسارك إلى تسلسلات: خطافات وقيمة ومعالجة الاعتراضات وإيقاع الدعوة وتدفقات إعادة التنشيط.",
    ),
    "content-multiplier": (
        "Turn one piece of content into a full multi-format campaign.",
        "A content engine that repurposes a single asset into posts, threads, emails, scripts and summaries — consistent and on-brand.",
        "حوّل قطعة محتوى واحدة إلى حملة كاملة متعددة الصيغ.",
        "محرك محتوى يعيد استخدام أصل واحد إلى منشورات وسلاسل ورسائل وسيناريوهات وملخصات متسقة مع هوية العلامة.",
    ),
    "social-listening-agent": (
        "Monitor mentions, trends and sentiment about your brand in real time.",
        "A social listening agent that tracks brand mentions, competitors and emerging topics, and summarizes actionable insights.",
        "راقب الإشارات والاتجاهات والمشاعر حول علامتك في الوقت الفعلي.",
        "وكيل استماع اجتماعي يتتبع إشارات العلامة والمنافسين والمواضيع الناشئة ويلخّص رؤى قابلة للتنفيذ.",
    ),
    "seo-aeo-optimizer": (
        "Optimize for both search engines and AI answer engines.",
        "An SEO + AEO optimizer: keywords, structured data, entity framing and answer-ready content for Google and AI assistants.",
        "حسّن ظهورك في محركات البحث ومحركات الإجابات الذكية معًا.",
        "محسّن SEO وAEO: كلمات مفتاحية وبيانات منظمة وتأطير كيانات ومحتوى جاهز للإجابات لمحركات البحث والمساعدين الذكيين.",
    ),
    "icd-10-coding-agent": (
        "Get accurate ICD-10 code suggestions from clinical descriptions.",
        "An ICD-10 coding agent that maps clinical descriptions to precise codes with confidence and documentation guidance.",
        "احصل على اقتراحات دقيقة لرموز ICD-10 من الوصف السريري.",
        "وكيل ترميز ICD-10 يربط الأوصاف السريرية بالرموز الدقيقة مع مستوى ثقة وإرشادات التوثيق.",
    ),
    "fhir-interoperability-agent": (
        "Navigate FHIR resources, profiles and integration decisions.",
        "A FHIR agent for developers and architects: resource selection, profile mapping, extension design and integration pitfalls.",
        "تنقّل في موارد FHIR والملفات الشخصية وقرارات التكامل بسهولة.",
        "وكيل FHIR للمطورين والمعماريين: اختيار الموارد وربط الملفات الشخصية وتصميم الإضافات ومزالق التكامل.",
    ),
    "prior-authorization-agent": (
        "Prepare and validate prior authorization submissions with confidence.",
        "An agent that structures PA submissions, checks coverage rules and documentation requirements, and reduces denials.",
        "أعدّ وثائق الموافقات المسبقة وتحقق منها بثقة.",
        "وكيل ينظّم ملفات الموافقة المسبقة ويتحقق من قواعد التغطية ومتطلبات التوثيق ويقلل نسب الرفض.",
    ),
    "patient-engagement-agent": (
        "Design patient communication journeys that improve outcomes and loyalty.",
        "A patient engagement agent covering appointment flow, education, reminders and follow-ups — compliant and empathetic.",
        "صمّم رحلات تواصل مع المرضى تحسّن النتائج والولاء.",
        "وكيل مشاركة المرضى يغطي تدفق المواعيد والتثقيف والتذكيرات والمتابعة بأسلوب متعاطف ومتوافق.",
    ),
    "clinical-trial-matcher": (
        "Match patients to suitable clinical trials from eligibility criteria.",
        "A clinical trial matcher that screens eligibility criteria against patient profiles and surfaces realistic matches.",
        "طابق المرضى مع التجارب السريرية المناسبة وفق معايير الأهلية.",
        "مطابق تجارب سريرية يفحص معايير الأهلية مقابل ملفات المرضى ويعرض المطابقات الواقعية.",
    ),
    "medical-arabic-translator": (
        "Accurate Arabic medical translation tuned for clarity and safety.",
        "A translator specialized in medical terminology — Arabic and English — with glossary consistency and safety-first phrasing.",
        "ترجمة طبية عربية دقيقة تضع الوضوح والسلامة في الأولوية.",
        "مترجم متخصص في المصطلحات الطبية بين العربية والإنجليزية مع اتساق المصطلحات وصياغة تراعي السلامة.",
    ),
    "ceo-speech-writer": (
        "Write leadership speeches with gravitas, structure and impact.",
        "A speech agent that drafts keynote, town-hall and crisis messages — calibrated to audience, tone and message discipline.",
        "اكتب خطابات قيادية بروح وبنية وتأثير.",
        "وكيل خطابات يصيغ كلمات رئيسية ورسائل اجتماعات وأزمات بمستوى عالٍ من النبرة والانضباط في الرسالة.",
    ),
    "partnership-proposal-generator": (
        "Generate structured, persuasive partnership proposals fast.",
        "An agent that turns goals into a partnership proposal: value exchange, terms, success metrics and next steps.",
        "ولّد مقترحات شراكة منظمة ومقنعة بسرعة.",
        "وكيل يحوّل الأهداف إلى مقترح شراكة: تبادل القيمة والشروط ومقاييس النجاح والخطوات التالية.",
    ),
    "board-report-generator": (
        "Produce clear board-ready reports from scattered data.",
        "A board report agent that structures metrics, risks and decisions into a concise, readable executive report.",
        "أعدّ تقارير جاهزة لمجلس الإدارة من البيانات المتناثرة.",
        "وكيل تقارير مجالس ينظّم المقاييس والمخاطر والقرارات في تقرير تنفيذي موجز وقابل للقراءة.",
    ),
    "competitive-intelligence-agent": (
        "Track competitors and surface strategic signals automatically.",
        "A competitive intel agent that monitors rivals, pricing, launches and sentiment, and distills actionable strategy.",
        "تتبع المنافسين وارصد الإشارات الاستراتيجية تلقائيًا.",
        "وكيل ذكاء تنافسي يراقب المنافسين والتسعير والإطلاقات والمشاعر ويستخلص استراتيجية قابلة للتنفيذ.",
    ),
    "decision-scorecard-agent": (
        "Score decisions against your criteria before you commit.",
        "A decision agent that builds weighted scorecards, scores options and surfaces trade-offs for confident choices.",
        "قيّم القرارات وفق معاييرك قبل أن تلتزم.",
        "وكيل قرارات يبني بطاقات تقييم مرجّحة ويقيّم الخيارات ويكشف المفاضلات لاتخاذ قرارات واثقة.",
    ),
    "market-sizing-agent": (
        "Estimate market size with defensible, bottom-up logic.",
        "A market sizing agent that builds TAM/SAM/SOM estimates with assumptions, sources and sensitivity ranges.",
        "قدّر حجم السوق بمنطق من الأسفل إلى الأعلى قابل للدفاع.",
        "وكيل تقدير حجم السوق يبني تقديرات TAM/SAM/SOM مع الافتراضات والمصادر ونطاقات الحساسية.",
    ),
    "prd-architect": (
        "Turn a rough idea into a structured product requirements document.",
        "A PRD agent that extracts goals, users, scope, success metrics and acceptance criteria into a clean spec.",
        "حوّل الفكرة الخام إلى وثيقة متطلبات منتج منظمة.",
        "وكيل متطلبات يستخرج الأهداف والمستخدمين والنطاق ومقاييس النجاح ومعايير القبول في مواصفة نظيفة.",
    ),
    "api-designer": (
        "Design clean, versioned APIs with contracts teams can build to.",
        "An API design agent that drafts endpoints, models, error handling and versioning strategies with examples.",
        "صمّم واجهات برمجية نظيفة وذات إصدارات بعقود واضحة للفرق.",
        "وكيل تصميم واجهات برمجية يصيغ النقاط النهائية والنماذج ومعالجة الأخطاء واستراتيجيات الإصدار مع أمثلة.",
    ),
    "code-review-agent": (
        "Get structured code review feedback on correctness, security and style.",
        "A code review agent that flags bugs, security issues, performance traps and style drift with actionable comments.",
        "احصل على مراجعة كود منظمة تغطي الصحة والأمان والأسلوب.",
        "وكيل مراجعة كود يرصد الأخطاء والثغرات ومشاكل الأداء والانحراف الأسلوبي مع تعليقات قابلة للتنفيذ.",
    ),
    "database-architect": (
        "Design normalized schemas and data models that scale.",
        "A database agent that produces schemas, index strategy, relationships and migration notes for your domain.",
        "صمّم مخططات بيانات طبيعية تتوسع مع نموك.",
        "وكيل قواعد بيانات ينتج المخططات واستراتيجية الفهارس والعلاقات وملاحظات الترحيل لمجال عملك.",
    ),
    "devops-pipeline-agent": (
        "Design CI/CD pipelines and deployment strategies that ship safely.",
        "A DevOps agent covering pipeline stages, environments, rollback and observability for reliable delivery.",
        "صمّم خطوط CI/CD واستراتيجيات نشر تُطلق بثقة وأمان.",
        "وكيل DevOps يغطي مراحل خطوط النشر والبيئات والتراجع والمراقبة لتسليم موثوق.",
    ),
    "security-auditor": (
        "Scan your architecture for vulnerabilities and hardening gaps.",
        "A security agent that reviews design and configs, lists threats and provides prioritized hardening actions.",
        "افحص بنيتك بحثًا عن الثغرات وثغرات التحصين.",
        "وكيل أمني يراجع التصميم والإعدادات ويسرد التهديدات ويقدّم إجراءات تحصين مرتبة بالأولوية.",
    ),
    "book-writer-agent": (
        "Structure and draft a book from outline to chapters.",
        "A writing agent that builds outlines, chapters and consistent voice for books, guides and long-form content.",
        "أعد هيكلة ومسودة كتاب من المخطط الأولي إلى الفصول.",
        "وكيل كتابة يبني الخطوط والفصول وصوتًا متسقًا للكتب والأدلة والمحتوى الطويل.",
    ),
    "course-builder": (
        "Design a complete course: modules, lessons, assessments and delivery.",
        "A course builder agent that structures learning outcomes, modules, activities and assessment into a teachable plan.",
        "صمّم دورة كاملة: وحدات ودروس وتقييمات وتسليم.",
        "وكيل بناء دورات ينظّم مخرجات التعلم والوحدات والأنشطة والتقييم في خطة قابلة للتدريس.",
    ),
    "podcast-producer": (
        "Plan episodes, scripts and show structure for a professional podcast.",
        "A podcast agent covering episode ideas, outlines, scripts, segments and guest prep.",
        "خطط حلقات ونصوص وبنية بودكاست احترافية.",
        "وكيل بودكاست يغطي أفكار الحلقات والخطوط والنصوص والأجزاء وتجهيز الضيوف.",
    ),
    "video-script-architect": (
        "Write scroll-stopping video scripts with hooks and structure.",
        "A video script agent that drafts hooks, beats, captions and CTAs for short and long-form video.",
        "اكتب سيناريوهات فيديو توقف التمرير مع خطافات وبنية.",
        "وكيل سيناريوهات فيديو يصيغ الخطافات واللقطات والتعليقات والدعوات للفيديو القصير والطويل.",
    ),
    "infographic-designer": (
        "Turn dense information into clear visual storyboards.",
        "An infographic agent that structures data, hierarchy and narrative into a design-ready brief.",
        "حوّل المعلومات الكثيفة إلى لوحات مرئية واضحة.",
        "وكيل إنفوجرافيك ينظّم البيانات والتسلسل والسرد في ملخص جاهز للتصميم.",
    ),
    "newsletter-architect": (
        "Build newsletters people open, read and act on.",
        "A newsletter agent covering positioning, subject lines, structure and cadence for audience growth.",
        "ابنِ نشرات إخبارية يفتحها الناس ويقرؤونها ويتفاعلون معها.",
        "وكيل نشرات إخبارية يغطي التموضع وسطور الموضوع والبنية والإيقاع لنمو الجمهور.",
    ),
    "arabic-content-stylist": (
        "Polish Arabic content for clarity, tone and impact.",
        "An Arabic stylist that refines wording, grammar and rhythm while preserving meaning and voice.",
        "تهذيب المحتوى العربي للوضوح والنبرة والتأثير.",
        "محرر أسلوب عربي يحسّن الصياغة والقواعد والإيقاع مع الحفاظ على المعنى والصوت.",
    ),
    "presentation-designer": (
        "Structure persuasive presentations slide by slide.",
        "A presentation agent that builds narrative arcs, slide structures and speaker notes for impact.",
        "نظّم عروضًا تقديمية مقنعة شريحة بشريحة.",
        "وكيل عروض تقديمية يبني أقواس السرد وبنية الشرائح وملاحظات المتحدث للتأثير.",
    ),
    "invoice-processor": (
        "Extract and normalize invoice data automatically.",
        "An invoice agent that reads invoices, extracts fields, flags discrepancies and exports to your systems.",
        "استخرج وطبيع بيانات الفواتير تلقائيًا.",
        "وكيل فواتير يقرأ الفواتير ويستخرج الحقول ويرصد التباينات ويصدّرها إلى أنظمتك.",
    ),
    "crm-optimizer": (
        "Clean your CRM and design workflows that keep it accurate.",
        "A CRM agent that fixes data hygiene, dedupes records and designs pipeline stages and automations.",
        "نظّف نظام إدارة العملاء وصمّم مسارات تحافظ على دقته.",
        "وكيل CRM يصلح نظافة البيانات ويزيل التكرار ويصمم مراحل خط الأنابيب والأتمتة.",
    ),
    "report-generator": (
        "Turn raw data into clear, decision-ready reports.",
        "A report agent that summarizes data, surfaces insights and formats findings for stakeholders.",
        "حوّل البيانات الخام إلى تقارير واضحة جاهزة للقرار.",
        "وكيل تقارير يلخص البيانات ويبرز الرؤى ويصيغ النتائج لأصحاب القرار.",
    ),
    "compliance-checker": (
        "Check documents and workflows against regulatory requirements.",
        "A compliance agent that flags gaps against standards like PDPL, HIPAA or internal policy, with remediation notes.",
        "افحص المستندات وسير العمل مقابل المتطلبات التنظيمية.",
        "وكيل امتثال يرصد الفجوات مقابل معايير مثل PDPL أو HIPAA أو السياسة الداخلية مع ملاحظات المعالجة.",
    ),
    "meeting-intelligence": (
        "Turn meeting recordings into notes, decisions and actions.",
        "A meeting intelligence agent that produces summaries, decisions, owners and follow-up tasks from transcripts.",
        "حوّل تسجيلات الاجتماعات إلى ملاحظات وقرارات وإجراءات.",
        "وكيل ذكاء اجتماعات ينتج الملخصات والقرارات والمسؤولين والمهام من النصوص.",
    ),
    "document-generator": (
        "Generate polished business documents from a brief.",
        "A document agent that drafts contracts, memos, SOPs and one-pagers from a short brief.",
        "أنشئ مستندات أعمال احترافية من ملخص موجز.",
        "وكيل مستندات يصيغ العقود والمذكرات وإجراءات التشغيل والملخصات من موجز قصير.",
    ),
    "notification-engine": (
        "Design omnichannel notification flows that engage without annoying.",
        "A notification agent that designs channels, timing, content and throttling for messages that users value.",
        "صمّم تدفقات إشعارات متعددة القنوات تتفاعل دون إزعاج.",
        "وكيل إشعارات يصمم القنوات والتوقيت والمحتوى والحدود لرسائل يقدرها المستخدم.",
    ),
    "brainsait-ai-masterclass": (
        "The BrainSAIT AI Masterclass — master AI from strategy to deployment.",
        "A complete masterclass: AI fundamentals, agentic systems, automation and how to deploy them in your business.",
        "ماستركلاس BrainSAIT في الذكاء الاصطناعي — أتقن الذكاء الاصطناعي من الاستراتيجية إلى النشر.",
        "ماستركلاس شامل: أساسيات الذكاء الاصطناعي والأنظمة الوكلائية والأتمتة وكيفية نشرها في عملك.",
    ),
    "healthcare-ai-2025": (
        "The full Healthcare AI 2025 guide — the standalone PDF.",
        "The complete standalone edition covering AI in Saudi and global healthcare: clinical, operational and patient-facing applications, with a condensed Mini-Book also available.",
        "دليل Healthcare AI 2025 الكامل — نسخة PDF المستقلة.",
        "النسخة الكاملة المستقلة التي تغطي الذكاء الاصطناعي في الرعاية الصحية السعودية والعالمية: التطبيقات السريرية والتشغيلية والموجهة للمرضى، مع نسخة Mini-Book مختصرة.",
    ),
    "momfood-cloud-kitchen-incubator": (
        "The MomFood cloud-kitchen incubator playbook for F&B operators.",
        "A practical playbook for building and scaling cloud kitchens: menus, operations, delivery economics and growth.",
        "دليل حاضنة المطابخ السحابية MomFood لمشغلي الأغذية.",
        "دليل عملي لبناء وتوسيع المطابخ السحابية: القوائم والعمليات واقتصاديات التوصيل والنمو.",
    ),

    # ── Creative / Novel / Literature ──
    "1984-survival-notebook": (
        "A BrainSAIT novel — a survival notebook for the digital age.",
        "A literary novel about surviving — and thriving — in a digitally controlled world, written for modern readers.",
        "رواية BrainSAIT — دفتر بقاء في العصر الرقمي.",
        "رواية أدبية عن البقاء والازدهار في عالم خاضع للسيطرة الرقمية، كتبت لقراء اليوم.",
    ),
    "absolute-zero-mindset": (
        "A mini-book on building an unshakable founder mindset.",
        "A focused mini-book on mental discipline, decision-making and momentum for founders under pressure.",
        "كتاب مصغر عن بناء عقلية مؤسس لا تتزعزع.",
        "كتاب مصغر مركّز حول الانضباط الذهني واتخاذ القرار والزخم للمؤسسين تحت الضغط.",
    ),
    "anatomy-of-a-torn-soul": (
        "A literary work exploring identity, conflict and healing.",
        "A reflective literary title on identity and healing — written with precision for readers who value depth.",
        "عمل أدبي يستكشف الهوية والصراع والشفاء.",
        "عنوان أدبي تأملي حول الهوية والشفاء، كُتب بدقة لعشاق العمق.",
    ),
    "api-revision-notebook": (
        "A software notebook for mastering API design revision.",
        "A practical notebook to revise API fundamentals: REST, contracts, versioning, security and real-world patterns.",
        "دفتر برمجيات لمراجعة تصميم الواجهات البرمجية.",
        "دفتر عملي لمراجعة أساسيات الواجهات البرمجية: REST والعقود والإصدارات والأمان والأنماط الواقعية.",
    ),
    "apple-ai-anatomy": (
        "A healthcare-focused analysis of Apple's AI architecture.",
        "A title dissecting Apple's approach to health and on-device AI, and what it means for care delivery.",
        "تحليل صحي لمعمارية الذكاء الاصطناعي لدى Apple.",
        "عنوان يحلل نهج Apple في الصحة والذكاء الاصطناعي على الجهاز وماذا يعني لتقديم الرعاية.",
    ),
    "autonomous-ai-blogging-engine": (
        "A blueprint for a fully autonomous AI blogging engine.",
        "A system blueprint for automated content research, drafting, publishing and distribution at scale.",
        "مخطط لمحرك تدوين ذكاء اصطناعي مستقل بالكامل.",
        "مخطط نظام لأتمتة البحث والصياغة والنشر والتوزيع للمحتوى على نطاق واسع.",
    ),
    "bite-model-scientific-assessment-of-authoritarian-control": (
        "A scientific assessment using the BITE model of control.",
        "A rigorous analysis applying the BITE model to authoritarian control dynamics, with implications for psychology and governance.",
        "تقييم علمي لنموذج BITE للسيطرة الاستبدادية.",
        "تحليل دقيق يطبق نموذج BITE على ديناميكيات السيطرة الاستبدادية مع دلالات نفسية وحوكمية.",
    ),
    "brainsait-health-os": (
        "The BrainSAIT Health OS — a template for integrated care systems.",
        "A template operating system for health organizations: care pathways, patient data and operations unified on one layer.",
        "نظام BrainSAIT الصحي — قالب لأنظمة الرعاية المتكاملة.",
        "نظام تشغيل قالب للمؤسسات الصحية: مسارات الرعاية وبيانات المرضى والعمليات موحدة على طبقة واحدة.",
    ),
    "clinical-code": (
        "Clinical Code — software thinking applied to medicine.",
        "A software title applying engineering thinking to clinical work: logic, automation and precision in care.",
        "Clinical Code — تطبيق التفكير البرمجي على الطب.",
        "عنوان برمجي يطبق التفكير الهندسي على العمل السريري: المنطق والأتمتة والدقة في الرعاية.",
    ),
    "digital-autonomy-blueprint": (
        "A blueprint for digital autonomy in a connected world.",
        "A template for owning your data, tools and identity — practical autonomy in the digital age.",
        "مخطط للاستقلالية الرقمية في عالم مترابط.",
        "قالب لامتلاك بياناتك وأدواتك وهويتك — استقلالية عملية في العصر الرقمي.",
    ),
    "digital-childhood": (
        "A guide to raising children in a digital-first world.",
        "Practical guidance for parents and educators navigating screens, safety and healthy digital habits.",
        "دليل لتربية الأطفال في عالم رقمي أول.",
        "إرشادات عملية للآباء والمعلمين حول الشاشات والسلامة والعادات الرقمية الصحية.",
    ),
    "digital-health-bridge": (
        "A healthcare title on bridging digital tools and patient care.",
        "How digital tools connect clinicians, patients and systems — with practical integration guidance.",
        "عنوان صحي حول جسر الأدوات الرقمية ورعاية المرضى.",
        "كيف تربط الأدوات الرقمية بين الأطباء والمرضى والأنظمة مع إرشادات تكامل عملية.",
    ),
    "digital-income-strategy-your-three-pathways": (
        "A blueprint for building three streams of digital income.",
        "A structured blueprint for product, services and audience income pathways — and how to sequence them.",
        "مخطط لبناء ثلاثة مسارات للدخل الرقمي.",
        "مخطط منظم لمسارات الدخل: المنتجات والخدمات والجمهور — وكيفية تسلسلها.",
    ),
    "digital-organization-handbook-drive-edition": (
        "The Drive Edition handbook for AI-first digital organizations.",
        "The full handbook on organizing teams, processes and technology for AI-first operations. A condensed Mini-Book is also available.",
        "النسخة الكاملة لدليل المنظمات الرقمية بتوجه ذكاء اصطناعي أول.",
        "الدليل الكامل لتنظيم الفرق والعمليات والتقنية للعمليات الرقمية أولًا، مع نسخة Mini-Book مختصرة.",
    ),
    "dom-study-notes-drive-edition": (
        "The Drive Edition of the DOM study notes — full PDF.",
        "A complete visual guide to the Document Object Model for developers, from fundamentals to manipulation patterns.",
        "النسخة الكاملة من ملاحظات دراسة DOM.",
        "دليل مرئي كامل لنموذج كائن المستند للمطورين، من الأساسيات إلى أنماط التعامل معه.",
    ),
    "etimad-and-nphies-integration": (
        "A healthcare title on integrating Etimad and NPHIES.",
        "How to connect Etimad financial workflows with NPHIES claims — architecture, flows and compliance.",
        "عنوان صحي حول تكامل Etimad وNPHIES.",
        "كيف تربط مسارات Etimad المالية مع مطالبات NPHIES — المعمارية والتدفقات والامتثال.",
    ),
    "etimad-digital-governance-blueprint": (
        "A blueprint for digital governance on Etimad.",
        "A template for compliant digital governance, e-payments and institutional workflows on the Etimad platform.",
        "مخطط للحوكمة الرقمية على منصة Etimad.",
        "قالب للحوكمة الرقمية المتوافقة والمدفوعات الإلكترونية والمسارات المؤسسية على Etimad.",
    ),
    "from-mind-to-market": (
        "A mini-book taking you from idea to market with clarity.",
        "A concise journey from validated idea to market entry: positioning, packaging and first customers.",
        "كتاب مصغر ينقلك من الفكرة إلى السوق بوضوح.",
        "رحلة موجزة من الفكرة المختبرة إلى دخول السوق: التموضع والتغليف وأول العملاء.",
    ),
    "game-theory-for-parents": (
        "A fresh lens on parenting using game theory.",
        "How incentives, strategy and negotiation illuminate everyday parenting decisions.",
        "نظرة جديدة للأبوة عبر نظرية الألعاب.",
        "كيف تُضيء الحوافز والاستراتيجية والتفاوض قرارات الأبوة اليومية.",
    ),
    "hyper-scalable-agency-system": (
        "A software title on building a hyper-scalable agency system.",
        "Systems, pricing and delivery models to scale a services agency beyond your personal hours.",
        "عنوان برمجي عن بناء نظام وكالات فائق التوسع.",
        "أنظمة وتسعير ونماذج تسليم لتوسيع وكالة خدمات تتجاوز ساعاتك الشخصية.",
    ),
    "izhar-ul-haq-forensic-analysis": (
        "A forensic literary analysis of Izhar ul-Haq.",
        "A scholarly forensic reading of the text — structure, argument and historical context.",
        "تحليل أدبي تحقيقي لنص إظهار الحق.",
        "قراءة تحليلية دقيقة للنص — البنية والحجة والسياق التاريخي.",
    ),
    "leading-joy-in-healthcare": (
        "A healthcare title on leading with joy and resilience.",
        "Leadership practices for clinicians and managers that sustain joy, resilience and team morale.",
        "عنوان صحي عن القيادة بالفرح والمرونة.",
        "ممارسات قيادية للأطباء والمدراء تحافظ على الفرح والمرونة وروح الفريق.",
    ),
    "one-ecosystem-limitless-intelligence": (
        "A mini-book on one connected ecosystem of intelligence.",
        "How unifying platforms, data and AI creates compounding value across an organization.",
        "كتاب مصغر عن نظام بيئي واحد للذكاء غير المحدود.",
        "كيف يؤدي توحيد المنصات والبيانات والذكاء الاصطناعي إلى قيمة متراكمة عبر المؤسسة.",
    ),
    "one-million-rps-achieved": (
        "A mini-book chronicling the one-million RPS milestone.",
        "The engineering story behind achieving one million requests per second — and the lessons for scale.",
        "كتاب مصغر يروي إنجاز المليون طلب في الثانية.",
        "القصة الهندسية خلف تحقيق مليون طلب في الثانية — والدروس المستفادة في التوسع.",
    ),
    "private-ai-blueprint": (
        "A template for running AI privately on your own infrastructure.",
        "How to deploy private, self-hosted AI: models, data control, security and cost.",
        "قالب لتشغيل ذكاء اصطناعي خاص على بنيتك الخاصة.",
        "كيف تنشر ذكاءً اصطناعيًا خاصًا مستضافًا ذاتيًا: النماذج والتحكم في البيانات والأمان والتكلفة.",
    ),
    "professional-writing-mastery": (
        "A skill guide for mastering professional writing.",
        "A systematic guide to clear, persuasive professional writing — structure, style and editing.",
        "دليل مهارة لإتقان الكتابة الاحترافية.",
        "دليل منهجي للكتابة الاحترافية الواضحة والمقنعة — البنية والأسلوب والتحرير.",
    ),
    "saudi-health-innovation-guide": (
        "A healthcare title on innovation in Saudi health.",
        "A guide to the Saudi health innovation landscape: priorities, players and where builders can contribute.",
        "عنوان صحي حول الابتكار في الصحة السعودية.",
        "دليل لمشهد الابتكار الصحي السعودي: الأولويات والجهات وأين يمكن للبنّائين المساهمة.",
    ),
    "saudi-health-transformation-drive-edition": (
        "The full Drive Edition on Saudi healthcare transformation.",
        "The complete standalone PDF on how Saudi Arabia is transforming healthcare through AI and digital innovation. A condensed Mini-Book is also available.",
        "النسخة الكاملة من تحول الصحة السعودي.",
        "النسخة الكاملة المستقلة عن تحول الرعاية الصحية السعودية عبر الذكاء الاصطناعي والابتكار الرقمي، مع نسخة Mini-Book مختصرة.",
    ),
    "sbs-nphies-integration-blueprint": (
        "A template for SBS NPHIES integration.",
        "A technical blueprint for connecting SBS systems to NPHIES: flows, mapping and go-live checklist.",
        "قالب لتكامل SBS مع NPHIES.",
        "مخطط تقني لربط أنظمة SBS بـ NPHIES: التدفقات والربط وقائمة الجاهزية.",
    ),
    "sdc-fhir-stu-4-notes": (
        "A template of SDC FHIR STU 4 study notes.",
        "Focused notes on the SDC FHIR STU 4 implementation guide for form and data capture design.",
        "ملاحظات دراسة SDC FHIR STU 4.",
        "ملاحظات مركّزة حول دليل تنفيذ SDC FHIR STU 4 لتصميم النماذج والتقاط البيانات.",
    ),
    "solo-ai-business-blueprint-drive-edition": (
        "The standalone PDF Drive Edition of the Solo AI Business Blueprint.",
        "The full PDF edition of the physician-led enterprise blueprint — deeper than the Mini-Book, complete with execution detail.",
        "نسخة PDF المستقلة من مخطط أعمال الذكاء الاصطناعي الفردي.",
        "النسخة الكاملة PDF من مخطط المشروع بقيادة طبيب — أعمق من Mini-Book مع تفاصيل تنفيذ.",
    ),
    "stealth-python-networking": (
        "A software title on stealth Python networking.",
        "Low-level Python networking: sockets, protocols and bypass techniques for advanced builders.",
        "عنوان برمجي عن شبكات بايثون المتقدمة.",
        "شبكات بايثون منخفضة المستوى: المقابس والبروتوكولات وتقنيات متقدمة للبنّائين.",
    ),
    "the-ai-skill-economy": (
        "A skill guide on thriving in the AI skill economy.",
        "Which skills compound in the AI economy, how to build them, and how to monetize them.",
        "دليل مهارة للازدهار في اقتصاد مهارات الذكاء الاصطناعي.",
        "أي المهارات تتراكم في اقتصاد الذكاء الاصطناعي، وكيف تبنيها وتحولها إلى دخل.",
    ),
    "the-api-blueprint": (
        "A software title — the complete API blueprint.",
        "The full blueprint for designing, building and operating production APIs, from contracts to deployment.",
        "عنوان برمجي — المخطط الكامل للواجهات البرمجية.",
        "المخطط الكامل لتصميم وبناء وتشغيل واجهات برمجية إنتاجية، من العقود إلى النشر.",
    ),
    "the-architecture-of-self": (
        "A mini-book on the architecture of the self.",
        "A reflective exploration of identity, habits and decision architecture — the self as a system.",
        "كتاب مصغر عن معمارية الذات.",
        "استكشاف تأملي للهوية والعادات ومعمارية القرار — الذات كنظام.",
    ),
    "the-decentralized-hospital": (
        "A healthcare title on the decentralized hospital.",
        "How care moves to the home, community and digital layers — a blueprint for distributed healthcare.",
        "عنوان صحي عن المستشفى اللامركزي.",
        "كيف تنتقل الرعاية إلى المنزل والمجتمع والطبقات الرقمية — مخطط للرعاية الموزعة.",
    ),
    "the-hospital-at-home": (
        "A healthcare title on delivering hospital care at home.",
        "A practical blueprint for hospital-at-home programs: eligibility, monitoring, staffing and reimbursement.",
        "عنوان صحي عن تقديم الرعاية الاستشفائية في المنزل.",
        "مخطط عملي لبرامج المستشفى في المنزل: الأهلية والمراقبة والتوظيف والسداد.",
    ),
    "the-outlier-equation": (
        "A novel about the outlier equation.",
        "A literary novel exploring what separates outliers from the ordinary — told through compelling characters.",
        "رواية عن معادلة الخارج عن المألوف.",
        "رواية أدبية تستكشف ما يميز المتفردين عن العاديين عبر شخصيات جذابة.",
    ),
    "the-ultimate-persistent-ai-agent": (
        "The full skill guide on building a persistent AI agent.",
        "The complete standalone PDF on building agents with memory, identity and persistence across sessions. A condensed Mini-Book is also available.",
        "الدليل الكامل لبناء وكيل ذكاء اصطناعي دائم.",
        "النسخة الكاملة PDF لبناء وكلاء بذاكرة وهوية واستمرارية عبر الجلسات، مع نسخة Mini-Book مختصرة.",
    ),
    "voice-agent-production-blueprint": (
        "A template for shipping production voice agents.",
        "A production blueprint for voice AI: telephony, ASR/TTS, latency, guardrails and deployment.",
        "قالب لإطلاق وكلاء صوتيين في الإنتاج.",
        "مخطط إنتاجي للذكاء الصوتي: الاتصالات والتعرف والتوليف وزمن الاستجابة وضوابط النشر.",
    ),

    # ── Mini-books / Notebooks ──
    "strategic-ai-blueprint-mini-book": (
        "The condensed Mini-Book of the Strategic AI Blueprint.",
        "A quick-start summary of AI strategy — where it pays off and how to sequence it. The full PDF goes deeper.",
        "نسخة Mini-Book المختصرة من مخطط الذكاء الاصطناعي الاستراتيجي.",
        "ملخص سريع لاستراتيجية الذكاء الاصطناعي — أين يحقق العائد وكيف تُسلسَل، مع نسخة كاملة أعمق.",
    ),
    "solo-ai-business-blueprint-mini-book": (
        "The condensed Mini-Book of the Solo AI Business Blueprint.",
        "A quick-start summary of the physician-led AI business. The full PDF and Drive Edition go deeper.",
        "نسخة Mini-Book المختصرة من مخطط أعمال الذكاء الاصطناعي الفردي.",
        "ملخص سريع للمشروع بقيادة طبيب، مع النسخ الكاملة للتعمق.",
    ),
    "healthcare-ai-2025-mini-book": (
        "The condensed Mini-Book of Healthcare AI 2025.",
        "A quick-start summary of AI in healthcare. The full standalone PDF covers everything in depth.",
        "نسخة Mini-Book المختصرة من Healthcare AI 2025.",
        "ملخص سريع للذكاء الاصطناعي في الصحة، مع النسخة الكاملة للتعمق.",
    ),
    "saudi-health-transformation-mini-book": (
        "The condensed Mini-Book of Saudi Health Transformation.",
        "A quick-start summary of Saudi healthcare transformation. The full Drive Edition goes deeper.",
        "نسخة Mini-Book المختصرة من تحول الصحة السعودي.",
        "ملخص سريع لتحول الصحة السعودية، مع النسخة الكاملة للتعمق.",
    ),
    "ultimate-persistent-ai-agent-mini-book": (
        "The condensed Mini-Book of the Ultimate Persistent AI Agent.",
        "A quick-start summary of building persistent agents. The full PDF goes deeper.",
        "نسخة Mini-Book المختصرة من الوكيل الدائم.",
        "ملخص سريع لبناء الوكلاء الدائمين، مع النسخة الكاملة للتعمق.",
    ),
    "digital-organization-handbook-mini-book": (
        "The condensed Mini-Book of the Digital Organization Handbook.",
        "A quick-start summary on AI-first organizations. The full Drive Edition goes deeper.",
        "نسخة Mini-Book المختصرة من دليل المنظمة الرقمية.",
        "ملخص سريع للمنظمات الرقمية أولًا، مع النسخة الكاملة للتعمق.",
    ),
    "architecture-of-self-mini-book": (
        "The condensed Mini-Book of The Architecture of Self.",
        "A quick-start summary on identity and decision architecture.",
        "نسخة Mini-Book المختصرة من معمارية الذات.",
        "ملخص سريع حول الهوية ومعمارية القرار.",
    ),
    "bite-scientific-assessment-mini-book": (
        "The condensed Mini-Book of the BITE scientific assessment.",
        "A quick-start summary of the BITE model analysis of authoritarian control.",
        "نسخة Mini-Book المختصرة من التقييم العلمي لنموذج BITE.",
        "ملخص سريع لتحليل نموذج BITE للسيطرة الاستبدادية.",
    ),
    "developer-api-notebook": (
        "A developer notebook for API work.",
        "A hands-on notebook for API developers: patterns, security, debugging and production checklists.",
        "دفتر مطور لتصميم الواجهات البرمجية.",
        "دفتر عملي لمطوري الواجهات: الأنماط والأمان وتصحيح الأخطاء وقوائم الإنتاج.",
    ),
    "dom-study-notes-notebook": (
        "The visual-guide Notebook edition of the DOM study notes.",
        "A visual, hands-on guide to the DOM for developers. The full PDF (Drive Edition) is also available.",
        "نسخة الدفتر المرئي من ملاحظات DOM.",
        "دليل مرئي وعملي لنموذج كائن المستند، مع النسخة الكاملة PDF المتاحة أيضًا.",
    ),
    "republic-of-cells-complete-edition": (
        "The complete edition of Republic of Cells.",
        "A literary science novel telling the story of the human body as a republic of cells — written for physicians and health professionals, blending immunology precision with literary craft.",
        "النسخة الكاملة من جمهورية الخلايا.",
        "رواية علمية أدبية تروي قصة الجسد البشري كجمهورية من الخلايا — كتبت للأطباء والمهنيين الصحيين.",
    ),

    # ── Products / Platforms / Licenses ──
    "brainsait-operating-system-bos-complete-course": (
        "The complete BrainSAIT Operating System (BOS) course.",
        "A full course on the BrainSAIT Operating System: the stack, integration patterns and how to operate an intelligent organization.",
        "دورة نظام BrainSAIT التشغيلي الكاملة.",
        "دورة شاملة عن نظام BrainSAIT التشغيلي: التكديس التقني وأنماط التكامل وتشغيل منظمة ذكية.",
    ),
    "brainsait-oid-registry-explorer-platform-license": (
        "Platform license for the BrainSAIT OID Registry Explorer.",
        "A platform license to deploy the OID registry explorer across your organization — identifiers, namespaces and governance.",
        "رخصة منصة لمستكشف سجل OID من BrainSAIT.",
        "رخصة منصة لنشر مستكشف سجل OID عبر مؤسستك — المعرّفات والنطاقات والحوكمة.",
    ),
    "nphies-oid-healthcare-identity-bundle": (
        "A bundle for healthcare identity on NPHIES + OID.",
        "The NPHIES-OID healthcare identity bundle: identity primitives and integration guidance for healthcare systems.",
        "حزمة الهوية الصحية NPHIES-OID.",
        "حزمة هوية الرعاية الصحية NPHIES-OID: أساسيات الهوية وإرشادات التكامل للأنظمة الصحية.",
    ),
    "enterprise-oid-badge-management-system-self-hosted-license": (
        "Self-hosted license for the Enterprise OID Badge Management System.",
        "A self-hosted enterprise system for issuing, managing and auditing OID identity badges — with full control and governance.",
        "رخصة استضافة ذاتية لنظام إدارة شارات OID المؤسسي.",
        "نظام مؤسسي مستضاف ذاتيًا لإصدار وإدارة وتدقيق شارات هوية OID مع تحكم كامل وحوكمة.",
    ),
    "oid-enterprise-namespace-architect-مهندس-نطاق-الهوية-المؤسسي": (
        "OID Enterprise Namespace Architect | مهندس نطاق الهوية المؤسسي",
        "An architecture role and playbook for designing enterprise OID namespaces — structure, delegation and governance.",
        "مهندس نطاق الهوية المؤسسي OID — دليل معمارية النطاقات.",
        "دور ودليل معماري لتصميم نطاقات OID المؤسسية — البنية والتفويض والحوكمة.",
    ),
    "healthcare-ai-identity-infrastructure-suite-حزمة-البنية-التحتية-لهوية-الذكاء-الاصطناعي-الصحي": (
        "Healthcare AI Identity Infrastructure Suite | حزمة البنية التحتية لهوية الذكاء الاصطناعي الصحي",
        "A suite of identity infrastructure patterns for healthcare AI — secure, auditable and interoperable.",
        "حزمة بنية هوية للذكاء الاصطناعي الصحي.",
        "مجموعة أنماط بنية هوية للذكاء الاصطناعي الصحي — آمنة وقابلة للتدقيق والتشغيل البيني.",
    ),
    "brainsait-oid-white-label-enterprise-license-رخصة-المؤسسة-بالعلامة-التجارية-الخاصة": (
        "BrainSAIT OID White-Label Enterprise License | رخصة المؤسسة بالعلامة التجارية الخاصة",
        "A white-label license to deploy OID infrastructure under your own brand.",
        "رخصة علامة بيضاء لنشر بنية OID بعلامتك التجارية الخاصة.",
        "رخصة العلامة البيضاء لنشر البنية التحتية لهوية OID تحت علامتك التجارية.",
    ),
    "oid-fhir-integration-platform-منصة-تكامل-oid-مع-fhir": (
        "OID FHIR Integration Platform | منصة تكامل OID مع FHIR",
        "A platform for integrating OID identity with FHIR-based clinical systems.",
        "منصة لدمج هوية OID مع الأنظمة السريرية القائمة على FHIR.",
        "منصة لتكامل هوية OID مع الأنظمة السريرية القائمة على FHIR.",
    ),
    "abeer-connected-healthcare-platform": (
        "A fully-connected healthcare platform for care groups.",
        "A paid enterprise platform: bookings, medical market and a unified profile engine wired into the BrainSAIT ecosystem — for care groups.",
        "منصة رعاية صحية مترابطة بالكامل لمجموعات الرعاية.",
        "منصة مؤسسية مدفوعة: حجوزات وسوق طبي ومحرك ملفات موحد مرتبط بمنظومة BrainSAIT — لمجموعات الرعاية.",
    ),
}


def main():
    remote = sys.argv[1] if len(sys.argv) > 1 else None
    if not remote:
        print("usage: enrich_solutions.py <path-to-catalog.json>")
        sys.exit(1)
    with open(remote, "r", encoding="utf-8") as f:
        cat = json.load(f)
    changed = 0
    for s in cat.get("solutions", []):
        slug = s["slug"]
        if slug not in D:
            continue
        en_tag, en_desc, ar_tag, ar_desc = D[slug]
        s["tagline"] = en_tag
        s["description"] = en_desc
        s["taglineAr"] = ar_tag
        s["descriptionAr"] = ar_desc
        changed += 1
    with open(remote, "w", encoding="utf-8") as f:
        json.dump(cat, f, ensure_ascii=False, indent=2)
    print(f"enriched {changed}/{len(cat.get('solutions', []))} solutions")


if __name__ == "__main__":
    main()
