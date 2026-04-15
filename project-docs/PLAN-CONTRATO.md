# PLAN / CONTRATO OPERATIVO

## Proyecto
- Nombre: `La Cochera Place`
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

### No incluido por ahora
- Publicacion directa a produccion
- Integraciones SaaS completas
- Sistema de reservas avanzado ya operativo
- Automatizaciones complejas del Admin de Shopify
- Cambios destructivos sobre el theme activo

## Principios de ejecucion
- Todo cambio empieza en local
- No se trabaja directamente sobre produccion
- Cada iteracion debe ser pequena, visible y reversible
- No se elimina codigo sin justificacion
- Se reutiliza Dawn siempre que ayude a reducir riesgo
- Ningun cambio se considera final sin validacion
- Las iniciativas nuevas deben tener rollout gradual y rollback explicito

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

## Siguiente paso recomendado
Continuar la iniciativa de compra guiada por matricula en este orden:
- infraestructura app: URL estable de hosting externo + redeploy de app con redirects/proxy/webhooks fijos
- lote 3: aplicar piloto opt-in real en productos objetivo desde `Purchase Flow`
- lote 4: bloque de intake en `main-product.liquid`
- lote 5: webhook `orders/create` y trazabilidad end-to-end

## Aceptacion operativa
Mientras no se indique lo contrario, este proyecto se ejecuta bajo este acuerdo:
- cambios controlados
- revision por fases
- aprobacion antes de publicar
- prioridad a seguridad, claridad y reversibilidad
