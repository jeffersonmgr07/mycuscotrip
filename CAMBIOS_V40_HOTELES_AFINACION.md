# V40 - Afinación modal de hoteles

## Cambios visuales y UX

- El primer clic del calendario ahora marca la fecha de entrada en verde oscuro inmediatamente.
- Al presionar **Ver disponibilidad**, el modal hace scroll automático hacia las acomodaciones disponibles.
- El mismo comportamiento se mantiene al elegir una acomodación: baja hacia los datos del titular.
- Se separó visualmente el radio button del texto en las cards de habitación.
- En escritorio, el formulario del titular queda más ordenado:
  - Nombres y apellidos en la primera fila.
  - Tipo y número de documento en la misma fila.
  - Nacionalidad en fila completa.
  - Celular / WhatsApp en fila completa, con más espacio para el número.
  - Correo en fila completa.
- En móvil se mantiene el diseño anterior, porque ya funcionaba correctamente.

## Estado actual de hoteles

Actualmente el catálogo de hoteles se alimenta desde:

`assets/data/hotels.json`

Las reservas generadas después del pago o registro manual se pueden enviar a Google Sheets mediante Apps Script configurando:

`window.MCT_HOTEL_APPS_SCRIPT_URL`

