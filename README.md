# My Cusco Trip — Modificación técnica del cotizador `quote-packages`

Intervención incremental sobre el motor existente. No se reescribió `quote-packages.js` ni `package-generator.js`, no se introdujeron frameworks ni backend nuevo, y ningún archivo fuera de esta lista fue tocado (verificado con `diff -rq` contra el ZIP original).

---

## ARCHIVOS MODIFICADOS

### `quote-packages.html`
**Qué se modificó:** se agregaron 3 bloques HTML nuevos (Destinos del viaje, Circuito de Machu Picchu, Vuelos nacionales), 1 fila nueva en el panel de resumen (`#flightSummaryRow`) y 1 modal nuevo (`#flightSelectionModal`, calcado del de trenes). Se subieron las versiones de caché (`?v=`) de `quote-packages.css`, `package-generator.js` y `quote-packages.js`.
**Por qué:** son los puntos de entrada visuales que pide el documento (destinos, circuito, vuelos) y no existía ningún HTML previo para ellos. Subir el `?v=` es necesario para que el navegador no sirva las versiones viejas en caché tras el despliegue.

### `assets/js/pages/quote-packages.js`
**Qué se modificó:**
1. `isOvernightTrainSelectionConfig()`: `option?.connectionMode` (truthy) → `option?.connectionMode === "sacred-valley-connection"`.
2. `getAccommodationPlan()`: mismo fix de comparación + ahora también agrega Lima al plan de alojamiento cuando corresponde.
3. `getDynamicTrainTimeWindow()`: nueva rama para Overnight directo (ver `isDirectOvernightSelection()`).
4. `buildItineraryItems()`: nueva rama para partir el Overnight directo en 2 días (traslado + visita); firma extendida con un segundo parámetro opcional `overrideTotalDays` (sin romper compatibilidad con las llamadas existentes).
5. `generateAndRenderOptions()`: ahora filtra por destinos seleccionados y descuenta los días de la extensión Lima antes de pedir opciones al generador.
6. `getNonDiscountableSubtotal()`, `updateSummary()`, `updatePrintableTemplate()`, `renderReservationSummary()`, `selectPackageOption()`, `canOpenReservationModal()`, `buildQuoteReservationPayload()`, `clearDependentSections()`, `init()`: se extendieron para integrar vuelos, circuito Machu Picchu, destinos y Lima en el flujo existente (resumen, impresión, PDF, WhatsApp, reserva).
7. Se agregó el bloque completo nuevo "Extensión: Destinos, extensión Lima, vuelos nacionales, circuito Machu Picchu" (antes de `bindEvents()`).
**Por qué:** corregir el bug de clasificación pedido en la sección 1 del documento y cablear las 5 funcionalidades nuevas (destinos, Lima, vuelos, circuito, overnight directo) sobre el `state` y los patrones de render/modal ya existentes (mismo estilo que hoteles/trenes, mismo `document.addEventListener("click", ...)`).

### `assets/js/core/package-generator.js`
**Qué se modificó:**
1. `applyOperationalRules()`: se agregó `if (option.machuPicchuMode === "overnight") option.requiresOvernight = true;` (y el equivalente para `overnight-express`), sin pisar ningún `true` ya existente.
2. `getShortPackageCommercialSeeds()`: se agregó la semilla `3d2n-opcion-6-machu-overnight-directo` (`["CUZ001","CUZ002","MAPI003"]`) y su equivalente en 4D/3N (`4d3n-machu-overnight-directo-ultimo-dia-*`).
**Por qué:** `requiresOvernight` históricamente solo se marcaba al forzar la conexión Valle Sagrado; un Machu Picchu Overnight sin Valle Sagrado es un caso válido nuevo y necesita el mismo trato (noche en Aguas Calientes, ventana de tren). Las semillas nuevas son la variante de itinerario pedida en la sección 4, reutilizando el producto `MAPI003` existente sin duplicarlo.

