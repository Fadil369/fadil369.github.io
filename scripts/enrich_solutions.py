#!/usr/bin/env python3
"""enrich_solutions.py — add the full 37-asset inventory to the storefront catalog.

Classifies each asset per the audit: Store product (Buy) vs Solutions Lab (demo).
Adds missing entries to catalog.json['solutions'] with bilingual metadata.
Safe to re-run: skips existing slugs, updates URLs for known ones.
"""
import json
import re
from pathlib import Path

CAT = Path.home() / "fadil369.github.io" / "src" / "data" / "catalog.json"

# slug -> (name, nameAr, category, categoryAr, sub, tier, tagline, taglineAr, demoUrl, commercial)
# commercial: 'product' (Store) | 'demo' (Solutions Lab) | 'service' (consulting)
ASSETS = [
  ("neural-cloud", "Neural Cloud — AI & Voice Portal", "بوابة نيورال كلاود — ذكاء اصطناعي وصوت", "AI / Cloud", "ذكاء اصطناعي / سحابة", "ai", "platform",
   "Bilingual AI/cloud portal with voice interface, facilities, incubation and MCP links.", "بوابة سحابية وذكاء اصطناعي ثنائية اللغة وجاهزة للصوت.", "https://neural-cloud.pages.dev", "demo"),
  ("healthcare-directory", "BrainSAIT Healthcare Directory", "دليل الرعاية الصحية", "Healthcare", "رعاية صحية", "healthcare", "product",
   "Healthcare discovery and directory platform.", "دليل لاكتشاف خدمات الرعاية الصحية.", "https://brainsait-healthcare-directory.pages.dev", "product"),
  ("doctor-hub", "BrainSAIT Doctor's Hub", "منصة الأطباء", "Healthcare", "رعاية صحية", "healthcare", "product",
   "Unified doctor-facing platform for visits, coding and claims.", "منصة موحدة للأطباء للزيارات والترميز والمطالبات.", "https://brainsait-doctor-hub.pages.dev", "product"),
  ("private-strategy-session", "Private Strategy Session — 60 min", "جلسة استراتيجية خاصة", "Consulting", "استشارات", "business", "service",
   "60-minute healthcare AI / NPHIES / architecture consultation.", "جلسة استشارية في الذكاء الاصطناعي الصحي وNPHIES والهندسة التقنية.", None, "service"),
  ("travel-code-vault", "Travel Code — Secure Vault", "تشفير السفر — الخزنة الآمنة", "Travel", "سفر", "travel", "product",
   "AR heritage + AI concierge + secure identity + payments and connectivity.", "منصة سفر ذكية تجمع التراث والواقع المعزز والذكاء الاصطناعي والهوية الآمنة.", "https://travel-code-secure-vault.pages.dev", "product"),
  ("ai-claims-reconciliation", "AI Claims Reconciliation", "مطابقة المطالبات بالذكاء الاصطناعي", "RCM / Insurance", "المطالبات والتأمين", "healthcare", "product",
   "AI reconciliation of insurance claims using Excel/Sheets and Saudi RCM rules.", "مطابقة المطالبات بالذكاء الاصطناعي وفق دورة الإيرادات الصحية السعودية.", "https://brainsait-innovation.pages.dev", "product"),
  ("clinics-directory", "Riyadh Clinics Directory", "دليل عيادات الرياض", "Healthcare", "رعاية صحية", "healthcare", "product",
   "Riyadh clinics directory with smart booking positioning.", "دليل عيادات الرياض مع توجه للحجز الذكي.", "https://clinics-pages.pages.dev", "product"),
  ("un-innovation-toolkit", "UN Innovation Toolkit", "حقيبة أدوات الابتكار الأممية", "Innovation", "ابتكار", "education", "product",
   "21 innovation tools, five pillars, diagnostics and 10 learning modules.", "21 أداة ابتكار، 5 ركائز، تشخيص و10 وحدات تعليمية.", "https://brainsait-innovation.pages.dev", "product"),
  ("gtm-playbook", "GTM Playbook — Saudi Health AI", "دليل دخول السوق", "GTM / Business", "الأعمال والتسويق", "business", "product",
   "Saudi health-AI GTM course, tools, posts, SEO content and readiness assessment.", "برنامج دخول سوق الذكاء الاصطناعي الصحي السعودي.", "https://brainsait-gtm-arabic.pages.dev", "product"),
  ("basma-voice-agent", "Basma AI Voice Agent", "بسمة — المساعد الصوتي", "Healthcare AI", "ذكاء اصطناعي صحي", "healthcare", "demo",
   "Bilingual AI healthcare voice assistant: appointments, eligibility, claims, records, labs, radiology.", "بسمة: مساعد صحي صوتي ذكي ثنائي اللغة.", "https://portal.brainsait.org", "demo"),
  ("hnh-platform", "HNH — Hospital Digital Experience", "تجربة المستشفى الرقمية", "Hospital", "مستشفيات", "healthcare", "demo",
   "Full hospital digital experience with booking, doctors, branches and Basma.", "تجربة مستشفى رقمية متكاملة مع الحجز والأطباء وبسمة.", "https://hnh.brainsait.org", "demo"),
  ("veinforge-novel", "VeinForge — Medical Novel", "فينفورج — رواية طبية", "Medical Publishing", "نشر طبي", "novel", "product",
   "Cinematic medical novel focused on hematology.", "رواية طبية سينمائية عن أمراض الدم.", "https://veinforge-novel.pages.dev", "product"),
  ("boneforge-novel", "BoneForge — Medical Novel", "بونفورج — رواية العظام", "Medical Publishing", "نشر طبي", "novel", "product",
   "Cinematic orthopedic medical novel.", "رواية العظام الصامدة.", "https://boneforge-novel.pages.dev", "product"),
  ("traumaforge-novel", "TraumaForge — Medical Novel", "تراومافورج — رواية الطوارئ", "Medical Publishing", "نشر طبي", "novel", "product",
   "Emergency medicine cinematic novel.", "رواية الطوارئ والإصابات.", "https://traumaforge-novel.pages.dev", "product"),
  ("shadowforge-novel", "ShadowForge — Medical Novel", "شادوفورج — رواية الأشعة", "Medical Publishing", "نشر طبي", "novel", "product",
   "Radiology and noir fiction cinematic novel.", "رواية الأشعة والظلال.", "https://shadowforge-novel.pages.dev", "product"),
  ("cellforge-novel", "CellForge — Medical Novel", "سيلفورج — رواية الخلية", "Medical Publishing", "نشر طبي", "novel", "product",
   "Oncology/pathology cinematic novel.", "رواية الخلية المتمردة.", "https://cellforge-novel.pages.dev", "product"),
  ("melissa-hospitality", "Melissa Riyadh Collection", "ميليسا — مجموعة الرياض", "Hospitality", "ضيافة", "travel", "demo",
   "Luxury hospitality concept rooted in Arabian heritage.", "تجربة ضيافة فاخرة مستوحاة من التراث العربي.", "https://melissa-hotel.pages.dev", "demo"),
  ("ecareplus-portal", "eCarePlus Portal", "بوابة الرعاية الموحدة", "Healthcare Platform", "منصة رعاية صحية", "healthcare", "demo",
   "BrainSAIT healthcare operating portal integrating BSMA, GIVC, SBS and governance interfaces.", "بوابة BrainSAIT الموحدة للرعاية الصحية.", "https://brainsait-healthcare-c6e.pages.dev", "demo"),
  ("nphies-linc", "NPHIES-Linc", "أنفيس-لينك", "NPHIES", "أنفيس", "healthcare", "demo",
   "NPHIES integration service with eligibility, claims, prior-auth and COC endpoints.", "خدمة تكامل NPHIES للأهلية والمطالبات والموافقات.", "https://nphies.brainsait.org", "demo"),
  ("museum-hilton", "Human & Saudi Cultural Museum", "المتحف الثقافي السعودي", "Culture / Tourism", "ثقافة وسياحة", "travel", "demo",
   "AI-powered immersive Saudi cultural museum concept for Hilton.", "متحف ثقافي سعودي غامر مدعوم بالذكاء الاصطناعي.", "https://museum-hilton.pages.dev", "demo"),
  ("bsa-rcp-academy", "BSA-RCP Academy — Professional Certification", "أكاديمية شهادة RCP", "Education", "تعليم", "education", "product",
   "12-week Saudi healthcare AI and revenue-cycle professional certification.", "شهادة مهنية في الذكاء الاصطناعي الصحي ودورة الإيرادات.", "https://brainsait-academy-live.pages.dev", "product"),
  ("nphies-drg-kb", "NPHIES DRG Knowledge Base", "قاعدة معرفة NPHIES وDRG", "Knowledge / NPHIES", "معرفة / أنفيس", "healthcare", "product",
   "DRG use cases, validation rules, AR-DRG codes and payer workflows.", "حالات استخدام DRG وقواعد التحقق ورموز AR-DRG.", "https://nphies-drg-kb.pages.dev", "product"),
  ("hetzner-guide", "Hetzner Guide — Arabic Infrastructure", "دليل Hetzner السحابي", "Infrastructure", "بنية تحتية", "development", "product",
   "Arabic cloud infrastructure guide for SSH, firewall, Fail2Ban, Nginx/SSL and deployment.", "دليل البنية السحابية وإدارة الخوادم بالعربية.", "https://hetzner-guide-ehn.pages.dev", "product"),
  ("iris-academy-pro", "InterSystems IRIS Academy — Arabic", "أكاديمية IRIS العربية", "Education", "تعليم", "education", "product",
   "30 Arabic courses, six tracks, 150+ hours.", "أكاديمية IRIS العربية: 30 دورة و6 مسارات و150+ ساعة.", "https://iris-academy.pages.dev", "product"),
  ("coding-ksa-academy", "Coding KSA Academy", "أكاديمية البرمجة السعودية", "Education", "تعليم", "education", "product",
   "Saudi coding education platform and course guide.", "أكاديمية تعليم البرمجة في السعودية.", "https://coding-ksa-academy.pages.dev", "product"),
  ("kdp-voice-agent", "KDP Voice Agent", "وكيل النشر الصوتي", "Publishing / AI", "نشر وذكاء اصطناعي", "publishing", "product",
   "AI book-publishing assistant with voice and Canva integration.", "مساعد نشر الكتب بالذكاء الاصطناعي والصوت وCanva.", "https://kdp.brainsait.org", "product"),
  ("masterlinc-clinical", "MASTERLINC — Clinical Intelligence", "ماسترلينك — الذكاء السريري", "Clinical AI", "ذكاء سريري", "healthcare", "demo",
   "Clinical intelligence for visits, coding, claims and AI documentation.", "منصة الذكاء السريري للزيارات والترميز والمطالبات.", "https://masterlinc.brainsait.org", "demo"),
  ("oid-identity", "BrainSAIT OID — Digital Health Identity", "منصة الهوية الصحية OID", "Identity", "هوية", "healthcare", "product",
   "Digital health identity and badging platform.", "منصة الهوية الصحية والشارات الرقمية.", "https://portals.brainsait.org", "product"),
  ("momfood-kitchen", "MomFood / لقمه يمه", "مطبخ لقمه يمه السحابي", "Food", "طعام", "food", "demo",
   "Sudanese cloud-kitchen and food-community concept.", "مطبخ سحابي ومجتمع طعام سوداني.", "https://momfood.de", "demo"),
  ("nara-cafe", "NARA Cafe & Majlis", "كافيه ومجلس نارا", "F&B", "ضيافة", "hospitality", "demo",
   "Cafe and majlis hospitality concept.", "مفهوم كافيه ومجلس للضيافة.", "https://naracafe.de", "demo"),
  ("wathq-linc-api", "Wathq Linc — Saudi Business Data API", "وثق لينك — API البيانات التجارية", "Business Data", "بيانات أعمال", "business", "product",
   "Saudi business-data API platform: registrations, contracts, agencies, property, employees.", "منصة API للبيانات التجارية السعودية: سجلات وعقود ووكالات وعقارات وموظفون.", "https://wathq.brainsait.de", "product"),
]


