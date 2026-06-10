# Cambios V36 - Hoteles HTML

## Cambios visuales
- El título principal del hero queda en color blanco.
- Se eliminó el texto anterior del hero y se reemplazó por: “Tenemos la mejor selección de hoteles de todas las categorías para tu viaje por Cusco y Machu Picchu.”
- Se eliminó el recuadro “Reserva tipo vitrina”.
- Se eliminó la etiqueta “Catálogo”; queda solo “Hoteles disponibles”.
- El filtro de destinos muestra únicamente: Todos los destinos, Cusco, Aguas Calientes, Lima, Paracas / Ica, Arequipa, Puno y Uyuni.
- Se excluyen del filtro visible Tarapoto, Iquitos y Tambopata.

## Modal de hotel
- La cabecera del modal ahora es verde oscuro con texto blanco.
- El título ahora dice “Detalles de la reserva de hotel”.
- Se eliminó la ubicación duplicada superior.
- El bloque de fechas ahora se llama “Detalles de tu reserva”.
- Entrada mínima: mañana.
- Salida mínima: un día después de la entrada.
- Al cambiar la fecha de entrada, la fecha de salida se ajusta automáticamente al día siguiente.
- Las habitaciones/accommodaciones ya no aparecen al abrir el modal; primero se debe hacer clic en “Ver disponibilidad”.
- Después de ver disponibilidad, se muestran las habitaciones compatibles según adultos, niños y capacidad.
- Después de elegir habitación, el botón “Reservar” muestra el bloque de pago.

## PayPal y órdenes
- El HTML incluye PayPal en sandbox con `client-id=sb`.
- Para producción, reemplazar `sb` por el Client ID público real.
- El Secret ID no debe colocarse en el HTML.
- Para guardar órdenes en Google Sheet, usar `google-apps-script-hoteles.gs` y pegar la URL `/exec` en:

```js
window.MCT_HOTEL_APPS_SCRIPT_URL = "";
```

## Importante
El botón PayPal puede cobrar directamente, pero sin Apps Script no quedará una orden registrada en Google Sheet. Para que funcione como trenes, sí conviene usar Google Sheet + Apps Script.
