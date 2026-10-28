# Landings de paquetes Cusco: 3, 4, 5 y 6 días

Cuatro páginas estáticas en español, con itinerario sugerido, fotos existentes del repositorio, adaptación a celular y formulario hacia `quote-packages.html`. No cambian las páginas Full Day y Overnight ni los precios o las reglas del cotizador actual.

| Página dentro de `landing/` | ID del catálogo al activar tarifa | Paquete existente en el cotizador |
| --- | --- | --- |
| `cusco-machu-picchu-3-dias-2-noches.html` | `pkg_cusco_3d2n` | `pkg_cusco_3d2n` |
| `cusco-machu-picchu-4-dias-3-noches.html` | `pkg_cusco_4d3n` | `pkg_cusco_4d3n` |
| `cusco-machu-picchu-5-dias-4-noches.html` | `pkg_cusco_5d4n` | `pkg_cusco_5d4n` |
| `cusco-machu-picchu-6-dias-5-noches.html` | `pkg_cusco_6d5n` | `pkg_cusco_6d5n` |

## Estado comercial: pendiente de tarifas para Meta

Los paquetes de `assets/data/packages-cusco.json` se calculan dinámicamente. No existe una tarifa fija aprobada para estas cuatro ofertas; además, la configuración comercial del paquete de 4 días indica `quote`. No se reutiliza el precio de un Full Day como si fuera el de un paquete con varias noches, ni se suman costos netos para inventar precios de venta.

Por eso las cuatro páginas se entregan en modo cotización: **todavía no generan cuatro productos adicionales en Meta**. Esta decisión es explícita y comprobable:

- Se muestra una consulta de precio en lugar de USD 0, una tarifa ficticia o un supuesto hotel incluido.
- No se publican etiquetas `product:*`, un `Product` JSON-LD ni eventos `ViewContent` de catálogo mientras la tarifa sea `null`.
- Las páginas pendientes llevan `noindex, follow`.
- Los metadatos sociales, la imagen, la URL canónica y el marcado `TouristTrip` funcionan en ambos modos.

## Confirmar precios y activar los cuatro artículos

1. En `assets/data/landing-paquetes-cusco.json`, completar `catalogPriceUSD` con el precio de venta aprobado por adulto, como número positivo de hasta dos decimales.
2. Completar `priceBasis`: moneda/por persona, si incluye hoteles, categoría, ocupación mínima o habitación compartida y servicios que correspondan al precio base. El precio del catálogo debe ser el total de esa oferta, no un anticipo ni un suplemento.
3. Si la tarifa corresponde a una ruta distinta, ajustar título, descripción, imagen e itinerario para que coincidan. Las rutas iniciales son sugerencias que se confirman según vuelos, operación y disponibilidad.
4. Ejecutar:

```sh
python3 scripts/build_package_landings.py
python3 scripts/build_package_landings.py --check --require-catalog
python3 tests/check_package_landings.py
python3 tests/check_meta_catalog.py
```

El generador añade automáticamente, para cada oferta aprobada, identificador, marca, disponibilidad, condición, precio y moneda Open Graph; `Product` JSON-LD con `Offer`; precio y condiciones visibles; e indexación. El mismo precio se incrusta en los datos que envía el JavaScript, evitando inconsistencias entre crawler, visitante y evento.

Los IDs coinciden con los paquetes existentes del cotizador y son distintos de `machu-picchu-full-day` y `machu-picchu-overnight`. Si se aprueban y publican las cuatro tarifas, serán seis ofertas en total. El aviso de cinco artículos del resumen de Meta corresponde al acceso a todos los formatos de anuncio; no demuestra la causa del catálogo vacío en WhatsApp.

## Navegación y eventos

El formulario usa GET y sigue funcionando sin JavaScript. Transfiere `package`, `days`, `nights`, `start`, `adults`, `children` y `source` al cotizador existente. Ese cotizador ya reconoce los cuatro slugs y deriva la fecha final al seleccionar llegada y duración. La ruta de la landing es orientativa: el cotizador conserva sus alternativas y reglas actuales.

El JavaScript conserva parámetros de campaña, fija el mínimo de llegada al día actual de Perú y registra `landing_view`. Solo con tarifa aprobada llama al puente existente `trackCatalogProduct`, con `content_ids` igual al ID estático y `content_type: product`. No crea reservas, pagos ni eventos `Purchase` al consultar una página o abrir el cotizador.

## Comprobación después de publicar tarifas aprobadas

1. Analizar las cuatro URLs públicas en `https://business.facebook.com/ads/microdata/debug`.
2. Verificar identificador, nombre, descripción, foto, precio, moneda, disponibilidad y enlace.
3. En el píxel `265041872328503`, probar cada página y comparar su `ViewContent` con el ID y precio del artículo.
4. Revisar los nuevos productos y su estado en el catálogo `1632824206743130`, y comprobar la sincronización con WhatsApp. La revisión y la visibilidad final dependen de Meta.

## Validación de esta propuesta

- Pruebas Python: páginas reproducibles, cuatro duraciones, identidades únicas, imágenes existentes en Git, transferencia al cotizador, activación de ofertas aprobadas y rechazo de tarifas inválidas.
- 206 comprobaciones en JSDOM con los scripts reales: PageView único, ausencia de ViewContent con tarifa pendiente, coincidencia de ID/precio/moneda con tarifa de prueba local, respeto del tracking desactivado, validación del formulario y conservación de los datos de viaje/campaña. Todas las solicitudes externas se interceptaron; no se enviaron eventos a Meta ni solicitudes de reserva o pago.
- Se verificó que las cuatro portadas responden HTTP 200 y son JPG válidos.
- El navegador Chromium no pudo mantener una sesión en este entorno; queda pendiente la revisión visual en un navegador de escritorio y celular. La comprobación real en Meta se realiza después de publicar tarifas aprobadas.
