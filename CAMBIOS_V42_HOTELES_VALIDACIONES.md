# V42 – Hoteles: validaciones finales y nombres de habitaciones

## Cambios aplicados

1. Se eliminó el texto de ayuda del calendario:
   "Elige primero la entrada y luego la salida en el mismo calendario."

2. Los nombres de habitaciones ahora se muestran con formato de título:
   - Habitación Simple
   - Habitación Doble Twin
   - Habitación Matrimonial
   - Habitación Triple
   - Habitación Familiar

3. Validaciones del titular de reserva:
   - Nombres: solo letras, espacios y signos comunes de nombres.
   - Apellidos: solo letras, espacios y signos comunes de apellidos.
   - WhatsApp: solo números, máximo 15 dígitos.
   - Correo: debe tener formato de correo válido.
   - Documento:
     - Si el tipo es DNI: solo números y exactamente 8 dígitos.
     - Si es Pasaporte, Carnet de extranjería u Otro: permite texto alfanumérico.

4. PayPal sigue bloqueado hasta que todos los campos obligatorios sean válidos.

## Archivos modificados

- hoteles.html
- assets/js/pages/hoteles.js
