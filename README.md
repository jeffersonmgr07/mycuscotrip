# My Cusco Trip — Modificación técnica del cotizador `quote-packages`

Intervención incremental sobre el motor existente. No se reescribió `quote-packages.js` ni `package-generator.js`, no se introdujeron frameworks ni backend nuevo, y ningún archivo fuera de esta lista fue tocado (verificado con `diff -rq` contra el ZIP original).

Este documento acumula **4 rondas de trabajo**. La Ronda 1 (funcionalidades del cotizador: destinos, Lima, vuelos, circuitos, overnight directo) está descrita en detalle más abajo. Las rondas 2, 2.1, 3 y 4 (todas mejoras puntuales al formato de impresión/PDF, en ese orden cronológico, la última siguiendo una especificación formal punto por punto) se describen primero, cada una en su propia sección. **La Ronda 4 es la más reciente y describe el estado final de las 3 secciones que cambiaron de estructura (Vuelos, Tickets de tren, Plan flexible) — si hay alguna diferencia con lo descrito en rondas anteriores, la Ronda 4 es la vigente.**

---

## RONDA 2 — Mejoras puntuales de impresión/PDF (2026-08-16)

Todos los cambios de esta ronda son **exclusivos del formato de impresión/PDF**, excepto el último punto (horarios de llegada/salida), que es funcional porque esos horarios alimentan la lógica de armado del itinerario.

### 1. Barras de título unificadas en impresión
Las secciones "Servicios incluidos", "Alojamientos incluidos", "Detalles de pago", "Itinerario detallado" y "Condiciones importantes" tenían una barra verde con un espacio en blanco arriba y esquinas cuadradas, distinta a la de "Datos del cliente"/"Datos del viaje". Causa raíz encontrada con `getComputedStyle()` real (no solo leyendo CSS): una regla vieja y suelta (`.print-section { padding-top: 3.4mm !important; margin-top: 3.6mm !important; }`, línea ~3096 de `quote-packages.css`) sobrevivía a varios parches posteriores porque nada la neutralizaba puntualmente. Se agregó **un solo bloque nuevo, incondicional, al final de la hoja de estilos** (`.print-section { margin-top:0; padding-top:0; } .print-section h3 { margin:0 0 1mm; border-radius:2.5mm; }`) que gana el cascade sin tocar ni entender los ~6 bloques conflictivos anteriores. Verificado por Playwright: el espacio sobre la barra ahora es idéntico (mismo valor en píxeles) al de "Datos del cliente"/"Datos del viaje" en los 3 tipos de sección revisados.

### 2. Nueva sección impresa "Vuelos incluidos"
Aparece solo cuando la cotización incluye vuelos (después de "Itinerario detallado", antes de "Condiciones importantes"). Muestra aerolínea + logo, cantidad de pasajeros cubiertos, y dos "tickets" (ida/vuelta) con fecha, hora y aeropuerto completo de salida y llegada (mapeo `LIM`→"Aeropuerto Internacional Jorge Chávez (Lima)", `CUZ`→"Aeropuerto Internacional Alejandro Velasco Astete (Cusco)"). El número de vuelo se muestra solo si el dato existiera en `domestic-flights.json` (hoy no existe ese campo en el catálogo, así que no se inventa). La fecha del vuelo de ida usa el día real en que ocurre el traslado a Cusco (considera el offset de 3 días si hay extensión Lima); la de retorno usa la fecha final del viaje.

### 3. Etiquetas de "Detalles de pago" enriquecidas (mismo número de filas)
Sin agregar ni quitar ninguna fila:
- "Adultos x2" → **"Adultos (Experiencias y tours) x2"** (y lo mismo para Niños).
- "Alojamiento" → **"Alojamiento (Habitación triple, 6 noches)"**, con el paréntesis en peso normal (no negrita) — usa el nombre de tipo de habitación que ya existe en `hotels.json` (p. ej. "Habitación triple"), no se inventó una palabra nueva.
- "Trenes" → **"Trenes (ida y vuelta por 2 adultos)"** o **"... por 2 adultos + 1 niño"** según pasajeros (solo si hay tren elegido).
- "Extras" → **"Extras (boletos, entradas, almuerzos y más) x2"**.
- "Vuelo nacional" → renombrado a **"Vuelo Lima-Cusco-Lima (ida y vuelta por 2 adultos)"**.

