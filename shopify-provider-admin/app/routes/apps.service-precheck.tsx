import type { ActionFunctionArgs, LoaderFunctionArgs } from "@remix-run/node";
import { json } from "@remix-run/node";
import {
  runServicePrecheck,
  validateServicePrecheckInput,
} from "../models/service-precheck.server";
import { authenticate } from "../shopify.server";

type PrecheckPayload = {
  productId?: string;
  productHandle?: string;
  plate?: string;
  countryCode?: string;
  customer?: {
    name?: string;
    email?: string;
    phone?: string;
  };
};

function extractShopFromRequest(request: Request) {
  const url = new URL(request.url);
  const fromQuery = (url.searchParams.get("shop") || "").trim();
  return fromQuery || "";
}

export const loader = async ({ request }: LoaderFunctionArgs) => {
  try {
    await authenticate.public.appProxy(request);

    return json(
      {
        ok: true,
        message: "Endpoint de service precheck listo.",
      },
      {
        headers: {
          "Cache-Control": "no-store",
        },
      },
    );
  } catch (error) {
    console.error("[service-precheck][loader]", error);
    return json(
      {
        ok: false,
        message:
          error instanceof Error
            ? error.message
            : "No se pudo autenticar la app proxy.",
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
    const { admin, session } = await authenticate.public.appProxy(request);
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

    const rawPayload = ((await request.json()) as PrecheckPayload) || {};
    const validation = validateServicePrecheckInput({
      productId: rawPayload.productId,
      productHandle: rawPayload.productHandle,
      plate: rawPayload.plate,
      countryCode: rawPayload.countryCode,
      customer: {
        name: rawPayload.customer?.name,
        email: rawPayload.customer?.email,
        phone: rawPayload.customer?.phone,
      },
    });

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

    const shop = session?.shop || extractShopFromRequest(request);
    if (!shop) {
      return json(
        {
          ok: false,
          message:
            "No se pudo determinar la tienda para persistir el precheck.",
        },
        { status: 400 },
      );
    }

    const result = await runServicePrecheck(admin, {
      shop,
      productId: validation.normalized.productId,
      productHandle: validation.normalized.productHandle,
      plate: validation.normalized.plateNormalized,
      countryCode: validation.normalized.countryCode,
      customer: validation.normalized.customer,
    });

    const statusCode =
      result.status === "ok" ? 200 : result.status === "incompatible" ? 409 : 422;

    return json(
      {
        ok: result.status === "ok",
        status: result.status,
        servicePrecheckId: result.servicePrecheckId,
        product: result.product,
        vehicle: "vehicle" in result ? result.vehicle : null,
        compatibility: result.compatibility,
      },
      {
        status: statusCode,
        headers: {
          "Cache-Control": "no-store",
        },
      },
    );
  } catch (error) {
    console.error("[service-precheck][action]", error);
    return json(
      {
        ok: false,
        status: "unverified",
        message:
          error instanceof Error
            ? error.message
            : "No se pudo ejecutar el precheck de servicio.",
      },
      { status: 500 },
    );
  }
};
