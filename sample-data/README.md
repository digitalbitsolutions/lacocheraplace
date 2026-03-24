# Sample Data

Este paquete deja preparado sample data para Shopify sin tocar todavia los datos reales de la tienda.

## Modelo usado

- `proveedor` -> campo `Vendor` de Shopify
- `servicio` -> producto de Shopify con `Type = Servicio`
- relacion `proveedor -> servicios` -> 3 productos por cada vendor

## Archivos

- `shopify-demo-services-draft.csv`
  Carga 30 servicios demo como borrador. Es la opcion mas segura.
- `shopify-demo-services-visible.csv`
  Carga 30 servicios demo activos y visibles en tienda online.
- `shopify-demo-services-addon-visible.csv`
  Amplia los demos existentes con 20 servicios adicionales para dejar 5 servicios por proveedor.
- `shopify-demo-services-coverage-visible.csv`
  Añade servicios puntuales para asegurar que cada categoria visible tenga al menos 3 proveedores.
- `demo-providers.json`
  Registro auxiliar de los 10 proveedores demo con zonas, especialidades y los handles de sus 3 servicios.

## Alcance

- 10 proveedores demo
- 3 servicios por proveedor
- 30 servicios en total
- contenido orientado a Barcelona

## Extension de demo

Cuando se necesite escalar a 5 servicios por proveedor:

- usar `shopify-demo-services-addon-visible.csv`
- anadir 20 servicios nuevos
- resultado final: 50 servicios demo, 5 por proveedor

## Cobertura minima por categoria

Para asegurar que cada categoria del home tenga al menos 3 proveedores visibles:

- usar `shopify-demo-services-coverage-visible.csv`
- anadir servicios puntuales en las categorias con menor cobertura
- objetivo: minimo 3 proveedores por categoria visible

## Importacion manual en Shopify

1. Ve a `Productos`
2. Pulsa `Importar`
3. Sube uno de los CSV
4. Si solo quieres revisar en admin, usa `shopify-demo-services-draft.csv`
5. Si quieres que puedan verse en la tienda, usa `shopify-demo-services-visible.csv`

## Nota importante

Con el acceso actual de theme no puedo crear productos directamente en Shopify. Para poblar la tienda yo mismo necesitare acceso de Admin o que importes uno de estos CSV desde el admin.