### 4. Nueva sección impresa "Plan flexible de pagos"
Aparece después de "Condiciones importantes" y antes del banner de oferta especial. Muestra el **total cotizado sin ningún descuento** (ni cupón ni el 5% por pago total) dividido en 4 cuotas: 1ª = 40%, las 3 restantes = 20% cada una.

**Cronograma de fechas** (interpretación mía de tus indicaciones — avísame si esperabas algo distinto):
- **Con margen suficiente** antes del viaje: cuota 1 a los 2 días desde hoy, y cada cuota siguiente 15 días después de la anterior (2 → 17 → 32 → 47 días, ~47 en total).
- **Si el viaje está más cerca que esos 47 días:** las fechas se comprimen dividiendo los días que faltan para viajar en 4 partes iguales, empezando hoy (cuota 1 = hoy). Ejemplo verificado con Playwright: viaje a 20 días → cuotas en +0, +5, +10 y +15 días, dejando 5 días de margen antes de viajar — igual al ejemplo que diste.
- Se agregó una nota debajo del cronograma explicando que el descuento del 5% por pago total solo aplica si la reserva se paga completa con 90 días o más de anticipación al viaje (tu mención de "90 días"). **Esto es solo texto informativo en el PDF** — no cambié la lógica real de cálculo del descuento en pantalla (`getPaymentBreakdown()`), porque nada me indicó que ese cálculo en vivo debía cambiar, y me pediste explícitamente no tocar nada más de lo pedido.
- Se agregó una nueva condición a "Condiciones importantes": si no se paga alguna cuota en la fecha acordada, la reserva y el itinerario cotizado quedan sin efecto, sin derecho a reclamo sobre lo ya pagado.

### 5. Horarios de llegada/salida = horarios del vuelo (cambio funcional, no solo impresión)
Cuando "Incluir vuelos" está activo y hay vuelo de ida/vuelta elegido, sus horarios **prevalecen** sobre lo escrito manualmente (o vacío) en "Hora de llegada"/"Hora de salida":
- `arrivalTime` = hora de llegada del vuelo de ida **+ 1 hora** de margen operativo.
- `departureTime` = hora de salida del vuelo de retorno, directamente.

Si el usuario edita el campo manualmente después de tener vuelos elegidos, el horario del vuelo se reimpone de inmediato (verificado con Playwright: escribir "06:00" a mano con un vuelo ya elegido no lo deja fijo, vuelve al horario del vuelo). Esto es funcional porque `arrivalTime`/`departureTime` deciden qué tours pueden agendarse el día 1 y el último día del itinerario. Se usó `renderItineraryPreview()` (no `generateAndRenderOptions()`) para refrescar la vista previa tras elegir un vuelo, para no reiniciar el hotel/tren ya elegidos — `generateAndRenderOptions()` sí sigue reiniciándolos al editar la hora a mano, igual que ya lo hacía antes de esta tarea (comportamiento preexistente, no tocado).

### Auditoría de imágenes — extensión Lima (pediste esta revisión aparte)
Encontré la causa exacta de las imágenes genéricas/repetidas:
- **Día 1 "Llegada a Lima" y Día 3 "Continuación Lima → Cusco":** ambos caían al mismo fallback genérico `./assets/img/quote/fallbacks/cusco.jpg` porque `getActivityImage()` no tenía ninguna regla para detectar texto relacionado con Lima. Corregido: ahora usan dos rutas dedicadas nuevas, **`./assets/img/quote/fallbacks/lima-llegada.jpg`** y **`./assets/img/quote/fallbacks/lima-cusco.jpg`**. Sube tus fotos con esos nombres exactos en `assets/img/quote/fallbacks/` y se mostrarán automáticamente — no hace falta tocar código.
- **Día 2 (PER003, Islas Ballestas/Ica/Huacachina):** el tour usa la imagen genérica compartida de todo el sitio `./assets/img/placeholder/experience.jpg` (repetida 4 veces en su propio JSON) — **no se podía simplemente reemplazar ese archivo**, porque lo comparten otros tours del sitio que aún no tienen foto propia. En su lugar, actualicé `assets/data/tours-peru.json` (tour `PER003`) para que apunte a 3 rutas dedicadas nuevas: **`./assets/img/peru/per003-islas-ballestas.jpg`**, **`./assets/img/peru/per003-ica-bodega.jpg`** y **`./assets/img/peru/per003-huacachina-buggies.jpg`**. Sube tus 3 fotos con esos nombres en `assets/img/peru/` (carpeta nueva) y se mostrarán automáticamente.

