/**
 * syncCatalog.js — Sync product catalog from Shopify to fadil369.github.io
 *
 * Usage:
 *   SHOPIFY_ADMIN_TOKEN=xxx node scripts/syncCatalog.js
 *
 * Fetches products from Shopify Admin API and updates src/data/catalog.json
 * with current prices, inventory, and availability.
 */

import { readFileSync, writeFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const SHOPIFY_ADMIN_TOKEN = process.env.SHOPIFY_ADMIN_TOKEN;
if (!SHOPIFY_ADMIN_TOKEN) {
  console.error('ERROR: SHOPIFY_ADMIN_TOKEN environment variable is required');
  process.exit(1);
}

const SHOPIFY_STORE = 'store.brainsait.de';
const CATALOG_PATH = join(dirname(fileURLToPath(import.meta.url)), '..', 'src', 'data', 'catalog.json');

async function fetchProducts(page = 1) {
  const url = `https://${SHOPIFY_STORE}/admin/api/2026-01/products.json?limit=250&page=${page}`;
  const response = await fetch(url, {
    headers: {
      'X-Shopify-Access-Token': SHOPIFY_ADMIN_TOKEN,
      'Content-Type': 'application/json',
    },
  });

  if (!response.ok) {
    throw new Error(`Shopify API error: ${response.status} ${response.statusText}`);
  }

  const data = await response.json();
  const products = data.products || [];

  // Check if there are more pages
  const linkHeader = response.headers.get('link') || '';
  const hasNextPage = linkHeader.includes('rel="next"');

  if (hasNextPage) {
    return [...products, ...(await fetchProducts(page + 1))];
  }

  return products;
}

function transformProduct(product) {
  // Transform Shopify product to front store catalog format
  const variants = product.variants || [];
  const firstVariant = variants[0];
  const price = firstVariant ? Number(firstVariant.price) : 0;
  const sku = firstVariant ? firstVariant.sku : '';
  const inventory = variants.reduce((sum, v) => sum + (v.inventory_quantity || 0), 0);

  return {
    slug: product.handle || product.id.toString(),
    stage: 'learn', // Default stage, can be overridden
    name: product.title || 'Untitled Product',
    nameAr: product.translations?.[0]?.title || product.title || '',
    category: product.vendor || 'General',
    categoryAr: product.vendor || '',
    sub: 'general',
    tier: 'standard',
    tagline: product.body_summary || product.description?.slice(0, 100) || '',
    taglineAr: '',
    description: product.description || '',
    descriptionAr: '',
    price: price,
    billingEn: 'one-time',
    billingAr: 'دفعة واحدة',
    image: product.images?.[0]?.src || '',
    badges: [],
    benefits: [],
    shopifyUrl: `https://${SHOPIFY_STORE}/products/${product.handle}`,
    shopifyVariantId: firstVariant ? firstVariant.id.toString() : '',
    inventory: inventory,
    available: inventory > 0,
    tags: product.tags || [],
  };
}

async function syncCatalog() {
  console.log('🔄 Fetching products from Shopify...');
  const products = await fetchProducts();
  console.log(`✅ Found ${products.length} products`);

  console.log('📝 Transforming products...');
  const transformed = products.map(transformProduct);

  // Load existing catalog
  const catalog = JSON.parse(readFileSync(CATALOG_PATH, 'utf8'));

  // Update learn products with Shopify data
  const existingSlugs = new Set(catalog.learn.map(p => p.slug));
  const updatedSlugs = new Set();

  transformed.forEach(product => {
    const existingIndex = catalog.learn.findIndex(p => p.slug === product.slug);
    if (existingIndex >= 0) {
      // Update existing product
      catalog.learn[existingIndex] = {
        ...catalog.learn[existingIndex],
        ...product,
        // Preserve existing benefits and badges if not in Shopify
        benefits: product.benefits.length > 0 ? product.benefits : catalog.learn[existingIndex].benefits,
        badges: product.badges.length > 0 ? product.badges : catalog.learn[existingIndex].badges,
      };
      updatedSlugs.add(product.slug);
    } else {
      // Add new product
      catalog.learn.push(product);
      updatedSlugs.add(product.slug);
    }
  });

  // Remove products that no longer exist in Shopify
  catalog.learn = catalog.learn.filter(p => updatedSlugs.has(p.slug));

  console.log(`📊 Updated ${updatedSlugs.size} products`);
  console.log(`📦 Total learn products: ${catalog.learn.length}`);

  // Write updated catalog
  writeFileSync(CATALOG_PATH, JSON.stringify(catalog, null, 2), 'utf8');
  console.log('✅ Catalog synced to', CATALOG_PATH);

  return {
    total: products.length,
    updated: updatedSlugs.size,
    removed: existingSlugs.size - updatedSlugs.size,
  };
}

// Run sync
syncCatalog()
  .then(stats => {
    console.log('\n📈 Sync Results:');
    console.log(`   Total products: ${stats.total}`);
    console.log(`   Updated: ${stats.updated}`);
    console.log(`   Removed: ${stats.removed}`);
    process.exit(0);
  })
  .catch(err => {
    console.error('❌ Sync failed:', err.message);
    process.exit(1);
  });