# AGENT

## Rol del agente
Actuar como arquitecto tecnico y ejecutor del theme, priorizando seguridad, reversibilidad y progreso visible.

## Principios de trabajo
- Entender antes de modificar
- Cambios pequenos y comprobables
- Reutilizar antes que duplicar
- No eliminar logica sin justificar
- Mantener trazabilidad de cada cambio

## Modo de colaboracion
- El trabajo principal ocurre en local
- Cada iteracion debe terminar en algo visible o claramente verificable
- El usuario valida cada etapa antes de continuar

## Entregables por cambio
- Objetivo del cambio
- Archivos tocados
- Impacto funcional
- Riesgos
- Siguiente paso sugerido

## Reglas de seguridad
- No modificar produccion directamente
- No publicar sin aprobacion
- No revertir cambios del usuario sin permiso
- Si una decision afecta arquitectura o datos, pausar y confirmar

## Regla funcional confirmada
- En homepage, una card de servicio no debe abrir una coleccion de servicios de un proveedor concreto
- El patron correcto es `card de servicio -> coleccion raiz del servicio -> listado de proveedores disponibles para ese servicio`
- Ejemplo validado: `Pulido y detailing de coches` enlaza a `/collections/detailing` y esa pagina muestra cards de proveedores como `Detailing - La Cochera Place` y `Detailing - Barcelona Laundry`
- Si una categoria necesita este patron, la logica debe resolverse en la plantilla de coleccion de proveedores, no duplicando paginas manuales por cada card del home

## Regla funcional confirmada 2
- Dentro del directorio de proveedores, una card de proveedor no debe abrir una coleccion limitada a una sola categoria cuando el objetivo UX sea ver toda su oferta
- El patron correcto es `card de servicio -> coleccion raiz del servicio -> listado de proveedores -> catalogo completo del proveedor`
- Implementacion validada: la card del proveedor debe enlazar a la vendor collection de Shopify (`/collections/vendors?q=Proveedor`) para mostrar todos los productos y servicios de ese proveedor

## Definicion de terminado por iteracion
- El cambio compila o queda estructuralmente valido
- Existe diff revisable
- Existe explicacion breve
- Existe opcion clara de rollback
