# Contrato de parámetros — barra de búsqueda del home (julio 2026)

`components/search-bar.html` + `assets/js/components/search-bar.js`.

## Pestañas

| Pestaña | data-tab | Texto del botón |
|---|---|---|
| Tours y experiencias | `tours` | "Buscar tours" (`search.submit`) |
| Paquetes y circuitos | `paquetes` | "Buscar paquetes" (`search.findPackages`) |

## Parámetros generados por el formulario

| Parámetro | Uso | Generado por |
|---|---|---|
| `source` | Siempre `home-search` | ambas pestañas |
| `type` | `tour` o `package` | ambas pestañas (nuevo) |
| `intent` | Clave estable de la opción elegida en el select | ambas pestañas |
| `adultos` | Entero ≥ 1 | ambas pestañas |
| `ninos` | Entero ≥ 0 | ambas pestañas |
| `fecha` / `fechaInicio` | `YYYY-MM-DD`, solo si hay fecha seleccionada y "Fechas flexibles" está desactivado | pestaña tours |
| `fechaInicio` / `fechaFin` | Rango `YYYY-MM-DD`, solo si hay fechas y "Fechas flexibles" está desactivado | pestaña paquetes |
| `flexible` | `1` cuando el usuario activa "Fechas flexibles" (oculta las fechas, no bloquea el envío) | ambas pestañas |

**Compatibilidad:** `product.js` y `quote-packages.js` ya leían `adultos/adults`,
`ninos/niños/children`, `fecha/fechaInicio/startDate` y alias equivalentes antes de este cambio;
no se modificó esa lógica de lectura, por lo que los enlaces antiguos (sin `type` ni `flexible`)
siguen funcionando exactamente igual.

## Opciones — pestaña "Tours y experiencias"

| Clave (`intent`) | Etiqueta | Ruta base |
|---|---|---|
| `machu-picchu` | Machu Picchu | `./machu-picchu-tours.html` |
| `cusco` | Cusco | `./cusco-tours.html` |
| `valle-sagrado` | Valle Sagrado | `./all-experiences.html?destino=valle-sagrado` |
| `montana-colores` | Montaña de Colores | `./all-experiences.html?q=vinicunca` |
| `laguna-humantay` | Laguna Humantay | `./all-experiences.html?q=humantay` |
| `ancestral` | Experiencias ancestrales | `./all-experiences.html?q=ancestral&destino=cusco` |
| `aventura-naturaleza` | Aventura y naturaleza | `./trekkings.html` |
| `todos-tours` | Todos los tours | `./all-experiences.html?tipo=tour` |

## Opciones — pestaña "Paquetes y circuitos"

| Clave (`intent`) | Etiqueta | Ruta base |
|---|---|---|
| `solo-machu-picchu` | Solo Machu Picchu / 2D-1N | `./machu-picchu-overnight.html` |
| `cusco-machu-picchu` | Cusco + Machu Picchu | `./paquetes-cusco.html` |
| `lima-cusco` | Lima + Cusco + Machu Picchu | `./explora-peru.html?route=lima-cusco` |
| `lima-paracas-cusco` | Lima + Paracas/Ica + Cusco + Machu Picchu | `./explora-peru.html?route=lima-paracas-cusco` |
| `sur-peru` | Sur del Perú | `./explora-peru.html?route=lima-paracas-arequipa-puno-cusco` |
| `sur-amazonia` | Perú Sur + Amazonía | `./explora-peru.html?route=peru-sur-amazonia` |
| `circuitos-peru` | Todos los circuitos por Perú | `./explora-peru.html` |
| `peru-personalizado` | Diseña un viaje a medida | `./quote-packages.html?intent=peru-personalizado` |

## Filtrado en `explora-peru.html` (`assets/js/pages/catalog-landing.js`)

`getPageConfig()` ahora también lee de `window.location.search` (con prioridad sobre los
`data-catalog-*` del `<body>`): `route`, `minDays`, `maxDays`, `destination`/`destino`.

`route` se resuelve contra un mapa `ROUTE_REQUIRED_BLOCKS` construido directamente desde los
`routeTemplates`/`destinationBlocks` reales de `assets/data/packages-peru.json` (no se inventaron
rutas nuevas): cada card debe tener, en `search.destinations`/`search.keywords`, al menos un slug
de cada bloque requerido por la ruta (ej. `lima-cusco` exige "lima" y "cusco"/"machu-picchu").

Si el filtro no produce resultados, `#catalogLandingEmpty` deja de estar permanentemente oculto
(se eliminó una regla `display:none !important` heredada que lo bloqueaba siempre) y ahora
muestra un mensaje contextual + botón de WhatsApp "Solicitar itinerario personalizado".
