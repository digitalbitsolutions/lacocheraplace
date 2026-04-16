import type { LoaderFunctionArgs } from "@remix-run/node";
import { json } from "@remix-run/node";
import {
  listApprovedProviderProfiles,
  type ProviderProfileRecord,
} from "../models/provider-applications.server";
import { authenticate } from "../shopify.server";

function normalizeCategoryHandle(value: string) {
  const normalized = (value || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");

  const aliases: Record<string, string> = {
    lavado: "lavado",
    "lavado-de-coches": "lavado",
    detailing: "detailing",
    ppf: "ppf-wrap-tintado-lunas",
    wrap: "ppf-wrap-tintado-lunas",
    "tintado-de-lunas": "ppf-wrap-tintado-lunas",
    "ppf-wrap-tintado-de-lunas": "ppf-wrap-tintado-lunas",
    "ppf-wrap-y-tintado-de-lunas": "ppf-wrap-tintado-lunas",
    "chapa-y-pintura": "chapa-y-pintura",
    "mecanica-basica": "mantenimiento-ligero",
    "mantenimiento-ligero": "mantenimiento-ligero",
    llanteria: "neumaticos-y-llantas",
    "neumaticos-y-llantas": "neumaticos-y-llantas",
    parking: "parking",
    "venta-de-productos": "productos-y-accesorios-para-el-cuidado-automotriz",
    "productos-y-accesorios": "productos-y-accesorios-para-el-cuidado-automotriz",
    "productos-y-accesorios-para-el-cuidado-automotriz":
      "productos-y-accesorios-para-el-cuidado-automotriz",
    capacitaciones: "capacitaciones",
    "asistencia-en-carretera": "grua-y-auxlio-mecanico",
    "grua-y-auxilio-mecanico": "grua-y-auxlio-mecanico",
    "grua-y-auxlio-mecanico": "grua-y-auxlio-mecanico",
  };

  return aliases[normalized] || normalized;
}

function mapPublicProvider(profile: ProviderProfileRecord) {
  const vendorName = profile.catalogVendorName || profile.displayName;
  const vendorQuery = encodeURIComponent(vendorName);

  return {
    id: profile.id,
    handle: profile.handle,
    providerSlug: profile.providerSlug,
    name: profile.displayName,
    vendorName,
    address: [
      profile.addressLine1,
      profile.addressLine2,
      profile.city,
      profile.postalCode,
      profile.provinceOrRegion,
      profile.country,
    ]
      .filter(Boolean)
      .join(", "),
    latitude: Number(profile.latitude),
    longitude: Number(profile.longitude),
    serviceCategories: profile.serviceCategories.map(normalizeCategoryHandle),
    url: `/collections/vendors?q=${vendorQuery}`,
  };
}

export const loader = async ({ request }: LoaderFunctionArgs) => {
  try {
    const { admin } = await authenticate.public.appProxy(request);

    if (!admin) {
      return json(
        {
          ok: false,
          message:
            "No se pudo autenticar la app proxy. Comprueba que la app este instalada y configurada en la tienda.",
        },
        {
          status: 503,
          headers: { "Cache-Control": "no-store" },
        },
      );
    }

    const url = new URL(request.url);
    const requestedHandle = normalizeCategoryHandle(
      url.searchParams.get("service_handle") || "",
    );

    const profiles = await listApprovedProviderProfiles(admin);
    const providers = profiles
      .filter((profile) => profile.latitude && profile.longitude)
      .map(mapPublicProvider)
      .filter((profile) =>
        requestedHandle
          ? profile.serviceCategories.includes(requestedHandle)
          : profile.serviceCategories.length > 0,
      );

    return json(
      {
        ok: true,
        serviceHandle: requestedHandle,
        providers,
      },
      {
        headers: {
          "Cache-Control": "no-store",
        },
      },
    );
  } catch (error) {
    console.error("[providers-nearby][loader]", error);
    return json(
      {
        ok: false,
        message:
          error instanceof Error
            ? error.message
            : "No se pudo cargar el directorio de proveedores.",
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