### `assets/css/quote-packages.css`
**Qué se modificó:** se agregó un bloque nuevo al final del archivo con los estilos de las tarjetas de destino/aerolínea/circuito/ruta (reutilizando la paleta y el patrón `.quote-choice-dot`/`.is-selected` ya existentes) y un fix puntual (`#flightAirlineContainer[hidden], #flightSelectorsContainer[hidden] { display: none; }`).
**Por qué:** ese fix corrige un bug real que encontré probando: mis propias clases `.quote-airline-grid`/`.quote-train-selector-grid` definen `display: grid` con la misma especificidad CSS que la regla `[hidden]` del navegador, y por orden de cascada le ganaban — el contenedor quedaba visible aunque tuviera el atributo `hidden`. Nada de esto existía antes de esta tarea; es autocontenido a los 2 elementos nuevos.

### `assets/data/ui-translations.json`
**Qué se modificó:** `"search.tours"` (bloque `es`) pasó de `"Tours y experiencias"` a `"Tours"`.
**Por qué:** sección 31 del documento — ese texto se salía del botón en mobile. Ningún otro idioma ni ninguna otra clave fue tocada.

### `assets/css/search-bar.css`
**Qué se modificó:** en `.search-bar .mct-tab` (breakpoint `≤768px`) se reemplazó `white-space: nowrap;` por `white-space: normal; overflow: hidden; overflow-wrap: break-word; word-break: break-word;`.
**Por qué:** sección 31 — no depender de `nowrap` para evitar que un texto i18n más largo vuelva a desbordar el botón en el futuro. El alto fijo de 70px ya admite 2 líneas.

---

## ARCHIVOS NUEVOS

### `assets/data/domestic-flights.json`
Catálogo estático de horarios de referencia LATAM/JetSMART Lima↔Cusco, transcrito exactamente de las capturas del documento (24 LATAM LIM→CUZ, 21 LATAM CUZ→LIM, 18 JetSMART LIM→CUZ, 9 JetSMART CUZ→LIM — verificado programáticamente que ningún `referenceFareUsd` de LATAM supera USD 86.00 y que no hay rutas+horarios duplicados). `referenceFareUsd` nunca se muestra ni se usa para cobrar; solo queda como trazabilidad interna, tal como pide la sección 22.

---

## RESUMEN DE IMPLEMENTACIÓN

### Trenes
- Corregido el bug de `connectionMode` truthy en los 2 sitios reales donde importaba (`isOvernightTrainSelectionConfig`, `getAccommodationPlan`).
- `getDynamicTrainTimeWindow()` ahora distingue 3 casos: Full Day (04:00–12:00 ida / 14:00–22:30 retorno), Overnight + Valle Sagrado (15:00–22:00 ida / 14:00–22:30 retorno) y Overnight directo (04:00–22:00 ida, permite trenes tempranos / 14:00–22:30 retorno).
- Se mantienen intactas todas las reglas ya existentes de operador, ruta, nacionalidad, categoría, compatibilidad ida/retorno, PeruRail/Inca Rail — no se tocó `getTrainOptions()`.

### Overnight
- `applyOperationalRules()` ahora deriva `requiresOvernight`/`requiresOvernightExpress` directamente del modo real del tour Machu Picchu incluido, no solo de la conexión Valle Sagrado.
- Nueva variante "Machu Picchu Overnight directo" (3D/2N y 4D/3N), sin `CUZ003CON`/`CUZ003VIPCON`, reutilizando `MAPI003` sin duplicar el producto en el JSON.
- El itinerario de esta variante se reparte en 2 días (traslado a Aguas Calientes + visita/retorno), igual que la conexión Valle Sagrado, pero con un traslado sintético en vez de un segundo tour real — cambio acotado a `totalDays >= 3` para no afectar el fallback existente de 2D/1N.
- Badge y texto comercial propios ("Overnight directo") para que la opción sea identificable en la lista.

