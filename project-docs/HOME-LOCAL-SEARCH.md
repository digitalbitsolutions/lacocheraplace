# Búsqueda local en el home

Implementación publicada el 8 de septiembre de 2026 en el tema live `196749918545` de `lacocheraplace.com`. Commit de implementación: `9a096b1`, rama `audit/peru-currency`, enviado a origin.

- Ciudad: coincidencia de ciudad sin distinguir mayúsculas ni tildes, limitada a proveedores de Perú. No solicita ubicación del dispositivo.
- Dirección: PlaceAutocompleteElement de Google, restringido a Perú. Se debe seleccionar una sugerencia antes de buscar.
- Ubicación actual: solicita geolocalización únicamente al buscar con esa opción.
- Dirección y ubicación actual: filtra por el radio elegido y ordena por distancia en línea recta; no representa distancia por carretera.
- Resultados en el home, filtrados por servicio, con acceso a la búsqueda de productos publicados del proveedor.
- Usa el directorio aprobado existente de `/apps/provider-applications/providers-nearby`. Ese endpoint actualmente entrega únicamente perfiles con coordenadas; los perfiles sin coordenadas no aparecerán tampoco en la búsqueda por ciudad. La ciudad se extrae de los componentes de la dirección pública mientras el endpoint no exponga un campo `city`.

## Google

La clave se obtiene del mismo endpoint que usa el registro de proveedores: `GET /apps/provider-applications/submit`, campo `config.googleMapsBrowserApiKey`, alimentado por `GOOGLE_MAPS_BROWSER_API_KEY` en la app. Opcionalmente se puede configurar `google_places_api_key` en el banner del editor del tema.

Comprobación inicial en producción del 8 de septiembre: el endpoint respondía correctamente pero devolvía la clave vacía; la página de registro tampoco contenía una clave en su configuración del tema. Por SSH se comprobó que la variable no estaba en el `.env` de la app ni en `.laco-provider-admin/shopify.env`; tampoco se encontró una clave en las configuraciones y releases revisadas.

Configuración completada el 8 de septiembre: `GOOGLE_MAPS_BROWSER_API_KEY` quedó configurada en el `.env` de la app y Passenger fue reiniciado. La clave de navegador tiene restricciones HTTP por `lacocheraplace.com`, `www.lacocheraplace.com` y `cs3msy-n8.myshopify.com`; las APIs autorizadas son Maps JavaScript API y Places API (New). La clave no se registra en este repositorio.

Para activar las sugerencias hay que restaurar la clave de navegador, habilitar Maps JavaScript API y Places API (New), y verificar las restricciones de dominio de la tienda. Referencia: https://developers.google.com/maps/documentation/javascript/place-autocomplete-new

## Verificación

- `node --test scripts/test_home_location_search.cjs`: cuatro pruebas de ciudad, país, coordenadas y distancia.
- Esquema JSON de la sección y sintaxis de JavaScript verificados. Se corrigió una coma final preexistente en el esquema del banner.
- Edge headless a 390 y 1440 px: ciudad, cero resultados, clave ausente, selección de Google simulada, invalidación al editar dirección y ubicación del dispositivo simulada; sin errores JavaScript ni desbordamiento horizontal en la prueba del componente.
- Directorio real: cinco proveedores para mantenimiento ligero en Chiclayo con el filtro implementado.
- Home completo en producción probado con Edge a 390 y 1440 px: búsqueda de mantenimiento ligero en Chiclayo devuelve cinco proveedores; geolocalización de prueba en Chiclayo y radio de 10 km devuelve ocho. Sin errores JavaScript ni desbordamiento horizontal. Los enlaces abren la búsqueda de productos; los proveedores sin productos publicados muestran cero resultados.
- Prueba real posterior a la configuración: al escribir una dirección, `AutocompletePlaces` respondió `200` en producción y no se registraron errores del componente Google. La corrección esencial fue habilitar y restringir **Places API (New)** (`places.googleapis.com`); el servicio legacy `places-backend.googleapis.com` no sirve para este widget.

## Publicación y recuperación

Se subieron únicamente los tres archivos del tema indicados abajo mediante Shopify CLI, con `--allow-live --nodelete`. Antes se confirmó que el banner live coincidía con el commit base y se guardó copia en `.tmp-local-search/live-before/sections/image-banner.liquid`. No se desplegó la app ni se modificó la base de datos.

Archivos del tema: `sections/image-banner.liquid`, `snippets/home-location-search.liquid`, `assets/home-location-search.js`.
