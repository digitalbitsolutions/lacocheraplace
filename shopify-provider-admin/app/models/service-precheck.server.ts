import {
  LookupStatus,
  ServicePrecheckStatus,
  VehicleFamily,
  VehicleSize,
} from "@prisma/client";
import prisma from "../db.server";
import {
  lookupByPlate,
  type LookupByPlateResult,
  type LookupVehicleSnapshot,
  type VehicleFamilyKey,
  type VehicleSizeKey,
} from "../services/vehicle-lookup.server";

type GraphqlAdmin = {
  graphql: (
    query: string,
    options?: {
      variables?: Record<string, unknown>;
    },
  ) => Promise<Response>;
};

const PLATE_ES_REGEX = /^\d{4}[BCDFGHJKLMNPRSTVWXYZ]{3}$/;
const DEFAULT_COUNTRY_CODE = "ES";
const PURCHASE_FLOW_CONSULTATIVE = "consultative";
const PURCHASE_FLOW_PRECHECK = "vehicle_precheck_checkout";

type ProductVariantCandidate = {
  id: string;
  title: string;
  priceAmount: string;
  priceCurrencyCode: string;
  selectedOptions: Array<{ name: string; value: string }>;
};

type ProductForPrecheck = {
  id: string;
  handle: string;
  title: string;
  purchaseFlow: string;
  variants: ProductVariantCandidate[];
};

type PrecheckInput = {
  shop: string;
  productId?: string;
  productHandle?: string;
  plate: string;
  countryCode?: string;
  customer: {
    name: string;
    email: string;
    phone?: string;
  };
};

type PrecheckResultOk = {
  status: "ok";
  servicePrecheckId: string;
  product: {
    id: string;
    handle: string;
    title: string;
    purchaseFlow: string;
  };
  vehicle: {
    plateRaw: string;
    plateNormalized: string;
    countryCode: string;
    make?: string;
    model?: string;
    trim?: string;
    year?: number;
    fuelType?: string;
    engine?: string;
    family: VehicleFamilyKey;
    size: VehicleSizeKey;
  };
  compatibility: {
    isCompatible: true;
    reason: string;
    variant: {
      id: string;
      title: string;
      priceAmount: string;
      priceCurrencyCode: string;
    };
  };
};

type PrecheckResultIncompatible = {
  status: "incompatible";
  servicePrecheckId: string;
  product: {
    id: string;
    handle: string;
    title: string;
    purchaseFlow: string;
  };
  vehicle: {
    plateRaw: string;
    plateNormalized: string;
    countryCode: string;
    make?: string;
    model?: string;
    trim?: string;
    year?: number;
    fuelType?: string;
    engine?: string;
    family: VehicleFamilyKey;
    size: VehicleSizeKey;
  };
  compatibility: {
    isCompatible: false;
    reason: string;
  };
};

type PrecheckResultUnverified = {
  status: "unverified";
  servicePrecheckId: string;
  product: {
    id: string;
    handle: string;
    title: string;
    purchaseFlow: string;
  };
  compatibility: {
    isCompatible: false;
    reason: string;
  };
  vehicle?: {
    plateRaw: string;
    plateNormalized: string;
    countryCode: string;
    make?: string;
    model?: string;
    trim?: string;
    year?: number;
    fuelType?: string;
    engine?: string;
    family?: VehicleFamilyKey;
    size?: VehicleSizeKey;
  };
};

export type ServicePrecheckResult =
  | PrecheckResultOk
  | PrecheckResultIncompatible
  | PrecheckResultUnverified;

export function normalizeSpanishPlate(value: string) {
  return (value || "").replace(/[\s-]+/g, "").toUpperCase();
}

export function isValidSpanishPlate(value: string) {
  return PLATE_ES_REGEX.test(value);
}

function normalizeForMatch(value: string) {
  return (value || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "");
}

function mapFamilyToEnum(value?: VehicleFamilyKey | null) {
  if (!value) return null;
  const mapped: Record<VehicleFamilyKey, VehicleFamily> = {
    moto: VehicleFamily.MOTO,
    coche: VehicleFamily.COCHE,
    suv: VehicleFamily.SUV,
    furgon: VehicleFamily.FURGON,
  };
  return mapped[value] || null;
}

function mapSizeToEnum(value?: VehicleSizeKey | null) {
  if (!value) return null;
  const mapped: Record<VehicleSizeKey, VehicleSize> = {
    S: VehicleSize.S,
    M: VehicleSize.M,
    L: VehicleSize.L,
  };
  return mapped[value] || null;
}

