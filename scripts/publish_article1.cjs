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

(async()=>{
  loadEnv('private-data/shopify-admin-clientcreds.env');
  loadEnv('private-data/shopify-admin-legacy.env');

  const id = 'gid://shopify/Article/642428240209';
  const upd = await shopifyGraphQL(`#graphql
    mutation PublishArticle($id: ID!, $article: ArticleUpdateInput!) {
      articleUpdate(id: $id, article: $article) {
        article { id handle isPublished blog { handle } }
        userErrors { field message }
      }
    }
  `, {
    id,
    article: {
      isPublished: true,
    },
  }, { apiVersion: '2026-04' });

  const errs = upd.articleUpdate.userErrors || [];
  if (errs.length) throw new Error(errs.map((e) => e.message).join(' | '));

  const article = upd.articleUpdate.article;
  const url = `https://lacocheraplace.com/blogs/${article.blog.handle}/${article.handle}`;
  console.log(JSON.stringify({ ok: true, article, url }, null, 2));
})();
