# PRD

## Nombre
La Cochera Place

## Vision de producto
Transformar el theme actual de Shopify en una experiencia que se perciba como un marketplace de servicios automotrices, no como un e-commerce tradicional.

## Roles del proyecto
- Owner de negocio: `Ches`
- Dev responsable: `Meeguel`
- Asistente tecnico: `Codex`

## Modelo de negocio
- Marketplace: conecta clientes con talleres y monetiza por comision
- SaaS: software y herramientas para talleres mediante suscripcion

## Servicios principales
- Lavado
- Detailing
- PPF
- Polarizado / parabrisas
- Chapa y pintura
- Mecanica basica
- Llanteria
- Parking
- Venta de productos
- Capacitaciones

## Iniciativa activa: catalogo carwash Ches
El owner propone un primer catalogo operativo de carwash/detailing para convertirlo en piloto Shopify.

Servicios del piloto:
- Lavado completo
- Lavado de vapor interior
- Lavado de salon / detailing interior
- Limpieza de motor a vapor
- Pulido de faros
- Pulido de pintura
- Descontaminado de pintura
- Recubrimiento ceramico Carpro
- Cueros / aros

Modelo comercial confirmado:
- Si habra checkout nativo Shopify para servicios con precio cerrado
- No se usaran plataformas de cobro externas para el piloto
- Los servicios a cotizar mantienen flujo consultivo
- Los precios finales deben estar aprobados por Ches antes de publicar

## Objetivo UX
- Que la homepage explique claramente que se puede reservar o solicitar un servicio
- Que el usuario entienda categorias, proveedores y siguiente paso
- Que el sitio reduzca senales de tienda clasica donde no aporten valor

## Problemas actuales detectados
- La home ya habla de servicios, pero la logica principal sigue siendo de catalogo Shopify
- La ficha de producto sigue siendo una ficha de compra tradicional
- No existe una entidad clara para talleres/proveedores
- No existe capa de reserva/cita en el theme actual

## Requisitos funcionales iniciales
- Homepage con estructura tipo marketplace
- Ficha de servicio en lugar de ficha de producto clasica
- Representacion visible de talleres o proveedores
- CTAs orientados a reservar, solicitar o contactar
- Capacidad de trabajar en borrador y revertir cambios
- Catalogo piloto carwash como productos Shopify nativos
- Variantes por tipo de vehiculo para servicios con precio cerrado
- Diferenciacion clara entre servicios comprables y servicios consultivos

## Requisitos no funcionales
- No romper funcionalidades existentes
- Reutilizar componentes de Dawn cuando sea util
- Mantener un camino de rollback claro
- Trabajar con cambios pequenos y revisables
- Priorizar soluciones nativas de Shopify antes que app/proxy/custom backend
- No inventar nuevas entidades si `product`, `variant`, `vendor`, `collection`, `tags` o metafields resuelven el caso
- Mantener escalabilidad para mas proveedores y categorias
- Pausar y decidir con Meeguel si aparece un obstaculo de datos, checkout o arquitectura

## Alcance de la fase actual
- Actualizar contexto y roadmap
- Definir modelo Shopify nativo para catalogo carwash
- Preparar CSV draft importable
- Validar ficha de servicio checkout/consultiva
- Implementacion controlada en local y theme borrador

## Fuera de alcance por ahora
- Automatizaciones SaaS completas
- Integraciones complejas de reservas
- Cambios irreversibles sobre el theme publicado
- Retomar compra guiada por matricula antes de cerrar el piloto carwash
- Publicar servicios con precios no aprobados por Ches
