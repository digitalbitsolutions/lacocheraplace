#!/usr/bin/env node

const fs = require('node:fs/promises');
const path = require('node:path');

const API_VERSION = process.env.SHOPIFY_API_VERSION || '2025-01';

function parseArgs(argv) {
  const args = {
    mapping: 'sample-data/shopify-carwash-image-assignments.csv',
    dryRun: false,
    limitPerProduct: 0,
  };

  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === '--mapping') {
      args.mapping = argv[i + 1];
      i += 1;
    } else if (arg === '--dry-run') {
      args.dryRun = true;
    } else if (arg === '--limit-per-product') {
      args.limitPerProduct = Number(argv[i + 1] || 0);
      i += 1;
    } else if (arg === '--help' || arg === '-h') {
      console.log('Uso: node scripts/assign_product_images_to_shopify.cjs [--mapping sample-data/shopify-carwash-image-assignments.csv] [--dry-run] [--limit-per-product 3]');
      process.exit(0);
    } else {
      throw new Error(`Argumento no reconocido: ${arg}`);
    }
  }

  return args;
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

async function readMappingCsv(filePath) {
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

function requireEnv(name) {
  const value = process.env[name];
  if (!value) throw new Error(`Falta variable de entorno requerida: ${name}`);
  return value;
}

async function shopifyGraphql(store, token, query, variables) {
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
    throw new Error(payload.errors.map((error) => error.message).join(', '));
  }

  return payload.data;
}

async function findProductByHandle(store, token, handle) {
  const data = await shopifyGraphql(
    store,
    token,
    `#graphql
      query ProductByHandle($query: String!) {
        products(first: 1, query: $query) {
          nodes {
            id
            handle
            title
          }
        }
      }
    `,
    { query: `handle:${handle}` },
  );

  return data.products.nodes[0] || null;
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

function gidToNumericProductId(gid) {
  const parts = String(gid || '').split('/');
  return parts[parts.length - 1] || '';
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const store = requireEnv('SHOPIFY_STORE');
  const token = requireEnv('SHOPIFY_ADMIN_TOKEN');

  const mappingPath = path.resolve(process.cwd(), args.mapping);
  const mappingRows = await readMappingCsv(mappingPath);

  const grouped = new Map();
  for (const row of mappingRows) {
    const handle = row.handle;
    const imagePath = row.image_path;
    if (!handle || !imagePath) continue;
    if (!grouped.has(handle)) grouped.set(handle, []);
    grouped.get(handle).push({
      imagePath: path.resolve(process.cwd(), imagePath),
      alt: row.alt || '',
    });
  }

  const summary = {
    dryRun: args.dryRun,
    mappingPath,
    productsRequested: grouped.size,
    productsMatched: 0,
    uploadsPlannedOrDone: 0,
    uploadsOk: 0,
    uploadsFailed: 0,
    skippedProducts: [],
    errors: [],
  };

  for (const [handle, images] of grouped.entries()) {
    const product = await findProductByHandle(store, token, handle);
    if (!product) {
      summary.skippedProducts.push({ handle, reason: 'product_not_found' });
      continue;
    }

    summary.productsMatched += 1;
    const productId = gidToNumericProductId(product.id);
    const batch = args.limitPerProduct > 0 ? images.slice(0, args.limitPerProduct) : images;

    for (const item of batch) {
      summary.uploadsPlannedOrDone += 1;

      try {
        await fs.access(item.imagePath);
      } catch {
        summary.uploadsFailed += 1;
        summary.errors.push({ handle, imagePath: item.imagePath, error: 'file_not_found' });
        continue;
      }

      if (args.dryRun) {
        continue;
      }

      try {
        await uploadProductImage(store, token, productId, item.imagePath, item.alt);
        summary.uploadsOk += 1;
      } catch (error) {
        summary.uploadsFailed += 1;
        summary.errors.push({ handle, imagePath: item.imagePath, error: String(error.message || error) });
      }
    }
  }

  console.log(JSON.stringify(summary, null, 2));
}

main().catch((error) => {
  console.error(`ERROR: ${error.message}`);
  process.exit(1);
});