Ninguna de estas 5 rutas nuevas existe todavía como archivo — hasta que subas las fotos, esos 3 días mostrarán un ícono de imagen rota en vez del placeholder genérico anterior. Avísame si prefieres que mientras tanto sigan mostrando algo genérico en vez de romperse visualmente.

### Archivos tocados en la Ronda 2
`quote-packages.html`, `assets/js/pages/quote-packages.js`, `assets/css/quote-packages.css` (los 3 ya listados en la Ronda 1 — se sumaron cambios) y `assets/data/tours-peru.json` (nuevo en esta ronda, solo se tocó el campo `images` del tour `PER003`).

### Pruebas de la Ronda 2
26/26 casos Playwright nuevos (barras de título, sección de vuelos, etiquetas de pago, plan de cuotas con cronograma normal y comprimido, sincronización de horarios con vuelos, imágenes de Lima) + los 32/32 casos de la Ronda 1 (19 + 13) siguen pasando sin cambios — cero regresiones.

---

## RONDA 2.1 — Ajustes puntuales tras revisión (2026-08-16)

Tres correcciones exclusivas de impresión/PDF sobre lo entregado en la Ronda 2:

### 1. "Vuelos incluidos" ya no parece 2 secciones
Cada vuelo (ida/vuelta) tenía su propia barra verde de título, dando la impresión de ser 2 secciones distintas. Se quitó esa barra por vuelo — ahora hay **una sola** barra de título ("Vuelos incluidos") y debajo, un itinerario en 3 recuadros de la misma altura: uno angosto con el logo de la aerolínea + "Operado por [Aerolínea]" + pasajeros cubiertos, y dos recuadros de igual proporción (ida/vuelta) con hora + código de aeropuerto de salida y llegada, ícono de avión + "Directo" + duración en el medio, nombre completo de ambos aeropuertos debajo, y una lista de condiciones de tarifa: incluye artículo personal/bolso y asiento aleatorio; **no incluye** equipaje de mano (10kg) ni facturado (23kg) — mostrados tachados en gris, como me indicaste. Todo más compacto verticalmente que la referencia que enviaste; mantuve la paleta de colores propia del proyecto (verde oscuro/blanco), no los colores de tu imagen de referencia — la usé solo como guía de estructura.

### 2. Espacio en blanco en "Plan flexible de pagos"
Las filas tenían la etiqueta ("Cuota 1 · 40%") pegada a la izquierda y la fecha+monto empujados al extremo derecho, dejando un hueco grande en el medio. Ahora "Cuota 1 · 40%" y la fecha están agrupados juntos a la izquierda, y el monto queda al margen derecho — igual al ejemplo que diste.

### 3. Texto del pie de página
"Gracias por cotizar con My Cusco Trip." → **"Gracias por elegir My Cusco Trip."**

### Archivos tocados en esta sub-ronda
Los mismos 3 de la Ronda 2 (`quote-packages.html`, `assets/js/pages/quote-packages.js`, `assets/css/quote-packages.css`) — ya actualizados en este paquete. No se tocó `assets/data/tours-peru.json` de nuevo.

### Pruebas
Los mismos 26/26 casos de la Ronda 2 + los 32/32 de la Ronda 1 (19+13) siguen en verde. Verificado visualmente con capturas de pantalla en modo impresión real.

---

## RONDA 3 — Paginación, márgenes y rediseño de Vuelos/Plan de pagos (2026-08-16)

Corrección más profunda del formato de impresión/PDF: reordenamiento de secciones, paginación forzada en 3 hojas, márgenes de página, y rediseño de "Vuelos incluidos" y "Plan flexible de pagos". Verificado generando un PDF real (no solo capturas de pantalla) e inspeccionando cada hoja por separado.

### 1. El total cotizado ya no se corta entre hojas
Causa raíz: "Detalles de pago" vivía después de "Alojamientos incluidos", y una regla vieja (`.print-section--payment { break-inside: auto }`) permitía partir esa sección a media fila si no cabía completa en la hoja 1 — exactamente lo que pasaba al elegir varios extras. Se quitó esa excepción (ahora "Detalles de pago" nunca se parte a media fila, igual que las demás secciones) y, más importante, se reordenaron las secciones para que quepa completa junto con "Servicios incluidos" en la hoja 1.

