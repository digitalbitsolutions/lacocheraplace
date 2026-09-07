#!/usr/bin/env node
/* eslint-disable no-console */
const fs = require("fs");
const path = require("path");
const { shopifyGraphQL, verifyShopifyConnection } = require("./lib/shopify-auth.cjs");

const inputPath = path.resolve("sample-data/chiclayo/provider_profiles_chiclayo.json");
const reportPath = path.resolve("project-docs/exports/chiclayo-provider-profile-verification.json");

function values(fields) {
  return Object.fromEntries((fields || []).map((field) => [field.key, field.value]));
}

async function main() {
  const expected = JSON.parse(fs.readFileSync(inputPath, "utf8"));
  const shop = await verifyShopifyConnection();
  const data = await shopifyGraphQL(`#graphql
    query VerifyChiclayoProfiles {
      metaobjects(type: "provider_profile", first: 250) {
        nodes { id handle fields { key value } }
      }
    }
  `);
  const byHandle = new Map(data.metaobjects.nodes.map((node) => [node.handle, node]));
  const profiles = expected.map((item) => {
    const node = byHandle.get(item.provider_slug);
    const fields = node ? values(node.fields) : {};
    const checks = {
      exists: Boolean(node),
      approved: fields.status === "approved",
      cityMatches: fields.city === item.city,
      regionMatches: fields.province_or_region === "Lambayeque",
      countryMatches: fields.country === "Perú",
      latitudeMatches: Number(fields.latitude) === Number(item.latitude),
      longitudeMatches: Number(fields.longitude) === Number(item.longitude),
      categoriesMatch: JSON.stringify(JSON.parse(fields.service_categories || "[]")) === JSON.stringify(item.service_categories),
      logoEmpty: !fields.logo && !fields.logo_source_url,
      galleryEmpty: !fields.gallery && !fields.gallery_source_urls,
    };
    return { handle: item.provider_slug, id: node?.id || null, checks, ok: Object.values(checks).every(Boolean) };
  });
  const report = { generatedAt: new Date().toISOString(), shop, expected: expected.length, liveProviderProfiles: data.metaobjects.nodes.length, verified: profiles.filter((item) => item.ok).length, failed: profiles.filter((item) => !item.ok).length, profiles };
  fs.mkdirSync(path.dirname(reportPath), { recursive: true });
  fs.writeFileSync(reportPath, `${JSON.stringify(report, null, 2)}\n`);
  console.log(JSON.stringify({ expected: report.expected, liveProviderProfiles: report.liveProviderProfiles, verified: report.verified, failed: report.failed, report: path.relative(process.cwd(), reportPath) }, null, 2));
  if (report.failed) process.exit(1);
}

main().catch((error) => { console.error(`ERROR: ${error.message}`); process.exit(1); });
