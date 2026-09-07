#!/usr/bin/env node
/* eslint-disable no-console */

const fs = require("fs");
const path = require("path");
const { shopifyGraphQL, verifyShopifyConnection } = require("./lib/shopify-auth.cjs");

const REPORT_PATH = "project-docs/exports/chiclayo-provider-services-import.json";
const OUTPUT_PATH = "project-docs/exports/chiclayo-provider-image-assignment.json";

const SOURCE_PRODUCTS = {
  "productos-y-accesorios-para-el-cuidado-automotriz": "accesorios-esenciales-para-coche-ramblas-parking-service",
  detailing: "pulido-pintura-la-cochera-place",
  "mantenimiento-ligero": "motor-a-vapor-la-cochera-place",
  lavado: "lavado-completo-la-cochera-place",
  "neumaticos-y-llantas": "alineacion-y-balanceo-eixample-tire-center",
};

const SOURCE_KEYWORDS = {
  "productos-y-accesorios-para-el-cuidado-automotriz": /accesor|repuesto|bateria/i,
  detailing: /pulido|detailing|ceram|pintura/i,
  "mantenimiento-ligero": /motor|mantenimiento|revision|aceite|diagnostic/i,
  lavado: /lavado|wash/i,
  "neumaticos-y-llantas": /neumatic|llanta|alineacion|balanceo/i,
};

function parseArgs(argv) {
  return { apply: argv.includes("--apply") };
}

async function productByHandle(handle) {
  const data = await shopifyGraphQL(`#graphql
    query SourceProduct($handle: String!) {
      productByHandle(handle: $handle) {
        id handle title
        media(first: 1) { nodes { ... on MediaImage { image { url } } } }
      }
    }
  `, { handle });
  return data.productByHandle;
}

async function targetProductByHandle(handle) {
  return productByHandle(handle);
}

async function listProductsWithImages() {
  const data = await shopifyGraphQL(`#graphql
    query ProductsWithImages {
      products(first: 250) {
        nodes {
          id handle title status
          media(first: 1) { nodes { ... on MediaImage { image { url } } } }
        }
      }
    }
  `);
  return data.products.nodes.filter((product) => product.media?.nodes?.[0]?.image?.url);
}

async function attachImage(productId, originalSource, alt) {
  const data = await shopifyGraphQL(`#graphql
    mutation AttachChiclayoDemoImage($productId: ID!, $media: [CreateMediaInput!]!) {
      productCreateMedia(productId: $productId, media: $media) {
        media { id status }
        mediaUserErrors { field message }
      }
    }
  `, { productId, media: [{ mediaContentType: "IMAGE", originalSource, alt }] });
  const result = data.productCreateMedia;
  if (result.mediaUserErrors?.length) throw new Error(result.mediaUserErrors.map((error) => error.message).join(" | "));
  return result.media?.[0] || null;
}

async function listProfiles() {
  const data = await shopifyGraphQL(`#graphql
    query ChiclayoProfiles {
      metaobjects(type: "provider_profile", first: 250) {
        nodes { id handle fields { key value } }
      }
    }
  `);
  return data.metaobjects.nodes.map((node) => {
    const fields = Object.fromEntries(node.fields.map((field) => [field.key, field.value]));
    return { id: node.id, handle: node.handle, providerSlug: fields.provider_slug || "", logo: fields.logo_source_url || "" };
  });
}

async function updateProfileImage(profileId, url) {
  const data = await shopifyGraphQL(`#graphql
    mutation UpdateChiclayoProviderImage($id: ID!, $metaobject: MetaobjectUpdateInput!) {
      metaobjectUpdate(id: $id, metaobject: $metaobject) {
        metaobject { id }
        userErrors { field message }
      }
    }
  `, { id: profileId, metaobject: { fields: [{ key: "logo_source_url", value: url }] } });
  const errors = data.metaobjectUpdate.userErrors || [];
  if (errors.length) throw new Error(errors.map((error) => error.message).join(" | "));
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const importReport = JSON.parse(fs.readFileSync(path.resolve(REPORT_PATH), "utf8"));
  if (importReport.mode !== "apply" || importReport.created?.length !== 22) throw new Error("No se encontrÃ³ un informe vÃ¡lido de los 22 servicios creados.");
  const services = importReport.planned;
  const categorySources = new Map();
  const imageProducts = await listProductsWithImages();
  for (const category of new Set(services.map((service) => service.normalized_category))) {
    const sourceHandle = SOURCE_PRODUCTS[category];
    const preferred = sourceHandle ? await productByHandle(sourceHandle) : null;
    const source = preferred?.media?.nodes?.[0]?.image?.url
      ? preferred
      : imageProducts.find((product) => SOURCE_KEYWORDS[category]?.test(`${product.handle} ${product.title}`));
    const url = source?.media?.nodes?.[0]?.image?.url || "";
    if (!source || !url) throw new Error(`No hay una imagen activa de referencia para ${category}.`);
    categorySources.set(category, { handle: source.handle, title: source.title, url });
  }
  const profiles = await listProfiles();
  const bySlug = new Map(profiles.map((profile) => [profile.providerSlug, profile]));
  const result = { generatedAt: new Date().toISOString(), mode: args.apply ? "apply" : "dry-run", requestedServices: services.length, planned: [], attached: [], profilesUpdated: [], errors: [] };
  const imageForProvider = new Map();
  for (const service of services) {
    const target = await targetProductByHandle(service.handle);
    if (!target) throw new Error(`No existe el producto destino ${service.handle}.`);
    const source = categorySources.get(service.normalized_category);
    result.planned.push({ service: service.handle, provider_slug: service.provider_slug, source_product: source.handle, source_url: source.url });
    if (!imageForProvider.has(service.provider_slug)) imageForProvider.set(service.provider_slug, source);
    if (!args.apply) continue;
    try {
      await attachImage(target.id, source.url, `Imagen demostrativa de ${service.normalized_category} para ${service.provider_name}`);
      result.attached.push({ handle: target.handle, source_product: source.handle });
    } catch (error) {
      result.errors.push({ handle: target.handle, message: error.message });
      throw error;
    }
  }
  for (const [slug, source] of imageForProvider) {
    const profile = bySlug.get(slug);
    if (!profile) {
      result.errors.push({ provider_slug: slug, message: "Perfil no visible para la credencial actual." });
      continue;
    }
    if (!args.apply) continue;
    await updateProfileImage(profile.id, source.url);
    result.profilesUpdated.push({ provider_slug: slug, handle: profile.handle, source_product: source.handle });
  }
  fs.writeFileSync(path.resolve(OUTPUT_PATH), `${JSON.stringify(result, null, 2)}\n`);
  console.log(JSON.stringify({ mode: result.mode, servicesPlanned: result.planned.length, servicesAttached: result.attached.length, profilesUpdated: result.profilesUpdated.length, errors: result.errors.length, report: OUTPUT_PATH }, null, 2));
}

main().catch((error) => { console.error(`ERROR: ${error.message}`); process.exit(1); });
