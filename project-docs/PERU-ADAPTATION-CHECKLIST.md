# Peru Adaptation Checklist

## Objetivo
Adaptar el proyecto Shopify actual a la realidad comercial, operativa y UX de Peru sin mezclar cambios de pais de forma desordenada.

Este documento no reemplaza la documentacion historica del proyecto. Sirve como hoja de migracion desde la base actual hacia una variante Peru.

## Hallazgos iniciales

### Estado actual
- La base tecnica sigue siendo Shopify + theme Dawn exportado.
- El proyecto contiene una mezcla de contexto Espana + Barcelona con algunas senales ya orientadas a Peru.
- Ejemplo claro: `theme-dawn-export/config/settings_data.json` ya incluye enlaces sociales `lacocheraperu`, pero gran parte del contenido del theme y los docs siguen acoplados a Espana.

### Acoplamientos principales a Espana detectados
- Moneda y pricing:
  - `EUR`
  - tags y reglas como `price-pending-eur`
- Geografia:
  - `Espana`
  - `Barcelona`
  - `Madrid`
  - barrios/proveedores mock como `Poblenou`, `Eixample`, `Sants`, `Chamartin`, `Ramblas`
- Fiscal/bancario:
  - `NIF/CIF`
  - validacion JS orientada a NIF/CIF
  - copy y placeholders de `IBAN`
  - listado de bancos/paises UE
- Home y colecciones:
  - cards y providers mock con naming claramente espanol
  - ciudades demo en `Barcelona`
  - textos de servicios y featured content con referencias locales a Espana
- Blog / SEO:
  - borradores y estandar editorial con foco Barcelona
- Formularios:
  - `google_maps_country_bias = es`
  - `google_maps_api_key` hardcodeada en template

### Senales ya orientadas a Peru
- `theme-dawn-export/config/settings_data.json`
  - `social_youtube_link = https://www.youtube.com/@LACOCHERAPERU`
  - `social_tiktok_link = https://www.tiktok.com/@lacocheraperu?...`
- Marca social parcialmente alineada con Peru, pero no el contenido operativo del storefront.

## Principio de migracion
- No intentar convertir todo de una sola vez.
- Mantener el proyecto funcional en cada lote.
- Priorizar primero los acoplamientos visibles y de negocio.
- Separar:
  - contenido y geografia
  - pricing y moneda
  - formularios/reglas de negocio
  - datos demo / proveedores mock
  - documentacion

## Lotes recomendados

### Lote P0. Congelar baseline Peru
- Crear punto de partida claro para la variante Peru.
- Mantener referencia de lo que sigue siendo legado Espana.
- Resultado esperado:
  - checklist Peru activo
  - siguientes lotes ejecutables sin ambiguedad

### Lote P1. Copy y geografia visible
- Sustituir referencias publicas de Espana/Barcelona por copy neutral o Peru.
- Revisar:
  - `theme-dawn-export/templates/index.json`
  - `theme-dawn-export/templates/page.como-funciona.json`
  - `theme-dawn-export/templates/page.contact.json`
  - `theme-dawn-export/sections/contact-form.liquid`
  - `theme-dawn-export/sections/home-category-provider-logos-slider.liquid`
  - `theme-dawn-export/sections/lc-home-featured-services.liquid`
  - `theme-dawn-export/sections/home-testimonials.liquid`
- Resultado esperado:
  - storefront sin referencias visibles a Barcelona/Espana
  - ciudades demo peruanas o copy neutral

### Lote P2. Moneda y pricing
- Sustituir referencias `EUR` por modelo Peru.
- Decidir contrato:
  - `PEN`
  - `S/`
  - tags nuevas tipo `price-pending-pen` si aplica
- Revisar:
  - docs de carwash
  - cards de home
  - mocks de search/collection/product
  - reportes y sample data donde siga siendo relevante
- Resultado esperado:
  - no quedan precios demo en EUR visibles en storefront Peru

### Lote P3. Providers y datos mock
- Reemplazar proveedores demo espanolizados por providers Peru o placeholders neutrales.
- Revisar:
  - `theme-dawn-export/templates/index.json`
  - `theme-dawn-export/snippets/provider-directory-grid.liquid`
  - `theme-dawn-export/sections/main-collection-product-grid.liquid`
  - exports/documentos usados para mapping de logos
- Resultado esperado:
  - directorio y home coherentes con Peru

### Lote P4. Formularios y reglas locales
- Adaptar `Quiero ser proveedor` a Peru.
- Cambios probables:
  - `country_bias = pe`
  - retirar browser key hardcodeada del theme
  - sustituir `NIF/CIF` por contrato Peru
  - revisar si el campo correcto es `RUC`, `DNI`, ambos, o texto libre temporal
  - revisar bancos sugeridos
  - revisar direccion, region/provincia/distrito si aplica
- Archivos principales:
  - `theme-dawn-export/sections/provider-application-form.liquid`
  - `theme-dawn-export/assets/provider-application-form.js`
  - `theme-dawn-export/assets/section-provider-application-form.css`
  - `theme-dawn-export/templates/page.quiero-ser-proveedor.json`
- Resultado esperado:
  - formulario alineado a Peru y sin secretos expuestos en theme

### Lote P5. Catalogo y colecciones
- Revisar si las categorias actuales siguen vigentes en Peru.
- Confirmar handles:
  - mantener los actuales si son genericamente validos
  - cambiar solo los handles excesivamente acoplados a Espana o con naming poco escalable
- Revisar:
  - `/collections/...`
  - hero search
  - categorias home
  - provider directory
- Resultado esperado:
  - taxonomia coherente para Peru sin romper navegacion

### Lote P6. Producto / service flow
- Mantener la arquitectura Shopify actual.
- Revalidar:
  - `service-flow-checkout`
  - `service-flow-consultative`
  - router `lcp.flow_type`
- Revisar si el piloto carwash Peru reutiliza la misma estructura o requiere otra.
- Resultado esperado:
  - misma base tecnica, distinta capa de negocio/localizacion

### Lote P7. Documentacion Peru
- Crear documentos equivalentes Peru para:
  - PRD
  - roadmap
  - task list
  - workflow de proveedores
  - catalogo piloto si cambia la oferta
- Resultado esperado:
  - la documentacion deja de empujar decisiones Espana cuando el equipo trabaje Peru

## Riesgos claros
- Mezclar contenido Peru con providers y ciudades de Espana genera incoherencia visible.
- Cambiar fiscal/bancario sin definir contrato local puede romper el alta de proveedores.
- Cambiar moneda solo en frontend sin tocar tags/reglas/documentacion deja deuda operativa.
- El `google_maps_api_key` hardcodeado en `page.quiero-ser-proveedor.json` debe tratarse como incidencia prioritaria.

## Recomendacion operativa
- Empezar por `P1 + P4`.
- Orden sugerido:
  1. limpiar geografia/copy visible
  2. corregir formulario de proveedor para Peru
  3. definir moneda/contrato de pricing Peru
  4. reemplazar providers mock
  5. actualizar documentacion principal

## Decision abierta que hay que cerrar pronto
- Definir contrato local de proveedor Peru:
  - `RUC` obligatorio o no
  - bancos sugeridos
  - ciudades iniciales objetivo
  - moneda oficial a mostrar: `S/` y/o `PEN`
  - si el piloto inicial sigue siendo carwash/detailing o cambia
