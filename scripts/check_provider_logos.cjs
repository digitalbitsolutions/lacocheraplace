#!/usr/bin/env node
/* eslint-disable no-console */
const fs = require("fs");
const path = require("path");
const { shopifyGraphQL } = require("./lib/shopify-auth.cjs");

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
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1);
    }
    if (!process.env[key]) process.env[key] = value;
  }
}

async function main() {
  loadEnvFile(path.join(process.cwd(), ".env.local"));
  loadEnvFile(path.join(process.cwd(), "private-data", "shopify-admin.env"));
  loadEnvFile(path.join(process.cwd(), "shopify-provider-admin", ".env"));

  const data = await shopifyGraphQL(
    `#graphql
    query ProviderProfiles($first: Int!) {
      metaobjects(type: "provider_profile", first: $first) {
        nodes {
          id
          handle
          fields {
            key
            value
          }
        }
      }
    }`,
    { first: 250 },
    { log: true },
  );

  const targetVendors = [
    "La Cochera Place",
    "Detail Lab BCN",
    "Gracia Auto Spa",
    "Barcelona Wash Hub",
    "Sants Wrap Studio",
    "Costa Garage Express",
  ];
  const wanted = targetVendors.map((v) => v.toLowerCase().trim());

  const rows = data.metaobjects.nodes.map((n) => {
    const map = {};
    for (const f of n.fields || []) map[f.key] = f.value;
    const vendorName = (map.catalog_vendor_name || map.display_name || "").trim();
    return {
      id: n.id,
      handle: n.handle,
      vendorName,
      vendorNorm: vendorName.toLowerCase().trim(),
      logo: (map.logo_source_url || "").trim(),
    };
  });

  console.log("\n=== Provider profiles (target vendors) ===");
  for (const r of rows.filter((x) => wanted.includes(x.vendorNorm))) {
    console.log(
      `- ${r.vendorName} | handle=${r.handle} | logo=${r.logo ? "YES" : "NO"}${r.logo ? ` | ${r.logo.slice(0, 90)}` : ""}`,
    );
  }

  const filesData = await shopifyGraphQL(
    `#graphql
    query Files($first: Int!) {
      files(first: $first) {
        nodes {
          ... on GenericFile {
            id
            alt
            url
          }
          ... on MediaImage {
            id
            alt
            image {
              url
            }
          }
        }
      }
    }`,
    { first: 250 },
    { log: false },
  );
  console.log(`\n[debug] files fetched: ${(filesData.files.nodes || []).length}`);

  const fileUrls = (filesData.files.nodes || [])
    .map((n) => (n.url || (n.image && n.image.url) || ""))
    .filter(Boolean);
  const slugs = [
    "la-cochera-place",
    "detail-lab-bcn",
    "gracia-auto-spa",
    "barcelona-wash-hub",
    "sants-wrap-studio",
    "costa-garage-express",
  ];
  console.log("\n=== Candidate file URLs by vendor slug ===");
  for (const slug of slugs) {
    const hit = fileUrls.find((u) => u.toLowerCase().includes(slug));
    console.log(`- ${slug}: ${hit || "NO MATCH"}`);
  }

  console.log("\n=== Token-branded file URLs (sample) ===");
  const tokenBranded = fileUrls.filter((u) => u.toLowerCase().includes("token-branded"));
  for (const u of tokenBranded.slice(0, 30)) {
    console.log(`- ${u}`);
  }
}

main().catch((err) => {
  console.error(`ERROR: ${err.message}`);
  process.exit(1);
});
