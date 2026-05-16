# TASKS

## Estado
- Proyecto: `lacocheraplace.com`
- Owner de negocio: `Ches`
- Dev responsable: `Meeguel`
- Asistente tecnico: `Codex`
- Theme base de trabajo: `theme-dawn-export`
- App admin base: `shopify-provider-admin`
- Rama activa: `main`
- Modo actual: trabajo local primero, despliegue solo tras aprobacion
- Ultimo hito confirmado: `asignacion de imagenes alojadas en Shopify Files a los 9 productos carwash existentes`
- Iniciativa activa: `catalogo piloto carwash de Ches con checkout Shopify nativo`

## Nuevo plan aprobado (2026-05-14): arquitectura por tipo de flujo
Objetivo: separar fichas/experiencias de producto-servicio por `flow_type` sin hardcode y administrable desde Shopify Admin.

### Diagnostico
- Estado actual con reglas mixtas en theme (tags + condicionales) no escala bien para 12 categorias con modelos distintos.
- Se requiere una capa de orquestacion unica para decidir interfaz/CTA/validaciones por producto.

### Decision de arquitectura
- Fuente de verdad: metafields de producto (`namespace: lcp`).
- Soporte: colecciones para navegacion y descubrimiento.
- Legacy temporal: tags solo como compatibilidad durante migracion.

### Matriz anti-hardcode (resumen)
- No usar: `title`, `handle`, `collection` para decidir flujo.
- Si usar: `product.metafields.lcp.flow_type` + `lcp.subflow_mode` + `lcp.form_schema`.

### Metafields requeridos (v1)
- `lcp.flow_type`
- `lcp.service_category`
- `lcp.subflow_mode`
- `lcp.cta_primary_label`
- `lcp.cta_primary_action`
- `lcp.requires_vehicle_data`
- `lcp.requires_photos`
- `lcp.requires_schedule`
- `lcp.form_schema`
- `lcp.whatsapp_phone`
- `lcp.price_label_from`
- `lcp.is_used_or_clearance`

### Archivos objetivo para implementacion (siguiente etapa, aun sin ejecutar)
- Modificar: `sections/main-product.liquid` (entrypoint + router)
- Crear:
- `snippets/lcp-product-flow-router.liquid`
- `snippets/lcp-flow-ecommerce.liquid`
- `snippets/lcp-flow-reserva-directa.liquid`
- `snippets/lcp-flow-cotizacion.liquid`
- `snippets/lcp-flow-lead-generation.liquid`
- `snippets/lcp-flow-urgente.liquid`
- `snippets/lcp-flow-hibrido.liquid`
- `snippets/lcp-service-fields-dynamic.liquid`

### Fases de implementacion
- Fase A: contrato de metafields y mapeo por categoria.
- Fase B: router minimo (`ecommerce` + `cotizacion`) bajo feature flag.
- Fase C: `reserva_directa`, `hibrido`, `urgente`, `lead_generation`.
- Fase D: QA responsive + WCAG + hardening visual premium.
- Fase E: migracion de catalogo y retiro progresivo de legacy.

### Riesgos clave
- Regresion en checkout nativo.
- Coexistencia temporal tags/metafields.
- Complejidad de hibridos.

### Rollback
- Feature flag `lcp_enable_flow_router` para desactivar router.
- Revertir por lote/commit sin mezclar nuevos cambios.
- Mantener compatibilidad legacy hasta cierre de migracion.

### Criterios de aceptacion
- UI correcta por `flow_type`.
- `ecommerce` mantiene checkout Shopify nativo intacto.
- `cotizacion/lead/urgente` sin compra directa.
- Hibridos resuelven por `subflow_mode`.
- Cumplimiento responsive + accesibilidad base.

