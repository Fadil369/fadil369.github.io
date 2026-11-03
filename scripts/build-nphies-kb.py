#!/usr/bin/env python3
"""Build the NPHIES knowledge base served by /bpr/nphies from the owner's local document set.

    python3 -m venv .venv && .venv/bin/pip install openpyxl
    .venv/bin/python scripts/build-nphies-kb.py --src ~/nphies

Publishing rule: this repository is public, so only workbooks carrying the "Public" sensitivity
label are read, and the build stops if that label is missing. Third-party terminologies (ICD-10-AM,
AR-DRG, GMDN, SBS, LOINC, WHO, FDI) are never written out, even when a public workbook lists them.
Run with --private-out <dir> to also write the restricted member bundle; that directory must stay
outside this repository.
"""
import argparse
import collections
import datetime as dt
import hashlib
import json
import os
import re
import sys
import warnings
import zipfile

import openpyxl

warnings.filterwarnings("ignore")

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OUT = os.path.join(ROOT, "public", "assets", "bpr-data", "nphies", "v1")
ADVICE = os.path.join(ROOT, "scripts", "data", "nphies-advice.json")
PUBLIC_OVERLAY = os.path.join(ROOT, "scripts", "data", "nphies-public-overlays.json")

SOURCES = {
    "profiles": "nphies -profiles v5.4.2_DRG Release_OBA_25 June 2026.xlsx",
    "profiles_prev": "Nphies profiles v5.3.1.xlsx",
    "codes": "nphies -Codable Concept v5.5.2 _DRG Release_OBA_25 June 2026.xlsx",
    "codes_prev": "Nphies Codeable Concept v5.4.xlsx",
}
VERSIONS = {"profiles": "5.4.2", "profiles_prev": "5.3.1", "codes": "5.5.2", "codes_prev": "5.4"}
OPEN_COPYRIGHT = {"nphies", "hl7 international.", "hl7 international", "health level 7"}
# Profile slug (meta.profile) to the workbook sheet that specifies it.
PROFILE_SHEETS = {
    "bundle": "Bundle (Message)", "message-header": "MessageHeader",
    "institutional-claim": "Claim Institutional", "professional-claim": "Claim Professional",
    "pharmacy-claim": "Claim Pharmacy", "oral-claim": "Claim Dental", "vision-claim": "Claim Vision",
    "institutional-priorauth": "Authorization institutional", "professional-priorauth": "Authorization professional",
    "pharmacy-priorauth": "Authorization Pharmacy", "oral-priorauth": "Authorization Dental", "vision-priorauth": "Authorization Vision",
    "prescriber-priorauth": "Prescriber Auth Request", "advanced-authorization": "Advanced Authorization",
    "claim-response": "Claim Response", "prior-auth-response": "Authorization Response",
    "eligibility-request": "Eligibility Request", "eligibility-response": "Eligibility Response",
    "patient": "Patient", "coverage": "Coverage", "encounter": "Encounter", "practitioner": "Practitioner",
    "provider-organization": "Organization Provider", "insurer-organization": "Organization Payer",
    "policyholder-organization": "Organization PolicyHolder", "location": "Location (Department)",
    "medicationRequest": "Medication Request", "communication": "Communication",
    "communication-request": "Communication Request", "payment-notice": "Payment Notice",
    "payment-reconciliation": "Payment Reconciliation", "vision-prescription": "VisionPrescription",
    "task": "Task", "task-gss": "GSS-Task", "service-request-referral": "Service Request",
}
LICENSED = re.compile(r"(icd-10|drg|maternity|cause-of-death|rta-diagnosis|morphology|work-related|procedures|oral-health|imaging|laboratory|medical-devices|medication-codes|scientific-codes|tooth-specific)", re.I)
CLEAN_URL = re.compile(r'^["“”\s]+|["“”\s]+$')


def fail(msg):
    sys.exit(f"build-nphies-kb: {msg}")


def text(v):
    return "" if v is None else str(v).strip()


