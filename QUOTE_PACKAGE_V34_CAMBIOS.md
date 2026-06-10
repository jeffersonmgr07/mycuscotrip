# Quote Package V34 - Corrección funcional

## Archivos corregidos

- `quote-packages.html`
- `assets/css/quote-packages.css`
- `assets/js/pages/quote-packages.js`

## Correcciones

1. Se subió el cache-busting a `v=34` para evitar que el navegador use el JS anterior.
2. El botón móvil `Ver más / Ver menos` ahora tiene listener directo y respaldo por delegación.
3. El botón `Iniciar reserva` ya no debe redirigir a WhatsApp; abre el modal `quoteReservationModal`.
4. Si el modal no existe en el HTML publicado, muestra alerta técnica en vez de redirigir a WhatsApp.
5. El botón `Iniciar reserva / Reservar` ahora usa verde oscuro con texto blanco.
6. El botón `Imprimir` queda más discreto: fondo gris claro, borde verde oscuro y texto verde oscuro.
7. La carpeta `/js` de raíz era duplicada exacta de `/assets/js` y no está referenciada por los HTML, por eso se retiró del proyecto completo corregido.

## PayPal y Google Sheets

El modal puede abrir sin Apps Script. Para que las reservas se guarden automáticamente en Google Sheets, debes configurar `window.MCT_QUOTE_APPS_SCRIPT_URL` con la URL `/exec` de una Web App de Google Apps Script que acepte las acciones `saveQuoteReservation`, `createPayPalOrder` y `capturePayPalOrder`.

PayPal actualmente está en sandbox con `client-id=sb`. Para producción, reemplaza ese valor en `quote-packages.html` por el Client ID público real de PayPal de My Cusco Trip.
