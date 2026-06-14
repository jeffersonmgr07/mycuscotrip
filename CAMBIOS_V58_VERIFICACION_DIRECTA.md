# V58 - Verificación directa sin redirección a Apps Script

## Problema corregido
La V57 abría primero `verify-owner.html`, pero luego redirigía el navegador al Apps Script. En algunos navegadores/Gmail esa pantalla de Apps Script terminaba mostrando el error de Google Drive: `No se pudo abrir el archivo en este momento`.

## Solución
- `hoteles/verify-owner.html` ya no redirige al Apps Script.
- La página permanece siempre en el dominio `mycuscotrip.com`.
- La verificación se hace con JSONP directo contra el Web App.
- La URL `/exec` queda escrita directamente en `verify-owner.html` para evitar fallas por caché de `config.js`.
- El Apps Script ya no devuelve HTML en `verify_owner`; devuelve JSON/JSONP.
- El correo genera enlaces con `v=58`.

## Archivos modificados
- `hoteles/verify-owner.html`
- `hoteles/backend/google-apps-script-hoteles-marketplace.gs`
- `hoteles/assets/js/config.js`
