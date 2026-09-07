#!/usr/bin/env node
/* eslint-disable no-console */
const fs = require("fs");
const path = require("path");
const { shopifyGraphQL, verifyShopifyConnection } = require("./lib/shopify-auth.cjs");

const SERVICES = [
  {
    handle: "lavado-completo-la-cochera-place",
    title: "Lavado completo",
    flow: "checkout",
    descriptionHtml: "<p><strong>Lavado exterior, encerado, aspirado interior y limpieza de vidrios.</strong></p><p>Incluye prelavado con espuma activa, lavado manual con microfibra, limpieza de llantas y aros, enjuague a presión, secado, encerado, aspirado del habitáculo y limpieza interior y exterior de vidrios.</p><p><em>Tolerancia de estacionamiento: entre 1 y 2 horas como máximo después de la entrega del vehículo.</em></p>",
    variants: [["Auto", "50.00"], ["Camioneta SUV", "60.00"], ["Camioneta 3 filas", "70.00"]],
  },
  {
    handle: "lavado-vapor-interior-la-cochera-place",
    title: "Lavado de vapor interior",
    flow: "checkout",
    descriptionHtml: "<p><strong>Limpieza profunda del habitáculo con vapor a alta temperatura.</strong></p><p>Incluye aspirado previo; limpieza de tablero, consola, puertas, asientos, alfombras y pisos; tratamiento de conductos del aire acondicionado y aplicación de restaurador Sonax en cueros y plásticos.</p><p>Ayuda a eliminar bacterias, hongos, ácaros y malos olores sin mojar en exceso los materiales.</p>",
    variants: [["Auto", "150.00"], ["Camioneta SUV", "200.00"], ["Camioneta 3 filas", "230.00"]],
  },
  {
    handle: "lavado-salon-detailing-interior-la-cochera-place",
    title: "Lavado de salón (detailing interior)",
    flow: "checkout",
    descriptionHtml: "<p><strong>Tratamiento integral de detailing interior.</strong></p><p>Incluye desmontaje de alfombras y tapetes, aspirado profundo, extracción con máquina de salón, limpieza del techo interior, tablero, puertas, consola y vidrios, acondicionamiento de plásticos y vinilos, tratamiento de cueros y perfumado.</p>",
    variants: [["Auto", "300.00"], ["Camioneta SUV", "350.00"], ["Camioneta 3 filas", "380.00"]],
  },
  {
    handle: "motor-a-vapor-la-cochera-place",
    title: "Limpieza de motor a vapor",
    flow: "checkout",
    descriptionHtml: "<p><strong>Desengrase y limpieza del compartimiento del motor con vapor controlado.</strong></p><p>Incluye evaluación de zonas sensibles, aplicación de desengrasante, limpieza con vapor a baja presión y secado con aire comprimido y microfibra. Evita aplicar agua a presión directamente sobre sensores, conectores y componentes eléctricos.</p>",
    variants: [["Todos los vehículos", "40.00"]],
  },
  {
    handle: "pulido-faros-la-cochera-place",
    title: "Pulido de faros",
    flow: "checkout",
    descriptionHtml: "<p><strong>Restauración de faros opacos, amarillentos o rayados.</strong></p><p>Incluye enmascarado, lijado progresivo, pulido con compuesto abrasivo fino y sellado con protección UV.</p><p><em>El precio indicado corresponde a una unidad de faro. Se recomienda realizar ambos faros delanteros para obtener un acabado uniforme.</em></p>",
    variants: [["Auto (por faro)", "35.00"], ["Camioneta (por faro)", "40.00"]],
  },
  {
    handle: "pulido-pintura-la-cochera-place",
    title: "Pulido de pintura",
    flow: "consultative",
    descriptionHtml: "<p><strong>Corrección de pintura para reducir rayones leves, swirls, oxidación y manchas.</strong></p><p>Incluye lavado y descontaminado previo, evaluación de la pintura, pulido con compuesto de corte, refinado y protección final recomendada.</p><p><strong>Precio a consultar:</strong> depende del tamaño del vehículo, los paneles y el nivel de corrección requerido.</p>",
  },
  {
    handle: "descontaminado-pintura-la-cochera-place",
    title: "Descontaminado de pintura",
    flow: "consultative",
    descriptionHtml: "<p><strong>Eliminación de contaminantes adheridos que no salen con un lavado convencional.</strong></p><p>Incluye lavado previo, descontaminación férrica, remoción de brea y asfalto, tratamiento con clay bar, enjuague y secado.</p><p><strong>Precio a consultar:</strong> depende del tamaño y estado del vehículo.</p>",
  },
  {
    handle: "ceramico-carpro-la-cochera-place",
    title: "Recubrimiento cerámico Carpro",
    flow: "consultative",
    descriptionHtml: "<p><strong>Protección semipermanente Carpro para la pintura.</strong></p><p>Incluye preparación de superficie, limpieza con alcohol isopropílico, aplicación panel por panel, curado y acabado final. Aporta protección UV, resistencia química, efecto hidrofóbico y brillo profundo.</p><p><strong>Precio a consultar:</strong> depende del vehículo, la preparación y las capas aplicadas.</p>",
  },
  {
    handle: "cueros-aros-la-cochera-place",
    title: "Tratamiento de cueros y restauración de aros",
    flow: "consultative",
    descriptionHtml: "<p><strong>Trabajos profesionales para interior y aros.</strong></p><p>El tratamiento de cueros incluye limpieza profunda, hidratación y protección con restaurador Sonax. La restauración de aros con R2000 elimina polvo de frenos, oxidación superficial y manchas difíciles.</p><p><strong>Precio a consultar:</strong> depende del vehículo y del estado de las superficies.</p>",
  },
];