### Destinos
- Sección nueva "Destinos de tu viaje" (Cusco/Machu Picchu/Lima, Cusco y Machu Picchu inician marcados). Validado: no se puede desmarcar el último destino activo.
- **Solo Cusco:** se genera el paquete normal (el motor siempre incluye Machu Picchu por diseño) y se retira Machu Picchu + cualquier conexión Valle Sagrado del resultado — al quedar sin tour MAPI, trenes/hotel Aguas Calientes/circuito se ocultan solos porque ya dependían de `getMachuTour()`.
- **Solo Machu Picchu:** nunca rellena artificialmente el resto del rango de fechas — ofrece únicamente Full Day (1 día) u Overnight (2 días), tal como pide el ejemplo del documento.

### Lima
- Extensión fija de 3 días (Llegada Lima / `PER003` Paracas-Ica-Huacachina / Continuación a Cusco), prepuesta al itinerario Cusco/Machu Picchu ya generado sin tocar la lógica interna de `buildItineraryItems()` (solo se le pasa un total de días ajustado).
- Reutiliza `PER003` de `tours-peru.json` tal cual — no se duplicó. Si trae `pricingStatus: "reference_pending_confirmation"` (que sí lo trae hoy), **no se inventa costo**: no suma nada al total y el itinerario muestra "Tarifa por confirmar con el operador".
- Hoteles de Lima: `getHotelsForDestination()` ya era genérica por destino; solo hizo falta que `getAccommodationPlan()` también emitiera la entrada `lima` — el modal de hoteles funciona igual que para Cusco/Aguas Calientes sin cambios adicionales.

### Vuelos
- Checkbox "Incluir vuelos Lima – Cusco – Lima" → selección única de aerolínea (JetSMART/LATAM, tarjetas, no checkboxes múltiples) → selector de vuelo ida/vuelta con logo, horarios, "Directo" y badge "+1 día" cuando aplica.
- Tarifa comercial centralizada en `DOMESTIC_FLIGHT_FLAT_RATES` (sameMonth/months2to3/after3Months × JetSMART/LATAM), calculada una sola vez en `getFlightRoundTripRateUSD()` y usada en todos lados (nunca `referenceFareUsd`).
- `flightTotalUSD = tarifa × (adultos + niños)`, integrado en subtotal/total/USD-PEN/resumen/impresión/PDF/WhatsApp.
- Aviso "Horario sujeto a disponibilidad al momento de emisión." visible en la sección y en el resumen de reserva.
- Si vuelos pasa a OFF: se limpian aerolínea y vuelos seleccionados, sin sumar tarifa.

### Circuitos
- Circuito 1/2/3 con sus rutas (1A–1D, 2A–2B, 3A–3D), sin preselección inicial.
- Cambiar de circuito limpia la ruta previamente elegida.
- Si Machu Picchu está en la cotización sin ruta seleccionada: mensaje de validación visible, se permite seguir viendo la vista previa, pero **"Reservar" queda bloqueado** hasta elegir circuito y ruta (`canOpenReservationModal()`).
- Circuito/ruta guardados en `state`, mostrados en el resumen de reserva, la impresión y el payload de WhatsApp/reserva. No se altera el precio del ticket por elegir un circuito u otro (no hay ninguna regla real de precio diferenciado por circuito en el proyecto).

### Mobile
- Fix del overflow de "Tours y experiencias" → "Tours" (clave i18n `search.tours`, español).
- CSS del tab del search-bar ya no depende de `white-space: nowrap`.
- Revisé el posible conflicto `.mct-submit` vs `.mct-submit-group .mct-submit` que pide el documento: hoy el botón **ya está centrado correctamente** vía `margin: 12px auto 10px` (una técnica estructural, no `position:absolute` ni offsets mágicos) — no hay bug de layout activo, así que no se tocó nada ahí para no arriesgar algo que ya funciona.
- Las nuevas grillas (destinos, aerolíneas, circuito, rutas) pasan a una columna en `≤768px`.

---

## PRUEBAS

Todo se probó con Playwright (navegador real, no simulado) contra el proyecto ya modificado. **32/32 casos pasaron.**

**Los 8 casos obligatorios del documento (con datos reales del propio catálogo):**

