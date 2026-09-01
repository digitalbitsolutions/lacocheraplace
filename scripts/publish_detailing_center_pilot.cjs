#!/usr/bin/env node
/* eslint-disable no-console */

const fs = require("fs");
const path = require("path");
const { shopifyGraphQL } = require("./lib/shopify-auth.cjs");

const HANDLES = [
  "tratamiento-ceramico-detailing-center",
  "pulido-general-detailing-center",
  "polarizado-detailing-center",
  "full-body-ppf-detailing-center",
  "ppf-proteccion-de-partes-detailing-center",
];

function loadEnvFile(filePath) {
  if (!fs.existsSync(filePath)) return;
  for (const line of fs.readFileSync(filePath, "utf8").split(/\r?\n/)) {
    const cleaned = line.trim();
    if (!cleaned || cleaned.startsWith("#")) continue;
    const eq = cleaned.indexOf("=");
    if (eq < 0) continue;
    const key = cleaned.slice(0, eq).trim();
    let value = cleaned.slice(eq + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) value = value.slice(1, -1);
    if (!process.env[key]) process.env[key] = value;
  }
}

function loadEnvironment() {
  const cwd = process.cwd();
  [
    path.join(cwd, ".env"),
    path.join(cwd, ".env.local"),
    path.join(cwd, "private-data/shopify-admin-clientcreds.env"),
    path.join(cwd, "private-data/shopify-admin-legacy.env"),
    path.join(cwd, "private-data/shopify-admin.env"),
    path.join(cwd, "shopify-provider-admin/.env"),
  ].forEach(loadEnvFile);
  process.env.SHOPIFY_SHOP ||= "lacocheraplace.myshopify.com";
}

function assertNoUserErrors(payload, label) {
  const errors = payload?.userErrors || [];
  if (errors.length) throw new Error(`${label}: ${errors.map((e) => e.message).join(" | ")}`);
}

async function getState({ includePublications = true } = {}) {
  const publicationSelection = includePublications
    ? "publications(first: 20) { nodes { id name } }"
    : "";
  return shopifyGraphQL(
    `#graphql
      query DetailingCenterPublicationAudit($query: String!) {
        ${publicationSelection}
        products(first: 20, query: $query) {
          nodes {
            id
            handle
            title
            status
            onlineStoreUrl
          }
        }
      }`,
    { query: HANDLES.map((handle) => `handle:${handle}`).join(" OR ") },
  );
}

async function activateProduct(product) {
  const data = await shopifyGraphQL(
    `#graphql
      mutation ActivatePilotProduct($product: ProductUpdateInput!) {
        productUpdate(product: $product) {
          product { id handle status }
          userErrors { field message }
        }
      }`,
    { product: { id: product.id, status: "ACTIVE" } },
  );
  assertNoUserErrors(data.productUpdate, `No se pudo activar ${product.handle}`);
  return data.productUpdate.product;
}

async function publishProduct(productId, publicationId) {
  const data = await shopifyGraphQL(
    `#graphql
      mutation PublishPilotProduct($id: ID!, $input: [PublicationInput!]!, $publicationId: ID!) {
        publishablePublish(id: $id, input: $input) {
          publishable { publishedOnPublication(publicationId: $publicationId) }
          userErrors { field message }
        }
      }`,
    { id: productId, input: [{ publicationId }], publicationId },
  );
  assertNoUserErrors(data.publishablePublish, `No se pudo publicar ${productId}`);
  return data.publishablePublish.publishable;
}

async function main() {
  loadEnvironment();
  const apply = process.argv.includes("--apply");
  const explicitPublicationId = (process.env.SHOPIFY_ONLINE_STORE_PUBLICATION_ID || "").trim();
  const before = await getState({ includePublications: !explicitPublicationId });
  const onlineStore = explicitPublicationId
    ? { id: explicitPublicationId, name: "Online Store" }
    : before.publications.nodes.find((publication) => publication.name === "Online Store");
  if (!onlineStore) throw new Error("No se encontró la publicación Online Store.");
  const byHandle = new Map(before.products.nodes.map((product) => [product.handle, product]));
  const missing = HANDLES.filter((handle) => !byHandle.has(handle));
  if (missing.length) throw new Error(`Faltan productos: ${missing.join(", ")}`);

  const result = { ok: true, apply, publication: onlineStore, products: [] };
  for (const handle of HANDLES) {
    const product = byHandle.get(handle);
    if (!apply) {
      result.products.push({ handle, status: product.status, action: "would_activate_and_publish" });
      continue;
    }
    const activated = product.status === "ACTIVE" ? product : await activateProduct(product);
    await publishProduct(product.id, onlineStore.id);
    result.products.push({ handle, id: product.id, status: activated.status, action: "published" });
  }
  if (apply) result.after = await getState({ includePublications: false });
  console.log(JSON.stringify(result, null, 2));
}

main().catch((error) => {
  console.error(`ERROR: ${error.message}`);
  process.exit(1);
});
