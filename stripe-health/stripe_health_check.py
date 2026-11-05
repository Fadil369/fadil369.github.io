#!/usr/bin/env python3
"""Stripe Health Check — read-only, scored, bilingual (EN/AR) report.

Usage:  STRIPE_KEY=rk_live_... python3 stripe_health_check.py [--out report.md]
Use a RESTRICTED key with read-only access. The key is never printed or saved.
Only GET requests are made.
"""
import os, sys, requests, collections, datetime

KEY = os.environ.get("STRIPE_KEY", "")
if not KEY.startswith(("sk_", "rk_")):
    sys.exit("Set STRIPE_KEY to a (restricted, read-only) Stripe secret key.")
S = requests.Session(); S.auth = (KEY, "")
B = "https://api.stripe.com/v1"

def get(path, **q):
    r = S.get(B + path, params=q, timeout=30)
    j = r.json() if r.content else {}
    return (j if r.status_code == 200 else None), j.get("error", {}).get("code")

findings = []  # (points_lost, severity, en, ar)
def flag(lost, sev, en, ar): findings.append((lost, sev, en, ar))

acct, _ = get("/account")
if not acct: sys.exit("Cannot read the account with this key.")
live = KEY.startswith(("sk_live", "rk_live"))
cur = acct.get("default_currency", "").upper()

# 1. Can the business get paid?
if not acct.get("charges_enabled"):
    flag(30, "critical", "Charges are disabled: customers cannot pay.", "المدفوعات معطّلة: لا يستطيع العملاء الدفع.")
if not acct.get("payouts_enabled"):
    flag(25, "critical", "Payouts are disabled: money stays in Stripe. Finish bank details/verification in Dashboard → Settings → Payouts.",
         "التحويلات البنكية معطّلة: تبقى الأموال داخل Stripe. أكمل بيانات البنك والتحقق من الإعدادات.")
req = acct.get("requirements") or {}
if req.get("currently_due"):
    flag(15, "high", f"Stripe is waiting for information: {', '.join(req['currently_due'][:5])}.",
         "تطلب Stripe معلومات إضافية لإبقاء الحساب فعّالًا.")

# 2. Balance and recurring drains
bal, _ = get("/balance")
if bal:
    neg = [b for b in bal["available"] if b["amount"] < 0]
    if neg:
        flag(15, "high", "Negative balance: " + ", ".join(f"{b['amount']/100:.2f} {b['currency'].upper()}" for b in neg) + ".",
             "الرصيد سالب: رسوم تُخصم دون إيرادات تغطيها.")
bt, _ = get("/balance_transactions", limit=100)
if bt:
    fees = collections.Counter(t["description"].split(" (")[0] for t in bt["data"] if t["type"] == "stripe_fee" and t.get("description"))
    for name, n in fees.items():
        if n >= 3:
            flag(10, "medium", f"Recurring Stripe fee “{name}” appears {n} times. Cancel it if unused.",
                 f"رسم متكرر من Stripe باسم «{name}» ظهر {n} مرات. ألغِه إن لم تكن بحاجة إليه.")

# 3. Failed payments
ch, _ = get("/charges", limit=100)
if ch and ch["data"]:
    failed = sum(1 for c in ch["data"] if c["status"] == "failed")
    if failed / len(ch["data"]) > 0.25:
        flag(10, "medium", f"{failed}/{len(ch['data'])} recent charges failed. Review Radar rules and payment methods.",
             f"فشل {failed} من {len(ch['data'])} عملية دفع حديثة. راجع قواعد Radar وطرق الدفع.")

# 4. Dead integrations
wh, _ = get("/webhook_endpoints", limit=50)
if wh:
    off = [w for w in wh["data"] if w["status"] != "enabled"]
    if off: flag(5, "low", f"{len(off)} webhook endpoint(s) are disabled. Delete or re-enable them.",
                 f"{len(off)} نقطة Webhook معطّلة. احذفها أو أعد تفعيلها.")
    if not any(w["status"] == "enabled" for w in wh["data"]):
        flag(10, "medium", "No enabled webhook: your site is not told when a payment succeeds.",
             "لا توجد Webhook فعّالة: موقعك لا يعلم بنجاح الدفع.")

# 5. Customer experience
portal, _ = get("/billing_portal/configurations", limit=1)
subs, _ = get("/subscriptions", limit=1, status="all")
if subs and subs["data"] and portal is not None and not portal["data"]:
    flag(5, "low", "You have subscriptions but no customer portal.", "لديك اشتراكات دون بوابة عملاء.")
tax, _ = get("/tax/registrations", limit=1)
if tax is not None and not tax["data"]:
    flag(5, "low", "No tax registration configured.", "لا يوجد تسجيل ضريبي مُعدّ.")
links, _ = get("/payment_links", limit=100)
if links:
    blanks = [l for l in links["data"] if l["active"] and not l.get("after_completion", {}).get("redirect")
              and l.get("after_completion", {}).get("type") != "redirect"]
    if len(blanks) > 3:
        flag(3, "low", f"{len(blanks)} active payment links show only the default thank-you page. A redirect to delivery/onboarding converts better.",
             f"{len(blanks)} روابط دفع تعرض صفحة الشكر الافتراضية فقط. التحويل لصفحة التسليم أفضل.")

if not live:
    flag(0, "info", "Test-mode key used: results describe test data only.", "استُخدم مفتاح تجريبي: النتائج تخص بيانات الاختبار فقط.")

score = max(0, 100 - sum(f[0] for f in findings))
grade = "A" if score >= 90 else "B" if score >= 75 else "C" if score >= 55 else "D"
order = {"critical": 0, "high": 1, "medium": 2, "low": 3, "info": 4}
findings.sort(key=lambda f: order[f[1]])

out = [f"# Stripe Health Check / فحص صحة حساب Stripe",
       f"*{datetime.date.today()} · {acct.get('business_profile',{}).get('name') or acct['id']} · {cur}*", "",
       f"## Score / الدرجة: **{score}/100 ({grade})**", ""]
if not findings: out.append("No issues found. / لا توجد مشكلات.")
for lost, sev, en, ar in findings:
    out += [f"- **[{sev.upper()}]** {en}  ", f"  <span dir=\"rtl\">{ar}</span>"]
out += ["", "_Read-only check: no changes were made to the account. / فحص للقراءة فقط دون أي تغيير على الحساب._"]
text = "\n".join(out)
if "--out" in sys.argv:
    open(sys.argv[sys.argv.index("--out") + 1], "w").write(text + "\n")
print(text)
