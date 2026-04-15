export const PURCHASE_FLOW_NAMESPACE = "service";
export const PURCHASE_FLOW_KEY = "purchase_flow";
export const PURCHASE_FLOW_VALUES = [
  "consultative",
  "vehicle_precheck_checkout",
] as const;
export type PurchaseFlowValue = (typeof PURCHASE_FLOW_VALUES)[number];

type GraphqlAdmin = {
  graphql: (
    query: string,
    options?: {
      variables?: Record<string, unknown>;
    },
  ) => Promise<Response>;
};

type ProductFlowRecord = {
  id: string;
  handle: string;
  title: string;
  purchaseFlow: string;
  hasFamilyOption: boolean;
  hasSizeOption: boolean;
  variantsCount: number;
};

function normalizeHandleList(raw: string) {
  return Array.from(
    new Set(
      (raw || "")
        .split(/[\n,]+/)
        .map((item) => item.trim())
        .filter(Boolean),
    ),
  );
}

function isValidPurchaseFlow(value: string): value is PurchaseFlowValue {
  return PURCHASE_FLOW_VALUES.includes(value as PurchaseFlowValue);
}

async function shopifyGraphql<T>(
  admin: GraphqlAdmin,
  query: string,
  variables?: Record<string, unknown>,
): Promise<T> {
  const response = await admin.graphql(query, { variables });
  const payload = (await response.json()) as {
    data?: T;
    errors?: Array<{ message: string }>;
  };

  if (payload.errors?.length) {
    throw new Error(payload.errors.map((error) => error.message).join(", "));
  }

  if (!payload.data) {
    throw new Error("Shopify no devolvio datos para la operacion solicitada.");
  }

  return payload.data;
}

async function fetchProductByHandle(admin: GraphqlAdmin, handle: string) {
  const data = await shopifyGraphql<{
    productByHandle: {
      id: string;
      handle: string;
      title: string;
      options: Array<{
        name: string;
        values: string[];
      }>;
      variants: { nodes: Array<{ id: string }> };
      metafield: { value: string | null } | null;
    } | null;
  }>(
    admin,
    `#graphql
      query ProductFlowByHandle($handle: String!) {
        productByHandle(handle: $handle) {
          id
          handle
          title
          options {
            name
            values
          }
          variants(first: 250) {
            nodes {
              id
            }
          }
          metafield(namespace: "service", key: "purchase_flow") {
            value
          }
        }
      }`,
    { handle },
  );

  return data.productByHandle;
}

function mapProductFlowRecord(
  product: NonNullable<Awaited<ReturnType<typeof fetchProductByHandle>>>,
): ProductFlowRecord {
  const optionNames = (product.options || []).map((option) =>
    option.name.trim().toLowerCase(),
  );

  return {
    id: product.id,
    handle: product.handle,
    title: product.title,
    purchaseFlow: product.metafield?.value?.trim() || "consultative",
    hasFamilyOption: optionNames.includes("familia") || optionNames.includes("family"),
    hasSizeOption: optionNames.includes("talla") || optionNames.includes("size"),
    variantsCount: product.variants.nodes.length,
  };
}

async function assertMetafieldDefinition(admin: GraphqlAdmin) {
  const data = await shopifyGraphql<{
    metafieldDefinitions: {
      nodes: Array<{ id: string; name: string; namespace: string; key: string }>;
    };
  }>(
    admin,
    `#graphql
      query PurchaseFlowMetafieldDefinition {
        metafieldDefinitions(
          ownerType: PRODUCT,
          namespace: "service",
          key: "purchase_flow",
          first: 1
        ) {
          nodes {
            id
            name
            namespace
            key
          }
        }
      }`,
  );

  return data.metafieldDefinitions.nodes[0] || null;
}

