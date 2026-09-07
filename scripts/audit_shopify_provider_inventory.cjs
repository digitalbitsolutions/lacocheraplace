#!/usr/bin/env node
/* eslint-disable no-console */
const fs = require("fs");
const path = require("path");
const { shopifyGraphQL, verifyShopifyConnection } = require("./lib/shopify-auth.cjs");

function loadEnvFile(filePath) {
  if (!fs.existsSync(filePath)) return;
  for (const line of fs.readFileSync(filePath, "utf8").split(/\r?\n/)) {
    const cleaned = line.trim();
    if (!cleaned || cleaned.startsWith("#")) continue;
    const separator = cleaned.indexOf("=");
    if (separator < 0) continue;
    const key = cleaned.slice(0, separator).trim();
    let value = cleaned.slice(separator + 1).trim();
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1);
    }
    if (!process.env[key]) process.env[key] = value;
  }
}

async function listProducts() {
  const products = [];
  let after = null;
  do {
    const data = await shopifyGraphQL(
      `#graphql
      query ProviderInventoryProducts($after: String) {
        products(first: 100, after: $after) {
          pageInfo { hasNextPage endCursor }
          nodes {
            id handle title vendor status productType tags onlineStoreUrl
            media(first: 1) { nodes { id } }
          }
        }
      }`,
      { after },
    );
    products.push(...data.products.nodes);
    after = data.products.pageInfo.hasNextPage ? data.products.pageInfo.endCursor : null;
  } while (after);
  return products;
}

async function listProfiles() {
  const profiles = [];
  let after = null;
  do {
    const data = await shopifyGraphQL(
      `#graphql
      query ProviderInventoryProfiles($after: String) {
        metaobjects(type: "provider_profile", first: 100, after: $after) {
          pageInfo { hasNextPage endCursor }
          nodes { id handle updatedAt fields { key value } }
        }
      }`,
      { after },
    );
    profiles.push(...data.metaobjects.nodes.map((node) => ({
      id: node.id,
      handle: node.handle,
      updatedAt: node.updatedAt,
      fields: Object.fromEntries(node.fields.map(({ key, value }) => [key, value])),
    })));
    after = data.metaobjects.pageInfo.hasNextPage ? data.metaobjects.pageInfo.endCursor : null;
  } while (after);
  return profiles;
}

async function main() {
  loadEnvFile(path.resolve(process.cwd(), ".env.local"));
  const shop = await verifyShopifyConnection();
  const [products, profiles] = await Promise.all([listProducts(), listProfiles()]);
  const vendorMap = new Map();
  for (const product of products) {
    const vendor = product.vendor || "(sin proveedor)";
    const current = vendorMap.get(vendor) || { vendor, products: 0, active: 0, onlineStoreVisible: 0, withMedia: 0, handles: [] };
    current.products += 1;
    if (product.status === "ACTIVE") current.active += 1;
    if (product.onlineStoreUrl) current.onlineStoreVisible += 1;
    if (product.media.nodes.length) current.withMedia += 1;
    current.handles.push(product.handle);
    vendorMap.set(vendor, current);
  }
  const report = {
    generatedAt: new Date().toISOString(),
    shop,
    totals: {
      products: products.length,
      activeProducts: products.filter((product) => product.status === "ACTIVE").length,
      productsWithMedia: products.filter((product) => product.media.nodes.length).length,
      onlineStoreVisibleProducts: products.filter((product) => product.onlineStoreUrl).length,
      vendors: vendorMap.size,
      providerProfiles: profiles.length,
    },
    vendors: [...vendorMap.values()].sort((a, b) => a.vendor.localeCompare(b.vendor)),
    providerProfiles: profiles.map((profile) => ({
      id: profile.id,
      handle: profile.handle,
      updatedAt: profile.updatedAt,
      displayName: profile.fields.display_name || "",
      catalogVendorName: profile.fields.catalog_vendor_name || "",
      city: profile.fields.city || "",
      country: profile.fields.country || "",
      status: profile.fields.status || "",
      logoSourceUrl: profile.fields.logo_source_url || "",
      gallerySourceUrls: profile.fields.gallery_source_urls || "",
    })),
  };
  console.log(JSON.stringify(report, null, 2));
}

main().catch((error) => {
  console.error(`ERROR: ${error.message}`);
  process.exit(1);
});
