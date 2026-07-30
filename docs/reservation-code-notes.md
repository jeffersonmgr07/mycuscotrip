# Código de reserva CUZ — notas de implementación (julio 2026)

## Formato nuevo

`assets/js/pages/product.js` → `generateReservationCode()`

```
CUZ + timestamp en hex (11 caracteres, de Date.now(), incluye ms) + 8 caracteres hex aleatorios (crypto.getRandomValues, 32 bits)
```

Ejemplo: `CUZ19FB141E159318E7585` (22 caracteres en total).

Antes: `CUZ` + 6 hex aleatorios (9 caracteres), sin componente de timestamp.

## Prueba de duplicados

Script de prueba (no forma parte del bundle de producción): genera 100,000 códigos
con la misma fórmula, incluyendo una prueba de ráfaga (20,000 llamadas en el mismo
tick de reloj). Resultado: **0 colisiones** en ambos escenarios.

La versión inicial truncaba el componente aleatorio a 6 caracteres hex (24 bits) y sí
producía colisiones ocasionales en ráfagas de miles de llamadas en el mismo milisegundo
(5 colisiones en 100,000 en la prueba). Por eso se usa el hex aleatorio completo de 8
caracteres (32 bits) en la versión final.

## Persistencia por sesión de checkout

`generatePreReservation()` ahora reutiliza `this.currentPreReservation.code` si ya existe
uno para la sesión de compra activa (misma carga de página). Solo se genera un código
nuevo cuando:
- es la primera vez que se abre el modal en esa carga de página, o
- se restaura un pago (`restoredPaymentPayload.code`, retorno de PayPal/Mercado Pago).

Recargar la página / iniciar un checkout nuevo sí genera un código nuevo (comportamiento
esperado).

## Limitación conocida: unicidad de backend

Este repositorio **no incluye un backend real de reservas** para `product.js` /
`assets/js/core/api-client.js`. En modo por defecto (`isBackendEnabled()` en falso o
sin configurar), las reservas se guardan como "borrador local en modo mock"
(`saveMockDraft`) en `localStorage`/`sessionStorage`, sin ningún endpoint que valide
una restricción `UNIQUE` real entre distintos navegadores/dispositivos.

Por eso, siguiendo la regla 12.2 del prompt de traducciones/precios/reservas:

- **No se declara que el código sea único de forma garantizada.**
- Se implementó una verificación previa del lado del cliente: antes de aceptar un
  código recién generado, `generateReservationCode()` revisa si ya existe una reserva
  local (`getLocalReservation`) con ese mismo código y reintenta hasta 5 veces si hay
  coincidencia. Esto solo protege contra colisiones dentro del mismo navegador/sesión,
  **no** contra colisiones entre distintos usuarios o dispositivos.
- Cuando exista un backend real (Google Apps Script u otro) para las reservas de
  `product.html`, debe:
  1. Tener una columna/índice con restricción `UNIQUE` para el código de reserva.
  2. Rechazar o regenerar (hasta 5 intentos) el código si ya existe al momento de guardar.
  3. Devolver el código final al frontend para que reemplace el provisional
     (`preReservation.code`) antes de mostrarlo en el modal, WhatsApp, correo o
     comprobantes.

## Compatibilidad con códigos antiguos

El nuevo formato no rompe la lectura de códigos antiguos (`CUZ` + 6 hex): no hay
ninguna validación de longitud fija en `verificar-reserva.html`, `detalle-reserva.html`
ni en las búsquedas por código — todas comparan el string completo, no un patrón de
longitud. Se confirmó por búsqueda en el código que ningún componente asume que el
código de reserva mide exactamente 9 caracteres.
