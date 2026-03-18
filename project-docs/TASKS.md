# TASKS

## Estado
- Proyecto: `lacocheraplace.com`
- Theme base de trabajo: `theme-dawn-export`
- Modo actual: trabajo local primero, despliegue solo tras aprobacion

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
- [ ] Auditar homepage en detalle
- [ ] Definir arquitectura homepage tipo marketplace
- [ ] Rediseñar homepage sin romper contenido actual
- [ ] Transformar ficha de producto a ficha de servicio
- [ ] Definir modelo de talleres/proveedores
- [ ] Reducir elementos de carrito clasico donde no aplique
- [ ] Preparar flujo de preview seguro

## Tareas inmediatas
- [ ] Mantener inventario de cambios por archivo
- [ ] Crear primer lote de cambios aprobables para homepage
- [ ] Validar mecanismo de preview con tienda

## Registro de decisiones
- El proyecto se tratara como plataforma en construccion, no como tienda Shopify clasica
- La prioridad inicial es UX marketplace de servicios
- No se subira nada a produccion sin revision del propietario
