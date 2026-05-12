import fs from 'node:fs/promises';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';
import {
  ensureDir,
  parseArgs,
  readEnvFileIfPresent,
  slugify,
  timestamp,
  toInt,
} from './lib/utils.mjs';
import { parseInputCsv, writeCsv } from './lib/csv.mjs';
import { searchUnsplash, searchPexels, searchPixabay } from './lib/providers.mjs';

const MODULE_DIR = path.dirname(fileURLToPath(import.meta.url));
const ROOT_DIR = path.resolve(MODULE_DIR, '..', '..');
const OUTPUT_ROOT = path.join(ROOT_DIR, 'product-images');
const LOG_ROOT = path.join(ROOT_DIR, 'scripts', 'product-image-pipeline', 'logs');
const DEFAULT_INPUT = path.join(ROOT_DIR, 'sample-data', 'product-image-pipeline-input.example.csv');

const METADATA_HEADERS = [
  'category',
  'keyword',
  'source',
  'original_url',
  'photographer',
  'license',
  'filename',
  'local_path',
];

const DOWNLOAD_LOG_HEADERS = [
  'timestamp',
  'sku',
  'handle',
  'category',
  'keyword',
  'source',
  'status',
  'message',
  'filename',
  'local_path',
];

const BLOCKED_TOKENS = [
  'logo',
  'brand',
  'emblem',
  'badge',
  'plate',
  'license plate',
  'matricula',
  'number plate',
  'portrait',
  'person',
  'people',
  'face',
  'man',
  'woman',
  'child',
  'selfie',
];

function isRejectedBySafetyText(candidate) {
  const text = [
    candidate.title || '',
    candidate.description || '',
    candidate.alt || '',
    candidate.tags || '',
  ]
    .join(' ')
    .toLowerCase();
  return BLOCKED_TOKENS.some((token) => text.includes(token));
}

async function fetchImageBuffer(url) {
  const res = await fetch(url, {
    headers: { 'User-Agent': 'lacocheraplace-image-pipeline/1.0' },
  });
  if (!res.ok) throw new Error(`download_failed_http_${res.status}`);
  return Buffer.from(await res.arrayBuffer());
}

