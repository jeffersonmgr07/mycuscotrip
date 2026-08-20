# My Cusco Trip V98 — Travel Voucher

## Archivos públicos para GitHub
Esta V98 conserva los archivos públicos de V97 y actualiza principalmente:
- `detalle-reserva.html`

Cambios visuales del Travel Voucher:
- Fechas de servicios en formato día mes año.
- Fecha de nacimiento vacía cuando no existe dato.
- Sección Incluye con grupos y checks verdes.
- Formato de impresión con margen superior de 15 mm.
- Reducción del espacio interno superior del bloque Travel Voucher.

## Datos de reservas concretas
Los datos personales de pasajeros no deben almacenarse en GitHub. Las reservas concretas se actualizan en Google Sheets mediante scripts privados temporales ejecutados desde el Apps Script principal.

## Pasos
1. Subir/reemplazar los archivos de este paquete en GitHub manteniendo las rutas.
2. Esperar a que GitHub Pages publique la nueva versión.
3. Ejecutar por separado, en Google Apps Script, cualquier script privado de actualización de reserva.
4. Verificar la reserva desde Mi Reserva.
5. Eliminar del proyecto de Apps Script el archivo temporal con datos personales una vez comprobada la actualización.

## Backend
No es necesario reemplazar nuevamente `Code.gs` si el backend principal ya está en V97 y contiene la consulta de apellidos flexible y las funciones de reserva manual incorporadas en esa versión.
