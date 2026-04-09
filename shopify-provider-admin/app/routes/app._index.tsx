import type { LoaderFunctionArgs } from "@remix-run/node";
import { json } from "@remix-run/node";
import { useLoaderData, useSearchParams } from "@remix-run/react";
import {
  Badge,
  Banner,
  Bleed,
  BlockStack,
  Box,
  Button,
  Card,
  EmptyState,
  InlineGrid,
  InlineStack,
  Layout,
  Page,
  Tabs,
  Text,
} from "@shopify/polaris";
import { TitleBar } from "@shopify/app-bridge-react";
import { requireOwnerAdmin } from "../models/access.server";
import { listProviderApplicationRequests } from "../models/provider-applications.server";

const REQUEST_STATUS_TABS = ["pending", "approved", "declined"] as const;
type RequestStatus = (typeof REQUEST_STATUS_TABS)[number];

export const loader = async ({ request }: LoaderFunctionArgs) => {
  const { admin } = await requireOwnerAdmin(request);
  const requests = await listProviderApplicationRequests(admin);
  return json({ requests });
};

export default function Index() {
  const { requests } = useLoaderData<typeof loader>();
  const [searchParams, setSearchParams] = useSearchParams();
  const selectedStatus =
    (searchParams.get("status") as RequestStatus) || "pending";

  const tabs = REQUEST_STATUS_TABS.map((status) => {
    const total = requests.filter((request) => request.status === status).length;

    return {
      id: status,
      content: `${capitalize(status)} (${total})`,
      accessibilityLabel: status,
      panelID: `${status}-requests`,
    };
  });

  const selectedTabIndex = Math.max(
    0,
    REQUEST_STATUS_TABS.findIndex((status) => status === selectedStatus),
  );

  const filteredRequests = requests.filter((request) => request.status === selectedStatus);

  return (
    <Page>
      <TitleBar title="Solicitudes de proveedores" />
      <BlockStack gap="500">
        <Layout>
          <Layout.Section>
            <Card>
              <BlockStack gap="500">
                <Banner>
                  La app ya usa Shopify Admin como consola central. Desde aqui
                  el owner puede revisar, aprobar o declinar altas sin tocar
                  JSON manualmente.
                </Banner>

                <Tabs
                  tabs={tabs}
                  selected={selectedTabIndex}
                  onSelect={(index) =>
                    setSearchParams({ status: REQUEST_STATUS_TABS[index] })
                  }
                />

                {filteredRequests.length ? (
                  <BlockStack gap="300">
                    {filteredRequests.map((request: ProviderApplicationRecord) => (
                      <Bleed key={request.id} marginInline="400">
                        <Box paddingInline="400" paddingBlock="300">
                          <InlineGrid columns={["twoThirds", "oneThird"]} gap="400">
                            <BlockStack gap="100">
                              <InlineStack gap="200" blockAlign="center">
                                <Text as="h3" variant="headingMd">
                                  {request.displayName}
                                </Text>
                                <Badge tone={getStatusTone(request.status)}>
                                  {capitalize(request.status)}
                                </Badge>
                              </InlineStack>
                              <Text as="p" tone="subdued">
                                {request.contactName} · {request.email}
                              </Text>
                              <Text as="p" tone="subdued">
                                {request.city}, {request.country}
                              </Text>
                              <Text as="p" tone="subdued">
                                Categorias:{" "}
                                {request.serviceCategories.length
                                  ? request.serviceCategories.join(", ")
                                  : "-"}
                              </Text>
                            </BlockStack>

                            <BlockStack gap="200" inlineAlign="end">
                              <Text as="p" tone="subdued">
                                {formatDateTime(
                                  request.reviewedAt || request.submittedAt,
                                )}
                              </Text>
                              <Button
                                url={`/app/requests/${encodeURIComponent(request.id)}`}
                              >
                                Ver detalle
                              </Button>
                            </BlockStack>
                          </InlineGrid>
                        </Box>
                      </Bleed>
                    ))}
                  </BlockStack>
                ) : (
                  <EmptyState
                    heading={`No hay solicitudes ${selectedStatus}`}
                    image="https://cdn.shopify.com/s/files/1/0262/4071/2726/files/emptystate-files.png"
                  >
                    <p>
                      Cuando el formulario publico empiece a crear solicitudes
                      estructuradas, apareceran aqui automaticamente.
                    </p>
                  </EmptyState>
                )}
              </BlockStack>
            </Card>
          </Layout.Section>

          <Layout.Section variant="oneThird">
            <BlockStack gap="500">
              <Card>
                <BlockStack gap="200">
                  <Text as="h2" variant="headingMd">
                    Resumen
                  </Text>
                  <SummaryMetric
                    label="Pendientes"
                    value={countByStatus(requests, "pending")}
                  />
                  <SummaryMetric
                    label="Aprobadas"
                    value={countByStatus(requests, "approved")}
                  />
                  <SummaryMetric
                    label="Declinadas"
                    value={countByStatus(requests, "declined")}
                  />
                </BlockStack>
              </Card>

              <Card>
                <BlockStack gap="200">
                  <Text as="h2" variant="headingMd">
                    Estado del flujo
                  </Text>
                  <Text as="p" variant="bodyMd">
                    Esta pantalla muestra registros del metaobject{" "}
                    <code>provider_application_request</code>. El siguiente paso
                    operativo es conectar el formulario publico para crear estos
                    registros en paralelo al email.
                  </Text>
                </BlockStack>
              </Card>
            </BlockStack>
          </Layout.Section>
        </Layout>
      </BlockStack>
    </Page>
  );
}

function SummaryMetric({ label, value }: { label: string; value: number }) {
  return (
    <InlineStack align="space-between">
      <Text as="span">{label}</Text>
      <Text as="span" variant="headingMd">
        {value}
      </Text>
    </InlineStack>
  );
}

function countByStatus(
  requests: Array<{ status: RequestStatus }>,
  status: RequestStatus,
) {
  return requests.filter((request) => request.status === status).length;
}

function capitalize(value: string) {
  return value.charAt(0).toUpperCase() + value.slice(1);
}

function formatDateTime(value: string) {
  if (!value) return "-";

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;

  return new Intl.DateTimeFormat("es-ES", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
}

function getStatusTone(status: RequestStatus) {
  if (status === "approved") return "success";
  if (status === "declined") return "critical";
  return "attention";
}
