# Landing Machu Picchu + Tours — V5

Fecha: 3 de agosto de 2026

## Escritorio
- Se conserva la estructura en dos columnas: configurador a la izquierda y resumen a la derecha.
- Las experiencias adicionales se muestran en dos tarjetas por fila dentro de la columna izquierda.
- El resumen queda fijo (sticky) durante el desplazamiento, con separación calculada según la altura real de la cabecera.
- Si el resumen supera la altura disponible, utiliza desplazamiento interno.
- Las reglas móviles existentes no fueron modificadas.

## Modal y datos de pasajeros
- La landing usa un modal de pasajeros con el mismo lenguaje visual del checkout de `product.html`.
- Solicita titular, documento, nacionalidad, fecha de nacimiento, WhatsApp, correo, idioma y hotel/dirección de recojo en Cusco.
- Permite completar o aplazar los datos de pasajeros adicionales.
- Antes del pago muestra una revisión final de servicios, fechas y total.

## PayPal y Apps Script
- El flujo ahora registra primero la pre-reserva mediante `createPreReservation`.
- Luego crea la orden mediante `createPayPalOrder` por el 100% del total calculado.
- Guarda código, correo y apellido en almacenamiento local antes de redirigir.
- Conserva el borrador para que la selección pueda recuperarse si el pago se cancela o se abandona.
- La redirección solo ocurre cuando el backend devuelve `approvalUrl`.

## Idiomas
- Se mantiene español.
- Se mantiene la versión inglesa completa.
- Se agregó la versión portuguesa completa en `/pt/landing/machu-picchu-y-tours-peru.html`.
- HTML, contenido comercial, JSON, JavaScript, calendarios, resumen, cupones, validaciones y modal están localizados.
- Se añadieron canonical, hreflang y sitemap para portugués.

## Archivos principales
- `landing/machu-picchu-y-tours-peru.html`
- `en/landing/machu-picchu-y-tours-peru.html`
- `pt/landing/machu-picchu-y-tours-peru.html`
- `assets/css/landing-machu-picchu-tours.css`
- `assets/css/landing-reservation-modal.css`
- `assets/js/pages/landing-machu-picchu-tours.js`
- `assets/js/pages/landing-machu-picchu-tours-en.js`
- `assets/js/pages/landing-machu-picchu-tours-pt.js`
- `assets/data/i18n/pt/landing-machu-picchu-tours.json`
- `sitemap.xml`

## Nota operativa
La integración de frontend utiliza la URL de Apps Script configurada en `assets/data/backend-config.json`. Para cobrar en vivo, el despliegue de Apps Script debe tener activas las acciones `createPreReservation` y `createPayPalOrder`, además de credenciales PayPal válidas en el entorno correspondiente.
