#!/usr/bin/env node
const fs = require('node:fs');
const fsp = require('node:fs/promises');
const path = require('node:path');
const { shopifyGraphQL } = require('./lib/shopify-auth.cjs');

const ARTICLE_ID = 'gid://shopify/Article/642428240209';
const ASSETS = [
  {
    filename: 'article-detailing-interior.webp',
    alt: 'Limpieza profesional del interior de un vehículo',
    oldUrl: 'https://cdn.shopify.com/s/files/1/1016/5102/2161/files/article1-cover_92b9a8df-40a1-4086-ab33-f21c4f331ccc.webp?v=1778946954',
  },
  {
    filename: 'article-detailing-exterior.webp',
    alt: 'Detailing exterior y corrección de pintura',
    oldUrl: 'https://cdn.shopify.com/s/files/1/1016/5102/2161/files/article1-gallery-1_ae952249-401a-4fb4-8070-1194bf85f0ff.webp?v=1778946955',
  },
  {
    filename: 'article-detailing-complete.webp',
    alt: 'Detailing completo con acabado premium',
    oldUrl: 'https://cdn.shopify.com/s/files/1/1016/5102/2161/files/article1-gallery-2_ce5ad11a-e843-406a-a665-5e2f0110cd3b.webp?v=1778946956',
  },
];

function loadEnv(file) {
  if (!fs.existsSync(file)) return;
  for (const line of fs.readFileSync(file, 'utf8').split(/\r?\n/)) {
    const value = line.trim();
    if (!value || value.startsWith('#')) continue;
    const separator = value.indexOf('=');
    if (separator < 1) continue;
    const key = value.slice(0, separator).trim();
    let envValue = value.slice(separator + 1).trim();
    if ((envValue.startsWith('"') && envValue.endsWith('"')) || (envValue.startsWith("'") && envValue.endsWith("'"))) {
      envValue = envValue.slice(1, -1);
    }
    if (!process.env[key]) process.env[key] = envValue;
  }
}

async function uploadImage(asset) {
  const filePath = path.resolve('project-docs/blog-assets/generated', asset.filename);
  const { size } = await fsp.stat(filePath);
  const staged = await shopifyGraphQL(`#graphql
    mutation StagedUpload($input: [StagedUploadInput!]!) {
      stagedUploadsCreate(input: $input) {
        stagedTargets { url resourceUrl parameters { name value } }
        userErrors { message }
      }
    }
  `, {
    input: [{ filename: asset.filename, mimeType: 'image/webp', resource: 'FILE', httpMethod: 'POST', fileSize: String(size) }],
  });
  const target = staged.stagedUploadsCreate.stagedTargets?.[0];
  if (staged.stagedUploadsCreate.userErrors?.length || !target) {
    throw new Error(staged.stagedUploadsCreate.userErrors?.map((error) => error.message).join(' | ') || `No staged target for ${asset.filename}`);
  }

  const form = new FormData();
  for (const parameter of target.parameters) form.append(parameter.name, parameter.value);
  form.append('file', new Blob([await fsp.readFile(filePath)], { type: 'image/webp' }), asset.filename);
  const response = await fetch(target.url, { method: 'POST', body: form });
  if (!response.ok) throw new Error(`Staged upload failed for ${asset.filename}: ${response.status}`);

  const created = await shopifyGraphQL(`#graphql
    mutation CreateFile($files: [FileCreateInput!]!) {
      fileCreate(files: $files) {
        files { ... on MediaImage { id image { url } } }
        userErrors { message }
      }
    }
  `, { files: [{ originalSource: target.resourceUrl, contentType: 'IMAGE', alt: asset.alt }] });
  const file = created.fileCreate.files?.[0];
  if (created.fileCreate.userErrors?.length || !file?.id) {
    throw new Error(created.fileCreate.userErrors?.map((error) => error.message).join(' | ') || `Shopify did not create ${asset.filename}`);
  }
  if (file.image?.url) return file.image.url;
  for (let attempt = 0; attempt < 10; attempt += 1) {
    await new Promise((resolve) => setTimeout(resolve, 1200));
    const resolved = await shopifyGraphQL(`#graphql
      query FileImage($id: ID!) { node(id: $id) { ... on MediaImage { image { url } } } }
    `, { id: file.id });
    if (resolved.node?.image?.url) return resolved.node.image.url;
  }
  throw new Error(`Shopify no procesó ${asset.filename}`);
}

async function getArticle() {
  const data = await shopifyGraphQL(`#graphql
    query Article($id: ID!) { article(id: $id) { id title body } }
  `, { id: ARTICLE_ID });
  if (!data.article) throw new Error('Artículo no encontrado');
  return data.article;
}

async function updateArticle(body) {
  const data = await shopifyGraphQL(`#graphql
    mutation UpdateArticle($id: ID!, $article: ArticleUpdateInput!) {
      articleUpdate(id: $id, article: $article) {
        article { id title updatedAt }
        userErrors { field message }
      }
    }
  `, { id: ARTICLE_ID, article: { body } });
  if (data.articleUpdate.userErrors?.length) {
    throw new Error(data.articleUpdate.userErrors.map((error) => `${error.field?.join('.') || 'article'}: ${error.message}`).join(' | '));
  }
  return data.articleUpdate.article;
}

(async () => {
  loadEnv('private-data/shopify-admin-clientcreds.env');
  loadEnv('private-data/shopify-admin-legacy.env');

  const article = await getArticle();
  const uploaded = {};
  for (const asset of ASSETS) uploaded[asset.oldUrl] = await uploadImage(asset);

  let body = article.body;
  for (const [oldUrl, newUrl] of Object.entries(uploaded)) {
    if (!body.includes(oldUrl)) throw new Error(`La imagen original ya no está en el artículo: ${oldUrl}`);
    body = body.replaceAll(oldUrl, newUrl);
  }
  const updated = await updateArticle(body);
  console.log(JSON.stringify({ article: updated, replacements: uploaded }, null, 2));
})().catch((error) => {
  console.error(`ERROR: ${error.message}`);
  process.exit(1);
});
