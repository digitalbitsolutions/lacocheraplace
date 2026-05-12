#!/usr/bin/env node

const fs = require('node:fs/promises');
const path = require('node:path');

const API_VERSION = process.env.SHOPIFY_API_VERSION || '2025-01';

function parseArgs(argv) {
  const args = {
    metadata: '',
    perProduct: 1,
    targetTotal: 0,
    handles: '',
    dryRun: false,
    onlyActive: true,
  };

  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === '--metadata') {
      args.metadata = argv[i + 1] || '';
      i += 1;
    } else if (arg === '--per-product') {
      args.perProduct = Math.max(1, Number(argv[i + 1] || 1));
      i += 1;
    } else if (arg === '--target-total') {
      args.targetTotal = Math.max(0, Number(argv[i + 1] || 0));
      i += 1;
    } else if (arg === '--handles') {
      args.handles = String(argv[i + 1] || '');
      i += 1;
    } else if (arg === '--dry-run') {
      args.dryRun = true;
    } else if (arg === '--include-draft') {
      args.onlyActive = false;
    } else if (arg === '--help' || arg === '-h') {
      console.log('Uso: node scripts/assign_new_images_to_zero_media_products.cjs [--metadata <ruta.csv>] [--per-product 1] [--target-total 6] [--handles h1,h2] [--dry-run]');
      process.exit(0);
    } else {
      throw new Error(`Argumento no reconocido: ${arg}`);
    }
  }

  return args;
}

function requireEnv(name) {
  const value = process.env[name];
  if (!value) throw new Error(`Falta variable de entorno requerida: ${name}`);
  return value;
}

async function shopifyGraphql(store, token, query, variables = {}) {
  const endpoint = `https://${store}/admin/api/${API_VERSION}/graphql.json`;
  const response = await fetch(endpoint, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Shopify-Access-Token': token,
    },
    body: JSON.stringify({ query, variables }),
  });

  const payload = await response.json();
  if (!response.ok) {
    throw new Error(`GraphQL HTTP ${response.status}: ${JSON.stringify(payload)}`);
  }
  if (payload.errors?.length) {
    throw new Error(payload.errors.map((x) => x.message).join(', '));
  }
  return payload.data;
}

async function uploadProductImage(store, token, productNumericId, imagePath, altText = '') {
  const endpoint = `https://${store}/admin/api/${API_VERSION}/products/${productNumericId}/images.json`;
  const fileBuffer = await fs.readFile(imagePath);
  const attachment = fileBuffer.toString('base64');
  const filename = path.basename(imagePath);

  const response = await fetch(endpoint, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Shopify-Access-Token': token,
    },
    body: JSON.stringify({
      image: {
        attachment,
        filename,
        alt: altText || undefined,
      },
    }),
  });

  const payload = await response.json();
  if (!response.ok) {
    throw new Error(`REST HTTP ${response.status}: ${JSON.stringify(payload)}`);
  }

  return payload.image;
}

