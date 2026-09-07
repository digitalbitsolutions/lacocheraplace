# ROADMAP: Catalogo carwash Ches

## Objetivo
Convertir la propuesta de servicios de Ches en un piloto Shopify nativo para La Cochera Place, con catalogo, variantes, checkout cuando corresponda y flujo consultivo cuando el servicio requiera cotizacion.

## Decisiones confirmadas
- Owner de negocio: `Ches`
- Dev responsable: `Meeguel`
- Asistente tecnico: `Codex`
- Proveedor piloto: `La Cochera Place`
- Mercado storefront: `Espana`
- Base tecnica: Shopify nativo sobre `theme-dawn-export`
- Checkout: si, solo para servicios con precio cerrado
- Servicios consultivos: sin checkout directo
- Variante de vehiculo: `Coche`, `SUV`, `7 plazas`
- Precios EUR: pendientes de aprobacion de Ches antes de publicar

## Servicios del piloto

### Con checkout nativo
- Lavado Completo
- Lavado Vapor
- Lavado Salon
- Motor a Vapor
- Pulido Faros

### Consultivos
- Pulido Pintura
- Descontaminado
- Ceramico Carpro
- Cueros / Aros

## Lotes de ejecucion

### C0. Contexto y contrato
- Actualizar `TASKS.md`, `PRD.md`, `PLAN-CONTRATO.md`, `AGENT.md` y `VERSIONING.md`
- Registrar que la compra guiada por matricula queda pausada
- Confirmar que el piloto carwash usa Shopify nativo
- Salida: documentos alineados y diff revisable

### C1. Modelo Shopify nativo
- Definir columnas de CSV y reglas de producto
- Definir tags y colecciones objetivo
- Definir forma global de distinguir servicios con checkout y consultivos
- Salida: modelo aprobado antes de crear catalogo
- Contrato: `project-docs/CARWASH-SHOPIFY-MODEL.md`
- Control de flujo: tags `service-flow-checkout` y `service-flow-consultative`
- El metafield `service.purchase_flow` queda reservado para la compra guiada por matricula

### C2. CSV draft
- Crear CSV en `sample-data/`
- Incluir 9 productos de servicio
- Usar `Status = draft` y `Published on online store = false`
- Incluir variantes en servicios de checkout
- Marcar servicios consultivos sin compra directa
- Salida: CSV importable y revisable

### C3. Ficha de servicio
- Verificar `main-product.liquid`
- Mantener checkout nativo para servicios cerrados
- Mostrar formulario/CTA consultivo para servicios `Consultar`
- No romper productos fisicos ni servicios existentes
- Salida: preview con un servicio comprable y uno consultivo

### C4. Colecciones y navegacion
- Enlazar servicios a colecciones raiz (`lavado`, `detailing` u otras existentes)
- Mantener patron validado: servicio -> coleccion raiz -> proveedor -> catalogo completo del proveedor
- Salida: navegacion coherente desde home, coleccion y ficha

### C5. Validacion y publicacion controlada
- Importar en borrador o entorno seguro
- Revisar precios EUR con Ches
- Validar con Meeguel
- Publicar solo con aprobacion explicita
- Salida: piloto aprobado o rollback claro

## Criterios de aceptacion
- Los 9 servicios existen como productos Shopify
- Los servicios 1-5 tienen variantes `Coche`, `SUV`, `7 plazas`
- Los servicios 1-5 pueden usar checkout nativo cuando tengan precio EUR aprobado
- Los servicios 6-9 no permiten checkout directo
- El proveedor `La Cochera Place` agrupa el catalogo
- El theme no rompe productos fisicos ni servicios demo existentes
- Ningun paso requiere tunel, app proxy o backend externo para funcionar

## Regla de bloqueo
Si surge un obstaculo con precios, modelado Shopify, checkout, colecciones, privacidad o publicacion, se pausa el lote y se decide entre Codex y Meeguel antes de ejecutar cambios adicionales.

## Dependencia de directorio: Chiclayo

El directorio de proveedores funciona en produccion a traves del app proxy. El 2026-09-07 se confirmaron 12 perfiles aprobados de Chiclayo: Ricar Multicenter, AUTOMAN CHICLAYO E.I.R.L., Automotriz Burga, Automotriz Palomino., Lubricentro Y Lavadero Oasis, Baterias USCAY, Motor Shop fuel injection, CAMPOS MOTORS, Taller Central Motors, Comercio & Cia - Llantas, CARROCERIAS HERRERA y Davalos Import SA.

Estos perfiles no deben confundirse con servicios comercializables: las colecciones publicas listan proveedores desde productos Shopify y todavia no hay un catalogo autorizado asociado a este lote. El siguiente paso es obtener de cada negocio los servicios, precios PEN, disponibilidad y recursos visuales con permiso. Los tres perfiles con estado `needs_contact` requieren confirmacion directa antes de publicar.

El 2026-09-07 se cargaron 22 ofertas investigadas como productos `DRAFT`, sin precio ni publicacion. Cada oferta conserva su proveedor, categoria normalizada, fuente de evidencia y estado de verificacion. Baterias USCAY se modelo con tres ofertas separadas: venta de baterias, instalacion de baterias y delivery de baterias. Se activó únicamente `Equipamiento automotriz` de Ricar Multicenter para revisión visual pública en `/products/equipamiento-automotriz-ricar-multicenter`; las otras 21 ofertas siguen en borrador. Antes de una publicación comercial deben confirmarse precio PEN, cobertura, condiciones y autorización comercial.

Como recurso visual de prueba se asigno una imagen ya alojada en Shopify a cada uno de los 22 borradores, reutilizada de forma consistente por categoria. Las 12 fichas enriquecidas de proveedor requieren una actualizacion a traves de la aplicacion productiva, porque son metaobjetos gestionados por esa app y no son accesibles a la credencial de catalogo. Estas imagenes son demostrativas y se reemplazaran antes de la publicacion comercial.

La pantalla owner `Imágenes proveedores` fue desplegada en el hosting productivo el 2026-09-07. Las 12 fichas `provider_profile` se actualizaron con su imagen demostrativa mediante la sesion offline de la aplicacion, sin perfiles faltantes.

El 2026-09-07 se corrigieron los dos textos fijos que se habían cargado con codificación defectuosa en las 22 descripciones de servicio de Chiclayo. Las fichas usan ahora `Fuente de verificación` y `Estado de verificación` con caracteres UTF-8 correctos.

El servicio público de prueba `Equipamiento automotriz — Ricar Multicenter` usa el flujo `cotizacion`. Su ficha consulta los metadatos del producto `lcp.flow_type`, `lcp.whatsapp_phone`, `lcp.whatsapp_message` y `lcp.cta_primary_label`: oculta compra y pago, y dirige al WhatsApp del proveedor con una consulta prellenada. El patrón es reutilizable y no contiene reglas por proveedor o título.
