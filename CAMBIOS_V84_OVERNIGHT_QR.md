# Cambios V84 - QR robusto y Machu Picchu Overnight Clásico

## QR en formato de impresión
- Se mantiene el QR existente, pero ahora la impresión espera a que las imágenes del formato imprimible terminen de cargar antes de abrir el diálogo de impresión.
- Esto evita que el QR aparezca como un cuadrado blanco cuando la API externa del QR tarda unos milisegundos más en responder.

## Machu Picchu Overnight Clásico
- Se habilitó la estructura especial de precio para `machu-picchu-overnight-clasico`.
- Se usa lógica similar al Machu Picchu Full Day Clásico:
  - base neta por pasajero,
  - guía prorrateada como costo fijo de grupo,
  - PayPal 5.4% + USD 0.30,
  - retiro bancario 3%,
  - buffer para 10% de descuento por pago completo,
  - redondeo final a `.90`.
- Se agregó costo hotelero incluido:
  - USD 45 para 1 pasajero,
  - USD 22.50 por pasajero desde 2 pasajeros.

## Trenes Overnight
- Tren por defecto de ida: Inca Rail The Voyager 16:36 Ollantaytambo → Machu Picchu.
- Tren por defecto de retorno: Inca Rail The Voyager 20:20 Machu Picchu → Cusco.
- Ida permite trenes comerciales disponibles durante el día.
- Retorno permite trenes desde las 15:00 en adelante.
- Mantiene el mismo modal y estilo del upgrade de trenes.

## Hotel Overnight
- Se agregó alojamiento incluido en Aguas Calientes.
- Hotel por defecto: Hotel Luz Garden Machu Picchu 3 estrellas.
- Se habilita opción de upgrade de hotel usando el selector de hoteles existente.

## Archivos modificados
- `product.html`
- `assets/js/pages/product.js`
- `assets/data/tours-machu-picchu.json`
