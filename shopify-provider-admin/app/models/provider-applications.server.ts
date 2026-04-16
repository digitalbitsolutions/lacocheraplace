type GraphqlAdmin = {
  graphql: (
    query: string,
    options?: {
      variables?: Record<string, unknown>;
    },
  ) => Promise<Response>;
};

export const PROVIDER_APPLICATION_REQUEST_TYPE =
  "provider_application_request";
export const PROVIDER_PROFILE_TYPE = "provider_profile";
export const REQUEST_STATUSES = [
  "pending",
  "approved",
  "declined",
] as const;

export type RequestStatus = (typeof REQUEST_STATUSES)[number];

export interface ProviderApplicationSubmission {
  displayName: string;
  legalName: string;
  catalogVendorName: string;
  contactName: string;
  email: string;
  phone: string;
  whatsapp: string;
  addressLine1: string;
  addressLine2: string;
  city: string;
  postalCode: string;
  provinceOrRegion: string;
  country: string;
  googlePlaceId: string;
  latitude: string;
  longitude: string;
  accountHolder: string;
  taxId: string;
  iban: string;
  bankName: string;
  bankCountry: string;
  serviceCategories: string[];
  description: string;
  openingHours: string;
  websiteUrl: string;
  instagramUrl: string;
  logoSourceUrl: string;
  gallerySourceUrls: string;
  consentAccepted: boolean;
}

export interface ProviderApplicationRecord {
  id: string;
  handle: string;
  displayName: string;
  submissionId: string;
  status: RequestStatus;
  providerSlug: string;
  legalName: string;
  catalogVendorName: string;
  contactName: string;
  email: string;
  phone: string;
  whatsapp: string;
  addressLine1: string;
  addressLine2: string;
  city: string;
  postalCode: string;
  provinceOrRegion: string;
  country: string;
  googlePlaceId: string;
  latitude: string;
  longitude: string;
  accountHolder: string;
  taxId: string;
  iban: string;
  bankName: string;
  bankCountry: string;
  serviceCategories: string[];
  description: string;
  openingHours: string;
  websiteUrl: string;
  instagramUrl: string;
  logoSourceUrl: string;
  gallerySourceUrls: string;
  declineReason: string;
  submittedAt: string;
  reviewedAt: string;
  reviewedByEmail: string;
  providerProfileHandle: string;
  providerProfileId: string;
  createdAt: string;
  updatedAt: string;
}

export interface ProviderProfileRecord {
  id: string;
  handle: string;
  displayName: string;
  providerSlug: string;
  catalogVendorName: string;
  addressLine1: string;
  addressLine2: string;
  city: string;
  postalCode: string;
  provinceOrRegion: string;
  country: string;
  latitude: string;
  longitude: string;
  serviceCategories: string[];
  status: string;
}

type MetaobjectNode = {
  id: string;
  handle: string;
  displayName?: string;
  fields: Array<{
    key: string;
    value: string | null;
    type?: string;
  }>;
};

type MetaobjectFieldDefinitionInput = {
  key: string;
  name: string;
  type: string;
  required?: boolean;
};

