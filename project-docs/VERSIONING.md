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
- Rama de trabajo actual: `feature/homepage-round-1`
- Baseline remoto publicado en `origin/main`

## Hitos guardados
- `335f889` baseline original del proyecto
- `8ffc73b` primera ronda controlada de homepage
- `1762372` organizacion documental + skill Shopify marketplace
- `828f848` segunda ronda de homepage con navegacion y proveedores

## Siguiente regla operativa
- No abrir una nueva linea de trabajo sin decidir primero si la siguiente iteracion sera UX de homepage, talleres/proveedores o ficha de servicio
