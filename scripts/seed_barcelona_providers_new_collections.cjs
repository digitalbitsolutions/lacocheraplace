#!/usr/bin/env node

const fs = require("fs");
const path = require("path");

const API_VERSION = process.env.SHOPIFY_API_VERSION || "2025-01";
const PROVIDER_PROFILE_TYPE = "provider_profile";

const PROVIDERS = [
  {
    collectionHandle: "productos-usados-y-liquidaciones",
    collectionTag: "categoria-usados-liquidaciones",
    serviceCategory: "productos-usados-y-liquidaciones",
    providerSlug: "eixample-ocasion-motor",
    displayName: "Eixample Ocasion Motor",
    legalName: "Eixample Ocasion Motor SL",
    catalogVendorName: "Eixample Ocasion Motor",
    contactName: "Equipo Eixample Ocasion",
    email: "contacto@eixampleocasionmotor.es",
    phone: "+34931001001",
    whatsapp: "+34650010001",
    addressLine1: "Carrer d'Arago 281",
    addressLine2: "Local 2",
    city: "Barcelona",
    postalCode: "08007",
    provinceOrRegion: "Barcelona",
    country: "Spain",
    latitude: "41.3917",
    longitude: "2.1649",
    googlePlaceId: "",
    description:
      "Especialistas en vehiculos de ocasion revisados y liquidaciones de stock en Barcelona.",
    openingHours: "Lun-Vie 09:30-19:30, Sab 10:00-14:00",
    websiteUrl: "https://example.com/eixample-ocasion-motor",
    instagramUrl: "",
    logoSourceUrl: "",
    gallerySourceUrls: "",
    productTitle: "Vehiculos usados seleccionados - Eixample Ocasion Motor",
    productDescription:
      "Catalogo de vehiculos usados y oportunidades de liquidacion del proveedor Eixample Ocasion Motor.",
  },
  {
    collectionHandle: "productos-usados-y-liquidaciones",
    collectionTag: "categoria-usados-liquidaciones",
    serviceCategory: "productos-usados-y-liquidaciones",
    providerSlug: "sants-liquidaciones-auto",
    displayName: "Sants Liquidaciones Auto",
    legalName: "Sants Liquidaciones Auto SL",
    catalogVendorName: "Sants Liquidaciones Auto",
    contactName: "Equipo Sants Liquidaciones",
    email: "hola@santsliquidacionesauto.es",
    phone: "+34931001002",
    whatsapp: "+34650010002",
    addressLine1: "Carrer de Sants 102",
    addressLine2: "Nave B",
    city: "Barcelona",
    postalCode: "08014",
    provinceOrRegion: "Barcelona",
    country: "Spain",
    latitude: "41.3759",
    longitude: "2.1346",
    googlePlaceId: "",
    description:
      "Liquidaciones de automocion y ofertas de vehiculos seminuevos para compra rapida en Barcelona.",
    openingHours: "Lun-Sab 10:00-20:00",
    websiteUrl: "https://example.com/sants-liquidaciones-auto",
    instagramUrl: "",
    logoSourceUrl: "",
    gallerySourceUrls: "",
    productTitle: "Liquidaciones automocion - Sants Liquidaciones Auto",
    productDescription:
      "Seleccion de unidades y productos en liquidacion del proveedor Sants Liquidaciones Auto.",
  },
  {
    collectionHandle: "renta-de-espacios-y-herramientas-para-automocion",
    collectionTag: "categoria-renta-espacios-herramientas",
    serviceCategory: "renta-de-espacios-y-herramientas-para-automocion",
    providerSlug: "poblenou-box-rental",
    displayName: "Poblenou Box Rental",
    legalName: "Poblenou Box Rental SL",
    catalogVendorName: "Poblenou Box Rental",
    contactName: "Equipo Poblenou Box",
    email: "reserva@poblenouboxrental.es",
    phone: "+34931001003",
    whatsapp: "+34650010003",
    addressLine1: "Carrer de Pere IV 98",
    addressLine2: "Planta baja",
    city: "Barcelona",
    postalCode: "08005",
    provinceOrRegion: "Barcelona",
    country: "Spain",
    latitude: "41.4029",
    longitude: "2.1958",
    googlePlaceId: "",
    description:
      "Renta de boxes de trabajo y herramientas para mecanica ligera y mantenimiento de automocion.",
    openingHours: "Lun-Dom 08:00-22:00",
    websiteUrl: "https://example.com/poblenou-box-rental",
    instagramUrl: "",
    logoSourceUrl: "",
    gallerySourceUrls: "",
    productTitle: "Renta de box y herramientas - Poblenou Box Rental",
    productDescription:
      "Reserva de espacio y equipamiento para trabajos de automocion en Barcelona.",
  },
  {
    collectionHandle: "renta-de-espacios-y-herramientas-para-automocion",
    collectionTag: "categoria-renta-espacios-herramientas",
    serviceCategory: "renta-de-espacios-y-herramientas-para-automocion",
    providerSlug: "gracia-garage-tools",
    displayName: "Gracia Garage Tools",
    legalName: "Gracia Garage Tools SL",
    catalogVendorName: "Gracia Garage Tools",
    contactName: "Equipo Gracia Garage",
    email: "contacto@graciagaragetools.es",
    phone: "+34931001004",
    whatsapp: "+34650010004",
    addressLine1: "Travessera de Gracia 210",
    addressLine2: "Local 1",
    city: "Barcelona",
    postalCode: "08012",
    provinceOrRegion: "Barcelona",
    country: "Spain",
    latitude: "41.4035",
    longitude: "2.1562",
    googlePlaceId: "",
    description:
      "Alquiler por horas de herramientas profesionales y espacios de trabajo para automocion.",
    openingHours: "Lun-Sab 09:00-21:00",
    websiteUrl: "https://example.com/gracia-garage-tools",
    instagramUrl: "",
    logoSourceUrl: "",
    gallerySourceUrls: "",
    productTitle: "Espacio y herramientas por horas - Gracia Garage Tools",
    productDescription:
      "Servicio de renta de herramientas y zona tecnica para proyectos de automocion.",
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
      console.log("Uso: node scripts/seed_barcelona_providers_new_collections.cjs [--env-file private-data/shopify-admin.env] [--dry-run]");
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

async function findMetaobjectByHandle(type, handle) {
  const data = await shopifyGraphql(
    `#graphql
      query FindMetaobject($handle: MetaobjectHandleInput!) {
        metaobjectByHandle(handle: $handle) {
          id
          handle
        }
      }`,
    {
      handle: { type, handle },
    },
  );
  return data.metaobjectByHandle;
}

function mapProviderFields(provider) {
  const baseFields = [
    ["provider_slug", provider.providerSlug],
    ["display_name", provider.displayName],
    ["legal_name", provider.legalName],
    ["catalog_vendor_name", provider.catalogVendorName],
    ["contact_name", provider.contactName],
    ["email", provider.email],
    ["phone", provider.phone],
    ["whatsapp", provider.whatsapp],
    ["address_line_1", provider.addressLine1],
    ["address_line_2", provider.addressLine2],
    ["city", provider.city],
    ["postal_code", provider.postalCode],
    ["province_or_region", provider.provinceOrRegion],
    ["country", provider.country],
    ["latitude", provider.latitude],
    ["longitude", provider.longitude],
    ["google_place_id", provider.googlePlaceId],
    ["description", provider.description],
    ["opening_hours", provider.openingHours],
    ["logo_source_url", provider.logoSourceUrl],
    ["gallery_source_urls", provider.gallerySourceUrls],
    ["website_url", provider.websiteUrl],
    ["instagram_url", provider.instagramUrl],
    ["status", "approved"],
    ["source_submission_id", `seed-${provider.providerSlug}`],
  ]
    .filter(([, value]) => value !== "")
    .map(([key, value]) => ({ key, value }));

  baseFields.push({
    key: "service_categories",
    value: JSON.stringify([provider.serviceCategory]),
  });
  return baseFields;
}

async function createProviderProfile(provider) {
  const data = await shopifyGraphql(
    `#graphql
      mutation CreateProviderProfile($metaobject: MetaobjectCreateInput!) {
        metaobjectCreate(metaobject: $metaobject) {
          metaobject {
            id
            handle
          }
          userErrors {
            message
          }
        }
      }`,
    {
      metaobject: {
        type: PROVIDER_PROFILE_TYPE,
        handle: provider.providerSlug,
        fields: mapProviderFields(provider),
      },
    },
  );
  const errors = data.metaobjectCreate.userErrors || [];
  if (errors.length) throw new Error(errors.map((e) => e.message).join("; "));
  return data.metaobjectCreate.metaobject;
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

function slugify(value) {
  return String(value || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

async function createProduct(provider) {
  const handle = slugify(`${provider.productTitle}-${provider.providerSlug}`);
  const serviceKey = slugify(provider.productTitle);

  const existingByServiceKey = await findProductByServiceKey(serviceKey);
  if (existingByServiceKey) return { existing: true, dedupedByServiceKey: true, ...existingByServiceKey };

  const existing = await findProductByHandle(handle);
  if (existing) return { existing: true, ...existing };

  const data = await shopifyGraphql(
    `#graphql
      mutation CreateProviderProduct($product: ProductCreateInput!) {
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
        title: provider.productTitle,
        handle,
        descriptionHtml: `<p>${provider.productDescription}</p>`,
        vendor: provider.catalogVendorName,
        productType: "Servicio",
        tags: [
          provider.collectionTag,
          "servicio",
          "provider-seed-barcelona",
          provider.collectionHandle,
          `service_key:${serviceKey}`,
        ],
        status: "ACTIVE",
      },
    },
  );
  const errors = data.productCreate.userErrors || [];
  if (errors.length) throw new Error(errors.map((e) => e.message).join("; "));
  return { existing: false, ...data.productCreate.product };
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  if (args.envFile) loadEnvFile(args.envFile);

  const results = [];
  for (const provider of PROVIDERS) {
    let profileResult = null;
    try {
      const existingProfile = await findMetaobjectByHandle(
        PROVIDER_PROFILE_TYPE,
        provider.providerSlug,
      );

      if (existingProfile) {
        profileResult = {
          status: "exists",
          id: existingProfile.id,
          handle: existingProfile.handle,
        };
      } else if (args.dryRun) {
        profileResult = { status: "would_create", handle: provider.providerSlug };
      } else {
        const created = await createProviderProfile(provider);
        profileResult = {
          status: "created",
          id: created.id,
          handle: created.handle,
        };
      }
    } catch (error) {
      profileResult = {
        status: "skipped_missing_scope",
        reason:
          error instanceof Error ? error.message : "No se pudo operar metaobjects.",
      };
    }

    let productResult = null;
    if (args.dryRun) {
      productResult = { status: "would_create", title: provider.productTitle };
    } else {
      const product = await createProduct(provider);
      productResult = {
        status: product.existing ? "exists" : "created",
        id: product.id,
        handle: product.handle,
        title: product.title,
      };
    }

    results.push({
      provider: provider.catalogVendorName,
      category: provider.collectionHandle,
      profile: profileResult,
      product: productResult,
      address: `${provider.addressLine1}, ${provider.city}`,
    });
  }

  console.log(
    JSON.stringify(
      {
        ok: true,
        store: process.env.SHOPIFY_STORE,
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
