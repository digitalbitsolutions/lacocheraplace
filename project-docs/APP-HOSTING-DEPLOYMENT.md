# Hosting de Laco Prov Admin

## Estado productivo

- URL: `https://admin.lacocheraplace.com`
- Plataforma: cPanel + CloudLinux + Passenger
- Usuario: `lacocheraplace`
- Node.js: `22.22.3`
- Base de datos: MySQL
- App root: `/home/lacocheraplace/apps/laco-provider-admin/current`
- Runtime gestionado: `/home/lacocheraplace/nodevenv/apps/laco-provider-admin/current/22`
- Release Shopify: `laco-prov-admin-18`

## Secretos

- La app carga sus variables desde `.env` dentro del app root.
- El archivo tiene permisos `600`.
- Las credenciales MySQL se conservan adicionalmente en
  `/home/lacocheraplace/.laco-provider-admin/database.env`.
- Los valores secretos no se versionan ni se incluyen en el paquete de release.

## Despliegue validado

1. Generar un paquete sin `.env`, `node_modules`, `build`, `.runtime` ni `.shopify`.
2. Extraerlo en el app root.
3. Activar el entorno Node 22 de CloudLinux.
4. Ejecutar `npm ci`.
5. Ejecutar `npm run build`.
6. Ejecutar `npm run setup` para Prisma.
7. Reiniciar la app con `cloudlinux-selector restart`.
8. Verificar `/auth/login?shop=lacocheraplace.myshopify.com`.
9. Publicar la configuracion estable con Shopify CLI.

## Rollback

- Conservar el paquete del release anterior fuera del app root.
- Restaurar el paquete anterior y su `.env`.
- Ejecutar `npm ci`, `npm run build` y `npm run setup`.
- Reiniciar Passenger.
- Las migraciones Prisma deben revisarse antes de cualquier rollback de esquema;
  no revertir MySQL automaticamente.

## Observaciones

- Una base reconstruida no contiene la sesion offline de Shopify.
- Tras reconstruccion o perdida de sesiones hay que abrir/actualizar la app desde
  Shopify Admin para completar OAuth y recrear la sesion.
- El app proxy depende de esa sesion offline para las rutas que consultan Admin API.
- El hosting anadia `X-Frame-Options: SAMEORIGIN`; se retiro para este dominio desde
  `public_html/.htaccess` para permitir la app embebida en Shopify Admin.
- El primer arranque de Passenger despues de un reinicio puede devolver un `502`
  transitorio. Las pruebas de estabilidad posteriores deben responder sin `502`.

## Hardening pendiente

- La auditoria inicial de dependencias de produccion reporto `29` avisos:
  `1 low`, `11 moderate`, `16 high` y `1 critical`.
- El aviso critico corresponde a `tar`, transitivo de `cacache` a traves de
  `@remix-run/dev`.
- Remix y Vite tambien requieren actualizacion.
- No ejecutar `npm audit fix` directamente en produccion. Preparar un lote local,
  revisar compatibilidad, compilar, probar y desplegar como release independiente.
