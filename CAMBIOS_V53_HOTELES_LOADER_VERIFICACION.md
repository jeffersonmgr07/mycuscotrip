# V53 - Hoteles: loader y verificación por dominio

## Cambios aplicados

1. Se agregó un loader genérico para acciones de usuario.
   - Muestra: “Un momento, por favor...”, “Enviando registro...”, “Validando acceso...” o “Guardando cambios...”.
   - Solo aparece cuando el usuario hace clic en acciones que requieren espera.
   - No aparece en cargas invisibles del panel.
   - Deshabilita temporalmente el botón para evitar doble envío.

2. Se ajustó la plantilla del correo de verificación.
   - Título actualizado: “Verifica tu cuenta para administración de alojamientos”.
   - Asunto actualizado con el mismo criterio.

3. Se corrigió el enlace de verificación.
   - Antes el correo abría directamente una URL de Apps Script.
   - Ahora abre una página propia dentro de Hoteles:
     `hoteles/verify-owner.html?token=...`
   - Esa página valida el token contra Apps Script y muestra una pantalla de éxito/error dentro del sitio.

4. Se agregó:
   - `hoteles/verify-owner.html`

5. Se actualizó el Apps Script para que `verify_owner` también responda por JSONP, necesario para GitHub Pages.

## Archivos modificados

- hoteles/assets/js/config.js
- hoteles/assets/js/pages/hotel-marketplace.js
- hoteles/backend/google-apps-script-hoteles-marketplace.gs
- hoteles/register-manager-hotel.html
- hoteles/login-admin-hotel.html
- hoteles/panel-admin-hotel.html
- hoteles/index.html
- hoteles/verify-owner.html

## Importante

Después de subir esta versión, reemplaza el Apps Script con el nuevo archivo:

`hoteles/backend/google-apps-script-hoteles-marketplace.gs`

Luego:

1. Ejecuta `setupHotelMarketplaceSheets()`.
2. Ejecuta `testHotelVerificationEmail()` para autorizar MailApp.
3. Implementa una nueva versión del Web App.
4. Mantén acceso como “Cualquier usuario”.
