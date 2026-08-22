#!/usr/bin/env node
/* eslint-disable no-console */
const fs = require("fs");
const path = require("path");
const sharp = require("./product-image-pipeline/node_modules/sharp");

const DIR = path.resolve(
  process.cwd(),
  "theme-dawn-export/assets/provider-image-candidates",
);

async function main() {
  const files = fs
    .readdirSync(DIR)
    .filter((name) => fs.statSync(path.join(DIR, name)).isFile());

  const report = [];

  for (const name of files) {
    const src = path.join(DIR, name);
    const ext = path.extname(name).toLowerCase();
    const base = path.basename(name, ext);
    const dst = path.join(DIR, `${base}.webp`);

    const before = await sharp(src).metadata();
    await sharp(src)
      .resize(1600, 1600, { fit: "cover", position: "center" })
      .webp({ quality: 90 })
      .toFile(dst);
    const after = await sharp(dst).metadata();

    report.push({
      source: name,
      output: path.basename(dst),
      before: `${before.width}x${before.height} ${before.format}`,
      after: `${after.width}x${after.height} ${after.format}`,
    });
  }

  console.log(JSON.stringify({ count: report.length, report }, null, 2));
}

main().catch((error) => {
  console.error(`ERROR: ${error.message}`);
  process.exit(1);
});

