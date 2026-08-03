# Landing "Machu Picchu + Tours en Perú" — Entrega

## 1. Diagnóstico breve de arquitectura

Antes de programar se auditó el repo real (agente de exploración + lectura directa) para no duplicar nada existente:

- **Header/footer**: se cargan por fetch a `components/header.html` / `components/footer.html` e inyección por `innerHTML`, exactamente igual que en `landing/machu-picchu-alternativas.html`. Reutilizado tal cual (mismo `getSiteBasePath()` / `loadLandingComponent()`).
- **Header JS**: `assets/js/components/header.js` expone `window.initMyCuscoTripHeader()` (idempotente). Se reutiliza sin tocarlo.
- **i18n**: `assets/js/i18n.js` se carga para que el header/footer (que sí usan `data-i18n`) funcionen igual que en el resto del sitio. La landing en sí es 100% español, sin claves `data-i18n` propias, como pidió el requerimiento.
- **Tracking**: `window.mctTrack(evento, params, options)` (`assets/js/components/tracking.js`) se reutiliza sin modificarlo. Los nombres de evento pedidos (`landing_view`, `addon_added`, etc.) no estaban en su `eventMap` interno, pero la función ya hace fallback al nombre crudo para eventos no mapeados, así que no fue necesario tocar `tracking.js`.
- **API client**: `window.MyCuscoTripApiClient` (`assets/js/core/api-client.js`) se reutiliza para `validateCoupon()` y `createPreReservation()`, sin modificarlo.
- **Cupones**: `assets/data/discount-codes.json` es la fuente real de cupones (`code, type, value, active, label`). **No tiene** hoy `expiresAt`, `minAmount`, `allowedServices` ni `singleUse` — el validador de la landing sí los respeta si algún día se agregan al JSON, pero no puede inventar reglas que no existen en los datos actuales.
- **`coupon-popup.js`**: es un pop-up de captura de leads (marketing), no el sistema de aplicar cupón en el carrito. No se usó directamente; solo se tomaron prestadas convenciones (uso de `escapeHtml`, `trackEvent`).
- **Precios/carrito multi-servicio**: se confirmó que **no existe** en el sitio ningún patrón de "varios servicios independientes, cada uno con su propia fecha, en una sola reserva". `product.js` maneja un solo producto/una sola fecha; `quote-packages.js` maneja un rango de fechas único con un itinerario generado automáticamente. Por eso la lógica de carrito, fechas independientes y validación de traslado Lima/Ica↔Cusco de esta landing es nueva, construida desde cero (no había nada que reutilizar para esa parte).
- **Código de reserva**: se replicó el algoritmo real y vigente de `product.js` (`CUZ` + 6 hex de un hash FNV-1a sobre timestamp+contador, con reintento anti-colisión), para que los códigos generados por la landing tengan el mismo formato que el resto del sitio.
- **Diseño**: se reutilizan las variables CSS ya definidas en `main.css`/`components.css` (`--color-primary`, `--mct-radius-*`, `--spacing-*`, etc.), sin redefinir `:root`.

## 2. Archivos nuevos (ninguno existente fue modificado)

```
landing/machu-picchu-y-tours-peru.html
assets/css/landing-machu-picchu-tours.css
assets/js/pages/landing-machu-picchu-tours.js
assets/data/landing-machu-picchu-tours.json
```

No fue necesario modificar `product.html`, `quote-packages.html/js`, `tours.json`, PayPal, el sistema de cupones, el header ni el footer. Todo se integra por composición (fetch de componentes + scripts existentes), tal como se pidió.

## 3. Qué hace cada archivo

- **`assets/data/landing-machu-picchu-tours.json`**: única fuente de verdad de precios, textos, includes, imágenes, opciones de comida, reglas de traslado y copy del modal de venta cruzada. Cambiar moneda o precio de Machu Picchu (hoy USD 399, valor de venta real usado como referencia — **confirmar si es el definitivo o si pasa a PEN 199**) es editar un solo campo aquí; el JS no tiene precios hardcodeados.
  - El precio de niño **no se guarda como número fijo**: se calcula en tiempo real como `adultPrice − childPricing.discountAmount` (hoy USD 80). Esto es una diferencia intencional frente al ejemplo ilustrativo que enviaste (que sí traía `childPrice` fijo): así, si mañana el descuento pasa a USD 100, se cambia un solo número y el precio de niño se recalcula solo, sin tocar JS.
- **`assets/js/pages/landing-machu-picchu-tours.js`**: toda la lógica. Puntos clave, cada uno en **una sola función reutilizable** (tal como pediste, sin lógica repetida):
  - `validateDestinationTransition(selectedTours)`: regla Lima/Ica ↔ Cusco, sin importar el orden en que se agregaron los tours.
  - `checkOperationalWarnings(selectedTours)`: aviso no bloqueante de tren tardío Machu Picchu → Humantay al día siguiente.
  - `validateAllDates()`: corre TODAS las validaciones (fecha pasada, fecha faltante, fechas duplicadas, traslado) cada vez que cambia cualquier fecha.
  - `calculateBookingSummary()`: única función que calcula precios, usada tanto por el panel de resumen como por la barra móvil y el mensaje de WhatsApp.
- **`assets/css/landing-machu-picchu-tours.css`**: estilos propios con prefijo `mpt-`, sobre las variables ya existentes del sitio.
- **`landing/machu-picchu-y-tours-peru.html`**: la página. Un solo `<h1>`, jerarquía H2/H3 correcta, meta tags SEO completos (title, description, canonical, OG, Twitter Card), datos estructurados `TouristTrip`/`Offer` (sin inventar reviews ni disponibilidad), `loading="lazy"` en todas las imágenes salvo la del hero.

