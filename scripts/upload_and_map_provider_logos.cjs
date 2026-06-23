#!/usr/bin/env node
/* eslint-disable no-console */
const fs = require("fs");
const path = require("path");
const {
  resolveOauthShop,
  resolveGraphqlShop,
  shopifyGraphQL,
  verifyShopifyConnection,
} = require("./lib/shopify-auth.cjs");

const API_VERSION = process.env.SHOPIFY_API_VERSION || "2026-04";

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

async function gql(query, variables = {}) {
  return shopifyGraphQL(query, variables, { apiVersion: API_VERSION });
}

async function stagedUpload(fileName, mimeType, fileSize) {
  const data = await gql(
    `#graphql
      mutation($input:[StagedUploadInput!]!){
        stagedUploadsCreate(input:$input){
          stagedTargets{
            url
            resourceUrl
            parameters{name value}
          }
          userErrors{field message}
        }
      }`,
    {
      input: [
        {
          filename: fileName,
          mimeType,
          resource: "FILE",
          httpMethod: "POST",
          fileSize: String(fileSize),
        },
      ],
    },
  );
  const errs = data.stagedUploadsCreate.userErrors || [];
  if (errs.length) throw new Error(errs.map((e) => e.message).join(" | "));
  return data.stagedUploadsCreate.stagedTargets[0];
}

async function postToStagedTarget(stagedTarget, filePath, mimeType) {
  const form = new FormData();
  for (const p of stagedTarget.parameters || []) {
    form.append(p.name, p.value);
  }
  const fileBuffer = fs.readFileSync(filePath);
  const blob = new Blob([fileBuffer], { type: mimeType });
  form.append("file", blob, path.basename(filePath));
  const res = await fetch(stagedTarget.url, { method: "POST", body: form });
  if (!res.ok) {
    const txt = await res.text();
    throw new Error(`staged_upload_failed_http_${res.status}: ${txt.slice(0, 240)}`);
  }
}

async function createFileAndGetUrl(resourceUrl, alt = "", contentType = "FILE") {
  const data = await gql(
    `#graphql
      mutation($files:[FileCreateInput!]!){
        fileCreate(files:$files){
          files{
            id
            alt
            ... on MediaImage{
              image{url}
            }
            ... on GenericFile{
              url
            }
          }
          userErrors{field message}
        }
      }`,
    {
      files: [{ originalSource: resourceUrl, contentType, alt }],
    },
  );
  const errs = data.fileCreate.userErrors || [];
  if (errs.length) throw new Error(errs.map((e) => e.message).join(" | "));
  const created = data.fileCreate.files?.[0];
  if (!created?.id) throw new Error("No se pudo crear archivo en Shopify Files.");
  const immediateUrl = created?.image?.url || created?.url || "";
  if (immediateUrl) return { id: created.id, url: immediateUrl };
  const eventualUrl = await waitForFileUrl(created.id).catch(() => "");
  if (!eventualUrl) {
    // With apps lacking read_files scope, node() polling can be denied.
    // In that case keep originalSource as URL fallback.
    return { id: created.id, url: resourceUrl };
  }
  return { id: created.id, url: eventualUrl };
}

async function waitForFileUrl(fileId, maxAttempts = 10, delayMs = 1200) {
  for (let i = 0; i < maxAttempts; i += 1) {
    const data = await gql(
      `#graphql
        query($id: ID!){
          node(id:$id){
            ... on MediaImage{
              image{url}
            }
            ... on GenericFile{
              url
            }
          }
        }`,
      { id: fileId },
    );
    const url = data?.node?.image?.url || data?.node?.url || "";
    if (url) return url;
    await new Promise((resolve) => setTimeout(resolve, delayMs));
  }
  return "";
}

async function listAllFileUrls() {
  const byLowerFilename = new Map();
  let after = null;
  while (true) {
    const data = await gql(
      `#graphql
        query($after:String){
          files(first:250, after:$after){
            pageInfo{hasNextPage endCursor}
            nodes{
              id
              alt
              ... on MediaImage{ image{url} }
              ... on GenericFile{ url }
            }
          }
        }`,
      { after },
    );
    for (const n of data.files.nodes || []) {
      const url = n?.image?.url || n?.url || "";
      if (!url) continue;
      const fileName = url.split("?")[0].split("/").pop().toLowerCase();
      byLowerFilename.set(fileName, { id: n.id, url });
    }
    if (!data.files.pageInfo?.hasNextPage) break;
    after = data.files.pageInfo.endCursor;
  }
  return byLowerFilename;
}

