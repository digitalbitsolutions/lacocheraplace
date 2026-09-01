#!/usr/bin/env node
/* eslint-disable no-console */

const fs = require("fs");
const path = require("path");
const { shopifyGraphQL } = require("./lib/shopify-auth.cjs");

const PROVIDER = {
  handle: "detailing-center",
  name: "Detailing Center",
  fields: [
    { key: "provider_slug", value: "detailing-center" },
    { key: "display_name", value: "Detailing Center" },
    { key: "catalog_vendor_name", value: "Detailing Center" },
    { key: "contact_name", value: "Pendiente de completar" },
    { key: "email", value: "not-provided@invalid.example" },
    { key: "address_line_1", value: "Pendiente de completar" },
    { key: "city", value: "Pendiente de completar" },
    { key: "postal_code", value: "00000" },
    { key: "province_or_region", value: "Pendiente de completar" },
    { key: "country", value: "Perú" },
    {
      key: "service_categories",
      value: JSON.stringify(["Detailing", "PPF", "Polarizado"]),
    },
    {
      key: "description",
      value: "Proveedor piloto de detailing, protección cerámica, PPF y polarizado. Datos comerciales y legales pendientes de completar.",
    },
    { key: "status", value: "approved" },
    { key: "source_submission_id", value: "pilot-detailing-center-20260901" },
  ],
};

const SERVICES = [
  {
    handle: "tratamiento-ceramico-detailing-center",
    title: "Tratamiento cerámico",
    categoryTags: ["detailing", "tratamiento-ceramico"],
    descriptionHtml:
      "<p>Protección cerámica profesional con opciones de duración de 3 o 5 años para auto y camioneta.</p>",
    options: [
      { name: "Duración", values: ["3 años", "5 años"] },
      { name: "Tipo de vehículo", values: ["Auto", "Camioneta"] },
    ],
    variants: [
      { values: ["3 años", "Auto"], price: "800.00" },
      { values: ["3 años", "Camioneta"], price: "850.00" },
      { values: ["5 años", "Auto"], price: "1000.00" },
      { values: ["5 años", "Camioneta"], price: "1100.00" },
    ],
  },
  {
    handle: "pulido-general-detailing-center",
    title: "Pulido general",
    categoryTags: ["detailing", "pulido-pintura"],
    descriptionHtml:
      "<p>Pulido general de pintura para recuperar brillo y mejorar el acabado exterior del vehículo.</p>",
    options: [],
    variants: [{ values: [], price: "250.00" }],
  },
  {
    handle: "polarizado-detailing-center",
    title: "Polarizado",
    categoryTags: ["polarizado", "ppf-wrap-tintado-lunas"],
    descriptionHtml:
      "<p>Polarizado automotriz disponible en lámina Chamalleon o 3M para auto y camioneta.</p>",
    options: [
      { name: "Marca", values: ["Chamalleon", "3M"] },
      { name: "Tipo de vehículo", values: ["Auto", "Camioneta"] },
    ],
    variants: [
      { values: ["Chamalleon", "Auto"], price: "400.00" },
      { values: ["Chamalleon", "Camioneta"], price: "450.00" },
      { values: ["3M", "Auto"], price: "700.00" },
      { values: ["3M", "Camioneta"], price: "750.00" },
    ],
  },
  {
    handle: "full-body-ppf-detailing-center",
    title: "Full Body PPF",
    categoryTags: ["ppf", "ppf-wrap-tintado-lunas"],
    descriptionHtml:
      "<p>Protección PPF de carrocería completa para preservar la pintura del vehículo.</p>",
    options: [],
    variants: [{ values: [], price: "5500.00" }],
  },
  {
    handle: "ppf-proteccion-de-partes-detailing-center",
    title: "PPF - Protección de partes",
    categoryTags: ["ppf", "ppf-wrap-tintado-lunas"],
    descriptionHtml:
      "<p>Protección PPF por partes. Incluye de cortesía la protección de las cuatro manijas.</p>",
    options: [
      {
        name: "Parte",
        values: ["Faros delanteros", "Pilares de puertas (6)", "Espejos (2)"],
      },
    ],
    variants: [
      { values: ["Faros delanteros"], price: "300.00" },
      { values: ["Pilares de puertas (6)"], price: "240.00" },
      { values: ["Espejos (2)"], price: "150.00" },
    ],
  },
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
    ) {
      value = value.slice(1, -1);
    }
    if (!process.env[key]) process.env[key] = value;
  }
}

function loadKnownEnvironments() {
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
  if (errors.length) {
    throw new Error(`${label}: ${errors.map((error) => error.message).join(" | ")}`);
  }
}

async function inspectExisting() {
  const data = await shopifyGraphQL(
    `#graphql
      query DetailingCenterPilotAudit($query: String!) {
        shop { name currencyCode }
        metaobjectByHandle(handle: { type: "provider_profile", handle: "detailing-center" }) {
          id
          handle
          displayName
        }
        products(first: 20, query: $query) {
          nodes {
            id
            handle
            title
            status
            vendor
            variants(first: 20) { nodes { id title price } }
          }
        }
      }`,
    { query: SERVICES.map((service) => `handle:${service.handle}`).join(" OR ") },
  );
  return data;
}

