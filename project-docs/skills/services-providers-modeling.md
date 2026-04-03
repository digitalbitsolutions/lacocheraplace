# Skill: Services and Providers Modeling

## Objetivo
Definir como representar servicios y talleres/proveedores dentro de Shopify.

## Cuando usarla
- Antes de redisenar la ficha de servicio
- Al crear listados de talleres
- Al planear metacampos o relaciones futuras

## Enfoque
- Diferenciar producto fisico vs servicio
- Definir atributos como duracion, ubicacion, proveedor y modalidad
- Disenar relacion `taller -> servicios`
- Preparar compatibilidad con una futura capa de booking

## Patron validado en tienda
- Las cards de servicio del home deben apuntar a la coleccion raiz del servicio, no a una coleccion concreta de un proveedor
- La coleccion raiz del servicio debe actuar como directorio de proveedores cuando el objetivo UX sea elegir taller antes que ver productos
- Ejemplo confirmado:
- Home `Pulido y detailing de coches` -> `/collections/detailing`
- `/collections/detailing` -> cards de proveedores `Detailing - La Cochera Place` y `Detailing - Barcelona Laundry`
- Cada card de proveedor dentro de ese directorio debe enlazar al catalogo completo del proveedor mediante la vendor collection de Shopify
- Patron completo confirmado: `card de servicio -> coleccion raiz del servicio -> listado de proveedores -> catalogo completo del proveedor`

## Implementacion actual de referencia
- Plantilla: [collection.collection-proveedores.json](/d:/development/lacocheraplace.com/theme-dawn-export/templates/collection.collection-proveedores.json)
- Seccion: [service-provider-directory.liquid](/d:/development/lacocheraplace.com/theme-dawn-export/sections/service-provider-directory.liquid)
- La replicacion correcta para otras categorias consiste en ampliar el mapeo `collection.handle -> provider_handles` dentro de esa seccion

## Registro de proveedores implementado en v1
- La alta publica de proveedores se resuelve con una pagina dedicada y un formulario de contacto extendido
- Plantilla publica: [page.quiero-ser-proveedor.json](/d:/development/lacocheraplace.com/theme-dawn-export/templates/page.quiero-ser-proveedor.json)
- Seccion del formulario: [provider-application-form.liquid](/d:/development/lacocheraplace.com/theme-dawn-export/sections/provider-application-form.liquid)
- Script de serializacion del formulario: [provider-application-form.js](/d:/development/lacocheraplace.com/theme-dawn-export/assets/provider-application-form.js)
- Estilos del formulario: [section-provider-application-form.css](/d:/development/lacocheraplace.com/theme-dawn-export/assets/section-provider-application-form.css)
- Definicion objetivo del perfil enriquecido: [provider_profile_metaobject_definition.json](/d:/development/lacocheraplace.com/sample-data/provider_profile_metaobject_definition.json)
- Helper de aprobacion manual + geocodificacion: [provider_approval_workflow.py](/d:/development/lacocheraplace.com/scripts/provider_approval_workflow.py)
- Runbook operativo: [provider-registration-workflow.md](/d:/development/lacocheraplace.com/project-docs/provider-registration-workflow.md)

## Regla de convivencia actual
- `product.vendor` sigue siendo necesario para el storefront actual
- `provider_profile` sera la fuente enriquecida para ubicacion, reputacion, geolocalizacion y ficha futura del proveedor
- El enlace estable recomendado entre catalogo y perfil es `provider_slug`

## Entregables
- Modelo conceptual
- Campos necesarios
- Opciones de implementacion en Shopify
- Riesgos y limitaciones