async function listProviderProfiles() {
  const items = [];
  let after = null;
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
      items.push({
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
  return items;
}

async function updateProviderLogo(metaobjectId, url) {
  const data = await gql(
    `#graphql
      mutation($id:ID!, $metaobject:MetaobjectUpdateInput!){
        metaobjectUpdate(id:$id, metaobject:$metaobject){
          metaobject{ id }
          userErrors{field message}
        }
      }`,
    {
      id: metaobjectId,
      metaobject: {
        fields: [{ key: "logo_source_url", value: url }],
      },
    },
  );
  const errs = data.metaobjectUpdate.userErrors || [];
  if (errs.length) throw new Error(errs.map((e) => e.message).join(" | "));
}

function normalize(s) {
  return String(s || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

async function main() {
  const args = parseArgs(process.argv);
  const envFile = args["env-file"] || "private-data/shopify-admin.env";
  const manifestPath = args["manifest"] || "private-data/provider-logos/iconify/provider-logo-manifest.json";
  const dryRun = Boolean(args["dry-run"]);
  loadEnvFile(envFile);

  const store = resolveGraphqlShop() || resolveOauthShop();
  if (!store) {
    throw new Error("Falta SHOPIFY_SHOP o SHOPIFY_STORE.");
  }

  await verifyShopifyConnection({ apiVersion: API_VERSION });

  const manifest = JSON.parse(fs.readFileSync(manifestPath, "utf8"));
  if (!Array.isArray(manifest) || !manifest.length) {
    throw new Error("Manifest vacio o invalido.");
  }

  let existingFiles = new Map();
  try {
    existingFiles = await listAllFileUrls();
  } catch (error) {
    console.warn(`[warn] No se pudo leer archivos existentes (continuo con upload directo): ${error.message}`);
  }
  const uploadedByVendorSlug = new Map();

  for (const row of manifest) {
    const localFile = path.resolve(process.cwd(), row.local_file);
    const fileName = path.basename(localFile).toLowerCase();
    if (!fs.existsSync(localFile)) {
      console.log(`SKIP missing file: ${localFile}`);
      continue;
    }

    const existing = existingFiles.get(fileName);
    if (existing) {
      uploadedByVendorSlug.set(row.vendor_slug, existing.url);
      console.log(`EXISTS ${fileName}`);
      continue;
    }

    if (dryRun) {
      console.log(`DRY upload ${fileName}`);
      continue;
    }

    const stat = fs.statSync(localFile);
    const staged = await stagedUpload(fileName, "image/svg+xml", stat.size);
    await postToStagedTarget(staged, localFile, "image/svg+xml");
    const created = await createFileAndGetUrl(staged.resourceUrl, row.vendor, "FILE");
    uploadedByVendorSlug.set(row.vendor_slug, created.url);
    console.log(`UPLOADED ${fileName} -> ${created.url}`);
  }

  const profiles = await listProviderProfiles();
  const byProviderSlug = new Map();
  const byVendorName = new Map();
  for (const p of profiles) {
    byProviderSlug.set(normalize(p.provider_slug), p);
    const vendorKey = normalize(p.catalog_vendor_name || p.display_name);
    if (vendorKey) byVendorName.set(vendorKey, p);
  }

  let mapped = 0;
  const notFound = [];
  for (const row of manifest) {
    const slugKey = normalize(row.vendor_slug);
    const vendorKey = normalize(row.vendor);
    const profile = byProviderSlug.get(slugKey) || byVendorName.get(vendorKey);
    const logoUrl = uploadedByVendorSlug.get(row.vendor_slug) || "";
    if (!profile || !logoUrl) {
      notFound.push({ vendor: row.vendor, vendor_slug: row.vendor_slug, hasProfile: Boolean(profile), hasLogoUrl: Boolean(logoUrl) });
      continue;
    }

    if (profile.logo_source_url === logoUrl) {
      console.log(`UNCHANGED ${row.vendor}`);
      continue;
    }

    if (dryRun) {
      console.log(`DRY map ${row.vendor} -> ${profile.handle}`);
      mapped += 1;
      continue;
    }

    await updateProviderLogo(profile.id, logoUrl);
    console.log(`MAPPED ${row.vendor} -> ${profile.handle}`);
    mapped += 1;
  }

  console.log("\nResumen:");
  console.log(`- manifest rows: ${manifest.length}`);
  console.log(`- files with URL: ${uploadedByVendorSlug.size}`);
  console.log(`- provider profiles: ${profiles.length}`);
  console.log(`- mapped updates: ${mapped}`);
  console.log(`- unresolved: ${notFound.length}`);
  if (notFound.length) {
    console.log(JSON.stringify(notFound, null, 2));
  }

  const outputMapping = manifest.map((row) => ({
    vendor: row.vendor,
    vendor_slug: row.vendor_slug,
    logo_url: uploadedByVendorSlug.get(row.vendor_slug) || "",
  }));
  const outputPath = path.join(
    process.cwd(),
    "private-data",
    "provider-logos",
    "iconify",
    "mapped-logo-urls.json",
  );
  fs.writeFileSync(outputPath, JSON.stringify(outputMapping, null, 2), "utf8");
  console.log(`Saved mapping: ${outputPath}`);
}

main().catch((err) => {
  console.error("ERROR:", err.message);
  process.exit(1);
});
