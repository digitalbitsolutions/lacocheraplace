# PLAN / CONTRATO OPERATIVO

## Proyecto
- Nombre: `La Cochera Place`
- Owner de negocio: `Ches`
- Dev responsable: `Meeguel`
- Asistente tecnico: `Codex`
- Base tecnica: `theme-dawn-export`
- App admin base: `shopify-provider-admin`
- Repositorio local: `d:\\development\\lacocheraplace.com`
- Rama activa: `main`

## Naturaleza del trabajo
Este documento define el marco de trabajo para evolucionar el theme actual de Shopify hacia una plataforma con percepcion de marketplace de servicios automotrices.

No es un contrato juridico formal. Es un acuerdo operativo de trabajo, aprobacion y control de cambios.

## Objetivo principal
Transformar la experiencia actual para que deje de parecer una tienda Shopify tradicional y pase a comportarse visual y funcionalmente como una plataforma de:
- servicios
- talleres / proveedores
- solicitud / reserva
- checkout nativo cuando el servicio tenga precio cerrado y condiciones claras

## Alcance actual

### Incluido
- Auditoria del theme
- Roadmap y documentacion del proyecto
- Refactor controlado del frontend
- Cambios locales en Liquid, JSON templates, sections, snippets y CSS
- Reorganizacion de homepage
- Preparacion para preview segura
- Preparacion documental para MCP, skills y versionado
- Implementacion progresiva de compra guiada para servicios opt-in
- Catalogo piloto carwash/detailing de Ches, modelado como productos Shopify nativos

### No incluido por ahora
- Publicacion directa a produccion
- Integraciones SaaS completas
- Sistema de reservas avanzado ya operativo
- Automatizaciones complejas del Admin de Shopify
- Cambios destructivos sobre el theme activo
- Pasarelas de pago externas o flujos de cobro fuera del checkout nativo de Shopify para el piloto carwash

## Principios de ejecucion
- Todo cambio empieza en local
- No se trabaja directamente sobre produccion
- Cada iteracion debe ser pequena, visible y reversible
- No se elimina codigo sin justificacion
- Se reutiliza Dawn siempre que ayude a reducir riesgo
- Ningun cambio se considera final sin validacion
- Las iniciativas nuevas deben tener rollout gradual y rollback explicito
- No se inventan entidades o flujos si Shopify ya ofrece un modelo nativo suficiente
- Las decisiones con impacto en arquitectura, checkout, datos o publicacion se resuelven entre Codex y Meeguel antes de ejecutar

## Fases del plan

### Fase 1. Fundacion
- Extraer theme en local
- Auditar estructura actual
- Definir PRD, roadmap, skills y control de versiones

### Fase 2. Homepage
- Reorientar la homepage a servicios
- Sustituir bloques genericos de tienda
- Hacer navegables las categorias
- Introducir visibilidad de talleres / proveedores

### Fase 3. Ficha de servicio
- Transformar `product` en experiencia de servicio
- Reducir senales de carrito clasico
- Introducir datos utiles de servicio

#### Subfase 3.0 Catalogo carwash Ches con checkout nativo
- Prioridad operativa inmediata antes de retomar la compra guiada por matricula
- Fuente de negocio: documento `DESCRIPCION DE SERVICIOS.txt` propuesto por Ches
- Modelado base: cada servicio es un producto Shopify `Type = Servicio`
- Proveedor piloto: `La Cochera Place` via `product.vendor`
- Mercado objetivo de storefront: `Espana`
- Servicios con checkout nativo: `Lavado Completo`, `Lavado Vapor`, `Lavado Salon`, `Motor a Vapor`, `Pulido Faros`
- Servicios consultivos sin checkout directo: `Pulido Pintura`, `Descontaminado`, `Ceramico Carpro`, `Cueros / Aros`
- Variantes para servicios con precio cerrado: `Coche`, `SUV`, `7 plazas`
- Precios finales en EUR requieren aprobacion de Ches antes de publicar
- La primera carga debe ser local/draft/importable y revisable antes de tocar tienda publicada

#### Subfase 3.A Validacion de vehiculo, compatibilidad y precio por familia+talla
- Alcance v1 en `Espana`
- Taxonomia inicial: `moto`, `coche`, `SUV`, `furgon` con tallas `S/M/L`
- Precio final siempre por variante nativa Shopify
- Opt-in por metafield de producto `service.purchase_flow`
- Modos minimos: `consultative` y `vehicle_precheck_checkout`
- Compatibilidad por existencia de variante; ausencia = no compatible