async function main() {
readEnvFileIfPresent(path.join(MODULE_DIR, '.env'));
  const args = parseArgs(process.argv.slice(2));
  const dryRun = args['dry-run'] === true;
  const inputPath = args.input ? path.resolve(process.cwd(), args.input) : DEFAULT_INPUT;
  const maxImagesPerRun = toInt(args.max ?? process.env.MAX_IMAGES_PER_RUN, 100);
  const perRowCap = toInt(process.env.MAX_IMAGES_PER_CATEGORY, 6);
  const unsplashKey = process.env.UNSPLASH_ACCESS_KEY || '';
  const pexelsKey = process.env.PEXELS_API_KEY || '';
  const pixabayKey = process.env.PIXABAY_API_KEY || '';

  if (!unsplashKey && !pexelsKey && !pixabayKey) {
    throw new Error('No API keys found. Configure at least one provider key in env.');
  }

  await ensureDir(LOG_ROOT);
  if (!dryRun) await ensureDir(OUTPUT_ROOT);

  const rows = await parseInputCsv(inputPath);
  const metadataRows = [];
  const logRows = [];
  const usedSourceIds = new Set();
  const usedHashes = new Set();
  let totalSaved = 0;

  for (const row of rows) {
    if (totalSaved >= maxImagesPerRun) break;

    const categorySlug = slugify(row.category);
    const handleSlug = slugify(row.handle);
    const productDir = path.join(OUTPUT_ROOT, categorySlug, handleSlug);
    if (!dryRun) await ensureDir(productDir);

    const requested = Math.min(toInt(row.image_count, 1), perRowCap);
    const needed = Math.min(requested, Math.max(0, maxImagesPerRun - totalSaved));

    const providerResults = [];
    if (unsplashKey) {
      providerResults.push(...(await searchUnsplash(row.keyword, unsplashKey, needed * 3)));
    }
    if (pexelsKey) {
      providerResults.push(...(await searchPexels(row.keyword, pexelsKey, needed * 3)));
    }
    if (pixabayKey) {
      providerResults.push(...(await searchPixabay(row.keyword, pixabayKey, needed * 3)));
    }

    let savedForRow = 0;
    for (const candidate of providerResults) {
      if (savedForRow >= needed || totalSaved >= maxImagesPerRun) break;
      const uniqueSourceKey = `${candidate.source}:${candidate.id}`;
      if (usedSourceIds.has(uniqueSourceKey)) continue;
      if (isRejectedBySafetyText(candidate)) {
        logRows.push([
          timestamp(),
          row.sku,
          row.handle,
          row.category,
          row.keyword,
          candidate.source,
          'skipped',
          'safety_text_filter',
          '',
          '',
        ]);
        continue;
      }

      const index = String(savedForRow + 1).padStart(2, '0');
      const filename = `${handleSlug}-${index}.webp`;
      const localPath = path.join(productDir, filename);
      const relativeLocalPath = path.relative(ROOT_DIR, localPath).replaceAll('\\', '/');

      if (dryRun) {
        usedSourceIds.add(uniqueSourceKey);
        savedForRow += 1;
        totalSaved += 1;
        metadataRows.push([
          row.category,
          row.keyword,
          candidate.source,
          candidate.originalUrl,
          candidate.photographer,
          candidate.license,
          filename,
          relativeLocalPath,
        ]);
        logRows.push([
          timestamp(),
          row.sku,
          row.handle,
          row.category,
          row.keyword,
          candidate.source,
          'planned',
          'dry_run',
          filename,
          relativeLocalPath,
        ]);
        continue;
      }

      try {
        const originalBuffer = await fetchImageBuffer(candidate.downloadUrl);
        const hash = crypto.createHash('sha1').update(originalBuffer).digest('hex');
        if (usedHashes.has(hash)) {
          logRows.push([
            timestamp(),
            row.sku,
            row.handle,
            row.category,
            row.keyword,
            candidate.source,
            'skipped',
            'duplicate_binary',
            '',
            '',
          ]);
          continue;
        }

        await sharp(originalBuffer)
          .resize(1600, 1600, { fit: 'cover', position: 'center' })
          .webp({ quality: 85 })
          .toFile(localPath);

        usedSourceIds.add(uniqueSourceKey);
        usedHashes.add(hash);
        savedForRow += 1;
        totalSaved += 1;

        metadataRows.push([
          row.category,
          row.keyword,
          candidate.source,
          candidate.originalUrl,
          candidate.photographer,
          candidate.license,
          filename,
          relativeLocalPath,
        ]);
        logRows.push([
          timestamp(),
          row.sku,
          row.handle,
          row.category,
          row.keyword,
          candidate.source,
          'saved',
          'ok',
          filename,
          relativeLocalPath,
        ]);
      } catch (error) {
        logRows.push([
          timestamp(),
          row.sku,
          row.handle,
          row.category,
          row.keyword,
          candidate.source,
          'error',
          String(error.message || error),
          '',
          '',
        ]);
      }
    }
  }

  const runId = new Date().toISOString().replace(/[:.]/g, '-');
  const metadataPath = path.join(LOG_ROOT, `metadata-${runId}.csv`);
  const downloadLogPath = path.join(LOG_ROOT, `downloads-${runId}.csv`);
  await writeCsv(metadataPath, METADATA_HEADERS, metadataRows);
  await writeCsv(downloadLogPath, DOWNLOAD_LOG_HEADERS, logRows);

  const summary = {
    dryRun,
    inputPath,
    maxImagesPerRun,
    metadataPath,
    downloadLogPath,
    totalRows: rows.length,
    totalSaved,
  };
  const summaryPath = path.join(LOG_ROOT, `run-summary-${runId}.json`);
  await fs.writeFile(summaryPath, JSON.stringify(summary, null, 2), 'utf8');

  console.log(JSON.stringify(summary, null, 2));
}

main().catch((error) => {
  console.error('[product-image-pipeline] fatal:', error.message);
  process.exit(1);
});
