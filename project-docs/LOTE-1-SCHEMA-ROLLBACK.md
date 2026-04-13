# Lote 1 - Migracion y rollback de esquema

## Alcance
Migracion creada: `20260413214238_add_vehicle_precheck_core_models`

Introduce los modelos:
- `CustomerContact`
- `Vehicle`
- `VehicleLookupLog`
- `ServicePrecheck`
- `OrderVehicleLink`

## Aplicacion (entornos limpios)
Desde `shopify-provider-admin/`:

```bash
npx prisma migrate deploy --schema prisma/schema.prisma
```

## Rollback recomendado
Este lote agrega tablas nuevas sin modificar la tabla `Session`.

Rollback rapido:
1. Revertir el commit del lote 1.
2. Ejecutar despliegue de migraciones segun entorno.

En `sqlite` de desarrollo, si se necesita volver exactamente al estado anterior:
1. Respaldar DB actual.
2. Recrear DB desde historial previo al lote 1 (sin esta migracion).
3. Restaurar solo datos necesarios de `Session`.

## Nota operativa (dev local actual)
En este workspace hay drift de `dev.sqlite` frente al historial de migraciones.
Por eso la migracion se dejo versionada como SQL revisable, sin ejecutar `migrate dev` con reset.
