# V52 · Corrección de conexión Apps Script y correo de verificación

## Problema detectado
El registro sí llegaba a Google Sheet, pero el navegador mostraba:

> No se pudo conectar con Google Sheet. Revisa la URL del Apps Script.

Esto ocurre porque Google Apps Script puede ejecutar la escritura correctamente, pero el navegador puede bloquear la lectura de la respuesta por CORS desde GitHub Pages.

## Solución aplicada
- Se cambió la comunicación del panel hotelero a JSONP para recibir respuesta real desde Apps Script sin error de CORS.
- Se corrigió un error de JavaScript en `hotel-marketplace.js` causado por una variable duplicada.
- Se actualizó el Apps Script para aceptar llamadas por JSONP usando `callback` y `payload`.
- Se agregó control de error para el envío del correo de verificación.
- Se agregó la función `testHotelVerificationEmail()` para autorizar MailApp.

## Archivos modificados
- `hoteles/assets/js/pages/hotel-marketplace.js`
- `hoteles/backend/google-apps-script-hoteles-marketplace.gs`
- `hoteles/register-manager-hotel.html`
- `hoteles/login-admin-hotel.html`
- `hoteles/panel-admin-hotel.html`
- `hoteles/index.html`
- `hoteles/assets/js/config.js`

## Pasos obligatorios en Apps Script
1. Copiar el nuevo contenido de `hoteles/backend/google-apps-script-hoteles-marketplace.gs`.
2. Guardar.
3. Ejecutar una vez `setupHotelMarketplaceSheets()`.
4. Ejecutar una vez `testHotelVerificationEmail()` para autorizar MailApp.
5. Volver a implementar como nueva versión de Web App.
6. Verificar que el acceso esté como `Cualquier usuario`.

## Nota
Si el registro se guarda pero no llega correo, revisar en Apps Script:
- Permisos de MailApp autorizados.
- Carpeta spam/promociones.
- Columna `verificationEmailError` en `Hotel_Users`.
