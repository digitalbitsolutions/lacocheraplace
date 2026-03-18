# Shopify Dev MCP

## Estado actual
- Shopify Dev MCP detectado localmente
- Ejecucion confirmada via `npx @shopify/dev-mcp@latest`
- Configuracion encontrada en borrador, no activada aun en el `config.toml` principal de Codex

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

## Datos pendientes para conexion real
- Confirmacion final de tienda: `cs3msy-n8.myshopify.com`
- Metodo de autenticacion autorizado
- Decision sobre usar theme borrador para pruebas

## Politica de uso
- Conectar solo cuando el cambio local ya este razonablemente listo
- Preferir theme no publicado para pruebas
- No aplicar cambios sobre el tema activo sin aprobacion
