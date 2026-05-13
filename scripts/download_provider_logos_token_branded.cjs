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

function slugify(value) {
  return String(value || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function normalizeSvgForLogoSlider(svg, sizePx) {
  let out = svg.trim();
  if (!out.startsWith("<svg")) return svg;

  out = out.replace(/width="[^"]*"/, `width="${sizePx}"`);
  out = out.replace(/height="[^"]*"/, `height="${sizePx}"`);

  if (!/viewBox="/.test(out)) {
    out = out.replace("<svg", `<svg viewBox="0 0 24 24"`);
  }

  if (!/preserveAspectRatio=/.test(out)) {
    out = out.replace("<svg", `<svg preserveAspectRatio="xMidYMid meet"`);
  }

  return out;
}

async function downloadIcon(iconName) {
  const iconPath = iconName.replace(":", "/");
  const url = `https://api.iconify.design/${iconPath}.svg`;
  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(`Failed ${url}: HTTP ${res.status}`);
  }
  return res.text();
}

async function main() {
  const args = parseArgs(process.argv);
  const vendorsJsonPath = args["vendors-json"] || "sample-data/demo-providers.json";
  const outDir = args["out-dir"] || "private-data/provider-logos/token-branded";
  const sizePx = Number(args["size"] || 96);

  const raw = fs.readFileSync(vendorsJsonPath, "utf8");
  const parsed = JSON.parse(raw);
  if (!Array.isArray(parsed)) {
    throw new Error("vendors-json debe ser un array.");
  }

  const vendors = parsed
    .map((item) => {
      if (typeof item === "string") return item.trim();
      if (item && typeof item.name === "string") return item.name.trim();
      if (item && typeof item.displayName === "string") return item.displayName.trim();
      if (item && typeof item.catalogVendorName === "string") return item.catalogVendorName.trim();
      return "";
    })
    .filter(Boolean);

  // Set token-branded only (logos style for partner slider).
  const tokenBrandedIcons = [
    "token-branded:coinbase",
    "token-branded:kraken",
    "token-branded:polygon",
    "token-branded:chain",
    "token-branded:stellar",
    "token-branded:solana",
    "token-branded:optimism",
    "token-branded:arb",
    "token-branded:near",
    "token-branded:sui",
    "token-branded:base",
    "token-branded:linea",
    "token-branded:aptos",
    "token-branded:injective",
    "token-branded:avalanche",
    "token-branded:cardano",
    "token-branded:mantle",
    "token-branded:metamask",
    "token-branded:wallet-connect",
    "token-branded:uniswap",
  ];

  fs.mkdirSync(outDir, { recursive: true });
  const manifest = [];

  for (let i = 0; i < vendors.length; i += 1) {
    const vendor = vendors[i];
    const vendorSlug = slugify(vendor);
    const icon = tokenBrandedIcons[i % tokenBrandedIcons.length];
    const svgRaw = await downloadIcon(icon);
    const svgNormalized = normalizeSvgForLogoSlider(svgRaw, sizePx);
    const fileName = `${vendorSlug}__token-branded__${icon.replace(":", "-")}.svg`;
    const outPath = path.join(outDir, fileName);
    fs.writeFileSync(outPath, svgNormalized, "utf8");
    manifest.push({
      vendor,
      vendor_slug: vendorSlug,
      iconify_icon: icon,
      size_px: sizePx,
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
