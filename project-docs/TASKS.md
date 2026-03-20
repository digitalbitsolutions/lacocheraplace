# TASKS

## Estado
- Proyecto: `lacocheraplace.com`
- Theme base de trabajo: `theme-dawn-export`
- Rama activa: `feature/homepage-round-1`
- Modo actual: trabajo local primero, despliegue solo tras aprobacion
- Ultimo hito confirmado: `homepage round 2 navigation and providers`

## Reglas de ejecucion
- No tocar theme publicado sin aprobacion explicita
- Todo cambio empieza en local
- Cada bloque importante se revisa visualmente antes de seguir
- Cada cambio debe poder revertirse

## Flujo de trabajo
1. Auditar la zona a modificar
2. Definir cambio pequeno y visible
3. Implementar en local
4. Revisar diff
5. Validar visualmente en theme borrador o preview
6. Aprobar o revertir

## Backlog inicial
- [x] Extraer theme actual en local
- [x] Auditar estructura general del theme
- [x] Detectar gap entre e-commerce y marketplace de servicios
- [x] Auditar homepage en detalle
- [x] Definir arquitectura homepage tipo marketplace
- [~] Redisenar homepage sin romper contenido actual
- [ ] Transformar ficha de producto a ficha de servicio
- [ ] Definir modelo de talleres/proveedores
- [ ] Reducir elementos de carrito clasico donde no aplique
- [ ] Preparar flujo de preview seguro

## Tareas inmediatas
- [x] Crear primer lote de cambios aprobables para homepage
- [x] Crear segundo lote visible de homepage con categorias navegables
- [ ] Mantener inventario de cambios por archivo
- [ ] Crear bloque de talleres/proveedores mas robusto para homepage
- [ ] Validar mecanismo de preview con tienda

## Estado actual de homepage
- [x] Sustituido el bloque generico de productos destacados
- [x] Mejorado el copy de categorias
- [x] Enlazadas categorias a colecciones reales
- [x] Anadido bloque inicial de talleres destacados
- [ ] Revisar el resultado visual en preview Shopify
- [ ] Decidir si la siguiente iteracion sera "como funciona" o "talleres destacados"

## Punto de reentrada recomendado
- Revisar visualmente la homepage en Shopify preview o theme borrador
- Si la navegacion ya convence, siguiente foco: reforzar `Talleres destacados`
- Si la narrativa aun es debil, siguiente foco: mejorar `Como funciona`

## Commits de referencia
- `335f889` baseline local del proyecto
- `8ffc73b` homepage round 1 marketplace positioning
- `1762372` organize docs and add shopify marketplace skill
- `828f848` homepage round 2 navigation and providers

## Registro de decisiones
- El proyecto se tratara como plataforma en construccion, no como tienda Shopify clasica
- La prioridad inicial es UX marketplace de servicios
- No se subira nada a produccion sin revision del propietario
