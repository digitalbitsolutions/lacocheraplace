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
