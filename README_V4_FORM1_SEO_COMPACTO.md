# My Cusco Trip – Planificador V4

Cambios limitados a:

1. `planifica-tu-viaje.html`
   - Título visible: `Planifica tu viaje`
   - `<title>` SEO: `Planifica tu viaje a Machu Picchu`
   - Meta description, Open Graph y Twitter optimizados.
   - Misma imagen social: `/public/share-image-v2.jpg`.
   - Cache bust del CSS a `20260809-4`.

2. `assets/css/trip-planner.css`
   - Reducción puntual de espacios verticales del contenedor, intro, progreso, cabeceras, secciones y navegación.
   - Sin cambios funcionales.

3. `form1/index.html`
   - URL corta: `https://mycuscotrip.com/form1/`
   - Redirige a `/planifica-tu-viaje.html`.
   - Conserva query string y hash (UTM, country, campaign, phone, fbclid, etc.).
   - Incluye Open Graph/Twitter para que al compartir `/form1/` aparezca la imagen social.
   - Usa canonical hacia la página real y `noindex,follow` para evitar duplicidad SEO.

No se modificó JavaScript, Google Apps Script, cupones, leads, Pixel, PayPal, header ni footer.