## Reglas de ejecucion
- No tocar theme publicado sin aprobacion explicita
- Todo cambio empieza en local
- Cada bloque importante se revisa visualmente antes de seguir
- Cada cambio debe poder revertirse
- No romper flujo actual de servicios consultivos ni productos fisicos
- Activar el nuevo flujo solo por opt-in de producto (`service.purchase_flow`)
- Prioridad inmediata: resolver el piloto carwash de Ches de forma nativa en Shopify, sin tuneles ni dependencias externas para checkout
- Si aparece un obstaculo de arquitectura, datos, checkout, privacidad o Shopify Admin, se pausa y se decide entre Codex y Meeguel antes de ejecutar
- Regla de catalogo visual (obligatoria): cada producto debe mantener `6` imagenes en total (`1` principal + `5` de galeria) para consistencia de storefront y QA

## Flujo de trabajo
1. Auditar la zona a modificar
2. Definir cambio pequeno y visible
3. Implementar en local
4. Revisar diff
5. Validar funcional y visualmente en theme borrador o preview
6. Aprobar o revertir

## Backlog previo (historial)
- [x] Extraer theme actual en local
- [x] Auditar estructura general del theme
- [x] Detectar gap entre e-commerce y marketplace de servicios
- [x] Auditar homepage en detalle
- [x] Definir arquitectura homepage tipo marketplace
- [~] Redisenar homepage sin romper contenido actual
- [ ] Transformar ficha de producto a ficha de servicio
- [ ] Definir modelo de talleres/proveedores
- [ ] Reducir elementos de carrito clasico donde no aplique
- [ ] Preparar flujo de preview seguro

## Epic activo: Validacion de vehiculo y compra guiada (v1)
Objetivo: mover un subconjunto de servicios al flujo de compra guiada con validacion por matricula, sin romper lo existente.

Nota de prioridad: este epic queda en pausa operativa para no mezclarlo con el piloto carwash de Ches. No se elimina ni se revierte; se retoma despues de validar el catalogo carwash y su checkout nativo.

### Alcance funcional confirmado
- [x] Pais objetivo v1: `Espana`
- [x] Taxonomia v1: `moto`, `coche`, `SUV`, `furgon` con tallas `S/M/L`
- [x] Precio final por variante nativa Shopify `familia + talla`
- [x] Compatibilidad por existencia de variante; variante ausente = no compatible
- [x] Persistencia operativa en DB propia de app (no metaobjects para PII/lookup)

### Lote 1: Contrato de datos y base tecnica (backend)
- [x] Definir adaptador `lookupByPlate` desacoplado de vendor
- [x] Extender `schema.prisma` con modelos equivalentes a:
- [x] `customer_contact`
- [x] `vehicle`
- [x] `vehicle_lookup_log`
- [x] `service_precheck`
- [x] `order_vehicle_link`
- [x] Crear migracion y documentar estrategia de rollback de esquema
- [x] Criterio de salida: schema compilado + migracion revisable + sin impacto en rutas actuales
- [x] Resolver drift local de `prisma/dev.sqlite` antes de ejecutar `prisma migrate dev` de forma normal

### Lote 2: Endpoint publico de precheck (app proxy)
- [x] Crear `POST /apps/service-precheck` en app existente
- [x] Normalizar matricula espanola (validas e invalidas)
- [x] Ejecutar lookup externo via adaptador
- [x] Clasificar `familia + talla`
- [x] Resolver compatibilidad contra variantes del producto
- [x] Persistir precheck y devolver payload de UI
- [x] Criterio de salida: endpoint estable con respuestas para `ok`, `incompatible`, `unverified`

### Lote 3: Catalogo Shopify opt-in
- [x] Crear metafield de producto `service.purchase_flow` (gestionado desde app admin)
- [x] Soportar valores `consultative` y `vehicle_precheck_checkout`
- [x] Preparar subconjunto piloto de servicios con variantes `familia + talla`
- [x] Mantener servicios no opt-in en flujo consultivo actual (default `consultative`)
- [~] Criterio de salida: piloto pequeno activo y reversible por metafield

### Lote QA: Catalogo de proveedores para buscador y directorios
- [x] Recuperar app embebida `Laco Prov Admin` con tunnel temporal operativo
- [x] Aprobar en lote solicitudes de proveedor de prueba para crear `provider_profile`
- [x] Ampliar scopes de app a `read_products` y `write_products`
- [x] Preparar semilla de solicitudes/proveedores para pruebas masivas (`scripts/seed_provider_requests_and_profiles.cjs`)
- [x] Confirmar regla de catalogo: todo producto de prueba debe llevar `vendor` asignado a un proveedor
- [~] Crear catalogo semilla de productos por categoria y proveedor para probar filtros del Hero
- [ ] Documentar estrategia de limpieza del catalogo QA una vez termine la validacion

