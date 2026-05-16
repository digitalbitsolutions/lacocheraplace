#!/usr/bin/env node
const fs = require('node:fs');
const fsp = require('node:fs/promises');
const path = require('node:path');
const { shopifyGraphQL } = require('./lib/shopify-auth.cjs');

function loadEnvFile(filePath) {
  if (!fs.existsSync(filePath)) return;
  const raw = fs.readFileSync(filePath, 'utf8');
  for (const line of raw.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const idx = trimmed.indexOf('=');
    if (idx <= 0) continue;
    const key = trimmed.slice(0, idx).trim();
    let value = trimmed.slice(idx + 1).trim();
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1);
    }
    if (!process.env[key]) process.env[key] = value;
  }
}

async function stagedUpload(filePath, filename, mimeType) {
  const stat = await fsp.stat(filePath);
  const data = await shopifyGraphQL(
    `#graphql
    mutation Staged($input:[StagedUploadInput!]!){
      stagedUploadsCreate(input:$input){
        stagedTargets{ url resourceUrl parameters{name value} }
        userErrors{ field message }
      }
    }`,
    {
      input: [{
        filename,
        mimeType,
        resource: 'FILE',
        httpMethod: 'POST',
        fileSize: String(stat.size),
      }],
    },
  );

  const errs = data.stagedUploadsCreate.userErrors || [];
  if (errs.length) throw new Error(`stagedUploadsCreate: ${errs.map((e) => e.message).join(' | ')}`);
  return data.stagedUploadsCreate.stagedTargets[0];
}

async function uploadToStagedTarget(target, filePath, mimeType) {
  const form = new FormData();
  for (const p of target.parameters || []) form.append(p.name, p.value);
  const fileBuffer = await fsp.readFile(filePath);
  const blob = new Blob([fileBuffer], { type: mimeType });
  form.append('file', blob, path.basename(filePath));
  const res = await fetch(target.url, { method: 'POST', body: form });
  if (!res.ok) {
    const txt = await res.text();
    throw new Error(`staged upload failed ${res.status}: ${txt.slice(0, 200)}`);
  }
}

async function createImageFile(resourceUrl, alt) {
  const data = await shopifyGraphQL(
    `#graphql
    mutation FileCreate($files:[FileCreateInput!]!){
      fileCreate(files:$files){
        files{
          ... on MediaImage { id image { url } alt }
        }
        userErrors{ field message }
      }
    }`,
    {
      files: [{
        originalSource: resourceUrl,
        contentType: 'IMAGE',
        alt,
      }],
    },
  );
  const errs = data.fileCreate.userErrors || [];
  if (errs.length) throw new Error(`fileCreate: ${errs.map((e) => e.message).join(' | ')}`);
  const created = data.fileCreate.files?.[0];
  return created?.image?.url || '';
}

async function getTargetBlogId() {
  const data = await shopifyGraphQL(
    `#graphql
    query Blogs {
      blogs(first: 20) {
        nodes { id title handle }
      }
    }`,
    {},
  );
  const blogs = data.blogs.nodes || [];
  if (!blogs.length) throw new Error('No hay blogs disponibles en la tienda.');
  const preferred = blogs.find((b) => b.handle === 'news') || blogs[0];
  return preferred.id;
}