function enumFamilyToKey(value?: VehicleFamily | null): VehicleFamilyKey | undefined {
  if (!value) return undefined;
  const mapped: Record<VehicleFamily, VehicleFamilyKey> = {
    MOTO: "moto",
    COCHE: "coche",
    SUV: "suv",
    FURGON: "furgon",
  };
  return mapped[value];
}

function enumSizeToKey(value?: VehicleSize | null): VehicleSizeKey | undefined {
  if (!value) return undefined;
  const mapped: Record<VehicleSize, VehicleSizeKey> = {
    S: "S",
    M: "M",
    L: "L",
  };
  return mapped[value];
}

function buildCompatibilityTokens(family: VehicleFamilyKey, size: VehicleSizeKey) {
  const familyTokens: Record<VehicleFamilyKey, string[]> = {
    moto: ["moto", "motocicleta"],
    coche: ["coche", "auto", "car"],
    suv: ["suv", "todoterreno", "4x4"],
    furgon: ["furgon", "furgoneta", "van"],
  };

  return {
    familyTokens: familyTokens[family].map(normalizeForMatch),
    sizeToken: normalizeForMatch(size),
  };
}

function variantMatchesFamilyAndSize(
  variant: ProductVariantCandidate,
  family: VehicleFamilyKey,
  size: VehicleSizeKey,
) {
  const { familyTokens, sizeToken } = buildCompatibilityTokens(family, size);
  const optionValues = variant.selectedOptions.map((option) =>
    normalizeForMatch(option.value),
  );
  const optionNames = variant.selectedOptions.map((option) =>
    normalizeForMatch(option.name),
  );

  const hasFamily = familyTokens.some((token) => optionValues.includes(token));
  const hasSize = optionValues.includes(sizeToken);

  if (hasFamily && hasSize) return true;

  const titleNormalized = normalizeForMatch(variant.title);
  const titleHasFamily = familyTokens.some((token) =>
    titleNormalized.includes(token),
  );
  const titleHasSize = titleNormalized.includes(sizeToken);

  if (titleHasFamily && titleHasSize) return true;

  const namedFamily =
    optionNames.includes("familia") || optionNames.includes("family");
  const namedSize = optionNames.includes("talla") || optionNames.includes("size");

  if (namedFamily && namedSize) {
    return hasFamily && hasSize;
  }

  return false;
}

function resolveCompatibleVariant(
  variants: ProductVariantCandidate[],
  family: VehicleFamilyKey,
  size: VehicleSizeKey,
) {
  return (
    variants.find((variant) => variantMatchesFamilyAndSize(variant, family, size)) ||
    null
  );
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
    throw new Error("Shopify no devolvio datos para el precheck.");
  }

  return payload.data;
}

async function fetchProductForPrecheck(
  admin: GraphqlAdmin,
  input: { productId?: string; productHandle?: string },
) {
  if (!input.productId && !input.productHandle) {
    throw new Error("Debes enviar productId o productHandle.");
  }

  if (input.productId) {
    const byIdData = await shopifyGraphql<{
      product: {
        id: string;
        handle: string;
        title: string;
        metafield: { value: string | null } | null;
        variants: {
          nodes: Array<{
            id: string;
            title: string;
            selectedOptions: Array<{ name: string; value: string }>;
            price: { amount: string; currencyCode: string };
          }>;
        };
      } | null;
    }>(
      admin,
      `#graphql
        query PrecheckProductById($id: ID!) {
          product(id: $id) {
            id
            handle
            title
            metafield(namespace: "service", key: "purchase_flow") {
              value
            }
            variants(first: 100) {
              nodes {
                id
                title
                selectedOptions {
                  name
                  value
                }
                price {
                  amount
                  currencyCode
                }
              }
            }
          }
        }`,
      { id: input.productId },
    );
    return byIdData.product;
  }

  const byHandleData = await shopifyGraphql<{
    productByHandle: {
      id: string;
      handle: string;
      title: string;
      metafield: { value: string | null } | null;
      variants: {
        nodes: Array<{
          id: string;
          title: string;
          selectedOptions: Array<{ name: string; value: string }>;
          price: { amount: string; currencyCode: string };
        }>;
      };
    } | null;
  }>(
    admin,
    `#graphql
      query PrecheckProductByHandle($handle: String!) {
        productByHandle(handle: $handle) {
          id
          handle
          title
          metafield(namespace: "service", key: "purchase_flow") {
            value
          }
          variants(first: 100) {
            nodes {
              id
              title
              selectedOptions {
                name
                value
              }
              price {
                amount
                currencyCode
              }
            }
          }
        }
      }`,
    { handle: input.productHandle },
  );

  return byHandleData.productByHandle;
}