async function createProvider() {
  const data = await shopifyGraphQL(
    `#graphql
      mutation CreateDetailingCenterProvider($metaobject: MetaobjectCreateInput!) {
        metaobjectCreate(metaobject: $metaobject) {
          metaobject { id handle displayName }
          userErrors { field message }
        }
      }`,
    {
      metaobject: {
        type: "provider_profile",
        handle: PROVIDER.handle,
        fields: PROVIDER.fields,
      },
    },
  );
  assertNoUserErrors(data.metaobjectCreate, "No se pudo crear el proveedor");
  return data.metaobjectCreate.metaobject;
}

async function createProductShell(service) {
  const tags = [
    "piloto-peru",
    "servicio",
    "service-flow-checkout",
    "proveedor-detailing-center",
    "provider-detailing-center",
    `service_key:${service.handle}`,
    ...service.categoryTags,
  ];
  const productOptions = service.options.map((option) => ({
    name: option.name,
    values: option.values.map((name) => ({ name })),
  }));
  const data = await shopifyGraphQL(
    `#graphql
      mutation CreateDetailingCenterService($product: ProductCreateInput!) {
        productCreate(product: $product) {
          product {
            id
            handle
            title
            status
            variants(first: 10) { nodes { id title price } }
          }
          userErrors { field message }
        }
      }`,
    {
      product: {
        title: service.title,
        handle: service.handle,
        vendor: PROVIDER.name,
        productType: "Servicio",
        descriptionHtml: service.descriptionHtml,
        tags,
        status: "DRAFT",
        ...(productOptions.length ? { productOptions } : {}),
      },
    },
  );
  assertNoUserErrors(data.productCreate, `No se pudo crear ${service.title}`);
  return data.productCreate.product;
}

async function setVariants(product, service) {
  if (!service.options.length) {
    const defaultVariant = product.variants.nodes[0];
    const data = await shopifyGraphQL(
      `#graphql
        mutation PriceDefaultVariant($productId: ID!, $variants: [ProductVariantsBulkInput!]!) {
          productVariantsBulkUpdate(productId: $productId, variants: $variants) {
            productVariants { id title price }
            userErrors { field message }
          }
        }`,
      {
        productId: product.id,
        variants: [{ id: defaultVariant.id, price: service.variants[0].price }],
      },
    );
    assertNoUserErrors(data.productVariantsBulkUpdate, `No se pudo fijar precio de ${service.title}`);
    return data.productVariantsBulkUpdate.productVariants;
  }

  const variants = service.variants.map((variant) => ({
    price: variant.price,
    optionValues: variant.values.map((name, index) => ({
      optionName: service.options[index].name,
      name,
    })),
  }));
  const data = await shopifyGraphQL(
    `#graphql
      mutation CreatePilotVariants($productId: ID!, $variants: [ProductVariantsBulkInput!]!) {
        productVariantsBulkCreate(
          productId: $productId
          variants: $variants
          strategy: REMOVE_STANDALONE_VARIANT
        ) {
          productVariants { id title price }
          userErrors { field message }
        }
      }`,
    { productId: product.id, variants },
  );
  assertNoUserErrors(data.productVariantsBulkCreate, `No se pudieron crear variantes de ${service.title}`);
  return data.productVariantsBulkCreate.productVariants;
}

async function main() {
  loadKnownEnvironments();
  const apply = process.argv.includes("--apply");
  const before = await inspectExisting();
  const existingByHandle = new Map(before.products.nodes.map((product) => [product.handle, product]));
  const result = {
    ok: true,
    apply,
    shop: before.shop,
    provider: before.metaobjectByHandle || null,
    services: [],
  };

  if (!apply) {
    result.actions = {
      provider: before.metaobjectByHandle ? "skip_existing" : "would_create",
      services: SERVICES.map((service) => ({
        handle: service.handle,
        action: existingByHandle.has(service.handle) ? "skip_existing" : "would_create",
        variants: service.variants,
      })),
    };
    console.log(JSON.stringify(result, null, 2));
    return;
  }

  if (!before.metaobjectByHandle) result.provider = await createProvider();
  for (const service of SERVICES) {
    const existing = existingByHandle.get(service.handle);
    if (existing) {
      result.services.push({ handle: service.handle, status: "skipped_existing", product: existing });
      continue;
    }
    const product = await createProductShell(service);
    const variants = await setVariants(product, service);
    result.services.push({
      handle: service.handle,
      status: "created",
      id: product.id,
      productStatus: product.status,
      variants: variants.map((variant) => ({ title: variant.title, price: variant.price })),
    });
  }

  result.after = await inspectExisting();
  console.log(JSON.stringify(result, null, 2));
}

main().catch((error) => {
  console.error(`ERROR: ${error.message}`);
  process.exit(1);
});
