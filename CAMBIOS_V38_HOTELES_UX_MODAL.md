# V38 - Hoteles: mejoras UX/UI del modal de reserva

Cambios aplicados:

- Título del modal en mayúsculas y con mayor presencia visual.
- Menor espacio entre la barra superior del modal y la imagen del hotel.
- Slider de imágenes con esquinas redondeadas y tamaño estable.
- Nuevo selector de fechas tipo rango en un solo calendario: entrada + salida.
- Cálculo automático de noches: por ejemplo, “5 noches de alojamiento”.
- La disponibilidad ahora genera acomodaciones exactas según cantidad de pasajeros.
  - Ejemplo 3 pasajeros: triple, doble + simple, matrimonial + simple, 3 simples, etc., si existen en el JSON.
- Se eliminó el botón extra “Reservar”.
- Al elegir una acomodación aparece directamente el formulario del titular.
- Se eliminó el botón “Continuar con PayPal”.
- PayPal queda bloqueado hasta completar todos los datos obligatorios del titular.
- Botones principales usando el verde del overlay del hero: #062803.

Archivos modificados:

- hoteles.html
- assets/css/hoteles.css
- assets/js/pages/hoteles.js
