import type { ActionFunctionArgs, LoaderFunctionArgs } from "@remix-run/node";
import { json } from "@remix-run/node";
import { Form, useActionData, useLoaderData } from "@remix-run/react";
import {
  Banner,
  BlockStack,
  Button,
  Card,
  InlineStack,
  Layout,
  Page,
  Text,
} from "@shopify/polaris";
import { TitleBar } from "@shopify/app-bridge-react";
import { requireOwnerAdmin } from "../models/access.server";
import {
  applyPurchaseFlowToHandles,
  ensurePurchaseFlowMetafieldDefinition,
  getPurchaseFlowDefinitionStatus,
} from "../models/purchase-flow.server";

const PURCHASE_FLOW_OPTIONS = [
  "consultative",
  "vehicle_precheck_checkout",
] as const;
const PILOT_HANDLES_DEFAULT = [
  "cambio-neumaticos-eixample-tire-center",
  "alineacion-balanceo-eixample-tire-center",
  "alineacion-rapida-costa-garage-express",
  "cambio-neumatico-domicilio-poblenou-road-assist",
].join("\n");

export const loader = async ({ request }: LoaderFunctionArgs) => {
  const { admin } = await requireOwnerAdmin(request);
  const status = await getPurchaseFlowDefinitionStatus(admin);
  return json(status);
};

export const action = async ({ request }: ActionFunctionArgs) => {
  const { admin } = await requireOwnerAdmin(request);
  const formData = await request.formData();
  const intent = String(formData.get("intent") || "").trim();

  try {
    if (intent === "ensure_definition") {
      const result = await ensurePurchaseFlowMetafieldDefinition(admin);
      return json({
        ok: true,
        intent,
        result,
      });
    }

    if (intent === "apply_flow") {
      const flow = String(formData.get("flow") || "");
      const handles = String(formData.get("handles") || "");
      const result = await applyPurchaseFlowToHandles(admin, {
        flow,
        rawHandles: handles,
      });
      return json({
        ok: true,
        intent,
        result,
      });
    }

    return json(
      {
        ok: false,
        message: "Intent no soportado.",
      },
      { status: 400 },
    );
  } catch (error) {
    return json(
      {
        ok: false,
        intent,
        message:
          error instanceof Error
            ? error.message
            : "No se pudo ejecutar la accion de purchase flow.",
      },
      { status: 500 },
    );
  }
};

export default function PurchaseFlowPage() {
  const loaderData = useLoaderData<typeof loader>();
  const actionData = useActionData<typeof action>();

  return (
    <Page>
      <TitleBar title="Lote 3 · Purchase Flow" />
      <Layout>
        <Layout.Section>
          <BlockStack gap="400">
            <Card>
              <BlockStack gap="300">
                <Text as="h2" variant="headingMd">
                  1) Definicion metafield de producto
                </Text>
                <Text as="p" tone="subdued">
                  Metafield requerido: <code>service.purchase_flow</code> con
                  valores operativos <code>consultative</code> y{" "}
                  <code>vehicle_precheck_checkout</code>.
                </Text>

                <Banner tone={loaderData.exists ? "success" : "warning"}>
                  {loaderData.exists
                    ? "La definicion ya existe en Shopify."
                    : "La definicion aun no existe. Crea la definicion antes de activar piloto."}
                </Banner>

                <Form method="post">
                  <input type="hidden" name="intent" value="ensure_definition" />
                  <Button submit variant="primary">
                    Crear / verificar definicion
                  </Button>
                </Form>
              </BlockStack>
            </Card>

            <Card>
              <BlockStack gap="300">
                <Text as="h2" variant="headingMd">
                  2) Activar piloto por handles
                </Text>
                <Text as="p" tone="subdued">
                  Pega handles de producto (uno por linea o separados por coma).
                  Esta accion aplica el metafield en lote.
                </Text>
                <Text as="p" tone="subdued">
                  Set piloto sugerido precargado: 4 servicios de neumaticos/alineacion.
                </Text>

                <Form method="post">
                  <input type="hidden" name="intent" value="apply_flow" />
                  <BlockStack gap="300">
                    <label>
                      <Text as="span" variant="bodyMd">
                        Flow de compra
                      </Text>
                      <div style={{ marginTop: "0.5rem" }}>
                        <select name="flow" defaultValue={PURCHASE_FLOW_OPTIONS[0]}>
                          {PURCHASE_FLOW_OPTIONS.map((value) => (
                            <option key={value} value={value}>
                              {value}
                            </option>
                          ))}
                        </select>
                      </div>
                    </label>
                    <label>
                      <Text as="span" variant="bodyMd">
                        Handles de productos
                      </Text>
                      <div style={{ marginTop: "0.5rem" }}>
                        <textarea
                          name="handles"
                          rows={6}
                          style={{ width: "100%" }}
                          defaultValue={PILOT_HANDLES_DEFAULT}
                          placeholder="cambio-neumaticos-suv"
                        />
                      </div>
                    </label>
                    <InlineStack>
                      <Button submit variant="primary">
                        Aplicar flow a piloto
                      </Button>
                    </InlineStack>
                  </BlockStack>
                </Form>
              </BlockStack>
            </Card>

            {actionData ? (
              <Card>
                <BlockStack gap="200">
                  <Text as="h2" variant="headingMd">
                    Resultado
                  </Text>
                  <pre style={{ whiteSpace: "pre-wrap", margin: 0 }}>
                    {JSON.stringify(actionData, null, 2)}
                  </pre>
                </BlockStack>
              </Card>
            ) : null}
          </BlockStack>
        </Layout.Section>
      </Layout>
    </Page>
  );
}
