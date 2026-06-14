# V55 - Verificación y loader definitivo

Cambios:
- El loader se oculta automáticamente al finalizar una acción y también tiene seguro de 30 segundos.
- El mensaje de resultado fuerza el cierre del loader para evitar bloqueos visuales.
- La página `hoteles/verify-owner.html` ya no depende de leer JSONP directamente; ahora usa un iframe oculto hacia Apps Script y recibe el resultado mediante `postMessage`.
- El Apps Script permite iframe con `setXFrameOptionsMode(ALLOWALL)` y envía el resultado de verificación a la página pública de MyCuscoTrip.
- Caché actualizada a `?v=55`.
