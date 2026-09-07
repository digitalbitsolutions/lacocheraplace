#!/usr/bin/env node
/* eslint-disable no-console */

const fs = require("fs");
const path = require("path");
const { shopifyGraphQL } = require("./lib/shopify-auth.cjs");

const INPUT = "C:/Users/LC/Downloads/servicios_proveedores_chiclayo.csv";

function loadAppEnvironment() {
  for (const line of fs.readFileSync("shopify-provider-admin/.env", "utf8").split(/\r?\n/)) {
    const cleaned = line.trim();
    if (!cleaned || cleaned.startsWith("#")) continue;
    const separator = cleaned.indexOf("=");
    if (separator < 0) continue;
    const key = cleaned.slice(0, separator).trim();
    let value = cleaned.slice(separator + 1).trim();
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1);
    }
    process.env[key] = value;
  }
}

function parseCsv(raw) {
  const rows = [];
  let row = [];
  let field = "";
  let quoted = false;
  for (let index = 0; index < raw.length; index += 1) {
    const char = raw[index];
    if (quoted && char === '"' && raw[index + 1] === '"') {
      field += '"';
      index += 1;
    } else if (char === '"') quoted = !quoted;
    else if (!quoted && char === ",") {
      row.push(field);
      field = "";
    } else if (!quoted && (char === "\n" || char === "\r")) {
      if (char === "\r" && raw[index + 1] === "\n") index += 1;
      row.push(field);
      if (row.some(Boolean)) rows.push(row);
      row = [];
      field = "";
    } else field += char;
  }
  row.push(field);
  if (row.some(Boolean)) rows.push(row);
  const [headers, ...data] = rows;
  return data.map((values) => Object.fromEntries(headers.map((header, index) => [header, values[index] || ""])));
}

function slugify(value) {
  return String(value || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

function descriptionFor(row) {
  return [
    row.description,
    `<p>Fuente de verificaci\u00f3n: <a href="${row.evidence_url}">${row.evidence_url}</a></p>`,
    `<p>Estado de verificaci\u00f3n: ${row.verification_status}.</p>`,
  ].filter(Boolean).join("\n");
}

async function main() {
  loadAppEnvironment();
  const rows = parseCsv(fs.readFileSync(path.resolve(INPUT), "utf8").replace(/^\uFEFF/, ""));
  const updated = [];
  for (const row of rows) {
    const serviceKey = slugify(`${row.service_name}-${row.provider_slug}`);
    const found = await shopifyGraphQL(`#graphql
      query FindService($query: String!) {
        products(first: 1, query: $query) { nodes { id handle } }
      }
    `, { query: `handle:${serviceKey}` });
    const product = found.products.nodes[0];
    if (!product) throw new Error(`No se encontro ${serviceKey}`);
    const changed = await shopifyGraphQL(`#graphql
      mutation FixDescription($product: ProductUpdateInput!) {
        productUpdate(product: $product) {
          product { handle }
          userErrors { field message }
        }
      }
    `, { product: { id: product.id, descriptionHtml: descriptionFor(row) } });
    const errors = changed.productUpdate.userErrors || [];
    if (errors.length) throw new Error(errors.map((error) => error.message).join(" | "));
    updated.push(product.handle);
  }
  console.log(`Corrected descriptions: ${updated.length}`);
}

main().catch((error) => {
  console.error(`ERROR: ${error.message}`);
  process.exit(1);
});
