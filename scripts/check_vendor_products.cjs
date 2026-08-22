#!/usr/bin/env node
/* eslint-disable no-console */
const fs = require("fs");
const path = require("path");
const { shopifyGraphQL } = require("./lib/shopify-auth.cjs");

function loadEnvFile(filePath) {
  if (!filePath || !fs.existsSync(filePath)) return;
  const raw = fs.readFileSync(filePath, "utf8");
  for (const line of raw.split(/\r?\n/)) {
    const cleaned = line.trim();
    if (!cleaned || cleaned.startsWith("#")) continue;
    const eq = cleaned.indexOf("=");
    if (eq < 0) continue;
    const key = cleaned.slice(0, eq).trim();
    let value = cleaned.slice(eq + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    if (!process.env[key]) process.env[key] = value;
  }
}

async function main() {
  const vendor = process.argv.slice(2).join(" ").trim();
  if (!vendor) {
    throw new Error("Uso: node scripts/check_vendor_products.cjs \"Vendor Name\"");
  }

  [
    "private-data/shopify-admin-clientcreds.env",
    "private-data/shopify-admin-legacy.env",
    "private-data/shopify-admin.env",
    "shopify-provider-admin/.env",
  ].forEach((p) => loadEnvFile(path.resolve(process.cwd(), p)));

  const query = `#graphql
    query VendorProducts($query: String!) {
      products(first: 100, query: $query) {
        nodes {
          id
          handle
          title
          vendor
          status
        }
      }
    }`;

  const data = await shopifyGraphQL(query, { query: `vendor:"${vendor}"` });
  const products = data.products.nodes || [];
  console.log(JSON.stringify({ vendor, count: products.length, products }, null, 2));
}

main().catch((error) => {
  console.error(`ERROR: ${error.message}`);
  process.exit(1);
});