const REQUEST_FIELD_DEFINITIONS: MetaobjectFieldDefinitionInput[] = [
  { key: "submission_id", name: "Submission ID", type: "single_line_text_field", required: true },
  { key: "status", name: "Status", type: "single_line_text_field", required: true },
  { key: "provider_slug", name: "Provider slug", type: "single_line_text_field", required: true },
  { key: "display_name", name: "Display name", type: "single_line_text_field", required: true },
  { key: "legal_name", name: "Legal name", type: "single_line_text_field", required: true },
  { key: "catalog_vendor_name", name: "Catalog vendor name", type: "single_line_text_field", required: true },
  { key: "contact_name", name: "Contact name", type: "single_line_text_field", required: true },
  { key: "email", name: "Email", type: "single_line_text_field", required: true },
  { key: "phone", name: "Phone", type: "single_line_text_field", required: true },
  { key: "whatsapp", name: "WhatsApp", type: "single_line_text_field", required: true },
  { key: "address_line_1", name: "Address line 1", type: "single_line_text_field", required: true },
  { key: "address_line_2", name: "Address line 2", type: "single_line_text_field", required: true },
  { key: "city", name: "City", type: "single_line_text_field", required: true },
  { key: "postal_code", name: "Postal code", type: "single_line_text_field", required: true },
  { key: "province_or_region", name: "Province or region", type: "single_line_text_field", required: true },
  { key: "country", name: "Country", type: "single_line_text_field", required: true },
  { key: "google_place_id", name: "Google Place ID", type: "single_line_text_field" },
  { key: "latitude", name: "Latitude", type: "number_decimal" },
  { key: "longitude", name: "Longitude", type: "number_decimal" },
  { key: "account_holder", name: "Account holder", type: "single_line_text_field", required: true },
  { key: "tax_id", name: "Tax ID", type: "single_line_text_field", required: true },
  { key: "iban", name: "IBAN", type: "single_line_text_field", required: true },
  { key: "bank_name", name: "Bank name", type: "single_line_text_field", required: true },
  { key: "bank_country", name: "Bank country", type: "single_line_text_field", required: true },
  { key: "service_categories", name: "Service categories", type: "list.single_line_text_field", required: true },
  { key: "description", name: "Description", type: "multi_line_text_field", required: true },
  { key: "opening_hours", name: "Opening hours", type: "multi_line_text_field", required: true },
  { key: "website_url", name: "Website URL", type: "url" },
  { key: "instagram_url", name: "Instagram URL", type: "url" },
  { key: "logo_source_url", name: "Logo source URL", type: "url" },
  { key: "gallery_source_urls", name: "Gallery source URLs", type: "multi_line_text_field" },
  { key: "decline_reason", name: "Decline reason", type: "multi_line_text_field" },
  { key: "submitted_at", name: "Submitted at", type: "date_time", required: true },
  { key: "reviewed_at", name: "Reviewed at", type: "date_time" },
  { key: "reviewed_by_email", name: "Reviewed by email", type: "single_line_text_field" },
  { key: "provider_profile_handle", name: "Provider profile handle", type: "single_line_text_field" },
  { key: "provider_profile_id", name: "Provider profile ID", type: "single_line_text_field" },
];

const PROVIDER_PROFILE_FIELD_DEFINITIONS: MetaobjectFieldDefinitionInput[] = [
  { key: "provider_slug", name: "Provider slug", type: "single_line_text_field", required: true },
  { key: "display_name", name: "Display name", type: "single_line_text_field", required: true },
  { key: "legal_name", name: "Legal name", type: "single_line_text_field" },
  { key: "catalog_vendor_name", name: "Catalog vendor name", type: "single_line_text_field" },
  { key: "contact_name", name: "Contact name", type: "single_line_text_field", required: true },
  { key: "email", name: "Email", type: "single_line_text_field", required: true },
  { key: "phone", name: "Phone", type: "single_line_text_field" },
  { key: "whatsapp", name: "WhatsApp", type: "single_line_text_field" },
  { key: "address_line_1", name: "Address line 1", type: "single_line_text_field", required: true },
  { key: "address_line_2", name: "Address line 2", type: "single_line_text_field" },
  { key: "city", name: "City", type: "single_line_text_field", required: true },
  { key: "postal_code", name: "Postal code", type: "single_line_text_field", required: true },
  { key: "province_or_region", name: "Province or region", type: "single_line_text_field" },
  { key: "country", name: "Country", type: "single_line_text_field", required: true },
  { key: "latitude", name: "Latitude", type: "number_decimal" },
  { key: "longitude", name: "Longitude", type: "number_decimal" },
  { key: "google_place_id", name: "Google Place ID", type: "single_line_text_field" },
  { key: "service_categories", name: "Service categories", type: "list.single_line_text_field" },
  { key: "description", name: "Description", type: "multi_line_text_field" },
  { key: "opening_hours", name: "Opening hours", type: "multi_line_text_field" },
  { key: "logo_source_url", name: "Logo source URL", type: "url" },
  { key: "gallery_source_urls", name: "Gallery source URLs", type: "multi_line_text_field" },
  { key: "website_url", name: "Website URL", type: "url" },
  { key: "instagram_url", name: "Instagram URL", type: "url" },
  { key: "status", name: "Status", type: "single_line_text_field", required: true },
  { key: "source_submission_id", name: "Source submission ID", type: "single_line_text_field", required: true },
];

