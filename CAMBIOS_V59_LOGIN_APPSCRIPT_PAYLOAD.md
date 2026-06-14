# V59 - Corrección login Apps Script y payload JSONP

## Problema corregido
El registro y verificación funcionaban, pero el login podía mostrar:

> No se pudo cargar el Apps Script. Revisa la URL /exec y los permisos de implementación.

La causa probable era la forma en que el frontend enviaba el `payload` JSON por URL y cómo Apps Script lo decodificaba. Apps Script ya entrega `e.parameter.payload` decodificado; hacer `decodeURIComponent()` nuevamente puede romper la lectura cuando existen caracteres especiales en contraseñas o datos.

## Cambios
- `hotel-marketplace.js`: ahora construye la URL JSONP con `URLSearchParams`, sin doble codificación manual.
- `google-apps-script-hoteles-marketplace.gs`: ahora primero intenta `JSON.parse(params.payload)` y solo usa `decodeURIComponent` como respaldo.
- Se actualizó cache a `?v=59` en páginas de hoteles.

## Archivos modificados
- `hoteles/assets/js/pages/hotel-marketplace.js`
- `hoteles/backend/google-apps-script-hoteles-marketplace.gs`
- `hoteles/assets/js/config.js`
- `hoteles/register-manager-hotel.html`
- `hoteles/login-admin-hotel.html`
- `hoteles/panel-admin-hotel.html`
- `hoteles/index.html`
- `hoteles/verify-owner.html`
