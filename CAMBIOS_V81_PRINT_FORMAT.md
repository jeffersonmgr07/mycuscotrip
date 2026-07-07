# CAMBIOS V81 - Formato de impresión Product HTML

## Objetivo
Ajustar el formato de impresión del `product.html` sin alterar la lógica de reserva ni el modal de trenes.

## Cambios

1. **Descripción movida**
   - La descripción ya no aparece debajo del título principal.
   - Ahora aparece después de la sección **Itinerario según tu selección**, en una sección propia llamada **Descripción**.

2. **Imágenes del tour**
   - Se reemplazó el banner único por una grilla de 3 imágenes.
   - Usa la imagen principal y las dos primeras imágenes de galería del tour.
   - Las imágenes tienen bordes redondeados y formato estático tipo recuadros.

3. **Itinerario y paginación**
   - Se compactó el itinerario para reducir el salto completo a la segunda hoja.
   - Se permitió que la sección de itinerario pueda partir entre páginas si es necesario, evitando que toda la sección se empuje completa a la página 2.
   - Se ajustaron márgenes de impresión A4 para que la segunda hoja tenga margen superior correcto.

4. **Cache**
   - `product.html` actualizado a `v=81` para CSS y JS.

## Archivos modificados

- `product.html`
- `assets/css/product-page.css`
- `assets/js/pages/product.js`