function loadEnv(filePath) {
  for (const line of fs.readFileSync(filePath, "utf8").split(/\r?\n/)) {
    const match = line.match(/^([A-Za-z_][A-Za-z0-9_]*)=(.*)$/);
    if (match && !process.env[match[1]]) process.env[match[1]] = match[2].trim();
  }
}

function assertNoErrors(payload, label) {
  const errors = payload?.userErrors || [];
  if (errors.length) throw new Error(`${label}: ${errors.map((error) => error.message).join(" | ")}`);
}

async function getProducts() {
  const data = await shopifyGraphQL(
    `#graphql
    query CarwashCatalog($query: String!) {
      shop { name currencyCode }
      products(first: 20, query: $query) {
        nodes {
          id handle title descriptionHtml vendor status tags onlineStoreUrl
          media(first: 100) { nodes { id } }
          options { id name optionValues { id name } }
          variants(first: 100) { nodes { id title price selectedOptions { name value } } }
        }
      }
    }`,
    { query: SERVICES.map((service) => `handle:${service.handle}`).join(" OR ") },
  );
  return data;
}

async function updateProduct(product, service) {
  const tags = product.tags.filter((tag) => tag !== "service-flow-checkout" && tag !== "service-flow-consultative" && (service.flow !== "checkout" || tag !== "price-pending-pen"));
  tags.push(`service-flow-${service.flow}`);
  const data = await shopifyGraphQL(
    `#graphql
    mutation UpdateCarwashProduct($product: ProductUpdateInput!) {
      productUpdate(product: $product) {
        product { id handle title tags }
        userErrors { field message }
      }
    }`,
    { product: { id: product.id, title: service.title, descriptionHtml: service.descriptionHtml, tags: [...new Set(tags)] } },
  );
  assertNoErrors(data.productUpdate, `No se pudo actualizar ${service.handle}`);
}

async function deleteVariants(productId, ids) {
  if (!ids.length) return;
  const data = await shopifyGraphQL(
    `#graphql
    mutation DeleteCarwashVariants($productId: ID!, $ids: [ID!]!) {
      productVariantsBulkDelete(productId: $productId, variantsIds: $ids) {
        userErrors { field message }
      }
    }`,
    { productId, ids },
  );
  assertNoErrors(data.productVariantsBulkDelete, "No se pudieron eliminar variantes excedentes");
}

async function updateVariants(product, targetVariants) {
  const current = product.variants.nodes;
  if (!targetVariants || !targetVariants.length) return;
  if (current.length > targetVariants.length) {
    await deleteVariants(product.id, current.slice(targetVariants.length).map((variant) => variant.id));
  }
  const retained = current.slice(0, Math.min(current.length, targetVariants.length));
  const optionName = product.options[0]?.name || "Title";
  const updates = retained.map((variant, index) => ({
    id: variant.id,
    price: targetVariants[index][1],
    ...(optionName !== "Title" ? { optionValues: [{ optionName, name: targetVariants[index][0] }] } : {}),
  }));
  if (updates.length) {
    const data = await shopifyGraphQL(
      `#graphql
      mutation UpdateCarwashVariants($productId: ID!, $variants: [ProductVariantsBulkInput!]!) {
        productVariantsBulkUpdate(productId: $productId, variants: $variants) {
          productVariants { id title price }
          userErrors { field message }
        }
      }`,
      { productId: product.id, variants: updates },
    );
    assertNoErrors(data.productVariantsBulkUpdate, `No se pudieron actualizar variantes de ${product.handle}`);
  }
  if (targetVariants.length > retained.length) {
    const creates = targetVariants.slice(retained.length).map(([name, price]) => ({ price, optionValues: [{ optionName, name }] }));
    const data = await shopifyGraphQL(
      `#graphql
      mutation CreateCarwashVariants($productId: ID!, $variants: [ProductVariantsBulkInput!]!) {
        productVariantsBulkCreate(productId: $productId, variants: $variants) {
          productVariants { id title price }
          userErrors { field message }
        }
      }`,
      { productId: product.id, variants: creates },
    );
    assertNoErrors(data.productVariantsBulkCreate, `No se pudieron crear variantes de ${product.handle}`);
  }
}

async function main() {
  loadEnv(path.resolve(process.cwd(), ".env.local"));
  const apply = process.argv.includes("--apply");
  await verifyShopifyConnection();
  const before = await getProducts();
  const byHandle = new Map(before.products.nodes.map((product) => [product.handle, product]));
  const missing = SERVICES.filter((service) => !byHandle.has(service.handle));
  if (missing.length) throw new Error(`Faltan productos: ${missing.map((service) => service.handle).join(", ")}`);
  const reportPath = path.resolve("project-docs/exports/la-cochera-carwash-update.json");
  const report = { generatedAt: new Date().toISOString(), apply, source: "servicios_carwash (1).docx", before, services: SERVICES, updated: [] };
  fs.writeFileSync(reportPath, `${JSON.stringify(report, null, 2)}\n`, "utf8");
  if (!apply) return console.log(`DRY RUN: ${SERVICES.length} productos listos. Reporte: ${reportPath}`);
  for (const service of SERVICES) {
    const product = byHandle.get(service.handle);
    await updateProduct(product, service);
    await updateVariants(product, service.variants);
    report.updated.push(service.handle);
    fs.writeFileSync(reportPath, `${JSON.stringify(report, null, 2)}\n`, "utf8");
    console.log(`UPDATED ${service.handle}`);
  }
  report.after = await getProducts();
  fs.writeFileSync(reportPath, `${JSON.stringify(report, null, 2)}\n`, "utf8");
  console.log(`Catálogo actualizado: ${report.updated.length} productos.`);
}

main().catch((error) => {
  console.error(`ERROR: ${error.message}`);
  process.exit(1);
});
