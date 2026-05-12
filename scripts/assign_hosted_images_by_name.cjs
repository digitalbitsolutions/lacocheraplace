#!/usr/bin/env node

const API_VERSION = process.env.SHOPIFY_API_VERSION || '2025-01';

function requireEnv(name) {
  const v = process.env[name];
  if (!v) throw new Error(`Falta variable de entorno: ${name}`);
  return v;
}

function parseArgs(argv) {
  const args = {
    dryRun: false,
    targetTotal: 6,
    maxProducts: 0,
    includeAnyBelowTarget: false,
  };
  for (let i = 0; i < argv.length; i += 1) {
    const a = argv[i];
    if (a === '--dry-run') args.dryRun = true;
    else if (a === '--target-total') {
      args.targetTotal = Math.max(1, Number(argv[i + 1] || 6));
      i += 1;
    } else if (a === '--max-products') {
      args.maxProducts = Math.max(0, Number(argv[i + 1] || 0));
      i += 1;
    } else if (a === '--include-any-below-target') {
      args.includeAnyBelowTarget = true;
    } else if (a === '--help' || a === '-h') {
      console.log('Uso: node scripts/assign_hosted_images_by_name.cjs [--dry-run] [--target-total 6] [--include-any-below-target] [--max-products 20]');
      process.exit(0);
    } else {
      throw new Error(`Argumento no reconocido: ${a}`);
    }
  }
  return args;
}

async function gql(store, token, query, variables = {}) {
  const r = await fetch(`https://${store}/admin/api/${API_VERSION}/graphql.json`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Shopify-Access-Token': token,
    },
    body: JSON.stringify({ query, variables }),
  });
  const j = await r.json();
  if (!r.ok) throw new Error(`GraphQL HTTP ${r.status}: ${JSON.stringify(j)}`);
  if (j.errors?.length) throw new Error(j.errors.map((e) => e.message).join(', '));
  return j.data;
}