export async function ensurePurchaseFlowMetafieldDefinition(admin: GraphqlAdmin) {
  const existing = await assertMetafieldDefinition(admin);
  if (existing) {
    return {
      created: false,
      definition: existing,
    };
  }

  const data = await shopifyGraphql<{
    metafieldDefinitionCreate: {
      createdDefinition: { id: string; name: string; namespace: string; key: string } | null;
      userErrors: Array<{ message: string }>;
    };
  }>(
    admin,
    `#graphql
      mutation CreatePurchaseFlowDefinition($definition: MetafieldDefinitionInput!) {
        metafieldDefinitionCreate(definition: $definition) {
          createdDefinition {
            id
            name
            namespace
            key
          }
          userErrors {
            message
          }
        }
      }`,
    {
      definition: {
        name: "Service Purchase Flow",
        namespace: PURCHASE_FLOW_NAMESPACE,
        key: PURCHASE_FLOW_KEY,
        ownerType: "PRODUCT",
        type: "single_line_text_field",
        description:
          "Controla el flujo de compra del servicio: consultative o vehicle_precheck_checkout.",
        pin: true,
      },
    },
  );

  if (data.metafieldDefinitionCreate.userErrors.length) {
    throw new Error(
      data.metafieldDefinitionCreate.userErrors
        .map((error) => error.message)
        .join(", "),
    );
  }

  if (!data.metafieldDefinitionCreate.createdDefinition) {
    throw new Error("No se pudo crear la definicion del metafield purchase_flow.");
  }

  return {
    created: true,
    definition: data.metafieldDefinitionCreate.createdDefinition,
  };
}

export async function applyPurchaseFlowToHandles(
  admin: GraphqlAdmin,
  params: {
    rawHandles: string;
    flow: string;
  },
) {
  if (!isValidPurchaseFlow(params.flow)) {
    throw new Error(
      `Valor de purchase_flow invalido. Usa: ${PURCHASE_FLOW_VALUES.join(", ")}`,
    );
  }

  const handles = normalizeHandleList(params.rawHandles);
  if (!handles.length) {
    throw new Error("Debes indicar al menos un handle de producto.");
  }

  const snapshot: ProductFlowRecord[] = [];
  const missing: string[] = [];
  const toUpdate: Array<{ ownerId: string; handle: string }> = [];

  for (const handle of handles) {
    const product = await fetchProductByHandle(admin, handle);
    if (!product) {
      missing.push(handle);
      continue;
    }

    const record = mapProductFlowRecord(product);
    snapshot.push(record);
    toUpdate.push({ ownerId: record.id, handle: record.handle });
  }

  const metafields = toUpdate.map((item) => ({
    ownerId: item.ownerId,
    namespace: PURCHASE_FLOW_NAMESPACE,
    key: PURCHASE_FLOW_KEY,
    type: "single_line_text_field",
    value: params.flow,
  }));

  let updated = 0;
  let userErrors: Array<{ field: string[] | null; message: string }> = [];

  if (metafields.length) {
    const updateData = await shopifyGraphql<{
      metafieldsSet: {
        metafields: Array<{ id: string }>;
        userErrors: Array<{ field: string[] | null; message: string }>;
      };
    }>(
      admin,
      `#graphql
        mutation SetPurchaseFlow($metafields: [MetafieldsSetInput!]!) {
          metafieldsSet(metafields: $metafields) {
            metafields {
              id
            }
            userErrors {
              field
              message
            }
          }
        }`,
      { metafields },
    );

    updated = updateData.metafieldsSet.metafields.length;
    userErrors = updateData.metafieldsSet.userErrors || [];
  }

  return {
    flow: params.flow as PurchaseFlowValue,
    totalHandles: handles.length,
    resolvedProducts: snapshot.length,
    updated,
    missing,
    userErrors,
    snapshot,
  };
}

export async function getPurchaseFlowDefinitionStatus(admin: GraphqlAdmin) {
  const definition = await assertMetafieldDefinition(admin);
  return {
    exists: Boolean(definition),
    definition,
  };
}
