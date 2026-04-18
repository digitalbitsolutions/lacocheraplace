#!/usr/bin/env node

const PROVIDER_APPLICATION_REQUEST_TYPE = "provider_application_request";
const PROVIDER_PROFILE_TYPE = "provider_profile";
const DEFAULT_API_VERSION = process.env.SHOPIFY_API_VERSION || "2025-01";
const REVIEWED_BY_EMAIL =
  process.env.PROVIDER_SEED_REVIEWED_BY_EMAIL || "owner-seed@lacocheraplace.com";

const REQUEST_FIELD_DEFINITIONS = [
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

const PROFILE_FIELD_DEFINITIONS = [
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

const CATEGORY_SEEDS = [
  { heroHandle: "lavado", applicationCategory: "Lavado", prefix: "Lavado Express", lat: 41.3851, lon: 2.1734 },
  { heroHandle: "detailing", applicationCategory: "Detailing", prefix: "Detailing Studio", lat: 41.3888, lon: 2.1652 },
  { heroHandle: "neumaticos-y-llantas", applicationCategory: "Llanteria", prefix: "Llantas Center", lat: 41.3920, lon: 2.1586 },
  { heroHandle: "ppf-wrap-tintado-lunas", applicationCategory: "PPF", prefix: "PPF Shield", lat: 41.3960, lon: 2.1680 },
  { heroHandle: "chapa-y-pintura", applicationCategory: "Chapa y pintura", prefix: "Carroceria Pro", lat: 41.3798, lon: 2.1555 },
  { heroHandle: "mantenimiento-ligero", applicationCategory: "Mecanica basica", prefix: "Mecanica Ligera", lat: 41.4015, lon: 2.1778 },
  { heroHandle: "grua-y-auxlio-mecanico", applicationCategory: "Asistencia en carretera", prefix: "Auxilio Movil", lat: 41.3745, lon: 2.1489 },
  { heroHandle: "parking", applicationCategory: "Parking", prefix: "Parking Seguro", lat: 41.3823, lon: 2.1861 },
  { heroHandle: "productos-y-accesorios-para-el-cuidado-automotriz", applicationCategory: "Venta de productos", prefix: "Auto Accesorios", lat: 41.4072, lon: 2.1614 },
];

function parseArgs(argv) {
  const args = {
    count: null,
    perCategory: 6,
    dryRun: false,
    tag: null,
  };

  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === "--dry-run") {
      args.dryRun = true;
    } else if (arg === "--count") {
      args.count = Number(argv[i + 1]);
      i += 1;
    } else if (arg === "--per-category") {
      args.perCategory = Number(argv[i + 1]);
      i += 1;
    } else if (arg === "--tag") {
      args.tag = String(argv[i + 1] || "").trim();
      i += 1;
    } else if (arg === "--help" || arg === "-h") {
      printHelp();
      process.exit(0);
    } else {
      throw new Error(`Argumento no reconocido: ${arg}`);
    }
  }

  if (args.count != null && (!Number.isFinite(args.count) || args.count < 1)) {
    throw new Error("--count debe ser un numero positivo.");
  }

  if (!Number.isFinite(args.perCategory) || args.perCategory < 1) {
    throw new Error("--per-category debe ser un numero positivo.");
  }

  return args;
}

function printHelp() {
  console.log(`
Uso:
  node scripts/seed_provider_requests_and_profiles.cjs [--dry-run] [--per-category 6] [--count 54] [--tag prueba-abril]

Variables requeridas:
  SHOPIFY_STORE
  SHOPIFY_ADMIN_TOKEN

Variables opcionales:
  SHOPIFY_API_VERSION
  PROVIDER_SEED_REVIEWED_BY_EMAIL
`);
}

