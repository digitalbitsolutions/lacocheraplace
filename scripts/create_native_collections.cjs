#!/usr/bin/env node

const fs = require("fs");
const path = require("path");

const API_VERSION = process.env.SHOPIFY_API_VERSION || "2025-01";

const TARGET_COLLECTIONS = [
  {
    title: "Productos usados y liquidaciones",
    handle: "productos-usados-y-liquidaciones",
    ruleSet: {
      appliedDisjunctively: false,
      rules: [
        {
          column: "TAG",
          relation: "EQUALS",
          condition: "categoria-usados-liquidaciones",
        },
      ],
    },
  },
  {
    title: "Renta de Espacios y Herramientas para Automocion",
    handle: "renta-de-espacios-y-herramientas-para-automocion",
    ruleSet: {
      appliedDisjunctively: false,
      rules: [
        {
          column: "TAG",
          relation: "EQUALS",
          condition: "categoria-renta-espacios-herramientas",
        },
      ],
    },
  },
];

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
    if (!(key in process.env)) {
      process.env[key] = value;
    }
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
      console.log("Uso: node scripts/create_native_collections.cjs [--env-file private-data/shopify-admin.env] [--dry-run]");
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
  if (!response.ok) {
    throw new Error(`HTTP ${response.status}: ${JSON.stringify(payload)}`);
  }
  if (payload.errors && payload.errors.length) {
    throw new Error(payload.errors.map((e) => e.message).join(", "));
  }
  return payload.data;
}

let cachedToken = null;

async function getAdminAccessToken() {
  if (cachedToken) return cachedToken;

  if (process.env.SHOPIFY_ADMIN_TOKEN) {
    cachedToken = process.env.SHOPIFY_ADMIN_TOKEN;
    return cachedToken;
  }

  const store = requireEnv("SHOPIFY_STORE");
  const clientId = process.env.SHOPIFY_CLIENT_ID;
  const clientSecret = process.env.SHOPIFY_CLIENT_SECRET;

  if (!clientId || !clientSecret) {
    throw new Error(
      "Falta SHOPIFY_ADMIN_TOKEN o, alternativamente, SHOPIFY_CLIENT_ID + SHOPIFY_CLIENT_SECRET.",
    );
  }

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
  if (!response.ok) {
    throw new Error(`No se pudo generar access token: HTTP ${response.status} ${JSON.stringify(payload)}`);
  }
  if (!payload.access_token) {
    throw new Error(`Respuesta sin access_token: ${JSON.stringify(payload)}`);
  }

  cachedToken = payload.access_token;
  return cachedToken;
}

async function fetchCollectionByHandle(handle) {
  const data = await shopifyGraphql(
    `#graphql
      query CollectionByHandle($handle: String!) {
        collectionByHandle(handle: $handle) {
          id
          title
          handle
          ruleSet {
            appliedDisjunctively
            rules {
              column
              relation
              condition
            }
          }
        }
      }`,
    { handle },
  );
  return data.collectionByHandle;
}

async function createCollection(target) {
  const data = await shopifyGraphql(
    `#graphql
      mutation CreateCollection($input: CollectionInput!) {
        collectionCreate(input: $input) {
          collection {
            id
            title
            handle
          }
          userErrors {
            field
            message
          }
        }
      }`,
    {
      input: {
        title: target.title,
        handle: target.handle,
        ruleSet: target.ruleSet,
      },
    },
  );

  const errors = data.collectionCreate.userErrors || [];
  if (errors.length) {
    throw new Error(errors.map((e) => e.message).join("; "));
  }
  return data.collectionCreate.collection;
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  if (args.envFile) loadEnvFile(args.envFile);

  const results = [];

  for (const target of TARGET_COLLECTIONS) {
    const existing = await fetchCollectionByHandle(target.handle);
    if (existing) {
      results.push({
        status: "exists",
        title: existing.title,
        handle: existing.handle,
        id: existing.id,
      });
      continue;
    }

    if (args.dryRun) {
      results.push({
        status: "would_create",
        title: target.title,
        handle: target.handle,
      });
      continue;
    }

    const created = await createCollection(target);
    results.push({
      status: "created",
      title: created.title,
      handle: created.handle,
      id: created.id,
    });
  }

  console.log(
    JSON.stringify(
      {
        ok: true,
        store: process.env.SHOPIFY_STORE || null,
        apiVersion: API_VERSION,
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
