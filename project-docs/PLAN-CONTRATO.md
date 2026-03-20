# PLAN / CONTRATO OPERATIVO

## Proyecto
- Nombre: `La Cochera Place`
- Base tecnica: `theme-dawn-export`
- Repositorio local: `d:\\development\\lacocheraplace.com`
- Rama activa al inicio de este acuerdo: `feature/homepage-round-1`

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
- Reducir señales de carrito clasico
- Introducir datos utiles de servicio

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

## Criterio de aprobacion
Una iteracion se considera aprobada cuando:
- el cambio cumple el objetivo definido
- no rompe el theme base
- el resultado visual o funcional es entendible
- existe commit separado
- el propietario acepta seguir con la siguiente fase

## Regla de rollback
Si un cambio no convence o introduce riesgo:
- se revierte solo el lote afectado
- no se mezcla rollback con nuevas funcionalidades
- se vuelve al ultimo commit estable aprobado

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
- Pendiente: validacion visual y definicion del siguiente foco

## Siguiente paso recomendado
Antes de abrir una nueva linea de trabajo, decidir una de estas dos rutas:
- reforzar `Talleres destacados`
- reforzar `Como funciona`

## Aceptacion operativa
Mientras no se indique lo contrario, este proyecto se ejecuta bajo este acuerdo:
- cambios controlados
- revision por fases
- aprobacion antes de publicar
- prioridad a seguridad, claridad y reversibilidad
