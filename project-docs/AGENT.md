# AGENT

## Rol del agente
Actuar como arquitecto tecnico y ejecutor del theme, priorizando seguridad, reversibilidad y progreso visible.

## Roles humanos
- Ches: owner de negocio y aprobador de precios/contenido comercial
- Meeguel: dev responsable de ejecutar, revisar y decidir junto con Codex ante bloqueos
- Codex: asistente tecnico, arquitecto de soporte y ejecutor local bajo aprobacion

## Principios de trabajo
- Entender antes de modificar
- Cambios pequenos y comprobables
- Reutilizar antes que duplicar
- No eliminar logica sin justificar
- Mantener trazabilidad de cada cambio

## Modo de colaboracion
- El trabajo principal ocurre en local
- Cada iteracion debe terminar en algo visible o claramente verificable
- El usuario valida cada etapa antes de continuar

## Entregables por cambio
- Objetivo del cambio
- Archivos tocados
- Impacto funcional
- Riesgos
- Siguiente paso sugerido

## Reglas de seguridad
- No modificar produccion directamente
- No publicar sin aprobacion
- No revertir cambios del usuario sin permiso
- Si una decision afecta arquitectura o datos, pausar y confirmar
- Si aparece un obstaculo tecnico o de negocio, analizar opciones y decidir entre Codex y Meeguel antes de seguir
- No usar dependencias externas, tuneles o app proxy cuando Shopify nativo cubra el caso
- Google Maps queda permitido donde el producto lo requiera, especialmente en formularios de ubicacion/proveedor

## Regla funcional confirmada
- En homepage, una card de servicio no debe abrir una coleccion de servicios de un proveedor concreto
- El patron correcto es `card de servicio -> coleccion raiz del servicio -> listado de proveedores disponibles para ese servicio`
- Ejemplo validado: `Pulido y detailing de coches` enlaza a `/collections/detailing` y esa pagina muestra cards de proveedores como `Detailing - La Cochera Place` y `Detailing - Barcelona Laundry`
- Si una categoria necesita este patron, la logica debe resolverse en la plantilla de coleccion de proveedores, no duplicando paginas manuales por cada card del home

## Regla funcional confirmada 2
- Dentro del directorio de proveedores, una card de proveedor no debe abrir una coleccion limitada a una sola categoria cuando el objetivo UX sea ver toda su oferta
- El patron correcto es `card de servicio -> coleccion raiz del servicio -> listado de proveedores -> catalogo completo del proveedor`
- Implementacion validada: la card del proveedor debe enlazar a la vendor collection de Shopify (`/collections/vendors?q=Proveedor`) para mostrar todos los productos y servicios de ese proveedor

## Regla funcional confirmada 3: catalogo carwash Ches
- El catalogo carwash de Ches se implementa como productos Shopify nativos, no como paginas sueltas
- Los servicios con precio cerrado tendran checkout nativo Shopify
- Los servicios con precio `Consultar` no deben permitir checkout directo
- La distincion entre servicio comprable y consultivo se resuelve con tags importables por CSV: `service-flow-checkout` y `service-flow-consultative`
- Variantes visibles confirmadas para servicios cerrados: `Coche`, `SUV`, `7 plazas`
- Proveedor piloto confirmado: `La Cochera Place`
- Los precios finales en EUR requieren aprobacion de Ches antes de publicar
- La compra guiada por matricula queda pausada mientras se cierra este piloto para no mezclar responsabilidades
- El metafield `service.purchase_flow` queda reservado para la compra guiada por matricula, no para el piloto carwash

## Regla funcional confirmada 4: estandar editorial de blog
- El blog usa un layout editorial nativo en `main-article` + `section-blog-post.css`.
- Los articulos SEO deben mantener:
- fecha + titulo dominante + metadata de lectura
- hero principal
- secciones con jerarquia clara
- soporte de tabla comparativa y bloque `.article-grid` en contenido
- Todas las imagenes nuevas para articulos se suben en `webp`.

## Registro de proveedores v1
- El alta de proveedores no reutiliza `customers/register`
- El patron actual es `pagina publica Quiero ser proveedor -> formulario validado con Google Maps -> dual write a email admin + provider_application_request -> revision desde app admin -> aprobacion/declinacion -> creacion de metaobject provider_profile`
- En v1.1 la solicitud publica ya crea un registro estructurado `provider_application_request` en Shopify, pero no crea automaticamente el proveedor operativo ni publica el perfil
- La fuente de verdad enriquecida prevista para proveedores es el metaobject `provider_profile`
- La bandeja operativa del owner vive en la custom app embebida `Laco Prov Admin`
- Los estados operativos confirmados son `pending`, `approved` y `declined`
- Mientras dure la transicion, el catalogo publico sigue siendo compatible con `product.vendor`
- Regla operativa de catalogo QA: no deben existir productos de prueba sin `vendor` asignado; cada producto o servicio sembrado para pruebas debe quedar asociado a un proveedor concreto
- Para cargas masivas de catalogo desde la app, `Laco Prov Admin` ya requiere permisos `read_products` y `write_products`
- La guia operativa y el helper de aprobacion viven en `project-docs/provider-registration-workflow.md`, `scripts/provider_approval_workflow.py` y `shopify-provider-admin/`

## Definicion de terminado por iteracion
- El cambio compila o queda estructuralmente valido
- Existe diff revisable
- Existe explicacion breve
- Existe opcion clara de rollback
