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

function buildBody() {
  const cover = 'https://cdn.shopify.com/s/files/1/1016/5102/2161/files/article1-cover_92b9a8df-40a1-4086-ab33-f21c4f331ccc.webp?v=1778946954';
  const g1 = 'https://cdn.shopify.com/s/files/1/1016/5102/2161/files/article1-gallery-1_ae952249-401a-4fb4-8070-1194bf85f0ff.webp?v=1778946955';
  const g2 = 'https://cdn.shopify.com/s/files/1/1016/5102/2161/files/article1-gallery-2_ce5ad11a-e843-406a-a665-5e2f0110cd3b.webp?v=1778946956';

  return `
<h3>1. Factores que influyen en el precio</h3>
<p>El precio de un detailing puede variar segun estado del coche, nivel tecnico y productos aplicados.</p>
<ul>
  <li><strong>Tamano del vehiculo:</strong> un SUV requiere mas tiempo que un compacto.</li>
  <li><strong>Estado inicial:</strong> mas marcas implica mayor correccion y horas de trabajo.</li>
  <li><strong>Proteccion elegida:</strong> sellante, coating o correccion profunda cambian el coste.</li>
  <li><strong>Ubicacion y reputacion:</strong> talleres especializados suelen ofrecer protocolos mas estables.</li>
</ul>
<h3>2. Precios medios en Barcelona en 2026</h3>
<table>
  <thead>
    <tr><th>Servicio base</th><th>Desde</th></tr>
  </thead>
  <tbody>
    <tr><td>Detailing interior</td><td>70 EUR</td></tr>
    <tr><td>Detailing exterior</td><td>90 EUR</td></tr>
    <tr><td>Detailing completo</td><td>150 EUR</td></tr>
    <tr><td>Correccion de pintura + coating</td><td>350 EUR</td></tr>
  </tbody>
</table>
<h3>3. Que incluye cada tipo de detailing</h3>
<div class="article-grid">
  <div>
    <img src="${cover}" alt="Detailing interior en Barcelona" loading="lazy">
    <h4>Detailing interior</h4>
    <ul>
      <li>Aspirado tecnico</li>
      <li>Limpieza de superficies</li>
      <li>Higienizacion de habitaculo</li>
    </ul>
    <p><strong>Desde 70 EUR</strong></p>
  </div>
  <div>
    <img src="${g1}" alt="Detailing exterior con pulido" loading="lazy">
    <h4>Detailing exterior</h4>
    <ul>
      <li>Lavado de precision</li>
      <li>Descontaminado de pintura</li>
      <li>Proteccion basica</li>
    </ul>
    <p><strong>Desde 90 EUR</strong></p>
  </div>
  <div>
    <img src="${g2}" alt="Detailing completo y proteccion" loading="lazy">
    <h4>Detailing completo</h4>
    <ul>
      <li>Interior + exterior</li>
      <li>Correccion visual</li>
      <li>Acabado premium</li>
    </ul>
    <p><strong>Desde 150 EUR</strong></p>
  </div>
</div>
<h3>4. Consejos para elegir bien</h3>
<p>Compara procesos reales, no solo precio final. Revisa opiniones y ejemplos de trabajos en condiciones parecidas a tu coche.</p>
<p>Consulta la <a href="https://www.race.es/consejos-mantenimiento-coche" target="_blank" rel="noopener noreferrer">guia del RACE</a> y visita <a href="/products/pulido-pintura-la-cochera-place">Pulido de Pintura</a> para comparar niveles de servicio.</p>
`;
}

(async () => {
  loadEnv('private-data/shopify-admin-clientcreds.env');
  loadEnv('private-data/shopify-admin-legacy.env');

  const articleId = 'gid://shopify/Article/642428240209';
  const hero = 'https://cdn.shopify.com/s/files/1/1016/5102/2161/files/article1-cover_92b9a8df-40a1-4086-ab33-f21c4f331ccc.webp?v=1778946954';

  const data = await shopifyGraphQL(`#graphql
    mutation UpdateArticle($id: ID!, $article: ArticleUpdateInput!) {
      articleUpdate(id: $id, article: $article) {
        article { id title handle image { url altText } updatedAt }
        userErrors { field message }
      }
    }
  `, {
    id: articleId,
    article: {
      body: buildBody(),
      image: {
        url: hero,
        altText: 'Cuanto cuesta un detailing en Barcelona en 2026',
      },
    },
  }, { apiVersion: '2026-04' });

  if (data.articleUpdate.userErrors?.length) {
    throw new Error(data.articleUpdate.userErrors.map((e) => e.message).join(' | '));
  }

  console.log(JSON.stringify(data.articleUpdate.article, null, 2));
})().catch((e) => {
  console.error(`ERROR: ${e.message}`);
  process.exit(1);
});
