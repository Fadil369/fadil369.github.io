#!/usr/bin/env python3
"""rebuild_solutions.py — replace the solutions catalog with the EXACT 37-asset
inventory provided by the owner. Uses the audit's names, categories and
Store/Demo classification. Rendered identically to Learn (pcard via ProductCard).

Safe to re-run (idempotent — rebuilds the whole solutions array).
"""
import json
from pathlib import Path

CAT = Path.home() / "fadil369.github.io" / "src" / "data" / "catalog.json"

# id, name, nameAr, category, categoryAr, sub, tier, tagline, taglineAr, url, commercial, price_sar
# commercial: product (Store) | demo (Solutions Lab) | service
INVENTORY = [
 ("neural-cloud-portal","Neural Cloud Portal","بوابة نيورال كلاود","AI / Cloud","ذكاء اصطناعي / سحابة","ai","platform",
  "Bilingual, audio-ready AI/cloud portal with voice interface, facilities, incubation and MCP links.","بوابة سحابية وذكاء اصطناعي ثنائية اللغة وجاهزة للصوت.","https://neural-cloud.pages.dev","demo",None),
 ("brainsait-neural-cloud","BrainSAIT Neural Cloud","نيورال كلاود برينسايت","AI / Cloud","ذكاء اصطناعي / سحابة","ai","platform",
  "Alternate deployment of Neural Cloud.","نسخة بديلة من نيورال كلاود.","https://brainsait-neural-cloud.pages.dev","demo",None),
 ("healthcare-directory","Healthcare Directory","دليل الرعاية الصحية","Healthcare","رعاية صحية","healthcare","product",
  "Healthcare discovery and directory platform.","دليل لاكتشاف خدمات الرعاية الصحية.","https://brainsait-healthcare-directory.pages.dev","product",None),
 ("doctor-hub","Doctor's Hub","منصة الأطباء","Healthcare","رعاية صحية","healthcare","product",
  "Unified doctor-facing platform.","منصة موحدة للأطباء.","https://brainsait-doctor-hub.pages.dev","product",None),
 ("private-strategy-session","Private Strategy Session","جلسة استراتيجية خاصة","Consulting","استشارات","business","service",
  "60-minute healthcare AI / NPHIES / architecture consultation (SAR 2,390).","جلسة استشارية في الذكاء الاصطناعي الصحي وNPHIES والهندسة التقنية.","https://calendly.com/brainsait","service",2390),
 ("travel-code-secure-vault","Travel Code Secure Vault","تشفير السفر — الخزنة الآمنة","Travel","سفر","travel","product",
  "AR heritage + AI concierge + secure identity + payments and connectivity.","منصة سفر ذكية تجمع التراث والواقع المعزز والذكاء الاصطناعي والهوية الآمنة.","https://travel-code-secure-vault.pages.dev","product",None),
 ("healthcare-directory-v2","Healthcare Directory v2","دليل الرعاية الصحية v2","Healthcare","رعاية صحية","healthcare","product",
  "Healthcare directory deployment.","نشر لدليل الرعاية الصحية.","https://brainsait-healthcare-c6e.pages.dev","product",None),
 ("browser-ui","Browser UI","واجهة المتصفح","Developer","مطوّر","development","demo",
  "Browser-style interface prototype.","نموذج واجهة متصفح ذكية.","https://browser-ui-f4s.pages.dev","demo",None),
 ("ai-claims-reconciliation","AI Claims Reconciliation","مطابقة المطالبات بالذكاء الاصطناعي","Insurance / RCM","التأمين / دورة الإيرادات","healthcare","product",
  "AI reconciliation of insurance claims using Excel/Google Sheets and Saudi RCM rules.","مطابقة المطالبات بالذكاء الاصطناعي وفق دورة الإيرادات الصحية السعودية.","https://brainsait-innovation.pages.dev","product",None),
 ("clinics-directory","Riyadh Clinics Directory","دليل عيادات الرياض","Healthcare","رعاية صحية","healthcare","product",
  "Riyadh clinics directory with booking positioning.","دليل عيادات الرياض مع توجه للحجز الذكي.","https://clinics-pages.pages.dev","product",None),
 ("un-innovation-toolkit","UN Innovation Toolkit","حقيبة أدوات الابتكار","Innovation / Education","ابتكار / تعليم","education","product",
  "21 innovation tools, five pillars, diagnostics and 10 learning modules.","21 أداة ابتكار، 5 ركائز، تشخيص و10 وحدات تعليمية.","https://brainsait-innovation.pages.dev","product",None),
 ("sbs","GIVC-SBS — Saudi Billing System","نظام الفوترة السعودي GIVC-SBS","Healthcare / RCM","رعاية صحية / فوترة","healthcare","demo",
  "Saudi Billing System solution.","حل نظام الفوترة السعودي.","https://sbs-elfadil.pages.dev","demo",None),
 ("gtm-playbook","GTM Playbook — Saudi Health AI","دليل دخول السوق","GTM / Business","الأعمال والتسويق","business","product",
  "Saudi health-AI GTM course, tools, posts, SEO content and readiness assessment.","برنامج دخول سوق الذكاء الاصطناعي الصحي السعودي.","https://brainsait-gtm-arabic.pages.dev","product",None),
 ("portals","BrainSAIT Portals","بوابة منظومة برينسايت","Healthcare Platform","منصة رعاية صحية","healthcare","demo",
  "Enterprise portal gateway for the BrainSAIT ecosystem.","بوابة منظومة برينسايت المؤسسية.","https://portals.brainsait.org","demo",None),
 ("basma-voice-agent","Basma AI Voice Agent","بسمة — المساعد الصوتي","Healthcare AI","ذكاء اصطناعي صحي","healthcare","demo",
  "Bilingual AI healthcare voice assistant: appointments, eligibility, claims, records, labs, radiology.","بسمة: مساعد صحي صوتي ذكي ثنائي اللغة.","https://portal.brainsait.org","demo",None),
 ("hnh","HNH — Hospital Digital Experience","تجربة المستشفى الرقمية","Hospital / Enterprise","مستشفيات / مؤسسات","healthcare","demo",
  "Full hospital digital experience with booking, doctors, branches and Basma.","تجربة مستشفى رقمية متكاملة مع الحجز والأطباء وبسمة.","https://hnh.brainsait.org","demo",None),
 ("veinforge","VeinForge","فينفورج","Medical Publishing","نشر طبي","novel","product",
  "Cinematic medical novel focused on hematology.","رواية طبية سينمائية عن أمراض الدم.","https://veinforge-novel.pages.dev","product",None),
 ("boneforge","BoneForge","بونفورج","Medical Publishing","نشر طبي","novel","product",
  "Cinematic orthopedic medical novel.","رواية العظام الصامدة.","https://boneforge-novel.pages.dev","product",None),
 ("traumaforge","TraumaForge","تراومافورج","Medical Publishing","نشر طبي","novel","product",
  "Emergency medicine cinematic novel.","رواية الطوارئ والإصابات.","https://traumaforge-novel.pages.dev","product",None),
 ("shadowforge","ShadowForge","شادوفورج","Medical Publishing","نشر طبي","novel","product",
  "Radiology + noir fiction.","رواية الأشعة والظلال.","https://shadowforge-novel.pages.dev","product",None),
 ("cellforge","CellForge","سيلفورج","Medical Publishing","نشر طبي","novel","product",
  "Oncology/pathology cinematic novel.","رواية الخلية المتمردة.","https://cellforge-novel.pages.dev","product",None),
 ("melissa-hospitality","Melissa Riyadh Collection","مجموعة ميليسا — الرياض","Hospitality","ضيافة","hospitality","demo",
  "Luxury hospitality concept rooted in Arabian heritage.","تجربة ضيافة فاخرة مستوحاة من التراث العربي.","https://melissa-hotel.pages.dev","demo",None),
 ("ecareplus","eCarePlus Portal","بوابة الرعاية الموحدة","Healthcare Platform","منصة رعاية صحية","healthcare","demo",
  "BrainSAIT healthcare operating portal integrating BSMA, GIVC, SBS and governance.","بوابة برينسايت الموحدة للرعاية الصحية.","https://brainsait-healthcare-c6e.pages.dev","demo",None),
 ("nphies-linc","NPHIES-Linc","أنفيس-لينك","NPHIES","أنفيس","healthcare","demo",
  "NPHIES integration service with eligibility, claims, prior-auth and COC endpoints.","خدمة تكامل أنفيس للأهلية والمطالبات والموافقات.","https://nphies.brainsait.org","demo",None),
 ("museum-hilton","Human & Saudi Cultural Museum","المتحف الثقافي السعودي","Culture / Tourism","ثقافة / سياحة","travel","demo",
  "AI-powered immersive Saudi cultural museum concept for Hilton.","متحف ثقافي سعودي غامر مدعوم بالذكاء الاصطناعي.","https://museum-hilton.pages.dev","demo",None),
 ("bsa-rcp-academy","BSA-RCP Academy","أكاديمية RCP","Education","تعليم","education","product",
  "12-week Saudi healthcare AI and revenue-cycle professional certification.","شهادة مهنية في الذكاء الاصطناعي الصحي ودورة الإيرادات.","https://brainsait-academy-live.pages.dev","product",None),
 ("nphies-drg-kb","NPHIES DRG Knowledge Base","قاعدة معرفة NPHIES وDRG","Knowledge / NPHIES","معرفة / أنفيس","healthcare","product",
  "DRG use cases, validation rules, AR-DRG codes and payer workflows.","حالات استخدام DRG وقواعد التحقق ورموز AR-DRG.","https://nphies-drg-kb.pages.dev","product",None),
 ("hetzner-guide","Hetzner Guide","دليل Hetzner","Infrastructure","بنية تحتية","development","product",
  "Arabic cloud infrastructure guide for SSH, firewall, Fail2Ban, Nginx/SSL and deployment.","دليل البنية السحابية وإدارة الخوادم بالعربية.","https://hetzner-guide-ehn.pages.dev","product",None),
 ("iris-academy","InterSystems IRIS Academy","أكاديمية IRIS","Education","تعليم","education","product",
  "30 Arabic courses, six tracks, 150+ hours.","أكاديمية IRIS العربية: 30 دورة و6 مسارات و150+ ساعة.","https://iris-academy.pages.dev","product",None),
 ("coding-ksa-academy","Coding KSA Academy","أكاديمية البرمجة السعودية","Education","تعليم","education","product",
  "Saudi coding education platform and course guide.","أكاديمية تعليم البرمجة في السعودية.","https://coding-ksa-academy.pages.dev","product",None),
 ("kdp-voice-agent","KDP Voice Agent","وكيل النشر الصوتي KDP","Publishing / AI","نشر / ذكاء اصطناعي","publishing","product",
  "AI book-publishing assistant with voice and Canva integration.","مساعد نشر الكتب بالذكاء الاصطناعي والصوت وCanva.","https://kdp.brainsait.org","product",None),
 ("masterlinc","MASTERLINC","ماسترلينك","Clinical AI","ذكاء سريري","healthcare","demo",
  "Clinical intelligence for visits, coding, claims and AI documentation.","منصة الذكاء السريري للزيارات والترميز والمطالبات.","https://masterlinc.brainsait.org","demo",None),
 ("oid-identity","BrainSAIT OID","منصة الهوية OID","Identity","هوية","healthcare","product",
  "Digital health identity and badging platform.","منصة الهوية الصحية والشارات الرقمية.","https://portals.brainsait.org","product",None),
 ("momfood","MomFood / لقمه يمه","مطبخ لقمه يمه السحابي","Food","طعام","food","demo",
  "Sudanese cloud-kitchen and food-community concept.","مطبخ سحابي ومجتمع طعام سوداني.","https://momfood.de","demo",None),
 ("nara-cafe","NARA Cafe & Majlis","كافيه ومجلس نارا","F&B","ضيافة","hospitality","demo",
  "Cafe and majlis hospitality concept.","مفهوم كافيه ومجلس للضيافة.","https://naracafe.de","demo",None),
 ("wathq-linc","Wathq Linc","وثق لينك","Business Data API","بيانات أعمال","business","product",
  "Saudi business-data API platform: commercial registrations, contracts, agencies, property, employees.","منصة API للبيانات التجارية السعودية: سجلات وعقود ووكالات وعقارات وموظفون.","https://wathq.brainsait.de","product",None),
 ("tawnia","Tawnia — Awareness Portal","بوابة توعية","Healthcare","رعاية صحية","healthcare","demo",
  "Healthcare awareness portal.","بوابة توعية صحية.","https://tawnia.elfadil.com","demo",None),
]


