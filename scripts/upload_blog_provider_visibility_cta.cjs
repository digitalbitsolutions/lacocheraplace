#!/usr/bin/env node
const fs = require('node:fs');
const fsp = require('node:fs/promises');
const path = require('node:path');
const { shopifyGraphQL } = require('./lib/shopify-auth.cjs');

function loadEnv(file) {
  if (!fs.existsSync(file)) return;
  for (const line of fs.readFileSync(file, 'utf8').split(/\r?\n/)) {
    const entry = line.trim();
    const separator = entry.indexOf('=');
    if (!entry || entry.startsWith('#') || separator < 1) continue;
    const key = entry.slice(0, separator).trim();
    const value = entry.slice(separator + 1).trim().replace(/^['"]|['"]$/g, '');
    if (!process.env[key]) process.env[key] = value;
  }
}

(async () => {
  loadEnv('private-data/shopify-admin-clientcreds.env');
  loadEnv('private-data/shopify-admin-legacy.env');
  const filename = 'blog-provider-visibility-cta.webp';
  const filePath = path.resolve('project-docs/blog-assets/generated', filename);
  const { size } = await fsp.stat(filePath);
  const staged = await shopifyGraphQL(`#graphql
    mutation Staged($input: [StagedUploadInput!]!) {
      stagedUploadsCreate(input: $input) {
        stagedTargets { url resourceUrl parameters { name value } }
        userErrors { message }
      }
    }
  `, { input: [{ filename, mimeType: 'image/webp', resource: 'FILE', httpMethod: 'POST', fileSize: String(size) }] });
  const target = staged.stagedUploadsCreate.stagedTargets?.[0];
  if (!target) throw new Error(staged.stagedUploadsCreate.userErrors?.map((error) => error.message).join(' | ') || 'No se creó la carga temporal');

  const form = new FormData();
  for (const parameter of target.parameters) form.append(parameter.name, parameter.value);
  form.append('file', new Blob([await fsp.readFile(filePath)], { type: 'image/webp' }), filename);
  const uploaded = await fetch(target.url, { method: 'POST', body: form });
  if (!uploaded.ok) throw new Error(`Falló la carga temporal: ${uploaded.status}`);

  const created = await shopifyGraphQL(`#graphql
    mutation Create($files: [FileCreateInput!]!) {
      fileCreate(files: $files) {
        files { ... on MediaImage { id image { url } } }
        userErrors { message }
      }
    }
  `, { files: [{ originalSource: target.resourceUrl, contentType: 'IMAGE', alt: 'Promoción para proveedores destacados de La Cochera Place' }] });
  const image = created.fileCreate.files?.[0];
  if (!image?.id) throw new Error(created.fileCreate.userErrors?.map((error) => error.message).join(' | ') || 'No se creó la imagen');

  let url = image.image?.url;
  for (let attempt = 0; !url && attempt < 10; attempt += 1) {
    await new Promise((resolve) => setTimeout(resolve, 1200));
    const result = await shopifyGraphQL(`#graphql
      query Image($id: ID!) { node(id: $id) { ... on MediaImage { image { url } } } }
    `, { id: image.id });
    url = result.node?.image?.url;
  }
  if (!url) throw new Error('Shopify no terminó de procesar la imagen');
  console.log(JSON.stringify({ filename, url, themeReference: `shopify://shop_images/${filename}` }, null, 2));
})().catch((error) => {
  console.error(`ERROR: ${error.message}`);
  process.exit(1);
});
