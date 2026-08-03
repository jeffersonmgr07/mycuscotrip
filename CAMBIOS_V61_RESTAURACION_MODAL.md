# My Cusco Trip — V6.1 Restauración del modal

## Motivo
La V6 añadió `passenger-reservation-modal-v6.css`, una hoja global que reemplazó colores, tamaños, espaciados, anchos y disposición del modal original. Esto deformó el modal general en `product.html`, especialmente en escritorio y móvil.

## Corrección
- Se retiró esa hoja global de todos los `product.html` y de las tres landings.
- Los `product.html` vuelven a utilizar exactamente el diseño existente en `product-page.css`.
- Se añadió `passenger-modal-scroll-fix.css`, que solo convierte el cuerpo del modal en un área desplazable y no modifica el diseño.
- La landing conserva las mejoras funcionales de V6: países, prefijo telefónico, idiomas, resumen y PayPal.
- El modal de la landing usa nuevamente `landing-reservation-modal.css`, con scroll interno y monto sin negrita.
- Al abrir el modal o pasar al resumen, el scroll interno vuelve al inicio.

## Archivos principales
- `assets/css/passenger-modal-scroll-fix.css`
- `assets/css/landing-reservation-modal.css`
- `product.html` y versiones idiomáticas
- `landing/machu-picchu-y-tours-peru.html`
- `en/landing/machu-picchu-y-tours-peru.html`
- `pt/landing/machu-picchu-y-tours-peru.html`
- JavaScript ES, EN y PT de la landing

## Importante
El archivo antiguo `assets/css/passenger-reservation-modal-v6.css` puede permanecer en el repositorio, pero ya no está enlazado. Se puede eliminar después sin afectar el funcionamiento.