function tokenize(s) {
  return String(s || '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .split('-')
    .filter((x) => x.length >= 3);
}

function bucketFromHandle(handle) {
  const h = String(handle || '').toLowerCase();
  if (/(lavado|wash)/.test(h)) return 'lavado';
  if (/(pulido|pintura|ceram|faro|descontamin|chapa)/.test(h)) return 'pulido';
  if (/(interior|tapicer|ozono|cuero|aspirad|salon|detailing)/.test(h)) return 'interior';
  if (/(mantenimiento|revision|diagnostic|neumatic|llanta|freno|aceite|bateria|taller)/.test(h)) return 'taller';
  return 'fallback';
}

function scoreFilenameAgainstHandle(fileName, handle) {
  const fileTokens = new Set(tokenize(fileName));
  const handleTokens = tokenize(handle);
  let score = 0;
  for (const t of handleTokens) {
    if (fileTokens.has(t)) score += 3;
  }
  const b1 = bucketFromHandle(fileName);
  const b2 = bucketFromHandle(handle);
  if (b1 === b2 && b1 !== 'fallback') score += 2;
  return score;
}

async function listAllProducts(store, token) {
  const out = [];
  let after = null;
  while (true) {
    const data = await gql(
      store,
      token,
      `#graphql
      query($after:String){
        products(first:100, after:$after, query:"status:active"){
          pageInfo{hasNextPage endCursor}
          nodes{
            id
            title
            handle
            media(first:250){
              nodes{
                ... on MediaImage {
                  id
                  image { url }
                }
              }
            }
          }
        }
      }`,
      { after },
    );
    out.push(...data.products.nodes);
    if (!data.products.pageInfo.hasNextPage) break;
    after = data.products.pageInfo.endCursor;
  }
  return out;
}

async function listAllFiles(store, token) {
  const out = [];
  let after = null;
  while (true) {
    const data = await gql(
      store,
      token,
      `#graphql
      query($after:String){
        files(first:250, after:$after){
          pageInfo{hasNextPage endCursor}
          nodes{
            __typename
            ... on MediaImage {
              id
              fileStatus
              image { url }
            }
          }
        }
      }`,
      { after },
    );
    out.push(...data.files.nodes);
    if (!data.files.pageInfo.hasNextPage) break;
    after = data.files.pageInfo.endCursor;
  }
  return out
    .filter((n) => n.__typename === 'MediaImage' && n.fileStatus === 'READY' && n.image?.url)
    .map((n) => {
      const url = n.image.url;
      const clean = url.split('?')[0];
      const fileName = clean.substring(clean.lastIndexOf('/') + 1).toLowerCase();
      return { id: n.id, url, fileName };
    });
}

async function addProductImages(store, token, productId, urls) {
  const media = urls.map((u) => ({
    mediaContentType: 'IMAGE',
    originalSource: u,
  }));
  const data = await gql(
    store,
    token,
    `#graphql
    mutation($productId:ID!, $media:[CreateMediaInput!]!){
      productCreateMedia(productId:$productId, media:$media){
        media { id status }
        mediaUserErrors { field message }
      }
    }`,
    { productId, media },
  );
  const errs = data.productCreateMedia.mediaUserErrors || [];
  if (errs.length) throw new Error(errs.map((e) => e.message).join(' | '));
  return data.productCreateMedia.media || [];
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const store = requireEnv('SHOPIFY_STORE');
  const token = requireEnv('SHOPIFY_ADMIN_TOKEN');

  const [products, files] = await Promise.all([listAllProducts(store, token), listAllFiles(store, token)]);
  const usedUrls = new Set();
  const candidates = args.includeAnyBelowTarget
    ? products.filter((p) => (p.media?.nodes || []).length < args.targetTotal)
    : products.filter((p) => (p.media?.nodes || []).length <= 1);
  const toProcess = args.maxProducts > 0 ? candidates.slice(0, args.maxProducts) : candidates;

  const summary = {
    dryRun: args.dryRun,
    targetTotal: args.targetTotal,
    productsActive: products.length,
    productsZeroOrOne: candidates.length,
    filesReady: files.length,
    productsUpdated: 0,
    imagesAdded: 0,
    productsSkippedNoMatch: 0,
    errors: [],
    details: [],
  };

  for (const p of toProcess) {
    const existing = p.media?.nodes || [];
    const existingUrls = new Set(existing.map((m) => m?.image?.url).filter(Boolean));
    const need = Math.max(0, args.targetTotal - existing.length);
    if (need <= 0) continue;

    const scored = files
      .filter((f) => !existingUrls.has(f.url) && !usedUrls.has(f.url))
      .map((f) => ({ ...f, score: scoreFilenameAgainstHandle(f.fileName, p.handle) }))
      .filter((f) => f.score >= 3)
      .sort((a, b) => b.score - a.score);

    const selected = scored.slice(0, need);
    if (!selected.length) {
      summary.productsSkippedNoMatch += 1;
      summary.details.push({ handle: p.handle, title: p.title, existing: existing.length, added: 0, note: 'no_match' });
      continue;
    }

    if (!args.dryRun) {
      try {
        await addProductImages(store, token, p.id, selected.map((s) => s.url));
      } catch (e) {
        summary.errors.push({ handle: p.handle, error: String(e.message || e) });
        continue;
      }
    }

    selected.forEach((s) => usedUrls.add(s.url));
    summary.productsUpdated += 1;
    summary.imagesAdded += selected.length;
    summary.details.push({
      handle: p.handle,
      title: p.title,
      existing: existing.length,
      added: selected.length,
      final: existing.length + selected.length,
      sampleFiles: selected.slice(0, 3).map((s) => s.fileName),
    });
  }

  console.log(JSON.stringify(summary, null, 2));
}

main().catch((e) => {
  console.error(`ERROR: ${e.message}`);
  process.exit(1);
});
