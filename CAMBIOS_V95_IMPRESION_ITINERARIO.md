# My Cusco Trip V95 — Impresión de itinerarios por día

## Cambios

- La versión impresa de circuitos de varios días muestra una tarjeta independiente para cada día.
- Cada tarjeta incluye:
  - badge «Día N»;
  - fecha calculada desde la fecha de viaje seleccionada;
  - imagen del día tomada del mismo itinerario que se muestra en el HTML;
  - título, descripción y alojamiento/pernocte.
- La fecha del Día 1 coincide con la fecha elegida en el selector del producto.
- Los días siguientes se calculan consecutivamente mediante días calendario.
- Regla del año:
  - si la fecha pertenece al año actual, se muestra día y mes;
  - si pertenece a otro año, también se muestra el año.
- Las imágenes se cargan como elementos `<img>` y el flujo de impresión espera su carga antes de abrir el diálogo de impresión.
- El cambio se aplica a todos los paquetes/circuitos multidía que tengan itinerario estructurado, no solo al circuito V94.

## Archivos modificados

- `assets/js/pages/product.js`
- `assets/css/product-page.css`

## Ejemplo

Si la fecha seleccionada es `2027-01-03`:

- Día 1 — 3 de enero de 2027
- Día 2 — 4 de enero de 2027
- Día 3 — 5 de enero de 2027

Si la fecha seleccionada pertenece al año actual, por ejemplo `2026-08-20`:

- Día 1 — 20 de agosto
- Día 2 — 21 de agosto
