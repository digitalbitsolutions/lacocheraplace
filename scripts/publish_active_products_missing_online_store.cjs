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
    const value = cleaned.slice(separator + 1).trim().replace(/^['"]|['"]$/g, "");
    if (!process.env[key]) process.env[key] = value;
  }
}

async function listProductsAndPublication() {
  const products = [];
  let after = null;
  let publications = [];
  do {
    const data = await shopifyGraphQL(
      `#graphql
      query MissingOnlineStoreProducts($after: String) {
        publications(first: 20) { nodes { id name } }
        products(first: 100, after: $after) {
          pageInfo { hasNextPage endCursor }
          nodes { id handle title vendor status onlineStoreUrl }
        }
      }`,
      { after },
    );
    publications = data.publications.nodes;
    products.push(...data.products.nodes);
    after = data.products.pageInfo.hasNextPage ? data.products.pageInfo.endCursor : null;
  } while (after);
  return { products, publications };
}

async function publish(productId, publicationId) {
  const data = await shopifyGraphQL(
    `#graphql
    mutation PublishMissingProduct($id: ID!, $input: [PublicationInput!]!, $publicationId: ID!) {
      publishablePublish(id: $id, input: $input) {
        publishable { publishedOnPublication(publicationId: $publicationId) }
        userErrors { field message }
      }
    }`,
    { id: productId, input: [{ publicationId }], publicationId },
  );
  const errors = data.publishablePublish.userErrors || [];
  if (errors.length) throw new Error(errors.map((error) => error.message).join(" | "));
}

async function main() {
  loadEnvFile(path.resolve(process.cwd(), ".env.local"));
  const apply = process.argv.includes("--apply");
  await verifyShopifyConnection();
  const { products, publications } = await listProductsAndPublication();
  const onlineStore = publications.find((publication) => publication.name === "Online Store");
  if (!onlineStore) throw new Error("No se encontró la publicación Online Store.");
  const missing = products.filter((product) => product.status === "ACTIVE" && !product.onlineStoreUrl);
  console.log(`Productos activos sin Online Store: ${missing.length}`);
  for (const product of missing) {
    if (apply) await publish(product.id, onlineStore.id);
    console.log(`${apply ? "PUBLISHED" : "WOULD PUBLISH"} ${product.handle} | ${product.vendor}`);
  }
}

main().catch((error) => {
  console.error(`ERROR: ${error.message}`);
  process.exit(1);
});
