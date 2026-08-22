#!/usr/bin/env node
const fs = require('node:fs');
const { shopifyGraphQL } = require('./lib/shopify-auth.cjs');

function loadEnv(file) {
  if (!fs.existsSync(file)) return;
  const raw = fs.readFileSync(file, 'utf8');
  for (const line of raw.split(/\r?\n/)) {
    const t = line.trim();
    if (!t || t.startsWith('#')) continue;
    const i = t.indexOf('=');
    if (i < 1) continue;
    const k = t.slice(0, i).trim();
    let v = t.slice(i + 1).trim();
    if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) v = v.slice(1, -1);
    if (!process.env[k]) process.env[k] = v;
  }
}

(async () => {
  loadEnv('private-data/shopify-admin-clientcreds.env');
  loadEnv('private-data/shopify-admin-legacy.env');
  const data = await shopifyGraphQL(`#graphql
    query Files {
      files(first: 100) {
        nodes {
          ... on MediaImage {
            image { url }
          }
        }
      }
    }
  `);
  const urls = (data.files.nodes || [])
    .map((n) => n?.image?.url)
    .filter(Boolean)
    .filter((u) => u.includes('article1-') || u.includes('lcp-'));
  console.log(JSON.stringify(urls, null, 2));
})().catch((e) => {
  console.error(`ERROR: ${e.message}`);
  process.exit(1);
});