function slugify(value) {
  return String(value || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

function nowStamp() {
  return new Date().toISOString().replace(/[-:.TZ]/g, "").slice(0, 14);
}

function buildSubmissionId(globalIndex, tag) {
  const suffix = String(globalIndex).padStart(4, "0");
  return `provider-${tag}-${suffix}`;
}

function buildTaxId(index) {
  const base = String(12000000 + index).padStart(8, "0");
  const letters = "TRWAGMYFPDXBNJZSQVHLCKE";
  return `${base}${letters[Number(base) % 23]}`;
}

function buildIban(index) {
  const tail = String(10000000000000000000n + BigInt(index)).slice(-20);
  return `ES91${tail}`;
}

function mapFields(entries) {
  return entries
    .filter(([, value]) => value !== "" && value != null)
    .map(([key, value]) => ({ key, value: String(value) }));
}

async function shopifyGraphql(query, variables) {
  const store = process.env.SHOPIFY_STORE;
  const token = process.env.SHOPIFY_ADMIN_TOKEN;

  if (!store || !token) {
    throw new Error("Define SHOPIFY_STORE y SHOPIFY_ADMIN_TOKEN antes de ejecutar el seed.");
  }

  const endpoint = `https://${store}/admin/api/${DEFAULT_API_VERSION}/graphql.json`;
  const response = await fetch(endpoint, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Shopify-Access-Token": token,
    },
    body: JSON.stringify({ query, variables }),
  });

  const payload = await response.json();
  if (!response.ok) {
    throw new Error(`Shopify GraphQL devolvio HTTP ${response.status}: ${JSON.stringify(payload)}`);
  }
  if (payload.errors?.length) {
    throw new Error(payload.errors.map((error) => error.message).join(", "));
  }

  return payload.data;
}

async function ensureDefinition(type, name, fieldDefinitions) {
  const existing = await shopifyGraphql(
    `#graphql
      query ProviderSeedDefinitions {
        metaobjectDefinitions(first: 100) {
          nodes {
            id
            type
          }
        }
      }`,
    {},
  );

  const current = existing.metaobjectDefinitions.nodes.find((node) => node.type === type);
  if (current) return current.id;

  const created = await shopifyGraphql(
    `#graphql
      mutation ProviderSeedCreateDefinition($definition: MetaobjectDefinitionCreateInput!) {
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
        type,
        name,
        displayNameKey: "display_name",
        fieldDefinitions,
      },
    },
  );

  const errors = created.metaobjectDefinitionCreate.userErrors || [];
  if (errors.length) {
    throw new Error(errors.map((error) => error.message).join(", "));
  }

  return created.metaobjectDefinitionCreate.metaobjectDefinition?.id;
}

async function createProviderApplicationRequest(provider) {
  const fields = mapFields([
    ["submission_id", provider.submissionId],
    ["status", "pending"],
    ["provider_slug", provider.providerSlug],
    ["display_name", provider.displayName],
    ["legal_name", provider.legalName],
    ["catalog_vendor_name", provider.catalogVendorName],
    ["contact_name", provider.contactName],
    ["email", provider.email],
    ["phone", provider.phone],
    ["whatsapp", provider.whatsapp],
    ["address_line_1", provider.addressLine1],
    ["address_line_2", provider.addressLine2],
    ["city", provider.city],
    ["postal_code", provider.postalCode],
    ["province_or_region", provider.provinceOrRegion],
    ["country", provider.country],
    ["google_place_id", provider.googlePlaceId],
    ["latitude", provider.latitude],
    ["longitude", provider.longitude],
    ["account_holder", provider.accountHolder],
    ["tax_id", provider.taxId],
    ["iban", provider.iban],
    ["bank_name", provider.bankName],
    ["bank_country", provider.bankCountry],
    ["description", provider.description],
    ["opening_hours", provider.openingHours],
    ["website_url", provider.websiteUrl],
    ["instagram_url", provider.instagramUrl],
    ["logo_source_url", provider.logoSourceUrl],
    ["gallery_source_urls", provider.gallerySourceUrls],
    ["submitted_at", provider.submittedAt],
  ]);

  fields.push({
    key: "service_categories",
    value: JSON.stringify(provider.serviceCategories),
  });

  const created = await shopifyGraphql(
    `#graphql
      mutation ProviderSeedCreateRequest($metaobject: MetaobjectCreateInput!) {
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
        type: PROVIDER_APPLICATION_REQUEST_TYPE,
        handle: provider.submissionId,
        fields,
      },
    },
  );

  const errors = created.metaobjectCreate.userErrors || [];
  if (errors.length) {
    throw new Error(errors.map((error) => error.message).join(", "));
  }

  return created.metaobjectCreate.metaobject;
}

