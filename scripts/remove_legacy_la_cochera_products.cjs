#!/usr/bin/env node
/* eslint-disable no-console */
const fs = require("fs");
const path = require("path");
const { shopifyGraphQL, verifyShopifyConnection } = require("./lib/shopify-auth.cjs");

const HANDLES = ["lavado-xxl", "parking-badalona-2"];

function loadEnv(filePath) {
  for (const line of fs.readFileSync(filePath, "utf8").split(/\r?\n/)) {
    const match = line.match(/^([A-Za-z_][A-Za-z0-9_]*)=(.*)$/);
    if (match && !process.env[match[1]]) process.env[match[1]] = match[2].trim();
  }
}

async function inspect() {
  const data = await shopifyGraphQL(
    `#graphql
    query LegacyLaCocheraProducts($query: String!) {
      products(first: 10, query: $query) {
        nodes {
          id handle title descriptionHtml vendor productType status createdAt updatedAt onlineStoreUrl
          tags totalInventory
          media(first: 100) { nodes { id mediaContentType alt preview { image { url } } } }
          variants(first: 100) {
            nodes { id title price compareAtPrice inventoryQuantity selectedOptions { name value } }
          }
        }
      }
    }`,
    { query: HANDLES.map((handle) => `handle:${handle}`).join(" OR ") },
  );
  return data.products.nodes;
}

async function remove(id) {
  const data = await shopifyGraphQL(
    `#graphql
    mutation RemoveLegacyLaCocheraProduct($input: ProductDeleteInput!) {
      productDelete(input: $input) {
        deletedProductId
        userErrors { field message }
      }
    }`,
    { input: { id } },
  );
  const errors = data.productDelete.userErrors || [];
  if (errors.length) throw new Error(errors.map((error) => error.message).join(" | "));
  return data.productDelete.deletedProductId;
}

async function main() {
  loadEnv(path.resolve(process.cwd(), ".env.local"));
  const apply = process.argv.includes("--apply");
  await verifyShopifyConnection();
  const products = await inspect();
  const found = new Set(products.map((product) => product.handle));
  const missing = HANDLES.filter((handle) => !found.has(handle));
  if (missing.length) throw new Error(`No se encontraron: ${missing.join(", ")}`);
  if (products.some((product) => product.vendor !== "La Cochera Place")) {
    throw new Error("Uno de los productos ya no pertenece a La Cochera Place; se cancela por seguridad.");
  }
  const reportPath = path.resolve("project-docs/exports/removed-legacy-la-cochera-products.json");
  const report = { generatedAt: new Date().toISOString(), apply, products, deleted: [] };
  fs.writeFileSync(reportPath, `${JSON.stringify(report, null, 2)}\n`, "utf8");
  if (!apply) return console.log(`DRY RUN: se eliminarían ${products.length} productos. Respaldo: ${reportPath}`);
  for (const product of products) {
    const deletedProductId = await remove(product.id);
    report.deleted.push({ id: deletedProductId, handle: product.handle, title: product.title });
    fs.writeFileSync(reportPath, `${JSON.stringify(report, null, 2)}\n`, "utf8");
    console.log(`DELETED ${product.handle} (${product.title})`);
  }
}

main().catch((error) => {
  console.error(`ERROR: ${error.message}`);
  process.exit(1);
});
