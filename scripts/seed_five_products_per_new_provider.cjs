#!/usr/bin/env node

const fs = require("fs");
const path = require("path");

const API_VERSION = process.env.SHOPIFY_API_VERSION || "2025-01";

const PROVIDERS = [
  {
    vendor: "Eixample Ocasion Motor",
    providerSlug: "eixample-ocasion-motor",
    collectionHandle: "productos-usados-y-liquidaciones",
    collectionTag: "categoria-usados-liquidaciones",
    items: [
      "Compacto urbano revisado",
      "SUV seminuevo certificado",
      "Sedan familiar oportunidad",
      "Pack liquidacion mantenimiento inicial",
      "Garantia extendida ocasion",
    ],
  },
  {
    vendor: "Sants Liquidaciones Auto",
    providerSlug: "sants-liquidaciones-auto",
    collectionHandle: "productos-usados-y-liquidaciones",
    collectionTag: "categoria-usados-liquidaciones",
    items: [
      "Liquidacion utilitario gasolina",
      "Liquidacion SUV diesel",
      "Oferta furgon urbano",
      "Pack revision pre-entrega",
      "Servicio tramitacion cambio titularidad",
    ],
  },
  {
    vendor: "Poblenou Box Rental",
    providerSlug: "poblenou-box-rental",
    collectionHandle: "renta-de-espacios-y-herramientas-para-automocion",
    collectionTag: "categoria-renta-espacios-herramientas",
    items: [
      "Alquiler box 2 horas",
      "Alquiler box media jornada",
      "Alquiler box jornada completa",
      "Pack herramientas mecanica ligera",
      "Asistencia tecnica de taller",
    ],
  },
  {
    vendor: "Gracia Garage Tools",
    providerSlug: "gracia-garage-tools",
    collectionHandle: "renta-de-espacios-y-herramientas-para-automocion",
    collectionTag: "categoria-renta-espacios-herramientas",
    items: [
      "Renta elevador por hora",
      "Renta kit diagnosis OBD",
      "Renta compresor y neumatica",
      "Renta herramientas detailing",
      "Renta box premium con soporte",
    ],
  },
];

function slugify(value) {
  return String(value || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

function loadEnvFile(envPath) {
  if (!envPath) return;
  const absolute = path.resolve(envPath);
  const content = fs.readFileSync(absolute, "utf8");
  for (const line of content.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const idx = trimmed.indexOf("=");
    if (idx < 1) continue;
    const key = trimmed.slice(0, idx).trim();
    const value = trimmed.slice(idx + 1).trim();
    if (!(key in process.env)) process.env[key] = value;
  }
}

function parseArgs(argv) {
  const args = { envFile: null, dryRun: false };
  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === "--env-file") {
      args.envFile = argv[i + 1];
      i += 1;
    } else if (arg === "--dry-run") {
      args.dryRun = true;
    } else if (arg === "--help" || arg === "-h") {
      console.log("Uso: node scripts/seed_five_products_per_new_provider.cjs [--env-file private-data/shopify-admin.env] [--dry-run]");
      process.exit(0);
    } else {
      throw new Error(`Argumento no reconocido: ${arg}`);
    }
  }
  return args;
}

function requireEnv(name) {
  const value = process.env[name];
  if (!value) throw new Error(`Falta variable requerida: ${name}`);
  return value;
}

let cachedToken = null;

async function getAdminAccessToken() {
  if (cachedToken) return cachedToken;
  if (process.env.SHOPIFY_ADMIN_TOKEN) {
    cachedToken = process.env.SHOPIFY_ADMIN_TOKEN;
    return cachedToken;
  }

  const store = requireEnv("SHOPIFY_STORE");
  const clientId = requireEnv("SHOPIFY_CLIENT_ID");
  const clientSecret = requireEnv("SHOPIFY_CLIENT_SECRET");
  const endpoint = `https://${store}/admin/oauth/access_token`;
  const body = new URLSearchParams({
    grant_type: "client_credentials",
    client_id: clientId,
    client_secret: clientSecret,
  });
  const response = await fetch(endpoint, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      Accept: "application/json",
    },
    body,
  });
  const payload = await response.json();
  if (!response.ok || !payload.access_token) {
    throw new Error(`No se pudo generar access token: HTTP ${response.status} ${JSON.stringify(payload)}`);
  }
  cachedToken = payload.access_token;
  return cachedToken;
}

async function shopifyGraphql(query, variables) {
  const store = requireEnv("SHOPIFY_STORE");
  const token = await getAdminAccessToken();
  const endpoint = `https://${store}/admin/api/${API_VERSION}/graphql.json`;
  const response = await fetch(endpoint, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Shopify-Access-Token": token,
    },
    body: JSON.stringify({ query, variables }),
  });
  const payload = await response.json();
  if (!response.ok) throw new Error(`HTTP ${response.status}: ${JSON.stringify(payload)}`);
  if (payload.errors?.length) throw new Error(payload.errors.map((e) => e.message).join(", "));
  return payload.data;
}

async function findProductByHandle(handle) {
  const data = await shopifyGraphql(
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

async function findProductByServiceKey(serviceKey) {
  const data = await shopifyGraphql(
    `#graphql
      query FindProductByServiceKey($query: String!) {
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

async function createProduct({ title, vendor, providerSlug, collectionTag, collectionHandle }) {
  const handle = slugify(`${title}-${providerSlug}`);
  const serviceKey = slugify(title);

  const existingByServiceKey = await findProductByServiceKey(serviceKey);
  if (existingByServiceKey) {
    return { status: "exists_by_service_key", ...existingByServiceKey };
  }

  const existing = await findProductByHandle(handle);
  if (existing) return { status: "exists", ...existing };

  const data = await shopifyGraphql(
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
          collectionTag,
          collectionHandle,
          "servicio",
          "provider-seed-barcelona",
          `provider-${providerSlug}`,
          `service_key:${serviceKey}`,
        ],
        status: "ACTIVE",
      },
    },
  );

  const errors = data.productCreate.userErrors || [];
  if (errors.length) throw new Error(errors.map((e) => e.message).join("; "));
  return { status: "created", ...data.productCreate.product };
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  if (args.envFile) loadEnvFile(args.envFile);

  const results = [];
  for (const provider of PROVIDERS) {
    for (const title of provider.items) {
      const payload = {
        title,
        vendor: provider.vendor,
        providerSlug: provider.providerSlug,
        collectionTag: provider.collectionTag,
        collectionHandle: provider.collectionHandle,
      };
      if (args.dryRun) {
        results.push({
          provider: provider.vendor,
          title,
          handle: slugify(`${title}-${provider.providerSlug}`),
          status: "would_create",
        });
      } else {
        const created = await createProduct(payload);
        results.push({
          provider: provider.vendor,
          title: created.title,
          handle: created.handle,
          id: created.id,
          status: created.status,
        });
      }
    }
  }

  console.log(
    JSON.stringify(
      {
        ok: true,
        store: process.env.SHOPIFY_STORE,
        apiVersion: API_VERSION,
        count: results.length,
        results,
      },
      null,
      2,
    ),
  );
}

main().catch((error) => {
  console.error(`ERROR: ${error.message}`);
  process.exitCode = 1;
});
