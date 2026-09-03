# Piloto Detailing Center

## Estado

- Creado en Shopify el 2026-09-01.
- Moneda verificada de la tienda: `PEN`.
- Proveedor: `Detailing Center`.
- Provider profile: `gid://shopify/Metaobject/506256982353`.
- Handle del proveedor: `detailing-center`.
- Estado del perfil: `approved`, para que pueda participar en el directorio piloto.
- Los cinco servicios están `ACTIVE` y publicados en `Online Store` desde el 2026-09-01.
- Flujo de los servicios: `service-flow-checkout`.

## Información pendiente del proveedor

El catálogo visual recibido no contiene razón social, persona de contacto, correo, dirección, distrito, RUC, teléfono o enlaces sociales verificables. El perfil usa valores explícitos `Pendiente de completar` y un correo no entregable del dominio reservado `.invalid`; deben sustituirse antes de cualquier lanzamiento público.

## Servicios y precios

### Tratamiento cerámico

- Product ID: `gid://shopify/Product/11094896574801`.
- Handle: `tratamiento-ceramico-detailing-center`.
- 3 años / Auto: `S/ 800.00`.
- 3 años / Camioneta: `S/ 850.00`.
- 5 años / Auto: `S/ 1000.00`.
- 5 años / Camioneta: `S/ 1100.00`.

### Pulido general

- Product ID: `gid://shopify/Product/11094897033553`.
- Handle: `pulido-general-detailing-center`.
- Precio: `S/ 250.00`.

### Polarizado

- Product ID: `gid://shopify/Product/11094897230161`.
- Handle: `polarizado-detailing-center`.
- Chamalleon / Auto: `S/ 400.00`.
- Chamalleon / Camioneta: `S/ 450.00`.
- 3M / Auto: `S/ 700.00`.
- 3M / Camioneta: `S/ 750.00`.

La grafía `Chamalleon` reproduce literalmente el catálogo entregado y debe confirmarse antes de publicar.

### Full Body PPF

- Product ID: `gid://shopify/Product/11094897459537`.
- Handle: `full-body-ppf-detailing-center`.
- Precio: `S/ 5500.00`.

### PPF - Protección de partes

- Product ID: `gid://shopify/Product/11094897623377`.
- Handle: `ppf-proteccion-de-partes-detailing-center`.
- Faros delanteros: `S/ 300.00`.
- Pilares de puertas (6): `S/ 240.00`.
- Espejos (2): `S/ 150.00`.
- Cortesía indicada: protección de las cuatro manijas.

## Control operativo

- Script idempotente: `scripts/seed_detailing_center_pilot.cjs`.
- El modo predeterminado es lectura/dry-run.
- La escritura requiere `--apply`.
- Si encuentra el provider o un handle existente, lo omite y no duplica datos.

## Verificación de publicación

- `https://www.lacocheraplace.com/products/tratamiento-ceramico-detailing-center` — HTTP 200.
- `https://www.lacocheraplace.com/products/pulido-general-detailing-center` — HTTP 200.
- `https://www.lacocheraplace.com/products/polarizado-detailing-center` — HTTP 200.
- `https://www.lacocheraplace.com/products/full-body-ppf-detailing-center` — HTTP 200.
- `https://www.lacocheraplace.com/products/ppf-proteccion-de-partes-detailing-center` — HTTP 200.
- Publicación ejecutada con la credencial administrativa de operaciones; `Laco Prov Admin` no dispone de `write_publications`.

## Pendiente para completar el piloto

- Completar datos reales del proveedor.
- Confirmar la grafía y especificaciones de la lámina Chamalleon.
- Añadir logo e imágenes de servicio con derechos de uso confirmados.
- Revisar descripciones, duración, alcance, impuestos y condiciones comerciales.
- Revisar visualmente las cinco fichas publicadas en desktop y móvil.

## Rollback

Si se cancela el piloto, retirar los cinco productos de `Online Store`, pasarlos a `DRAFT` o archivarlos por sus IDs y cambiar el estado del provider profile. No reutilizar los handles para otro proveedor.

## Imagenes de servicio

- Lote publicado en Shopify el 2026-09-01.
- Cinco productos con seis imagenes WebP cada uno: `30` imagenes en total.
- Resolucion normalizada: `1600 x 1600` px.
- Fuentes utilizadas para este lote: Pexels y Pixabay.
- Los 30 medios quedaron en estado `READY` y asociados directamente a sus productos.
- Mapeo reproducible: `sample-data/shopify-detailing-center-image-assignments.csv`.
- Entrada de descarga: `sample-data/product-image-pipeline-input-detailing-center.csv`.

## Inventario piloto

- Inventario de prueba aplicado el 2026-09-01 y verificado de nuevo el 2026-09-03.
- Las `13` variantes tienen `20` unidades disponibles en la ubicacion que atiende pedidos online.
- Todos los servicios tienen seguimiento de inventario activo y politica `DENY`.
- Las variantes estan configuradas como servicios que no requieren envio fisico.
- Las cinco fichas y todas sus variantes devuelven `available: true` en el storefront.
- Prueba de alta en carrito confirmada con HTTP `200`.
- Script reproducible: `scripts/set_detailing_center_test_inventory.cjs`.
- Permisos publicados: `read_inventory`, `write_inventory` y `read_locations`.
