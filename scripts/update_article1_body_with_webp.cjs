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

function buildHtml() {
  const cover = 'https://cdn.shopify.com/s/files/1/1016/5102/2161/files/article1-cover_92b9a8df-40a1-4086-ab33-f21c4f331ccc.webp?v=1778946954';
  const gallery1 = 'https://cdn.shopify.com/s/files/1/1016/5102/2161/files/article1-gallery-1_ae952249-401a-4fb4-8070-1194bf85f0ff.webp?v=1778946955';
  const gallery2 = 'https://cdn.shopify.com/s/files/1/1016/5102/2161/files/article1-gallery-2_ce5ad11a-e843-406a-a665-5e2f0110cd3b.webp?v=1778946956';
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
<p><img src="${cover}" alt="Coche premium en proceso de detailing profesional" loading="lazy"></p>
<p><img src="${gallery1}" alt="Proceso de pulido profesional sobre pintura" loading="lazy"></p>
<p><img src="${gallery2}" alt="Resultado final con brillo y proteccion ceramica" loading="lazy"></p>
<h3>Conclusion y siguiente paso</h3>
<p>En resumen, el precio correcto depende del objetivo real, no solo del paquete comercial mas visible.</p>
<p>Si buscas proteger valor y apariencia, pide asesoramiento y elige un servicio ajustado a tu uso diario.</p>
<p>Ahora puedes solicitar tu evaluacion en <a href="/pages/contact">contacto</a> o registrarte como aliado en <a href="/pages/quiero-ser-proveedor">quiero ser proveedor</a>.</p>
`;
}

(async()=>{
  loadEnv('private-data/shopify-admin-clientcreds.env');
  loadEnv('private-data/shopify-admin-legacy.env');
  const articleId = 'gid://shopify/Article/642428240209';
  const data = await shopifyGraphQL(`#graphql
    mutation UpdateArticle($id: ID!, $article: ArticleUpdateInput!) {
      articleUpdate(id: $id, article: $article) {
        article { id title handle isPublished blog { handle } }
        userErrors { field message }
      }
    }
  `, {
    id: articleId,
    article: {
      body: buildHtml(),
    },
  });
  if (data.articleUpdate.userErrors?.length) {
    throw new Error(data.articleUpdate.userErrors.map((e) => e.message).join(' | '));
  }
  console.log(JSON.stringify(data.articleUpdate.article, null, 2));
})().catch((e)=>{ console.error(`ERROR: ${e.message}`); process.exit(1);});