def _slug(pid):
    import re
    return re.sub(r"[^a-z0-9]+", "-", pid.lower()).strip("-")


def main():
    data = json.loads(CAT.read_text())
    solutions = []
    for pid, name, nameAr, cat, catAr, sub, tier, tag, tagAr, url, comm, price in INVENTORY:
        solutions.append({
            "slug": _slug(pid), "stage": "solutions",
            "name": name, "nameAr": nameAr,
            "category": cat, "categoryAr": catAr, "sub": sub, "tier": tier,
            "tagline": tag, "taglineAr": tagAr,
            "description": tag, "descriptionAr": tagAr,
            "price": price, "billingEn": "on request" if price else None,
            "billingAr": "عند الطلب" if price else None,
            "free": False, "image": None,
            "badges": [("🛒 " if comm == "product" else "🧩 " if comm == "demo" else "💰 ") + comm.title()],
            "benefits": [], "formats": None, "whatsIncluded": [],
            "faqs": [], "faqAr": [], "rating": None, "users": None,
            "flag": None, "demoUrl": url, "limitedDemo": False,
            "shopifyUrl": None, "shopifyHandle": None, "sku": None, "available": True,
            "commercial": comm,
        })
    data["solutions"] = solutions
    # add subcategories used by the inventory
    subs = {s["id"]: s for s in data["subcategories"]}
    for sid, en, ar in [("ai","AI / Cloud","ذكاء اصطناعي / سحابة"),
                        ("travel","Travel & Tourism","سفر وسياحة"),
                        ("education","Education","تعليم"),
                        ("hospitality","Hospitality & F&B","ضيافة"),
                        ("publishing","Publishing","نشر"),
                        ("food","Food","طعام")]:
        if sid not in subs:
            data["subcategories"].append({"id": sid, "en": en, "ar": ar})
    json.dump(data, open(CAT, "w"), ensure_ascii=False, indent=2)
    print(f"rebuilt solutions: {len(solutions)} assets (exactly the provided inventory)")
    from collections import Counter
    print("mix:", dict(Counter(s["commercial"] for s in solutions)))
    print("subs:", dict(Counter(s["sub"] for s in solutions)))


if __name__ == "__main__":
    main()
