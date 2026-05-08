# VERSIONING

## Objetivo
Tener una forma simple de avanzar, revisar y volver atras si algo sale mal o no se aprueba.

## Estrategia recomendada
- Mantener siempre una copia intacta del export original
- Trabajar sobre `theme-dawn-export`
- Agrupar cambios en lotes pequenos y tematicos
- Revisar diff antes de considerar una subida

## Regla de rollback
- Si un cambio no gusta, se revierte solo el lote afectado
- No mezclar muchos objetivos en una misma iteracion

## Convencion sugerida para cambios
- Lote 01: homepage
- Lote 02: header/footer
- Lote 03: ficha servicio
- Lote 04: cards y listados
- Lote C0: contexto catalogo carwash Ches
- Lote C1: modelo Shopify nativo carwash
- Lote C2: CSV draft carwash
- Lote C3: ficha servicio checkout/consultiva
- Lote C4: colecciones y navegacion carwash
- Lote C5: validacion, aprobacion y publicacion controlada
- Lote C5.1: asignacion de imagenes alojadas a productos carwash existentes

## Opciones de control de versiones

### Opcion minima
- Guardar snapshots o zips por hito aprobado

### Opcion recomendada
- Inicializar Git en este proyecto
- Hacer un commit base del export actual
- Crear un commit por cada lote aprobado

## Politica de subida a Shopify
- Solo desde una version local ya revisada
- Preferiblemente a theme borrador
- Nunca directamente al theme activo sin aprobacion

## Estado actual del versionado
- Repositorio Git inicializado y conectado a remoto
- Rama base estable: `main`
- Rama de trabajo actual: `main` (adelantada sobre `origin/main`)
- Baseline remoto publicado en `origin/main`

## Hitos guardados
- `335f889` baseline original del proyecto
- `8ffc73b` primera ronda controlada de homepage
- `1762372` organizacion documental + skill Shopify marketplace
- `828f848` segunda ronda de homepage con navegacion y proveedores
- `c280404` tercera ronda de homepage con refuerzo de proveedores
- `c639114` lote 2: endpoint app proxy `service-precheck`
- `dee1061` lote 2: adaptador configurable de lookup por matricula
- `pendiente de commit` lote C5.1: asignacion de imagenes Shopify Files -> productos carwash por `handle`

## Estado de validacion visual
- Theme borrador creado en Shopify para validacion
- Nombre: `Codex Preview Homepage Round 3`
- ID: `196749918545`
- Store: `cs3msy-n8.myshopify.com`
- El piloto carwash debe validarse primero en local/draft y despues en theme borrador antes de publicar

## Nota de despliegue app
- Se publico una release de la app en Shopify Partners, pero con URL temporal de tunel caducada
- Pendiente: migrar `application_url` a hosting estable y volver a desplegar para acceso online continuo
- El piloto carwash no debe depender de la app ni de tuneles si se puede resolver con productos, variantes, colecciones y checkout nativo Shopify

## Siguiente regla operativa
- La siguiente linea de trabajo confirmada es `catalogo piloto carwash Ches`
- Cada lote carwash debe ser reversible y verificable antes de avanzar al siguiente
- No publicar productos carwash con precios EUR no aprobados por Ches
- Si se detecta un bloqueo de arquitectura, datos o checkout, se documenta y se decide entre Codex y Meeguel antes de ejecutar
- Validacion operativa 2026-05-08: asignacion de galerias completada en 9 productos carwash sin duplicar `Lavado Completo`
