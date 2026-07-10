# Cambios V90 - Badges del itinerario uniformes

## Problema corregido
En el tour Machu Picchu Overnight Clásico, la hora dentro del badge del itinerario se veía más grande que en Machu Picchu Full Day Clásico.

La causa era que Overnight renderiza la hora dentro de un `<strong>`, y una regla global de `.experience-itinerary-activity strong` aumentaba el tamaño de ese texto.

## Cambios aplicados
- Se agregó un override final para los badges de hora dentro de `#itinerary`.
- Se fuerza texto blanco para todo el contenido del badge.
- Se iguala el tamaño de la hora y del texto `aprox.` entre Full Day, Overnight y futuros itinerarios visuales.
- No se modificó la lógica JS ni la información de los tours.

## Archivos modificados
- `product.html`
- `assets/css/product-page.css`
