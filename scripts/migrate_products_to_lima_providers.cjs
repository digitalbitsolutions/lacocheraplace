#!/usr/bin/env node
/* eslint-disable no-console */
const fs = require("fs");
const path = require("path");
const { shopifyGraphQL, verifyShopifyConnection } = require("./lib/shopify-auth.cjs");

const DEFAULT_INPUT = "C:/Users/LC/Downloads/candidatos_proveedores_peru.json";
const DEFAULT_REPORT = "project-docs/exports/shopify-provider-migration-lima-plan.json";
const DEFAULT_MAPPING = "sample-data/shopify-provider-mapping-lima.json";

function parseArgs(argv) {
  const args = { apply: false, input: DEFAULT_INPUT, mapping: DEFAULT_MAPPING, report: DEFAULT_REPORT };
  for (let index = 2; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === "--apply") args.apply = true;
    else if (arg === "--input") args.input = argv[++index];
    else if (arg === "--mapping") args.mapping = argv[++index];
    else if (arg === "--report") args.report = argv[++index];
    else throw new Error(`Argumento no reconocido: ${arg}`);
  }
  return args;
}

function loadEnvFile(filePath) {
  if (!fs.existsSync(filePath)) return;
  for (const line of fs.readFileSync(filePath, "utf8").split(/\r?\n/)) {
    const cleaned = line.trim();
    if (!cleaned || cleaned.startsWith("#")) continue;
    const separator = cleaned.indexOf("=");
    if (separator < 0) continue;
    const key = cleaned.slice(0, separator).trim();
    let value = cleaned.slice(separator + 1).trim();
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1);
    }
    if (!process.env[key]) process.env[key] = value;
  }
}

function validateCandidates(candidates, mapping) {
  if (!Array.isArray(candidates) || candidates.length !== 15) {
    throw new Error(`Se esperaban 15 candidatos y se recibieron ${candidates?.length || 0}.`);
  }
  for (const candidate of candidates) {
    if (candidate.region !== "Lima" || candidate.province !== "Lima") {
      throw new Error(`${candidate.provider_name} no pertenece a Lima, Perú.`);
    }
  }
  if (!Array.isArray(mapping) || mapping.length !== 19) throw new Error("El mapeo debe contener 19 filas.");
  const sources = mapping.map((row) => row.source_vendor);
  const targets = mapping.map((row) => row.target_vendor);
  if (new Set(sources).size !== 19) throw new Error("Los proveedores de origen deben ser únicos.");
  if (new Set(targets).size !== 19) throw new Error("Los proveedores de destino deben ser únicos.");
  const externalTargets = new Set(candidates.map((candidate) => candidate.provider_name));
  for (const required of ["Grúas y Servicios Express S.A.C.", "AutoGlass And Film - parabrisas - polarizados"]) {
    externalTargets.add(required);
  }
  externalTargets.add("La Cochera Place");
  externalTargets.add("Detailing Center");
  for (const target of targets) {
    if (!externalTargets.has(target)) throw new Error(`Proveedor destino no autorizado: ${target}`);
  }
}

async function listProducts() {
  const products = [];
  let after = null;
  do {
    const data = await shopifyGraphQL(
      `#graphql
      query LimaMigrationProducts($after: String) {
        products(first: 100, after: $after) {
          pageInfo { hasNextPage endCursor }
          nodes {
            id handle title vendor status tags
            media(first: 1) { nodes { id } }
          }
        }
      }`,
      { after },
    );
    products.push(...data.products.nodes);
    after = data.products.pageInfo.hasNextPage ? data.products.pageInfo.endCursor : null;
  } while (after);
  return products;
}

