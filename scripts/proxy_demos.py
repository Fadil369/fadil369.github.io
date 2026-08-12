#!/usr/bin/env python3
import json
path = "/home/fadil369/fadil369.github.io/src/data/catalog.json"
d = json.load(open(path))
proxy_hosts = {
    "neural-cloud.pages.dev", "brainsait-neural-cloud.pages.dev",
    "brainsait-healthcare-directory.pages.dev", "brainsait-doctor-hub.pages.dev",
    "travel-code-secure-vault.pages.dev", "brainsait-healthcare-c6e.pages.dev",
    "browser-ui-f4s.pages.dev", "clinics-pages.pages.dev",
    "brainsait-innovation.pages.dev", "sbs-elfadil.pages.dev",
    "brainsait-gtm-arabic.pages.dev", "veinforge-novel.pages.dev",
    "boneforge-novel.pages.dev", "traumaforge-novel.pages.dev",
    "shadowforge-novel.pages.dev", "cellforge-novel.pages.dev",
    "melissa-hotel.pages.dev", "museum-hilton.pages.dev",
    "brainsait-academy-live.pages.dev", "nphies-drg-kb.pages.dev",
    "hetzner-guide-ehn.pages.dev", "iris-academy.pages.dev",
    "coding-ksa-academy.pages.dev",
}
changed = 0
for s in d["solutions"]:
    u = s.get("demoUrl") or ""
    host = u.replace("https://", "").rstrip("/")
    if host in proxy_hosts:
        s["demoUrl"] = "https://build-apply.brainsait.org/demo/" + s["slug"]
        changed += 1
json.dump(d, open(path, "w"), ensure_ascii=False, indent=2)
print("updated", changed, "demo URLs to proxy")
