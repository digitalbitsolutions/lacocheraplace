import type { ActionFunctionArgs, LoaderFunctionArgs } from "@remix-run/node";
import { json } from "@remix-run/node";
import { Form, useActionData, useLoaderData } from "@remix-run/react";
import { Banner, BlockStack, Button, Card, InlineStack, Layout, Page, Text } from "@shopify/polaris";
import { TitleBar } from "@shopify/app-bridge-react";
import { requireOwnerAdmin } from "../models/access.server";
import { listApprovedProviderProfiles, updateProviderProfileLogo } from "../models/provider-applications.server";

const CHICLAYO_IMAGES: Record<string, string> = {
  "ricar-multicenter": "https://cdn.shopify.com/s/files/1/1016/5102/2161/files/motor-a-vapor-r3-04_663487ad-fd09-4bec-a3f3-d8b2e773f8da.webp?v=1778613448",
  "automan-chiclayo-eirl": "https://cdn.shopify.com/s/files/1/1016/5102/2161/files/mantenimiento-basico-01_22c4cb72-d48c-4a97-9534-eff3bd0d36f4.webp?v=1778271967",
  "automotriz-burga": "https://cdn.shopify.com/s/files/1/1016/5102/2161/files/mantenimiento-basico-01_22c4cb72-d48c-4a97-9534-eff3bd0d36f4.webp?v=1778271967",
  "automotriz-palomino": "https://cdn.shopify.com/s/files/1/1016/5102/2161/files/mantenimiento-basico-01_22c4cb72-d48c-4a97-9534-eff3bd0d36f4.webp?v=1778271967",
  "lubricentro-y-lavadero-oasis": "https://cdn.shopify.com/s/files/1/1016/5102/2161/files/img-lavado-completo_1.webp?v=1777490716",
  "baterias-uscay": "https://cdn.shopify.com/s/files/1/1016/5102/2161/files/motor-a-vapor-r3-04_663487ad-fd09-4bec-a3f3-d8b2e773f8da.webp?v=1778613448",
  "motor-shop-fuel-injection": "https://cdn.shopify.com/s/files/1/1016/5102/2161/files/motor-a-vapor-r3-04_663487ad-fd09-4bec-a3f3-d8b2e773f8da.webp?v=1778613448",
  "campos-motors": "https://cdn.shopify.com/s/files/1/1016/5102/2161/files/mantenimiento-basico-01_22c4cb72-d48c-4a97-9534-eff3bd0d36f4.webp?v=1778271967",
  "taller-central-motors": "https://cdn.shopify.com/s/files/1/1016/5102/2161/files/mantenimiento-basico-01_22c4cb72-d48c-4a97-9534-eff3bd0d36f4.webp?v=1778271967",
  "comercio-cia-llantas": "https://cdn.shopify.com/s/files/1/1016/5102/2161/files/mantenimiento-basico-r3-02_fc347c41-45a2-44f0-9456-5ede43c7dbeb.webp?v=1778613450",
  "carrocerias-herrera": "https://cdn.shopify.com/s/files/1/1016/5102/2161/files/mantenimiento-basico-01_22c4cb72-d48c-4a97-9534-eff3bd0d36f4.webp?v=1778271967",
  "davalos-import-sa": "https://cdn.shopify.com/s/files/1/1016/5102/2161/files/motor-a-vapor-r3-04_663487ad-fd09-4bec-a3f3-d8b2e773f8da.webp?v=1778613448",
};

export const loader = async ({ request }: LoaderFunctionArgs) => {
  const { admin } = await requireOwnerAdmin(request);
  const profiles = await listApprovedProviderProfiles(admin);
  return json({
    profiles: profiles
      .filter((profile) => CHICLAYO_IMAGES[profile.providerSlug])
      .map((profile) => ({
        id: profile.id,
        name: profile.displayName,
        slug: profile.providerSlug,
        currentImage: profile.logoSourceUrl,
        image: CHICLAYO_IMAGES[profile.providerSlug],
      })),
  });
};

export const action = async ({ request }: ActionFunctionArgs) => {
  const { admin } = await requireOwnerAdmin(request);
  const data = await request.formData();
  const slug = String(data.get("slug") || "");
  const image = CHICLAYO_IMAGES[slug];
  if (!image) return json({ ok: false, message: "Proveedor no valido." }, { status: 400 });
  const profiles = await listApprovedProviderProfiles(admin);
  const profile = profiles.find((item) => item.providerSlug === slug);
  if (!profile) return json({ ok: false, message: "No se encontro el perfil del proveedor." }, { status: 404 });
  await updateProviderProfileLogo(admin, profile.id, image);
  return json({ ok: true, message: `Imagen actualizada: ${profile.displayName}.` });
};

export default function ProviderImages() {
  const { profiles } = useLoaderData<typeof loader>();
  const actionData = useActionData<typeof action>();
  return (
    <Page>
      <TitleBar title="Imágenes de proveedores" />
      <Layout>
        <Layout.Section>
          <BlockStack gap="400">
            <Banner tone="info">Imágenes demostrativas reutilizadas de categorías de Lima. Sustituir por recursos autorizados antes de publicar comercialmente.</Banner>
            {actionData && <Banner tone={actionData.ok ? "success" : "critical"}>{actionData.message}</Banner>}
            {profiles.map((profile) => (
              <Card key={profile.id}>
                <InlineStack align="space-between" blockAlign="center" gap="400">
                  <BlockStack gap="100">
                    <Text as="h2" variant="headingMd">{profile.name}</Text>
                    <Text as="p" tone="subdued">{profile.currentImage ? "Imagen demostrativa asignada" : "Sin imagen"}</Text>
                  </BlockStack>
                  <Form method="post"><input type="hidden" name="slug" value={profile.slug} /><Button submit>Asignar imagen</Button></Form>
                </InlineStack>
              </Card>
            ))}
          </BlockStack>
        </Layout.Section>
      </Layout>
    </Page>
  );
}
