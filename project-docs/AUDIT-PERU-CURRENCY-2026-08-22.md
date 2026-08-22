# Auditoria de configuracion para lanzamiento inicial en Peru

Fecha: 2026-08-22

## Alcance

Revision en modo lectura de la configuracion real accesible mediante Shopify Admin API, del theme local, de la app administrativa y de los artefactos operativos del repositorio.

No se modifico Shopify, el theme publicado, Markets, productos ni el servidor productivo.

## Estado real de Shopify

- Tienda: `LACOCHERAPLACE`
- Dominio principal: `www.lacocheraplace.com`
- Plan: `Basic`
- Moneda base: `EUR`
- Monedas de presentacion habilitadas: solo `EUR`
- Formato monetario: `€{{amount_with_comma_separator}}`
- Formato con codigo: `€{{amount_with_comma_separator}} EUR`
- Pais de la direccion de facturacion: `ES`
- Zona horaria: `Europe/Madrid` (`CEST`, UTC+02:00 en la fecha de auditoria)
- Unidad de peso: `KILOGRAMS`
- Precios con impuestos incluidos: `true`
- El token operativo dispone ya de acceso a Markets e idiomas tras publicar y autorizar `codex-store-admin-v4-7`.

## Markets e idiomas

- Existe un unico Market: `España`.
- Estado del Market: `ACTIVE`.
- Es el Market primario.
- Unica region incluida: `ES` (`Spain`).
- El Market no devuelve configuracion propia de moneda (`currencySettings = null`), por lo que hereda la moneda base EUR de la tienda.
- Unico idioma publicado: espanol (`es`).
- Espanol es el idioma primario.

## Estado del catalogo

La muestra API de los 100 productos actualizados mas recientemente devolvio:

- Moneda de todos los rangos de precio: `EUR`.
- Los 100 productos estaban en estado `ACTIVE`.
- La consulta indica que existen mas de 100 productos.
- 39 productos de la muestra tienen precio minimo `0.00`.
- 5 productos conservan el tag `price-pending-eur`.

Cambiar la moneda base no debe tratarse como una conversion de precios. Los importes numericos deben revisarse y cargarse expresamente en PEN; de lo contrario, un valor numerico como `50.00` conservara el numero y cambiara su significado comercial.

## Hallazgos en theme y contenido

- Dawn usa filtros monetarios nativos en la mayor parte del storefront; esos importes seguiran la moneda configurada en Shopify.
- `currency_code_enabled` esta activo en `config/settings_data.json`.
- Existen precios EUR escritos manualmente en:
  - `sections/main-search.liquid`
  - `sections/main-collection-product-grid.liquid`
  - `sections/lc-home-featured-services.liquid`
- Existen contenido editorial y scripts de blog con rangos en EUR.
- El CSV piloto carwash y su documentacion usan `price-pending-eur` y textos de aprobacion en EUR.
- Persisten numerosas referencias de negocio a Barcelona/Espana en datos demo, proveedores, articulos y documentacion.

Los handles historicos pueden mantenerse para evitar romper URLs, pero el contenido visible, filtros, ubicaciones, precios y datos legales deben localizarse para Peru.

## Hallazgos en app y datos

- El modelo de vehiculos conserva `countryCode = "ES"` como valor por defecto.
- La validacion de matriculas esta disenada para matricula espanola.
- El formulario y consola de proveedores solicitan `IBAN` y `NIF/CIF`.
- La app ya usa MySQL y URL estable `https://admin.lacocheraplace.com`.
- No se pudo completar la inspeccion SSH: el servidor responde en el puerto `9505`, pero las claves locales disponibles fueron rechazadas.

Para Peru deben revisarse, como minimo:

- Documento fiscal: RUC y, si aplica, DNI/CE.
- Cuenta bancaria: banco, numero de cuenta y CCI; IBAN no es el contrato local adecuado.
- Pais y departamentos/provincias/distritos.
- Validacion de placas peruanas y codigo de pais `PE`.
- Zona horaria `America/Lima`.
- Tratamiento de IGV, precios incluidos y comprobantes.
- Pasarela de pago disponible para la entidad peruana.

## Secuencia segura propuesta

1. Obtener acceso de lectura a Shopify Markets (`read_markets`) y completar la auditoria de mercados, dominios e idiomas.
2. Confirmar con el owner la matriz de precios PEN y decidir que productos demo se archivan o relocalizan.
3. Crear un export completo de productos/variantes y un respaldo de la configuracion antes de tocar moneda.
4. Localizar app y contratos de datos para Peru bajo un lote independiente.
5. Eliminar precios EUR hardcodeados del theme y usar objetos monetarios de Shopify o texto administrable.
6. Cambiar pais/direccion legal, zona horaria, impuestos, Markets y pasarela desde Shopify Admin.
7. Cambiar la moneda base a `PEN` solo en una ventana controlada.
8. Aplicar precios aprobados en PEN inmediatamente despues y validar carrito, descuentos, envios, impuestos y checkout.
9. Revisar storefront desktop/mobile y registrar evidencias antes de considerar el cambio cerrado.

## Bloqueos actuales

- Falta una clave SSH valida para el usuario productivo o confirmacion del usuario/host correctos.
- Falta matriz de precios finales en PEN aprobada por Ches.
- Falta confirmar datos fiscales, direccion legal y proveedor de pagos para la operacion peruana.

## Control de versiones

- Rama de auditoria: `audit/peru-currency`
- Punto de control previo: `b8ca70b`
- No debe hacerse ninguna publicacion o cambio de moneda desde esta rama sin aprobacion explicita.

## Lote de permisos Markets/locales

- Autorizado por el owner el 2026-08-22.
- Scopes agregados a la configuracion de la app:
  - `read_markets`
  - `write_markets`
  - `read_locales`
  - `write_locales`
- El cambio de scopes no modifica por si mismo Markets, idiomas ni moneda.
- Tras desplegar la configuracion, la app debe reautorizarse antes de que el token operativo incluya los permisos nuevos.
- La credencial de automatizacion usada por `scripts/lib/shopify-auth.cjs` pertenece a `Codex store Admin v4`, no a `Laco Prov Admin`.
- Configuracion enlazada para esa app: `shopify-provider-admin/shopify.app.codex-store-admin-v4.toml`.
- `Laco Prov Admin` conserva los mismos scopes para poder gestionar Markets desde su sesion embebida si se incorpora esa funcion en el futuro.