async function resolveProductForPrecheck(
  admin: GraphqlAdmin,
  input: { productId?: string; productHandle?: string },
): Promise<ProductForPrecheck> {
  const product = await fetchProductForPrecheck(admin, input);
  if (!product) {
    throw new Error("No encontramos el producto para ejecutar el precheck.");
  }

  return {
    id: product.id,
    handle: product.handle,
    title: product.title,
    purchaseFlow:
      product.metafield?.value?.trim() || PURCHASE_FLOW_CONSULTATIVE,
    variants: product.variants.nodes.map((variant) => ({
      id: variant.id,
      title: variant.title,
      selectedOptions: variant.selectedOptions || [],
      priceAmount: variant.price.amount,
      priceCurrencyCode: variant.price.currencyCode,
    })),
  };
}

type PersistArgs = {
  shop: string;
  input: PrecheckInput;
  product: ProductForPrecheck;
  lookupResult: LookupByPlateResult;
  plateNormalized: string;
  family: VehicleFamilyKey | null;
  size: VehicleSizeKey | null;
  serviceStatus: ServicePrecheckStatus;
  isCompatible: boolean;
  compatibilityReason: string;
  compatibleVariant: ProductVariantCandidate | null;
};

async function persistPrecheck(args: PersistArgs) {
  const emailNormalized = args.input.customer.email.trim().toLowerCase();
  const countryCode = (args.input.countryCode || DEFAULT_COUNTRY_CODE)
    .trim()
    .toUpperCase();

  return prisma.$transaction(async (tx) => {
    const existingContact = await tx.customerContact.findFirst({
      where: {
        shop: args.shop,
        email: emailNormalized,
      },
      orderBy: {
        createdAt: "asc",
      },
    });

    const contact = existingContact
      ? await tx.customerContact.update({
          where: { id: existingContact.id },
          data: {
            fullName: args.input.customer.name.trim(),
            phone: args.input.customer.phone?.trim() || null,
          },
        })
      : await tx.customerContact.create({
          data: {
            shop: args.shop,
            fullName: args.input.customer.name.trim(),
            email: emailNormalized,
            phone: args.input.customer.phone?.trim() || null,
          },
        });

    let vehicle:
      | Awaited<ReturnType<typeof tx.vehicle.upsert>>
      | null = null;
    const snapshot =
      args.lookupResult.status === "verified" ? args.lookupResult.vehicle : null;
    const familyEnum = mapFamilyToEnum(args.family);
    const sizeEnum = mapSizeToEnum(args.size);

    if (snapshot) {
      vehicle = await tx.vehicle.upsert({
        where: {
          shop_plateNormalized: {
            shop: args.shop,
            plateNormalized: args.plateNormalized,
          },
        },
        create: {
          shop: args.shop,
          customerContactId: contact.id,
          plateRaw: args.input.plate.trim(),
          plateNormalized: args.plateNormalized,
          countryCode,
          make: snapshot.make || null,
          model: snapshot.model || null,
          trim: snapshot.trim || null,
          fuelType: snapshot.fuelType || null,
          engine: snapshot.engine || null,
          year: snapshot.year || null,
          family: familyEnum,
          size: sizeEnum,
          sourceSnapshot: JSON.stringify(snapshot.raw || {}),
        },
        update: {
          customerContactId: contact.id,
          plateRaw: args.input.plate.trim(),
          countryCode,
          make: snapshot.make || null,
          model: snapshot.model || null,
          trim: snapshot.trim || null,
          fuelType: snapshot.fuelType || null,
          engine: snapshot.engine || null,
          year: snapshot.year || null,
          family: familyEnum,
          size: sizeEnum,
          sourceSnapshot: JSON.stringify(snapshot.raw || {}),
        },
      });
    }

    const lookupStatus: LookupStatus =
      args.lookupResult.status === "verified"
        ? LookupStatus.SUCCESS
        : args.lookupResult.status === "not_found"
          ? LookupStatus.NOT_FOUND
          : LookupStatus.ERROR;

    const lookupLog = await tx.vehicleLookupLog.create({
      data: {
        shop: args.shop,
        plateRaw: args.input.plate.trim(),
        plateNormalized: args.plateNormalized,
        countryCode,
        provider: args.lookupResult.provider,
        status: lookupStatus,
        requestPayload: JSON.stringify({
          plate: args.input.plate.trim(),
          plateNormalized: args.plateNormalized,
          countryCode,
        }),
        responsePayload: JSON.stringify(args.lookupResult),
        errorCode:
          args.lookupResult.status === "error"
            ? args.lookupResult.errorCode
            : null,
        errorMessage:
          args.lookupResult.status === "error"
            ? args.lookupResult.message
            : args.lookupResult.status === "not_found"
              ? args.lookupResult.reason
              : null,
        resolvedFamily: familyEnum,
        resolvedSize: sizeEnum,
        resolvedAt:
          args.lookupResult.status === "verified" ? new Date() : null,
        vehicleId: vehicle?.id || null,
      },
    });

    const precheck = await tx.servicePrecheck.create({
      data: {
        shop: args.shop,
        productGid: args.product.id,
        productHandle: args.product.handle,
        purchaseFlow: args.product.purchaseFlow,
        customerContactId: contact.id,
        vehicleId: vehicle?.id || null,
        lookupLogId: lookupLog.id,
        plateNormalized: args.plateNormalized,
        family: familyEnum,
        size: sizeEnum,
        status: args.serviceStatus,
        isCompatible: args.isCompatible,
        compatibilityReason: args.compatibilityReason,
        compatibleVariantGid: args.compatibleVariant?.id || null,
        compatibleVariantTitle: args.compatibleVariant?.title || null,
        verifiedAt:
          args.lookupResult.status === "verified" ? new Date() : null,
      },
    });

    return {
      precheck,
      vehicle,
    };
  });
}

