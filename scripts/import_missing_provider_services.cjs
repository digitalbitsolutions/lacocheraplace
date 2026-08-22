#!/usr/bin/env node
/* eslint-disable no-console */
const fs = require("fs");
const path = require("path");
const { shopifyGraphQL } = require("./lib/shopify-auth.cjs");

const PROVIDERS = [
  {
    vendor: "Rivas Detailing Studio",
    providerSlug: "rivas-detailing-studio",
    services: [
      { title: "Detailing premium", categoryTag: "detailing" },
      { title: "Pulido y correccion de pintura", categoryTag: "detailing" },
      { title: "Tratamiento ceramico", categoryTag: "detailing" },
      { title: "PPF frontal", categoryTag: "ppf-wrap" },
      { title: "Tintado de lunas", categoryTag: "tintado-lunas" },
    ],
  },
  {
    vendor: "Chamartin Glass & Detail",
    providerSlug: "chamartin-glass-detail",
    services: [
      { title: "Reparacion de parabrisas", categoryTag: "tintado-lunas" },
      { title: "Sustitucion de parabrisas", categoryTag: "tintado-lunas" },
      { title: "Tintado de lunas premium", categoryTag: "tintado-lunas" },
      { title: "Pulido de faros", categoryTag: "detailing" },
      { title: "Detailing interior", categoryTag: "detailing" },
    ],
  },
];

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

function slugify(value) {
  return String(value || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

async function findByHandle(handle) {
  const data = await shopifyGraphQL(
    `#graphql
      query FindProduct($handle: String!) {
        productByHandle(handle: $handle) {
          id
          handle
          title
        }
      }`,
    { handle },
  );
  return data.productByHandle;
}

async function findByServiceKey(serviceKey) {
  const data = await shopifyGraphQL(
    `#graphql
      query FindByServiceKey($query: String!) {
        products(first: 1, query: $query) {
          nodes {
            id
            handle
            title
          }
        }
      }`,
    { query: `tag:service_key:${serviceKey}` },
  );
  return data.products.nodes[0] || null;
}

async function createProduct({ title, vendor, providerSlug, categoryTag }) {
  const handle = slugify(`${title}-${providerSlug}`);
  const serviceKey = slugify(`${title}-${providerSlug}`);

  const byServiceKey = await findByServiceKey(serviceKey);
  if (byServiceKey) return { status: "exists_by_service_key", ...byServiceKey };

  const byHandle = await findByHandle(handle);
  if (byHandle) return { status: "exists", ...byHandle };

  const result = await shopifyGraphQL(
    `#graphql
      mutation CreateProduct($product: ProductCreateInput!) {
        productCreate(product: $product) {
          product {
            id
            handle
            title
            status
          }
          userErrors {
            message
          }
        }
      }`,
    {
      product: {
        title,
        handle,
        vendor,
        productType: "Servicio",
        descriptionHtml: `<p>${title} del proveedor ${vendor} en Barcelona.</p>`,
        tags: [
          "demo",
          "servicio",
          "barcelona",
          categoryTag,
          `proveedor-${providerSlug}`,
          `provider-${providerSlug}`,
          `service_key:${serviceKey}`,
        ],
        status: "ACTIVE",
      },
    },
  );

  const errors = result.productCreate.userErrors || [];
  if (errors.length) throw new Error(errors.map((e) => e.message).join("; "));
  return { status: "created", ...result.productCreate.product };
}

async function main() {
  const args = process.argv.slice(2);
  const dryRun = args.includes("--dry-run");

  const envArgIdx = args.indexOf("--env-file");
  if (envArgIdx >= 0 && args[envArgIdx + 1]) {
    loadEnvFile(path.resolve(process.cwd(), args[envArgIdx + 1]));
  }
  loadEnvFile(path.resolve(process.cwd(), "private-data/shopify-admin-clientcreds.env"));
  loadEnvFile(path.resolve(process.cwd(), "private-data/shopify-admin-legacy.env"));
  loadEnvFile(path.resolve(process.cwd(), "private-data/shopify-admin.env"));
  loadEnvFile(path.resolve(process.cwd(), "shopify-provider-admin/.env"));

  const out = [];
  for (const provider of PROVIDERS) {
    for (const service of provider.services) {
      const item = {
        provider: provider.vendor,
        title: service.title,
        handle: slugify(`${service.title}-${provider.providerSlug}`),
      };
      if (dryRun) {
        out.push({ ...item, status: "would_create" });
        continue;
      }
      const created = await createProduct({
        title: service.title,
        vendor: provider.vendor,
        providerSlug: provider.providerSlug,
        categoryTag: service.categoryTag,
      });
      out.push({
        ...item,
        status: created.status,
        id: created.id || null,
      });
    }
  }

  console.log(
    JSON.stringify(
      {
        ok: true,
        dryRun,
        count: out.length,
        results: out,
      },
      null,
      2,
    ),
  );
}

main().catch((error) => {
  console.error(`ERROR: ${error.message}`);
  process.exit(1);
});
