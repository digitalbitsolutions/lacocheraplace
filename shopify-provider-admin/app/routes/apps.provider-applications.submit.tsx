import type { ActionFunctionArgs, LoaderFunctionArgs } from "@remix-run/node";
import { json } from "@remix-run/node";
import { authenticate } from "../shopify.server";
import {
  createProviderApplicationRequest,
  type ProviderApplicationSubmission,
  validateProviderApplicationSubmission,
} from "../models/provider-applications.server";

const MAX_PROVIDER_IMAGE_BYTES = 5 * 1024 * 1024;
const PROVIDER_IMAGE_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);

type UploadedImage = File;

function isUploadedImage(value: FormDataEntryValue | null): value is UploadedImage {
  return value instanceof File && value.size > 0;
}

function validateUploadedImages(logo: UploadedImage | null, gallery: UploadedImage[]) {
  if (!logo) return "Adjunta el logo del negocio.";
  if (gallery.length > 6) return "Puedes adjuntar hasta 6 fotos para el book.";
  const invalid = [logo, ...gallery].find(
    (file) => !PROVIDER_IMAGE_TYPES.has(file.type) || file.size > MAX_PROVIDER_IMAGE_BYTES,
  );
  return invalid
    ? "Cada imagen debe ser JPG, PNG o WebP y pesar como máximo 5 MB."
    : "";
}

async function uploadProviderImage(
  admin: { graphql: (query: string, options?: { variables?: Record<string, unknown> }) => Promise<Response> },
  file: UploadedImage,
  alt: string,
) {
  const stagedResponse = await admin.graphql(
    `#graphql
      mutation CreateProviderImageUpload($input: [StagedUploadInput!]!) {
        stagedUploadsCreate(input: $input) {
          stagedTargets { url resourceUrl parameters { name value } }
          userErrors { message }
        }
      }
    `,
    { variables: { input: [{ filename: file.name, mimeType: file.type, resource: "FILE", httpMethod: "POST", fileSize: String(file.size) }] } },
  );
  const stagedPayload = (await stagedResponse.json()) as any;
  const stagedResult = stagedPayload.data?.stagedUploadsCreate;
  if (stagedPayload.errors?.length || stagedResult?.userErrors?.length || !stagedResult?.stagedTargets?.[0]) {
    throw new Error(stagedPayload.errors?.[0]?.message || stagedResult?.userErrors?.[0]?.message || "No se pudo preparar la subida de la imagen.");
  }

  const target = stagedResult.stagedTargets[0];
  const uploadForm = new FormData();
  target.parameters.forEach((parameter: { name: string; value: string }) => uploadForm.append(parameter.name, parameter.value));
  uploadForm.append("file", file, file.name);
  const uploadResponse = await fetch(target.url, { method: "POST", body: uploadForm });
  if (!uploadResponse.ok) throw new Error("No se pudo subir la imagen a Shopify.");

  const fileResponse = await admin.graphql(
    `#graphql
      mutation CreateProviderImageFile($files: [FileCreateInput!]!) {
        fileCreate(files: $files) {
          files { ... on MediaImage { image { url } } }
          userErrors { message }
        }
      }
    `,
    { variables: { files: [{ originalSource: target.resourceUrl, contentType: "IMAGE", alt }] } },
  );
  const filePayload = (await fileResponse.json()) as any;
  const fileResult = filePayload.data?.fileCreate;
  const url = fileResult?.files?.[0]?.image?.url;
  if (filePayload.errors?.length || fileResult?.userErrors?.length || !url) {
    throw new Error(filePayload.errors?.[0]?.message || fileResult?.userErrors?.[0]?.message || "Shopify no devolvió la URL de la imagen.");
  }
  return String(url);
}

export const loader = async ({ request }: LoaderFunctionArgs) => {
  try {
    await authenticate.public.appProxy(request);

    return json(
      {
        ok: true,
        message: "Configuracion publica del formulario cargada.",
        config: {
          // Expose only a dedicated browser key via the proxy.
          googleMapsBrowserApiKey:
            process.env.GOOGLE_MAPS_BROWSER_API_KEY || "",
        },
      },
      {
        headers: {
          "Cache-Control": "no-store",
        },
      },
    );
  } catch (error) {
    console.error("[provider-applications.submit][loader]", error);
    return json(
      {
        ok: false,
        message:
          error instanceof Error
            ? error.message
            : "Fallo autenticando la app proxy.",
      },
      {
        status: 500,
        headers: {
          "Cache-Control": "no-store",
        },
      },
    );
  }
};

export const action = async ({ request }: ActionFunctionArgs) => {
  try {
    const { admin } = await authenticate.public.appProxy(request);

    if (!admin) {
      return json(
        {
          ok: false,
          message:
            "No se pudo autenticar la app proxy. Comprueba que la app este instalada y configurada en la tienda.",
        },
        { status: 503 },
      );
    }

    const contentType = request.headers.get("content-type") || "";
    const isMultipart = contentType.includes("multipart/form-data");
    const formData = isMultipart ? await request.formData() : null;
    const payload = isMultipart
      ? (JSON.parse(String(formData?.get("payload") || "{}")) as Partial<ProviderApplicationSubmission>)
      : (((await request.json()) as Partial<ProviderApplicationSubmission>) || {});
    const logo = isUploadedImage(formData?.get("logo") || null) ? formData?.get("logo") as UploadedImage : null;
    const gallery = isMultipart
      ? formData!.getAll("gallery").filter((value): value is UploadedImage => isUploadedImage(value))
      : [];
    const imageError = isMultipart ? validateUploadedImages(logo, gallery) : "";
    if (imageError) {
      return json({ ok: false, message: imageError }, { status: 422 });
    }
    if (isMultipart) {
      payload.logoSourceUrl = "https://placeholder.invalid/logo";
      payload.gallerySourceUrls = gallery.length ? "https://placeholder.invalid/gallery" : "";
    }
    const validation = validateProviderApplicationSubmission(payload);

    if (!validation.valid) {
      return json(
        {
          ok: false,
          message: "La solicitud contiene errores de validacion.",
          errors: validation.errors,
        },
        { status: 422 },
      );
    }

    if (isMultipart && logo) {
      payload.logoSourceUrl = await uploadProviderImage(admin, logo, "Logo de proveedor");
      payload.gallerySourceUrls = (await Promise.all(
        gallery.map((file, index) => uploadProviderImage(admin, file, `Book de proveedor ${index + 1}`)),
      )).join("\n");
    }

    const record = await createProviderApplicationRequest(
      admin,
      payload as ProviderApplicationSubmission,
    );

    return json(
      {
        ok: true,
        requestId: record.id,
        submissionId: record.submissionId,
        providerSlug: record.providerSlug,
        status: record.status,
      },
    );
  } catch (error) {
    console.error("[provider-applications.submit][action]", error);
    return json(
      {
        ok: false,
        message:
          error instanceof Error
            ? error.message
            : "No se pudo guardar la solicitud.",
      },
      { status: 500 },
    );
  }
};
