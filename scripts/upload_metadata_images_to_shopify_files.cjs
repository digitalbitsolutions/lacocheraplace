#!/usr/bin/env node

const fs = require('node:fs/promises');
const path = require('node:path');

const API_VERSION = process.env.SHOPIFY_API_VERSION || '2025-01';

function requireEnv(name) {
  const value = process.env[name];
  if (!value) throw new Error(`Falta variable de entorno requerida: ${name}`);
  return value;
}

function parseArgs(argv) {
  const args = {
    metadata: '',
    dryRun: false,
    limit: 0,
  };
  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === '--metadata') {
      args.metadata = argv[i + 1] || '';
      i += 1;
    } else if (arg === '--limit') {
      args.limit = Math.max(0, Number(argv[i + 1] || 0));
      i += 1;
    } else if (arg === '--dry-run') {
      args.dryRun = true;
    } else if (arg === '--help' || arg === '-h') {
      console.log('Uso: node scripts/upload_metadata_images_to_shopify_files.cjs [--metadata <ruta.csv>] [--limit 100] [--dry-run]');
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
    const c = line[i];
    if (c === '"') {
      if (inQuotes && line[i + 1] === '"') {
        value += '"';
        i += 1;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (c === ',' && !inQuotes) {
      values.push(value);
      value = '';
    } else {
      value += c;
    }
  }
  values.push(value);
  return values;
}

async function readCsv(filePath) {
  const raw = await fs.readFile(filePath, 'utf8');
  const lines = raw.split(/\r?\n/).filter((x) => x.trim() !== '');
  if (!lines.length) return [];
  const headers = parseCsvLine(lines[0]).map((h) => h.trim());
  const rows = [];
  for (let i = 1; i < lines.length; i += 1) {
    const cols = parseCsvLine(lines[i]);
    const row = {};
    headers.forEach((h, idx) => {
      row[h] = (cols[idx] || '').trim();
    });
    rows.push(row);
  }
  return rows;
}

async function findLatestMetadataCsv() {
  const logsDir = path.resolve(process.cwd(), 'scripts/product-image-pipeline/logs');
  const entries = await fs.readdir(logsDir, { withFileTypes: true });
  const candidates = [];
  for (const e of entries) {
    if (!e.isFile()) continue;
    if (!e.name.startsWith('metadata-') || !e.name.endsWith('.csv')) continue;
    const fullPath = path.join(logsDir, e.name);
    const stat = await fs.stat(fullPath);
    candidates.push({ fullPath, mtimeMs: stat.mtimeMs });
  }
  if (!candidates.length) throw new Error('No se encontro metadata-*.csv');
  candidates.sort((a, b) => b.mtimeMs - a.mtimeMs);
  return candidates[0].fullPath;
}

async function gql(store, token, query, variables = {}) {
  const response = await fetch(`https://${store}/admin/api/${API_VERSION}/graphql.json`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Shopify-Access-Token': token,
    },
    body: JSON.stringify({ query, variables }),
  });
  const payload = await response.json();
  if (!response.ok) throw new Error(`GraphQL HTTP ${response.status}: ${JSON.stringify(payload)}`);
  if (payload.errors?.length) throw new Error(payload.errors.map((e) => e.message).join(', '));
  return payload.data;
}