### Bloqueo operativo actual (app online)
- [ ] Definir URL estable de hosting externo para la app embebida
- [ ] Actualizar `application_url`, redirects, app proxy y webhooks a URL fija
- [ ] Re-desplegar release de app con URL estable y validar acceso owner a `/app/purchase-flow`

## Epic activo inmediato: Catalogo carwash Ches + checkout Shopify nativo
Objetivo: transformar el documento `DESCRIPCION DE SERVICIOS.txt` de Ches en un catalogo piloto de servicios Shopify, con checkout solo para servicios de precio cerrado y flujo consultivo para servicios a cotizar.

### Decisiones confirmadas
- [x] Owner de negocio: `Ches`
- [x] Dev: `Meeguel`
- [x] Enfoque: buenas practicas, escalable, global, sin inventar logicas fuera de Shopify
- [x] Plataforma de pago: checkout nativo Shopify si aplica
- [x] Servicios con checkout: `Lavado Completo`, `Lavado Vapor`, `Lavado Salon`, `Motor a Vapor`, `Pulido Faros`
- [x] Servicios sin checkout: `Pulido Pintura`, `Descontaminado`, `Ceramico Carpro`, `Cueros / Aros`
- [x] Variantes visibles: `Coche`, `SUV`, `7 plazas`
- [x] Proveedor piloto: `La Cochera Place`
- [x] Mercado objetivo de storefront: `Espana`
- [x] Precios finales EUR: pendientes de confirmacion de Ches antes de publicar

### Lote C0: Contexto y contrato
- [x] Leer documento de Ches completo
- [x] Registrar cambio de plan: si habra checkout para servicios cerrados
- [x] Actualizar roadmap, contrato operativo y reglas de agente
- [x] Definir criterios de avance por lotes

### Lote C1: Modelo Shopify nativo
- [x] Definir estructura de producto/servicio para CSV importable
- [x] Definir tags globales y colecciones objetivo
- [x] Definir etiqueta de control para distinguir `checkout` vs `consultative`
- [x] Documentar contrato en `project-docs/CARWASH-SHOPIFY-MODEL.md`
- [x] Criterio de salida: modelo revisado antes de crear/importar catalogo

### Lote C2: CSV draft del catalogo Ches
- [x] Crear CSV local en `sample-data/` con 9 servicios
- [x] Mantener productos como `draft` hasta aprobacion
- [x] Crear variantes `Coche`, `SUV`, `7 plazas` para servicios de precio cerrado
- [x] Marcar servicios consultivos sin compra directa
- [x] Aplicar tags `service-flow-checkout` o `service-flow-consultative`
- [x] Mantener tag `price-pending-eur` hasta aprobacion de Ches
- [x] Criterio de salida: CSV validable e importable sin tocar produccion

### Lote C3: Ficha de servicio Shopify-native
- [x] Revisar estado real de `main-product.liquid`
- [x] Asegurar que servicios de checkout mantienen variante + compra nativa
- [x] Asegurar que servicios consultivos sustituyen compra por formulario/contacto
- [x] No romper productos fisicos ni servicios existentes
- [x] Criterio de salida: preview local/draft con un producto checkout y uno consultivo
- Preview checkout: `https://cs3msy-n8.myshopify.com/products/lavado-completo-la-cochera-place?preview_theme_id=196749918545`
- Preview consultivo: `https://cs3msy-n8.myshopify.com/products/pulido-pintura-la-cochera-place?preview_theme_id=196749918545`
- Preview publico directo checkout: `https://lacocheraplace.com/products/lavado-completo-la-cochera-place`
- Preview publico directo consultivo: `https://lacocheraplace.com/products/pulido-pintura-la-cochera-place`
- Avance: cambios subidos al theme borrador `Codex Preview Homepage Round 3` (`196749918545`) para preparar preview.
- Resuelto: se uso una app Dev Dashboard con client credentials grant para obtener token temporal e importar productos draft.

