# Provider Registration Workflow

## Objetivo
Implementar un alta de proveedores separada del registro de clientes, con revision manual, geocodificacion Google y perfil enriquecido en Shopify Metaobjects.

## Estado actual
- El formulario publico de alta vive en [provider-application-form.liquid](/d:/development/lacocheraplace.com/theme-dawn-export/sections/provider-application-form.liquid)
- La pagina publica prevista usa [page.quiero-ser-proveedor.json](/d:/development/lacocheraplace.com/theme-dawn-export/templates/page.quiero-ser-proveedor.json)
- La persistencia inicial se hace mediante `form 'contact'`
- La solicitud se serializa en `contact[body]` con un bloque legible para email admin
- El formulario puede capturar `google_place_id`, `latitude` y `longitude` cuando el usuario selecciona una sugerencia de Google Maps
- La definicion objetivo del perfil esta descrita en [provider_profile_metaobject_definition.json](/d:/development/lacocheraplace.com/sample-data/provider_profile_metaobject_definition.json)
- El helper manual de aprobacion esta en [provider_approval_workflow.py](/d:/development/lacocheraplace.com/scripts/provider_approval_workflow.py)

## Flujo v1
1. El proveedor abre la pagina publica `Quiero ser proveedor`
2. Completa datos del negocio, contacto, direccion, categorias, descripcion y enlaces
3. El formulario genera:
   - `submission_id`
   - `provider_slug`
   - `status = pending`
   - `google_place_id`, `latitude` y `longitude` si se selecciona una sugerencia de Google
4. Shopify recibe la solicitud como contacto extendido
5. El equipo revisa la solicitud manualmente
6. Si procede, se reutilizan las coordenadas del formulario; si faltan, se geocodifica la direccion con Google Maps Geocoding API
7. Con coordenadas validas se crea el metaobject `provider_profile`
8. Despues se vincula o prepara el catalogo del proveedor en Shopify

## Campos capturados en el formulario
- `display_name`
- `legal_name`
- `catalog_vendor_name`
- `contact_name`
- `email`
- `phone`
- `whatsapp`
- `address_line_1`
- `address_line_2`
- `city`
- `postal_code`
- `province_or_region`
- `country`
- `google_place_id`
- `latitude`
- `longitude`
- `service_categories`
- `description`
- `opening_hours`
- `website_url`
- `instagram_url`
- `logo_source_url`
- `gallery_source_urls`
- `provider_slug`
- `submission_id`
- `status`

## Metaobject objetivo
Tipo: `provider_profile`

Campos previstos:
- `provider_slug`
- `display_name`
- `legal_name`
- `catalog_vendor_name`
- `contact_name`
- `email`
- `phone`
- `whatsapp`
- `address_line_1`
- `address_line_2`
- `city`
- `postal_code`
- `province_or_region`
- `country`
- `latitude`
- `longitude`
- `google_place_id`
- `service_categories`
- `description`
- `opening_hours`
- `logo`
- `gallery`
- `logo_source_url`
- `gallery_source_urls`
- `website_url`
- `instagram_url`
- `status`
- `source_submission_id`

## Aprobacion manual
### Paso 1. Revisar la solicitud
- Confirmar que los datos clave existen
- Confirmar consentimiento y categorias
- Corregir inconsistencias antes de aprobar
- Si el nombre visible en catalogo debe diferir del nombre comercial, completar `catalog_vendor_name`

### Paso 2. Preparar JSON aprobado
- Copiar la solicitud a un JSON estructurado
- Usar como referencia [provider_application_approved_example.json](/d:/development/lacocheraplace.com/sample-data/provider_application_approved_example.json)

### Paso 3. Geocodificar y crear el perfil
Variables necesarias:
- `SHOPIFY_STORE`
- `SHOPIFY_ADMIN_TOKEN`
- `GOOGLE_MAPS_API_KEY` solo si el JSON aprobado no trae `latitude` y `longitude`

Dry run de definicion:
```powershell
python scripts/provider_approval_workflow.py definition
```

Crear definicion en Shopify:
```powershell
python scripts/provider_approval_workflow.py definition --execute
```

Dry run de aprobacion:
```powershell
python scripts/provider_approval_workflow.py approve --input sample-data/provider_application_approved_example.json
```

Si el JSON aprobado ya incluye `google_place_id`, `latitude` y `longitude`, el helper reutiliza esos valores y no necesita geocodificar.

Crear metaobject aprobado:
```powershell
python scripts/provider_approval_workflow.py approve --input sample-data/provider_application_approved_example.json --execute
```

## Resultado esperado tras aprobar
- Existe un `provider_profile` con `status = approved`
- El proveedor tiene coordenadas persistidas
- El equipo ya puede usar ese perfil para:
  - geolocalizacion
  - directorios enriquecidos
  - reputacion y valoraciones futuras
  - compatibilidad progresiva con el catalogo existente

## Limitaciones conocidas de v1
- El formulario publico no crea paginas ni recursos de Shopify por si solo
- El formulario no sube archivos binarios; en v1 recoge URLs de logo y galeria
- La aprobacion no es automatica
- El storefront actual sigue resolviendo la oferta principalmente por `product.vendor`
- La union fuerte entre catalogo y perfil enriquecido debe basarse en `provider_slug`

## Siguiente evolucion recomendada
- Crear page resource en Shopify y asignarle la plantilla `page.quiero-ser-proveedor`
- Crear la definicion `provider_profile` en Admin
- Sustituir gradualmente directorios basados solo en `vendor` por lecturas de `provider_profile`
- Implementar geolocalizacion de proveedores cercanos usando `latitude` y `longitude`
