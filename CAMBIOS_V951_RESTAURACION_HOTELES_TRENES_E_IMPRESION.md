# My Cusco Trip V95.1 — Restauración acumulativa del circuito 7D/6N

Fecha: 2026-08-01

## Objetivo

Conservar íntegramente la configuración correcta de V94 para el producto `pkg_peru_7d6n_humantay` y añadir únicamente las mejoras de impresión solicitadas en V95.

## Configuración preservada de V94

- Hoteles obligatorios e incluidos en la tarifa base.
- Hoteles preseleccionados:
  - Lima: `arawi-miraflores-3s`.
  - Cusco: `cusco-boutique-3s`.
  - Aguas Calientes: `luz-garden-3s`.
- Modal para cambiar hotel y calcular solo el suplemento.
- Trenes preseleccionados:
  - Ida: `INCA_OLLA_MAPI_VOYAGER_1636_OLLANTAYTAMB`.
  - Retorno: `INCA_MAPI_CUSCO_VOYAGER_2020_MACHU_PICCHU`.
- Modal de trenes y cálculo de diferencias.

## Únicas mejoras funcionales añadidas desde V95

- Imágenes de cada día en la versión impresa.
- Badge de día y fecha calculada junto a cada jornada.
- El año se muestra únicamente cuando la fecha pertenece a un año distinto del año actual.
- Espera breve para cargar imágenes antes de abrir la impresión.

## Corrección del paquete

El parche V95 anterior contenía solo los archivos de impresión y estaba dentro de una carpeta adicional. Este parche V95.1 es acumulativo, se entrega desde la raíz y vuelve a incluir los JSON de V94 que contienen la configuración de hoteles, trenes e itinerario del producto.
