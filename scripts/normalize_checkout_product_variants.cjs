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
    onlyActive: true,
    maxProducts: 0,
  };
  for (let i = 0; i < argv.length; i += 1) {
    const a = argv[i];
    if (a === '--dry-run') args.dryRun = true;
    else if (a === '--include-draft') args.onlyActive = false;
    else if (a === '--max-products') {
      args.maxProducts = Math.max(0, Number(argv[i + 1] || 0));
      i += 1;
    } else if (a === '--help' || a === '-h') {
      console.log(
        'Uso: node scripts/normalize_checkout_product_variants.cjs [--dry-run] [--include-draft] [--max-products 20]',
      );
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

async function listCheckoutProducts(store, token, onlyActive) {
  const out = [];
  let after = null;
  const statusPart = onlyActive ? 'status:active ' : '';
  const queryText = `${statusPart}tag:service-flow-checkout`;
  while (true) {
    const data = await gql(
      store,
      token,
      `#graphql
      query($after:String, $query:String!){
        products(first:100, after:$after, query:$query){
          pageInfo{hasNextPage endCursor}
          nodes{
            id
            handle
            title
            status
            tags
            options{
              id
              name
              optionValues{
                id
                name
                hasVariants
              }
            }
            variants(first:100){
              nodes{
                id
                title
                price
                compareAtPrice
                inventoryPolicy
                inventoryItem { tracked }
                selectedOptions { name value }
              }
            }
          }
        }
      }`,
      { after, query: queryText },
    );
    out.push(...data.products.nodes);
    if (!data.products.pageInfo.hasNextPage) break;
    after = data.products.pageInfo.endCursor;
  }
  return out;
}

function toMoneyString(n) {
  return Number(n || 0).toFixed(2);
}

function detectBasePrice(product) {
  const variants = product.variants?.nodes || [];
  const numeric = variants
    .map((v) => Number(v.price))
    .filter((p) => Number.isFinite(p) && p > 0);
  if (numeric.length) return numeric[0];
  return 0;
}

function buildTargetVariants(basePrice) {
  const price = toMoneyString(basePrice);
  return [
    { optionValues: [{ optionName: 'Tipo de vehiculo', name: 'Auto' }], price },
    { optionValues: [{ optionName: 'Tipo de vehiculo', name: 'Camioneta SUV' }], price },
    { optionValues: [{ optionName: 'Tipo de vehiculo', name: 'Camioneta 3 filas' }], price },
  ];
}

async function deleteVariants(store, token, productId, variantIds) {
  if (!variantIds.length) return { deletedProductVariantsIds: [], userErrors: [] };
  const data = await gql(
    store,
    token,
    `#graphql
    mutation($productId: ID!, $variantsIds: [ID!]!) {
      productVariantsBulkDelete(productId: $productId, variantsIds: $variantsIds) {
        deletedProductVariantsIds
        userErrors { field message }
      }
    }`,
    { productId, variantsIds: variantIds },
  );
  return data.productVariantsBulkDelete;
}

async function createVariants(store, token, productId, variants) {
  const data = await gql(
    store,
    token,
    `#graphql
    mutation($productId: ID!, $variants: [ProductVariantsBulkInput!]!) {
      productVariantsBulkCreate(productId: $productId, variants: $variants, strategy: REMOVE_STANDALONE_VARIANT) {
        productVariants { id title price }
        userErrors { field message }
      }
    }`,
    { productId, variants },
  );
  return data.productVariantsBulkCreate;
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const store = requireEnv('SHOPIFY_STORE');
  const token = requireEnv('SHOPIFY_ADMIN_TOKEN');

  const products = await listCheckoutProducts(store, token, args.onlyActive);
  const selected = args.maxProducts > 0 ? products.slice(0, args.maxProducts) : products;

  const summary = {
    dryRun: args.dryRun,
    scanned: selected.length,
    normalized: 0,
    alreadyNormalized: 0,
    skipped: 0,
    errors: [],
    details: [],
  };

  for (const p of selected) {
    const variants = p.variants?.nodes || [];
    const hasDefaultOnly = variants.length === 1 && String(variants[0].title || '').toLowerCase() === 'default title';
    const optionName = p.options?.[0]?.name || '';
    const values = (p.options?.[0]?.optionValues || []).map((v) => v.name);
    const isTargetName = optionName.toLowerCase() === 'tipo de vehiculo';
    const hasTargetValues =
      values.includes('Auto') && values.includes('Camioneta SUV') && values.includes('Camioneta 3 filas');

    if (isTargetName && hasTargetValues && variants.length === 3) {
      summary.alreadyNormalized += 1;
      summary.details.push({ handle: p.handle, status: 'already_normalized' });
      continue;
    }

    const basePrice = detectBasePrice(p);
    const targetVariants = buildTargetVariants(basePrice);

    if (!hasDefaultOnly && variants.length !== 3) {
      summary.skipped += 1;
      summary.details.push({
        handle: p.handle,
        status: 'skipped_complex_variant_set',
        variants: variants.length,
        optionName,
        values,
      });
      continue;
    }

    if (args.dryRun) {
      summary.normalized += 1;
      summary.details.push({
        handle: p.handle,
        status: 'dry_run_would_normalize',
        from: variants.map((v) => v.title),
        to: ['Auto', 'Camioneta SUV', 'Camioneta 3 filas'],
        basePrice: toMoneyString(basePrice),
      });
      continue;
    }

    try {
      if (!hasDefaultOnly && variants.length === 3) {
        const toDelete = variants.map((v) => v.id);
        const delRes = await deleteVariants(store, token, p.id, toDelete);
        if (delRes.userErrors?.length) {
          throw new Error(delRes.userErrors.map((e) => e.message).join(' | '));
        }
      }

      const createRes = await createVariants(store, token, p.id, targetVariants);
      if (createRes.userErrors?.length) {
        throw new Error(createRes.userErrors.map((e) => e.message).join(' | '));
      }

      summary.normalized += 1;
      summary.details.push({
        handle: p.handle,
        status: 'normalized',
        created: (createRes.productVariants || []).map((v) => `${v.title}:${v.price}`),
      });
    } catch (e) {
      summary.errors.push({ handle: p.handle, error: String(e.message || e) });
    }
  }

  console.log(JSON.stringify(summary, null, 2));
}

main().catch((e) => {
  console.error(`ERROR: ${e.message}`);
  process.exit(1);
});