async function createProviderProfile(provider) {
  const fields = mapFields([
    ["provider_slug", provider.providerSlug],
    ["display_name", provider.displayName],
    ["legal_name", provider.legalName],
    ["catalog_vendor_name", provider.catalogVendorName],
    ["contact_name", provider.contactName],
    ["email", provider.email],
    ["phone", provider.phone],
    ["whatsapp", provider.whatsapp],
    ["address_line_1", provider.addressLine1],
    ["address_line_2", provider.addressLine2],
    ["city", provider.city],
    ["postal_code", provider.postalCode],
    ["province_or_region", provider.provinceOrRegion],
    ["country", provider.country],
    ["latitude", provider.latitude],
    ["longitude", provider.longitude],
    ["google_place_id", provider.googlePlaceId],
    ["description", provider.description],
    ["opening_hours", provider.openingHours],
    ["website_url", provider.websiteUrl],
    ["instagram_url", provider.instagramUrl],
    ["logo_source_url", provider.logoSourceUrl],
    ["gallery_source_urls", provider.gallerySourceUrls],
    ["status", "approved"],
    ["source_submission_id", provider.submissionId],
  ]);

  fields.push({
    key: "service_categories",
    value: JSON.stringify(provider.serviceCategories),
  });

  const created = await shopifyGraphql(
    `#graphql
      mutation ProviderSeedCreateProfile($metaobject: MetaobjectCreateInput!) {
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
        handle: provider.providerSlug,
        fields,
      },
    },
  );

  const errors = created.metaobjectCreate.userErrors || [];
  if (errors.length) {
    throw new Error(errors.map((error) => error.message).join(", "));
  }

  return created.metaobjectCreate.metaobject;
}

async function updateRequestAsApproved(requestId, profileId, profileHandle) {
  const updated = await shopifyGraphql(
    `#graphql
      mutation ProviderSeedApproveRequest($id: ID!, $metaobject: MetaobjectUpdateInput!) {
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
      id: requestId,
      metaobject: {
        fields: [
          { key: "status", value: "approved" },
          { key: "reviewed_at", value: new Date().toISOString() },
          { key: "reviewed_by_email", value: REVIEWED_BY_EMAIL },
          { key: "provider_profile_handle", value: profileHandle },
          { key: "provider_profile_id", value: profileId },
          { key: "decline_reason", value: "" },
        ],
      },
    },
  );

  const errors = updated.metaobjectUpdate.userErrors || [];
  if (errors.length) {
    throw new Error(errors.map((error) => error.message).join(", "));
  }
}

