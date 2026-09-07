#!/usr/bin/env node
/* eslint-disable no-console */
const fs = require("fs");
const path = require("path");
const { shopifyGraphQL, verifyShopifyConnection } = require("./lib/shopify-auth.cjs");

const DEFAULT_INPUT = "sample-data/chiclayo/provider_profiles_chiclayo.json";
const DEFAULT_REPORT = "project-docs/exports/chiclayo-provider-profile-import.json";

function loadEnvFile(filePath) {
  if (!fs.existsSync(filePath)) return;
  for (const line of fs.readFileSync(filePath, "utf8").split(/\r?\n/)) {
    const cleaned = line.trim();
    if (!cleaned || cleaned.startsWith("#")) continue;
    const separator = cleaned.indexOf("=");
    if (separator < 0) continue;
    const key = cleaned.slice(0, separator).trim();
    let value = cleaned.slice(separator + 1).trim();
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) value = value.slice(1, -1);
    if (!process.env[key]) process.env[key] = value;
  }
}

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

function required(value, label) {
  if (value == null || String(value).trim() === "") throw new Error(`Falta ${label}`);
}

function validate(profiles) {
  if (!Array.isArray(profiles) || profiles.length !== 12) throw new Error("Se esperaban 12 perfiles de Chiclayo.");
  const handles = new Set();
  for (const profile of profiles) {
    for (const key of ["provider_slug", "display_name", "catalog_vendor_name", "address_line_1", "city", "province_or_region", "country", "latitude", "longitude", "source_submission_id"]) required(profile[key], `${profile.display_name || "perfil"}.${key}`);
    if (profile.province_or_region !== "Lambayeque" || profile.country !== "Perú") throw new Error(`${profile.display_name}: territorio inválido.`);
    if (handles.has(profile.provider_slug)) throw new Error(`Handle duplicado: ${profile.provider_slug}`);
    handles.add(profile.provider_slug);
  }
}

function fieldsFor(profile) {
  const values = {
    provider_slug: profile.provider_slug,
    display_name: profile.display_name,
    legal_name: profile.legal_name,
    catalog_vendor_name: profile.catalog_vendor_name,
    contact_name: profile.contact_name,
    email: profile.email,
    phone: profile.phone,
    whatsapp: profile.whatsapp,
    address_line_1: profile.address_line_1,
    address_line_2: profile.address_line_2,
    city: profile.city,
    postal_code: profile.postal_code,
    province_or_region: profile.province_or_region,
    country: profile.country,
    latitude: String(profile.latitude),
    longitude: String(profile.longitude),
    google_place_id: profile.google_place_id,
    service_categories: JSON.stringify(profile.service_categories || []),
    description: profile.description,
    opening_hours: profile.opening_hours,
    logo_source_url: profile.logo_source_url,
    gallery_source_urls: profile.gallery_source_urls,
    website_url: profile.website_url,
    instagram_url: profile.instagram_url,
    status: "approved",
    source_submission_id: profile.source_submission_id,
  };
  return Object.entries(values).filter(([, value]) => value != null && value !== "").map(([key, value]) => ({ key, value }));
}

async function inspectLive() {
  const data = await shopifyGraphQL(`#graphql
    query ChiclayoProviderPreflight {
      metaobjectDefinitionByType(type: "provider_profile") {
        id type name fieldDefinitions { key name required type { name } }
      }
      metaobjects(type: "provider_profile", first: 250) {
        nodes { id handle fields { key value } }
      }
    }
  `);
  return data;
}

function desiredDefinition() {
  const source = JSON.parse(fs.readFileSync(path.resolve("sample-data/provider_profile_metaobject_definition.json"), "utf8"));
  const optionalForResearch = new Set(["contact_name", "email", "postal_code"]);
  return {
    type: source.type,
    name: source.name,
    displayNameKey: "display_name",
    fieldDefinitions: source.fieldDefinitions.map((field) => ({
      ...field,
      required: optionalForResearch.has(field.key) ? false : field.required,
    })),
  };
}

async function createDefinition(definition) {
  const data = await shopifyGraphQL(`#graphql
    mutation CreateProviderProfileDefinition($definition: MetaobjectDefinitionCreateInput!) {
      metaobjectDefinitionCreate(definition: $definition) {
        metaobjectDefinition { id type name fieldDefinitions { key required type { name } } }
        userErrors { field message code }
      }
    }
  `, { definition });
  const result = data.metaobjectDefinitionCreate;
  if (result.userErrors?.length) throw new Error(`Definición: ${result.userErrors.map((e) => e.message).join(" | ")}`);
  if (!result.metaobjectDefinition) throw new Error("Shopify no devolvió la definición creada.");
  return result.metaobjectDefinition;
}