function buildHtml(urls) {
  return `
<h2>Cuanto cuesta un detailing en Barcelona en 2026</h2>
<p>Si buscas un acabado premium, entender precios evita decisiones caras y resultados pobres.</p>
<p>Ademas, comparar servicios similares te ayuda a invertir mejor y proteger la pintura durante mas tiempo.</p>
<p>En esta guia veras rangos orientativos, factores clave y pasos para contratar con criterio.</p>
<h3>Rango de precios orientativo</h3>
<p>Un detailing exterior basico suele partir desde 80 EUR y puede superar 180 EUR, segun tamano, estado y tiempo total.</p>
<p>Por otro lado, un pulido con correccion puede ir de 180 EUR a 500 EUR, especialmente si hay marcas profundas.</p>
<p>Finalmente, un coating ceramico profesional puede situarse entre 350 EUR y 1.200 EUR, dependiendo de capas, marca y garantia ofrecida.</p>
<h3>Que incluye cada nivel de servicio</h3>
<p>Primero, el nivel basico incluye lavado tecnico, descontaminado suave y sellado de corta duracion.</p>
<p>Luego, el nivel intermedio agrega correccion parcial, mejora visual clara y mayor resistencia frente a contaminantes urbanos.</p>
<p>En cambio, el nivel avanzado incorpora correccion amplia, preparacion detallada y proteccion de larga duracion.</p>
<h3>Factores que cambian el precio</h3>
<p>El estado inicial del coche impacta mucho, porque una pintura descuidada requiere mas horas de trabajo especializado.</p>
<p>Asimismo, el tipo de producto aplicado modifica el presupuesto, ya que calidad y durabilidad no cuestan lo mismo.</p>
<p>Tambien influye la reputacion del taller, porque experiencia documentada suele reducir riesgos de acabado deficiente.</p>
<h3>Como elegir taller sin fallar</h3>
<p>Antes de contratar, revisa resultados reales, procesos explicados y condiciones de garantia por escrito.</p>
<p>Despues, solicita un diagnostico previo para evitar precios ambiguos y expectativas mal definidas.</p>
<p>Por consiguiente, compara propuestas equivalentes, no solo importes finales, para decidir con datos utiles.</p>
<h3>Enlaces utiles para decidir mejor</h3>
<p>Para conocer recomendaciones de mantenimiento, consulta la <a href="https://www.race.es/consejos-mantenimiento-coche" target="_blank" rel="noopener noreferrer">guia del RACE</a>.</p>
<p>Ademas, revisa recursos de consumo en movilidad en <a href="https://www.ocu.org/coches" target="_blank" rel="noopener noreferrer">OCU Coches</a>.</p>
<p>Si quieres comparar servicios locales, visita <a href="/products/lavado-completo-la-cochera-place">Lavado Completo</a> y <a href="/products/pulido-pintura-la-cochera-place">Pulido de Pintura</a>.</p>
<h3>Mini galeria</h3>
<p><img src="${urls.cover}" alt="Coche premium en proceso de detailing profesional" loading="lazy"></p>
<p><img src="${urls.gallery1}" alt="Proceso de pulido profesional sobre pintura" loading="lazy"></p>
<p><img src="${urls.gallery2}" alt="Resultado final con brillo y proteccion ceramica" loading="lazy"></p>
<h3>Conclusion y siguiente paso</h3>
<p>En resumen, el precio correcto depende del objetivo real, no solo del paquete comercial mas visible.</p>
<p>Si buscas proteger valor y apariencia, pide asesoramiento y elige un servicio ajustado a tu uso diario.</p>
<p>Ahora puedes solicitar tu evaluacion en <a href="/pages/contact">contacto</a> o registrarte como aliado en <a href="/pages/quiero-ser-proveedor">quiero ser proveedor</a>.</p>
`;
}

async function createArticle(blogId, html) {
  const data = await shopifyGraphQL(
    `#graphql
    mutation CreateArticle($article: ArticleCreateInput!) {
      articleCreate(article: $article) {
        article { id title handle blog { handle } isPublished }
        userErrors { field message }
      }
    }`,
    {
      article: {
        blogId,
        title: 'Cuanto cuesta un detailing en Barcelona en 2026',
        author: { name: 'La Cochera Place' },
        handle: 'cuanto-cuesta-detailing-barcelona-2026',
        tags: ['seo', 'detailing', 'barcelona', 'coches'],
        summary: 'Guia de precios orientativos de detailing en Barcelona, con factores clave para elegir servicio y proteger tu coche.',
        body: html,
        isPublished: false,
      },
    },
  );
  const errs = data.articleCreate.userErrors || [];
  if (errs.length) throw new Error(`articleCreate: ${errs.map((e) => e.message).join(' | ')}`);
  return data.articleCreate.article;
}

async function main() {
  loadEnvFile(path.resolve(process.cwd(), 'private-data/shopify-admin-clientcreds.env'));
  loadEnvFile(path.resolve(process.cwd(), 'private-data/shopify-admin-legacy.env'));

  const assetsDir = path.resolve(process.cwd(), 'project-docs/blog-assets');
  const files = [
    { key: 'cover', file: 'article1-cover.webp', alt: 'Coche premium en proceso de detailing profesional' },
    { key: 'gallery1', file: 'article1-gallery-1.webp', alt: 'Proceso de pulido profesional sobre pintura' },
    { key: 'gallery2', file: 'article1-gallery-2.webp', alt: 'Resultado final con brillo y proteccion ceramica' },
  ];

  const urls = {};
  for (const item of files) {
    const filePath = path.join(assetsDir, item.file);
    const staged = await stagedUpload(filePath, item.file, 'image/webp');
    await uploadToStagedTarget(staged, filePath, 'image/webp');
    urls[item.key] = await createImageFile(staged.resourceUrl, item.alt);
  }

  const blogId = await getTargetBlogId();
  const article = await createArticle(blogId, buildHtml(urls));

  console.log(JSON.stringify({
    ok: true,
    blogId,
    urls,
    article,
  }, null, 2));
}

main().catch((err) => {
  console.error(`ERROR: ${err.message}`);
  process.exit(1);
});
