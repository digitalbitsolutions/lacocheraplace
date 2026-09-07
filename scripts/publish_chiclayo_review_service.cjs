#!/usr/bin/env node
/* eslint-disable no-console */

const { shopifyGraphQL } = require("./lib/shopify-auth.cjs");

const PRODUCT_ID = "gid://shopify/Product/11116814598481";

async function main() {
  const updateData = await shopifyGraphQL(`#graphql
    mutation PublishForReview($input: ProductUpdateInput!) {
      productUpdate(product: $input) {
        product { handle status }
        userErrors { field message }
      }
    }
  `, { input: { id: PRODUCT_ID, status: "ACTIVE" } });
  const result = updateData.productUpdate;
  if (result.userErrors?.length) {
    throw new Error(result.userErrors.map((error) => error.message).join(" | "));
  }

  const publicationData = await shopifyGraphQL(`#graphql
    query OnlineStorePublication {
      publications(first: 50) { nodes { id name } }
    }
  `);
  const onlineStore = publicationData.publications.nodes.find(
    (publication) => publication.name === "Online Store",
  );
  if (!onlineStore) throw new Error("No se encontró el canal Online Store.");

  const publishData = await shopifyGraphQL(`#graphql
    mutation PublishForReview($id: ID!, $input: [PublicationInput!]!) {
      publishablePublish(id: $id, input: $input) {
        userErrors { field message }
      }
    }
  `, { id: PRODUCT_ID, input: [{ publicationId: onlineStore.id }] });
  const publishErrors = publishData.publishablePublish.userErrors;
  if (publishErrors?.length) {
    throw new Error(publishErrors.map((error) => error.message).join(" | "));
  }
  console.log(`Public review service: ${result.product.handle} (${result.product.status}, Online Store)`);
}

main().catch((error) => {
  console.error(`ERROR: ${error.message}`);
  process.exit(1);
});
