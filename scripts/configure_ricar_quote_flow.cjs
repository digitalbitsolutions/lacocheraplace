#!/usr/bin/env node
/* eslint-disable no-console */

const fs = require("fs");
const { shopifyGraphQL } = require("./lib/shopify-auth.cjs");

const PRODUCT_ID = "gid://shopify/Product/11116814598481";
const QUOTE_METADATA = [
  { key: "flow_type", name: "Tipo de flujo", type: "single_line_text_field", value: "cotizacion" },
  { key: "whatsapp_phone", name: "WhatsApp del proveedor", type: "single_line_text_field", value: "51968052360" },
  { key: "cta_primary_label", name: "Texto del CTA principal", type: "single_line_text_field", value: "Solicitar cotización por WhatsApp" },
  {
    key: "whatsapp_message",
    name: "Mensaje de WhatsApp",
    type: "multi_line_text_field",
    value: "Hola, quisiera cotizar equipamiento automotriz con Ricar Multicenter. Mi vehículo es: [marca, modelo y año]. Busco: [detalle del equipamiento o pack]. Presupuesto aproximado: [opcional].",
  },
];

function loadAppEnvironment() {
  for (const line of fs.readFileSync("shopify-provider-admin/.env", "utf8").split(/\r?\n/)) {
    const cleaned = line.trim();
    if (!cleaned || cleaned.startsWith("#")) continue;
    const separator = cleaned.indexOf("=");
    if (separator < 0) continue;
    const key = cleaned.slice(0, separator).trim();
    let value = cleaned.slice(separator + 1).trim();
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) value = value.slice(1, -1);
    process.env[key] = value;
  }
}

async function ensureDefinition(field) {
  const data = await shopifyGraphQL(`#graphql
    query Definitions {
      metafieldDefinitions(first: 250, ownerType: PRODUCT, namespace: "lcp") {
        nodes { key }
      }
    }
  `);
  if (data.metafieldDefinitions.nodes.some((definition) => definition.key === field.key)) return;

  const created = await shopifyGraphQL(`#graphql
    mutation CreateDefinition($definition: MetafieldDefinitionInput!) {
      metafieldDefinitionCreate(definition: $definition) {
        createdDefinition { id }
        userErrors { field message }
      }
    }
  `, {
    definition: {
      namespace: "lcp",
      key: field.key,
      name: field.name,
      ownerType: "PRODUCT",
      type: field.type,
      access: { storefront: "PUBLIC_READ" },
    },
  });
  const errors = created.metafieldDefinitionCreate.userErrors || [];
  if (errors.length) throw new Error(`${field.key}: ${errors.map((error) => error.message).join(" | ")}`);
}

async function main() {
  loadAppEnvironment();
  for (const field of QUOTE_METADATA) await ensureDefinition(field);
  const result = await shopifyGraphQL(`#graphql
    mutation SetQuoteMetadata($metafields: [MetafieldsSetInput!]!) {
      metafieldsSet(metafields: $metafields) {
        metafields { key value }
        userErrors { field message code }
      }
    }
  `, {
    metafields: QUOTE_METADATA.map((field) => ({
      ownerId: PRODUCT_ID,
      namespace: "lcp",
      key: field.key,
      type: field.type,
      value: field.value,
    })),
  });
  const errors = result.metafieldsSet.userErrors || [];
  if (errors.length) throw new Error(errors.map((error) => error.message).join(" | "));
  console.log(`Configured quote metadata: ${result.metafieldsSet.metafields.map((field) => field.key).join(", ")}`);
}

main().catch((error) => {
  console.error(`ERROR: ${error.message}`);
  process.exit(1);
});
