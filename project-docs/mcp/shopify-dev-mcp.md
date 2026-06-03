# Shopify Dev MCP

## Estado actual
- Shopify Dev MCP detectado localmente
- Ejecucion confirmada via `npx @shopify/dev-mcp@latest`
- Configuracion encontrada en borrador, no activada aun en el `config.toml` principal de Codex
- Validacion operativa 2026-06-03: para despliegues reales del theme no hizo falta MCP; funciono `Shopify CLI` local con sesion persistida del owner

## Para que servira
- Conectar con la tienda Shopify cuando haga falta
- Leer o preparar operaciones apoyadas en Admin/API
- Facilitar despliegue, sincronizacion o trabajo conectado

## Cuando NO hace falta
- Auditoria del theme
- Cambios Liquid, JSON, CSS y snippets en local
- Preparacion de secciones y plantillas

## Cuando SI hara falta
- Preview conectado en tienda
- Subida de cambios a un theme borrador
- Lectura o escritura de datos reales en Shopify
- Creacion de estructuras dependientes de Admin o metacampos

## Metodo real de conexion validado el 2026-06-03
- Shopify CLI instalada localmente con:
- `npm install -g @shopify/cli@latest`
- Version validada:
- `shopify version` -> `4.1.0`
- Store reconocida por la CLI:
- `cs3msy-n8.myshopify.com`
- Theme live validado por CLI:
- `Codex Preview Homepage Round 3` (`196749918545`)
- Configuracion/sesion encontradas en Windows:
- `%APPDATA%\\shopify-cli-store-nodejs\\Config\\config.json`
- `%APPDATA%\\shopify-cli-theme-conf-nodejs\\Config\\config.json`
- `%APPDATA%\\shopify-app-account-info-nodejs\\Config\\config.json`

## Comandos utiles confirmados
- Inspeccionar contexto:
- `shopify theme info --path theme-dawn-export`
- Listar themes:
- `shopify theme list --store cs3msy-n8.myshopify.com`
- Subir archivos concretos al theme live:
- `shopify theme push --store cs3msy-n8.myshopify.com --theme 196749918545 --path theme-dawn-export --only <ruta> --allow-live --nodelete`
- Bajar confirmacion remota de un archivo:
- `shopify theme pull --store cs3msy-n8.myshopify.com --theme 196749918545 --path .tmp-theme-pull --only <ruta> --nodelete`

## Nota operativa importante
- Los `client_credentials` actuales de la app sirven para contenido/productos/archivos, pero no para modificar archivos del theme.
- Para theme deploy desde automatizacion, la ruta fiable confirmada hoy fue Shopify CLI con sesion ya autenticada en este equipo.

## Datos pendientes para conexion real
- Confirmacion final de tienda: `cs3msy-n8.myshopify.com`
- Metodo de autenticacion autorizado
- Decision sobre usar theme borrador para pruebas

## Politica de uso
- Conectar solo cuando el cambio local ya este razonablemente listo
- Preferir theme no publicado para pruebas
- No aplicar cambios sobre el tema activo sin aprobacion