### 2. Reordenamiento y paginación forzada en 3 hojas
Orden nuevo, con saltos de página forzados (verificado con un PDF real de 4 hojas: la 4ª aparece solo porque el itinerario de 5 días con fotos no entra en una sola hoja, no por un error):
- **Hoja 1:** Datos del cliente/viaje, Servicios incluidos, Detalles de pago.
- **Hoja 2:** Alojamientos incluidos, Vuelos incluidos.
- **Hoja 3:** Itinerario detallado (y lo que sigue — Condiciones importantes, Plan flexible de pagos, banner de oferta — continúa a partir de aquí; si el itinerario es largo, como en cualquier itinerario real de varios días con fotos, esas secciones finales pueden pasar naturalmente a una 4ª hoja).

### 3. Espaciado y márgenes de página
- Más espacio entre secciones (`margin-bottom` de 1.55mm a 6mm) para que no se vea amontonado.
- Margen de al menos 10mm arriba en las 3 hojas (medido directamente sobre el PDF generado, no solo en pantalla). El margen inferior de la hoja 1 y de las hojas con salto forzado también quedó cubierto.
- **Limitación conocida, avisada expresamente:** si una sección se pasa naturalmente a una hoja nueva (sin que yo haya puesto un salto forzado ahí — por ejemplo, "Condiciones importantes" cayendo a una 4ª hoja si el itinerario es muy largo), esa hoja en particular no tiene el margen superior de 10mm garantizado. Arreglar esto de forma general requeriría cambiar `@page { margin: 0 }` por un margen de página real, lo cual toca cómo se posiciona todo el documento imprimible (`position: absolute` + ancho fijo de 210mm) y es una modificación de mucho más riesgo para el resto del formato ya afinado en rondas anteriores. Preferí no arriesgar esto sin que me lo confirmes explícitamente.

### 4. "Vuelos incluidos" ya no parece 2 secciones + íconos de equipaje
- Se quitó la barra de título verde de cada vuelo — ahora hay una sola barra ("Vuelos incluidos") con una línea de introducción ("Operado por LATAM · Cubre 2 adultos") y, debajo, 3 recuadros en fila: uno angosto solo con el logo de la aerolínea, y dos de igual proporción para el vuelo de ida y el de vuelta.
- Las condiciones de equipaje ya no son texto — son íconos: bolso/artículo personal y asiento (verde, incluido), maleta de mano 10kg y maleta facturada 23kg (gris con un tache, no incluido), usando Font Awesome (ya cargado en el proyecto).

### 5. "Plan flexible de pagos" dividido en 2 sub-bloques
- Las 4 cuotas ahora son una tabla compacta (Cuota | % | Fecha | Monto) en vez de 4 tarjetas apiladas — mucho menos alto.
- Debajo, un recuadro aparte y destacado "Condiciones del plan de pagos" con 3 puntos: el descuento del 5% solo aplica con 90+ días de anticipación, no aplica si el viaje es antes de eso, y el incumplimiento de una cuota deja sin efecto la reserva.

### Archivos tocados
Los mismos 3 de siempre: `quote-packages.html`, `assets/js/pages/quote-packages.js`, `assets/css/quote-packages.css`.

### Pruebas
26/26 casos Playwright (incluye los ajustados a la nueva tabla de cuotas) + 32/32 de la Ronda 1, todos en verde. Además, generé un PDF real con `page.pdf()` (motor de impresión de Chromium, el mismo que usa "Imprimir" del navegador) con hotel + tren + vuelos + 3 extras elegidos, y confirmé hoja por hoja: el total cotizado aparece completo en la hoja 1, la hoja 2 empieza en Alojamientos, la hoja 3 empieza en Itinerario, y los márgenes de 10mm están donde se esperaba.

---

## RONDA 4 — Reestructuración puntual según especificación formal (2026-08-16)