### Lote C4: Colecciones y navegacion
- [x] Ubicar carwash en coleccion raiz adecuada (`lavado`/`detailing` segun servicio)
- [x] Confirmar que cards de home llevan a colecciones raiz, no a proveedor unico
- [x] Confirmar que proveedor enlaza a vendor collection completa
- [x] Criterio de salida: navegacion coherente servicio -> proveedor -> catalogo
- Produccion verificada HTTP 200: `/collections/lavado`, `/collections/detailing`, `/collections/mantenimiento-ligero` y `/collections/vendors?q=La+Cochera+Place`.

### Lote C5: Validacion y aprobacion
- [x] Importar primero en borrador o staging
- [ ] Revisar precios EUR con Ches
- [ ] Revisar visualmente con Meeguel
- [ ] Publicar solo tras aprobacion explicita
- [ ] Criterio de salida: piloto aprobado o rollback documentado
- Bloqueo: no publicar ni retirar `price-pending-eur` hasta aprobacion explicita de precios EUR por Ches.
- Importacion completada: 9 productos creados en Shopify como `draft`, con `published_at = null` y tag `price-pending-eur`.
- Para preview real, `Lavado Completo` y `Pulido Pintura` quedaron temporalmente en estado `unlisted`; el resto del catalogo sigue en `draft`.
- Actualizacion posterior solicitada por Meeguel: los 9 productos carwash quedaron `active` y publicados en Online Store para preview real en produccion, manteniendo `price-pending-eur` y precios `0.00` hasta aprobacion de Ches.
- Piloto de contenido/precio real aplicado a `Lavado Completo`: descripcion corta/larga desde documento Ches, nota de tolerancia de estacionamiento y variantes EUR `Auto = 50.00`, `Camioneta SUV = 60.00`, `Camioneta 3 filas = 70.00`.
- Ajuste UX para `Lavado Completo`: se retiro `price-pending-eur`, se agrego `service-checkout-disabled`, se desactivo gestion de inventario para evitar variantes tachadas y el theme live bloquea checkout mostrando CTA/formulario consultivo.
- Galeria piloto de `Lavado Completo`: 5 imagenes WebP subidas a Shopify desde `D:\development\assets\lacocheraplace\lavado-completo\toWEBP`; `img-lavado-completo (1).webp` quedo como imagen principal.
- Decision posterior de Ches: `Lavado Completo` vuelve a checkout habilitado. Se retiro `service-checkout-disabled`, se elimino el formulario consultivo para este caso y el boton de compra nativo volvio a mostrarse.
- Asignacion completada (2026-05-08): se vincularon imagenes alojadas en Shopify Files a los 9 productos carwash por `handle` usando `productCreateMedia`.
- Detalle de asignacion (2026-05-08): `Lavado Completo` ya tenia 5 imagenes y se mantuvo sin duplicados; en los otros 8 servicios se agregaron galerias segun mapping operativo.
- Descarga ampliada (2026-05-08): pipeline de imagenes ejecutado con objetivo `120`; resultado `120/120` guardado en logs del modulo `scripts/product-image-pipeline`.
- Subida incremental (2026-05-08): se subieron `47` imagenes nuevas a Shopify Files, omitiendo archivos ya existentes online por nombre.
- Asignacion incremental (2026-05-08): se asignaron imagenes recien subidas a productos existentes sin repetir URLs ya enlazadas por producto.
- Normalizacion final de galeria (2026-05-08): los 9 productos carwash quedaron ajustados a `6` imagenes exactas por producto para revision visual consistente.

