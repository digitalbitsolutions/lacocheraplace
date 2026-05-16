#!/usr/bin/env node
const fs = require('node:fs');
const fsp = require('node:fs/promises');
const path = require('node:path');
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

async function stagedUpload(filePath, filename, mimeType) {
  const stat = await fsp.stat(filePath);
  const data = await shopifyGraphQL(`#graphql
    mutation Staged($input:[StagedUploadInput!]!){
      stagedUploadsCreate(input:$input){
        stagedTargets{url resourceUrl parameters{name value}}
        userErrors{field message}
      }
    }
  `, {
    input: [{ filename, mimeType, resource: 'FILE', httpMethod: 'POST', fileSize: String(stat.size) }],
  });
  if (data.stagedUploadsCreate.userErrors?.length) {
    throw new Error(data.stagedUploadsCreate.userErrors.map((e) => e.message).join(' | '));
  }
  return data.stagedUploadsCreate.stagedTargets[0];
}

async function uploadBinary(target, filePath, mimeType) {
  const form = new FormData();
  for (const p of target.parameters || []) form.append(p.name, p.value);
  const fileBuffer = await fsp.readFile(filePath);
  form.append('file', new Blob([fileBuffer], { type: mimeType }), path.basename(filePath));
  const res = await fetch(target.url, { method: 'POST', body: form });
  if (!res.ok) throw new Error(`staged upload failed ${res.status}`);
}

async function createFile(resourceUrl, alt) {
  const data = await shopifyGraphQL(`#graphql
    mutation CreateFile($files:[FileCreateInput!]!){
      fileCreate(files:$files){
        files{
          ... on MediaImage { id image { url } alt }
        }
        userErrors{field message}
      }
    }
  `, {
    files: [{ originalSource: resourceUrl, contentType: 'IMAGE', alt }],
  });
  if (data.fileCreate.userErrors?.length) {
    throw new Error(data.fileCreate.userErrors.map((e) => e.message).join(' | '));
  }
  return data.fileCreate.files?.[0] || null;
}

async function resolveMediaImageUrlById(id) {
  const data = await shopifyGraphQL(`#graphql
    query Resolve($id: ID!) {
      node(id: $id) {
        ... on MediaImage {
          id
          image { url }
        }
      }
    }
  `, { id });
  return data.node?.image?.url || null;
}

(async () => {
  loadEnv('private-data/shopify-admin-clientcreds.env');
  loadEnv('private-data/shopify-admin-legacy.env');

  const assets = [
    ['article1-cover.webp', 'Coche premium en proceso de detailing profesional'],
    ['article1-gallery-1.webp', 'Proceso de pulido profesional sobre pintura'],
    ['article1-gallery-2.webp', 'Resultado final con brillo y proteccion ceramica'],
  ];

  const out = {};
  for (const [file, alt] of assets) {
    const filePath = path.resolve('project-docs/blog-assets', file);
    const staged = await stagedUpload(filePath, file, 'image/webp');
    await uploadBinary(staged, filePath, 'image/webp');
    const created = await createFile(staged.resourceUrl, alt);
    out[file] = { id: created?.id || null, url: created?.image?.url || null };
  }

  for (let i = 0; i < 10; i += 1) {
    let pending = 0;
    for (const file of Object.keys(out)) {
      if (out[file].url) continue;
      if (!out[file].id) continue;
      const resolved = await resolveMediaImageUrlById(out[file].id);
      if (resolved) out[file].url = resolved;
      else pending += 1;
    }
    if (pending === 0) break;
    await new Promise((r) => setTimeout(r, 1500));
  }

  console.log(JSON.stringify(out, null, 2));
})().catch((e) => {
  console.error(`ERROR: ${e.message}`);
  process.exit(1);
});