function buildProviders({ count, perCategory, tag }) {
  const providers = [];
  const effectiveTag = slugify(tag || nowStamp());
  const total =
    count != null ? count : CATEGORY_SEEDS.length * perCategory;
  const basePerCategory = Math.floor(total / CATEGORY_SEEDS.length);
  const remainder = total % CATEGORY_SEEDS.length;
  let globalIndex = 0;

  CATEGORY_SEEDS.forEach((category, categoryIndex) => {
    const amount =
      count != null
        ? basePerCategory + (categoryIndex < remainder ? 1 : 0)
        : perCategory;

    for (let i = 0; i < amount; i += 1) {
      globalIndex += 1;
      const itemNumber = String(i + 1).padStart(2, "0");
      const displayName = `${category.prefix} ${itemNumber}`;
      const providerSlug = slugify(`${displayName}-${effectiveTag}`);

      providers.push({
        submissionId: buildSubmissionId(globalIndex, effectiveTag),
        providerSlug,
        displayName,
        legalName: `${displayName} SL`,
        catalogVendorName: displayName,
        contactName: `Contacto ${displayName}`,
        email: `${providerSlug}@seed.lacocheraplace.test`,
        phone: `+34600${String(globalIndex).padStart(6, "0")}`,
        whatsapp: `+34610${String(globalIndex).padStart(6, "0")}`,
        addressLine1: `Carrer Demo ${20 + i}`,
        addressLine2: `Local ${itemNumber}`,
        city: "Barcelona",
        postalCode: `080${String((categoryIndex + i) % 10).padStart(2, "0")}`,
        provinceOrRegion: "Barcelona",
        country: "Spain",
        googlePlaceId: `seed-place-${providerSlug}`,
        latitude: (category.lat + i * 0.0024).toFixed(6),
        longitude: (category.lon + i * 0.0021).toFixed(6),
        accountHolder: `${displayName} SL`,
        taxId: buildTaxId(globalIndex),
        iban: buildIban(globalIndex),
        bankName: "Santander",
        bankCountry: "Espana",
        serviceCategories: [category.applicationCategory],
        description: `${displayName} presta servicios de ${category.applicationCategory} como proveedor de prueba para validar el marketplace y el buscador por cercania.`,
        openingHours: "Lun-Vie 09:00-18:00",
        websiteUrl: "",
        instagramUrl: "",
        logoSourceUrl: "",
        gallerySourceUrls: "",
        submittedAt: new Date().toISOString(),
        heroHandle: category.heroHandle,
      });
    }
  });

  return providers;
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const providers = buildProviders(args);

  if (args.dryRun) {
    console.log(
      JSON.stringify(
        {
          ok: true,
          mode: "dry-run",
          count: providers.length,
          reviewedBy: REVIEWED_BY_EMAIL,
          providers: providers.map((provider) => ({
            submissionId: provider.submissionId,
            providerSlug: provider.providerSlug,
            displayName: provider.displayName,
            category: provider.serviceCategories[0],
            heroHandle: provider.heroHandle,
            latitude: provider.latitude,
            longitude: provider.longitude,
          })),
        },
        null,
        2,
      ),
    );
    return;
  }

  await ensureDefinition(
    PROVIDER_APPLICATION_REQUEST_TYPE,
    "Provider Application Request",
    REQUEST_FIELD_DEFINITIONS,
  );
  await ensureDefinition(
    PROVIDER_PROFILE_TYPE,
    "Provider Profile",
    PROFILE_FIELD_DEFINITIONS,
  );

  const created = [];

  for (const provider of providers) {
    const requestMetaobject = await createProviderApplicationRequest(provider);
    const profileMetaobject = await createProviderProfile(provider);
    await updateRequestAsApproved(
      requestMetaobject.id,
      profileMetaobject.id,
      profileMetaobject.handle,
    );

    created.push({
      submissionId: provider.submissionId,
      providerSlug: provider.providerSlug,
      displayName: provider.displayName,
      requestId: requestMetaobject.id,
      profileId: profileMetaobject.id,
      profileHandle: profileMetaobject.handle,
      category: provider.serviceCategories[0],
      heroHandle: provider.heroHandle,
    });
  }

  console.log(
    JSON.stringify(
      {
        ok: true,
        createdCount: created.length,
        reviewedBy: REVIEWED_BY_EMAIL,
        created,
      },
      null,
      2,
    ),
  );
}

main().catch((error) => {
  console.error(`ERROR: ${error.message}`);
  process.exitCode = 1;
});