function slugify(value: string) {
  return (value || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

function buildSubmissionId() {
  const stamp = new Date().toISOString().replace(/[-:.TZ]/g, "").slice(0, 14);
  const random = Math.random().toString(36).slice(2, 8);
  return `provider-${stamp}-${random}`;
}

function normalizeTaxId(value: string) {
  return (value || "").replace(/\s+/g, "").toUpperCase();
}

function normalizeIban(value: string) {
  return (value || "").replace(/\s+/g, "").toUpperCase();
}

function isValidHttpUrl(value: string) {
  try {
    const url = new URL(value);
    return url.protocol === "http:" || url.protocol === "https:";
  } catch {
    return false;
  }
}

function isValidIban(value: string) {
  const iban = normalizeIban(value);
  if (!/^[A-Z]{2}\d{2}[A-Z0-9]{11,30}$/.test(iban)) {
    return false;
  }

  const rearranged = `${iban.slice(4)}${iban.slice(0, 4)}`;
  let remainder = 0;

  for (const char of rearranged) {
    const fragment = /[A-Z]/.test(char)
      ? String(char.charCodeAt(0) - 55)
      : char;
    for (const digit of fragment) {
      remainder = (remainder * 10 + Number(digit)) % 97;
    }
  }

  return remainder === 1;
}

function isValidSpanishTaxId(value: string) {
  const taxId = normalizeTaxId(value);
  if (!taxId) return false;

  const dniMatch = taxId.match(/^(\d{8})([A-Z])$/);
  if (dniMatch) {
    const letters = "TRWAGMYFPDXBNJZSQVHLCKE";
    return letters[Number(dniMatch[1]) % 23] === dniMatch[2];
  }

  const nieMatch = taxId.match(/^([XYZ])(\d{7})([A-Z])$/);
  if (nieMatch) {
    const prefixMap: Record<string, string> = { X: "0", Y: "1", Z: "2" };
    const number = `${prefixMap[nieMatch[1]]}${nieMatch[2]}`;
    const letters = "TRWAGMYFPDXBNJZSQVHLCKE";
    return letters[Number(number) % 23] === nieMatch[3];
  }

  const cifMatch = taxId.match(/^([ABCDEFGHJNPQRSUVW])(\d{7})([0-9A-J])$/);
  if (!cifMatch) return false;

  const letter = cifMatch[1];
  const digits = cifMatch[2];
  const control = cifMatch[3];
  let sumEven = 0;
  let sumOdd = 0;

  digits.split("").forEach((digit, index) => {
    const number = Number(digit);
    if (index % 2 === 0) {
      const doubled = number * 2;
      sumOdd += Math.floor(doubled / 10) + (doubled % 10);
    } else {
      sumEven += number;
    }
  });

  const total = sumEven + sumOdd;
  const controlDigit = (10 - (total % 10)) % 10;
  const controlLetter = "JABCDEFGHI"[controlDigit];

  if ("PQRSNW".includes(letter)) return control === controlLetter;
  if ("ABEH".includes(letter)) return control === String(controlDigit);
  return control === String(controlDigit) || control === controlLetter;
}

function parseListValue(value: string | null | undefined) {
  if (!value) return [];

  try {
    const parsed = JSON.parse(value);
    if (Array.isArray(parsed)) {
      return parsed
        .map((item) => String(item).trim())
        .filter(Boolean);
    }
  } catch {
    return value
      .split("\n")
      .map((item) => item.trim())
      .filter(Boolean);
  }

  return [];
}

function fieldMapFromNode(node: MetaobjectNode) {
  return new Map(
    (node.fields || []).map((field) => [field.key, field.value ?? ""]),
  );
}

function fieldValue(
  fieldMap: Map<string, string>,
  key: string,
  fallback = "",
) {
  return fieldMap.get(key) ?? fallback;
}

function parseProviderProfileNode(node: MetaobjectNode): ProviderProfileRecord {
  const fields = fieldMapFromNode(node);

  return {
    id: node.id,
    handle: node.handle,
    displayName: fieldValue(fields, "display_name", node.displayName || ""),
    providerSlug: fieldValue(fields, "provider_slug", node.handle),
    catalogVendorName: fieldValue(fields, "catalog_vendor_name"),
    addressLine1: fieldValue(fields, "address_line_1"),
    addressLine2: fieldValue(fields, "address_line_2"),
    city: fieldValue(fields, "city"),
    postalCode: fieldValue(fields, "postal_code"),
    provinceOrRegion: fieldValue(fields, "province_or_region"),
    country: fieldValue(fields, "country"),
    latitude: fieldValue(fields, "latitude"),
    longitude: fieldValue(fields, "longitude"),
    serviceCategories: parseListValue(fieldValue(fields, "service_categories")),
    status: fieldValue(fields, "status"),
  };
}

function parseApplicationNode(node: MetaobjectNode): ProviderApplicationRecord {
  const fields = fieldMapFromNode(node);

  return {
    id: node.id,
    handle: node.handle,
    displayName: fieldValue(fields, "display_name", node.displayName || ""),
    submissionId: fieldValue(fields, "submission_id", node.handle),
    status: (fieldValue(fields, "status", "pending") as RequestStatus) || "pending",
    providerSlug: fieldValue(fields, "provider_slug"),
    legalName: fieldValue(fields, "legal_name"),
    catalogVendorName: fieldValue(fields, "catalog_vendor_name"),
    contactName: fieldValue(fields, "contact_name"),
    email: fieldValue(fields, "email"),
    phone: fieldValue(fields, "phone"),
    whatsapp: fieldValue(fields, "whatsapp"),
    addressLine1: fieldValue(fields, "address_line_1"),
    addressLine2: fieldValue(fields, "address_line_2"),
    city: fieldValue(fields, "city"),
    postalCode: fieldValue(fields, "postal_code"),
    provinceOrRegion: fieldValue(fields, "province_or_region"),
    country: fieldValue(fields, "country"),
    googlePlaceId: fieldValue(fields, "google_place_id"),
    latitude: fieldValue(fields, "latitude"),
    longitude: fieldValue(fields, "longitude"),
    accountHolder: fieldValue(fields, "account_holder"),
    taxId: fieldValue(fields, "tax_id"),
    iban: fieldValue(fields, "iban"),
    bankName: fieldValue(fields, "bank_name"),
    bankCountry: fieldValue(fields, "bank_country"),
    serviceCategories: parseListValue(fieldValue(fields, "service_categories")),
    description: fieldValue(fields, "description"),
    openingHours: fieldValue(fields, "opening_hours"),
    websiteUrl: fieldValue(fields, "website_url"),
    instagramUrl: fieldValue(fields, "instagram_url"),
    logoSourceUrl: fieldValue(fields, "logo_source_url"),
    gallerySourceUrls: fieldValue(fields, "gallery_source_urls"),
    declineReason: fieldValue(fields, "decline_reason"),
    submittedAt: fieldValue(fields, "submitted_at"),
    reviewedAt: fieldValue(fields, "reviewed_at"),
    reviewedByEmail: fieldValue(fields, "reviewed_by_email"),
    providerProfileHandle: fieldValue(fields, "provider_profile_handle"),
    providerProfileId: fieldValue(fields, "provider_profile_id"),
    createdAt: "",
    updatedAt: "",
  };
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

function assertUserErrors(
  userErrors: Array<{ message: string }> | undefined,
  fallbackMessage: string,
) {
  if (!userErrors?.length) return;
  throw new Error(
    userErrors.map((error) => error.message).join(", ") || fallbackMessage,
  );
}

async function ensureDefinition(
  admin: GraphqlAdmin,
  type: string,
  name: string,
  fieldDefinitions: MetaobjectFieldDefinitionInput[],
) {
  const existingData = await shopifyGraphql<{
    metaobjectDefinitions: {
      nodes: Array<{ id: string; type: string }>;
    };
  }>(
    admin,
    `#graphql
      query ProviderMetaobjectDefinitions {
        metaobjectDefinitions(first: 100) {
          nodes {
            id
            type
          }
        }
      }`,
  );

  const existing = existingData.metaobjectDefinitions.nodes.find(
    (definition) => definition.type === type,
  );
  if (existing) return existing.id;

  const createData = await shopifyGraphql<{
    metaobjectDefinitionCreate: {
      metaobjectDefinition: { id: string; type: string } | null;
      userErrors: Array<{ message: string }>;
    };
  }>(
    admin,
    `#graphql
      mutation CreateProviderMetaobjectDefinition($definition: MetaobjectDefinitionCreateInput!) {
        metaobjectDefinitionCreate(definition: $definition) {
          metaobjectDefinition {
            id
            type
          }
          userErrors {
            message
          }
        }
      }`,
    {
      definition: {
        name,
        type,
        displayNameKey: "display_name",
        fieldDefinitions,
      },
    },
  );

  assertUserErrors(
    createData.metaobjectDefinitionCreate.userErrors,
    `No se pudo crear la definicion ${type}.`,
  );

  return createData.metaobjectDefinitionCreate.metaobjectDefinition?.id;
}

export async function ensureProviderApplicationRequestDefinition(
  admin: GraphqlAdmin,
) {
  return ensureDefinition(
    admin,
    PROVIDER_APPLICATION_REQUEST_TYPE,
    "Provider Application Request",
    REQUEST_FIELD_DEFINITIONS,
  );
}

export async function ensureProviderProfileDefinition(admin: GraphqlAdmin) {
  return ensureDefinition(
    admin,
    PROVIDER_PROFILE_TYPE,
    "Provider Profile",
    PROVIDER_PROFILE_FIELD_DEFINITIONS,
  );
}

export function validateProviderApplicationSubmission(
  payload: Partial<ProviderApplicationSubmission>,
) {
  const errors: Record<string, string> = {};

  const requiredFields: Array<[keyof ProviderApplicationSubmission, string]> = [
    ["displayName", "Nombre comercial"],
    ["legalName", "Nombre legal o razon social"],
    ["catalogVendorName", "Nombre en catalogo"],
    ["contactName", "Persona de contacto"],
    ["email", "Correo electronico"],
    ["phone", "Telefono"],
    ["whatsapp", "WhatsApp"],
    ["addressLine1", "Direccion principal"],
    ["addressLine2", "Informacion adicional"],
    ["city", "Ciudad"],
    ["postalCode", "Codigo postal"],
    ["provinceOrRegion", "Provincia o region"],
    ["country", "Pais"],
    ["accountHolder", "Titular de la cuenta"],
    ["taxId", "NIF/CIF"],
    ["iban", "IBAN"],
    ["bankName", "Banco"],
    ["bankCountry", "Pais de la cuenta"],
    ["description", "Descripcion"],
    ["openingHours", "Horarios"],
  ];

  requiredFields.forEach(([key, label]) => {
    if (!String(payload[key] || "").trim()) {
      errors[String(key)] = `${label} es obligatorio.`;
    }
  });

  const email = String(payload.email || "").trim();
  if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    errors.email = "Introduce un correo electronico valido.";
  }

  const taxId = String(payload.taxId || "").trim();
  if (taxId && !isValidSpanishTaxId(taxId)) {
    errors.taxId = "Introduce un NIF o CIF valido.";
  }

  const iban = String(payload.iban || "").trim();
  if (iban && !isValidIban(iban)) {
    errors.iban = "Introduce un IBAN valido.";
  }

  const optionalUrls: Array<[keyof ProviderApplicationSubmission, string]> = [
    ["websiteUrl", "Sitio web"],
    ["instagramUrl", "Instagram"],
    ["logoSourceUrl", "URL del logo"],
  ];

  optionalUrls.forEach(([key, label]) => {
    const value = String(payload[key] || "").trim();
    if (value && !isValidHttpUrl(value)) {
      errors[String(key)] = `${label} debe ser una URL valida completa.`;
    }
  });

  const galleryValue = String(payload.gallerySourceUrls || "").trim();
  if (galleryValue) {
    const invalidLine = galleryValue
      .split("\n")
      .map((line) => line.trim())
      .find((line) => line && !isValidHttpUrl(line));

    if (invalidLine) {
      errors.gallerySourceUrls =
        "Cada URL de galeria debe ser valida y empezar por http:// o https://.";
    }
  }

  const categories = Array.isArray(payload.serviceCategories)
    ? payload.serviceCategories.map((item) => String(item).trim()).filter(Boolean)
    : [];

  if (!categories.length) {
    errors.serviceCategories =
      "Debes seleccionar al menos una categoria de servicio.";
  }

  if (!payload.consentAccepted) {
    errors.consentAccepted =
      "Debes aceptar la revision manual antes de enviar la solicitud.";
  }

  return {
    valid: Object.keys(errors).length === 0,
    errors,
  };
}

function mapRequestFields(payload: {
  submissionId: string;
  status: RequestStatus;
  providerSlug: string;
  displayName: string;
  legalName: string;
  catalogVendorName: string;
  contactName: string;
  email: string;
  phone: string;
  whatsapp: string;
  addressLine1: string;
  addressLine2: string;
  city: string;
  postalCode: string;
  provinceOrRegion: string;
  country: string;
  googlePlaceId: string;
  latitude: string;
  longitude: string;
  accountHolder: string;
  taxId: string;
  iban: string;
  bankName: string;
  bankCountry: string;
  serviceCategories: string[];
  description: string;
  openingHours: string;
  websiteUrl: string;
  instagramUrl: string;
  logoSourceUrl: string;
  gallerySourceUrls: string;
  declineReason: string;
  submittedAt: string;
  reviewedAt: string;
  reviewedByEmail: string;
  providerProfileHandle: string;
  providerProfileId: string;
}) {
  const mappings: Array<[string, string]> = [
    ["submission_id", payload.submissionId],
    ["status", payload.status],
    ["provider_slug", payload.providerSlug],
    ["display_name", payload.displayName],
    ["legal_name", payload.legalName],
    ["catalog_vendor_name", payload.catalogVendorName],
    ["contact_name", payload.contactName],
    ["email", payload.email],
    ["phone", payload.phone],
    ["whatsapp", payload.whatsapp],
    ["address_line_1", payload.addressLine1],
    ["address_line_2", payload.addressLine2],
    ["city", payload.city],
    ["postal_code", payload.postalCode],
    ["province_or_region", payload.provinceOrRegion],
    ["country", payload.country],
    ["google_place_id", payload.googlePlaceId],
    ["latitude", payload.latitude],
    ["longitude", payload.longitude],
    ["account_holder", payload.accountHolder],
    ["tax_id", payload.taxId],
    ["iban", payload.iban],
    ["bank_name", payload.bankName],
    ["bank_country", payload.bankCountry],
    ["description", payload.description],
    ["opening_hours", payload.openingHours],
    ["website_url", payload.websiteUrl],
    ["instagram_url", payload.instagramUrl],
    ["logo_source_url", payload.logoSourceUrl],
    ["gallery_source_urls", payload.gallerySourceUrls],
    ["decline_reason", payload.declineReason],
    ["submitted_at", payload.submittedAt],
    ["reviewed_at", payload.reviewedAt],
    ["reviewed_by_email", payload.reviewedByEmail],
    ["provider_profile_handle", payload.providerProfileHandle],
    ["provider_profile_id", payload.providerProfileId],
  ];

  const fields = mappings
    .filter(([, value]) => value !== "")
    .map(([key, value]) => ({ key, value }));

  if (payload.serviceCategories.length) {
    fields.push({
      key: "service_categories",
      value: JSON.stringify(payload.serviceCategories),
    });
  }

  return fields;
}

export async function createProviderApplicationRequest(
  admin: GraphqlAdmin,
  payload: ProviderApplicationSubmission,
) {
  await ensureProviderApplicationRequestDefinition(admin);

  const baseSlug = slugify(payload.displayName || payload.legalName);
  if (!baseSlug) {
    throw new Error(
      "No pudimos generar el identificador del proveedor a partir del nombre.",
    );
  }

  const submissionId = buildSubmissionId();
  const providerSlug = `${baseSlug}-${submissionId.slice(-6)}`;
  const requestPayload = {
    submissionId,
    status: "pending" as RequestStatus,
    providerSlug,
    displayName: payload.displayName.trim(),
    legalName: payload.legalName.trim(),
    catalogVendorName: payload.catalogVendorName.trim(),
    contactName: payload.contactName.trim(),
    email: payload.email.trim(),
    phone: payload.phone.trim(),
    whatsapp: payload.whatsapp.trim(),
    addressLine1: payload.addressLine1.trim(),
    addressLine2: payload.addressLine2.trim(),
    city: payload.city.trim(),
    postalCode: payload.postalCode.trim(),
    provinceOrRegion: payload.provinceOrRegion.trim(),
    country: payload.country.trim(),
    googlePlaceId: payload.googlePlaceId.trim(),
    latitude: String(payload.latitude || "").trim(),
    longitude: String(payload.longitude || "").trim(),
    accountHolder: payload.accountHolder.trim(),
    taxId: normalizeTaxId(payload.taxId),
    iban: normalizeIban(payload.iban),
    bankName: payload.bankName.trim(),
    bankCountry: payload.bankCountry.trim(),
    serviceCategories: payload.serviceCategories,
    description: payload.description.trim(),
    openingHours: payload.openingHours.trim(),
    websiteUrl: payload.websiteUrl.trim(),
    instagramUrl: payload.instagramUrl.trim(),
    logoSourceUrl: payload.logoSourceUrl.trim(),
    gallerySourceUrls: payload.gallerySourceUrls.trim(),
    declineReason: "",
    submittedAt: new Date().toISOString(),
    reviewedAt: "",
    reviewedByEmail: "",
    providerProfileHandle: "",
    providerProfileId: "",
  };

  const data = await shopifyGraphql<{
    metaobjectCreate: {
      metaobject: MetaobjectNode | null;
      userErrors: Array<{ message: string }>;
    };
  }>(
    admin,
    `#graphql
      mutation CreateProviderApplicationRequest($metaobject: MetaobjectCreateInput!) {
        metaobjectCreate(metaobject: $metaobject) {
          metaobject {
            id
            handle
            displayName
            fields {
              key
              value
              type
            }
          }
          userErrors {
            message
          }
        }
      }`,
    {
      metaobject: {
        type: PROVIDER_APPLICATION_REQUEST_TYPE,
        handle: submissionId,
        fields: mapRequestFields(requestPayload),
      },
    },
  );

  assertUserErrors(
    data.metaobjectCreate.userErrors,
    "No se pudo crear la solicitud pendiente.",
  );

  if (!data.metaobjectCreate.metaobject) {
    throw new Error("Shopify no devolvio la solicitud creada.");
  }

  return parseApplicationNode(data.metaobjectCreate.metaobject);
}

export async function listProviderApplicationRequests(admin: GraphqlAdmin) {
  await ensureProviderApplicationRequestDefinition(admin);

  const data = await shopifyGraphql<{
    metaobjects: {
      nodes: MetaobjectNode[];
    };
  }>(
    admin,
    `#graphql
      query ListProviderApplicationRequests($type: String!) {
        metaobjects(type: $type, first: 100) {
          nodes {
            id
            handle
            displayName
            fields {
              key
              value
              type
            }
          }
        }
      }`,
    { type: PROVIDER_APPLICATION_REQUEST_TYPE },
  );

  return data.metaobjects.nodes
    .map(parseApplicationNode)
    .sort((left, right) => {
      const leftDate = new Date(left.reviewedAt || left.submittedAt).getTime();
      const rightDate = new Date(right.reviewedAt || right.submittedAt).getTime();
      return rightDate - leftDate;
    });
}

export async function listApprovedProviderProfiles(admin: GraphqlAdmin) {
  await ensureProviderProfileDefinition(admin);

  const data = await shopifyGraphql<{
    metaobjects: {
      nodes: MetaobjectNode[];
    };
  }>(
    admin,
    `#graphql
      query ListProviderProfiles($type: String!) {
        metaobjects(type: $type, first: 100) {
          nodes {
            id
            handle
            displayName
            fields {
              key
              value
              type
            }
          }
        }
      }`,
    { type: PROVIDER_PROFILE_TYPE },
  );

  return data.metaobjects.nodes
    .map(parseProviderProfileNode)
    .filter((profile) => profile.status === "approved");
}

export async function getProviderApplicationRequest(
  admin: GraphqlAdmin,
  id: string,
) {
  await ensureProviderApplicationRequestDefinition(admin);

  const data = await shopifyGraphql<{
    metaobject: MetaobjectNode | null;
  }>(
    admin,
    `#graphql
      query ProviderApplicationRequestById($id: ID!) {
        metaobject(id: $id) {
          id
          handle
          displayName
          fields {
            key
            value
            type
          }
        }
      }`,
    { id },
  );

  return data.metaobject ? parseApplicationNode(data.metaobject) : null;
}

async function updateProviderApplicationRequestStatus(
  admin: GraphqlAdmin,
  id: string,
  payload: {
    status: RequestStatus;
    reviewedAt: string;
    reviewedByEmail: string;
    declineReason: string;
    providerProfileHandle: string;
    providerProfileId: string;
  },
) {
  const data = await shopifyGraphql<{
    metaobjectUpdate: {
      metaobject: { id: string } | null;
      userErrors: Array<{ message: string }>;
    };
  }>(
    admin,
    `#graphql
      mutation UpdateProviderApplicationRequest($id: ID!, $metaobject: MetaobjectUpdateInput!) {
        metaobjectUpdate(id: $id, metaobject: $metaobject) {
          metaobject {
            id
          }
          userErrors {
            message
          }
        }
      }`,
    {
      id,
      metaobject: {
        fields: [
          { key: "status", value: payload.status },
          { key: "reviewed_at", value: payload.reviewedAt },
          { key: "reviewed_by_email", value: payload.reviewedByEmail },
          { key: "decline_reason", value: payload.declineReason },
          { key: "provider_profile_handle", value: payload.providerProfileHandle },
          { key: "provider_profile_id", value: payload.providerProfileId },
        ],
      },
    },
  );

  assertUserErrors(
    data.metaobjectUpdate.userErrors,
    "No se pudo actualizar el estado de la solicitud.",
  );
}

async function findProviderProfileByHandle(admin: GraphqlAdmin, handle: string) {
  const data = await shopifyGraphql<{
    metaobjectByHandle: { id: string; handle: string } | null;
  }>(
    admin,
    `#graphql
      query ProviderProfileByHandle($handle: MetaobjectHandleInput!) {
        metaobjectByHandle(handle: $handle) {
          id
          handle
        }
      }`,
    {
      handle: {
        type: PROVIDER_PROFILE_TYPE,
        handle,
      },
    },
  );

  return data.metaobjectByHandle;
}

function buildApprovedProfileFields(application: ProviderApplicationRecord) {
  const fields: Array<{ key: string; value: string }> = [
    { key: "provider_slug", value: application.providerSlug },
    { key: "display_name", value: application.displayName },
    { key: "legal_name", value: application.legalName },
    {
      key: "catalog_vendor_name",
      value: application.catalogVendorName || application.displayName,
    },
    { key: "contact_name", value: application.contactName },
    { key: "email", value: application.email },
    { key: "phone", value: application.phone },
    { key: "whatsapp", value: application.whatsapp },
    { key: "address_line_1", value: application.addressLine1 },
    { key: "address_line_2", value: application.addressLine2 },
    { key: "city", value: application.city },
    { key: "postal_code", value: application.postalCode },
    { key: "province_or_region", value: application.provinceOrRegion },
    { key: "country", value: application.country },
    { key: "latitude", value: application.latitude },
    { key: "longitude", value: application.longitude },
    { key: "google_place_id", value: application.googlePlaceId },
    { key: "description", value: application.description },
    { key: "opening_hours", value: application.openingHours },
    { key: "logo_source_url", value: application.logoSourceUrl },
    { key: "gallery_source_urls", value: application.gallerySourceUrls },
    { key: "website_url", value: application.websiteUrl },
    { key: "instagram_url", value: application.instagramUrl },
    { key: "status", value: "approved" },
    { key: "source_submission_id", value: application.submissionId },
  ].filter((field) => field.value !== "");

  if (application.serviceCategories.length) {
    fields.push({
      key: "service_categories",
      value: JSON.stringify(application.serviceCategories),
    });
  }

  return fields;
}

export async function approveProviderApplicationRequest(
  admin: GraphqlAdmin,
  application: ProviderApplicationRecord,
  reviewedByEmail: string,
) {
  if (application.status !== "pending") {
    throw new Error("Solo se pueden aprobar solicitudes en estado pendiente.");
  }

  await ensureProviderProfileDefinition(admin);
  const existingProfile = await findProviderProfileByHandle(
    admin,
    application.providerSlug,
  );

  if (existingProfile) {
    throw new Error(
      "Ya existe un provider_profile con este handle. Evitamos una doble aprobacion.",
    );
  }

  const createData = await shopifyGraphql<{
    metaobjectCreate: {
      metaobject: { id: string; handle: string } | null;
      userErrors: Array<{ message: string }>;
    };
  }>(
    admin,
    `#graphql
      mutation CreateApprovedProviderProfile($metaobject: MetaobjectCreateInput!) {
        metaobjectCreate(metaobject: $metaobject) {
          metaobject {
            id
            handle
          }
          userErrors {
            message
          }
        }
      }`,
    {
      metaobject: {
        type: PROVIDER_PROFILE_TYPE,
        handle: application.providerSlug,
        fields: buildApprovedProfileFields(application),
      },
    },
  );

  assertUserErrors(
    createData.metaobjectCreate.userErrors,
    "No se pudo crear el provider_profile aprobado.",
  );

  const profile = createData.metaobjectCreate.metaobject;
  if (!profile) {
    throw new Error("Shopify no devolvio el provider_profile aprobado.");
  }

  await updateProviderApplicationRequestStatus(admin, application.id, {
    status: "approved",
    reviewedAt: new Date().toISOString(),
    reviewedByEmail,
    declineReason: "",
    providerProfileHandle: profile.handle,
    providerProfileId: profile.id,
  });

  return profile;
}

export async function declineProviderApplicationRequest(
  admin: GraphqlAdmin,
  applicationId: string,
  declineReason: string,
  reviewedByEmail: string,
) {
  const trimmedReason = declineReason.trim();
  if (!trimmedReason) {
    throw new Error("Debes informar un motivo de rechazo.");
  }

  await updateProviderApplicationRequestStatus(admin, applicationId, {
    status: "declined",
    reviewedAt: new Date().toISOString(),
    reviewedByEmail,
    declineReason: trimmedReason,
    providerProfileHandle: "",
    providerProfileId: "",
  });
}