function buildPlan(products, mapping) {
  const bySource = new Map(mapping.map((row) => [row.source_vendor, row]));
  const liveVendors = [...new Set(products.map((product) => product.vendor))];
  const unmapped = liveVendors.filter((vendor) => !bySource.has(vendor));
  const absent = mapping.map((row) => row.source_vendor).filter((vendor) => !liveVendors.includes(vendor));
  if (unmapped.length || absent.length) {
    throw new Error(`Mapeo desalineado. Sin mapear: ${unmapped.join(", ") || "ninguno"}. Ausentes: ${absent.join(", ") || "ninguno"}.`);
  }
  return [...products]
    .sort((a, b) => a.handle.localeCompare(b.handle))
    .map((product) => {
      const mapped = bySource.get(product.vendor);
      return {
        productId: product.id,
        handle: product.handle,
        title: product.title,
        status: product.status,
        hasMedia: product.media.nodes.length > 0,
        sourceVendor: product.vendor,
        targetVendor: mapped.target_vendor,
        mappingReason: mapped.reason,
        changed: product.vendor !== mapped.target_vendor,
      };
    });
}

async function updateVendor(item) {
  const data = await shopifyGraphQL(
    `#graphql
    mutation MigrateProductVendor($product: ProductUpdateInput!) {
      productUpdate(product: $product) {
        product { id handle vendor }
        userErrors { field message }
      }
    }`,
    { product: { id: item.productId, vendor: item.targetVendor } },
  );
  const errors = data.productUpdate.userErrors || [];
  if (errors.length) throw new Error(`${item.handle}: ${errors.map((error) => error.message).join(" | ")}`);
  return data.productUpdate.product;
}

async function main() {
  const args = parseArgs(process.argv);
  loadEnvFile(path.resolve(process.cwd(), ".env.local"));
  const inputPath = path.resolve(args.input);
  const mappingPath = path.resolve(args.mapping);
  const reportPath = path.resolve(args.report);
  const candidates = JSON.parse(fs.readFileSync(inputPath, "utf8").replace(/^\uFEFF/, ""));
  const mapping = JSON.parse(fs.readFileSync(mappingPath, "utf8").replace(/^\uFEFF/, ""));
  validateCandidates(candidates, mapping);
  const shop = await verifyShopifyConnection();
  const products = await listProducts();
  const plan = buildPlan(products, mapping);
  const report = {
    generatedAt: new Date().toISOString(),
    mode: args.apply ? "apply" : "dry-run",
    shop,
    sourceDataset: inputPath,
    sourceMapping: mappingPath,
    providerMapping: mapping,
    invariants: {
      productCount: products.length,
      activeProductCount: products.filter((product) => product.status === "ACTIVE").length,
      productsWithMedia: products.filter((product) => product.media.nodes.length).length,
      productFieldsChanged: ["vendor"],
      preservedFields: ["id", "handle", "title", "description", "price", "variants", "status", "publications", "tags", "media"],
    },
    targetProviders: candidates.map((candidate) => ({
      providerName: candidate.provider_name,
      district: candidate.district,
      province: candidate.province,
      region: candidate.region,
      verificationStatus: candidate.verification_status,
    })),
    changes: plan,
    applied: [],
  };
  fs.mkdirSync(path.dirname(reportPath), { recursive: true });
  fs.writeFileSync(reportPath, `${JSON.stringify(report, null, 2)}\n`, "utf8");
  console.log(`Plan guardado: ${reportPath}`);
  console.log(`Productos: ${plan.length}; cambios de vendor: ${plan.filter((item) => item.changed).length}`);
  if (!args.apply) {
    console.log("DRY RUN: no se modificó Shopify. Use --apply solo después de aprobar el plan.");
    return;
  }
  for (const item of plan.filter((entry) => entry.changed)) {
    const updated = await updateVendor(item);
    report.applied.push({ productId: updated.id, handle: updated.handle, vendor: updated.vendor });
    fs.writeFileSync(reportPath, `${JSON.stringify(report, null, 2)}\n`, "utf8");
    console.log(`UPDATED ${updated.handle} -> ${updated.vendor}`);
  }
  console.log(`Migración aplicada: ${report.applied.length} productos actualizados.`);
}

main().catch((error) => {
  console.error(`ERROR: ${error.message}`);
  process.exit(1);
});