def sha256(path):
    h = hashlib.sha256()
    with open(path, "rb") as f:
        for chunk in iter(lambda: f.read(1 << 20), b""):
            h.update(chunk)
    return h.hexdigest()


def sensitivity_label(path):
    """The enabled Microsoft sensitivity label name in the workbook package, or None."""
    z = zipfile.ZipFile(path)
    if "docProps/custom.xml" not in z.namelist():
        return None
    xml = z.read("docProps/custom.xml").decode("utf8", "ignore")
    props = dict(re.findall(r'name="(MSIP_Label_[^"]+)"[^>]*>\s*<[^>]*>([^<]*)<', xml))
    for key, value in props.items():
        if key.endswith("_Name"):
            prefix = key[: -len("_Name")]
            if props.get(prefix + "_Enabled", "").lower() == "true":
                return value
    return None


def open_public(src, key):
    path = os.path.join(src, SOURCES[key])
    if not os.path.exists(path):
        fail(f"missing source: {path}")
    label = sensitivity_label(path)
    if label != "Public":
        fail(f"refusing {SOURCES[key]}: sensitivity label is {label!r}, not 'Public'")
    return openpyxl.load_workbook(path, read_only=True, data_only=True), path, label


def rows_of(wb, title):
    ws = next((w for w in wb.worksheets if w.title.strip().lower() == title.strip().lower()), None)
    if ws is None:
        return None
    out = []
    for row in ws.iter_rows(values_only=True):
        cells = [text(c) for c in row]
        while cells and not cells[-1]:
            cells.pop()
        if cells:
            out.append(cells)
    return out


def table(rows, width):
    """Code tables start with a header row; keep rows that have a code."""
    return [r + [""] * (width - len(r)) for r in rows[1:] if r and r[0]]


def code_systems(wb, defects):
    rows = rows_of(wb, "nphies CodeSystems")
    head = [c.lower() for c in rows[0]]
    at = {name: head.index(name) for name in ("code system", "code", "display", "cs copyright", "title")}
    out, current = {}, None
    for row in rows[1:]:
        row = row + [""] * (len(head) - len(row))
        raw = row[at["code system"]]
        if raw:
            url = CLEAN_URL.sub("", raw)
            if url != raw:
                defects.append(f"Code system URL has stray characters: {raw[:70]}")
            current = out.setdefault(url, {"url": url, "title": row[at["title"]], "copyright": row[at["cs copyright"]], "codes": {}})
        code = row[at["code"]].strip()
        # A row can hold "---" or a sentence pointing at an external list instead of a code.
        if current and code and (code == "---" or len(code) > 60):
            current["pointer"] = True
        elif current and code:
            current["codes"][code] = row[at["display"]].strip()
    return out


def value_sets(wb):
    rows = rows_of(wb, "nphies ValueSets")
    head = [c.lower() for c in rows[0]]
    vi, ci = head.index("value set"), head.index("codesystem  url")
    out, current = collections.defaultdict(list), None
    for row in rows[1:]:
        row = row + [""] * (len(head) - len(row))
        if row[vi]:
            current = CLEAN_URL.sub("", row[vi])
        if current and row[ci]:
            url = CLEAN_URL.sub("", row[ci])
            if url not in out[current]:
                out[current].append(url)
    return out


def profiles(wb, defects):
    out = {}
    for slug, sheet in PROFILE_SHEETS.items():
        rows = rows_of(wb, sheet)
        if not rows:
            fail(f"profile sheet not found: {sheet}")
        head_at = next((i for i, r in enumerate(rows) if r and r[0].lower() == "path"), None)
        if head_at is None:
            fail(f"no Path header in sheet: {sheet}")
        head = [c.lower() for c in rows[head_at]]
        ix = {k: head.index(k) for k in ("path", "min", "max", "type")}
        vs = head.index("valueset") if "valueset" in head else None
        elements = []
        for row in rows[head_at + 1:]:
            row = row + [""] * (len(head) - len(row))
            path = row[ix["path"]].strip()
            if not re.match(r"^[A-Za-z]+\.", path):
                continue
            binding = CLEAN_URL.sub("", row[vs]) if vs is not None else ""
            elements.append([path, row[ix["min"]], row[ix["max"]], row[ix["type"]], binding if binding.startswith("http") else ""])
            if " " in path:
                defects.append(f"Profile sheet {sheet}: element path contains a space: {path}")
        out[slug] = {"sheet": sheet, "elements": elements}
    return out


