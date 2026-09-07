# Auditoría de proveedores — Chiclayo

## 1. Fecha de investigación
2026-09-04.

## 2. Número total de candidatos encontrados
Se revisaron más de 25 fichas y referencias públicas. Este paquete conserva **12 candidatos aceptados para revisión humana**, todos dentro de la provincia de Chiclayo y con coordenadas puntuales publicadas.

## 3. Número aceptado por estado de verificación
- verified_strong: 5
- verified_basic: 4
- needs_contact: 3
- rejected dentro de los tres archivos de datos: 0

Los descartados se documentan abajo y no se incluyen en los tres archivos de datos para mantener correspondencia exacta entre candidatos, perfiles y CSV.

## 4. Distribución por distrito
- Chiclayo: 7
- José Leonardo Ortiz: 4
- La Victoria: 1

## 5. Distribución por categoría principal
- productos-y-accesorios-para-el-cuidado-automotriz: 1
- lavado: 1
- chapa-y-pintura: 1
- mantenimiento-ligero: 1
- mantenimiento-ligero: 5
- neumaticos-y-llantas: 1
- productos-y-accesorios-para-el-cuidado-automotriz: 2

## 6. Proveedores descartados y motivo
- **Taller Multiservicios HERCA**: descartado al aparecer como cerrado permanentemente en la ficha cartográfica consultada.
- **Tecnicentro Esqueves**: no incorporado al paquete por figurar temporalmente cerrado en la revisión.
- **Oleocentro Moreno**: no incorporado por discrepancia material entre una dirección/coordenadas de directorio y una dirección actual distinta en ficha cartográfica.
- **SEA servicio especializado automotriz**: no incorporado por discrepancia de dirección entre fuentes; las coordenadas disponibles correspondían a la dirección antigua.
- **Check Avanzado Chiclayo**: no incorporado por discrepancia entre la dirección del directorio y la dirección de la ficha cartográfica actual.
- **ERNASAC**: no incorporado porque la ficha cartográfica consultada figura temporalmente cerrada; adicionalmente se halló información societaria histórica con estado tributario que requiere revisión actual.
- **La Cochera Carwash Chiclayo**: negocio y servicios verificados, incluidos lavado, tratamiento cerámico y PPF, pero no se incorporó al dataset porque en esta investigación no se obtuvo una fuente accesible que publicara coordenadas numéricas exactas de la sede Francisco Cúneo 597.
- **Sonall Auto Detailing**: negocio activo y dirección verificable; no incorporado porque no se obtuvo una fuente accesible con latitud/longitud numéricas exactas de la sede.
- **Grúas Chiclayo**: servicio de grúa y dirección visibles en ficha cartográfica; no incorporado por falta de coordenadas numéricas exactas verificables en una segunda fuente accesible.
- **Parabrisas La China & Grupo Ferdel**: actividad de cristales automotrices y dirección verificables; no incorporado por falta de coordenadas numéricas exactas en fuente accesible.
- **GRUPO BANCES planchado/pintura**: encontrado y con actividad automotriz pertinente; no incorporado por no completar la validación estricta de coordenadas.
- **Vidrieria Arnon S.R.L**: no incorporado porque las fuentes accesibles no demostraron de forma suficiente que su actividad principal sea parabrisas automotrices.
- **Intergas**: actividad automotriz real, pero orientada a conversión GLP y fuera de la taxonomía objetivo específica; se deja fuera para no forzar una categoría.
- **PIMENTEL, CHICLAYO**: descartado como falso positivo de directorio; las reseñas describen el balneario/distrito, no un proveedor automotriz.

## 7. Campos pendientes de confirmar por proveedor
- **Ricar Multicenter**: whatsapp, email, ruc, opening_hours.
- **AUTOMAN CHICLAYO E.I.R.L.**: whatsapp, email, legal_name, ruc, opening_hours.
- **Automotriz Burga**: phone, whatsapp, email, legal_name, ruc, opening_hours.
- **Automotriz Palomino.**: whatsapp, email, legal_name, ruc, opening_hours.
- **Lubricentro Y Lavadero Oasis**: phone, whatsapp, email, legal_name, ruc, opening_hours.
- **Baterías USCAY**: whatsapp, email, legal_name, ruc, google_place_id, opening_hours.
- **Motor Shop fuel injection**: whatsapp, email, legal_name, ruc, opening_hours.
- **CAMPOS MOTORS**: whatsapp, email, legal_name, ruc, opening_hours.
- **Taller Central Motors**: whatsapp, email, legal_name, ruc, google_place_id.
- **Comercio & Cía - Llantas**: whatsapp, email, legal_name, ruc, google_place_id.
- **CARROCERIAS HERRERA**: phone, whatsapp, email, legal_name, ruc, google_place_id.
- **Davalos Import SA**: whatsapp, email, legal_name, ruc, google_place_id.

## 8. Duplicados detectados
No se detectaron handles duplicados ni Google Place IDs duplicados entre los 12 registros aceptados. Se evitó crear registros separados cuando la evidencia podía corresponder a una misma sede o a una dirección anterior.

## 9. Proveedores localizados fuera de la provincia de Chiclayo
Se observaron resultados de otras provincias del departamento de Lambayeque (por ejemplo, Ferreñafe/Lambayeque) durante la búsqueda, pero **ninguno se incorporó** a los tres archivos de datos. Todos los registros aceptados tienen `province = "Chiclayo"`.

## 10. Riesgos de calidad de los datos
- Algunos directorios reproducen datos antiguos o categorías demasiado amplias.
- Las valoraciones y recuentos de reseñas cambian con el tiempo; se conservan solo cuando pudieron asociarse inequívocamente al negocio.
- Varias empresas no publican RUC, razón social, email o WhatsApp de manera verificable.
- Un Google Maps URL de búsqueda sin `google_place_id` no equivale a un Place ID verificado.
- No se asignaron coordenadas generales de Chiclayo para completar huecos.
- La cobertura de `ppf_wrap`, `polarizado_lunas`, `grua_asistencia` y `parabrisas` queda pendiente por la regla estricta de coordenadas, aun cuando se localizaron negocios plausibles.
- `CARROCERIAS HERRERA`, `Baterías USCAY` y `Comercio & Cía - Llantas` deben contactarse antes de publicación por tener verificación incompleta.

## 11. Recomendación sobre cuáles deberían contactarse primero
Prioridad 1: candidatos `verified_strong` con dirección y actividad coherentes en varias fuentes, especialmente Ricar Multicenter, Automotriz Burga, Automotriz Palomino., Motor Shop fuel injection y CAMPOS MOTORS.

Prioridad 2: candidatos `verified_basic` que requieren confirmar algún dato operativo o de catálogo.

Prioridad 3: candidatos `needs_contact`; no deberían convertirse a `approved` hasta confirmar directamente identidad, operación actual, autorización de publicación y los campos pendientes.

## Nota de integración Shopify
Todos los perfiles se generan con `status = "candidate"`. Este paquete es exclusivamente de investigación y preparación de datos: **no sustituye proveedores/vendedores existentes de Lima, no realiza mapeos destructivos y no ejecuta ninguna operación en Shopify**.


## 12. Normalización para integración

Las categorías del paquete se normalizaron a los identificadores reconocidos por el directorio público. Los valores originales de investigación se conservan en los archivos fuente de Descargas.

## 13. Recursos gráficos

Ningún candidato aportó URLs verificadas de logo o galería. Se creó un manifiesto de revisión y un placeholder neutral local. Los logos oficiales requieren verificación de titularidad y las fotografías de galería requieren autorización antes de publicarse.
