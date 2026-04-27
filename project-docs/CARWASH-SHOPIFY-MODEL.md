# Modelo Shopify: Catalogo carwash Ches

## Objetivo
Definir el modelo nativo de Shopify para crear el catalogo piloto carwash de Ches sin depender de app, tuneles ni backend externo. Este contrato alimenta el CSV del lote C2 y la logica de ficha del lote C3.

## Entidades Shopify
- Cada servicio es un `Product`.
- `Product Type`: `Servicio`.
- `Vendor`: `La Cochera Place`.
- El estado inicial siempre es `draft`.
- La tienda online no publica estos productos hasta aprobacion de Ches.
- El checkout se resuelve con el formulario de producto nativo de Dawn/Shopify.

## Control de flujo
El piloto usa tags como control operativo porque son importables por CSV y legibles en Liquid.

Tags obligatorios:
- `servicio`
- `carwash`
- `proveedor-la-cochera-place`
- `ches-catalogo`
- `price-pending-eur` mientras Ches no apruebe precio final

Tags de flujo, mutuamente excluyentes:
- `service-flow-checkout`: producto con checkout nativo
- `service-flow-consultative`: producto sin checkout directo

Regla de theme para C3:
- Si `product.type == Servicio` y contiene `service-flow-checkout`, mostrar variantes, precio y botones de compra nativos.
- Si `product.type == Servicio` y contiene `service-flow-consultative`, ocultar compra y mostrar formulario/CTA consultivo.
- Si es un producto fisico o no es `Servicio`, mantener comportamiento Dawn normal.

El metafield `service.purchase_flow` queda reservado para la compra guiada por matricula y no se usa para este piloto.

## Servicios y flujo

### Checkout nativo
- `Lavado Completo`
- `Lavado Vapor`
- `Lavado Salon`
- `Motor a Vapor`
- `Pulido Faros`

### Consultivo
- `Pulido Pintura`
- `Descontaminado`
- `Ceramico Carpro`
- `Cueros / Aros`

## Variantes
Servicios con `service-flow-checkout`:
- `Option1 name`: `Tipo de vehiculo`
- `Option1 value`: `Coche`, `SUV`, `7 plazas`

Excepcion:
- `Motor a Vapor` tiene precio unico. Para mantener consistencia de UX y catalogo, se crean las tres variantes con el mismo precio aprobado.
- `Pulido Faros` se interpreta como precio por unidad. La descripcion debe indicarlo claramente.

Servicios con `service-flow-consultative`:
- `Option1 name`: `Title`
- `Option1 value`: `Default Title`
- `Price`: `0.00` solo como valor tecnico en draft, no publicable.

## Precios
- No convertir precios `S/` a EUR.
- El CSV draft puede usar `0.00` como placeholder tecnico con tag `price-pending-eur`.
- Antes de publicar, Ches debe aprobar precios EUR y se debe retirar `price-pending-eur`.
- Ningun producto con `price-pending-eur` puede publicarse.

## Colecciones y tags de categoria
Las colecciones se resolveran por tags, siguiendo el patron actual del theme.

Tags de categoria:
- `lavado`: Lavado Completo, Lavado Vapor
- `detailing`: Lavado Salon, Pulido Faros, Pulido Pintura, Descontaminado, Ceramico Carpro, Cueros / Aros
- `mantenimiento-ligero`: Motor a Vapor

Si una coleccion no existe o no filtra por tag, se crea/ajusta en Shopify Admin durante validacion, no en el theme.

## Columnas CSV v1
Usar el formato simple ya presente en `sample-data`:
- `URL handle`
- `Title`
- `Description`
- `Vendor`
- `Type`
- `Tags`
- `Published on online store`
- `Status`
- `Option1 name`
- `Option1 value`
- `Price`

Reglas:
- Un producto con tres variantes ocupa tres filas con el mismo `URL handle`.
- La descripcion se repite en cada fila del mismo producto.
- `Published on online store` debe ser `false` en C2.
- `Status` debe ser `draft` en C2.

## Handles propuestos
- `lavado-completo-la-cochera-place`
- `lavado-vapor-interior-la-cochera-place`
- `lavado-salon-detailing-interior-la-cochera-place`
- `motor-a-vapor-la-cochera-place`
- `pulido-faros-la-cochera-place`
- `pulido-pintura-la-cochera-place`
- `descontaminado-pintura-la-cochera-place`
- `ceramico-carpro-la-cochera-place`
- `cueros-aros-la-cochera-place`

## Criterios de aceptacion C1
- Existe un control global para checkout vs consultivo.
- El control se puede cargar por CSV.
- No requiere app ni app proxy.
- No rompe la compra guiada por matricula existente.
- Define tags, variantes, columnas y reglas de publicacion para C2.
