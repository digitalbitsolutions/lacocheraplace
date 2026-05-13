#!/usr/bin/env node
/* eslint-disable no-console */
const fs = require("fs");
const path = require("path");

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

function slugify(value) {
  return String(value || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function pickShopDomain() {
  const candidates = [
    process.env.SHOPIFY_SHOP_DOMAIN,
    process.env.SHOPIFY_STORE_DOMAIN,
    process.env.SHOPIFY_STORE,
    process.env.SHOP,
  ].filter(Boolean);
  if (!candidates.length) return "";
  return candidates[0].replace(/^https?:\/\//, "").replace(/\/+$/, "");
}

function pickToken() {
  return (
    process.env.SHOPIFY_ADMIN_TOKEN ||
    process.env.SHOPIFY_ACCESS_TOKEN ||
    process.env.SHOPIFY_API_ACCESS_TOKEN ||
    ""
  );
}

async function shopifyGraphql({ shopDomain, token, query, variables }) {
  const url = `https://${shopDomain}/admin/api/2026-04/graphql.json`;
  const res = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Shopify-Access-Token": token,
    },
    body: JSON.stringify({ query, variables }),
  });
  const text = await res.text();
  let json;
  try {
    json = JSON.parse(text);
  } catch {
    throw new Error(`Shopify response is not JSON. HTTP ${res.status}. Body: ${text.slice(0, 300)}`);
  }
  if (!res.ok || json.errors) {
    throw new Error(`Shopify GraphQL error. HTTP ${res.status}. ${JSON.stringify(json.errors || json, null, 2)}`);
  }
  return json.data;
}

async function fetchAllVendors({ shopDomain, token }) {
  const query = `#graphql
    query Vendors($first: Int!, $after: String) {
      products(first: $first, after: $after, sortKey: TITLE) {
        pageInfo { hasNextPage endCursor }
        nodes { vendor }
      }
    }
  `;
  const vendors = new Set();
  let after = null;

  while (true) {
    const data = await shopifyGraphql({
      shopDomain,
      token,
      query,
      variables: { first: 250, after },
    });
    const connection = data.products;
    for (const node of connection.nodes || []) {
      const vendor = String(node.vendor || "").trim();
      if (vendor) vendors.add(vendor);
    }
    if (!connection.pageInfo?.hasNextPage) break;
    after = connection.pageInfo.endCursor;
  }

  return Array.from(vendors).sort((a, b) => a.localeCompare(b));
}

const ICONS = [
  "mdi:car-wash",
  "mdi:car-cog",
  "mdi:car-wrench",
  "mdi:car-brake-low-pressure",
  "mdi:garage-variant",
  "mdi:car-lifted-pickup",
  "mdi:car-estate",
  "mdi:tools",
  "mdi:wrench-clock",
  "mdi:car-shift-pattern",
  "mdi:car-info",
  "mdi:car-side",
  "mdi:car-multiple",
  "mdi:tire",
  "mdi:car-connected",
];

function hashCode(str) {
  let hash = 0;
  for (let i = 0; i < str.length; i += 1) {
    hash = (hash << 5) - hash + str.charCodeAt(i);
    hash |= 0;
  }
  return Math.abs(hash);
}

async function downloadIcon(iconName, outPath) {
  const iconPath = iconName.replace(":", "/");
  const url = `https://api.iconify.design/${iconPath}.svg`;
  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(`Failed ${url} -> HTTP ${res.status}`);
  }
  const svg = await res.text();
  fs.writeFileSync(outPath, svg, "utf8");
}

async function main() {
  const args = parseArgs(process.argv);
  const envFile = args["env-file"] || "private-data/shopify-admin.env";
  const outDir = args["out-dir"] || "private-data/provider-logos/iconify";
  const vendorsJsonPath = args["vendors-json"] || "";
  loadEnvFile(envFile);

  let vendors = [];
  if (vendorsJsonPath) {
    const raw = fs.readFileSync(vendorsJsonPath, "utf8");
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) {
      throw new Error("vendors-json debe ser un array JSON.");
    }
    vendors = parsed
      .map((item) => {
        if (typeof item === "string") return item.trim();
        if (item && typeof item.name === "string") return item.name.trim();
        if (item && typeof item.displayName === "string") return item.displayName.trim();
        if (item && typeof item.catalogVendorName === "string") return item.catalogVendorName.trim();
        return "";
      })
      .filter(Boolean);
  } else {
    const shopDomain = pickShopDomain();
    const token = pickToken();
    if (!shopDomain || !token) {
      throw new Error(
        "Faltan credenciales. Define SHOPIFY_SHOP_DOMAIN y SHOPIFY_ADMIN_TOKEN (o equivalentes), o usa --vendors-json."
      );
    }
    vendors = await fetchAllVendors({ shopDomain, token });
  }
  if (!vendors.length) {
    console.log("No se encontraron vendors en productos.");
    return;
  }

  fs.mkdirSync(outDir, { recursive: true });
  const manifest = [];

  for (const vendor of vendors) {
    const slug = slugify(vendor);
    const icon = ICONS[hashCode(slug) % ICONS.length];
    const fileName = `${slug}__iconify__${icon.replace(":", "-")}.svg`;
    const outPath = path.join(outDir, fileName);
    await downloadIcon(icon, outPath);
    manifest.push({
      vendor,
      vendor_slug: slug,
      iconify_icon: icon,
      local_file: outPath.replace(/\\/g, "/"),
    });
    console.log(`OK ${vendor} -> ${fileName}`);
  }

  const manifestPath = path.join(outDir, "provider-logo-manifest.json");
  fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2), "utf8");
  console.log(`\nCompletado. Logos: ${manifest.length}`);
  console.log(`Manifest: ${manifestPath.replace(/\\/g, "/")}`);
}

main().catch((err) => {
  console.error("ERROR:", err.message);
  process.exit(1);
});
