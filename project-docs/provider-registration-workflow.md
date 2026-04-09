# Provider Registration Workflow

## Objetivo
Implementar un alta de proveedores separada del registro de clientes, con revision manual, geocodificacion Google y perfil enriquecido en Shopify Metaobjects.

## Estado actual
- El formulario publico de alta vive en [provider-application-form.liquid](/d:/development/lacocheraplace.com/theme-dawn-export/sections/provider-application-form.liquid)
- La pagina publica prevista usa [page.quiero-ser-proveedor.json](/d:/development/lacocheraplace.com/theme-dawn-export/templates/page.quiero-ser-proveedor.json)
- La solicitud se sigue serializando en `contact[body]` con un bloque legible para email admin
- Ademas, el formulario ya crea un registro estructurado `provider_application_request` mediante app proxy
- El formulario puede capturar `google_place_id`, `latitude` y `longitude` cuando el usuario selecciona una sugerencia de Google Maps
- La consola del owner ya existe como custom app embebida en Shopify Admin: `Laco Prov Admin`
- La definicion objetivo del perfil esta descrita en [provider_profile_metaobject_definition.json](/d:/development/lacocheraplace.com/sample-data/provider_profile_metaobject_definition.json)
- El helper manual de aprobacion sigue disponible en [provider_approval_workflow.py](/d:/development/lacocheraplace.com/scripts/provider_approval_workflow.py) como soporte o migracion

## Flujo actual
1. El proveedor abre la pagina publica `Quiero ser proveedor`
2. Completa datos del negocio, contacto, direccion, categorias, descripcion y enlaces
3. El formulario genera:
   - `submission_id`
   - `provider_slug`
   - `status = pending`
   - `google_place_id`, `latitude` y `longitude` si se selecciona una sugerencia de Google
4. Shopify recibe la solicitud como contacto extendido para email de respaldo
5. En paralelo, la custom app crea un metaobject `provider_application_request`
6. El owner revisa la solicitud desde `Laco Prov Admin`
7. Si procede, la app aprueba o declina la solicitud
8. Al aprobar, se reutilizan las coordenadas del formulario; si faltan, el helper manual puede seguir geocodificando con Google Maps Geocoding API
9. Con coordenadas validas se crea el metaobject `provider_profile`
10. Despues se vincula o prepara el catalogo del proveedor en Shopify

## Metaobject intermedio de solicitudes
Tipo: `provider_application_request`

Estados operativos:
- `pending`
- `approved`
- `declined`

Campos clave:
- `submission_id`
- `status`
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
- `google_place_id`
- `latitude`
- `longitude`
- `account_holder`
- `tax_id`
- `iban`
- `bank_name`
- `bank_country`
- `service_categories`
- `description`
- `opening_hours`
- `website_url`
- `instagram_url`
- `logo_source_url`
- `gallery_source_urls`
- `decline_reason`
- `submitted_at`
- `reviewed_at`
- `reviewed_by_email`
- `provider_profile_handle`
- `provider_profile_id`

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

## Gestion desde Shopify Admin
### App embebida
- La gestion principal del owner ahora ocurre en `Laco Prov Admin`
- La app lista solicitudes por estado: `Pending`, `Approved` y `Declined`
- La vista de detalle permite revisar negocio, contacto, ubicacion, geodatos, datos fiscales/bancarios y activos
- `Aprobar` crea el `provider_profile` y mueve la solicitud a `approved`
- `Declinar` exige motivo y mueve la solicitud a `declined`

## Aprobacion manual complementaria
### Consola ligera local
- Existe una interfaz local ligera en [provider_approval_console.py](/d:/development/lacocheraplace.com/scripts/provider_approval_console.py)
- Permite pegar el cuerpo del email, parsear campos, revisar datos, guardar borradores privados y decidir `aprobar` o `declinar`
- Se ejecuta asi:

```powershell
& "C:\Users\Meeguel\AppData\Local\Programs\Python\Python314\python.exe" scripts/provider_approval_console.py
```

- Luego abrir en navegador:

```text
http://127.0.0.1:8765
```

- Los borradores privados se guardan en `private-data/provider-approvals/`

### Paso 1. Revisar la solicitud
- Confirmar que los datos clave existen
- Confirmar consentimiento y categorias
- Corregir inconsistencias antes de aprobar
- Si el nombre visible en catalogo debe diferir del nombre comercial, completar `catalog_vendor_name`

### Paso 2. Preparar JSON aprobado
- Copiar la solicitud a un JSON estructurado
- Usar como referencia [provider_application_approved_example.json](/d:/development/lacocheraplace.com/sample-data/provider_application_approved_example.json)
- Para aprobaciones reales, partir de [provider_application_approval_template.json](/d:/development/lacocheraplace.com/sample-data/provider_application_approval_template.json) y pegar los datos que lleguen por email

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
- La solicitud deja `pending` y pasa a `approved`
- Existe un `provider_profile` con `status = approved`
- El proveedor tiene coordenadas persistidas
- El equipo ya puede usar ese perfil para:
  - geolocalizacion
  - directorios enriquecidos
  - reputacion y valoraciones futuras
  - compatibilidad progresiva con el catalogo existente

## Resultado esperado tras declinar
- La solicitud deja `pending` y pasa a `declined`
- Se conserva el detalle de la solicitud
- Se guarda `decline_reason`
- No se crea `provider_profile`

## Limitaciones conocidas
- La app embebida depende de un host/tunel estable mientras no se despliegue a infraestructura fija
- El formulario publico no crea paginas ni recursos de Shopify por si solo
- El formulario no sube archivos binarios; en v1 recoge URLs de logo y galeria
- El email sigue existiendo como respaldo temporal
- El storefront actual sigue resolviendo la oferta principalmente por `product.vendor`
- La union fuerte entre catalogo y perfil enriquecido debe basarse en `provider_slug`

## Siguiente evolucion recomendada
- Desplegar la custom app a una URL estable para eliminar dependencia de tuneles temporales
- Añadir notificacion opcional al proveedor tras `approved` o `declined`
- Sustituir gradualmente directorios basados solo en `vendor` por lecturas de `provider_profile`
- Implementar geolocalizacion de proveedores cercanos usando `latitude` y `longitude`