### Hoja de ejecucion inmediata C5 (2026-05-07)
- [ ] Paso 1: consolidar matriz final de precios EUR por servicio/variante con validacion explicita de Ches
- [ ] Paso 2: revisar visualmente con Meeguel en preview activa (`196749918545`) al menos 1 servicio checkout y 1 consultivo
- [ ] Paso 3: validar que los servicios consultivos no muestran compra directa y que checkout solo aparece donde corresponde
- [ ] Paso 4: confirmar estado final de tags de control (`service-flow-checkout`, `service-flow-consultative`, `price-pending-eur`) por producto
- [ ] Paso 5: registrar decision final del lote: `aprobado para publicacion controlada` o `rollback documentado`
- Evidencia minima a adjuntar en cierre C5: links de producto revisado + captura/nota de estado por servicio + decision firmada por Ches/Meeguel
- Evidencia agregada (imagenes): productos verificados para revision visual:
- `https://lacocheraplace.com/products/lavado-completo-la-cochera-place`
- `https://lacocheraplace.com/products/lavado-vapor-interior-la-cochera-place`
- `https://lacocheraplace.com/products/lavado-salon-detailing-interior-la-cochera-place`
- `https://lacocheraplace.com/products/motor-a-vapor-la-cochera-place`
- `https://lacocheraplace.com/products/pulido-faros-la-cochera-place`
- `https://lacocheraplace.com/products/pulido-pintura-la-cochera-place`
- `https://lacocheraplace.com/products/descontaminado-pintura-la-cochera-place`
- `https://lacocheraplace.com/products/ceramico-carpro-la-cochera-place`
- `https://lacocheraplace.com/products/cueros-aros-la-cochera-place`
- Referencia visual oficial QA (2026-05-12): `https://www.lacocheraplace.com/products/lavado-completo-la-cochera-place`
- Esta vista queda definida como `vista perfecta` para homogeneizar el resto de productos:
- galeria horizontal con miniaturas visibles
- bloque derecho limpio con titulo, rating, precio/estado segun flujo y CTA principal
- acordeones de contenido (`Descripcion`, `Proceso`) debajo de la galeria
- Regla complementaria de imagenes para homologacion visual: `6` imagenes por producto (`1` principal + `5` galeria).
- Actualizacion home (2026-05-12):
- `Talleres Destacados`: cards con prioridad de imagen `logo_source_url provider_profile` -> `producto de referencia` -> `fallback manual`.
- `Productos y accesorios destacados`: mapeo determinista por card para evitar imagen repetida; cada card apunta a un `provider_product` concreto y usa su `featured_image`.
- Nota operativa QA: el dominio publico puede mostrar cache agresivo. Verificar cambios con query param (`?v=...`) o hard refresh.
- Actualizacion home (2026-05-14):
- `Talleres Destacados` migrado a componente nativo Shopify `multicolumn` para edicion simple desde admin (`image_picker` por bloque).
- Layout fijado a `6` logos en una sola fila en desktop (`columns_desktop: 6`), con swipe en mobile.
- Logos cargados desde `Shopify Files` segun seleccion operativa (primeros 6 de listado QA); reemplazo puntual aplicado: `Santander Auto Care 53` -> `Cordoba Auto Care 52`.

### Lote 4: Ficha de servicio (theme)
- [ ] Actualizar `main-product.liquid` para detectar `vehicle_precheck_checkout`
- [ ] Sustituir bloque consultivo por bloque intake solo en opt-in
- [ ] Pedir `nombre`, `email`, `telefono`, `matricula`
- [ ] Llamar al endpoint de precheck y mostrar resumen verificado
- [ ] Mantener `Anadir al carrito` deshabilitado hasta validacion correcta
- [ ] Seleccionar automaticamente la variante compatible
- [ ] Enviar propiedades: `Matricula`, `Vehiculo`, `Familia`, `Talla`, `_service_precheck_id`
- [ ] Si `incompatible` o `unverified`, bloquear compra y mostrar fallback WhatsApp/contacto
- [ ] Criterio de salida: ficha no rompe productos fisicos ni servicios consultivos

### Lote 5: Trazabilidad de pedidos
- [ ] Implementar webhook `orders/create` en la app
- [ ] Leer `_service_precheck_id` de line item properties
- [ ] Vincular pedido Shopify con `service_precheck` en DB
- [ ] Guardar relacion completa pedido-cliente-vehiculo-servicio
- [ ] Criterio de salida: auditoria end-to-end de una compra piloto

