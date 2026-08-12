#!/usr/bin/env python3
"""Align solution card titles + descriptions with the ACTUAL demo each URL shows.

Data sourced by fetching every demoUrl and reading <title>/<meta description>/<h1>.
Keyed by slug: (name, nameAr, tagline, taglineAr, description, descriptionAr).
Also fixes confirmed bad demoUrl pointers.
"""
import json

A = {
    "neural-cloud-portal": (
        "Neural Cloud Portal", "بوابة Neural Cloud",
        "Bilingual, voice-ready interface to your Gemini-powered Neural Cloud cortex.",
        "واجهة ثنائية اللغة جاهزة للصوت لمحركك العصبي المدعوم بـ Gemini.",
        "BrainSAIT Neural Cloud — a bilingual, voice-ready portal to your Gemini-powered cortex, with facilities, incubation and MCP integration links.",
        "Neural Cloud من BrainSAIT — بوابة ثنائية اللغة جاهزة للصوت لمحركك العصبي المدعوم بـ Gemini، مع روابط المرافق والاحتضان وتكامل MCP.",
    ),
    "brainsait-neural-cloud": (
        "BrainSAIT Neural Cloud", "BrainSAIT Neural Cloud",
        "Alternate deployment of the Neural Cloud portal — bilingual and voice-ready.",
        "نسخة بديلة من بوابة Neural Cloud — ثنائية اللغة وجاهزة للصوت.",
        "Alternate deployment of the Neural Cloud portal — the same bilingual, voice-ready interface to your Gemini-powered cortex.",
        "نسخة بديلة من بوابة Neural Cloud — نفس الواجهة ثنائية اللغة الجاهزة للصوت لمحركك العصبي المدعوم بـ Gemini.",
    ),
    "healthcare-directory": (
        "BrainSAIT Cognitive Healthcare", "برينسايت للرعاية المعرفية",
        "Cognitive healthcare systems — bridging human wisdom and agentic intelligence.",
        "أنظمة رعاية معرفية — جسر بين الحكمة البشرية والذكاء الوكلائي.",
        "BrainSAIT — Cognitive Healthcare Systems: a digital healthcare incubator bridging human wisdom and agentic intelligence for Saudi Vision 2030.",
        "برينسايت — أنظمة الرعاية المعرفية: حاضنة رعاية صحية رقمية تجمع بين الحكمة البشرية والذكاء الوكلائي لرؤية السعودية 2030.",
    ),
    "doctor-hub": (
        "Doctor's Hub", "مركز الطبيب",
        "A unified doctor-facing platform for clinics and practitioners.",
        "منصة موحدة موجهة للأطباء للعيادات والممارسين.",
        "Doctor's Hub — a unified doctor-facing platform bringing clinical, admin and patient tools into one dashboard.",
        "مركز الطبيب — منصة موحدة موجهة للأطباء تجمع الأدوات السريرية والإدارية والخاصة بالمرضى في لوحة واحدة.",
    ),
    "private-strategy-session": (
        "Private Strategy Session", "جلسة استراتيجية خاصة",
        "Book a 60-minute healthcare AI / NPHIES / architecture consultation.",
        "احجز جلسة استشارية (60 دقيقة) في الذكاء الاصطناعي الصحي / NPHIES / المعمارية.",
        "A private 60-minute consultation with Dr. Mohamed El Fadil on healthcare AI, NPHIES integration or system architecture (SAR 2,390).",
        "جلسة خاصة (60 دقيقة) مع د. محمد الفاضل حول الذكاء الاصطناعي الصحي أو تكامل NPHIES أو معمارية الأنظمة (2390 ر.س).",
    ),
    "travel-code-secure-vault": (
        "Travel Code Secure Vault", "خزنة السفر الآمنة",
        "A Saudi heritage and modernity travel platform with AR and an AI concierge.",
        "منصة سفر سعودية تجمع التراث والحداثة مع الواقع المعزز ومرشد ذكي.",
        "Travel Code Secure Vault — a Saudi heritage and modernity travel experience platform with AR, AI concierge, secure travel vaults and connectivity hubs.",
        "خزنة السفر الآمنة — منصة تجربة سفر سعودية تجمع التراث والحداثة مع الواقع المعزز ومرشد ذكي وخزائن سفر آمنة ومحاور اتصال.",
    ),
    "healthcare-directory-v2": (
        "BrainSAIT Healthcare Directory", "دليل الرعاية الصحية برينسايت",
        "Provider and facility discovery for the Saudi healthcare ecosystem.",
        "اكتشاف مقدمي الخدمات والمرافق للنظام الصحي السعودي.",
        "BrainSAIT Healthcare Directory — a provider and facility discovery platform for the Saudi healthcare ecosystem.",
        "دليل الرعاية الصحية برينسايت — منصة اكتشاف مقدمي الخدمات والمرافق للنظام الصحي السعودي.",
    ),
    "browser-ui": (
        "Browser UI", "واجهة المتصفح",
        "A browser-style interface prototype.",
        "نموذج واجهة بأسلوب المتصفح.",
        "Browser UI — a browser-style interface prototype exploring navigation and shell patterns.",
        "واجهة المتصفح — نموذج واجهة بأسلوب المتصفح لاستكشاف أنماط التنقل والهيكل.",
    ),
    "ai-claims-reconciliation": (
        "AI Claims Reconciliation", "تسوية المطالبات بالذكاء الاصطناعي",
        "Automated AI reconciliation of Saudi insurance claims using RCM rules.",
        "تسوية تلقائية للمطالبات التأمينية السعودية بقواعد إدارة دورة الإيرادات.",
        "AI Claims Reconciliation — automated AI-powered reconciliation of insurance claims (e.g., Al Tawuniya) using GPT-4o and Saudi RCM guidelines.",
        "تسوية المطالبات بالذكاء الاصطناعي — تسوية تلقائية للمطالبات التأمينية (مثل التعاونية) باستخدام GPT-4o وإرشادات إدارة دورة الإيرادات السعودية.",
    ),
    "clinics-directory": (
        "Riyadh Clinics Directory", "دليل عيادات الرياض",
        "Riyadh healthcare clinics directory with online booking.",
        "دليل عيادات الرياض المتخصصة مع حجز أونلاين.",
        "Riyadh Clinics Directory — a directory of specialized Riyadh healthcare clinics with online booking.",
        "دليل عيادات الرياض — دليل عيادات الرياض المتخصصة مع حجز مواعيد أونلاين.",
    ),
    "un-innovation-toolkit": (
        "UN Innovation Toolkit", "عدة الابتكار للأمم المتحدة",
        "21 innovation tools, five pillars, diagnostics and 10 learning modules.",
        "21 أداة ابتكار وخمس ركائز وتشخيصات وعشرة وحدات تعلم.",
        "UN Innovation Toolkit — a BrainSAIT innovation course: 21 tools, five pillars, diagnostics and 10 learning modules.",
        "عدة الابتكار للأمم المتحدة — دورة ابتكار من BrainSAIT: 21 أداة وخمس ركائز وتشخيصات وعشرة وحدات تعلم.",
    ),
    "sbs": (
        "GIVC-SBS — Saudi Billing System", "GIVC-SBS — نظام الفوترة السعودي",
        "Global Integrated Virtual Care · Saudi Billing System.",
        "الرعاية الافتراضية المتكاملة العالمية · نظام الفوترة السعودي.",
        "GIVC-SBS — the Global Integrated Virtual Care · Saudi Billing System, powered by BrainSAIT.",
        "GIVC-SBS — الرعاية الافتراضية المتكاملة العالمية · نظام الفوترة السعودي، مدعوم من BrainSAIT.",
    ),
    "gtm-playbook": (
        "GTM Playbook — Saudi Health AI", "دليل GTM — الذكاء الاصطناعي الصحي السعودي",
        "A practical GTM framework for Saudi health-AI founders — courses, tools and SEO content.",
        "إطار عملي لدخول السوق لمؤسسي الذكاء الاصطناعي الصحي في السعودية — دورات وأدوات ومحتوى SEO.",
        "GTM Playbook — Saudi Health AI: a complete go-to-market course with tools, posts, SEO content and a readiness assessment for Saudi health-AI founders.",
        "دليل GTM — الذكاء الاصطناعي الصحي السعودي: دورة دخول سوق متكاملة بأدوات ومنشورات ومحتوى SEO وتقييم جاهزية.",
    ),
    "portals": (
        "BrainSAIT eCarePlus Portal", "بوابة eCarePlus",
        "Saudi Arabia's smart portal edge for BOS, BOT, Oracle and MCP healthcare routing.",
        "حافة البوابات الذكية للسعودية لتوجيه الرعاية الصحية عبر BOS وBOT وOracle وMCP.",
        "BrainSAIT eCarePlus — a smart healthcare routing portal for BOS, BOT, Oracle and MCP in Saudi Arabia.",
        "eCarePlus من BrainSAIT — بوابة توجيه رعاية ذكية لـ BOS وBOT وOracle وMCP في السعودية.",
    ),
    "basma-voice-agent": (
        "Basma AI Voice Agent", "بسمة — وكيل الصوت الذكي",
        "Bilingual AI healthcare voice assistant — appointments, eligibility, claims and records.",
        "مساعد صوتي صحي ذكي ثنائي اللغة — مواعيد وأهلية ومطالبات وسجلات.",
        "Basma — a bilingual AI healthcare voice assistant handling appointments, eligibility, claims, records, labs and radiology.",
        "بسمة — مساعد صوتي صحي ثنائي اللغة يدير المواعيد والأهلية والمطالبات والسجلات والمختبرات والأشعة.",
    ),
    "hnh": (
        "Hayat National Hospitals", "مستشفيات الحياة الوطني",
        "Hospital digital experience — booking, doctors, branches and Basma AI.",
        "تجربة رقمية للمستشفيات — حجز وأطباء وفروع وبسمة الذكية.",
        "Hayat National Hospitals — a full hospital digital experience with online booking, doctors, branches and the Basma AI voice assistant.",
        "مستشفيات الحياة الوطني — تجربة رقمية كاملة للمستشفيات مع حجز أونلاين وأطباء وفروع ومساعد بسمة الذكي.",
    ),
    "veinforge": (
        "VeinForge — Vol. 08 · Hematology", "VeinForge — المجلد 08 · أمراض الدم",
        "Cinematic medical novelist engine for Hematology. Bilingual EN+AR.",
        "محرك روايات طبية سينمائية لأمراض الدم. ثنائي اللغة.",
        "VeinForge: a cinematic medical novelist engine for Hematology — Vol. 08, bilingual EN+AR, by BrainSAIT.",
        "VeinForge: محرك روايات طبية سينمائية لأمراض الدم — المجلد 08، ثنائي اللغة، من BrainSAIT.",
    ),
    "boneforge": (
        "BoneForge — Vol. 07 · Orthopedics", "BoneForge — المجلد 07 · جراحة العظام",
        "Cinematic medical novelist engine for Orthopedics. Bilingual EN+AR.",
        "محرك روايات طبية سينمائية لجراحة العظام. ثنائي اللغة.",
        "BoneForge: a cinematic medical novelist engine for Orthopedics — Vol. 07, bilingual EN+AR, by BrainSAIT.",
        "BoneForge: محرك روايات طبية سينمائية لجراحة العظام — المجلد 07، ثنائي اللغة، من BrainSAIT.",
    ),
    "traumaforge": (
        "TraumaForge — Vol. 06 · Emergency Medicine", "TraumaForge — المجلد 06 · طب الطوارئ",
        "Cinematic medical novelist engine for Emergency Medicine. Bilingual EN+AR.",
        "محرك روايات طبية سينمائية لطب الطوارئ. ثنائي اللغة.",
        "TraumaForge: a cinematic medical novelist engine for Emergency Medicine — Vol. 06, bilingual EN+AR, by BrainSAIT.",
        "TraumaForge: محرك روايات طبية سينمائية لطب الطوارئ — المجلد 06، ثنائي اللغة، من BrainSAIT.",
    ),
    "shadowforge": (
        "ShadowForge — Vol. 05 · Radiology", "ShadowForge — المجلد 05 · الأشعة",
        "Cinematic medical novelist engine for Radiology. Bilingual EN+AR.",
        "محرك روايات طبية سينمائية للأشعة. ثنائي اللغة.",
        "ShadowForge: a cinematic medical novelist engine for Radiology — Vol. 05, bilingual EN+AR, by BrainSAIT.",
        "ShadowForge: محرك روايات طبية سينمائية للأشعة — المجلد 05، ثنائي اللغة، من BrainSAIT.",
    ),
    "cellforge": (
        "CellForge — Vol. 04 · Oncology", "CellForge — المجلد 04 · الأورام",
        "Cinematic medical novelist engine for Oncology. Bilingual EN+AR.",
        "محرك روايات طبية سينمائية للأورام. ثنائي اللغة.",
        "CellForge: a cinematic medical novelist engine for Oncology — Vol. 04, bilingual EN+AR, by BrainSAIT.",
        "CellForge: محرك روايات طبية سينمائية للأورام — المجلد 04، ثنائي اللغة، من BrainSAIT.",
    ),
    "melissa-hospitality": (
        "Melissa Riyadh Collection", "ميليسا — مجموعة الرياض",
        "Luxury Riyadh hospitality rooted in Arabian heritage.",
        "ضيافة فاخرة في الرياض متجذرة في التراث العربي.",
        "Melissa — the Riyadh luxury hospitality collection: an unforgettable experience in the heart of the capital.",
        "ميليسا — مجموعة الرياض للضيافة الفاخرة: تجربة لا تُنسى في قلب العاصمة.",
    ),
    "ecareplus": (
        "BrainSAIT eCarePlus Portal", "بوابة eCarePlus",
        "A smart healthcare routing portal for BOS, BOT, Oracle and MCP.",
        "بوابة توجيه رعاية ذكية لـ BOS وBOT وOracle وMCP.",
        "BrainSAIT eCarePlus — a smart healthcare operating portal for BOS, BOT, Oracle and MCP routing in Saudi Arabia.",
        "eCarePlus من BrainSAIT — بوابة تشغيل رعاية ذكية لتوجيه BOS وBOT وOracle وMCP في السعودية.",
    ),
    "nphies-linc": (
        "NPHIES-Linc", "NPHIES-Linc",
        "NPHIES integration service — eligibility, claims, prior-auth and COC endpoints.",
        "خدمة تكامل NPHIES — الأهلية والمطالبات والموافقة المسبقة ونقاط COC.",
        "NPHIES-Linc — a BrainSAIT NPHIES integration service exposing eligibility, claims, prior-authorization and COC endpoints.",
        "NPHIES-Linc — خدمة تكامل NPHIES من BrainSAIT توفر نقاط الأهلية والمطالبات والموافقة المسبقة وCOC.",
    ),
    "museum-hilton": (
        "Human & Saudi Cultural Museum", "متحف الإنسانية والثقافة السعودية",
        "AI-powered immersive Saudi cultural museum concept for Hilton.",
        "مفهوم متحف سعودي ثقافي غامر مدعوم بالذكاء الاصطناعي لهيلتون.",
        "Human & Saudi Cultural Museum @ Hilton — transforming hotel spaces into immersive cultural museums, powered by AI, rooted in heritage and aligned with Vision 2030.",
        "متحف الإنسانية والثقافة السعودية @ هيلتون — تحويل مساحات الفنادق إلى متاحف ثقافية غامرة مدعومة بالذكاء الاصطناعي، متجذرة في التراث ومتوافقة مع رؤية 2030.",
    ),
    "bsa-rcp-academy": (
        "BSA-RCP Academy", "أكاديمية BSA-RCP",
        "Saudi Healthcare AI & Revenue Cycle Professional Certification (12 weeks).",
        "شهادة مهنيي الذكاء الاصطناعي وإدارة دورة الإيرادات الصحية السعودية (12 أسبوعًا).",
        "BSA-RCP Academy — a 12-week Saudi Healthcare AI & Revenue Cycle Professional Certification program.",
        "أكاديمية BSA-RCP — برنامج شهادة مهنيي الذكاء الاصطناعي وإدارة دورة الإيرادات الصحية السعودية لمدة 12 أسبوعًا.",
    ),
    "nphies-drg-kb": (
        "NPHIES DRG Knowledge Base", "قاعدة معرفة NPHIES DRG",
        "DRG use cases, validation rules, AR-DRG codes and payer workflows.",
        "حالات استخدام DRG وقواعد التحقق ورموز AR-DRG ومسارات الدافع.",
        "NPHIES DRG Knowledge Base — DRG use cases, validation rules, AR-DRG codes and payer workflows.",
        "قاعدة معرفة NPHIES DRG — حالات استخدام DRG وقواعد التحقق ورموز AR-DRG ومسارات الدافع.",
    ),
    "hetzner-guide": (
        "Hetzner Guide", "دليل Hetzner",
        "Arabic cloud infrastructure guide — SSH, firewall, Fail2Ban, Nginx/SSL and deployment.",
        "دليل بنية سحابية عربي — SSH والجدار الناري وFail2Ban وNginx/SSL والنشر.",
        "Hetzner Guide — a comprehensive Arabic cloud infrastructure guide covering SSH, firewall, Fail2Ban, Nginx/SSL and deployment.",
        "دليل Hetzner — دليل عربي شامل لإدارة البنية التحتية السحابية يغطي SSH والجدار الناري وFail2Ban وNginx/SSL والنشر.",
    ),
    "iris-academy": (
        "InterSystems IRIS Academy", "أكاديمية InterSystems IRIS",
        "30 Arabic courses, six tracks, 150+ hours.",
        "30 دورة عربية في 6 مسارات وأكثر من 150 ساعة.",
        "InterSystems IRIS Academy — a comprehensive Arabic learning platform with 30 courses across six tracks, from zero to professional.",
        "أكاديمية InterSystems IRIS — منصة تعليمية عربية شاملة تضم 30 دورة في 6 مسارات، من الصفر إلى الاحتراف.",
    ),
    "coding-ksa-academy": (
        "Coding KSA Academy", "أكاديمية كودينغ السعودية",
        "Saudi coding education platform and course guide.",
        "منصة تعليم البرمجة السعودية ودليل الدورات.",
        "Coding KSA Academy — a Saudi coding education platform with a structured course guide.",
        "أكاديمية كودينغ السعودية — منصة تعليم برمجة سعودية مع دليل دورات منظم.",
    ),
    "kdp-voice-agent": (
        "KDP Voice Agent", "وكيل KDP الصوتي",
        "AI book-publishing assistant with voice and Canva integration.",
        "مساعد نشر كتب ذكي بتكامل صوتي ومع Canva.",
        "KDP Voice Agent — an AI book-publishing assistant with voice interaction and Canva integration.",
        "وكيل KDP الصوتي — مساعد نشر كتب ذكي بتفاعل صوتي وتكامل مع Canva.",
    ),
    "masterlinc": (
        "MASTERLINC", "MASTERLINC",
        "Clinical intelligence for visits, coding, claims and AI documentation.",
        "ذكاء سريري للزيارات والترميز والمطالبات والتوثيق الذكي.",
        "MASTERLINC — a clinical intelligence platform covering visits, coding, claims and AI-assisted documentation.",
        "MASTERLINC — منصة ذكاء سريري تغطي الزيارات والترميز والمطالبات والتوثيق الذكي.",
    ),
    "oid-identity": (
        "BrainSAIT OID", "BrainSAIT OID",
        "Digital health identity and badging platform.",
        "منصة هوية صحية رقمية وشارات تعريف.",
        "BrainSAIT OID — a digital health identity and badging platform for the healthcare ecosystem.",
        "BrainSAIT OID — منصة هوية صحية رقمية وشارات تعريف للنظام الصحي.",
    ),
    "momfood": (
        "MomFood / لقمه يمه", "MomFood / لقمه يمه",
        "Authentic Sudanese cloud kitchen — traditional stews, fresh breads and desserts.",
        "مطبخ سوداني سحابي أصيل — يخنات تقليدية وخبز طازج وحلويات.",
        "MomFood — an authentic Sudanese cloud kitchen platform delivering traditional stews, fresh breads and handcrafted desserts.",
        "MomFood — منصة مطبخ سوداني سحابي أصيل تقدم يخنات تقليدية وخبزًا طازجًا وحلويات يدوية.",
    ),
    "nara-cafe": (
        "NARA Cafe & Majlis", "نارا كافيه ومجلس",
        "Premium bilingual coffee, majlis, tasting and concierge experience.",
        "تجربة قهوة ومجلس وتذوق وكونسيرج فاخرة ثنائية اللغة.",
        "NARA Cafe & Majlis — a premium bilingual coffee, majlis, tasting and concierge experience with a modern luxury interface.",
        "نارا كافيه ومجلس — تجربة قهوة ومجلس وتذوق وكونسيرج فاخرة ثنائية اللغة بواجهة عصرية فاخرة.",
    ),
    "wathq-linc": (
        "Wathq Linc", "واثق لينك",
        "Saudi business-data API platform — registrations, contracts, agencies, property, employees.",
        "منصة بيانات تجارية سعودية — السجلات والعقود والوكالات والعقارات والموظفين.",
        "Wathq Linc — a Saudi business-intelligence API platform covering commercial registrations, contracts, agencies, property and employee data.",
        "واثق لينك — منصة بيانات تجارية سعودية تغطي السجلات التجارية والعقود والوكالات والعقارات وبيانات الموظفين.",
    ),
    "tawnia": (
        "Tawnia × Al Tawuniya — AI Claims Reconciliation", "طونية × التعاونية — تسوية المطالبات بالذكاء الاصطناعي",
        "Automated AI-powered claims reconciliation for Al Tawuniya insurance.",
        "تسوية مطالبات تلقائية بالذكاء الاصطناعي لتأمين التعاونية.",
        "AI Claims Reconciliation — automated claims reconciliation for Al Tawuniya insurance using GPT-4o and Saudi RCM guidelines.",
        "تسوية المطالبات بالذكاء الاصطناعي — تسوية تلقائية لمطالبات تأمين التعاونية باستخدام GPT-4o وإرشادات إدارة دورة الإيرادات السعودية.",
    ),
}

# Confirmed demoUrl fixes (URLs that served the wrong product).
URL_FIX = {
    "ai-claims-reconciliation": "https://tawnia.elfadil.com",  # the real AI claims reconciliation demo
    "ecareplus": "https://portals.brainsait.org",              # eCarePlus portal (was pointing to healthcare directory)
}


def main(path):
    with open(path, "r", encoding="utf-8") as f:
        cat = json.load(f)
    n = 0
    for s in cat.get("solutions", []):
        if s["slug"] in A:
            name, nameAr, tag, tagAr, desc, descAr = A[s["slug"]]
            s["name"] = name
            s["nameAr"] = nameAr
            s["tagline"] = tag
            s["taglineAr"] = tagAr
            s["description"] = desc
            s["descriptionAr"] = descAr
            n += 1
        if s["slug"] in URL_FIX:
            s["demoUrl"] = URL_FIX[s["slug"]]
    with open(path, "w", encoding="utf-8") as f:
        json.dump(cat, f, ensure_ascii=False, indent=2)
    print("aligned %d solutions, fixed %d demo URLs" % (n, len(URL_FIX)))


if __name__ == "__main__":
    main("/home/fadil369/fadil369.github.io/src/data/catalog.json")