async function listExistingFileNames(store, token) {
  const names = new Set();
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
            ... on MediaImage{
              image{url}
            }
          }
        }
      }`,
      { after },
    );
    const nodes = data.files.nodes || [];
    for (const n of nodes) {
      const u = n?.image?.url;
      if (!u) continue;
      const clean = u.split('?')[0];
      names.add(clean.substring(clean.lastIndexOf('/') + 1).toLowerCase());
    }
    if (!data.files.pageInfo.hasNextPage) break;
    after = data.files.pageInfo.endCursor;
  }
  return names;
}

async function stagedUpload(store, token, fileName, mimeType, fileSize) {
  const data = await gql(
    store,
    token,
    `#graphql
    mutation($input:[StagedUploadInput!]!){
      stagedUploadsCreate(input:$input){
        stagedTargets{
          url
          resourceUrl
          parameters{name value}
        }
        userErrors{field message}
      }
    }`,
    {
      input: [
        {
          filename: fileName,
          mimeType,
          resource: 'FILE',
          httpMethod: 'POST',
          fileSize: String(fileSize),
        },
      ],
    },
  );
  const errs = data.stagedUploadsCreate.userErrors || [];
  if (errs.length) throw new Error(errs.map((e) => e.message).join(' | '));
  return data.stagedUploadsCreate.stagedTargets[0];
}

async function postToStagedTarget(stagedTarget, filePath) {
  const form = new FormData();
  for (const p of stagedTarget.parameters || []) form.append(p.name, p.value);
  const fileBuffer = await fs.readFile(filePath);
  const blob = new Blob([fileBuffer], { type: 'image/webp' });
  form.append('file', blob, path.basename(filePath));
  const res = await fetch(stagedTarget.url, { method: 'POST', body: form });
  if (!res.ok) {
    const txt = await res.text();
    throw new Error(`staged_upload_failed_http_${res.status}: ${txt.slice(0, 200)}`);
  }
}

async function createFile(store, token, resourceUrl, alt = '') {
  const data = await gql(
    store,
    token,
    `#graphql
    mutation($files:[FileCreateInput!]!){
      fileCreate(files:$files){
        files{... on MediaImage{id}}
        userErrors{field message}
      }
    }`,
    {
      files: [
        {
          originalSource: resourceUrl,
          contentType: 'IMAGE',
          alt,
        },
      ],
    },
  );
  const errs = data.fileCreate.userErrors || [];
  if (errs.length) throw new Error(errs.map((e) => e.message).join(' | '));
  return data.fileCreate.files || [];
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const store = requireEnv('SHOPIFY_STORE');
  const token = requireEnv('SHOPIFY_ADMIN_TOKEN');
  const metadataPath = path.resolve(process.cwd(), args.metadata || (await findLatestMetadataCsv()));
  const rows = await readCsv(metadataPath);
  const existingNames = await listExistingFileNames(store, token);

  const items = [];
  for (const r of rows) {
    const localPath = r.local_path ? path.resolve(process.cwd(), r.local_path) : '';
    const fileName = (r.filename || path.basename(localPath || '')).toLowerCase();
    if (!localPath || !fileName) continue;
    items.push({ localPath, fileName, alt: r.category || '' });
  }
  const unique = [];
  const seen = new Set();
  for (const x of items) {
    if (seen.has(x.fileName)) continue;
    seen.add(x.fileName);
    unique.push(x);
  }
  const filtered = unique.filter((x) => !existingNames.has(x.fileName));
  const batch = args.limit > 0 ? filtered.slice(0, args.limit) : filtered;

  const summary = {
    metadataPath,
    dryRun: args.dryRun,
    metadataRows: rows.length,
    uniqueByName: unique.length,
    alreadyOnlineByName: unique.length - filtered.length,
    plannedUpload: batch.length,
    uploaded: 0,
    failed: 0,
    errors: [],
  };

  if (args.dryRun) {
    console.log(JSON.stringify(summary, null, 2));
    return;
  }

  for (const item of batch) {
    try {
      const stat = await fs.stat(item.localPath);
      const staged = await stagedUpload(store, token, item.fileName, 'image/webp', stat.size);
      await postToStagedTarget(staged, item.localPath);
      await createFile(store, token, staged.resourceUrl, item.alt);
      summary.uploaded += 1;
    } catch (e) {
      summary.failed += 1;
      summary.errors.push({ fileName: item.fileName, error: String(e.message || e) });
    }
  }

  console.log(JSON.stringify(summary, null, 2));
}

main().catch((e) => {
  console.error(`ERROR: ${e.message}`);
  process.exit(1);
});