def main():
    data = json.loads(CAT.read_text())
    existing = {s["slug"] for s in data["solutions"]}
    added = 0
    for slug, name, nameAr, cat, catAr, sub, tier, tag, tagAr, url, comm in ASSETS:
        if slug in existing:
            # refresh the URL for existing entries
            for s in data["solutions"]:
                if s["slug"] == slug and url and not s.get("demoUrl"):
                    s["demoUrl"] = url
            continue
        data["solutions"].append({
            "slug": slug, "stage": "solutions", "name": name, "nameAr": nameAr,
            "category": cat, "categoryAr": catAr, "sub": sub, "tier": tier,
            "tagline": tag, "taglineAr": tagAr,
            "description": tag, "descriptionAr": tagAr,
            "price": None, "billingEn": "on request", "billingAr": "عند الطلب",
            "free": False, "image": None, "badges": [comm == "product" and "product" or "demo"],
            "benefits": [], "formats": None, "whatsIncluded": [],
            "faqs": [], "faqAr": [], "rating": None, "users": None,
            "flag": None, "demoUrl": url, "limitedDemo": False,
            "shopifyUrl": None, "shopifyHandle": None, "sku": None, "available": True,
            "commercial": comm,
        })
        added += 1
    json.dump(data, open(CAT, "w"), ensure_ascii=False, indent=2)
    print(f"added {added} new solutions (total {len(data['solutions'])})")


if __name__ == "__main__":
    main()