| Caso | Resultado |
|---|---|
| TRAIN TEST 1 — Full Day: ida 04:00–12:00, retorno ≥14:00 | ✅ |
| TRAIN TEST 2 — Overnight+Valle Sagrado: ida 15:00–22:00 | ✅ |
| TRAIN TEST 3 — Overnight directo: permite tren temprano (<12:00) | ✅ |
| DESTINATION TEST — Solo Machu Picchu con rango de 10 días no crea 10 días artificiales | ✅ |
| LIMA TEST — Día 1 Llegada a Lima, Día 3 Continuación a Cusco | ✅ |
| LATAM FILTER TEST — ningún vuelo LATAM > USD 86.00 | ✅ |
| LATAM DUPLICATE TEST — sin duplicados de ruta+horario | ✅ |
| FLIGHT PRICING TEST — tarifas correctas por franja de fecha | ✅ |
| ARRIVAL +1 TEST — CUZ 22:45→LIM 00:15 guarda `arrivalDayOffset:1` y lo muestra | ✅ |
| MOBILE TEST — 320/375/390/430px sin overflow horizontal | ✅ |

**Regresión (13 casos adicionales):** generación normal de paquetes 5D/4N, selección de hotel Cusco, selección de tren ida/retorno, cambio de nacionalidad (fuerza USD para extranjeros), cambio de moneda PEN↔USD recalcula el total, marcar un extra opcional cambia el total, parámetros de URL (`?days=&adultos=&fechaInicio=`) se aplican al cargar, el nuevo requisito de circuito/ruta bloquea "Reservar" hasta completarlo y luego lo desbloquea correctamente, cero errores de JavaScript en todo el flujo.

Durante las pruebas encontré y corregí 2 bugs propios (no preexistentes): el `hidden` que no ocultaba visualmente los contenedores de vuelos (ver arriba, CSS) y el botón de vuelos que decía "Elegir tren" por reutilizar la clave de traducción del tren en vez de una propia.

---

## PENDIENTES (nada inventado — se avisa expresamente)

- **Persistencia en `localStorage`:** el documento pide "integrar con el mecanismo actual de persistencia/localStorage" para el nuevo estado. Auditando el código confirmé que **ese mecanismo no existe hoy**: hay una constante `STORAGE_KEY = "mct_quote_package_state_v81"` definida pero nunca usada — `grep -n "localStorage"` en `quote-packages.js` no arroja ningún resultado. El cotizador vive solo en memoria durante la sesión de la pestaña. No inventé un sistema de persistencia nuevo desde cero (sería una función completa, no una integración incremental); si lo quieres, es un paso siguiente concreto y acotado.
- **`.mct-submit` vs `.mct-submit-group .mct-submit`:** revisado, no hay bug activo hoy (ver sección Mobile arriba). Lo dejo señalado por si en el futuro se agrega una regla `width`/`min-width` dentro de `.mct-submit-group .mct-submit`, que sí ganaría por especificidad sobre `.mct-submit` suelto.
- **Precio diferenciado por circuito/ruta de Machu Picchu:** no existe ninguna regla real en el proyecto que asocie un precio distinto a 1A vs 2A vs 3D, así que no se inventó ninguna — el circuito/ruta es puramente informativo y de disponibilidad, tal como pide la sección 28 ("No alterar automáticamente el precio del ticket salvo que exista una regla explícita real").
- **Selección Lima ON con Cusco/Machu Picchu OFF:** el documento solo da el ejemplo combinado (Lima+Cusco+Machu Picchu+Vuelos ON). No implementé validación específica para "Lima sola" como producto independiente porque no hay ningún ejemplo ni regla de negocio para ese caso en el documento — hoy simplemente antepone sus 3 días igual, sin bloquear la combinación, pero tampoco fue un caso pedido explícitamente para probar.

---

## Integración

Copia estos 7 archivos a las mismas rutas relativas de tu proyecto real. No se requiere ningún cambio en ningún otro archivo. El proyecto sigue siendo 100% HTML/CSS/JS vanilla + JSON, compatible con GitHub Pages.
