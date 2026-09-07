#!/usr/bin/env node
/* eslint-disable no-console */
const fs = require("fs");
const path = require("path");
const { shopifyGraphQL, verifyShopifyConnection } = require("./lib/shopify-auth.cjs");

function loadEnv(filePath) {
  for (const line of fs.readFileSync(filePath, "utf8").split(/\r?\n/)) {
    const match = line.match(/^([A-Za-z_][A-Za-z0-9_]*)=(.*)$/);
    if (match && !process.env[match[1]]) process.env[match[1]] = match[2].trim();
  }
}

function getHandle() {
  const index = process.argv.indexOf("--handle");
  const handle = index >= 0 ? String(process.argv[index + 1] || "").trim() : "";
  if (!handle || !/^[a-z0-9][a-z0-9-]*$/.test(handle)) throw new Error("Use --handle con un handle válido.");
  return handle;
}

async function inspect(handle) {
  const data = await shopifyGraphQL(
    `#graphql
    query ProductForSafeDeletion($query: String!) {
      products(first: 2, query: $query) {
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
    { query: `handle:${handle}` },
  );
  return data.products.nodes.find((product) => product.handle === handle) || null;
}

async function remove(id) {
  const data = await shopifyGraphQL(
    `#graphql
    mutation SafeProductDelete($input: ProductDeleteInput!) {
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
  const handle = getHandle();
  const apply = process.argv.includes("--apply");
  await verifyShopifyConnection();
  const product = await inspect(handle);
  if (!product) throw new Error(`No existe el producto ${handle}.`);
  const reportPath = path.resolve(`project-docs/exports/deleted-product-${handle}.json`);
  const report = { generatedAt: new Date().toISOString(), apply, product, deletedProductId: null };
  fs.writeFileSync(reportPath, `${JSON.stringify(report, null, 2)}\n`, "utf8");
  console.log(`${apply ? "DELETE" : "WOULD DELETE"} ${product.handle} | ${product.title} | ${product.vendor}`);
  if (!apply) return console.log(`Respaldo: ${reportPath}`);
  report.deletedProductId = await remove(product.id);
  fs.writeFileSync(reportPath, `${JSON.stringify(report, null, 2)}\n`, "utf8");
  console.log(`DELETED ${report.deletedProductId}`);
}

main().catch((error) => {
  console.error(`ERROR: ${error.message}`);
  process.exit(1);
});