#### Subfase 3.B Backend y persistencia operativa
- Extender `schema.prisma` mas alla de `Session`
- Incluir entidades equivalentes a `customer_contact`, `vehicle`, `vehicle_lookup_log`, `service_precheck` y `order_vehicle_link`
- Crear endpoint app proxy `POST /apps/service-precheck`
- Encapsular proveedor externo bajo adaptador `lookupByPlate`
- Persistir PII, historial y trazabilidad en DB propia de app (no metaobjects)

#### Subfase 3.C UI de compra guiada en ficha
- Sustituir bloque consultivo en `main-product.liquid` solo cuando `service.purchase_flow = vehicle_precheck_checkout`
- Capturar `nombre`, `email`, `telefono` y `matricula`
- Validar matricula y mostrar resumen de vehiculo verificado
- Mantener `Anadir al carrito` deshabilitado hasta validacion correcta
- Seleccionar variante compatible automaticamente y mostrar precio final
- Enviar propiedades `Matricula`, `Vehiculo`, `Familia`, `Talla` y `_service_precheck_id`
- Si no hay verificacion o no hay compatibilidad, bloquear compra y mostrar fallback WhatsApp/contacto

#### Subfase 3.D Trazabilidad de pedido y activacion progresiva
- Implementar webhook `orders/create`
- Vincular orden Shopify con `_service_precheck_id`
- Dejar trazabilidad pedido-cliente-vehiculo-servicio
- Activar primero en subconjunto pequeno de servicios con pricing por tamano
- Migrar de `sqlite` local a `Postgres` alojado antes de produccion

Nota: las subfases 3.A-3.D quedan pausadas operativamente mientras se ejecuta el piloto carwash. No se eliminan; se retoman despues de validar el modelo nativo de catalogo + checkout.

### Fase 4. Talleres / proveedores
- Definir representacion visible de talleres
- Crear bloques de confianza y relacion taller -> servicio
- Consolidar listados o perfiles

### Fase 5. Preview y rollout
- Validar cambios en theme borrador o preview
- Revisar con propietario
- Aprobar, ajustar o revertir

## Entregables por iteracion
Cada iteracion debe dejar:
- objetivo del lote
- archivos modificados
- diff revisable
- explicacion breve del impacto
- commit independiente
- opcion clara de rollback
- evidencia de prueba del lote
- decision de continuidad o pausa si aparece un bloqueo tecnico/negocio

## Criterio de aprobacion
Una iteracion se considera aprobada cuando:
- el cambio cumple el objetivo definido
- no rompe el theme base
- el resultado visual o funcional es entendible
- existe commit separado
- el propietario acepta seguir con la siguiente fase
- existe prueba minima del flujo afectado

## Regla de rollback
Si un cambio no convence o introduce riesgo:
- se revierte solo el lote afectado
- no se mezcla rollback con nuevas funcionalidades
- se vuelve al ultimo commit estable aprobado
- en servicios opt-in se puede desactivar el flujo volviendo `service.purchase_flow` a `consultative`

## Control de versiones
- `main` conserva el baseline estable
- las iteraciones viven en ramas de trabajo
- cada lote importante se guarda en un commit separado
- no se empuja a una fase nueva sin haber fijado la anterior

## Condiciones para conectar Shopify
La conexion real con Shopify solo se usara cuando haga falta para:
- preview visual
- theme borrador
- lectura o escritura de datos reales
- publicacion controlada

Hasta ese momento, el trabajo principal sigue siendo local.

## Estado actual al momento de este acuerdo
- Baseline local creado
- Repo Git inicializado y conectado a remoto
- Skills y contexto documental creados
- Homepage round 1 completada
- Homepage round 2 completada
- Homepage round 3 completada
- Preview de tema borrador creada en Shopify
- Mejoras recientes en flujo de proveedores y contenidos informativos
- Lote 1 completado: contrato de datos Prisma + adaptador `lookupByPlate` + migracion versionada + rollback documentado
- Drift local de `prisma/dev.sqlite` resuelto y migraciones aplicadas en entorno dev
- Lote 2 completado: endpoint `POST /apps/service-precheck` + persistencia + respuesta `ok/incompatible/unverified`
- Lote 3 en curso: metafield `service.purchase_flow` gestionado desde app y set piloto inicial preparado
- Bloqueo actual: release de app publicada con URL temporal de tunel; pendiente mover a hosting estable con URL fija
- Cambio de prioridad confirmado: Ches solicita piloto carwash con checkout para servicios de precio cerrado
- La app/proxy no es requisito para el piloto carwash si Shopify nativo cubre catalogo, variantes y checkout

