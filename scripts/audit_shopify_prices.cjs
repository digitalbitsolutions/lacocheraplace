#!/usr/bin/env node
/* eslint-disable no-console */
const fs = require("fs");
const path = require("path");
const { shopifyGraphQL, verifyShopifyConnection } = require("./lib/shopify-auth.cjs");

function loadEnv(filePath) {
  for (const line of fs.readFileSync(filePath, "utf8").split(/\r?\n/)) {
    const match = line.match(/^([A-Za-z_][A-Za-z0-9_]*)=(.*)$/);
    if (match && !process.env[match[1]]) process.env[match[1]] = match[2].trim();
  }
}

async function main() {
  loadEnv(path.resolve(process.cwd(), ".env.local"));
  const shop = await verifyShopifyConnection();
  const products = [];
  let after = null;
  do {
    const data = await shopifyGraphQL(
      `#graphql
      query PriceAudit($after: String) {
        products(first: 100, after: $after) {
          pageInfo { hasNextPage endCursor }
          nodes {
            handle title vendor tags
            variants(first: 100) { nodes { title price } }
            priceRangeV2 { minVariantPrice { amount currencyCode } maxVariantPrice { amount currencyCode } }
          }
        }
      }`,
      { after },
    );
    products.push(...data.products.nodes);
    after = data.products.pageInfo.hasNextPage ? data.products.pageInfo.endCursor : null;
  } while (after);
  const variants = products.flatMap((product) => product.variants.nodes.map((variant) => ({
    handle: product.handle,
    vendor: product.vendor,
    title: product.title,
    variant: variant.title,
    price: variant.price,
    currency: product.priceRangeV2.minVariantPrice.currencyCode,
    pendingPrice: product.tags.some((tag) => /^price-pending-/i.test(tag)),
  })));
  const report = {
    generatedAt: new Date().toISOString(), shop,
    totals: {
      products: products.length,
      variants: variants.length,
      currencies: [...new Set(variants.map((variant) => variant.currency))],
      zeroPriceVariants: variants.filter((variant) => Number(variant.price) === 0).length,
      pendingPriceProducts: products.filter((product) => product.tags.some((tag) => /^price-pending-/i.test(tag))).length,
    },
    variants,
  };
  console.log(JSON.stringify(report, null, 2));
}

main().catch((error) => {
  console.error(`ERROR: ${error.message}`);
  process.exit(1);
});