### Lote 6: Infraestructura y cumplimiento
- [ ] Plan de migracion de `sqlite` local a `Postgres` alojado antes de produccion
- [ ] Definir variables y secretos por entorno (dev/staging/prod)
- [ ] Confirmar politicas de retencion y acceso para PII
- [ ] Criterio de salida: entorno estable para activar rollout controlado

## Plan de pruebas (obligatorio por lote)
- [ ] Catalogo Ches: 9 servicios creados como productos Shopify
- [ ] Catalogo Ches: servicios 1-5 con variantes y checkout nativo activo
- [ ] Catalogo Ches: servicios 6-9 sin checkout directo y con CTA/formulario consultivo
- [ ] Catalogo Ches: vendor `La Cochera Place` visible y agrupable
- [ ] Catalogo Ches: precios finales EUR aprobados por Ches antes de publicar
- [ ] Normalizacion de matriculas espanolas validas e invalidas
- [ ] Mapeo externo -> `familia`, `talla`, dimensiones y snapshot persistido
- [ ] Compatible: seleccion de variante correcta y compra habilitada
- [ ] Incompatible: compra bloqueada con fallback visible
- [ ] Reuso de vehiculo ya consultado + nuevo evento en lookup log
- [ ] Webhook: vinculacion de pedido con `_service_precheck_id`
- [ ] Regresion: productos fisicos y servicios `consultative`

## Roadmap de rollout y rollback
- [ ] Rollout 0: backend oscuro sin impacto storefront
- [x] Rollout 1: endpoint activo con logging y sin bloqueo de compra global
- [~] Rollout 2: piloto en subconjunto pequeno de servicios opt-in
- [ ] Rollout 3: ampliar cobertura tras metricas y validacion manual
- [ ] Rollback rapido: volver `service.purchase_flow` a `consultative`
- [ ] Rollback tecnico: revertir lote por commit sin mezclar features nuevas

## Preview activa
- Theme borrador: `Codex Preview Homepage Round 3`
- Theme ID: `196749918545`
- Preview URL: `https://cs3msy-n8.myshopify.com?preview_theme_id=196749918545`
- Editor URL: `https://cs3msy-n8.myshopify.com/admin/themes/196749918545/editor`
- Nota: al retomar, validar visualmente esta preview antes de abrir una nueva linea de trabajo

## Commits de referencia
- `335f889` baseline local del proyecto
- `8ffc73b` homepage round 1 marketplace positioning
- `1762372` organize docs and add shopify marketplace skill
- `828f848` homepage round 2 navigation and providers
- `c280404` homepage round 3 providers emphasis
- `12fe1e6` DBS credit link en footer
- `07d20fe` lote 1 contrato de datos + migracion prisma
- `641692a` update docs lote 1 + rollback notes
- `c639114` lote 2 endpoint app proxy `service-precheck`
- `dee1061` adaptador real configurable de lookup por matricula

## Registro de decisiones
- El proyecto se tratara como plataforma en construccion, no como tienda Shopify clasica
- La prioridad inicial es UX marketplace de servicios
- No se subira nada a produccion sin revision del propietario
- La iniciativa de compra guiada por matricula es un lote independiente dentro de ficha de servicio
- El lookup sin verificacion bloquea compra online para servicios opt-in
- El catalogo de pruebas para proveedores debe seguir la misma regla de storefront actual: resolver oferta por `product.vendor` y no dejar productos huerfanos de proveedor

## Estandar editorial de Blog (2026-05-16)
- [x] Definir estilo y layout oficial para articulos del blog, validado por Ches
- [x] Aplicar estilo en template nativo (`main-article`) y CSS de articulo (`section-blog-post.css`)
- [x] Publicar articulo de referencia con este estandar:
- `https://lacocheraplace.com/blogs/noticias/cuanto-cuesta-detailing-barcelona-2026`

### Patron visual aprobado
- Cabecera editorial: fecha superior, titulo dominante, metadata compacta con tiempo de lectura.
- Hero principal del articulo visible inmediatamente bajo el titulo.
- Cuerpo con jerarquia clara (`h3` numerados), ritmo tipografico y espaciado amplio.
- Soporte nativo para tabla comparativa y bloque en rejilla (`.article-grid`) dentro del contenido.
- Cierre con enlaces internos y externos orientados a conversion.

