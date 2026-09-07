#!/usr/bin/env node
/* eslint-disable no-console */
const fs = require("fs");
const path = require("path");

const sourceDir = "C:/Users/LC/Downloads";
const outputDir = path.resolve("sample-data/chiclayo");
const assetDir = path.resolve("sample-data/chiclayo/assets");

const paths = {
  candidates: path.join(sourceDir, "candidatos_proveedores_chiclayo (1).json"),
  profiles: path.join(sourceDir, "provider_profiles_chiclayo.json"),
  csv: path.join(sourceDir, "resumen_proveedores_chiclayo.csv"),
  audit: path.join(sourceDir, "auditoria_proveedores_chiclayo.md"),
};

const categoryMap = {
  carwash: "lavado",
  detailing: "detailing",
  pulido_tratamiento_ceramico: "detailing",
  ppf_wrap: "ppf-wrap-tintado-lunas",
  polarizado_lunas: "ppf-wrap-tintado-lunas",
  mantenimiento_automotriz: "mantenimiento-ligero",
  mecanica: "mantenimiento-ligero",
  neumaticos_llantas: "neumaticos-y-llantas",
  baterias: "productos-y-accesorios-para-el-cuidado-automotriz",
  chapa_pintura: "chapa-y-pintura",
  productos_accesorios: "productos-y-accesorios-para-el-cuidado-automotriz",
  parking: "parking",
  grua_asistencia: "grua-y-auxlio-mecanico",
  parabrisas: "ppf-wrap-tintado-lunas",
};

function readJson(file) {
  return JSON.parse(fs.readFileSync(file, "utf8").replace(/^\uFEFF/, ""));
}

function unique(values) {
  return [...new Set(values.filter(Boolean))];
}

function normalizeCategory(value) {
  const normalized = categoryMap[value];
  if (!normalized) throw new Error(`Categoría no reconocida: ${value}`);
  return normalized;
}

function csvEscape(value) {
  const text = value == null ? "" : String(value);
  return /[",\r\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

fs.mkdirSync(outputDir, { recursive: true });
fs.mkdirSync(assetDir, { recursive: true });

const candidates = readJson(paths.candidates).map((item) => ({
  ...item,
  primary_category: normalizeCategory(item.primary_category),
  secondary_categories: unique(
    String(item.secondary_categories || "")
      .split("|")
      .filter(Boolean)
      .map(normalizeCategory),
  ).join("|"),
}));

const profiles = readJson(paths.profiles).map((item) => ({
  ...item,
  service_categories: unique(item.service_categories.map(normalizeCategory)),
}));

const headers = [
  "provider_name", "suggested_handle", "district", "province", "region",
  "primary_category", "phone", "whatsapp", "website", "rating", "review_count",
  "verification_status", "latitude", "longitude",
];
const csv = [
  headers.join(","),
  ...candidates.map((item) => headers.map((key) => csvEscape(item[key])).join(",")),
].join("\n") + "\n";

const manifest = profiles.map((profile) => ({
  provider_slug: profile.provider_slug,
  provider_name: profile.display_name,
  logo_status: profile.website_url ? "official_source_review_required" : "placeholder_required",
  official_source_url: profile.website_url || profile.instagram_url || "",
  logo_source_url: "",
  gallery_status: "permission_required",
  gallery_source_urls: [],
  local_fallback: "sample-data/chiclayo/assets/provider-placeholder.svg",
  rights_note: profile.website_url
    ? "Verificar titularidad y condiciones de uso antes de descargar o publicar el logo."
    : "Usar el placeholder neutral hasta recibir un recurso autorizado del proveedor.",
}));

let audit = fs.readFileSync(paths.audit, "utf8").replace("coordernadas", "coordenadas");
for (const [legacy, canonical] of Object.entries(categoryMap)) {
  audit = audit.replace(new RegExp(`(^|\\s)${legacy}(?=:)`, "gm"), `$1${canonical}`);
}
audit += `\n\n## 12. Normalización para integración\n\n`;
audit += `Las categorías del paquete se normalizaron a los identificadores reconocidos por el directorio público. `;
audit += `Los valores originales de investigación se conservan en los archivos fuente de Descargas.\n\n`;
audit += `## 13. Recursos gráficos\n\n`;
audit += `Ningún candidato aportó URLs verificadas de logo o galería. Se creó un manifiesto de revisión y un placeholder neutral local. `;
audit += `Los logos oficiales requieren verificación de titularidad y las fotografías de galería requieren autorización antes de publicarse.\n`;

fs.writeFileSync(path.join(outputDir, "candidatos_proveedores_chiclayo.json"), `${JSON.stringify(candidates, null, 2)}\n`);
fs.writeFileSync(path.join(outputDir, "provider_profiles_chiclayo.json"), `${JSON.stringify(profiles, null, 2)}\n`);
fs.writeFileSync(path.join(outputDir, "resumen_proveedores_chiclayo.csv"), csv);
fs.writeFileSync(path.join(outputDir, "auditoria_proveedores_chiclayo.md"), audit);
fs.writeFileSync(path.join(outputDir, "provider-images-manifest.json"), `${JSON.stringify(manifest, null, 2)}\n`);

console.log(`Paquete normalizado: ${outputDir}`);
console.log(`Proveedores: ${profiles.length}; manifiesto gráfico: ${manifest.length}`);