## Siguiente paso recomendado
Continuar el piloto carwash de Ches en este orden:
- C0: cerrar documentos de contexto y reglas de avance
- C1: definir modelo Shopify nativo del catalogo
- C2: crear CSV draft importable
- C3: ajustar/verificar ficha de servicio para checkout vs consultivo
- C4: validar colecciones, proveedor y navegacion
- C5: importar en borrador, revisar con Ches/Meeguel y publicar solo con aprobacion

## Anexo de arquitectura (2026-05-14): Flujos por categoria sin hardcode

### Objetivo
Definir una arquitectura nativa Shopify para que cada producto/servicio renderice una interfaz y flujo segun su tipo operativo, sin condicionar por `title`, `handle` o `collection` hardcodeados.

### Tipos de flujo objetivo
- `ecommerce`
- `reserva_directa`
- `cotizacion`
- `lead_generation`
- `urgente`
- `hibrido`

### Fuente de verdad (obligatoria)
- Principal: metafields de producto namespace `lcp`.
- Secundario: colecciones para descubrimiento/navegacion.
- Legacy temporal: tags solo como compatibilidad durante migracion.

### Metafields propuestos (namespace `lcp`)
- `flow_type` (single_line_text, enum)
- `service_category` (single_line_text, enum)
- `subflow_mode` (single_line_text, enum opcional para hibridos)
- `cta_primary_label` (single_line_text)
- `cta_primary_action` (single_line_text, enum: `add_to_cart`, `start_booking`, `open_quote_form`, `open_whatsapp`, `open_lead_form`)
- `requires_vehicle_data` (boolean)
- `requires_photos` (boolean)
- `requires_schedule` (boolean)
- `form_schema` (json)
- `whatsapp_phone` (single_line_text)
- `price_label_from` (boolean)
- `is_used_or_clearance` (boolean)

### Regla anti-hardcode
- Prohibido: reglas por `if collection.handle == ...`, `if title contains ...`.
- Permitido: router por `product.metafields.lcp.flow_type` y parametrizacion por metafields.

### Enfoque de render recomendado
- Mantener `sections/main-product.liquid` como entrypoint.
- Crear router reusable:
- `snippets/lcp-product-flow-router.liquid`
- Crear vistas por flujo:
- `snippets/lcp-flow-ecommerce.liquid`
- `snippets/lcp-flow-reserva-directa.liquid`
- `snippets/lcp-flow-cotizacion.liquid`
- `snippets/lcp-flow-lead-generation.liquid`
- `snippets/lcp-flow-urgente.liquid`
- `snippets/lcp-flow-hibrido.liquid`
- Renderer de campos dinamicos:
- `snippets/lcp-service-fields-dynamic.liquid`

### Rollout por fases (sin ejecutar aun)
1. Fase A: contrato de metafields y mapeo de categorias.
2. Fase B: router minimo (`ecommerce` + `cotizacion`) con feature flag.
3. Fase C: `reserva_directa`, `hibrido`, `urgente`, `lead_generation`.
4. Fase D: QA responsive/WCAG + ajuste visual premium.
5. Fase E: migracion de catalogo y retiro progresivo de reglas legacy.

### Riesgos y mitigaciones
- Riesgo: regresion en checkout nativo.
- Mitigacion: no tocar flujo ecommerce si `flow_type` no aplica.
- Riesgo: coexistencia tags/metafields.
- Mitigacion: periodo dual con precedencia clara de metafields.
- Riesgo: complejidad en hibridos.
- Mitigacion: `subflow_mode` y `form_schema` como contrato cerrado.

### Rollback
- Feature flag global `lcp_enable_flow_router` (theme setting) para apagar router y volver a comportamiento previo.
- Reversion por lote/commit sin mezclar funcionalidades.
- Mantener tags legacy activos hasta cierre de migracion.

### Criterio de aceptacion
- Cada producto renderiza UI correcta segun `lcp.flow_type`.
- `ecommerce` mantiene carrito/checkout Shopify nativo.
- `cotizacion/urgente/lead_generation` no exponen checkout directo.
- Hibridos cambian comportamiento por `subflow_mode`.
- Compatible mobile + teclado + lectura accesible (WCAG base).

## Aceptacion operativa
Mientras no se indique lo contrario, este proyecto se ejecuta bajo este acuerdo:
- cambios controlados
- revision por fases
- aprobacion antes de publicar
- prioridad a seguridad, claridad y reversibilidad
