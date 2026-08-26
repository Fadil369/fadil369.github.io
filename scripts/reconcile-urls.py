#!/usr/bin/env python3
"""Reconcile BrainSAIT frontstore catalog <-> Shopify storefront.

Wires shopifyUrl (real checkout) + true Shopify price for confirmed
purchasable solutions that currently only offer a demo/book flow.
Price/availability verified against Shopify admin API and Storefront API.
"""
import json, sys

CAT_PATH = 'src/data/catalog.json'

# slug -> Shopify retail price SAR (verified live + availableForSale=true)
PRICE = {
    'ai-claims-reconciliation': 24900,
    'basma-voice-agent': 24900,
    'boneforge': 7990,
    'browser-ui': 7990,
    'bsa-rcp-academy': 7990,
    'cellforge': 7990,
    'clinics-directory': 11900,
    'coding-ksa-academy': 7990,
    'doctor-hub': 11900,
    'gtm-playbook': 7990,
    'healthcare-directory': 7990,
    'healthcare-directory-v2': 11900,
    'hetzner-guide': 7990,
    'hnh': 11900,
    'iris-academy': 11900,
    'kdp-voice-agent': 24900,
    'melissa-hospitality': 7990,
    'momfood': 11900,
    'museum-hilton': 11900,
    'nara-cafe': 7990,
    'neural-cloud-portal': 11900,
    'nphies-drg-kb': 7990,
    'oid-identity': 499,
    'portals': 24900,
    'private-strategy-session': 2390,
    'sbs': 24900,
    'shadowforge': 7990,
    'tawnia': 24900,
    'traumaforge': 7990,
    'travel-code-secure-vault': 24900,
    'un-innovation-toolkit': 7990,
    'veinforge': 7990,
    'wathq-linc': 24900,
    'givc': 24900,  # already wired; ensure price set
}

def main():
    d = json.load(open(CAT_PATH, encoding='utf-8'))
    changed = []
    for p in d.get('solutions', []):
        slug = p.get('slug')
        if slug in PRICE:
            url = f'https://store.brainsait.org/products/{slug}'
            if p.get('shopifyUrl') != url:
                p['shopifyUrl'] = url
            if p.get('price') != PRICE[slug]:
                # keep demoUrl (secondary demo/book) but price now proceeds to checkout
                p['price'] = PRICE[slug]
            changed.append(slug)
    json.dump(d, open(CAT_PATH, 'w', encoding='utf-8'), ensure_ascii=False, indent=2)
    print(f'Wired shopifyUrl + price for {len(changed)} solutions:')
    for s in sorted(changed):
        print('  ', s)

if __name__ == '__main__':
    main()
