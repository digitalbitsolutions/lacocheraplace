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

  const query = `#graphql
    query FilesPage($first: Int!, $after: String) {
      files(first: $first, after: $after) {
        pageInfo { hasNextPage endCursor }
        nodes {
          ... on GenericFile { id alt url }
          ... on MediaImage { id alt image { url } }
        }
      }
    }`;

  let after = null;
  const all = [];
  for (let page = 0; page < 20; page += 1) {
    const data = await shopifyGraphQL(query, { first: 250, after }, { log: page === 0 });
    const conn = data.files;
    const nodes = conn.nodes || [];
    all.push(...nodes);
    if (!conn.pageInfo?.hasNextPage) break;
    after = conn.pageInfo.endCursor;
  }

  const urls = all
    .map((n) => (n.url || (n.image && n.image.url) || ""))
    .filter(Boolean);

  console.log(`Total files fetched: ${urls.length}`);

  const targets = [
    "la-cochera-place",
    "lacochera-place",
    "lacochera",
    "cochera-place",
    "detail-lab-bcn",
    "gracia-auto-spa",
    "barcelona-wash-hub",
    "sants-wrap-studio",
    "costa-garage-express",
    "token-branded",
  ];

  for (const t of targets) {
    const allHits = urls.filter((u) => u.toLowerCase().includes(t));
    const hits = t === "token-branded" ? allHits : allHits.slice(0, 20);
    console.log(`\n[${t}] hits=${hits.length}`);
    for (const h of hits) console.log(`- ${h}`);
  }
}

main().catch((err) => {
  console.error(`ERROR: ${err.message}`);
  process.exit(1);
});
