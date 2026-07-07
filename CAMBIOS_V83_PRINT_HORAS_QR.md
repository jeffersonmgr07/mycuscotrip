# CAMBIOS V83 - Formato de impresión: horas, URL y QR

## Cambios aplicados

1. Horarios del itinerario en impresión
   - Se normalizan las horas al formato `04.00 a.m.` / `08.20 p.m.`.
   - El texto `(approx.)` aparece debajo de la hora, en una segunda línea.
   - Este cambio aplica solo al formato de impresión.

2. Trenes seleccionados en impresión
   - Las horas de salida y llegada de trenes también se muestran con formato a.m. / p.m.
   - Ejemplo: `Ollantaytambo 06.40 a.m. → Machu Picchu 08.01 a.m.`.

3. URL y QR para reservar
   - Debajo de Información importante se agrega la sección: `Puedes reservar este itinerario en:`.
   - Se muestra el URL del producto con su slug.
   - Se genera un QR usando el URL del producto para facilitar la reserva desde celular.

4. Cache
   - `product.html` actualizado a `v=83` para CSS y JS.

## Archivos modificados

- product.html
- assets/css/product-page.css
- assets/js/pages/product.js
