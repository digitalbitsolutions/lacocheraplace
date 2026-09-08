# Búsqueda local en el home

Implementación local del 8 de septiembre de 2026, pendiente de publicación.

- Ciudad: coincidencia de ciudad sin distinguir mayúsculas ni tildes, limitada a proveedores de Perú. No solicita ubicación del dispositivo.
- Dirección: PlaceAutocompleteElement de Google, restringido a Perú. Se debe seleccionar una sugerencia antes de buscar.
- Ubicación actual: solicita geolocalización únicamente al buscar con esa opción.
- Dirección y ubicación actual: filtra por el radio elegido y ordena por distancia en línea recta; no representa distancia por carretera.
- Resultados en el home, filtrados por servicio, con acceso a la búsqueda de productos publicados del proveedor.
- Usa el directorio aprobado existente de `/apps/provider-applications/providers-nearby`. Ese endpoint actualmente entrega únicamente perfiles con coordenadas; los perfiles sin coordenadas no aparecerán tampoco en la búsqueda por ciudad. La ciudad se extrae de los componentes de la dirección pública mientras el endpoint no exponga un campo `city`.

## Google

La clave se obtiene del mismo endpoint que usa el registro de proveedores: `GET /apps/provider-applications/submit`, campo `config.googleMapsBrowserApiKey`, alimentado por `GOOGLE_MAPS_BROWSER_API_KEY` en la app. Opcionalmente se puede configurar `google_places_api_key` en el banner del editor del tema.

Comprobación en producción del 8 de septiembre: el endpoint responde correctamente pero devuelve la clave vacía; la página de registro tampoco contiene una clave en su configuración del tema. No se encontró una clave en los archivos de entorno locales revisados. No se modificó la configuración de producción.

Para activar las sugerencias hay que restaurar la clave de navegador, habilitar Maps JavaScript API y Places API (New), y verificar las restricciones de dominio de la tienda. Referencia: https://developers.google.com/maps/documentation/javascript/place-autocomplete-new

## Verificación

- `node --test scripts/test_home_location_search.cjs`: cuatro pruebas de ciudad, país, coordenadas y distancia.
- Esquema JSON de la sección y sintaxis de JavaScript verificados. Se corrigió una coma final preexistente en el esquema del banner.
- Edge headless a 390 y 1440 px: ciudad, cero resultados, clave ausente, selección de Google simulada, invalidación al editar dirección y ubicación del dispositivo simulada; sin errores JavaScript ni desbordamiento horizontal en la prueba del componente.
- Directorio real: cinco proveedores para mantenimiento ligero en Chiclayo con el filtro implementado.
- Pendiente: prueba con sugerencias reales de Google y revisión del home completo tras publicar los archivos del tema.

Archivos del tema: `sections/image-banner.liquid`, `snippets/home-location-search.liquid`, `assets/home-location-search.js`.