Esta ronda implementa al pie de la letra el documento "Reestructuración puntual del PDF de cotización My Cusco Trip" que enviaste. Es una intervención quirúrgica: cambia el orden de secciones, la estructura de Vuelos incluidos y Plan flexible de pagos, y crea Tickets de tren incluidos — nada más. Todo lo demás (encabezado, Datos del cliente/viaje, Servicios incluidos, Detalles de pago, Itinerario detallado, Alojamientos incluidos, Condiciones importantes, Oferta especial, Footer) conserva exactamente su diseño, colores, tipografía y contenido — solo cambia de posición cuando el documento lo pedía.

### A. Archivos modificados
Los mismos 3 de siempre:
- `quote-packages.html` — orden de secciones + nueva sección `#printTrainSection`.
- `assets/js/pages/quote-packages.js` — lógica de renderizado de Vuelos, Tickets de tren (nueva) y Plan flexible.
- `assets/css/quote-packages.css` — estilos de esas 3 secciones y las reglas de paginación, **editadas en el mismo lugar donde ya existían** (no se apilaron reglas nuevas al final del archivo por encima de las de la ronda anterior).

### B. Cambios realizados

**Orden del PDF** (criterio de aceptación del documento, verificado con un PDF real):
```
Encabezado → Datos cliente/viaje → Servicios incluidos → Detalles de pago
→ Vuelos incluidos [solo si existen]
════════ SALTO DE PÁGINA (único salto forzado) ════════
→ Itinerario detallado → Tickets de tren incluidos [solo si existen]
→ Alojamientos incluidos [solo si existen] → Plan flexible de pagos
→ Condiciones importantes → Oferta especial de reserva → Footer
```
"Detalles de pago" ya no vive lejos de "Servicios incluidos": los dos, más "Vuelos incluidos" si aplica, quedan juntos en la hoja inicial. Trenes/Hoteles/Plan flexible ya NO tienen salto de página propio — fluyen naturalmente y aprovechan el espacio que quede después del itinerario, exactamente como pedía el punto 41 del documento (lo verifiqué con un itinerario de 8 días: Tickets de tren, Alojamientos, Plan flexible y Condiciones importantes comparten la misma hoja donde termina el Día 8, sin salto artificial).

**Vuelos incluidos**: ahora ocupa el 100% del ancho útil (igual que Servicios/Detalles de pago), con 3 recuadros: uno angosto (≈18%) "OPERADO POR / [Aerolínea] / [logo]", y dos de igual proporción (ida y vuelta, ancho idéntico, verificado programáticamente) con hora, código de aeropuerto, ciudad corta ("Lima → Cusco" en vez del nombre completo del aeropuerto, para no ganar altura innecesaria), y "Directo · duración". El equipaje ya no son 4 bloques verticales con íconos — es una sola línea de texto compartida para toda la sección: "Artículo personal incluido · Carry-on no incluido · Equipaje 23 kg no incluido · Asiento aleatorio". El +1 día de un vuelo que llega después de medianoche se muestra junto a la hora ("00:15 +1"), no como texto aparte.

**Tickets de tren incluidos** (sección nueva): misma lógica visual que Vuelos — recuadro de operador angosto + tren de ida + tren de retorno de igual ancho. Reutiliza el logo de operador que ya existía (`getTrainLogoPath()`, Inca Rail / PeruRail), sin descargar nada nuevo. Cada tramo muestra hora y estación de salida, una flecha hacia abajo, hora y estación de llegada, y el nombre del servicio (p. ej. "The Voyager") — igual al ejemplo del documento. Es tolerante a que ida y vuelta sean de operadores distintos (si difieren, el recuadro izquierdo muestra ambos nombres y cada tramo agrega el suyo) y a que solo exista un tramo (ida o retorno, no ambos).

**Plan flexible de pagos**: pasó de "tabla + condiciones debajo" a 2 columnas lado a lado a todo el ancho: izquierda "Plan de cuotas" (línea "Base: {total}" + tabla Cuota/%/Fecha/Monto), derecha "Condiciones de pago" (descuento del 5% con 90+ días, sin descuento si es antes, incumplimiento de cuota). Proporción verificada en 50/50. La cláusula de incumplimiento de cuotas, que en la ronda anterior había quedado mezclada dentro de "Condiciones importantes", se movió por completo a "Condiciones de pago" dentro de Plan flexible — donde corresponde según el punto 33 del documento — y "Condiciones importantes" volvió a sus 5 puntos originales aprobados.

