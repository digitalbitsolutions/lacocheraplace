#!/usr/bin/env node

const fs = require("node:fs/promises");
const path = require("node:path");

function parseCsvLine(line) {
  const out = [];
  let cur = "";
  let inQuotes = false;
  for (let i = 0; i < line.length; i += 1) {
    const c = line[i];
    if (c === '"') {
      if (inQuotes && line[i + 1] === '"') {
        cur += '"';
        i += 1;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (c === "," && !inQuotes) {
      out.push(cur);
      cur = "";
    } else {
      cur += c;
    }
  }
  out.push(cur);
  return out;
}

async function readCsv(filePath) {
  const raw = await fs.readFile(filePath, "utf8");
  const lines = raw.split(/\r?\n/).filter((x) => x.trim() !== "");
  const headers = parseCsvLine(lines[0]).map((h) => h.trim());
  return lines.slice(1).map((line) => {
    const cols = parseCsvLine(line);
    const row = {};
    headers.forEach((h, i) => {
      row[h] = (cols[i] || "").trim();
    });
    return row;
  });
}

function slugify(value) {
  return String(value || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

function parseArgs(argv) {
  const args = {
    input: "sample-data/product-image-pipeline-input-providers-bcn-v1.csv",
    outputMetadata: "",
  };
  for (let i = 0; i < argv.length; i += 1) {
    const a = argv[i];
    if (a === "--input") {
      args.input = argv[i + 1] || args.input;
      i += 1;
    } else if (a === "--output-metadata") {
      args.outputMetadata = argv[i + 1] || "";
      i += 1;
    } else if (a === "--help" || a === "-h") {
      console.log("Uso: node scripts/normalize_provider_image_filenames.cjs [--input sample-data/product-image-pipeline-input-providers-bcn-v1.csv] [--output-metadata scripts/product-image-pipeline/logs/metadata-providers-v1.csv]");
      process.exit(0);
    }
  }
  return args;
}

function splitHandleByProvider(handle) {
  const providerSlugs = [
    "eixample-ocasion-motor",
    "sants-liquidaciones-auto",
    "poblenou-box-rental",
    "gracia-garage-tools",
  ];
  for (const provider of providerSlugs) {
    const suffix = `-${provider}`;
    if (handle.endsWith(suffix)) {
      return {
        provider,
        product: handle.slice(0, -suffix.length),
      };
    }
  }
  return { provider: "unknown-provider", product: handle };
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const inputPath = path.resolve(process.cwd(), args.input);
  const rows = await readCsv(inputPath);

  const uniqueByHandle = new Map();
  for (const row of rows) {
    uniqueByHandle.set(row.handle, row);
  }

  const rootDir = process.cwd();
  const metadataRows = [];
  const renameOps = [];

  for (const row of uniqueByHandle.values()) {
    const category = slugify(row.category);
    const handle = slugify(row.handle);
    const folder = path.join(rootDir, "product-images", category, handle);

    let entries = [];
    try {
      entries = await fs.readdir(folder, { withFileTypes: true });
    } catch {
      continue;
    }

    const files = entries
      .filter((e) => e.isFile() && e.name.toLowerCase().endsWith(".webp"))
      .map((e) => e.name)
      .sort();

    if (!files.length) continue;

    const { provider, product } = splitHandleByProvider(handle);
    const collection = category;
    const baseName = `${provider}-${collection}-${product}`;

    const tmpMoves = [];
    for (let i = 0; i < files.length; i += 1) {
      const oldName = files[i];
      const oldPath = path.join(folder, oldName);
      const tempName = `__tmp_${Date.now()}_${i}.webp`;
      const tempPath = path.join(folder, tempName);
      await fs.rename(oldPath, tempPath);
      tmpMoves.push({ tempName, tempPath, oldName });
    }

    for (let i = 0; i < tmpMoves.length; i += 1) {
      const index = String(i).padStart(2, "0");
      const finalName = `${baseName}-${index}.webp`;
      const finalPath = path.join(folder, finalName);
      await fs.rename(tmpMoves[i].tempPath, finalPath);

      const relativePath = path.relative(rootDir, finalPath).replaceAll("\\", "/");
      metadataRows.push({
        category: row.category,
        keyword: row.keyword || "",
        source: "normalized_local",
        original_url: "",
        photographer: "",
        license: "",
        filename: finalName,
        local_path: relativePath,
      });
      renameOps.push({
        handle,
        from: tmpMoves[i].oldName,
        to: finalName,
      });
    }
  }

  const logsDir = path.join(rootDir, "scripts", "product-image-pipeline", "logs");
  const defaultOut = path.join(
    logsDir,
    `metadata-providers-bcn-normalized-${new Date().toISOString().replace(/[:.]/g, "-")}.csv`,
  );
  const outPath = args.outputMetadata
    ? path.resolve(rootDir, args.outputMetadata)
    : defaultOut;

  const header = "category,keyword,source,original_url,photographer,license,filename,local_path\n";
  const lines = metadataRows.map((r) =>
    [r.category, r.keyword, r.source, r.original_url, r.photographer, r.license, r.filename, r.local_path]
      .map((v) => `"${String(v).replace(/"/g, '""')}"`)
      .join(","),
  );
  await fs.writeFile(outPath, header + lines.join("\n") + "\n", "utf8");

  console.log(
    JSON.stringify(
      {
        ok: true,
        input: inputPath,
        outputMetadata: outPath,
        renamedFiles: renameOps.length,
      },
      null,
      2,
    ),
  );
}

main().catch((error) => {
  console.error(`ERROR: ${error.message}`);
  process.exit(1);
});