async function makeResearchFieldsOptional(definitionId, keys) {
  const data = await shopifyGraphQL(`#graphql
    mutation RelaxProviderProfileResearchFields($id: ID!, $definition: MetaobjectDefinitionUpdateInput!) {
      metaobjectDefinitionUpdate(id: $id, definition: $definition) {
        metaobjectDefinition { id fieldDefinitions { key required } }
        userErrors { field message code }
      }
    }
  `, {
    id: definitionId,
    definition: { fieldDefinitions: keys.map((key) => ({ update: { key, required: false } })) },
  });
  const result = data.metaobjectDefinitionUpdate;
  if (result.userErrors?.length) throw new Error(`Actualización de definición: ${result.userErrors.map((e) => e.message).join(" | ")}`);
  return result.metaobjectDefinition;
}

async function createProfile(profile) {
  const data = await shopifyGraphQL(`#graphql
    mutation CreateChiclayoProvider($metaobject: MetaobjectCreateInput!) {
      metaobjectCreate(metaobject: $metaobject) {
        metaobject { id handle type fields { key value } }
        userErrors { field message code }
      }
    }
  `, { metaobject: { type: "provider_profile", handle: profile.provider_slug, fields: fieldsFor(profile) } });
  const result = data.metaobjectCreate;
  if (result.userErrors?.length) throw new Error(`${profile.provider_slug}: ${result.userErrors.map((e) => e.message).join(" | ")}`);
  if (!result.metaobject) throw new Error(`${profile.provider_slug}: Shopify no devolvió el perfil creado.`);
  return { id: result.metaobject.id, handle: result.metaobject.handle };
}

async function main() {
  const args = parseArgs(process.argv);
  loadEnvFile(path.resolve(".env.local"));
  const profiles = JSON.parse(fs.readFileSync(path.resolve(args.input), "utf8").replace(/^\uFEFF/, ""));
  validate(profiles);
  const shop = await verifyShopifyConnection();
  const live = await inspectLive();
  let definition = live.metaobjectDefinitionByType;
  const definitionPlanned = !definition;
  if (!definition) definition = desiredDefinition();
  const liveHandles = new Set(live.metaobjects.nodes.map((item) => item.handle));
  const conflicts = profiles.filter((profile) => liveHandles.has(profile.provider_slug)).map((profile) => profile.provider_slug);
  const suppliedKeys = new Set(profiles.flatMap((profile) => fieldsFor(profile).map((field) => field.key)));
  const unsupportedKeys = [...suppliedKeys].filter((key) => !definition.fieldDefinitions.some((field) => field.key === key));
  const missingRequired = definition.fieldDefinitions.filter((field) => field.required && profiles.some((profile) => !fieldsFor(profile).some((item) => item.key === field.key))).map((field) => field.key);
  const allowedOptional = new Set(["contact_name", "email", "postal_code"]);
  const blockingRequired = missingRequired.filter((key) => !allowedOptional.has(key));
  const schemaChanges = missingRequired.filter((key) => allowedOptional.has(key)).map((key) => ({ key, required: false }));
  const report = { generatedAt: new Date().toISOString(), mode: args.apply ? "apply" : "dry-run", shop, definitionId: definition.id || null, definitionPlanned, requested: profiles.length, existingProfiles: live.metaobjects.nodes.length, conflicts, unsupportedKeys, missingRequired, schemaChanges, planned: profiles.map((p) => ({ handle: p.provider_slug, name: p.display_name, city: p.city, categories: p.service_categories })), created: [], errors: [] };
  fs.mkdirSync(path.dirname(path.resolve(args.report)), { recursive: true });
  fs.writeFileSync(path.resolve(args.report), `${JSON.stringify(report, null, 2)}\n`);
  if (conflicts.length || unsupportedKeys.length || blockingRequired.length) throw new Error(`Preflight bloqueado. Conflictos=${conflicts.length}; campos no soportados=${unsupportedKeys.join(",") || "ninguno"}; obligatorios ausentes=${blockingRequired.join(",") || "ninguno"}.`);
  console.log(`Preflight OK: ${profiles.length} perfiles; existentes=${live.metaobjects.nodes.length}; conflictos=0.`);
  if (!args.apply) return console.log(`DRY RUN guardado en ${args.report}`);
  if (definitionPlanned) {
    definition = await createDefinition(desiredDefinition());
    report.definitionId = definition.id;
    fs.writeFileSync(path.resolve(args.report), `${JSON.stringify(report, null, 2)}\n`);
    console.log(`DEFINITION CREATED ${definition.id}`);
  } else if (schemaChanges.length) {
    await makeResearchFieldsOptional(definition.id, schemaChanges.map((item) => item.key));
    console.log(`DEFINITION UPDATED optional=${schemaChanges.map((item) => item.key).join(",")}`);
  }
  for (const profile of profiles) {
    try {
      const created = await createProfile(profile);
      report.created.push(created);
      fs.writeFileSync(path.resolve(args.report), `${JSON.stringify(report, null, 2)}\n`);
      console.log(`CREATED ${created.handle}`);
    } catch (error) {
      report.errors.push({ handle: profile.provider_slug, message: error.message });
      fs.writeFileSync(path.resolve(args.report), `${JSON.stringify(report, null, 2)}\n`);
      throw error;
    }
  }
  console.log(`Importación completada: ${report.created.length} perfiles.`);
}

main().catch((error) => { console.error(`ERROR: ${error.message}`); process.exit(1); });