export function validateServicePrecheckInput(payload: Partial<PrecheckInput>) {
  const errors: Record<string, string> = {};

  const plateNormalized = normalizeSpanishPlate(String(payload.plate || ""));
  if (!plateNormalized) {
    errors.plate = "La matricula es obligatoria.";
  } else if (!isValidSpanishPlate(plateNormalized)) {
    errors.plate = "La matricula no tiene un formato espanol valido (ej. 1234BCD).";
  }

  const hasProductRef =
    String(payload.productId || "").trim() || String(payload.productHandle || "").trim();
  if (!hasProductRef) {
    errors.product = "Debes enviar productId o productHandle.";
  }

  const customerName = String(payload.customer?.name || "").trim();
  const customerEmail = String(payload.customer?.email || "").trim();
  if (!customerName) {
    errors["customer.name"] = "El nombre es obligatorio.";
  }

  if (!customerEmail) {
    errors["customer.email"] = "El email es obligatorio.";
  } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(customerEmail)) {
    errors["customer.email"] = "El email no es valido.";
  }

  return {
    valid: Object.keys(errors).length === 0,
    errors,
    normalized: {
      plateNormalized,
      countryCode:
        String(payload.countryCode || DEFAULT_COUNTRY_CODE).trim().toUpperCase() ||
        DEFAULT_COUNTRY_CODE,
      productId: String(payload.productId || "").trim() || undefined,
      productHandle: String(payload.productHandle || "").trim() || undefined,
      customer: {
        name: customerName,
        email: customerEmail,
        phone: String(payload.customer?.phone || "").trim() || undefined,
      },
    },
  };
}

function extractVehicleInfo(
  plateRaw: string,
  snapshot: LookupVehicleSnapshot | undefined,
  fallback: {
    plateNormalized: string;
    countryCode: string;
    family?: VehicleFamilyKey;
    size?: VehicleSizeKey;
  },
) {
  return {
    plateRaw,
    plateNormalized: snapshot?.plateNormalized || fallback.plateNormalized,
    countryCode: snapshot?.countryCode || fallback.countryCode,
    make: snapshot?.make,
    model: snapshot?.model,
    trim: snapshot?.trim,
    year: snapshot?.year,
    fuelType: snapshot?.fuelType,
    engine: snapshot?.engine,
    family: snapshot?.family || fallback.family,
    size: snapshot?.size || fallback.size,
  };
}