function parseCsvLine(line) {
  const values = [];
  let value = '';
  let inQuotes = false;

  for (let i = 0; i < line.length; i += 1) {
    const char = line[i];
    if (char === '"') {
      if (inQuotes && line[i + 1] === '"') {
        value += '"';
        i += 1;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (char === ',' && !inQuotes) {
      values.push(value);
      value = '';
    } else {
      value += char;
    }
  }
  values.push(value);
  return values;
}

async function readCsv(filePath) {
  const raw = await fs.readFile(filePath, 'utf8');
  const lines = raw.split(/\r?\n/).filter((line) => line.trim() !== '');
  if (!lines.length) return [];

  const headers = parseCsvLine(lines[0]).map((h) => h.trim());
  const rows = [];

  for (let i = 1; i < lines.length; i += 1) {
    const cols = parseCsvLine(lines[i]);
    const row = {};
    headers.forEach((header, index) => {
      row[header] = (cols[index] || '').trim();
    });
    rows.push(row);
  }
  return rows;
}

async function findLatestMetadataCsv() {
  const logsDir = path.resolve(process.cwd(), 'scripts/product-image-pipeline/logs');
  const entries = await fs.readdir(logsDir, { withFileTypes: true });
  const candidates = [];
  for (const entry of entries) {
    if (!entry.isFile()) continue;
    if (!entry.name.startsWith('metadata-') || !entry.name.endsWith('.csv')) continue;
    const fullPath = path.join(logsDir, entry.name);
    const stat = await fs.stat(fullPath);
    candidates.push({ fullPath, mtimeMs: stat.mtimeMs });
  }
  if (!candidates.length) throw new Error('No se encontro metadata-*.csv en scripts/product-image-pipeline/logs');
  candidates.sort((a, b) => b.mtimeMs - a.mtimeMs);
  return candidates[0].fullPath;
}

function gidToNumericProductId(gid) {
  const parts = String(gid || '').split('/');
  return parts[parts.length - 1] || '';
}

async function listAllProducts(store, token, onlyActive) {
  const products = [];
  let after = null;

  while (true) {
    const data = await shopifyGraphql(
      store,
      token,
      `#graphql
        query ListProducts($first: Int!, $after: String, $query: String) {
          products(first: $first, after: $after, query: $query) {
            pageInfo { hasNextPage endCursor }
            nodes {
              id
              handle
              title
              status
              media(first: 250) {
                nodes { id }
              }
            }
          }
        }
      `,
      {
        first: 100,
        after,
        query: onlyActive ? 'status:active' : null,
      },
    );

    const chunk = data.products.nodes || [];
    products.push(...chunk);

    if (!data.products.pageInfo.hasNextPage) break;
    after = data.products.pageInfo.endCursor;
  }

  return products;
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const store = requireEnv('SHOPIFY_STORE');
  const token = requireEnv('SHOPIFY_ADMIN_TOKEN');

  const metadataPath = path.resolve(process.cwd(), args.metadata || (await findLatestMetadataCsv()));
  const metadata = await readCsv(metadataPath);

  const byHandle = new Map();
  const pool = [];

  for (const row of metadata) {
    const localPath = row.local_path ? path.resolve(process.cwd(), row.local_path) : '';
    if (!localPath) continue;
    try {
      await fs.access(localPath);
    } catch {
      continue;
    }
    const handle = path.basename(path.dirname(localPath));
    if (!byHandle.has(handle)) byHandle.set(handle, []);
    byHandle.get(handle).push(localPath);
    pool.push(localPath);
  }

  const uniquePool = [...new Set(pool)];
  let poolIndex = 0;
  const used = new Set();

  const bucketRules = [
    { name: 'lavado', product: ['lavado'], image: ['lavado-completo', 'lavado-exterior-premium', 'lavado-vapor-interior', 'lavado-salon-interior', 'lavado-llantas-aros', 'motor-a-vapor'] },
    { name: 'pulido', product: ['pulido', 'pintura', 'ceramico', 'ceramica', 'descontaminado', 'encerado', 'faros'], image: ['pulido-pintura', 'pulido-faros', 'pulido-ceramico', 'descontaminado-pintura', 'encerado-carroceria', 'ceramico-carpro'] },
    { name: 'interior', product: ['interior', 'tapiceria', 'cuero', 'cuero', 'asiento', 'aspirado'], image: ['limpieza-interior-premium', 'limpieza-tapiceria', 'cueros-aros', 'aspirado-interior-pro'] },
    { name: 'taller', product: ['mantenimiento', 'revision', 'diagnostico', 'neumatico', 'llanta', 'frenos', 'aceite', 'bateria'], image: ['mantenimiento-basico', 'revision-general-taller', 'diagnostico-computarizado', 'cambio-neumaticos-rapido'] },
    { name: 'detailing', product: ['detailing'], image: ['detailing-premium'] },
  ];

  function inferBucket(handle) {
    const h = String(handle || '').toLowerCase();
    for (const rule of bucketRules) {
      if (rule.product.some((k) => h.includes(k))) return rule.name;
    }
    return 'fallback';
  }

  const imagesByBucket = new Map();
  for (const [imgHandle, files] of byHandle.entries()) {
    const bucket = inferBucket(imgHandle);
    if (!imagesByBucket.has(bucket)) imagesByBucket.set(bucket, []);
    imagesByBucket.get(bucket).push(...files);
  }

  const products = await listAllProducts(store, token, args.onlyActive);
  const zeroMedia = products.filter((p) => (p.media?.nodes || []).length === 0);
  const handleFilter = String(args.handles || '')
    .split(',')
    .map((h) => h.trim().toLowerCase())
    .filter(Boolean);

  let targetProducts = args.targetTotal > 0
    ? products.filter((p) => (p.media?.nodes || []).length < args.targetTotal)
    : zeroMedia;
  if (handleFilter.length) {
    const set = new Set(handleFilter);
    targetProducts = targetProducts.filter((p) => set.has(String(p.handle || '').toLowerCase()));
  }

  const summary = {
    metadataPath,
    dryRun: args.dryRun,
    perProduct: args.perProduct,
    targetTotal: args.targetTotal,
    handles: handleFilter,
    totalProductsScanned: products.length,
    zeroMediaProducts: zeroMedia.length,
    productsBelowTarget: products.filter((p) => (p.media?.nodes || []).length < (args.targetTotal || 1)).length,
    imagesAvailableInMetadata: uniquePool.length,
    productsUpdated: 0,
    uploadsOk: 0,
    uploadsFailed: 0,
    skippedNoImageAvailable: 0,
    details: [],
  };

  for (const product of targetProducts) {
    const desired = [];
    const preferred = byHandle.get(product.handle) || [];
    const existingCount = (product.media?.nodes || []).length;
    const neededCount = args.targetTotal > 0
      ? Math.max(0, args.targetTotal - existingCount)
      : args.perProduct;

    for (const img of preferred) {
      if (!used.has(img) && desired.length < neededCount) desired.push(img);
    }

    if (desired.length < neededCount) {
      const bucket = inferBucket(product.handle);
      const bucketPool = imagesByBucket.get(bucket) || [];
      for (const img of bucketPool) {
        if (!used.has(img) && desired.length < neededCount) desired.push(img);
      }
    }

    while (desired.length < neededCount && poolIndex < uniquePool.length) {
      const candidate = uniquePool[poolIndex];
      poolIndex += 1;
      if (used.has(candidate)) continue;
      desired.push(candidate);
    }

    if (!desired.length) {
      summary.skippedNoImageAvailable += 1;
      summary.details.push({ handle: product.handle, status: 'skipped_no_image' });
      continue;
    }

    const productNumericId = gidToNumericProductId(product.id);
    let okCount = 0;
    const errors = [];

    for (const imagePath of desired) {
      if (args.dryRun) {
        used.add(imagePath);
        okCount += 1;
        continue;
      }
      try {
        await uploadProductImage(store, token, productNumericId, imagePath, product.title || product.handle);
        used.add(imagePath);
        okCount += 1;
        summary.uploadsOk += 1;
      } catch (error) {
        summary.uploadsFailed += 1;
        errors.push({ imagePath, error: String(error.message || error) });
      }
    }

    if (okCount > 0) summary.productsUpdated += 1;
    summary.details.push({
      handle: product.handle,
      title: product.title,
      bucket: inferBucket(product.handle),
      existingCount,
      neededCount,
      requested: desired.length,
      assigned: okCount,
      failed: errors.length,
      errors,
    });
  }

  console.log(JSON.stringify(summary, null, 2));
}

main().catch((error) => {
  console.error(`ERROR: ${error.message}`);
  process.exit(1);
});
