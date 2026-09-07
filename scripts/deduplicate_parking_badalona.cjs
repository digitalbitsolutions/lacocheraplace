#!/usr/bin/env node
/* eslint-disable no-console */
const fs = require("fs");
const path = require("path");
const { shopifyGraphQL, verifyShopifyConnection } = require("./lib/shopify-auth.cjs");

const HANDLES = ["parking-badalona", "parking-badalona-2"];

function loadEnv(filePath) {
  for (const line of fs.readFileSync(filePath, "utf8").split(/\r?\n/)) {
    const match = line.match(/^([A-Za-z_][A-Za-z0-9_]*)=(.*)$/);
    if (match && !process.env[match[1]]) process.env[match[1]] = match[2].trim();
  }
}

async function inspect() {
  const data = await shopifyGraphQL(
    `#graphql
    query ParkingBadalonaDuplicates($query: String!) {
      products(first: 10, query: $query) {
        nodes {
          id handle title vendor status createdAt updatedAt onlineStoreUrl
          descriptionHtml totalInventory tags
          media(first: 100) { nodes { id mediaContentType alt preview { image { url } } } }
          variants(first: 100) {
            nodes { id title price inventoryQuantity selectedOptions { name value } }
          }
        }
      }
    }`,
    { query: HANDLES.map((handle) => `handle:${handle}`).join(" OR ") },
  );
  return data.products.nodes;
}

function score(product) {
  return [
    product.status === "ACTIVE" ? 1 : 0,
    product.onlineStoreUrl ? 1 : 0,
    product.descriptionHtml.length,
    product.media.nodes.length,
    product.variants.nodes.length,
    product.totalInventory,
    Date.parse(product.updatedAt),
    Date.parse(product.createdAt),
  ];
}

function compareProducts(left, right) {
  const a = score(left);
  const b = score(right);
  for (let index = 0; index < a.length; index += 1) {
    if (a[index] !== b[index]) return b[index] - a[index];
  }
  return left.handle.localeCompare(right.handle);
}

async function deleteProduct(id) {
  const data = await shopifyGraphQL(
    `#graphql
    mutation DeleteParkingDuplicate($input: ProductDeleteInput!) {
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
  if (products.length !== 2) throw new Error(`Se esperaban 2 duplicados y se encontraron ${products.length}.`);
  const ranked = [...products].sort(compareProducts);
  const keep = ranked[0];
  const remove = ranked[1];
  const reportPath = path.resolve("project-docs/exports/parking-badalona-deduplication.json");
  const report = {
    generatedAt: new Date().toISOString(), apply,
    criterion: "active, published, description completeness, media, variants, inventory, updatedAt, createdAt",
    keep, remove, deletedProductId: null,
  };
  fs.writeFileSync(reportPath, `${JSON.stringify(report, null, 2)}\n`, "utf8");
  console.log(`KEEP ${keep.handle} | created=${keep.createdAt} | updated=${keep.updatedAt} | media=${keep.media.nodes.length} | inventory=${keep.totalInventory}`);
  console.log(`REMOVE ${remove.handle} | created=${remove.createdAt} | updated=${remove.updatedAt} | media=${remove.media.nodes.length} | inventory=${remove.totalInventory}`);
  if (!apply) return console.log(`DRY RUN. Respaldo: ${reportPath}`);
  report.deletedProductId = await deleteProduct(remove.id);
  report.after = await inspect();
  fs.writeFileSync(reportPath, `${JSON.stringify(report, null, 2)}\n`, "utf8");
  console.log(`DELETED ${remove.handle} (${report.deletedProductId})`);
}

main().catch((error) => {
  console.error(`ERROR: ${error.message}`);
  process.exit(1);
});
