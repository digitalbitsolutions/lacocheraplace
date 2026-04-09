import type { ActionFunctionArgs, LoaderFunctionArgs } from "@remix-run/node";
import { json, redirect } from "@remix-run/node";
import { Form, useActionData, useLoaderData } from "@remix-run/react";
import {
  Badge,
  Banner,
  BlockStack,
  Button,
  Card,
  DescriptionList,
  Layout,
  Page,
  Text,
  TextField,
} from "@shopify/polaris";
import { TitleBar } from "@shopify/app-bridge-react";
import { requireOwnerAdmin } from "../models/access.server";
import {
  approveProviderApplicationRequest,
  declineProviderApplicationRequest,
  getProviderApplicationRequest,
} from "../models/provider-applications.server";

export const loader = async ({ request, params }: LoaderFunctionArgs) => {
  const { admin } = await requireOwnerAdmin(request);
  const requestId = params.requestId;

  if (!requestId) {
    throw new Response("Solicitud no encontrada.", { status: 404 });
  }

  const application = await getProviderApplicationRequest(admin, requestId);
  if (!application) {
    throw new Response("Solicitud no encontrada.", { status: 404 });
  }

  return json({ application });
};

export const action = async ({ request, params }: ActionFunctionArgs) => {
  const { admin, session } = await requireOwnerAdmin(request);
  const requestId = params.requestId;

  if (!requestId) {
    throw new Response("Solicitud no encontrada.", { status: 404 });
  }

  const application = await getProviderApplicationRequest(admin, requestId);
  if (!application) {
    throw new Response("Solicitud no encontrada.", { status: 404 });
  }

  const formData = await request.formData();
  const intent = String(formData.get("intent") || "");
  const reviewerEmail = session.email || "";

  try {
    if (intent === "approve") {
      await approveProviderApplicationRequest(admin, application, reviewerEmail);
      return redirect(`/app/requests/${encodeURIComponent(requestId)}?result=approved`);
    }

    if (intent === "decline") {
      const declineReason = String(formData.get("declineReason") || "");
      await declineProviderApplicationRequest(
        admin,
        requestId,
        declineReason,
        reviewerEmail,
      );
      return redirect(`/app/requests/${encodeURIComponent(requestId)}?result=declined`);
    }

    return json({ error: "Accion no soportada." }, { status: 400 });
  } catch (error) {
    return json(
      {
        error:
          error instanceof Error
            ? error.message
            : "No se pudo procesar la solicitud.",
      },
      { status: 400 },
    );
  }
};

export default function ProviderApplicationDetail() {
  const { application } = useLoaderData<typeof loader>();
  const actionData = useActionData<typeof action>();

  return (
    <Page
      title={application.displayName}
      subtitle={`Solicitud ${application.status}`}
      backAction={{ content: "Solicitudes", url: "/app" }}
    >
      <TitleBar title={application.displayName} />
      <BlockStack gap="500">
        {actionData?.error ? (
          <Banner tone="critical">{actionData.error}</Banner>
        ) : null}

        <Layout>
          <Layout.Section>
            <Card>
              <BlockStack gap="500">
                <BlockStack gap="100">
                  <Text as="h2" variant="headingLg">
                    {application.displayName}
                  </Text>
                  <Badge tone={getStatusTone(application.status)}>
                    {application.status}
                  </Badge>
                  <Text as="p" tone="subdued">
                    Submission ID: {application.submissionId}
                  </Text>
                </BlockStack>

                <SectionCard
                  title="Datos del negocio"
                  items={[
                    ["Nombre comercial", application.displayName],
                    ["Nombre legal", application.legalName],
                    ["Nombre en catalogo", application.catalogVendorName],
                    ["Descripcion", application.description],
                    ["Horarios", application.openingHours],
                  ]}
                />

                <SectionCard
                  title="Contacto"
                  items={[
                    ["Persona de contacto", application.contactName],
                    ["Email", application.email],
                    ["Telefono", application.phone],
                    ["WhatsApp", application.whatsapp],
                  ]}
                />

                <SectionCard
                  title="Ubicacion"
                  items={[
                    ["Direccion principal", application.addressLine1],
                    ["Informacion adicional", application.addressLine2],
                    ["Ciudad", application.city],
                    ["Codigo postal", application.postalCode],
                    ["Provincia o region", application.provinceOrRegion],
                    ["Pais", application.country],
                    ["Google Place ID", application.googlePlaceId],
                    ["Latitud", application.latitude],
                    ["Longitud", application.longitude],
                  ]}
                />

                <SectionCard
                  title="Datos fiscales y bancarios"
                  items={[
                    ["Titular de la cuenta", application.accountHolder],
                    ["NIF/CIF", application.taxId],
                    ["IBAN", application.iban],
                    ["Banco", application.bankName],
                    ["Pais de la cuenta", application.bankCountry],
                  ]}
                />

                <SectionCard
                  title="Servicios y activos"
                  items={[
                    [
                      "Categorias",
                      application.serviceCategories.length
                        ? application.serviceCategories.join(", ")
                        : "-",
                    ],
                    ["Sitio web", application.websiteUrl],
                    ["Instagram", application.instagramUrl],
                    ["URL del logo", application.logoSourceUrl],
                    ["Galeria", application.gallerySourceUrls],
                  ]}
                />
              </BlockStack>
            </Card>
          </Layout.Section>

          <Layout.Section variant="oneThird">
            <Card>
              <BlockStack gap="300">
                <Text as="h2" variant="headingMd">
                  Gestion
                </Text>
                <Text as="p" tone="subdued">
                  Enviada: {formatDateTime(application.submittedAt)}
                </Text>
                <Text as="p" tone="subdued">
                  Revisada: {formatDateTime(application.reviewedAt)}
                </Text>
                <Text as="p" tone="subdued">
                  Revisor: {application.reviewedByEmail || "-"}
                </Text>

                {application.status === "pending" ? (
                  <BlockStack gap="300">
                    <Form method="post">
                      <input type="hidden" name="intent" value="approve" />
                      <Button submit variant="primary" fullWidth>
                        Aprobar solicitud
                      </Button>
                    </Form>

                    <Form method="post">
                      <input type="hidden" name="intent" value="decline" />
                      <BlockStack gap="200">
                        <TextField
                          label="Motivo del rechazo"
                          name="declineReason"
                          autoComplete="off"
                          multiline={4}
                          helpText="Este campo es obligatorio para declinar."
                        />
                        <Button submit tone="critical" fullWidth>
                          Declinar solicitud
                        </Button>
                      </BlockStack>
                    </Form>
                  </BlockStack>
                ) : (
                  <Banner tone={application.status === "approved" ? "success" : "critical"}>
                    {application.status === "approved"
                      ? `Solicitud aprobada. Provider profile: ${application.providerProfileHandle || "-"}`
                      : `Solicitud declinada. Motivo: ${application.declineReason || "-"}`}
                  </Banner>
                )}
              </BlockStack>
            </Card>
          </Layout.Section>
        </Layout>
      </BlockStack>
    </Page>
  );
}

function SectionCard({
  title,
  items,
}: {
  title: string;
  items: Array<[string, string]>;
}) {
  return (
    <Card>
      <BlockStack gap="300">
        <Text as="h3" variant="headingMd">
          {title}
        </Text>
        <DescriptionList
          items={items.map(([term, description]) => ({
            term,
            description: description || "-",
          }))}
        />
      </BlockStack>
    </Card>
  );
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

function getStatusTone(status: string) {
  if (status === "approved") return "success";
  if (status === "declined") return "critical";
  return "attention";
}