def changes(wb_codes, wb_profiles):
    """Change-log rows from the two public workbooks, newest releases only."""
    logs = []
    for rows, kind in ((rows_of(wb_codes, "Change Log"), "code set"), (rows_of(wb_profiles, "Update"), "profile")):
        head = [c.lower() for c in rows[0]]
        for row in rows[1:]:
            row = row + [""] * (7 - len(row))
            logs.append({"kind": kind, "version": row[0], "what": row[1], "change": row[2],
                         "date": row[3][:10], "release": row[5] if len(head) > 5 else ""})
    keep = re.compile(r"^(v?5\.5|v?5\.4)", re.I)
    return [e for e in logs if keep.match(e["version"])]


def build_public(src):
    wb_p, path_p, label_p = open_public(src, "profiles")
    wb_pp, path_pp, label_pp = open_public(src, "profiles_prev")
    wb_c, path_c, label_c = open_public(src, "codes")
    wb_cp, path_cp, label_cp = open_public(src, "codes_prev")
    defects = []
    cs_new = code_systems(wb_c, defects)
    cs_old = code_systems(wb_cp, [])
    vs_new = value_sets(wb_c)
    overlay = json.load(open(PUBLIC_OVERLAY, encoding="utf-8"))
    for source in overlay.get("sources", []):
        if source.get("label") != "Public":
            fail(f"refusing non-public overlay source: {source.get('document', 'unknown')}")
        source_path = os.path.join(src, source["document"])
        if not os.path.isfile(source_path):
            fail(f"missing public overlay source: {source_path}")
        if sensitivity_label(source_path) != "Public":
            fail(f"refusing overlay source with non-public sensitivity label: {source['document']}")
        if sha256(source_path) != source.get("sha256"):
            fail(f"public overlay source changed since review: {source['document']}")
    for url, codes in overlay.get("codeSystems", {}).items():
        if url not in cs_new:
            fail(f"public overlay code system is absent from the current source: {url}")
        cs_new[url]["codes"].update(codes)

    reasons = table(rows_of(wb_c, "Appendix=rejection-reason"), 4)
    advice = json.load(open(ADVICE, encoding="utf-8"))
    missing = [r[0] for r in reasons if r[0] not in advice["codes"]]
    extra = sorted(set(advice["codes"]) - {r[0] for r in reasons})
    if missing or extra:
        fail(f"advice out of step with the rejection list. Missing: {missing}. Unknown: {extra}")
    rejection = [{"code": r[0], "official": r[2] or r[1], **advice["codes"][r[0]]} for r in reasons]

    errors = [{"code": r[0], "display": r[1]} for r in table(rows_of(wb_c, "Appendix=adjudication-error"), 3)]
    practice = [{"code": r[0], "display": r[1].strip()} for r in table(rows_of(wb_c, "Appendix=practice-codes"), 3)]
    clinic = [{"code": r[0], "display": r[1].strip()} for r in table(rows_of(wb_c, "appendix=clinic-speciality"), 3)]
    adjust = [{"code": r[0], "display": r[1].strip()} for r in table(rows_of(wb_c, "Appendix=adjustment-reason"), 2)]

    systems = []
    for url, cs in sorted(cs_new.items()):
        open_terms = cs["copyright"].lower() in OPEN_COPYRIGHT and not cs.get("pointer") and not LICENSED.search(url)
        systems.append({"url": url, "title": cs["title"], "count": len(cs["codes"]),
                        "codes": cs["codes"] if open_terms else None})

    prof = profiles(wb_p, defects)

    old_urls, new_urls = set(cs_old), set(cs_new)
    added_codes = {u.rsplit("/", 1)[-1]: sorted(set(cs_new[u]["codes"]) - set(cs_old[u]["codes"]))
                   for u in sorted(old_urls & new_urls) if set(cs_new[u]["codes"]) - set(cs_old[u]["codes"])}
    sheets_new = {w.title.strip() for w in wb_p.worksheets}
    sheets_old = {w.title.strip() for w in wb_pp.worksheets}
    diff = {
        "profiles": {"from": VERSIONS["profiles_prev"], "to": VERSIONS["profiles"],
                     "sheetsAdded": sorted(sheets_new - sheets_old), "sheetsRemoved": sorted(sheets_old - sheets_new)},
        "codes": {"from": VERSIONS["codes_prev"], "to": VERSIONS["codes"],
                  "systemsAdded": sorted(u.rsplit("/", 1)[-1] for u in new_urls - old_urls),
                  "systemsRemoved": sorted(u.rsplit("/", 1)[-1] for u in old_urls - new_urls),
                  "codesAdded": added_codes},
    }
    log = changes(wb_c, wb_p)
    for wb in (wb_p, wb_pp, wb_c, wb_cp):
        wb.close()

    os.makedirs(OUT, exist_ok=True)
    files = {
        "rejection-reasons": {"owners": advice["owners"], "routes": advice["routes"], "families": advice["families"], "items": rejection},
        "adjudication-errors": {"items": errors},
        "practice-codes": {"items": practice},
        "clinic-specialties": {"items": clinic},
        "adjustment-reasons": {"items": adjust},
        "code-systems": {"valueSets": vs_new, "items": systems},
        "profiles": {"items": prof},
        "changes": {"diff": diff, "log": log},
    }
    written = {}
    for name, body in files.items():
        path = os.path.join(OUT, name + ".json")
        with open(path, "w", encoding="utf-8") as f:
            json.dump(body, f, ensure_ascii=False, separators=(",", ":"))
        written[name] = {"path": f"/assets/bpr-data/nphies/v1/{name}.json", "bytes": os.path.getsize(path)}

    def src_entry(key, path, label):
        return {"document": SOURCES[key], "version": VERSIONS[key], "label": label, "sha256": sha256(path)}

    manifest = {
        "name": "BPR NPHIES knowledge base", "apiVersion": "v1",
        "generated": dt.date.today().isoformat(),
        "publisher": "BrainSAIT", "status": "Independent reference. Not issued or endorsed by CHI or NPHIES.",
        "guidance": "Fields named official carry the source wording. Plain-language and action fields are BrainSAIT guidance.",
        "sources": [src_entry("profiles", path_p, label_p), src_entry("profiles_prev", path_pp, label_pp),
                    src_entry("codes", path_c, label_c), src_entry("codes_prev", path_cp, label_cp)] +
                   [{key: source[key] for key in ("document", "version", "label", "sha256", "scope")}
                    for source in overlay.get("sources", [])],
        "excluded": "SBS, ICD-10-AM, AR-DRG, GMDN, LOINC and validation-rule text are not republished here.",
        "counts": {"rejectionReasons": len(rejection), "adjudicationErrors": len(errors), "practiceCodes": len(practice),
                   "clinicSpecialties": len(clinic), "adjustmentReasons": len(adjust), "codeSystems": len(systems),
                   "profiles": len(prof)},
        "sourceDefectsNormalized": defects,
        "files": written,
    }
    with open(os.path.join(OUT, "manifest.json"), "w", encoding="utf-8") as f:
        json.dump(manifest, f, ensure_ascii=False, indent=1)
    print("public:", json.dumps(manifest["counts"]), "| total bytes:", sum(v["bytes"] for v in written.values()))


