#!/usr/bin/env node
/* eslint-disable no-console */

const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const { shopifyGraphQL } = require('./lib/shopify-auth.cjs');

const HANDLES = [
  'tratamiento-ceramico-detailing-center',
  'pulido-general-detailing-center',
  'polarizado-detailing-center',
  'full-body-ppf-detailing-center',
  'ppf-proteccion-de-partes-detailing-center',
];

function loadEnvironment() {
  const files = [
    '.env.local',
    'private-data/shopify-admin-clientcreds.env',
    'private-data/shopify-admin-legacy.env',
    'private-data/shopify-admin.env',
    'shopify-provider-admin/.env',
  ];
  for (const relativePath of files) {
    const filePath = path.resolve(process.cwd(), relativePath);
    if (!fs.existsSync(filePath)) continue;
    for (const line of fs.readFileSync(filePath, 'utf8').split(/\r?\n/)) {
      const cleaned = line.trim();
      if (!cleaned || cleaned.startsWith('#') || !cleaned.includes('=')) continue;
      const eq = cleaned.indexOf('=');
      const key = cleaned.slice(0, eq).trim();
      let value = cleaned.slice(eq + 1).trim();
      if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
        value = value.slice(1, -1);
      }
      process.env[key] = value;
    }
  }
  process.env.SHOPIFY_SHOP = 'lacocheraplace.myshopify.com';
}

async function getState() {
  return shopifyGraphQL(
    `#graphql
      query DetailingCenterInventory($query: String!) {
        locations(first: 20) { nodes { id name isActive fulfillsOnlineOrders } }
        products(first: 10, query: $query) {
          nodes {
            id
            handle
            variants(first: 50) {
              nodes {
                id
                title
                availableForSale
                inventoryQuantity
                inventoryPolicy
                inventoryItem { id tracked requiresShipping }
              }
            }
          }
        }
      }
    `,
    { query: HANDLES.map((handle) => `handle:${handle}`).join(' OR ') },
  );
}

async function configureInventoryItem(inventoryItemId) {
  const data = await shopifyGraphQL(
    `#graphql
      mutation EnableInventoryTracking($id: ID!) {
        inventoryItemUpdate(id: $id, input: { tracked: true, requiresShipping: false }) {
          inventoryItem { id tracked requiresShipping }
          userErrors { field message }
        }
      }
    `,
    { id: inventoryItemId },
  );
  const errors = data.inventoryItemUpdate.userErrors || [];
  if (errors.length) throw new Error(errors.map((error) => error.message).join(' | '));
}

async function setQuantities(locationId, variants, quantity) {
  const data = await shopifyGraphQL(
    `#graphql
      mutation SetTestInventory($input: InventorySetQuantitiesInput!, $idempotencyKey: String!) {
        inventorySetQuantities(input: $input) @idempotent(key: $idempotencyKey) {
          inventoryAdjustmentGroup { reason changes { name delta } }
          userErrors { field message }
        }
      }
    `,
    {
      idempotencyKey: crypto.randomUUID(),
      input: {
        name: 'available',
        reason: 'correction',
        quantities: variants.map((variant) => ({
          inventoryItemId: variant.inventoryItem.id,
          locationId,
          quantity,
          changeFromQuantity: variant.inventoryQuantity,
        })),
      },
    },
  );
  const errors = data.inventorySetQuantities.userErrors || [];
  if (errors.length) throw new Error(errors.map((error) => error.message).join(' | '));
}

async function enforceDenyPolicy(product) {
  const data = await shopifyGraphQL(
    `#graphql
      mutation RestoreInventoryPolicy($productId: ID!, $variants: [ProductVariantsBulkInput!]!) {
        productVariantsBulkUpdate(productId: $productId, variants: $variants) {
          productVariants { id inventoryPolicy }
          userErrors { field message }
        }
      }
    `,
    {
      productId: product.id,
      variants: product.variants.nodes.map((variant) => ({ id: variant.id, inventoryPolicy: 'DENY' })),
    },
  );
  const errors = data.productVariantsBulkUpdate.userErrors || [];
  if (errors.length) throw new Error(errors.map((error) => error.message).join(' | '));
}

async function main() {
  loadEnvironment();
  const apply = process.argv.includes('--apply');
  const quantityIndex = process.argv.indexOf('--quantity');
  const quantity = quantityIndex >= 0 ? Number(process.argv[quantityIndex + 1]) : 20;
  if (!Number.isInteger(quantity) || quantity < 0) throw new Error('La cantidad debe ser un entero no negativo.');

  const before = await getState();
  const location = before.locations.nodes.find((item) => item.isActive && item.fulfillsOnlineOrders);
  if (!location) throw new Error('No hay una ubicacion activa que atienda pedidos online.');
  const found = new Set(before.products.nodes.map((product) => product.handle));
  const missing = HANDLES.filter((handle) => !found.has(handle));
  if (missing.length) throw new Error(`Faltan productos: ${missing.join(', ')}`);
  const variants = before.products.nodes.flatMap((product) => product.variants.nodes);

  if (apply) {
    for (const variant of variants) {
      await configureInventoryItem(variant.inventoryItem.id);
    }
    await setQuantities(location.id, variants, quantity);
    for (const product of before.products.nodes) await enforceDenyPolicy(product);
  }

  const after = apply ? await getState() : before;
  console.log(JSON.stringify({
    apply,
    quantity,
    location,
    products: before.products.nodes.length,
    variants: variants.length,
    state: after.products.nodes.map((product) => ({
      handle: product.handle,
      variants: product.variants.nodes.map((variant) => ({
        title: variant.title,
        tracked: variant.inventoryItem.tracked,
        requiresShipping: variant.inventoryItem.requiresShipping,
        inventoryQuantity: variant.inventoryQuantity,
        inventoryPolicy: variant.inventoryPolicy,
        availableForSale: variant.availableForSale,
      })),
    })),
  }, null, 2));
}

main().catch((error) => {
  console.error(`ERROR: ${error.message}`);
  process.exit(1);
});
