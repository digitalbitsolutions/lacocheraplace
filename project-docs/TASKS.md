# TASKS

## Estado
- Proyecto: `lacocheraplace.com`
- Theme base de trabajo: `theme-dawn-export`
- App admin base: `shopify-provider-admin`
- Rama activa: `main`
- Modo actual: trabajo local primero, despliegue solo tras aprobacion
- Ultimo hito confirmado: `12fe1e6 chore: add DBS credit link in footer`
- Iniciativa activa: `validacion de vehiculo y compra guiada por matricula (v1 Espana)`

## Reglas de ejecucion
- No tocar theme publicado sin aprobacion explicita
- Todo cambio empieza en local
- Cada bloque importante se revisa visualmente antes de seguir
- Cada cambio debe poder revertirse
- No romper flujo actual de servicios consultivos ni productos fisicos
- Activar el nuevo flujo solo por opt-in de producto (`service.purchase_flow`)

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
- [ ] Crear `POST /apps/service-precheck` en app existente
- [ ] Normalizar matricula espanola (validas e invalidas)
- [ ] Ejecutar lookup externo via adaptador
- [ ] Clasificar `familia + talla`
- [ ] Resolver compatibilidad contra variantes del producto
- [ ] Persistir precheck y devolver payload de UI
- [ ] Criterio de salida: endpoint estable con respuestas para `ok`, `incompatible`, `unverified`

### Lote 3: Catalogo Shopify opt-in
- [ ] Crear metafield de producto `service.purchase_flow`
- [ ] Soportar valores `consultative` y `vehicle_precheck_checkout`
- [ ] Preparar subconjunto piloto de servicios con variantes `familia + talla`
- [ ] Mantener servicios no opt-in en flujo consultivo actual
- [ ] Criterio de salida: piloto pequeno activo y reversible por metafield

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
- [ ] Normalizacion de matriculas espanolas validas e invalidas
- [ ] Mapeo externo -> `familia`, `talla`, dimensiones y snapshot persistido
- [ ] Compatible: seleccion de variante correcta y compra habilitada
- [ ] Incompatible: compra bloqueada con fallback visible
- [ ] Reuso de vehiculo ya consultado + nuevo evento en lookup log
- [ ] Webhook: vinculacion de pedido con `_service_precheck_id`
- [ ] Regresion: productos fisicos y servicios `consultative`

## Roadmap de rollout y rollback
- [ ] Rollout 0: backend oscuro sin impacto storefront
- [ ] Rollout 1: endpoint activo con logging y sin bloqueo de compra global
- [ ] Rollout 2: piloto en subconjunto pequeno de servicios opt-in
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

## Registro de decisiones
- El proyecto se tratara como plataforma en construccion, no como tienda Shopify clasica
- La prioridad inicial es UX marketplace de servicios
- No se subira nada a produccion sin revision del propietario
- La iniciativa de compra guiada por matricula es un lote independiente dentro de ficha de servicio
- El lookup sin verificacion bloquea compra online para servicios opt-in