## 4. Simplificaciones deliberadas (para que las apruebes o pidas ampliarlas)

- **Nacionalidad**: input de texto libre, no un selector de país. `product.js` usa un `<select data-country-select>` que se llena con un script que no pude localizar con certeza en el repo; para no arriesgar una integración rota, se dejó texto libre. Es fácil de reemplazar después.
- **Teléfono/WhatsApp del viajero**: un solo campo de texto ("+51 900 000 000") en vez del selector de código de país + número separado que usa `product.js`. Simplificación deliberada por tiempo; misma información capturada.
- **Género**: no se pidió. `product.js` (el flujo de reserva individual, el más parecido a esta landing) tampoco lo tiene. `quote-packages.js` (cotizaciones de paquete, un flujo distinto) sí lo tiene. Se decidió no agregarlo para no inventar un campo que el flujo de reserva "real" no pide.
- **Validación de cupón con timeout de 4s**: se detectó en pruebas que `assets/data/backend-config.json` apunta a un backend real de Google Apps Script (`mode: "apps_script"`), y que `MyCuscoTripApiClient` **no tiene ningún timeout interno** — si el backend no responde, la llamada se queda colgada indefinidamente. Para no dejar al cliente viendo "Validando código…" para siempre, la landing intenta el backend real con **4 segundos de margen** y, si no responde, usa `discount-codes.json` directamente (mismo resultado para el cliente, más robusto). No se tocó `api-client.js`; el timeout vive solo en el archivo nuevo de la landing.

## 5. Instrucciones de integración

1. Copia estos 4 archivos a las mismas rutas relativas dentro de tu proyecto real (mismos nombres, mismas carpetas).
2. No se requiere ningún cambio en `components/header.html`, `components/footer.html`, ni en ningún otro archivo existente.
3. Verifica que estos assets referenciados en el JSON existan (o súbelos si faltan, igual que en el reporte de imágenes faltantes de la primera entrega):
   - `assets/img/tours/machu-picchu-full-day/cover.jpg` (+ `1.jpg`, `2.jpg`)
   - `assets/img/tours/laguna-humantay/cover.jpg` (+ `1.jpg`, `2.jpg`)
   - `assets/img/packages/peru/paracas-huacachina/cover.jpg` (+ `1.jpg`)
   - En este ZIP de prueba las tres imágenes de portada ya existían y cargaron bien.
4. Sube y prueba en GitHub Pages con normalidad — la página detecta automáticamente `github.io` para anteponer `/mycuscotrip/` a los assets, igual que el resto del sitio.
5. Enlaza la landing desde donde quieras (botón de campaña, menú, anuncio) apuntando a `landing/machu-picchu-y-tours-peru.html`.

## 6. Casos de prueba ejecutados (Playwright, navegador real)

Se automatizaron los 12 casos obligatorios (más 8 sub-verificaciones). **Resultado: 20/20 OK.**

| # | Caso | Resultado |
|---|------|-----------|
| 1 | Modal de venta cruzada aparece la 1ª vez, no la 2ª | ✅ |
| 2 | Machu Picchu día 7 + Humantay día 8 → permitido + aviso de tren tardío visible | ✅ |
| 3 | Ica día 4 + Machu Picchu día 5 → bloqueado (en ambos órdenes de selección) | ✅ |
| 4 | Ica día 4 + Machu Picchu día 6 → permitido | ✅ |
| 5 | Machu Picchu + Humantay misma fecha → bloqueado | ✅ |
| 6 | 2 adultos + 1 niño → precio correcto (2×399 + 1×319 = 1,117) | ✅ |
| 7 | Extra de almuerzo Ica (USD 20) multiplicado por pasajeros aplicables | ✅ |
| 8 | Buffet Tinkuy y almuerzo estándar son mutuamente excluyentes | ✅ |
| 9 | Cupón 15% muestra subtotal/descuento/total correctos | ✅ |
| 10 | Quitar cupón restaura el total original | ✅ |
| 11 | Cambiar cantidad de viajeros actualiza totales sin perder fechas ya elegidas | ✅ |
| 12 | Recargar la página recupera el borrador (fecha, viajeros, aviso visible) | ✅ |

Script de pruebas incluido por separado (no forma parte del proyecto, es solo la evidencia): pídemelo si quieres volver a correrlo.

## 7. Resultado visual esperado

- **Desktop**: configurador a dos columnas (producto principal + tarjetas de complementos a la izquierda, resumen fijo/sticky a la derecha). Verificado con capturas reales.
- **Mobile**: una columna, barra inferior fija con total estimado + botón "Continuar" que nunca tapa contenido (padding inferior añadido a la página). Verificado con capturas reales en viewport de 390px.
- Estados de foco visibles, `aria-live` en el total, `Escape` cierra modales, foco atrapado dentro de cada modal.

## 8. Precio de Machu Picchu — pendiente de tu confirmación

El JSON usa **USD 399** (precio de venta real) como referencia. Si el precio definitivo es otro (por ejemplo PEN 199, como mencionaste), solo hay que cambiar `currency` y `adultPrice` en `assets/data/landing-machu-picchu-tours.json` — ningún otro archivo necesita tocarse.

---

**Carpeta lista para subir a GitHub**: `/Users/jefferson/Downloads/mycuscotrip-landing-machu-picchu-tours/` (contiene únicamente los 4 archivos nuevos, en sus rutas relativas correctas).
