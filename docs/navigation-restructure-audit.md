# Auditoría de reestructuración del menú y buscador (julio 2026)

## Alcance de esta auditoría

`components/header.html` y `components/search-bar.html` son **componentes únicos y compartidos**
(fetch dinámico vía `header-container`/`search-bar-container`), reutilizados por **todas** las
páginas y **todos** los idiomas del sitio a través de `assets/js/components/header.js`
(`localizeHeaderLinks()` reescribe automáticamente los `href` al prefijo de idioma activo). Esto
significa que editar estos dos archivos una sola vez propaga el cambio a las 8 versiones de
idioma sin tocar cada `*.html` individualmente. Esta auditoría se enfocó en esos dos componentes
más las páginas de catálogo que necesitaban nuevos parámetros de filtro.

## Inventario y decisiones (Prioridad 1: reutilizar / Prioridad 2: filtrar / Prioridad 3: crear)

| Sección del menú nuevo | Decisión | Archivo/ruta |
|---|---|---|
| Machu Picchu (5 sub-ítems + 1 nuevo) | Reutilizar | `machu-picchu-tours.html`, `machu-picchu-full-days.html`, `machu-picchu-overnight.html` (etiqueta renombrada a "Machu Picchu 2 días / 1 noche"), `machu-picchu-premium-trains.html`, `machu-picchu-hiram-bingham.html` |
| Machu Picchu → Paquetes con Machu Picchu | Filtrar | `paquetes-cusco.html?destino=machu-picchu` (nuevo query, sin crear landing) |
| Cusco → Tours en Cusco, Paquetes, Trekkings, Ver todo Cusco | Reutilizar | `cusco-tours.html`, `paquetes-cusco.html`, `trekking-cusco.html`, `todo-cusco.html` |
| Cusco → Valle Sagrado / Montaña de Colores / Laguna Humantay | Filtrar (no se crearon landings — el catálogo `tours-cusco.json` ya tiene productos reales para estos 3 destinos) | `all-experiences.html?destino=valle-sagrado`, `all-experiences.html?q=vinicunca`, `all-experiences.html?q=humantay` |
| **Circuitos por Perú** (categoría nueva) | Reutilizar como hub | `explora-peru.html` (ya existía; solo se actualizó el H1/eyebrow y se extendió `catalog-landing.js` para leer `route`/`minDays`/`maxDays`) |
| Circuitos por Perú → 4 rutas + 3 rangos de duración + diseño a medida | Filtrar | `explora-peru.html?route=...`, `explora-peru.html?minDays=X&maxDays=Y`, `quote-packages.html?intent=peru-personalizado` |
| Experiencias Ancestrales | Reutilizar (sin cambios de fondo) | `all-experiences.html?q=ancestral&destino=cusco`, `product.html?slug=bienvenida-ancestral-cusco`, `union-eterna-andes.html`, `astronomia-andina-cusco.html`, `ayahuasca-cusco.html` |
| Aventura y Naturaleza (renombrado de "Trekking y Naturaleza") | Reutilizar | `trekkings.html` (+ filtros `?categoria=`) |
| Aventura y Naturaleza → Caminatas de un día | Filtrar (best-effort, ver riesgos) | `all-experiences.html?tipo=tour&days=1` |
| **Organiza tu viaje** (renombrado de "Complementa tu viaje") | Crear hub nuevo (no existía ninguna página que agrupara trenes/hoteles/restaurantes/traslados/info) | `organiza-tu-viaje.html` (nuevo, reutiliza `assets/css/static-page.css`, hoja de estilos existente pero que ningún HTML usaba todavía) |
| Organiza tu viaje → Trenes / Hoteles / Restaurantes | Reutilizar (sin cambios) | `/trenes/`, `/hoteles/`, `/restaurantes/` |

## HTML huérfanos detectados

- `assets/css/static-page.css` existía en el repositorio pero **ningún** archivo `.html` lo
  referenciaba (verificado por grep). Se decidió reutilizarlo como base de `organiza-tu-viaje.html`
  en vez de escribir CSS nuevo, ya que su sistema de clases (`.static-hero`, `.static-card`,
  `.static-cta`, `.static-link-list`) calza exactamente con un hub informativo.
- `assets/css/agencias-portal.css` y `assets/js/agencias-portal.js` no son referenciados por
  ningún HTML (confirmado por auditoría previa). No se tocaron ni se enlazaron desde el menú
  comercial — quedan fuera del alcance de esta tarea.
- No se encontró ninguna página huérfana con nombre "organiza-tu-viaje" o equivalente
  (confirmado antes de crear el archivo nuevo).

## Bug de CSS corregido en el camino

`assets/css/catalog-landing.css` tenía una regla `#catalogLandingEmpty { display: none !important; }`
que ocultaba permanentemente el estado "sin resultados" en **todas** las vitrinas de catálogo
(no solo Perú), independientemente de si había productos o no. Esto contradecía directamente el
requisito "no generar páginas vacías" del prompt — se eliminó esa regla y se implementó el
contenido real del estado vacío (mensaje + CTA de WhatsApp) en `catalog-landing.js`.

## Riesgos y pendientes conocidos

1. **"Caminatas de un día"** (`all-experiences.html?tipo=tour&days=1`): el catálogo actual no
   tiene una etiqueta explícita de "caminata de un día"; el filtro usa el campo `days` existente.
   Se recomienda validar visualmente que los resultados sean los esperados (Laguna Humantay,
   Montaña de Colores, Valle Sagrado) antes de publicar.
2. **`organiza-tu-viaje.html`** es una página nueva mínima (hub con tarjetas). No se le agregó
   JSON-LD, hreflang completo a las 7 versiones de idioma ni traducción a /en//pt/ — igual que el
   resto de páginas nuevas, replicar a los demás idiomas queda pendiente si se quiere SEO completo
   en esas versiones.
3. No se generaron capturas de escritorio/móvil ni se corrió una prueba de navegador en vivo en
   esta sesión (el navegador de verificación no respondió); sí se validó que el HTML de todos los
   archivos tocados esté bien balanceado y que el CSS/JS no tengan errores de sintaxis. Se
   recomienda una revisión visual antes de fusionar a producción.
4. El texto de "Caminatas de un día" y las 3 landings opcionales (Valle Sagrado, Montaña de
   Colores, Laguna Humantay) se resolvieron con **Prioridad 2 (filtrar)** en vez de crear páginas
   dedicadas, siguiendo la instrucción explícita del prompt de solo crear cuando el filtro no sea
   suficiente. Si el equipo de marketing considera que estos 3 destinos merecen su propia landing
   SEO, es un paso posterior, no incluido aquí.
