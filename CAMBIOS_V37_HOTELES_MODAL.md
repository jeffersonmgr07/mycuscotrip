# V37 - Mejoras Hoteles

## Color usado
Se aplicó el mismo tono base del overlay del hero de `quote-packages.html`:

- Verde base: `#062803`
- RGB: `6, 40, 3`
- Overlay recomendado: `rgba(6, 40, 3, 0.78)`
- Botón verde: `#1f7a45`

## Cambios aplicados

- Hero de hoteles con overlay verde igual al hero del cotizador.
- Botones `Ver hotel`, `Ver disponibilidad`, `Reservar` y `Continuar con PayPal` con verde unificado.
- Encabezado del modal en verde oscuro con texto blanco.
- Nombre del hotel queda en fondo blanco con letras verde oscuro.
- Estrellas y dirección quedan más pegadas al nombre del hotel.
- Galería del hotel ahora usa tamaño fijo y no se estira al crecer el modal.
- Galería con botones anterior/siguiente cuando hay más de una imagen.
- Después de elegir habitación y presionar `Reservar`, el sistema solicita:
  - nombres,
  - apellidos,
  - tipo de documento,
  - número de documento,
  - nacionalidad,
  - celular / WhatsApp,
  - correo.
- Recién después de completar esos datos aparece PayPal.
- Se eliminó el texto visible sobre configurar Google Sheet / Apps Script.
- Apps Script actualizado para guardar también los datos del titular.

## Imágenes de hoteles
No hay rutas rotas: todas las imágenes configuradas en `assets/data/hotels.json` existen físicamente.

Lo que sí existe es uso de imágenes repetidas/fallback. Estos hoteles necesitan imágenes propias para evitar que se repita la imagen de Cusco Boutique o el fallback de Cusco:

| Destino | Hotel | Imagen usada actualmente |
|---|---|---|
| Lima | Tierra Viva Miraflores | `assets/img/hotels/cusco-boutique/cover.jpg` |
| Arequipa | Catedral Boutique Arequipa | `assets/img/hotels/cusco-boutique/cover.jpg` |
| Arequipa | Hotel Riviera Arequipa | `assets/img/hotels/cusco-boutique/cover.jpg` |
| Puno | Hotel Conde de Lemos | `assets/img/hotels/cusco-boutique/cover.jpg` |
| Puno | Hotel Qalasaya | `assets/img/hotels/cusco-boutique/cover.jpg` |
| Tambopata | Tambopata Comfort Lodge | `assets/img/quote/fallbacks/cusco.jpg` |
| Tambopata | Tambopata Premium Eco Lodge | `assets/img/quote/fallbacks/cusco.jpg` |

Recomendación de carpetas para subir imágenes propias:

```text
assets/img/hotels/tierra-viva-miraflores/
assets/img/hotels/catedral-boutique-arequipa/
assets/img/hotels/hotel-riviera-arequipa/
assets/img/hotels/hotel-conde-de-lemos/
assets/img/hotels/hotel-qalasaya/
assets/img/hotels/tambopata-comfort-lodge/
assets/img/hotels/tambopata-premium-eco-lodge/
```

Cada hotel debería tener como mínimo:

```text
cover.jpg
1.jpg
2.jpg
3.jpg
```
