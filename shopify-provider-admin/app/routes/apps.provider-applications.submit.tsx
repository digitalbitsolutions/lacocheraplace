import type { ActionFunctionArgs, LoaderFunctionArgs } from "@remix-run/node";
import { json } from "@remix-run/node";
import { authenticate } from "../shopify.server";
import {
  createProviderApplicationRequest,
  type ProviderApplicationSubmission,
  validateProviderApplicationSubmission,
} from "../models/provider-applications.server";

export const loader = async ({ request }: LoaderFunctionArgs) => {
  await authenticate.public.appProxy(request);

  return json({
    ok: true,
    message: "Usa POST para crear solicitudes de proveedores.",
  });
};

export const action = async ({ request }: ActionFunctionArgs) => {
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

  const payload =
    ((await request.json()) as Partial<ProviderApplicationSubmission>) || {};
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

  try {
    const record = await createProviderApplicationRequest(
      admin,
      payload as ProviderApplicationSubmission,
    );

    return json({
      ok: true,
      requestId: record.id,
      submissionId: record.submissionId,
      providerSlug: record.providerSlug,
      status: record.status,
    });
  } catch (error) {
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
