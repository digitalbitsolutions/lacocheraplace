# Colecciones nativas Shopify solicitadas por Ches

Fecha: `2026-05-13`
Estado: `listo para ejecutar en Shopify Admin`

## Objetivo
Crear dos categorias/colecciones usando solo recursos nativos de Shopify, administrables desde el panel:
- `Productos usados y liquidaciones`
- `Renta de Espacios y Herramientas para Automocion`

## Enfoque recomendado (nativo y escalable)
Usar `Smart collections` (colecciones automaticas) por `tag`, para no depender de apps externas ni scripts obligatorios.

## Definicion de colecciones

1. Titulo: `Productos usados y liquidaciones`
- Handle recomendado: `productos-usados-y-liquidaciones`
- Tipo: `Smart collection` (automatica)
- Condicion: `Product tag` `is equal to` `categoria-usados-liquidaciones`
- Publicacion: `Online Store` activa

2. Titulo: `Renta de Espacios y Herramientas para Automocion`
- Handle recomendado: `renta-de-espacios-y-herramientas-para-automocion`
- Tipo: `Smart collection` (automatica)
- Condicion: `Product tag` `is equal to` `categoria-renta-espacios-herramientas`
- Publicacion: `Online Store` activa

## Pasos exactos en Shopify Admin
1. Ir a `Products > Collections`.
2. Click en `Create collection`.
3. Crear `Productos usados y liquidaciones` como `Smart`.
4. En condiciones, seleccionar `Product tag` + `is equal to` + `categoria-usados-liquidaciones`.
5. Guardar y publicar en `Online Store`.
6. Repetir para `Renta de Espacios y Herramientas para Automocion` con tag `categoria-renta-espacios-herramientas`.

## Gestion diaria desde panel (sin recursos externos)
- Para incluir un producto en la primera coleccion: agregar tag `categoria-usados-liquidaciones`.
- Para incluir un producto en la segunda coleccion: agregar tag `categoria-renta-espacios-herramientas`.
- Para quitarlo: eliminar el tag correspondiente.

## Validacion
1. Abrir `/collections/productos-usados-y-liquidaciones`.
2. Abrir `/collections/renta-de-espacios-y-herramientas-para-automocion`.
3. Confirmar que cada coleccion muestra productos al aplicar/quitar tags desde Admin.

## Rollback
1. Quitar los tags de productos para vaciar colecciones sin borrar historico.
2. Si se necesita rollback total, despublicar o eliminar colecciones desde `Products > Collections`.