### Regla operativa para siguientes articulos
- Todo nuevo articulo SEO debe respetar este layout base.
- Las imagenes se suben en formato `webp`.
- El contenido se publica inicialmente en borrador para revision de Ches, salvo instruccion explicita de publicar.

## Tarea segura: revision y actualizacion de scopes Shopify (2026-05-13)
Estado: completado en modo seguro (sin cambios destructivos).

### Estado actual encontrado
- Archivo principal de configuracion de app: `shopify-provider-admin/shopify.app.toml`
- Archivo web detectado: `shopify-provider-admin/shopify.web.toml`
- Archivo de entorno app detectado: `shopify-provider-admin/.env`
- Documento operativo usado: `project-docs/TASKS.md`

### Archivo donde se gestionan los scopes
- Fuente de verdad para Managed Install / Shopify CLI: `shopify-provider-admin/shopify.app.toml` en la seccion `[access_scopes]`.
- Seccion encontrada:
- `scopes = "read_metaobjects,write_metaobjects,read_metaobject_definitions,write_metaobject_definitions,write_app_proxy,read_products,write_products,read_files,write_files"`

### Scopes actuales
- En `shopify.app.toml`:
- `read_metaobjects`
- `write_metaobjects`
- `read_metaobject_definitions`
- `write_metaobject_definitions`
- `write_app_proxy`
- `read_products`
- `write_products`
- `read_files`
- `write_files`
- En `shopify-provider-admin/.env` (`SCOPES`):
- `read_metaobject_definitions`
- `read_metaobjects`
- `write_app_proxy`
- `write_metaobject_definitions`
- `write_metaobjects`
- `read_products`
- `write_products`

### Scopes propuestos
- Objetivo de gestion de productos ya cubierto:
- `read_products`
- `write_products`
- No se requiere agregar ni eliminar scopes para cumplir este objetivo.
- No se detectan duplicados.

### Sincronizacion TOML vs .env
- `SCOPES` en `.env` no incluye actualmente `read_files` y `write_files`, que si existen en `shopify.app.toml`.
- Recomendacion: mantener ambos sincronizados para evitar diferencias entre runtime local y configuracion declarativa.
- Como no es necesario para el objetivo de productos y puede impactar comportamiento local, se deja como accion pendiente controlada (sin tocar credenciales).

### Pasos para aplicar cambio (cuando si haya cambio de scopes)
1. Modificar `shopify-provider-admin/shopify.app.toml` en `[access_scopes]`.
2. Ejecutar `shopify app deploy`.
3. Abrir la app en Shopify.
4. Reautorizar permisos.
5. Validar con `shopify app info`.

### Nota importante
- Cuando la app usa Shopify Managed Install / Shopify CLI, los permisos se cambian desde el TOML y despliegue CLI, no desde el dashboard web nuevo de Shopify.

### Plan de rollback
1. Restaurar los scopes anteriores en `shopify-provider-admin/shopify.app.toml`.
2. Ejecutar nuevamente `shopify app deploy`.
3. Reinstalar o reautorizar la app si Shopify lo solicita.

### Implementacion ejecutada
- No se modifico `shopify-provider-admin/shopify.app.toml` porque el objetivo (`read_products`, `write_products`) ya estaba aplicado.
- Se documenta el estado real y el procedimiento seguro para cambios futuros.
- Confirmacion operativa: como no hubo cambio de scopes en esta ejecucion, no se requiere reinstalar ni reautorizar ahora.

## Solicitud Ches: nuevas categorias/colecciones nativas Shopify (2026-05-13)
- [x] Definir implementacion nativa Shopify para:
- `Productos usados y liquidaciones`
- `Renta de Espacios y Herramientas para Automocion`
- [x] Documentar ejecucion en Admin sin recursos externos:
- ver `project-docs/COLLECTIONS-CHES-NATIVAS.md`
- [ ] Ejecutar en Shopify Admin la creacion de ambas smart collections por tag.
- [ ] Validar URLs:
- `/collections/productos-usados-y-liquidaciones`
- `/collections/renta-de-espacios-y-herramientas-para-automocion`

