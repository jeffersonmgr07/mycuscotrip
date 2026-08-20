# My Cusco Trip V97 — Mi Reserva / Travel Voucher / Tickets

Este paquete contiene únicamente archivos aptos para el repositorio público.
No contiene pasajeros, números de documento ni seeds de reservas reales.

## Archivos que deben reemplazarse en GitHub

- `mi-reserva.html`
- `detalle-reserva.html`
- `verificar-reserva.html`
- `assets/js/pages/reservation-recovery.js`
- `assets/js/components/public-forms.js`
- `pages/ayuda/descargar-travel-voucher.html`
- `pages/ayuda/descargar-tickets-servicios.html`
- `google-apps-script/Code.gs` (copia fuente/versionada; además debe desplegarse en Google Apps Script)
- `landing/google-apps-script-machu-picchu-alternativas.gs` (copia fuente/versionada; además debe desplegarse en su Google Apps Script)

## Importante

Subir los `.gs` a GitHub NO actualiza el backend que está ejecutando Google.
Después del commit se debe copiar el contenido de los `.gs` a sus proyectos correspondientes de Google Apps Script y crear una nueva versión de las implementaciones web.

Si se edita una implementación existente, su URL `/exec` normalmente se conserva y no hay que cambiar el frontend. Si se crea una implementación completamente nueva, actualizar la URL correspondiente en la configuración del sitio.

## Reserva manual ya pagada

Los datos de una reserva real deben insertarse únicamente en el backend privado/Google Sheets. Nunca agregar números de pasaporte/documento, seeds privados ni payloads de pasajeros al repositorio público.
