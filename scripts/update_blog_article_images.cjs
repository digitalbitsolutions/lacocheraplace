#!/usr/bin/env node
const fs = require('node:fs');
const fsp = require('node:fs/promises');
const path = require('node:path');
const { shopifyGraphQL } = require('./lib/shopify-auth.cjs');

function loadEnv(file) {
  if (!fs.existsSync(file)) return;
  for (const line of fs.readFileSync(file, 'utf8').split(/\r?\n/)) {
    const index = line.indexOf('=');
    if (index < 1 || line.trim().startsWith('#')) continue;
    const key = line.slice(0, index).trim();
    let value = line.slice(index + 1).trim();
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) value = value.slice(1, -1);
    if (!process.env[key]) process.env[key] = value;
  }
}

async function createFile(filePath, alt) {
  const stat = await fsp.stat(filePath);
  const staged = await shopifyGraphQL(`#graphql
    mutation Staged($input: [StagedUploadInput!]!) {
      stagedUploadsCreate(input: $input) { stagedTargets { url resourceUrl parameters { name value } } userErrors { message } }
    }`, { input: [{ filename: path.basename(filePath), mimeType: 'image/webp', resource: 'FILE', httpMethod: 'POST', fileSize: String(stat.size) }] });
  const stagedErrors = staged.stagedUploadsCreate.userErrors || [];
  if (stagedErrors.length) throw new Error(stagedErrors.map((error) => error.message).join(' | '));

  const target = staged.stagedUploadsCreate.stagedTargets[0];
  const form = new FormData();
  for (const parameter of target.parameters) form.append(parameter.name, parameter.value);
  form.append('file', new Blob([await fsp.readFile(filePath)], { type: 'image/webp' }), path.basename(filePath));
  const response = await fetch(target.url, { method: 'POST', body: form });
  if (!response.ok) throw new Error(`La carga temporal falló (${response.status}).`);

  const created = await shopifyGraphQL(`#graphql
    mutation FileCreate($files: [FileCreateInput!]!) {
      fileCreate(files: $files) { files { ... on MediaImage { image { url } } } userErrors { message } }
    }`, { files: [{ originalSource: target.resourceUrl, contentType: 'IMAGE', alt }] });
  const errors = created.fileCreate.userErrors || [];
  if (errors.length) throw new Error(errors.map((error) => error.message).join(' | '));
  return created.fileCreate.files[0]?.image?.url;
}

async function updateArticle(id, url, alt) {
  const data = await shopifyGraphQL(`#graphql
    mutation ArticleUpdate($id: ID!, $article: ArticleUpdateInput!) {
      articleUpdate(id: $id, article: $article) { article { title image { url altText } } userErrors { message } }
    }`, { id, article: { image: { url, altText: alt } } }, { apiVersion: '2026-04' });
  const errors = data.articleUpdate.userErrors || [];
  if (errors.length) throw new Error(errors.map((error) => error.message).join(' | '));
  return data.articleUpdate.article;
}

(async () => {
  loadEnv('private-data/shopify-admin-clientcreds.env');
  loadEnv('private-data/shopify-admin-legacy.env');
  const root = path.resolve('project-docs/blog-assets/generated');
  const articles = [
    ['gid://shopify/Article/641713996113', 'blog-detailing-services.webp', 'Detailing profesional con corrección de pintura en un taller automotriz'],
    ['gid://shopify/Article/641714028881', 'blog-car-wash.webp', 'Lavado profesional de coche con espuma y guante de microfibra'],
    ['gid://shopify/Article/641714061649', 'blog-ppf-protection.webp', 'Instalación profesional de película de protección de pintura PPF'],
    ['gid://shopify/Article/642428240209', 'blog-detailing-consultation.webp', 'Asesoría profesional para elegir un servicio de detailing automotriz'],
  ];
  const result = [];
  for (const [id, filename, alt] of articles) {
    const url = await createFile(path.join(root, filename), alt);
    result.push(await updateArticle(id, url, alt));
  }
  console.log(JSON.stringify(result, null, 2));
})().catch((error) => { console.error(`ERROR: ${error.message}`); process.exit(1); });