## Cierre operativo home/colecciones (2026-05-13)
- [x] Reintegrar homepage a patron de cards por coleccion (no listado directo de productos)
- [x] Agregar las dos nuevas categorias al selector de servicios del hero:
- `productos-usados-y-liquidaciones`
- `renta-de-espacios-y-herramientas-para-automocion`
- [x] Agregar las dos nuevas cards en `multicolumn` de home con enlace nativo a coleccion
- [x] Corregir cards sin imagen en frontend asignando `image` en `templates/index.json`
- [x] Subir cambios al theme activo:
- `Codex Preview Hero Select` (`198115623249`)
- [x] Regla de deduplicacion para sembrado de productos/proveedores:
- clave canonical `service_key` via tag `service_key:<slug>`
- evitar creacion duplicada si el `service_key` ya existe en catalogo

### Nota de estado
- El home vuelve a mostrar categorias de servicio como cards (estilo previo), incluyendo las 2 nuevas solicitadas.
- La logica dinamica por producto se conserva como experimento local en `theme-dawn-export/sections/home-services-dynamic.liquid`, pero no queda activa en el template de home actual.

## Runbook bloqueo API/token Shopify (2026-05-13)
Estado: documentado y validado en ejecucion real.

### Objetivo
Evitar bloqueos por credenciales Shopify Admin API y tener recuperacion operativa rapida.

### Regla de dominio (critica)
- Para token por Client Credentials Grant, usar dominio OAuth canonico:
- `SHOPIFY_SHOP=lacocheraplace.myshopify.com`
- No usar dominios alternos para el endpoint OAuth aunque GraphQL responda con otro `myshopifyDomain`.

### Flujo oficial implementado (Dev Dashboard 2026)
- Endpoint:
- `POST https://${SHOPIFY_SHOP}/admin/oauth/access_token`
- Body `application/x-www-form-urlencoded`:
- `grant_type=client_credentials`
- `client_id=${SHOPIFY_CLIENT_ID}`
- `client_secret=${SHOPIFY_CLIENT_SECRET}`
- Respuesta esperada:
- `access_token`
- `expires_in`
- `scope` (o `scopes`)

### Helpers implementados
- `scripts/lib/shopify-auth.cjs`
- `getShopifyAccessToken()`: solicita token, cachea en memoria y renueva antes de expirar.
- `shopifyGraphQL(query, variables)`: wrapper Admin GraphQL con `X-Shopify-Access-Token`.
- `verifyShopifyConnection()`: valida conectividad con query `shop { name myshopifyDomain }`.
- `scripts/verify_shopify_auth.cjs`: verificacion operativa del flujo completo.

### Variables de entorno recomendadas
- `SHOPIFY_SHOP=lacocheraplace.myshopify.com`
- `SHOPIFY_CLIENT_ID=...`
- `SHOPIFY_CLIENT_SECRET=...`
- `SHOPIFY_API_VERSION=2026-04` (o la vigente del script)

### Compatibilidad legacy
- `SHOPIFY_ADMIN_TOKEN` queda como fallback opcional, no obligatorio.
- Para habilitar fallback legacy de forma explicita:
- `SHOPIFY_ENABLE_LEGACY_FALLBACK=true`

### Comando de verificacion rapida
- `node scripts/verify_shopify_auth.cjs --env-file private-data/shopify-admin.env`
- Debe mostrar:
- token obtenido correctamente
- `expires_in`
- `scopes`
- resultado query: `shop.name` y `shop.myshopifyDomain`

### Diagnostico rapido de errores
- `404` en `/admin/oauth/access_token`:
- revisar `SHOPIFY_SHOP` (dominio OAuth incorrecto).
- `401` en GraphQL:
- revisar `SHOPIFY_CLIENT_ID/SHOPIFY_CLIENT_SECRET` o scopes publicados.
- Token ok pero mapeo 0:
- revisar correspondencia entre manifest y `provider_profile` reales (slug/vendor).