def build_private(src, out):
    """Restricted member bundle. Never written inside the repository."""
    real = os.path.realpath(out)
    if real.startswith(ROOT + os.sep) or real == ROOT:
        fail("--private-out must be outside this repository")
    os.makedirs(real, exist_ok=True)

    def book(name):
        return openpyxl.load_workbook(os.path.join(src, name), read_only=True, data_only=True)

    wb = book("nphies -Validation Error Codes v2.9.2_DRG Release_OBA_25 June 2026.xlsx")
    rows = rows_of(wb, "Nphies Rules and Codes")
    head = rows[0][:13]
    rules = [dict(zip(head, (r + [""] * 13)[:13])) for r in rows[1:] if r and r[0]]
    conf = rows_of(wb, "configurable rules")
    market = rows_of(wb, "Market Updates")
    wb.close()

    wb = book("nphies Payer IDs.xlsx")
    payers = [{"nphiesId": r[0], "en": r[1].strip(), "ar": r[2].strip() if len(r) > 2 else ""} for r in rows_of(wb, "Payer")[1:]]
    wb.close()
    wb = book("nphies TPA IDs.xlsx")
    tpas = [{"nphiesId": r[0], "en": r[1].strip()} for r in rows_of(wb, "TPA")[1:]]
    wb.close()
    wb = book("Wave consolidate 02 Nov 26.xlsx")
    wave = [{"chi": r[0], "nphiesId": r[1], "name": r[2].strip(), "status": r[3], "wave": r[4]} for r in rows_of(wb, "Sheet1")[1:] if len(r) >= 5]
    wb.close()
    wb = book("Daman Intelligence KPIs v1.2.xlsx")
    rows = rows_of(wb, "Sheet1")
    kpis = [dict(zip(rows[0], (r + [""] * 6)[:6])) for r in rows[1:]]
    wb.close()
    wb = book("SBS_V3_Electronic Code List 3.4.xlsx")
    rows = rows_of(wb, "SBS V3 Technical Implementation")
    h = {c: i for i, c in enumerate(rows[0])}
    sbs = []
    for r in rows[1:]:
        r = r + [""] * (len(h) - len(r))
        sbs.append({"code": r[h["SBS Code Hyphenated"]], "short": r[h["Short Description"]], "long": r[h["Long Description"]],
                    "update": r[h["Update Type"]], "inactive": r[h["Inactive Date"]], "reactivated": r[h["Reactivated Date"]],
                    "mapping": r[h["Inactive Code Mapping"]], "sex": r[h["Sex"]], "sexLevel": r[h["SType"]], "ageLow": r[h["AgeL"]],
                    "ageHigh": r[h["AgeH"]], "ageLevel": r[h["AType"]], "chapter": r[h["Chapter Number"]], "block": r[h["Block Number"]]})
    wb.close()

    for name, body in {"rules": rules, "rules-configurable": conf, "rules-market-updates": market, "payers": payers, "tpas": tpas,
                       "facilities": wave, "daman-kpis": kpis, "sbs-v3": sbs}.items():
        with open(os.path.join(real, name + ".json"), "w", encoding="utf-8") as f:
            json.dump(body, f, ensure_ascii=False, separators=(",", ":"))
    with open(os.path.join(real, "README.txt"), "w", encoding="utf-8") as f:
        f.write("Restricted NPHIES member bundle. Source files are labelled Internal Use, Restricted, or are of unconfirmed status.\n"
                "Do not commit this directory or serve it publicly. Confirm redistribution rights with CHI first.\n")
    print(f"private: {len(rules)} rules, {len(sbs)} SBS, {len(wave)} facilities -> {real}")


def main():
    ap = argparse.ArgumentParser(description=__doc__)
    ap.add_argument("--src", default=os.path.expanduser("~/nphies"))
    ap.add_argument("--private-out")
    args = ap.parse_args()
    build_public(args.src)
    if args.private_out:
        build_private(args.src, args.private_out)


if __name__ == "__main__":
    main()
