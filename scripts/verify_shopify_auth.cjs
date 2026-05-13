#!/usr/bin/env node
/* eslint-disable no-console */
const fs = require("fs");
const { getShopifyAccessToken, verifyShopifyConnection } = require("./lib/shopify-auth.cjs");

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

async function main() {
  const envArgIdx = process.argv.indexOf("--env-file");
  if (envArgIdx >= 0 && process.argv[envArgIdx + 1]) {
    loadEnvFile(process.argv[envArgIdx + 1]);
  }

  const tokenInfo = await getShopifyAccessToken({ log: true, forceRefresh: true });
  const tokenPrefix = tokenInfo.accessToken.slice(0, 10);
  const tokenSuffix = tokenInfo.accessToken.slice(-6);
  console.log(
    `[verify] token obtenido correctamente | source=${tokenInfo.source} | token=${tokenPrefix}...${tokenSuffix}`,
  );
  console.log(`[verify] expires_in=${tokenInfo.expiresInSec}s`);
  console.log(`[verify] scopes=${tokenInfo.scope || "(no informado)"}`);

  const shop = await verifyShopifyConnection();
  console.log("[verify] resultado query:", JSON.stringify(shop));
}

main().catch((err) => {
  console.error(`ERROR: ${err.message}`);
  process.exit(1);
});

