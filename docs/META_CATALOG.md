# Catálogo Meta: Machu Picchu Full Day y Overnight

Las dos páginas españolas publican los datos de producto mediante etiquetas Open Graph en el `<head>`. Meta puede leerlas sin ejecutar JavaScript. Se conserva el marcado turístico `TouristTrip`.

| Página | Identificador del catálogo | Precio base adulto |
| --- | --- | --- |
| `landing/machu-picchu-y-tours-peru.html` | `machu-picchu-full-day` | USD 399.90 |
| `landing/machu-picchu-overnight-y-tours-peru.html` | `machu-picchu-overnight` | USD 489.90 |

Los identificadores y precios corresponden a `mainProduct.id`, `mainProduct.adultPrice` y `currency` de los archivos `assets/data/landing-machu-picchu-tours.json` y `assets/data/landing-machu-picchu-overnight-tours.json`.

## Disponibilidad

`product:availability` usa `available for order`: el cliente puede solicitar una reserva. No confirma cupos de entrada, circuitos, trenes ni una fecha de viaje. Siguen vigentes las validaciones de calendario y los avisos de disponibilidad existentes. El precio es por adulto y no incluye extras opcionales ni descuentos de cupones.

## Actualización de tarifas

Al cargar la información de la landing, `MyCuscoTripTracking.trackCatalogProduct` actualiza las etiquetas de identificador, precio, moneda y disponibilidad con los datos usados por la página y envía un evento estándar `ViewContent`. Su `content_ids` coincide con `product:retailer_item_id` y `content_type` es `product`.

Al modificar las tarifas en los JSON, actualizar también `product:price:amount`, `og:price:amount` y el precio de `TouristTrip.offers` en el HTML correspondiente. Es necesario mantener ese respaldo estático actualizado para los rastreadores que no ejecutan JavaScript. Las páginas de otros idiomas conservan su comportamiento; no se añaden copias traducidas al mismo catálogo.

Ejecutar `python3 tests/check_meta_catalog.py` desde la raíz del proyecto para detectar precios desactualizados, identificadores que no coinciden, etiquetas duplicadas o imágenes distintas a las de los datos de venta. No requiere instalar dependencias.

## Comprobación después de publicar

1. Abrir `https://business.facebook.com/ads/microdata/debug` y comprobar cada URL completa de la tabla.
2. Verificar que Meta lee identificador, título, descripción, enlace, imagen, precio, moneda y disponibilidad, sin los errores anteriores de `id`, `price` y `availability`.
3. En Administrador de eventos, seleccionar el píxel `265041872328503`, abrir Probar eventos y visitar las dos páginas.
4. Confirmar `PageView` y un `ViewContent` de producto por visita, con el identificador y precio correspondientes. Esto comprueba la recepción; no confirma una compra.
5. Volver al catálogo `1632824206743130`, cuyo sitio de confianza debe ser `mycuscotrip.com`, y comprobar los artículos importados. La importación, revisión y actualización en WhatsApp dependen de Meta.

La validación local del código no sustituye esta comprobación de Meta sobre las URLs publicadas.
