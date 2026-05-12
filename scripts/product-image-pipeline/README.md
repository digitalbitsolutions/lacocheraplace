# Product Image Pipeline (Shopify Pilot)

Modulo incremental para descargar y preparar imagenes de producto desde APIs oficiales:

- Unsplash API
- Pexels API
- Pixabay API

No hace scraping. No sube a Shopify. Solo prepara assets y metadata local.

## Entrada CSV

Formato requerido:

`sku,handle,category,keyword,image_count`

Ejemplo en `sample-data/product-image-pipeline-input.example.csv`.

## Salidas

- Imagenes: `product-images/<category>/<handle>/<handle>-NN.webp`
- Metadata CSV por corrida:
  `scripts/product-image-pipeline/logs/metadata-<timestamp>.csv`
- Log CSV por corrida:
  `scripts/product-image-pipeline/logs/downloads-<timestamp>.csv`
- Resumen JSON:
  `scripts/product-image-pipeline/logs/run-summary-<timestamp>.json`

Campos de metadata:

`category, keyword, source, original_url, photographer, license, filename, local_path`

## Reglas implementadas

- WEBP + resize a `1600x1600`.
- Nomenclatura SEO por `handle`.
- Evita duplicados por `source:id` y hash binario.
- Modo `--dry-run` (planifica sin descargar).
- Limites:
  - `MAX_IMAGES_PER_CATEGORY` (env, por fila CSV)
  - `MAX_IMAGES_PER_RUN` (env o `--max`)
- Filtro de texto de seguridad (bloquea candidatos con palabras de logo, matricula, personas).

## Importante sobre cumplimiento visual

Las APIs no garantizan deteccion perfecta de logos, matriculas o rostros solo con metadatos.
Este pipeline aplica filtro textual conservador, pero siempre requiere revision humana final antes de publicar.

## Instalacion

```bash
cd scripts/product-image-pipeline
npm install
cp .env.example .env
```

Configura al menos una API key.

## Ejecucion

Dry-run:

```bash
npm run dry-run
```

Run real con CSV:

```bash
npm run run -- --input ../../sample-data/product-image-pipeline-input.example.csv --max 40
```

## Atajos desde `shopify-provider-admin`

Se agregan scripts no disruptivos:

- `npm run images:pipeline:dry-run`
- `npm run images:pipeline`

