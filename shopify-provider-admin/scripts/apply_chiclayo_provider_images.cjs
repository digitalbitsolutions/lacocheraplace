#!/usr/bin/env node
const fs = require("fs");
const { PrismaClient } = require("@prisma/client");

const images = {
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

for (const line of fs.readFileSync(".env", "utf8").split(/\r?\n/)) {
  const match = line.match(/^([^#=]+)=(.*)$/);
  if (match && !process.env[match[1]]) process.env[match[1]] = match[2].replace(/^['"]|['"]$/g, "");
}

async function graphql(session, query, variables) {
  const response = await fetch(`https://${session.shop}/admin/api/2025-01/graphql.json`, {
    method: "POST",
    headers: { "Content-Type": "application/json", "X-Shopify-Access-Token": session.accessToken },
    body: JSON.stringify({ query, variables }),
  });
  const body = await response.json();
  if (!response.ok || body.errors?.length) throw new Error(JSON.stringify(body.errors || body).slice(0, 500));
  return body.data;
}

async function main() {
  const prisma = new PrismaClient();
  try {
    const session = await prisma.session.findFirst({ where: { isOnline: false } });
    if (!session) throw new Error("No existe sesion offline de Shopify.");
    const data = await graphql(session, `query { metaobjects(type: "provider_profile", first: 250) { nodes { id fields { key value } } } }`);
    const profiles = data.metaobjects.nodes.map((node) => ({ id: node.id, fields: Object.fromEntries(node.fields.map((field) => [field.key, field.value])) }));
    const updated = [];
    const missing = [];
    for (const [slug, url] of Object.entries(images)) {
      const profile = profiles.find((item) => item.fields.provider_slug === slug);
      if (!profile) { missing.push(slug); continue; }
      const result = await graphql(session, `mutation UpdateImage($id: ID!, $metaobject: MetaobjectUpdateInput!) { metaobjectUpdate(id: $id, metaobject: $metaobject) { metaobject { id } userErrors { message } } }`, { id: profile.id, metaobject: { fields: [{ key: "logo_source_url", value: url }] } });
      const errors = result.metaobjectUpdate.userErrors || [];
      if (errors.length) throw new Error(`${slug}: ${errors.map((error) => error.message).join(" | ")}`);
      updated.push(slug);
    }
    console.log(JSON.stringify({ expected: Object.keys(images).length, updated, missing }, null, 2));
    if (missing.length) process.exitCode = 1;
  } finally { await prisma.$disconnect(); }
}
main().catch((error) => { console.error(`ERROR: ${error.message}`); process.exit(1); });
