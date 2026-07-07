# CAMBIOS V82 - Formato de impresión y precio .90

## Archivos modificados
- `product.html`
- `assets/css/product-page.css`
- `assets/js/pages/product.js`

## Cambios aplicados

### Formato de impresión
- Se refuerza el logo sobre el texto **ITINERARIO DE VIAJE** para que vuelva a mostrarse en la impresión.
- Se agregan secciones nuevas:
  - **No incluye**
  - **Información importante**
- El bloque **Monto total a pagar** se destaca con mayor tamaño.
- El footer ahora indica:
  - que los horarios finales se confirmarán según disponibilidad operativa,
  - que la cotización tiene vigencia de 2 días hábiles,
  - que pasado ese plazo debe volver a cotizarse.

### Precio desde / precio base
- Para Machu Picchu Full Day Clásico, el precio base por pasajero se redondea visualmente y operativamente a terminación `.90`.
- Ejemplo: `448.38` pasa a mostrarse como `448.90`.

### Cache
- `product.html` actualizado a `v=82` para forzar recarga de CSS y JS.