**Renderizado condicional**: Vuelos incluidos, Tickets de tren y Alojamientos incluidos no dejan ningún rastro (ni placeholder, ni card vacío, ni espacio reservado) cuando no aplican — verificado revisando que su `innerHTML` quede vacío y la sección oculta.

**Paginación**: se limpiaron las reglas de la ronda anterior en el mismo lugar donde vivían (no se agregaron `!important` nuevos apilados al final). Ahora solo hay un salto de página forzado (antes de "Itinerario detallado"); "Detalles de pago" sigue protegido de partirse a media fila (la causa original del bug del total cotizado cortado); se agregó `break-inside: avoid` explícito a la oferta especial (antes solo lo tenía dentro de `@media print`, no en la ruta de html2pdf).

### C. Qué NO se modificó
Se mantuvieron intactos —diseño, colores, tipografía, contenido y estructura interna— y solo cambiaron de posición cuando correspondía:
- Encabezado / logo / datos de la agencia, título "COTIZACIÓN", código/emisión/válido hasta.
- Datos del cliente, Datos del viaje.
- Servicios incluidos, Detalles de pago (misma posición relativa entre sí).
- Itinerario detallado (cero cambios de diseño; los bloques por día conservan su propio `break-inside: avoid`, y la sección completa NO lo tiene, tal como pide el punto 40).
- Alojamientos incluidos (mismas cards, nombres, ciudad, noches, habitación, imágenes — solo cambió de posición).
- Condiciones importantes (mismos 5 puntos originales, solo se le quitó la cláusula de cuotas que no le correspondía).
- Oferta especial de reserva, Footer.
- Cálculos de tours, hoteles, trenes, vuelos, extras, descuentos, total, pago 100%, cuotas y fechas de cuotas: ningún número cambió, solo su presentación impresa.
- PayPal, checkout, Apps Script, y el cotizador interactivo (pantalla): no se tocó nada fuera de la plantilla imprimible.

### D. Pruebas
Con Playwright, generando PDFs reales con el motor de impresión de Chromium (`page.pdf()`, el mismo mecanismo detrás de "Imprimir" del navegador):
- Con vuelos + con trenes + con hoteles + extras (caso completo): orden correcto, anchos de Vuelos/Trenes/Plan flexible idénticos al de Servicios incluidos, ancho ida = ancho vuelta en vuelos y trenes, ida y vuelta en la misma fila (no se cae una debajo de la otra), plan de pagos ~50/50, una sola línea de equipaje compartida.
- Sin vuelos: sección oculta, sin restos de HTML.
- Sin trenes: sección oculta, sin restos de HTML.
- Sin hoteles: sección oculta.
- Sin trenes ni hoteles: Itinerario queda seguido directo de Plan flexible.
- Itinerario largo (8 días): confirma que Tickets de tren/Hoteles/Plan flexible/Condiciones comparten la misma hoja donde termina el itinerario, sin saltos artificiales.
- Los 32/32 casos de la Ronda 1 (19+13) y los 26/26 de la Ronda 2 (actualizados donde el propio documento pedía cambiar el comportamiento anterior) siguen en verde.

16/16 casos nuevos + 32/32 + 26/26 = **74/74 en verde**, cero errores de JavaScript en todo el flujo.

### E. Código
Se entregan los 3 archivos completos ya modificados (`quote-packages.html`, `assets/css/quote-packages.css`, `assets/js/pages/quote-packages.js`) en esta misma carpeta, listos para copiar a las mismas rutas relativas de tu proyecto.

---

## RONDA 1 — Funcionalidades del cotizador

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

Copia estos 8 archivos a las mismas rutas relativas de tu proyecto real (los 7 de la Ronda 1 + `assets/data/tours-peru.json` de la Ronda 2). No se requiere ningún cambio en ningún otro archivo. El proyecto sigue siendo 100% HTML/CSS/JS vanilla + JSON, compatible con GitHub Pages.

Después de copiar los archivos, sube tus fotos con estos nombres exactos para que reemplacen los placeholders genéricos (ver detalle en la sección "Auditoría de imágenes" de la Ronda 2):
- `assets/img/quote/fallbacks/lima-llegada.jpg`
- `assets/img/quote/fallbacks/lima-cusco.jpg`
- `assets/img/peru/per003-islas-ballestas.jpg`
- `assets/img/peru/per003-ica-bodega.jpg`
- `assets/img/peru/per003-huacachina-buggies.jpg`
