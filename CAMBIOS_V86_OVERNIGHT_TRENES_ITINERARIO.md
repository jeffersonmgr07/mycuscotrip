# Cambios V86 - Overnight clásico: trenes e itinerario visual

## Archivos modificados
- `product.html`
- `assets/js/pages/product.js`
- `assets/css/product-page.css`

## Cambios
1. Se fuerza la visibilidad del bloque **Upgrade de trenes** para `machu-picchu-overnight-clasico`.
2. Se define configuración de trenes overnight:
   - Ida por defecto: `INCA_OLLA_MAPI_VOYAGER_1636_OLLANTAYTAMB`.
   - Retorno por defecto: `INCA_MAPI_CUSCO_VOYAGER_2020_MACHU_PICCHU`.
   - Retornos disponibles desde las 15:00.
   - Compañías permitidas: Inca Rail y PeruRail.
3. Se refuerza el modal de hotel para Overnight:
   - Sin opción “sin alojamiento”.
   - Hotel Luz Garden queda como “Hotel incluido en el precio”.
   - Los upgrades se calculan descontando el crédito incluido del alojamiento base.
4. Se agregó un render especial del itinerario del Overnight con estilo visual tipo timeline, agrupado por Día 1 y Día 2.
5. Se actualizó cache de `product.html` a `v=86`.

## Rutas de imágenes recomendadas
- Imágenes del tour Overnight:
  - `assets/img/tours/machu-picchu-overnight-clasico/cover.jpg`
  - `assets/img/tours/machu-picchu-overnight-clasico/1.jpg`
  - `assets/img/tours/machu-picchu-overnight-clasico/2.jpg`
  - `assets/img/tours/machu-picchu-overnight-clasico/3.jpg`

- Hotel Luz Garden:
  - `assets/img/hotels/luz-garden/cover.jpg`
  - `assets/img/hotels/luz-garden/1.jpg`
  - `assets/img/hotels/luz-garden/2.jpg`
  - `assets/img/hotels/luz-garden/3.jpg`

- Hotel Vista Machu Picchu:
  - `assets/img/hotels/vista-machu-picchu/cover.jpg`
  - `assets/img/hotels/vista-machu-picchu/1.jpg`
  - `assets/img/hotels/vista-machu-picchu/2.jpg`
  - `assets/img/hotels/vista-machu-picchu/3.jpg`