export async function runServicePrecheck(
  admin: GraphqlAdmin,
  input: PrecheckInput,
): Promise<ServicePrecheckResult> {
  const product = await resolveProductForPrecheck(admin, {
    productId: input.productId,
    productHandle: input.productHandle,
  });
  const plateNormalized = normalizeSpanishPlate(input.plate);
  const countryCode = (input.countryCode || DEFAULT_COUNTRY_CODE).toUpperCase();
  const lookupResult = await lookupByPlate({
    plate: plateNormalized,
    countryCode,
  });

  let family: VehicleFamilyKey | null = null;
  let size: VehicleSizeKey | null = null;
  let serviceStatus = ServicePrecheckStatus.UNVERIFIED;
  let isCompatible = false;
  let compatibilityReason = "No se pudo verificar la compatibilidad del vehiculo.";
  let compatibleVariant: ProductVariantCandidate | null = null;

  if (lookupResult.status === "verified") {
    family = lookupResult.vehicle.family || null;
    size = lookupResult.vehicle.size || null;

    if (family && size) {
      compatibleVariant = resolveCompatibleVariant(product.variants, family, size);
      if (compatibleVariant) {
        serviceStatus = ServicePrecheckStatus.OK;
        isCompatible = true;
        compatibilityReason = "Vehiculo verificado y variante compatible encontrada.";
      } else {
        serviceStatus = ServicePrecheckStatus.INCOMPATIBLE;
        compatibilityReason =
          "Vehiculo verificado pero no existe variante compatible para familia+talla.";
      }
    } else {
      serviceStatus = ServicePrecheckStatus.UNVERIFIED;
      compatibilityReason =
        "El proveedor de lookup no devolvio familia y talla necesarias para la compatibilidad.";
    }
  } else if (lookupResult.status === "not_found") {
    serviceStatus = ServicePrecheckStatus.UNVERIFIED;
    compatibilityReason = lookupResult.reason || "No se pudo verificar la matricula.";
  } else {
    serviceStatus = ServicePrecheckStatus.UNVERIFIED;
    compatibilityReason =
      lookupResult.message || "Ocurrio un error al verificar la matricula.";
  }

  const persisted = await persistPrecheck({
    shop: input.shop,
    input,
    product,
    lookupResult,
    plateNormalized,
    family,
    size,
    serviceStatus,
    isCompatible,
    compatibilityReason,
    compatibleVariant,
  });

  const productResponse = {
    id: product.id,
    handle: product.handle,
    title: product.title,
    purchaseFlow: product.purchaseFlow || PURCHASE_FLOW_CONSULTATIVE,
  };

  const vehicleInfo = extractVehicleInfo(
    input.plate,
    lookupResult.status === "verified" ? lookupResult.vehicle : undefined,
    {
      plateNormalized,
      countryCode,
      family: enumFamilyToKey(persisted.precheck.family),
      size: enumSizeToKey(persisted.precheck.size),
    },
  );

  if (
    persisted.precheck.status === ServicePrecheckStatus.OK &&
    compatibleVariant &&
    vehicleInfo.family &&
    vehicleInfo.size
  ) {
    return {
      status: "ok",
      servicePrecheckId: persisted.precheck.id,
      product: productResponse,
      vehicle: {
        ...vehicleInfo,
        family: vehicleInfo.family,
        size: vehicleInfo.size,
      },
      compatibility: {
        isCompatible: true,
        reason: compatibilityReason,
        variant: {
          id: compatibleVariant.id,
          title: compatibleVariant.title,
          priceAmount: compatibleVariant.priceAmount,
          priceCurrencyCode: compatibleVariant.priceCurrencyCode,
        },
      },
    };
  }

  if (
    persisted.precheck.status === ServicePrecheckStatus.INCOMPATIBLE &&
    vehicleInfo.family &&
    vehicleInfo.size
  ) {
    return {
      status: "incompatible",
      servicePrecheckId: persisted.precheck.id,
      product: productResponse,
      vehicle: {
        ...vehicleInfo,
        family: vehicleInfo.family,
        size: vehicleInfo.size,
      },
      compatibility: {
        isCompatible: false,
        reason: compatibilityReason,
      },
    };
  }

  return {
    status: "unverified",
    servicePrecheckId: persisted.precheck.id,
    product: productResponse,
    vehicle: vehicleInfo,
    compatibility: {
      isCompatible: false,
      reason:
        product.purchaseFlow === PURCHASE_FLOW_PRECHECK
          ? compatibilityReason
          : `${compatibilityReason} El producto no esta opt-in en vehicle_precheck_checkout.`,
    },
  };
}
