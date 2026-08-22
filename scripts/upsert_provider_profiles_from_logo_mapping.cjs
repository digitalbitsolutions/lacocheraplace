#!/usr/bin/env node
/* eslint-disable no-console */
const fs = require("fs");
const path = require("path");
const { shopifyGraphQL, verifyShopifyConnection } = require("./lib/shopify-auth.cjs");

const API_VERSION = process.env.SHOPIFY_API_VERSION || "2026-04";
const PROFILE_TYPE = "provider_profile";

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

function parseArgs(argv) {
  const args = {};
  for (let i = 2; i < argv.length; i += 1) {
    const token = argv[i];
    if (!token.startsWith("--")) continue;
    const key = token.slice(2);
    const next = argv[i + 1];
    if (!next || next.startsWith("--")) {
      args[key] = true;
      continue;
    }
    args[key] = next;
    i += 1;
  }
  return args;
}

function normalize(s) {
  return String(s || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

async function gql(query, variables = {}) {
  return shopifyGraphQL(query, variables, { apiVersion: API_VERSION });
}

async function listProfiles() {
  let after = null;
  const rows = [];
  while (true) {
    const data = await gql(
      `#graphql
      query($after:String){
        metaobjects(first:250, type:"provider_profile", after:$after){
          pageInfo{hasNextPage endCursor}
          nodes{
            id
            handle
            fields{key value}
          }
        }
      }`,
      { after },
    );
    for (const node of data.metaobjects.nodes || []) {
      const map = new Map((node.fields || []).map((f) => [f.key, f.value]));
      rows.push({
        id: node.id,
        handle: node.handle,
        provider_slug: (map.get("provider_slug") || "").trim(),
        catalog_vendor_name: (map.get("catalog_vendor_name") || "").trim(),
        display_name: (map.get("display_name") || "").trim(),
        logo_source_url: (map.get("logo_source_url") || "").trim(),
      });
    }
    if (!data.metaobjects.pageInfo?.hasNextPage) break;
    after = data.metaobjects.pageInfo.endCursor;
  }
  return rows;
}

async function updateLogo(profileId, logoUrl) {
  const data = await gql(
    `#graphql
    mutation($id:ID!, $metaobject:MetaobjectUpdateInput!){
      metaobjectUpdate(id:$id, metaobject:$metaobject){
        metaobject{id}
        userErrors{field message}
      }
    }`,
    { id: profileId, metaobject: { fields: [{ key: "logo_source_url", value: logoUrl }] } },
  );
  const errs = data.metaobjectUpdate.userErrors || [];
  if (errs.length) throw new Error(errs.map((e) => e.message).join(" | "));
}

async function createProfile(vendorName, vendorSlug, logoUrl) {
  const now = new Date().toISOString().replace(/[-:.TZ]/g, "").slice(0, 14);
  const data = await gql(
    `#graphql
    mutation($metaobject: MetaobjectCreateInput!){
      metaobjectCreate(metaobject:$metaobject){
        metaobject{id handle}
        userErrors{field message}
      }
    }`,
    {
      metaobject: {
        type: PROFILE_TYPE,
        handle: vendorSlug,
        fields: [
          { key: "provider_slug", value: vendorSlug },
          { key: "display_name", value: vendorName },
          { key: "catalog_vendor_name", value: vendorName },
          { key: "contact_name", value: vendorName },
          { key: "email", value: `${vendorSlug}@example.com` },
          { key: "address_line_1", value: "Barcelona" },
          { key: "city", value: "Barcelona" },
          { key: "postal_code", value: "08001" },
          { key: "country", value: "Spain" },
          { key: "status", value: "active" },
          { key: "source_submission_id", value: `logo-seed-${now}-${vendorSlug}` },
          { key: "logo_source_url", value: logoUrl },
        ],
      },
    },
  );
  const errs = data.metaobjectCreate.userErrors || [];
  if (errs.length) throw new Error(errs.map((e) => e.message).join(" | "));
  return data.metaobjectCreate.metaobject;
}

async function main() {
  const args = parseArgs(process.argv);
  const envFile = args["env-file"] || "private-data/shopify-admin.env";
  const mappingFile =
    args["mapping"] || "private-data/provider-logos/iconify/mapped-logo-urls.json";
  const dryRun = Boolean(args["dry-run"]);
  loadEnvFile(envFile);

  await verifyShopifyConnection({ apiVersion: API_VERSION });

  if (!fs.existsSync(mappingFile)) {
    throw new Error(`No existe mapping: ${mappingFile}`);
  }
  const mapping = JSON.parse(fs.readFileSync(mappingFile, "utf8"));
  const profiles = await listProfiles();

  const bySlug = new Map();
  const byVendor = new Map();
  for (const p of profiles) {
    if (p.provider_slug) bySlug.set(normalize(p.provider_slug), p);
    const vendor = normalize(p.catalog_vendor_name || p.display_name);
    if (vendor) byVendor.set(vendor, p);
  }

  let updated = 0;
  let created = 0;
  const unresolved = [];

  for (const row of mapping) {
    const vendor = String(row.vendor || "").trim();
    const slug = normalize(row.vendor_slug || vendor);
    const logoUrl = String(row.logo_url || "").trim();
    if (!vendor || !slug || !logoUrl) {
      unresolved.push({ vendor, slug, reason: "missing_vendor_or_logo_url" });
      continue;
    }

    const existing = bySlug.get(slug) || byVendor.get(normalize(vendor));
    if (existing) {
      if ((existing.logo_source_url || "").trim() === logoUrl) {
        console.log(`UNCHANGED ${vendor}`);
        continue;
      }
      if (dryRun) {
        console.log(`DRY UPDATE ${vendor} -> ${existing.handle}`);
      } else {
        await updateLogo(existing.id, logoUrl);
        console.log(`UPDATED ${vendor} -> ${existing.handle}`);
      }
      updated += 1;
      continue;
    }

    if (dryRun) {
      console.log(`DRY CREATE ${vendor} -> ${slug}`);
    } else {
      const createdProfile = await createProfile(vendor, slug, logoUrl);
      console.log(`CREATED ${vendor} -> ${createdProfile.handle}`);
    }
    created += 1;
  }

  console.log("\nResumen upsert provider_profile:");
  console.log(`- rows: ${mapping.length}`);
  console.log(`- updated: ${updated}`);
  console.log(`- created: ${created}`);
  console.log(`- unresolved: ${unresolved.length}`);
  if (unresolved.length) console.log(JSON.stringify(unresolved, null, 2));
}

main().catch((err) => {
  console.error("ERROR:", err.message);
  process.exit(1);
});

