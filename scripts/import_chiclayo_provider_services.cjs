#!/usr/bin/env node
/* eslint-disable no-console */

const fs = require("fs");
const path = require("path");
const { shopifyGraphQL, verifyShopifyConnection } = require("./lib/shopify-auth.cjs");

const DEFAULT_INPUT = "C:/Users/LC/Downloads/servicios_proveedores_chiclayo.csv";
const DEFAULT_REPORT = "project-docs/exports/chiclayo-provider-services-import.json";

const CATEGORY_MAP = {
  productos_accesorios: "productos-y-accesorios-para-el-cuidado-automotriz",
  detailing: "detailing",
  mecanica: "mantenimiento-ligero",
  mantenimiento_automotriz: "mantenimiento-ligero",
  carwash: "lavado",
  neumaticos_llantas: "neumaticos-y-llantas",
};

function parseArgs(argv) {
  const args = { apply: false, input: DEFAULT_INPUT, report: DEFAULT_REPORT };
  for (let i = 2; i < argv.length; i += 1) {
    if (argv[i] === "--apply") args.apply = true;
    else if (argv[i] === "--input") args.input = argv[++i];
    else if (argv[i] === "--report") args.report = argv[++i];
    else throw new Error(`Argumento no reconocido: ${argv[i]}`);
  }
  return args;
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
      if (row.some((value) => value !== "")) rows.push(row);
      row = [];
      field = "";
    } else field += char;
  }
  row.push(field);
  if (row.some((value) => value !== "")) rows.push(row);
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

function normalize(row) {
  let category = CATEGORY_MAP[row.service_category];
  let offerType = "service";
  if (row.service_category === "baterias") {
    const service = slugify(row.service_name);
    category = service.startsWith("instalacion") ? "mantenimiento-ligero" : "productos-y-accesorios-para-el-cuidado-automotriz";
    offerType = service.startsWith("venta") ? "product" : "service";
  } else if (row.service_category === "productos_accesorios") offerType = "product";
  if (!category) throw new Error(`${row.provider_slug}: categorÃ­a sin mapa: ${row.service_category}`);
  if (!row.provider_name || !row.provider_slug || !row.service_name || !row.evidence_url || !row.verification_status) {
    throw new Error("Cada fila requiere proveedor, slug, servicio, evidencia y estado de verificaciÃ³n.");
  }
  const key = slugify(`${row.service_name}-${row.provider_slug}`);
  return {
    ...row,
    normalized_category: category,
    offer_type: offerType,
    service_key: key,
    handle: key,
  };
}

async function findProduct(serviceKey) {
  const data = await shopifyGraphQL(`#graphql
    query FindChiclayoService($query: String!) {
      products(first: 1, query: $query) { nodes { id handle title status } }
    }
  `, { query: `tag:service_key:${serviceKey}` });
  return data.products.nodes[0] || null;
}

async function createProduct(item) {
  const description = [item.description, `<p>Fuente de verificaciÃ³n: <a href="${item.evidence_url}">${item.evidence_url}</a></p>`, `<p>Estado de verificaciÃ³n: ${item.verification_status}.</p>`]
    .filter(Boolean)
    .join("\n");
  const data = await shopifyGraphQL(`#graphql
    mutation CreateChiclayoService($product: ProductCreateInput!) {
      productCreate(product: $product) {
        product { id handle title status }
        userErrors { field message }
      }
    }
  `, {
    product: {
      title: item.service_name,
      handle: item.handle,
      vendor: item.provider_name,
      productType: item.offer_type === "product" ? "Producto automotriz" : "Servicio",
      descriptionHtml: description,
      status: "DRAFT",
      tags: [
        "chiclayo",
        "pendiente-precio-pen",
        "pendiente-validacion-comercial",
        item.normalized_category,
        item.service_category,
        `proveedor-${item.provider_slug}`,
        `provider-${item.provider_slug}`,
        `service_key:${item.service_key}`,
        `verification-${item.verification_status}`,
        `offer-type-${item.offer_type}`,
      ],
    },
  });
  const result = data.productCreate;
  if (result.userErrors?.length) throw new Error(result.userErrors.map((error) => error.message).join(" | "));
  if (!result.product) throw new Error("Shopify no devolviÃ³ el producto creado.");
  return result.product;
}

async function main() {
  const args = parseArgs(process.argv);
  const items = parseCsv(fs.readFileSync(path.resolve(args.input), "utf8").replace(/^\uFEFF/, "")).map(normalize);
  const keys = new Set();
  for (const item of items) {
    if (keys.has(item.service_key)) throw new Error(`Servicio duplicado: ${item.service_key}`);
    keys.add(item.service_key);
  }
  const shop = await verifyShopifyConnection();
  const report = { generatedAt: new Date().toISOString(), mode: args.apply ? "apply" : "dry-run", shop, requested: items.length, planned: items.map(({ provider_name, provider_slug, service_name, normalized_category, offer_type, verification_status, handle }) => ({ provider_name, provider_slug, service_name, normalized_category, offer_type, verification_status, handle })), created: [], existing: [], errors: [] };
  fs.mkdirSync(path.dirname(path.resolve(args.report)), { recursive: true });
  for (const item of items) {
    const existing = await findProduct(item.service_key);
    if (existing) report.existing.push({ service_key: item.service_key, ...existing });
  }
  fs.writeFileSync(path.resolve(args.report), `${JSON.stringify(report, null, 2)}\n`);
  if (report.existing.length) throw new Error(`Preflight bloqueado: hay ${report.existing.length} servicios ya creados.`);
  if (!args.apply) return console.log(`Preflight OK: ${items.length} borradores. Informe: ${args.report}`);
  for (const item of items) {
    try {
      const created = await createProduct(item);
      report.created.push({ service_key: item.service_key, ...created });
      fs.writeFileSync(path.resolve(args.report), `${JSON.stringify(report, null, 2)}\n`);
      console.log(`CREATED ${created.handle}`);
    } catch (error) {
      report.errors.push({ service_key: item.service_key, message: error.message });
      fs.writeFileSync(path.resolve(args.report), `${JSON.stringify(report, null, 2)}\n`);
      throw error;
    }
  }
  console.log(`ImportaciÃ³n completada: ${report.created.length} borradores.`);
}

main().catch((error) => { console.error(`ERROR: ${error.message}`); process.exit(1); });
